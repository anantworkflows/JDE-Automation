import { chromium } from '@playwright/test';
import * as fs from 'fs';

async function screenshotDebug() {
  console.log('╔════════════════════════════════════════════════════════╗');
  console.log('║     JDE DEBUG - SCREENSHOT DRIVEN                      ║');
  console.log('╚════════════════════════════════════════════════════════╝\n');
  
  const browser = await chromium.launch({ 
    headless: true  // Run headless for screenshots
  });
  
  const context = await browser.newContext({ 
    viewport: { width: 1920, height: 1080 }
  });
  
  const page = await context.newPage();
  
  try {
    // Step 1: Login Page
    console.log('📸 Taking screenshot: Login Page');
    await page.goto('https://demo.steltix.com/jde/E1Menu.maf', { waitUntil: 'networkidle' });
    await page.screenshot({ path: './screenshots/debug-01-login.png', fullPage: true });
    console.log('✅ Saved: debug-01-login.png\n');
    
    // Fill credentials
    await page.locator('input[name="User"]').fill('demo');
    await page.locator('input[name="Password"]').fill('demo');
    
    // Step 2: After Login
    console.log('📸 Taking screenshot: After Sign In');
    await page.locator('input[type="submit"]').click();
    await page.waitForTimeout(8000);
    await page.screenshot({ path: './screenshots/debug-02-home.png', fullPage: true });
    console.log('✅ Saved: debug-02-home.png\n');
    
    // Check frames
    const frames = page.frames();
    console.log(`Found ${frames.length} frames after login:`);
    for (let i = 0; i < frames.length; i++) {
      const url = frames[i].url();
      if (!url.includes('dummy') && url !== 'about:blank') {
        console.log(`  Frame ${i}: ${url.substring(0, 80)}`);
      }
    }
    
    // Step 3: Try Fast Path P01012
    console.log('\n📸 Taking screenshot: After Fast Path P01012');
    await page.locator('#TE_FAST_PATH_BOX').evaluate((el: HTMLInputElement) => {
      el.value = 'P01012';
      el.dispatchEvent(new Event('input', { bubbles: true }));
      el.dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter', bubbles: true }));
    });
    await page.waitForTimeout(10000);
    await page.screenshot({ path: './screenshots/debug-03-after-p01012.png', fullPage: true });
    console.log('✅ Saved: debug-03-after-p01012.png\n');
    
    // Check if anything changed
    const framesAfter = page.frames();
    let newFrames = 0;
    for (let i = 0; i < framesAfter.length; i++) {
      const url = framesAfter[i].url();
      if (url.includes('P01012') || url.includes('Address')) {
        newFrames++;
        console.log(`  ✓ Frame with P01012: ${url.substring(0, 80)}`);
      }
    }
    
    if (newFrames === 0) {
      console.log('⚠️  No P01012 frames found after Fast Path\n');
    }
    
    // Step 4: Try Fast Path P4210
    console.log('📸 Taking screenshot: After Fast Path P4210');
    await page.locator('#TE_FAST_PATH_BOX').evaluate((el: HTMLInputElement) => {
      el.value = 'P4210';
      el.dispatchEvent(new Event('input', { bubbles: true }));
      el.dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter', bubbles: true }));
    });
    await page.waitForTimeout(10000);
    await page.screenshot({ path: './screenshots/debug-04-after-p4210.png', fullPage: true });
    console.log('✅ Saved: debug-04-after-p4210.png\n');
    
    // Step 5: Try clicking on Welcome page elements
    console.log('📸 Taking screenshot: Clicking on menu items');
    
    // Try clicking on menu tree items
    const menuFrame = page.frames().find(f => f.url().includes('E1Menu.maf'));
    if (menuFrame) {
      // Get all links
      const links = await menuFrame.locator('a').all();
      console.log(`Found ${links.length} links in menu`);
      
      // Click on first few menu items
      for (let i = 0; i < Math.min(3, links.length); i++) {
        const text = await links[i].textContent().catch(() => '');
        console.log(`  Trying to click: "${text?.substring(0, 40)}"`);
        try {
          await links[i].click();
          await page.waitForTimeout(3000);
        } catch (e) {
          // Ignore errors
        }
      }
    }
    
    await page.screenshot({ path: './screenshots/debug-05-menu-click.png', fullPage: true });
    console.log('✅ Saved: debug-05-menu-click.png\n');
    
    console.log('✅ All screenshots saved to ./screenshots/');
    console.log('\nReview the screenshots to see:');
    console.log('  - What the JDE interface looks like');
    console.log('  - If Fast Path is visible');
    console.log('  - What menu options are available');
    console.log('  - If any applications loaded');
    
  } catch (error) {
    console.error('Error:', error);
  } finally {
    await browser.close();
  }
}

screenshotDebug().catch(console.error);
