export async function Authenticate_with_JDE(
  page: Page
): Promise<void> {
  console.log('Executing: Authenticate with JDE');

  // Navigate to ${base_url}/${url}
  await page.goto('${base_url}/${url}', { waitUntil: 'networkidle' });

  // Fill username_field
  const username_field = await resolveSelectors(page, ['input[name='User']', '#User', 'input[placeholder*='User' i]']);
  await username_field.fill('${credentials.username}');

  // Fill password_field
  const password_field = await resolveSelectors(page, ['input[name='Password']', '#Password', 'input[type='password']']);
  await password_field.fill('${credentials.password}');

  // Click login_button
  const login_button = await resolveSelectors(page, ['input[type='submit']', 'button[type='submit']', 'button:has-text('Sign In')']);
  await login_button.click();

  // Wait 5000ms
  await page.waitForTimeout(5000);

  console.log('Step completed successfully');
}