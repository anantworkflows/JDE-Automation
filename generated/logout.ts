export async function Logout_from_JDE_session(
  page: Page
): Promise<void> {
  console.log('Executing: Logout from JDE session');

  // Click logout_button
  const logout_button = await resolveSelectors(page, ['#drop_logout', 'a[href*='logout' i]', 'button:has-text('Logout')']);
  await logout_button.click();

  // Wait 3000ms
  await page.waitForTimeout(3000);

  console.log('Step completed successfully');
}