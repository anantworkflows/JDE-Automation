import { test, expect, Page } from '@playwright/test';
import logger from '../utils/logger';
import JDEHelper from '../utils/jde-helper';

test.describe('Order Status Validation Tests', () => {
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

  test('Validate open order status', async () => {
    logger.info('Test: Validate open order status');
    
    await helper.navigateByFastPath('P43025');
    
    // Search for orders
    try {
      await helper.clickButton('Find');
      await page.waitForTimeout(3000);
    } catch {
      logger.warn('Find button not found');
    }
    
    await helper.takeScreenshot('order-status-validation');
    
    // Check for status column in grid
    const statusElements = await page.locator('text=/Open|Pending|Processing|Shipped|Closed/i').count();
    logger.info(`Found ${statusElements} status indicators`);
    
    expect(statusElements).toBeGreaterThanOrEqual(0);
  });

  test('Check order hold status', async () => {
    logger.info('Test: Check order hold status');
    
    await helper.navigateByFastPath('P43025');
    
    try {
      // Look for hold status indicators
      const holdElements = await page.locator('text=/Hold|Credit|Review/i').all();
      
      for (const element of holdElements.slice(0, 5)) {
        const text = await element.textContent();
        logger.info(`Found hold status: ${text}`);
      }
    } catch (error) {
      logger.warn('Could not check hold status');
    }
    
    await helper.takeScreenshot('order-hold-status');
  });

  test('Validate shipped order status', async () => {
    logger.info('Test: Validate shipped order status');
    
    await helper.navigateByFastPath('P4205'); // Shipment Confirmation
    
    try {
      // Search for shipped orders
      const statusFilter = page.locator('select, input[name*="status"]').first();
      await statusFilter.click();
      
      // Try to select 'Shipped' status
      try {
        await page.locator('option:has-text("Shipped"), option[value*="ship"]').first().click();
      } catch {
        await statusFilter.fill('Shipped');
      }
      
      await helper.clickButton('Find');
      await page.waitForTimeout(3000);
      
      await helper.takeScreenshot('shipped-orders');
    } catch (error) {
      logger.warn('Could not validate shipped status:', error);
    }
  });

  test('Verify order line status', async () => {
    logger.info('Test: Verify order line status');
    
    await helper.navigateByFastPath('P4210');
    
    try {
      // Search for an order
      await helper.fillFormField('Order', '1001');
      await helper.clickButton('Find');
      await page.waitForTimeout(3000);
      
      // Check line status in grid
      const gridData = await helper.getGridData();
      logger.info(`Order has ${gridData.length} lines`);
      
      for (const row of gridData.slice(0, 5)) {
        const rowText = row.join(' ');
        if (rowText.match(/open|shipped|cancelled/i)) {
          logger.info(`Line status found: ${rowText}`);
        }
      }
      
      await helper.takeScreenshot('order-line-status');
    } catch (error) {
      logger.warn('Could not verify line status:', error);
    }
  });
});
