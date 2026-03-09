import { chromium } from '@playwright/test';

async function discoverSalesOrderFields() {
  console.log('Discovering Sales Order (P4210) Form Fields\n');
  
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
    
    // Navigate to P4210
    console.log('2. Opening Sales Order Entry (P4210)...');
    await page.locator('#drop_mainmenu').click();
    await page.waitForTimeout(1000);
    const fp = page.locator('#TE_FAST_PATH_BOX');
    await fp.fill('P4210', { force: true });
    await fp.press('Enter');
    await page.waitForTimeout(10000);
    
    // Click Add
    console.log('3. Clicking Add button...');
    const frames = page.frames();
    for (const frame of frames) {
      const addBtn = frame.locator('#hc_Add, img[alt*="Add"], button:has-text("Add")').first();
      if (await addBtn.count() > 0) {
        await addBtn.click();
        console.log('   Add button clicked');
        break;
      }
    }
    
    // Wait for form
    console.log('4. Waiting for form to load...');
    await page.waitForTimeout(5000);
    
    // Discover all inputs
    console.log('\n5. Form fields found:\n');
    
    for (let i = 0; i < frames.length; i++) {
      const frame = frames[i];
      const url = frame.url();
      
      if (url.includes('P4210') || url.includes('RunApp')) {
        console.log(`Frame ${i}: ${url.substring(0, 60)}`);
        
        try {
          const inputs = await frame.locator('input, select').all();
          console.log(`   Found ${inputs.length} form elements:\n`);
          
          for (let j = 0; j < Math.min(inputs.length, 30); j++) {
            const input = inputs[j];
            const tagName = await input.evaluate(el => el.tagName);
            const id = await input.getAttribute('id');
            const name = await input.getAttribute('name');
            const ariaLabel = await input.getAttribute('aria-label');
            const placeholder = await input.getAttribute('placeholder');
            const type = await input.getAttribute('type');
            
            // Show meaningful fields
            if (id || name || ariaLabel) {
              console.log(`   [${tagName}]`);
              if (id) console.log(`      id="${id}"`);
              if (name) console.log(`      name="${name}"`);
              if (ariaLabel) console.log(`      aria-label="${ariaLabel}"`);
              if (placeholder) console.log(`      placeholder="${placeholder}"`);
              if (type) console.log(`      type="${type}"`);
              console.log('');
            }
          }
        } catch (e) {
          // Frame not accessible
        }
      }
    }
    
    // Screenshot
    await page.screenshot({ path: './screenshots/p4210-form-fields.png', fullPage: true });
    console.log('\nScreenshot saved: p4210-form-fields.png');
    
  } catch (error) {
    console.error('Error:', error);
  } finally {
    await browser.close();
  }
}

discoverSalesOrderFields().catch(console.error);
