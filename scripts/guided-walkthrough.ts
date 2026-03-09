import { chromium } from '@playwright/test';
import * as readline from 'readline';

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout
});

function askQuestion(query: string): Promise<string> {
  return new Promise((resolve) => rl.question(query, resolve));
}

async function guidedJDEWalkthrough() {
  console.log('╔════════════════════════════════════════════════════════╗');
  console.log('║     JDE ENTERPRISEONE - GUIDED WALKTHROUGH             ║');
  console.log('║     Target: demo.steltix.com                           ║');
  console.log('╚════════════════════════════════════════════════════════╝\n');

  const browser = await chromium.launch({ 
    headless: false,
    slowMo: 500
  });
  
  const context = await browser.newContext({ 
    viewport: { width: 1920, height: 1080 }
  });
  
  const page = await context.newPage();
  
  try {
    // Step 1: Login
    console.log('📍 STEP 1: LOGIN');
    console.log('Opening JDE login page...');
    await page.goto('https://demo.steltix.com/jde/E1Menu.maf', { waitUntil: 'networkidle' });
    
    console.log('\n✅ Browser opened. You should see the JDE login page.');
    console.log('I will auto-fill the credentials...\n');
    
    await page.locator('input[name="User"]').fill('demo');
    await page.locator('input[name="Password"]').fill('demo');
    
    console.log('✅ Credentials filled (demo / demo)');
    console.log('⏸️  PAUSING: Press Enter to click Sign In...');
    await askQuestion('');
    
    await page.locator('input[type="submit"]').click();
    console.log('✅ Sign In clicked. Waiting for JDE to load...\n');
    await page.waitForTimeout(8000);
    
    // Step 2: Fast Path Navigation
    console.log('📍 STEP 2: FAST PATH NAVIGATION');
    console.log('You should now see the JDE Home Menu.');
    console.log('\nThe Fast Path box is at the top (may be small).');
    console.log('Look for a text box with placeholder "Fast Path"\n');
    
    console.log('⏸️  PAUSING: Press Enter to enter P01012...');
    await askQuestion('');
    
    // Fill Fast Path using JavaScript
    await page.locator('#TE_FAST_PATH_BOX').evaluate((el: HTMLInputElement) => {
      el.value = 'P01012';
      el.dispatchEvent(new Event('input', { bubbles: true }));
      el.dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter', bubbles: true }));
    });
    
    console.log('✅ P01012 entered in Fast Path');
    console.log('⏸️  PAUSING: Watch the screen. Press Enter when ready...');
    await askQuestion('');
    
    // Step 3: Wait and inspect
    console.log('\n📍 STEP 3: OBSERVE WHAT LOADS');
    console.log('Waiting 10 seconds to see if Address Book loads...\n');
    await page.waitForTimeout(10000);
    
    // Check frames
    const frames = page.frames();
    console.log(`Found ${frames.length} frames:`);
    
    let addressBookFound = false;
    for (let i = 0; i < frames.length; i++) {
      const url = frames[i].url();
      if (!url.includes('dummy') && url !== 'about:blank' && url.length > 10) {
        console.log(`  Frame ${i}: ${url.substring(0, 80)}`);
        if (url.includes('P01012') || url.includes('Address')) {
          addressBookFound = true;
          console.log('    ✓✓✓ Address Book frame detected! ✓✓✓');
        }
      }
    }
    
    if (!addressBookFound) {
      console.log('\n⚠️  Address Book (P01012) did NOT load.');
      console.log('\n🤔 POSSIBLE REASONS:');
      console.log('   1. P01012 is disabled in this demo environment');
      console.log('   2. Fast Path not working correctly');
      console.log('   3. Need to use menu navigation instead');
      console.log('\n💡 WHAT TO TRY:');
      console.log('   - Look at the left-side menu tree');
      console.log('   - Expand "Customer Management" or similar');
      console.log('   - Look for "Address Book" or "P01012"');
      console.log('   - Try other Fast Path codes like P4210 (Sales Order)');
    }
    
    console.log('\n⏸️  FINAL PAUSE: Browser will stay open.');
    console.log('Explore the JDE interface manually.');
    console.log('Press Enter when finished to close browser...');
    await askQuestion('');
    
  } catch (error) {
    console.error('Error:', error);
  } finally {
    await browser.close();
    rl.close();
    console.log('\n✅ Browser closed. Guided walkthrough complete.');
  }
}

guidedJDEWalkthrough().catch(console.error);
