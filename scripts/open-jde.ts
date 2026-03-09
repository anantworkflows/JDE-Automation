import { chromium } from '@playwright/test';

async function openJDE() {
  console.log('╔════════════════════════════════════════════════════════╗');
  console.log('║     JDE BROWSER - MANUAL GUIDE                         ║');
  console.log('╚════════════════════════════════════════════════════════╝\n');
  
  console.log('Opening browser to JDE login page...\n');
  
  const browser = await chromium.launch({ 
    headless: false,
    slowMo: 500
  });
  
  const context = await browser.newContext({ 
    viewport: { width: 1920, height: 1080 }
  });
  
  const page = await context.newPage();
  
  // Open JDE login
  await page.goto('https://demo.steltix.com/jde/E1Menu.maf', { waitUntil: 'networkidle' });
  
  console.log('✅ Browser opened to: https://demo.steltix.com/jde/E1Menu.maf\n');
  console.log('═══════════════════════════════════════════════════════════\n');
  console.log('STEP 1 - LOGIN:');
  console.log('  1. Find the "User ID" field (should be visible)');
  console.log('  2. Type: demo');
  console.log('  3. Find the "Password" field');
  console.log('  4. Type: demo');
  console.log('  5. Click the "Sign In" button');
  console.log('\nAfter you click Sign In, tell me what you see.');
  console.log('Browser will stay open.\n');
  
  // Keep browser open
  setInterval(() => {
    // Keepalive
  }, 10000);
  
  // Don't close - let user interact
  console.log('🛑 To close browser, press Ctrl+C in this terminal\n');
}

openJDE().catch(console.error);
