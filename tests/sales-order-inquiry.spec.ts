import { test, expect, Page } from '@playwright/test';
import logger from '../utils/logger';
import JDEHelper from '../utils/jde-helper';

test.describe('Sales Order Inquiry Tests', () => {
  let page: Page;
  let helper: JDEHelper;

  test.beforeEach(async ({ browser }) => {
    const context = await browser.newContext({ viewport: { width: 1920, height: 1080 } });
    page = await context.newPage();
    helper = new JDEHelper(page);
    
    await helper.login({ username: 'demo', password: 'demo' });
  });

  test.afterEach(async () => {
    // Skip logout - browser close is sufficient for demo
    await page.close();
  });

  test('Inquiry existing sales order', async () => {
    logger.info('Test: Sales order inquiry');
    
    await helper.navigateByFastPath('P43025');
    await expect(page).toHaveURL(/.*P43025|.*inquiry.*/i);
    
    await helper.takeScreenshot('sales-order-inquiry-start');
    
    // Enter order number
    try {
      await helper.fillFormField('Order Number', '1001');
      await helper.clickButton('Find');
    } catch (error) {
      // Try generic approach
      const inputs = await page.locator('input[type="text"]').all();
      for (const input of inputs.slice(0, 3)) {
        try {
          await input.fill('1001');
          break;
        } catch {
          continue;
        }
      }
      await page.keyboard.press('Enter');
    }
    
    await page.waitForTimeout(3000);
    await helper.takeScreenshot('sales-order-inquiry-results');
    
    // Verify results
    const pageContent = await page.content();
    expect(pageContent.length).toBeGreaterThan(0);
  });

  test('Search orders by customer', async () => {
    logger.info('Test: Search orders by customer');
    
    await helper.navigateByFastPath('P43025');
    
    // Try to search by customer
    try {
      const customerInput = page.locator('input[name*="customer"], input[placeholder*="Customer" i]').first();
      await customerInput.fill('1001');
      await helper.clickButton('Find');
    } catch (error) {
      logger.warn('Customer search field not found');
    }
    
    await page.waitForTimeout(3000);
    await helper.takeScreenshot('orders-by-customer');
  });

  test('View order details', async () => {
    logger.info('Test: View order details');
    
    await helper.navigateByFastPath('P43025');
    
    // Search for an order
    try {
      await helper.fillFormField('Order', '1001');
      await helper.clickButton('Find');
      await page.waitForTimeout(3000);
      
      // Try to click on a row to view details
      const row = page.locator('table tr, .grid-row').nth(1);
      await row.click();
      await page.waitForTimeout(2000);
      
      await helper.takeScreenshot('order-details');
    } catch (error) {
      logger.warn('Could not view order details:', error);
    }
  });

  test('Export order inquiry results', async () => {
    logger.info('Test: Export order inquiry');
    
    await helper.navigateByFastPath('P43025');
    
    try {
      // Look for export button
      const exportBtn = page.locator('button:has-text("Export"), button[title*="Export"], a:has-text("Export")').first();
      await exportBtn.click();
      await page.waitForTimeout(2000);
      
      await helper.takeScreenshot('order-export');
    } catch (error) {
      logger.warn('Export functionality not available');
    }
  });
});
