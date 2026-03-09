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

async function inspectAddressBook() {
  logger.info('Starting Address Book Inspector');
  
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

    // Navigate to P01012 via Fast Path
    logger.info('\n=== NAVIGATING TO P01012 ===');
    const menuFrame = page.frameLocator('iframe').first();
    
    // Find and use Fast Path
    const fpInput = page.locator('#TE_FAST_PATH_BOX');
    await fpInput.evaluate((el: HTMLInputElement) => {
      el.value = 'P01012';
      el.dispatchEvent(new Event('input', { bubbles: true }));
    });
    await fpInput.evaluate((el: HTMLInputElement) => {
      const event = new KeyboardEvent('keydown', { key: 'Enter', bubbles: true });
      el.dispatchEvent(event);
    });
    
    logger.info('Fast Path P01012 submitted');
    
    // Wait and inspect frames
    for (let i = 0; i < 10; i++) {
      await page.waitForTimeout(2000);
      logger.info(`\n--- Check ${i + 1} (after ${(i + 1) * 2}s) ---`);
      
      const frames = page.frames();
      logger.info(`Total frames: ${frames.length}`);
      
      for (let f = 0; f < frames.length; f++) {
        const frame = frames[f];
        const url = frame.url();
        
        if (!url.includes('dummy') && url !== 'about:blank') {
          logger.info(`\nFrame ${f}: ${url.substring(0, 100)}`);
          
          try {
            // Look for Add button
            const addButton = frame.locator('#hc_Add');
            const count = await addButton.count();
            if (count > 0) {
              logger.info('  ✓✓✓ FOUND hc_Add button! ✓✓✓');
            }
            
            // Look for images with Add in src/alt
            const addImages = frame.locator('img[src*="Add"], img[alt*="Add"]');
            const imgCount = await addImages.count();
            if (imgCount > 0) {
              logger.info(`  Found ${imgCount} Add images`);
              const imgs = await addImages.all();
              for (const img of imgs.slice(0, 3)) {
                const src = await img.getAttribute('src');
                const alt = await img.getAttribute('alt');
                const id = await img.getAttribute('id');
                logger.info(`    img: id=${id}, alt=${alt}, src=${src?.substring(0, 50)}`);
              }
            }
            
            // Look for any images (toolbar icons)
            const allImages = frame.locator('img');
            const allImgCount = await allImages.count();
            if (allImgCount > 0 && allImgCount < 20) {
              logger.info(`  All ${allImgCount} images in frame:`);
              const imgs = await allImages.all();
              for (const img of imgs) {
                const src = await img.getAttribute('src');
                const alt = await img.getAttribute('alt');
                const id = await img.getAttribute('id');
                if (src?.includes('hc_')) {
                  logger.info(`    [TOOLBAR] id=${id}, alt=${alt}, src=${src?.substring(src.lastIndexOf('/') + 1)}`);
                }
              }
            }
            
            // Look for inputs
            const inputs = await frame.locator('input').all();
            if (inputs.length > 0 && inputs.length < 30) {
              logger.info(`  Inputs (${inputs.length}):`);
              for (const input of inputs.slice(0, 5)) {
                const name = await input.getAttribute('name');
                const id = await input.getAttribute('id');
                const type = await input.getAttribute('type');
                logger.info(`    input: id=${id}, name=${name}, type=${type}`);
              }
            }
            
          } catch (e) {
            // Frame might not be accessible
          }
        }
      }
    }

    // Take final screenshot
    await page.screenshot({ path: './screenshots/p01012-inspection.png', fullPage: true });
    logger.info('\nScreenshot saved: ./screenshots/p01012-inspection.png');
    
    logger.info('\n=== INSPECTION COMPLETE ===');
    logger.info('Browser will stay open for 20 seconds');
    await page.waitForTimeout(20000);
    
  } catch (error) {
    logger.error('Inspection failed:', error);
  } finally {
    await browser.close();
  }
}

inspectAddressBook().catch(console.error);
