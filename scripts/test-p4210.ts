import { chromium } from '@playwright/test';
import * as winston from 'winston';

const logger = winston.createLogger({
  level: 'info',
  format: winston.format.combine(
    winston.format.timestamp(),
    winston.format.printf(({ timestamp, level, message }) => {
      return `${timestamp} [${level.toUpperCase()}]: ${message}`;
    })
  ),
  transports: [new winston.transports.Console()]
});

async function testP4210() {
  logger.info('Testing P4210 - Sales Order Entry');
  
  const browser = await chromium.launch({ 
    headless: false,
    slowMo: 1000
  });
  
  const context = await browser.newContext({ 
    viewport: { width: 1920, height: 1080 }
  });
  
  const page = await context.newPage();
  
  try {
    // Login
    logger.info('Logging in...');
    await page.goto('https://demo.steltix.com/jde/E1Menu.maf', { waitUntil: 'networkidle' });
    await page.locator('input[name="User"]').fill('demo');
    await page.locator('input[name="Password"]').fill('demo');
    await page.locator('input[type="submit"]').click();
    await page.waitForTimeout(8000);
    logger.info('Login successful');

    // Navigate to P4210
    logger.info('\n=== TESTING P4210 (Sales Order Entry) ===');
    
    // Method 1: Try Fast Path
    logger.info('Method 1: Using Fast Path');
    const fpInput = page.locator('#TE_FAST_PATH_BOX');
    await fpInput.evaluate((el: HTMLInputElement) => {
      el.value = 'P4210';
      el.dispatchEvent(new Event('input', { bubbles: true }));
      el.dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter', bubbles: true }));
    });
    
    logger.info('P4210 entered in Fast Path, waiting 10 seconds...');
    await page.waitForTimeout(10000);
    
    // Check if P4210 loaded
    const frames = page.frames();
    logger.info(`Total frames: ${frames.length}`);
    
    let p4210Found = false;
    for (let i = 0; i < frames.length; i++) {
      const url = frames[i].url();
      if (!url.includes('dummy') && url !== 'about:blank' && url.length > 10) {
        logger.info(`Frame ${i}: ${url.substring(0, 100)}`);
        
        if (url.includes('P4210') || url.includes('SalesOrder')) {
          logger.info('  ✓✓✓ P4210 Sales Order Entry detected! ✓✓✓');
          p4210Found = true;
          
          // Look for Sales Order specific elements
          try {
            const inputs = await frames[i].locator('input').all();
            logger.info(`  Inputs found: ${inputs.length}`);
            
            // Look for common Sales Order fields
            const orderNumber = await frames[i].locator('input[name*="Order"], input[id*="Order"]').count();
            const customer = await frames[i].locator('input[name*="Customer"], input[id*="Customer"]').count();
            const branch = await frames[i].locator('input[name*="Branch"], input[id*="Branch"]').count();
            
            logger.info(`  Order fields: ${orderNumber}, Customer fields: ${customer}, Branch fields: ${branch}`);
            
            // Look for Add/New button
            const addButton = await frames[i].locator('#hc_Add, img[alt*="Add"], button:has-text("Add")').count();
            if (addButton > 0) {
              logger.info('  ✓ Add button found!');
            }
            
          } catch (e) {
            // Ignore frame access errors
          }
        }
      }
    }
    
    if (!p4210Found) {
      logger.info('\n⚠️  P4210 did NOT load.');
      logger.info('Trying alternative method: Menu navigation...');
      
      // Method 2: Try clicking through menu tree
      // Look for Sales Order Management in the menu
      const menuFrame = frames.find(f => f.url().includes('E1Menu.maf'));
      if (menuFrame) {
        logger.info('Found menu frame, looking for Sales Order links...');
        
        const links = await menuFrame.locator('a').all();
        logger.info(`Total links in menu: ${links.length}`);
        
        for (const link of links.slice(0, 20)) {
          const text = await link.textContent().catch(() => '');
          if (text && (text.toLowerCase().includes('sales') || text.toLowerCase().includes('order'))) {
            logger.info(`Found: "${text.trim()}"`);
          }
        }
      }
    }
    
    // Take screenshot
    await page.screenshot({ path: './screenshots/p4210-test.png', fullPage: true });
    logger.info('\nScreenshot saved: ./screenshots/p4210-test.png');
    
    // Wait before closing
    logger.info('\nBrowser will stay open for 15 seconds...');
    await page.waitForTimeout(15000);
    
  } catch (error) {
    logger.error('Test failed:', error);
  } finally {
    await browser.close();
    logger.info('Browser closed.');
  }
}

testP4210().catch(console.error);
