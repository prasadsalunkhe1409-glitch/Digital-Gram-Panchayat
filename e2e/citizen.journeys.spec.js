import { test, expect } from '@playwright/test';

/**
 * Citizen PWA end-to-end journeys. Selectors favour accessible roles/labels; tune to the
 * running UI language if needed (set localStorage `dgp_language` to 'en' for stable text).
 *
 * Run: start MongoDB + `npm run dev`, then `npm run e2e -- --project=citizen`.
 */

const unique = () => `9${Math.floor(100000000 + Math.random() * 899999999)}`;
const PASSWORD = 'Secret@123';

/**
 * A fresh browser context is a first-time visitor, so the onboarding overlay opens over the
 * page and intercepts every click ("<div class=fixed inset-0 z-50 …> intercepts pointer
 * events"). These specs predate that overlay. Marking the intro as seen keeps each journey
 * about the journey; onboarding itself is covered by its own component tests.
 */
async function forceEnglish(page) {
  await page.addInitScript(() => {
    localStorage.setItem('dgp_language', 'en');
    localStorage.setItem('dgp_onboarded', '1');
  });
}

async function register(page, mobile) {
  await forceEnglish(page);
  await page.goto('/register');
  await page.getByLabel(/full name/i).fill('E2E Citizen');
  await page.getByLabel(/mobile/i).fill(mobile);
  await page.getByLabel(/password/i).fill(PASSWORD);
  await page.getByLabel(/village/i).fill('Sakharale');
  await page.getByLabel(/address/i).fill('Main Road');
  await page.getByRole('button', { name: /register/i }).click();

  /*
   * Wait for the session to actually exist.
   *
   * This used to assert `toHaveURL(/\/$|\/home|\//)`. The final `\/` alternative matches ANY
   * path — including /register — so the assertion resolved immediately and could never fail.
   * Every caller then went straight to page.goto(), racing the in-flight registration POST:
   * the token was not written yet, the protected route bounced, and the journey failed on a
   * missing heading that had nothing to do with the bug.
   *
   * Anchoring on `/$` means the dashboard specifically, and the nav landmark proves the app
   * rendered as a signed-in citizen rather than redirecting to the public page.
   */
  await expect(page).toHaveURL(/\/$/);
  await expect(page.getByRole('navigation')).toBeVisible();
}

test('citizen registration creates a session', async ({ page }) => {
  await register(page, unique());
  await expect(page.getByRole('navigation')).toBeVisible();
});

test('citizen login after registration', async ({ page }) => {
  const mobile = unique();
  await register(page, mobile);
  await page.evaluate(() => localStorage.clear());
  await forceEnglish(page);
  await page.goto('/login');
  await page.getByLabel(/mobile/i).fill(mobile);
  await page.getByLabel(/password/i).fill(PASSWORD);
  await page.getByRole('button', { name: /log in/i }).click();
  await expect(page).toHaveURL(/\/$/);
});

test('complaint submission then tracking in history', async ({ page }) => {
  await register(page, unique());
  await page.goto('/complaints/new');
  await page.getByLabel(/category/i).selectOption({ index: 1 });
  await page.getByLabel(/subject/i).fill('Pothole near the temple');
  await page.getByLabel(/description/i).fill('A large pothole needs urgent repair.');
  await page.getByRole('button', { name: /submit/i }).click();

  await page.goto('/complaints');
  await expect(page.getByText(/pothole near the temple/i)).toBeVisible();
});

/**
 * A real PDF, not an empty buffer: the upload middleware verifies magic bytes, so a file whose
 * contents do not match its declared type is rejected before it reaches the service.
 */
const PDF = { name: 'proof.pdf', mimeType: 'application/pdf', buffer: Buffer.from('%PDF-1.4') };

test('certificate application journey', async ({ page }) => {
  const mobile = unique();
  await register(page, mobile);
  await page.goto('/dakhala/new');

  await page.getByLabel(/certificate type/i).selectOption('Marriage');
  // Marriage names both spouses, so /full name/i alone matches two fields.
  await page.getByLabel(/groom.*full name/i).fill('E2E Groom');
  await page.getByLabel(/bride.*full name/i).fill('E2E Bride');
  await page.getByLabel(/date of marriage/i).fill('2026-02-14');
  await page.getByLabel(/place of marriage/i).fill('Sakharale');
  await page.getByLabel(/mobile/i).fill(mobile);
  await page.getByLabel(/address/i).fill('Main Road, Sakharale');

  /*
   * Certificates gained per-type required document groups (identity proof, address proof, a
   * declaration) after this spec was written; selecting a type and pressing submit has not
   * been enough for a long time. Attaching to every group keeps the test honest whichever
   * groups the chosen type marks required, and exercises the real upload path end to end.
   */
  const fileInputs = page.locator('input[type="file"]');
  const groups = await fileInputs.count();
  for (let i = 0; i < groups; i += 1) {
    // select 0 is the certificate type; the document-type selects follow, one per group.
    await page
      .locator('main select')
      .nth(i + 1)
      .selectOption({ index: 0 });
    await fileInputs.nth(i).setInputFiles(PDF);
  }

  await page.getByRole('button', { name: /submit/i }).click();

  await page.goto('/dakhala');
  await expect(page.getByText(/DKH-/)).toBeVisible();
});

test('tax summary view', async ({ page }) => {
  await register(page, unique());
  await page.goto('/tax');
  // Empty or populated — the screen must render without error.
  await expect(page.getByRole('heading', { name: /tax/i })).toBeVisible();
});
