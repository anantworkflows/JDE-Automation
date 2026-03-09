import { chromium } from '@playwright/test';

async function testFastPathFix() {
  console.log('Testing Fast Path Fix with Menu Button Click\n');
  
  const browser = await chromium.launch({ headless: false, slowMo: 500 });
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

    // Test 1: Click menu button
    console.log('2. Clicking #drop_mainmenu...');
    const menuButton = page.locator('#drop_mainmenu');
    const menuCount = await menuButton.count();
    console.log(`   Menu button count: ${menuCount}`);
    
    if (menuCount > 0) {
      await menuButton.click();
      console.log('   ✅ Menu button clicked');
      await page.waitForTimeout(2000);
    } else {
      console.log('   ❌ Menu button not found');
    }

    // Test 2: Find Fast Path
    console.log('\n3. Finding Fast Path input...');
    const fpSelectors = ['#TE_FAST_PATH_BOX', 'input[placeholder*="Fast Path" i]', 'input[id*="FAST_PATH" i]'];
    
    for (const selector of fpSelectors) {
      const fp = page.locator(selector).first();
      const count = await fp.count();
      if (count > 0) {
        console.log(`   ✅ Found Fast Path with: ${selector}`);
        
        // Fill and submit
        await fp.fill('P01012', { force: true });
        console.log('   ✅ Filled P01012');
        
        await fp.press('Enter');
        console.log('   ✅ Pressed Enter');
        break;
      }
    }

    // Test 3: Wait and check for Address Book
    console.log('\n4. Waiting 10 seconds for Address Book...');
    await page.waitForTimeout(10000);

    const frames = page.frames();
    console.log(`   Total frames: ${frames.length}`);
    
    let foundP01012 = false;
    for (let i = 0; i < frames.length; i++) {
      const url = frames[i].url();
      if (!url.includes('dummy') && url !== 'about:blank') {
        console.log(`   Frame ${i}: ${url.substring(0, 80)}`);
        if (url.includes('P01012') || url.includes('Address')) {
          foundP01012 = true;
          console.log('   ✅✅✅ ADDRESS BOOK LOADED! ✅✅✅');
        }
      }
    }

    if (!foundP01012) {
      console.log('\n   ❌ Address Book NOT loaded');
      console.log('\n   Possible issues:');
      console.log('   - Fast Path input not actually submitting');
      console.log('   - Need different submit method');
      console.log('   - Demo restrictions');
    }

    // Screenshot
    await page.screenshot({ path: './screenshots/test-fastpath-fix.png', fullPage: true });
    console.log('\n   📸 Screenshot saved: test-fastpath-fix.png');

    console.log('\n⏸️ Browser will stay open for 30 seconds...');
    await page.waitForTimeout(30000);

  } catch (error) {
    console.error('Error:', error);
  } finally {
    await browser.close();
  }
}

testFastPathFix().catch(console.error);
