import { chromium } from '@playwright/test';

async function discoverFormFields() {
  console.log('Discovering Address Book Form Fields\n');
  
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
    
    // Navigate to P01012
    console.log('2. Opening Address Book...');
    await page.locator('#drop_mainmenu').click();
    await page.waitForTimeout(1000);
    const fp = page.locator('#TE_FAST_PATH_BOX');
    await fp.fill('P01012', { force: true });
    await fp.press('Enter');
    await page.waitForTimeout(8000);
    
    // Click Add
    console.log('3. Clicking Add button...');
    const frames = page.frames();
    for (const frame of frames) {
      const addBtn = frame.locator('#hc_Add').first();
      if (await addBtn.count() > 0) {
        await addBtn.click();
        console.log('   Add button clicked');
        break;
      }
    }
    
    // Wait for form
    await page.waitForTimeout(5000);
    
    // Discover all inputs in all frames
    console.log('\n4. Discovering form fields:\n');
    
    for (let i = 0; i < frames.length; i++) {
      const frame = frames[i];
      const url = frame.url();
      
      if (url.includes('RunApp') || url.includes('P01012')) {
        console.log(`Frame ${i}: ${url.substring(0, 60)}`);
        
        try {
          const inputs = await frame.locator('input[type="text"], input:not([type])').all();
          console.log(`   Found ${inputs.length} text inputs:\n`);
          
          for (let j = 0; j < Math.min(inputs.length, 20); j++) {
            const input = inputs[j];
            const id = await input.getAttribute('id');
            const name = await input.getAttribute('name');
            const ariaLabel = await input.getAttribute('aria-label');
            const placeholder = await input.getAttribute('placeholder');
            const title = await input.getAttribute('title');
            const value = await input.inputValue().catch(() => '');
            
            // Only show if it has meaningful attributes
            if (id || name || ariaLabel || placeholder || title) {
              console.log(`   Input ${j}:`);
              if (id) console.log(`      id="${id}"`);
              if (name) console.log(`      name="${name}"`);
              if (ariaLabel) console.log(`      aria-label="${ariaLabel}"`);
              if (placeholder) console.log(`      placeholder="${placeholder}"`);
              if (title) console.log(`      title="${title}"`);
              if (value) console.log(`      value="${value}"`);
              console.log('');
            }
          }
        } catch (e) {
          // Frame not accessible
        }
      }
    }
    
    // Screenshot
    await page.screenshot({ path: './screenshots/form-fields-discovered.png', fullPage: true });
    console.log('\nScreenshot saved: form-fields-discovered.png');
    
  } catch (error) {
    console.error('Error:', error);
  } finally {
    await browser.close();
  }
}

discoverFormFields().catch(console.error);
