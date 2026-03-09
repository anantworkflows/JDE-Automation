import { chromium } from '@playwright/test';

async function debugFastPath() {
  console.log('╔════════════════════════════════════════════════════════╗');
  console.log('║     DEBUG: Fast Path After Enter                       ║');
  console.log('╚════════════════════════════════════════════════════════╝\n');
  
  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage({ viewport: { width: 1920, height: 1080 } });
  
  try {
    // Login
    console.log('1. Logging in...');
    await page.goto('https://demo.steltix.com/jde/E1Menu.maf', { waitUntil: 'networkidle' });
    await page.locator('input[name="User"]').fill('demo');
    await page.locator('input[name="Password"]').fill('demo');
    await page.locator('input[type="submit"]').click();
    await page.waitForTimeout(5000);
    console.log('   ✅ Login complete\n');

    // Click menu - search all frames
    console.log('2. Searching for menu button in all frames...');
    const frames = page.frames();
    console.log(`   Found ${frames.length} frames`);
    
    let menuClicked = false;
    for (let i = 0; i < frames.length; i++) {
      const frame = frames[i];
      const url = frame.url();
      console.log(`   Frame ${i}: ${url.substring(0, 60)}`);
      
      if (!url.includes('dummy') && url !== 'about:blank') {
        const menuBtn = frame.locator('#drop_mainmenu');
        if (await menuBtn.count() > 0) {
          console.log(`   ✅ Found #drop_mainmenu in frame ${i}`);
          await menuBtn.click();
          menuClicked = true;
          break;
        }
      }
    }
    
    if (!menuClicked) {
      console.log('   ❌ Menu button not found in any frame');
      console.log('   Trying main page...');
      const mainMenu = page.locator('#drop_mainmenu');
      if (await mainMenu.count() > 0) {
        await mainMenu.click();
        menuClicked = true;
        console.log('   ✅ Found in main page');
      } else {
        console.log('   ❌ Not found anywhere');
      }
    }
    
    await page.waitForTimeout(2000);
    console.log('   Menu step complete\n');

    // Fill Fast Path
    console.log('3. Filling Fast Path with P01012...');
    const fpInput = page.locator('#TE_FAST_PATH_BOX');
    await fpInput.fill('P01012', { force: true });
    console.log('   ✅ P01012 filled\n');

    // DEBUG: Take screenshot BEFORE pressing Enter
    await page.screenshot({ path: './screenshots/debug-before-enter.png' });
    console.log('   📸 Screenshot before Enter: debug-before-enter.png\n');

    // Press Enter and MONITOR what happens
    console.log('4. Pressing Enter and monitoring frames...\n');
    
    // Set up frame monitoring
    const frameUrls: string[] = [];
    const frameHandler = (frame: any) => {
      const url = frame.url();
      if (url && !url.includes('dummy') && url !== 'about:blank') {
        console.log(`   [NEW FRAME] ${url.substring(0, 80)}`);
        frameUrls.push(url);
      }
    };
    page.on('frameattached', frameHandler);
    page.on('framenavigated', (frame) => {
      const url = frame.url();
      if (url && !url.includes('dummy') && url !== 'about:blank') {
        console.log(`   [FRAME NAV] ${url.substring(0, 80)}`);
      }
    });

    // Press Enter
    await fpInput.press('Enter');
    console.log('   ✅ Enter pressed\n');

    // Monitor for 15 seconds
    console.log('5. Monitoring for 15 seconds...\n');
    for (let i = 0; i < 15; i++) {
      await page.waitForTimeout(1000);
      
      // Check current frames
      const frames = page.frames();
      const appFrames = frames.filter(f => {
        const url = f.url();
        return url.includes('RunApp') || url.includes('P01012') || url.includes('Address');
      });
      
      if (appFrames.length > 0) {
        console.log(`   [${i}s] ✅ Found ${appFrames.length} application frames`);
      } else {
        console.log(`   [${i}s] ...waiting`);
      }
    }

    // Remove listeners
    page.off('frameattached', frameHandler);

    // Final check
    console.log('\n6. Final frame check:\n');
    const finalFrames = page.frames();
    console.log(`   Total frames: ${finalFrames.length}`);
    
    for (const frame of finalFrames) {
      const url = frame.url();
      if (!url.includes('dummy') && url !== 'about:blank') {
        console.log(`   - ${url.substring(0, 80)}`);
      }
    }

    // Screenshot
    await page.screenshot({ path: './screenshots/debug-after-wait.png', fullPage: true });
    console.log('\n   📸 Screenshot after wait: debug-after-wait.png\n');

    console.log('✅ Debug complete. Check screenshots.');
    
  } catch (error) {
    console.error('Error:', error);
  } finally {
    await browser.close();
  }
}

debugFastPath().catch(console.error);
