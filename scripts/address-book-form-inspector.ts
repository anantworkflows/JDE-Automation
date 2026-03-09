import { chromium } from '@playwright/test';
import * as winston from 'winston';
import JDEHelper from '../utils/jde-helper';

/**
 * JDE Address Book Form Inspector
 * Clicks Add and discovers the customer entry form fields
 */

const logger = winston.createLogger({
  level: 'info',
  format: winston.format.combine(
    winston.format.timestamp(),
    winston.format.printf(({ timestamp, level, message }) => {
      return `${timestamp} [${level.toUpperCase()}]: ${message}`;
    })
  ),
  transports: [
    new winston.transports.Console(),
    new winston.transports.File({ filename: './logs/address-book-form-inspector.log' })
  ]
});

async function inspectAddressBookForm() {
  logger.info('Starting Address Book Form Inspector');
  
  const browser = await chromium.launch({ 
    headless: false,
    slowMo: 800
  });
  
  const context = await browser.newContext({ 
    viewport: { width: 1920, height: 1080 }
  });
  
  const page = await context.newPage();
  const helper = new JDEHelper(page);
  
  try {
    // Step 1: Login
    logger.info('=== STEP 1: Login ===');
    await helper.login({ username: 'demo', password: 'demo' });
    logger.info('Login successful');
    
    // Step 2: Navigate to Address Book via Fast Path
    logger.info('=== STEP 2: Navigate to P01012 (Address Book) ===');
    await helper.navigateByFastPath('P01012');
    logger.info('Navigation to P01012 complete');
    
    // Wait for Address Book to fully load
    await page.waitForTimeout(5000);
    
    // Step 3: Click Add button in the correct frame
    logger.info('=== STEP 3: Clicking Add button ===');
    
    // Find the Address Book frame (Frame 10 from previous inspection)
    const frames = page.frames();
    let addressBookFrame = null;
    
    for (const frame of frames) {
      const url = frame.url();
      if (url.includes('RunApp') && url.includes('E1Menu')) {
        addressBookFrame = frame;
        logger.info(`Found Address Book frame: ${url}`);
        break;
      }
    }
    
    if (!addressBookFrame) {
      throw new Error('Address Book frame not found');
    }
    
    // Click the Add button
    const addButton = addressBookFrame.locator('#hc_Add').first();
    await addButton.waitFor({ state: 'visible', timeout: 10000 });
    await addButton.click();
    logger.info('Add button clicked');
    
    // Wait for add form to load
    await page.waitForTimeout(5000);
    
    // Step 4: Inspect the Add form
    logger.info('=== STEP 4: Inspecting Add Form ===');
    
    // Re-get frames as new ones may have been created
    const formFrames = page.frames();
    logger.info(`Now have ${formFrames.length} frames`);
    
    for (let i = 0; i < formFrames.length; i++) {
      const frame = formFrames[i];
      const url = frame.url();
      
      if (url.includes('dummy') || url === 'about:blank') continue;
      
      logger.info(`\n--- Frame ${i}: ${url} ---`);
      
      try {
        const pageTitle = await frame.title().catch(() => 'N/A');
        logger.info(`  Page title: ${pageTitle}`);
        
        // === SEARCH ALL INPUTS ===
        logger.info('  \n  >>> ALL INPUT ELEMENTS <<<');
        const inputs = await frame.locator('input').all();
        logger.info(`    Total inputs: ${inputs.length}`);
        
        for (let j = 0; j < inputs.length; j++) {
          const input = inputs[j];
          try {
            const type = await input.getAttribute('type').catch(() => 'text');
            const name = await input.getAttribute('name').catch(() => '');
            const id = await input.getAttribute('id').catch(() => '');
            const placeholder = await input.getAttribute('placeholder').catch(() => '');
            const ariaLabel = await input.getAttribute('aria-label').catch(() => '');
            const title = await input.getAttribute('title').catch(() => '');
            const visible = await input.isVisible().catch(() => false);
            const enabled = await input.isEnabled().catch(() => false);
            
            // Only log visible fields with identifiers
            if (visible && (name || id || title)) {
              logger.info(`    Input ${j}: type=${type}, name="${name}", id="${id}", title="${title}", enabled=${enabled}`);
            }
          } catch (e) {
            // Continue
          }
        }
        
        // === SEARCH FOR SPECIFIC FIELDS ===
        logger.info('  \n  >>> SEARCHING FOR CUSTOMER FIELDS <<<');
        
        const fieldPatterns = [
          { name: 'Alpha Name', patterns: ['alpha', 'name'] },
          { name: 'Address Line 1', patterns: ['address', 'add1', 'line1'] },
          { name: 'City', patterns: ['city'] },
          { name: 'State', patterns: ['state'] },
          { name: 'Country', patterns: ['country'] },
          { name: 'Postal Code', patterns: ['postal', 'zip'] },
          { name: 'Address Number', patterns: ['addressnumber', 'an8', 'addr#'] }
        ];
        
        for (const field of fieldPatterns) {
          for (const pattern of field.patterns) {
            try {
              const selectors = [
                `input[name*="${pattern}" i]`,
                `input[id*="${pattern}" i]`,
                `input[title*="${pattern}" i]`,
                `input[aria-label*="${pattern}" i]`
              ];
              
              for (const selector of selectors) {
                const elements = await frame.locator(selector).all();
                for (const el of elements) {
                  const visible = await el.isVisible().catch(() => false);
                  if (visible) {
                    const name = await el.getAttribute('name').catch(() => '');
                    const id = await el.getAttribute('id').catch(() => '');
                    const title = await el.getAttribute('title').catch(() => '');
                    logger.info(`    ✓ ${field.name} FOUND: selector="${selector}", name="${name}", id="${id}", title="${title}"`);
                  }
                }
              }
            } catch (e) {
              // Continue
            }
          }
        }
        
        // === SEARCH FOR LABELS TO MAP FIELDS ===
        logger.info('  \n  >>> ALL LABELS <<<');
        const labels = await frame.locator('label, td.e1label, .label, span.label').all();
        const labelTexts: string[] = [];
        
        for (const label of labels) {
          try {
            const text = await label.textContent().catch(() => '');
            if (text && text.trim() && text.length < 100) {
              const trimmed = text.trim();
              if (!labelTexts.includes(trimmed)) {
                labelTexts.push(trimmed);
              }
            }
          } catch (e) {
            // Continue
          }
        }
        
        logger.info(`    Found ${labelTexts.length} unique labels`);
        for (const text of labelTexts.slice(0, 30)) {
          logger.info(`      - "${text}"`);
        }
        
        // === SEARCH FOR SAVE/OK BUTTONS ===
        logger.info('  \n  >>> SAVE/OK BUTTONS <<<');
        const buttonSelectors = [
          '#hc_OK',
          '#hc_Save',
          'img[src*="OK"]',
          'img[src*="Save"]',
          'img[alt*="OK"]',
          'img[alt*="Save"]',
          'button:has-text("OK")',
          'button:has-text("Save")'
        ];
        
        for (const selector of buttonSelectors) {
          try {
            const elements = await frame.locator(selector).all();
            for (const el of elements) {
              const visible = await el.isVisible().catch(() => false);
              if (visible) {
                const id = await el.getAttribute('id').catch(() => '');
                const alt = await el.getAttribute('alt').catch(() => '');
                logger.info(`    ✓ SAVE/OK FOUND: selector="${selector}", id="${id}", alt="${alt}"`);
              }
            }
          } catch (e) {
            // Continue
          }
        }
        
      } catch (error) {
        logger.warn(`  Error inspecting frame ${i}: ${(error as Error).message}`);
      }
    }
    
    // Capture screenshot
    await page.screenshot({ path: './screenshots/address-book-add-form.png', fullPage: true });
    logger.info('\nScreenshot saved: ./screenshots/address-book-add-form.png');
    
    // Keep browser open for manual inspection
    logger.info('\n=== INSPECTION COMPLETE ===');
    logger.info('Browser will remain open for 60 seconds for manual verification');
    await page.waitForTimeout(60000);
    
  } catch (error) {
    logger.error('Inspector failed:', error);
    await page.screenshot({ path: './screenshots/inspector-error.png', fullPage: true });
  } finally {
    logger.info('Closing browser...');
    await browser.close();
  }
}

inspectAddressBookForm().catch(console.error);
