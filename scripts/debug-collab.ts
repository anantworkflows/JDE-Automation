import { chromium } from '@playwright/test';
import * as fs from 'fs';
import * as path from 'path';

const INSTRUCTION_FILE = path.join(__dirname, '../logs/debug-instructions.txt');
const STATUS_FILE = path.join(__dirname, '../logs/debug-status.txt');

function logInstruction(msg: string) {
  console.log(`\n📝 ${msg}`);
  fs.appendFileSync(INSTRUCTION_FILE, `${new Date().toISOString()}: ${msg}\n`);
}

function waitForUser(seconds: number): Promise<void> {
  return new Promise(resolve => {
    console.log(`\n⏳ Waiting ${seconds} seconds for you to interact...`);
    
    // Create status file so user knows we're waiting
    fs.writeFileSync(STATUS_FILE, `WAITING: ${seconds}s\nINSTRUCTION: Check debug-instructions.txt`);
    
    setTimeout(() => {
      fs.writeFileSync(STATUS_FILE, 'READY');
      resolve();
    }, seconds * 1000);
  });
}

async function collaborativeDebug() {
  console.log('╔════════════════════════════════════════════════════════╗');
  console.log('║     JDE DEBUG - COLLABORATIVE SESSION                  ║');
  console.log('╚════════════════════════════════════════════════════════╝\n');
  
  // Clear previous instructions
  fs.writeFileSync(INSTRUCTION_FILE, '=== JDE DEBUG SESSION ===\n\n');
  
  const browser = await chromium.launch({ 
    headless: false,
    slowMo: 500
  });
  
  const context = await browser.newContext({ 
    viewport: { width: 1920, height: 1080 }
  });
  
  const page = await context.newPage();
  
  try {
    // Step 1: Open and Login
    console.log('📍 STEP 1: Opening JDE Login Page');
    await page.goto('https://demo.steltix.com/jde/E1Menu.maf', { waitUntil: 'networkidle' });
    await page.screenshot({ path: './screenshots/debug-01-login-page.png' });
    
    logInstruction('Browser opened. Filling credentials...');
    await page.locator('input[name="User"]').fill('demo');
    await page.locator('input[name="Password"]').fill('demo');
    await page.screenshot({ path: './screenshots/debug-02-credentials-filled.png' });
    
    logInstruction('✅ Credentials filled. Click the "Sign In" button on the page.');
    await waitForUser(10);
    
    // Step 2: Wait for JDE to load
    console.log('\n📍 STEP 2: Waiting for JDE Home');
    await page.waitForTimeout(5000);
    await page.screenshot({ path: './screenshots/debug-03-post-login.png' });
    
    // Check what loaded
    const frames = page.frames();
    logInstruction(`After login: ${frames.length} frames found`);
    
    for (let i = 0; i < frames.length; i++) {
      const url = frames[i].url();
      if (!url.includes('dummy') && url !== 'about:blank') {
        logInstruction(`  Frame ${i}: ${url.substring(0, 60)}`);
      }
    }
    
    // Step 3: Fast Path attempt
    console.log('\n📍 STEP 3: Fast Path Navigation');
    logInstruction('\n>>> YOUR TURN <<<');
    logInstruction('Look for the "Fast Path" text box at the top of the JDE menu');
    logInstruction('Click on it and type: P01012');
    logInstruction('Then press Enter');
    logInstruction('Watch if Address Book opens...');
    
    await waitForUser(15);
    
    // Check what happened
    await page.screenshot({ path: './screenshots/debug-04-after-fastpath.png' });
    
    const framesAfter = page.frames();
    logInstruction(`\nAfter Fast Path: ${framesAfter.length} frames`);
    
    let p01012Loaded = false;
    for (let i = 0; i < framesAfter.length; i++) {
      const url = framesAfter[i].url();
      if (!url.includes('dummy') && url !== 'about:blank') {
        logInstruction(`  Frame ${i}: ${url.substring(0, 60)}`);
        if (url.includes('P01012') || url.includes('Address')) {
          p01012Loaded = true;
          logInstruction('  ✓✓✓ ADDRESS BOOK LOADED! ✓✓✓');
        }
      }
    }
    
    if (!p01012Loaded) {
      logInstruction('\n⚠️  P01012 did NOT load via Fast Path');
      logInstruction('\n>>> YOUR TURN <<<');
      logInstruction('Try using the MENU TREE on the left side:');
      logInstruction('1. Look for "Customer Management" or similar');
      logInstruction('2. Click to expand folders');
      logInstruction('3. Look for "Address Book" or "Daily Processing"');
      logInstruction('4. Click on "Address Book" link');
      
      await waitForUser(20);
      
      // Check again
      await page.screenshot({ path: './screenshots/debug-05-after-menu.png' });
      const framesMenu = page.frames();
      logInstruction(`\nAfter menu navigation: ${framesMenu.length} frames`);
      
      for (let i = 0; i < framesMenu.length; i++) {
        const url = framesMenu[i].url();
        if (!url.includes('dummy') && url !== 'about:blank') {
          logInstruction(`  Frame ${i}: ${url.substring(0, 60)}`);
        }
      }
    }
    
    // Step 4: If we got here, let's inspect whatever is open
    console.log('\n📍 STEP 4: Inspecting Current State');
    
    // Find the active frame
    for (const frame of page.frames()) {
      const url = frame.url();
      if (url.includes('P01012') || url.includes('Address') || url.includes('Form')) {
        logInstruction(`\nFound active form: ${url}`);
        
        // Look for Add button
        const hasAdd = await frame.locator('#hc_Add').count() > 0;
        logInstruction(`Add button present: ${hasAdd}`);
        
        if (hasAdd) {
          logInstruction('\n>>> YOUR TURN <<<');
          logInstruction('Click the "Add" button (usually a toolbar icon)');
          logInstruction('It might look like a "+" or say "Add"');
          
          await waitForUser(10);
          await page.screenshot({ path: './screenshots/debug-06-after-add.png' });
        }
        
        // Look for form fields
        const inputs = await frame.locator('input[type="text"]').all();
        logInstruction(`\nForm has ${inputs.length} text inputs`);
        
        if (inputs.length > 0) {
          logInstruction('\n>>> YOUR TURN <<<');
          logInstruction('Fill in the customer form:');
          logInstruction('- Alpha Name: Test Customer');
          logInstruction('- Address Line 1: 123 Test Street');
          logInstruction('- City: Newark');
          logInstruction('- State: NJ');
          logInstruction('- Click Save/OK when done');
          
          await waitForUser(15);
          await page.screenshot({ path: './screenshots/debug-07-form-filled.png' });
        }
      }
    }
    
    // Final state
    console.log('\n📍 FINAL STATE');
    await page.screenshot({ path: './screenshots/debug-final.png' });
    logInstruction('\n✅ Debug session complete');
    logInstruction('Screenshots saved in ./screenshots/');
    logInstruction('Instructions logged to ./logs/debug-instructions.txt');
    
    console.log('\n🛑 Browser will stay open. Press Ctrl+C to close or wait 30s...');
    await page.waitForTimeout(30000);
    
  } catch (error) {
    console.error('Error:', error);
  } finally {
    await browser.close();
    console.log('\n✅ Browser closed.');
  }
}

collaborativeDebug().catch(console.error);
