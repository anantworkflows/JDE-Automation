import { chromium } from '@playwright/test';

async function quickTest() {
  console.log('Quick P4210 Test\n');
  
  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage({ viewport: { width: 1920, height: 1080 } });
  
  try {
    // Login
    console.log('1. Login...');
    await page.goto('https://demo.steltix.com/jde/E1Menu.maf', { waitUntil: 'networkidle' });
    await page.locator('input[name="User"]').fill('demo');
    await page.locator('input[name="Password"]').fill('demo');
    await page.locator('input[type="submit"]').click();
    await page.waitForTimeout(5000);
    console.log('   ✅ Login done');
    
    // Navigate to P4210
    console.log('2. Navigate to P4210...');
    await page.locator('#drop_mainmenu').click();
    await page.waitForTimeout(1000);
    await page.locator('#TE_FAST_PATH_BOX').fill('P4210', { force: true });
    await page.locator('#TE_FAST_PATH_BOX').press('Enter');
    await page.waitForTimeout(8000);
    console.log('   ✅ P4210 loaded');
    
    // Click Add
    console.log('3. Click Add...');
    const frames = page.frames();
    for (const frame of frames) {
      const addBtn = frame.locator('#hc_Add').first();
      if (await addBtn.count() > 0) {
        await addBtn.click();
        console.log('   ✅ Add clicked');
        break;
      }
    }
    
    // Wait for form
    await page.waitForTimeout(5000);
    
    // Fill Customer Number
    console.log('4. Fill Customer Number...');
    for (const frame of page.frames()) {
      const custField = frame.locator('#C0_10').first();
      if (await custField.count() > 0) {
        await custField.fill('1001');
        console.log('   ✅ Customer filled');
        break;
      }
    }
    
    // Screenshot
    await page.screenshot({ path: './screenshots/test-p4210-fill.png' });
    console.log('   📸 Screenshot saved');
    
  } catch (error) {
    console.error('Error:', error);
  } finally {
    await browser.close();
  }
}

quickTest();
