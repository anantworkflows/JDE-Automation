import { chromium } from '@playwright/test';
import * as winston from 'winston';

/**
 * JDE Page Inspector
 * Runs with visible browser to inspect actual page structure
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
    new winston.transports.File({ filename: './logs/inspector.log' })
  ]
});

async function inspectJDE() {
  logger.info('Starting JDE Page Inspector');
  
  const browser = await chromium.launch({ 
    headless: false,
    slowMo: 500
  });
  
  const context = await browser.newContext({ 
    viewport: { width: 1920, height: 1080 }
  });
  
  const page = await context.newPage();
  
  try {
    // Navigate to JDE
    logger.info('Navigating to JDE login page...');
    await page.goto('https://demo.steltix.com/jde/E1Menu.maf', { waitUntil: 'networkidle' });
    
    logger.info('=== LOGIN PAGE LOADED ===');
    await page.waitForTimeout(3000);
    
    // Capture login page structure
    const loginInputs = await page.locator('input').all();
    logger.info(`Found ${loginInputs.length} input elements on login page`);
    
    for (let i = 0; i < loginInputs.length; i++) {
      const input = loginInputs[i];
      const name = await input.getAttribute('name').catch(() => 'no-name');
      const id = await input.getAttribute('id').catch(() => 'no-id');
      const type = await input.getAttribute('type').catch(() => 'no-type');
      const placeholder = await input.getAttribute('placeholder').catch(() => '');
      logger.info(`  Input ${i}: name="${name}", id="${id}", type="${type}", placeholder="${placeholder}"`);
    }
    
    // Fill credentials
    logger.info('Filling login credentials...');
    await page.locator('input[name="User"]').fill('demo');
    await page.locator('input[name="Password"]').fill('demo');
    await page.locator('input[type="submit"]').click();
    
    // Wait for post-login load
    logger.info('Waiting for JDE to load after login...');
    await page.waitForTimeout(8000);
    
    // Capture all frames
    const frames = page.frames();
    logger.info(`\n=== FOUND ${frames.length} FRAMES ===`);
    
    for (let i = 0; i < frames.length; i++) {
      const frame = frames[i];
      const url = frame.url();
      logger.info(`\nFrame ${i}: ${url}`);
      
      if (url.includes('dummy') || url === 'about:blank') {
        logger.info('  (Skipping dummy frame)');
        continue;
      }
      
      try {
        const inputs = await frame.locator('input').all();
        logger.info(`  Found ${inputs.length} inputs in this frame`);
        
        for (const input of inputs) {
          const name = await input.getAttribute('name').catch(() => '');
          const id = await input.getAttribute('id').catch(() => '');
          const placeholder = await input.getAttribute('placeholder').catch(() => '');
          const ariaLabel = await input.getAttribute('aria-label').catch(() => '');
          const visible = await input.isVisible().catch(() => false);
          
          if (name || id || placeholder || ariaLabel) {
            logger.info(`    Input: name="${name ?? ''}", id="${id ?? ''}", placeholder="${placeholder ?? ''}", aria-label="${ariaLabel ?? ''}", visible=${visible}`);
          }
        }
        
        // Look for Fast Path specifically
        const fastPathInputs = await frame.locator('input[placeholder*="Fast Path" i], input[id*="FAST_PATH" i], input[aria-label*="Fast Path" i]').all();
        if (fastPathInputs.length > 0) {
          logger.info(`  ✓ FOUND Fast Path input(s): ${fastPathInputs.length}`);
          
          for (const fp of fastPathInputs) {
            const id = await fp.getAttribute('id');
            const visible = await fp.isVisible().catch(() => false);
            const enabled = await fp.isEnabled().catch(() => false);
            const display = await fp.evaluate((el: HTMLElement) => window.getComputedStyle(el).display);
            const visibility = await fp.evaluate((el: HTMLElement) => window.getComputedStyle(el).visibility);
            
            logger.info(`    Fast Path: id=${id ?? 'none'}, visible=${visible}, enabled=${enabled}, display=${display}, visibility=${visibility}`);
            
            logger.info('    Trying to activate Fast Path...');
            await page.keyboard.press('Alt+F');
            await page.waitForTimeout(1000);
            
            const nowVisible = await fp.isVisible().catch(() => false);
            logger.info(`    After Alt+F: visible=${nowVisible}`);
          }
        }
        
        // Look for menu/navigation elements
        const menuElements = await frame.locator('a, button, [role="menuitem"]').all();
        logger.info(`  Found ${menuElements.length} clickable elements`);
        
        for (let j = 0; j < Math.min(10, menuElements.length); j++) {
          const el = menuElements[j];
          const text = await el.textContent().catch(() => '');
          if (text && text.trim()) {
            logger.info(`    Menu ${j}: "${text.trim().substring(0, 50)}"`);
          }
        }
        
      } catch (error) {
        logger.warn(`  Error inspecting frame ${i}: ${(error as Error).message}`);
      }
    }
    
    // Capture final screenshot
    await page.screenshot({ path: './screenshots/inspector-final.png', fullPage: true });
    logger.info('Final screenshot saved: ./screenshots/inspector-final.png');
    
    // Keep browser open
    logger.info('\n=== INSPECTION COMPLETE ===');
    logger.info('Browser will remain open for 30 seconds');
    
    await page.waitForTimeout(30000);
    
  } catch (error) {
    logger.error('Inspector failed:', error);
  } finally {
    logger.info('Closing browser...');
    await browser.close();
  }
}

inspectJDE().catch(console.error);
