export async function Navigate_to_Address_Book_(P01012)_via_Fast_Path(
  page: Page
): Promise<void> {
  console.log('Executing: Navigate to Address Book (P01012) via Fast Path');

  // Click menu_button
  const menu_button = await resolveSelectors(page, ['#drop_mainmenu', 'img[alt*='Menu']', 'button[title*='Menu' i]']);
  await menu_button.click();

  // Wait 1000ms
  await page.waitForTimeout(1000);

  // Fill fast_path_input
  const fast_path_input = await resolveSelectors(page, ['#TE_FAST_PATH_BOX', 'input[name*='FastPath' i]', 'input[placeholder*='Fast' i]']);
  await fast_path_input.fill('P01012');


  // Wait for frame: RunApp.mafService
  await page.waitForSelector('iframe[src*="RunApp.mafService"]', { timeout: 10000 });

  // Wait 3000ms
  await page.waitForTimeout(3000);

  console.log('Step completed successfully');
}