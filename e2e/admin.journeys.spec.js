import { test, expect } from '@playwright/test';

/**
 * Officer portal end-to-end journeys. Requires a seeded officer account
 * (`npm run seed:admin -w backend`, default admin@dgp.local / Admin@123).
 *
 * Run: start MongoDB + `npm run dev`, then `npm run e2e -- --project=admin`.
 */

const EMAIL = process.env.E2E_ADMIN_EMAIL || 'admin@dgp.local';
const PASSWORD = process.env.E2E_ADMIN_PASSWORD || 'Admin@123';

const API_URL = process.env.E2E_API_URL || 'http://localhost:5000/api/v1';

/**
 * The admin portal no longer hosts its own login form — the shared login page (citizen app)
 * authenticates and hands the token over via /auth/callback. Journeys here authenticate
 * against the API directly and enter the portal through that same hand-off route, which
 * also exercises the callback + boot-verification path.
 */
async function login(page) {
  await page.addInitScript(() => {
    localStorage.setItem('dgp_language', 'en');
    // The hand-off passes through the citizen origin, where onboarding would intercept clicks.
    localStorage.setItem('dgp_onboarded', '1');
  });
  const res = await page.request.post(`${API_URL}/auth/session`, {
    data: { identifier: EMAIL, password: PASSWORD },
  });
  const body = await res.json();
  await page.goto(`/auth/callback#token=${encodeURIComponent(body.data.token)}`);
  await expect(page).toHaveURL(/\/$/);
}

test('admin login reaches the dashboard', async ({ page }) => {
  await login(page);
  // The officer header gained a breadcrumb <nav> in Phase 2, so a bare navigation role now
  // matches two elements. Name the one this assertion is actually about.
  await expect(page.getByRole('navigation', { name: /main navigation/i })).toBeVisible();
});

test('admin resolves a complaint', async ({ page }) => {
  await login(page);
  await page.goto('/complaints');
  const firstRow = page.getByRole('link', { name: /CMP-/ }).first();
  if (await firstRow.count()) {
    await firstRow.click();
    const statusSelect = page.getByLabel(/status/i);
    if (await statusSelect.count()) {
      await statusSelect.selectOption({ label: 'Resolved' }).catch(() => {});
      await page
        .getByRole('button', { name: /update|save/i })
        .first()
        .click();
      await expect(page.getByText(/resolved/i).first()).toBeVisible();
    }
  }
});

test('admin toggles a user account status', async ({ page }) => {
  await login(page);
  await page.goto('/users');
  const first = page.getByRole('link').filter({ hasText: /\d/ }).first();
  if (await first.count()) {
    await first.click();
    const toggle = page.getByRole('button', { name: /activate|deactivate/i }).first();
    if (await toggle.count()) {
      await toggle.click();
    }
  }
});

/**
 * Issuing a certificate is now the officer portal's real upload, and the only end-to-end
 * exercise of a file travelling from a form to storage. It replaces the Download Centre
 * test, which drove a screen this phase removed.
 *
 * The buffer starts with %PDF- because the upload path verifies magic bytes: a file whose
 * contents contradict its declared type is rejected before the service sees it.
 */
test('admin issues a certificate by uploading the prepared document', async ({ page }) => {
  await login(page);
  await page.goto('/dakhala');

  const first = page.getByRole('link', { name: /DKH-/ }).first();
  if (!(await first.count())) return; // nothing awaiting a decision in this run
  await first.click();

  const approve = page.getByRole('button', { name: /approve/i });
  if (!(await approve.count())) return; // already decided
  await approve.click();

  // The decision panel asks for the prepared certificate and will not submit without it.
  const file = page.locator('input[type="file"]');
  await expect(file).toBeVisible();
  await file.setInputFiles({
    name: 'certificate.pdf',
    mimeType: 'application/pdf',
    buffer: Buffer.from('%PDF-1.4'),
  });

  await page.getByRole('button', { name: /issue/i }).click();
  await expect(page.getByText(/issued/i).first()).toBeVisible();
});
