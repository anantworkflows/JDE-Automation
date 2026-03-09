export async function Create_new_sales_order(
  page: Page
): Promise<void> {
  console.log('Executing: Create new sales order');

  // Refresh frame context
  await findAppFrame(page);

  // Click add_button
  const add_button = await resolveSelectors(page, ['#hc_Add', 'img[alt*='Add']', 'button[title*='Add' i]']);
  await add_button.click();


  // Fill ship_to_field
  const ship_to_field = await resolveSelectors(page, ['#C0_10', 'input[name*='ShipTo' i]', 'input[aria-label*='Ship' i]']);
  await ship_to_field.fill('1001');

  // Fill branch_plant_field
  const branch_plant_field = await resolveSelectors(page, ['#C0_30', 'input[name*='Branch' i]', 'input[aria-label*='Branch' i]']);
  await branch_plant_field.fill('30');

  // Fill item_number_field
  const item_number_field = await resolveSelectors(page, ['#C0_42', 'input[name*='Item' i]', 'input[aria-label*='Item' i]']);
  await item_number_field.fill('220');

  // Fill quantity_field
  const quantity_field = await resolveSelectors(page, ['#QTY', 'input[name*='Quantity' i]', 'input[aria-label*='Quantity' i]']);
  await quantity_field.fill('5');

  // Click ok_button
  const ok_button = await resolveSelectors(page, ['#hc_OK', 'img[alt*='OK']', 'button[title*='OK' i]']);
  await ok_button.click();

  // Wait 5000ms
  await page.waitForTimeout(5000);

  console.log('Step completed successfully');
}