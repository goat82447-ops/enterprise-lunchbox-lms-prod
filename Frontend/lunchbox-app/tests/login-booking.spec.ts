import { expect, test } from '@playwright/test';

const loginApiPattern = /\/api\/auth\/login$/;
const userActionApiPattern = /\/api\/auth\/user-action$/;

function loginSuccessPayload() {
  return {
    requiresOtp: false,
    tempToken: '',
    message: 'Login successful',
    sessionToken: 'test-session-token',
    user: {
      id: 'u-guest-1',
      username: 'user',
      displayName: 'Guest User',
      role: 'rider'
    },
    channels: {
      email: 'guest@example.com'
    }
  };
}

test.describe('Login and booking smoke', () => {
  test.beforeEach(async ({ page }) => {
    await page.route(loginApiPattern, async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify(loginSuccessPayload())
      });
    });

    await page.route(userActionApiPattern, async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ message: 'ok' })
      });
    });

    page.on('dialog', async (dialog) => {
      await dialog.dismiss();
    });
  });

  test('guest autofill and login navigates to home then booking', async ({ page }) => {
    await page.goto('/login');

    await page.getByRole('button', { name: /continue as guest/i }).click();
    await expect(page.getByPlaceholder('Enter username')).toHaveValue('user');
    await expect(page.getByPlaceholder('Enter password')).toHaveValue('user123');

    await page.getByRole('button', { name: /start login/i }).click();
    await expect(page).toHaveURL(/\/home$/, { timeout: 15000 });

    await page.goto('/booking');
    await expect(page).toHaveURL(/\/booking$/, { timeout: 10000 });
  });

  test('rapid login clicks send a single login request', async ({ page }) => {
    let loginRequestCount = 0;

    await page.unroute(loginApiPattern);
    await page.route(loginApiPattern, async (route) => {
      loginRequestCount += 1;
      await new Promise((resolve) => setTimeout(resolve, 800));
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify(loginSuccessPayload())
      });
    });

    await page.goto('/login');
    await page.getByRole('button', { name: /continue as guest/i }).click();

    const startLoginBtn = page.getByRole('button', { name: /start login/i });
    await startLoginBtn.click();
    await expect(startLoginBtn).toBeDisabled();

    // Try to click again quickly; a robust UI should not trigger a second request.
    await startLoginBtn.click({ force: true });
    await page.waitForTimeout(1200);

    expect(loginRequestCount).toBe(1);
  });
});

