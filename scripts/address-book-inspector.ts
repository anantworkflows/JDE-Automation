import { chromium } from '@playwright/test';
import * as winston from 'winston';
import JDEHelper from '../utils/jde-helper';

/**
 * JDE Address Book Element Inspector
 * Finds Add button and form field selectors after navigating to P01012
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
    new winston.transports.File({ filename: './logs/address-book-inspector.log' })
  ]
});

async function inspectAddressBook() {
  logger.info('Starting Address Book Inspector');
  
  const browser = await chromium.launch({ 
    headless: false,
    slowMo: 500
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
    await page.waitForTimeout(8000);
    
    // Step 3: Inspect all frames for Address Book content
    logger.info('=== STEP 3: Inspecting all frames for Address Book ===');
    const frames = page.frames();
    logger.info(`Found ${frames.length} frames`);
    
    for (let i = 0; i < frames.length; i++) {
      const frame = frames[i];
      const url = frame.url();
      logger.info(`\n--- Frame ${i}: ${url} ---`);
      
      if (url.includes('dummy') || url === 'about:blank') {
        logger.info('  (Skipping dummy frame)');
        continue;
      }
      
      try {
        // Check for Address Book indicators
        const pageTitle = await frame.title().catch(() => 'N/A');
        const frameContent = await frame.content().catch(() => '');
        const hasAddressBook = frameContent.includes('Address Book') || 
                               frameContent.includes('P01012') ||
                               url.includes('P01012');
        
        logger.info(`  Page title: ${pageTitle}`);
        logger.info(`  Contains Address Book: ${hasAddressBook}`);
        
        // === SEARCH FOR ADD BUTTON ===
        logger.info('  \n  >>> SEARCHING FOR ADD BUTTON <<<');
        
        // Strategy 1: Image buttons (hyperclick)
        const imgSelectors = [
          '#hc_Add',
          'img[src*="Add"]',
          'img[src*="add"]',
          'img[alt*="Add"]',
          'img[title*="Add"]',
          'img[id*="Add"]',
          'img[name*="Add"]',
          'img[id*="add"]',
          'img[name*="add"]',
          '[id*="hc_"]',
          'img[src*="hc_"]'
        ];
        
        for (const selector of imgSelectors) {
          try {
            const elements = await frame.locator(selector).all();
            if (elements.length > 0) {
              for (let j = 0; j < elements.length; j++) {
                const el = elements[j];
                const src = await el.getAttribute('src').catch(() => 'no-src');
                const alt = await el.getAttribute('alt').catch(() => 'no-alt');
                const id = await el.getAttribute('id').catch(() => 'no-id');
                const title = await el.getAttribute('title').catch(() => 'no-title');
                const visible = await el.isVisible().catch(() => false);
                const enabled = await el.isEnabled().catch(() => false);
                const srcFilename = src ? src.substring(src.lastIndexOf('/') + 1) : 'no-src';
                logger.info(`    ✓ ADD BUTTON FOUND: selector="${selector}"`);
                logger.info(`      src=${srcFilename}, alt=${alt}, id=${id}, title=${title}`);
                logger.info(`      visible=${visible}, enabled=${enabled}`);
              }
            }
          } catch (e) {
            // Continue
          }
        }
        
        // Strategy 2: Regular buttons
        const buttonSelectors = [
          'button:has-text("Add")',
          'button[id*="Add"]',
          'button[name*="Add"]',
          'button[title*="Add"]',
          'input[type="button"][value*="Add"]',
          'input[type="submit"][value*="Add"]'
        ];
        
        for (const selector of buttonSelectors) {
          try {
            const elements = await frame.locator(selector).all();
            if (elements.length > 0) {
              for (const el of elements) {
                const text = await el.textContent().catch(() => '');
                const id = await el.getAttribute('id').catch(() => 'no-id');
                const visible = await el.isVisible().catch(() => false);
                logger.info(`    ✓ BUTTON FOUND: selector="${selector}", text="${text}", id=${id}, visible=${visible}`);
              }
            }
          } catch (e) {
            // Continue
          }
        }
        
        // Strategy 3: Toolbar icons
        logger.info('  \n  >>> SEARCHING FOR TOOLBAR ICONS <<<');
        const toolbarSelectors = [
          '.toolbar img',
          '[class*="toolbar"] img',
          '[class*="tool"] img',
          '.e1button img',
          '[class*="button"] img'
        ];
        
        for (const selector of toolbarSelectors) {
          try {
            const elements = await frame.locator(selector).all();
            if (elements.length > 0) {
              logger.info(`    Found ${elements.length} toolbar images with "${selector}":`);
              for (let j = 0; j < Math.min(10, elements.length); j++) {
                const el = elements[j];
                const src = await el.getAttribute('src').catch(() => 'no-src');
                const alt = await el.getAttribute('alt').catch(() => 'no-alt');
                const filename = src ? src.substring(src.lastIndexOf('/') + 1) : 'no-src';
                logger.info(`      [${j}] src=${filename}, alt=${alt}`);
              }
            }
          } catch (e) {
            // Continue
          }
        }
        
        // === SEARCH FOR FORM FIELDS ===
        logger.info('  \n  >>> SEARCHING FOR FORM INPUTS <<<');
        const inputs = await frame.locator('input').all();
        logger.info(`    Found ${inputs.length} input elements`);
        
        for (let j = 0; j < Math.min(20, inputs.length); j++) {
          const input = inputs[j];
          try {
            const type = await input.getAttribute('type').catch(() => 'text');
            const name = await input.getAttribute('name').catch(() => '');
            const id = await input.getAttribute('id').catch(() => '');
            const placeholder = await input.getAttribute('placeholder').catch(() => '');
            const ariaLabel = await input.getAttribute('aria-label').catch(() => '');
            const title = await input.getAttribute('title').catch(() => '');
            const visible = await input.isVisible().catch(() => false);
            
            if (visible && (name || id || placeholder || ariaLabel)) {
              logger.info(`    Input ${j}: type=${type}, name="${name}", id="${id}", placeholder="${placeholder}", aria-label="${ariaLabel}", title="${title}"`);
            }
          } catch (e) {
            // Continue
          }
        }
        
        // === SEARCH FOR LABELS (to identify field purposes) ===
        logger.info('  \n  >>> SEARCHING FOR LABELS <<<');
        const labels = await frame.locator('label, td, th, span').all();
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
        
        // Filter for relevant labels
        const relevantLabels = labelTexts.filter(t => 
          /name|address|city|state|country|postal|zip|phone|email/i.test(t)
        );
        
        logger.info(`    Relevant field labels found: ${relevantLabels.length}`);
        for (const label of relevantLabels.slice(0, 20)) {
          logger.info(`      - "${label}"`);
        }
        
      } catch (error) {
        logger.warn(`  Error inspecting frame ${i}: ${(error as Error).message}`);
      }
    }
    
    // Capture screenshot
    await page.screenshot({ path: './screenshots/address-book-inspector.png', fullPage: true });
    logger.info('\nScreenshot saved: ./screenshots/address-book-inspector.png');
    
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

inspectAddressBook().catch(console.error);
