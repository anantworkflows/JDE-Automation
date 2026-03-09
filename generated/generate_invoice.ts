export async function Generate_invoice_for_shipped_order(
  page: Page
): Promise<void> {
  console.log('Executing: Generate invoice for shipped order');

  // Click menu_button
  const menu_button = await resolveSelectors(page, ['#drop_mainmenu', 'img[alt*='Menu']', 'button[title*='Menu' i]']);
  await menu_button.click();

  // Wait 1000ms
  await page.waitForTimeout(1000);

  // Fill fast_path_input
  const fast_path_input = await resolveSelectors(page, ['#TE_FAST_PATH_BOX', 'input[name*='FastPath' i]', 'input[placeholder*='Fast' i]']);
  await fast_path_input.fill('R42800');


  // Wait for frame: R42800
  await page.waitForSelector('iframe[src*="R42800"]', { timeout: 10000 });

  // Wait 5000ms
  await page.waitForTimeout(5000);

  // Fill order_number_field
  const order_number_field = await resolveSelectors(page, ['#C0_25', 'input[name*='Order' i]', 'input[aria-label*='Order' i]']);
  await order_number_field.fill('${captured_values.order_number}');

  // Click submit_button
  const submit_button = await resolveSelectors(page, ['#hc_Submit', '#hc_OK', 'button[type='submit']']);
  await submit_button.click();

  // Wait 5000ms
  await page.waitForTimeout(5000);

  console.log('Step completed successfully');
}