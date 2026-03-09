export async function Check_inventory_levels_for_ordered_item(
  page: Page
): Promise<void> {
  console.log('Executing: Check inventory levels for ordered item');

  // Click menu_button
  const menu_button = await resolveSelectors(page, ['#drop_mainmenu', 'img[alt*='Menu']', 'button[title*='Menu' i]']);
  await menu_button.click();

  // Wait 1000ms
  await page.waitForTimeout(1000);

  // Fill fast_path_input
  const fast_path_input = await resolveSelectors(page, ['#TE_FAST_PATH_BOX', 'input[name*='FastPath' i]', 'input[placeholder*='Fast' i]']);
  await fast_path_input.fill('P41200');


  // Wait for frame: P41200
  await page.waitForSelector('iframe[src*="P41200"]', { timeout: 10000 });

  // Wait 5000ms
  await page.waitForTimeout(5000);

  // Fill item_number_field
  const item_number_field = await resolveSelectors(page, ['#C0_42', 'input[name*='Item' i]', 'input[aria-label*='Item' i]']);
  await item_number_field.fill('220');

  // Click search_button
  const search_button = await resolveSelectors(page, ['#hc_Search', 'img[alt*='Search']', 'button[title*='Search' i]']);
  await search_button.click();

  // Wait 3000ms
  await page.waitForTimeout(3000);

  console.log('Step completed successfully');
}