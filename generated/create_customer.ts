export async function Create_new_customer_in_Address_Book(
  page: Page
): Promise<void> {
  console.log('Executing: Create new customer in Address Book');

  // Refresh frame context
  await findAppFrame(page);

  // Click add_button
  const add_button = await resolveSelectors(page, ['#hc_Add', 'img[alt*='Add']', 'button[title*='Add' i]']);
  await add_button.click();


  // Fill customer_name_field
  const customer_name_field = await resolveSelectors(page, ['#C0_28', 'input[name*='Alpha' i]', 'input[aria-label*='Alpha' i]']);
  await customer_name_field.fill('Test Customer');

  // Fill address_field
  const address_field = await resolveSelectors(page, ['#C0_32', 'input[name*='Address' i]', 'input[aria-label*='Address' i]']);
  await address_field.fill('123 Test Street');

  // Fill city_field
  const city_field = await resolveSelectors(page, ['#C0_34', 'input[name*='City' i]', 'input[aria-label*='City' i]']);
  await city_field.fill('Newark');

  // Fill search_type_field
  const search_type_field = await resolveSelectors(page, ['#C0_36', 'input[name*='Search' i]', 'input[aria-label*='Search' i]']);
  await search_type_field.fill('C');

  // Click ok_button
  const ok_button = await resolveSelectors(page, ['#hc_OK', 'img[alt*='OK']', 'button[title*='OK' i]']);
  await ok_button.click();

  // Wait 3000ms
  await page.waitForTimeout(3000);

  console.log('Step completed successfully');
}