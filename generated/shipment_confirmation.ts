export async function Confirm_shipment_of_sales_order(
  page: Page
): Promise<void> {
  console.log('Executing: Confirm shipment of sales order');

  // Click menu_button
  const menu_button = await resolveSelectors(page, ['#drop_mainmenu', 'img[alt*='Menu']', 'button[title*='Menu' i]']);
  await menu_button.click();

  // Wait 1000ms
  await page.waitForTimeout(1000);

  // Fill fast_path_input
  const fast_path_input = await resolveSelectors(page, ['#TE_FAST_PATH_BOX', 'input[name*='FastPath' i]', 'input[placeholder*='Fast' i]']);
  await fast_path_input.fill('P4205');


  // Wait for frame: P4205
  await page.waitForSelector('iframe[src*="P4205"]', { timeout: 10000 });

  // Wait 5000ms
  await page.waitForTimeout(5000);

  // Fill order_number_field
  const order_number_field = await resolveSelectors(page, ['#C0_25', 'input[name*='Order' i]', 'input[aria-label*='Order' i]']);
  await order_number_field.fill('${captured_values.order_number}');

  // Click search_button
  const search_button = await resolveSelectors(page, ['#hc_Search', 'img[alt*='Search']', 'button[title*='Search' i]']);
  await search_button.click();

  // Wait 3000ms
  await page.waitForTimeout(3000);

  // Click select_all_checkbox
  const select_all_checkbox = await resolveSelectors(page, ['input[type='checkbox']:first-of-type', '#SelectAll', 'th input[type='checkbox']']);
  await select_all_checkbox.click();

  // Click confirm_button
  const confirm_button = await resolveSelectors(page, ['#hc_Confirm', '#hc_OK', 'button[title*='Confirm' i]']);
  await confirm_button.click();

  // Wait 3000ms
  await page.waitForTimeout(3000);

  console.log('Step completed successfully');
}