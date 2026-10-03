import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import { Toaster } from 'react-hot-toast';
import { afterAll, describe, it, expect, beforeEach } from 'vitest';
import { NOTIFICATION_CHANNELS } from '@dgp/shared';
import i18n from '@/locales/i18n';
import { NotificationSettings } from '@/features/notifications/pages/NotificationSettings';

/**
 * Notification settings, rendered through the real i18next instance.
 *
 * Two things make this worth asserting literally rather than through `t()`.
 *
 * First, the strings live in the catalogue as flat keys whose own names contain a dot
 * ("settings.title", beside a sibling "settings" string). i18next resolves that correctly —
 * deepFind rejoins dotted segments when an intermediate value is not an object — so both
 * `notif.settings` and `notif.settings.title` are live keys and both are in use. A mocked `t`
 * cannot see any of that.
 *
 * Second, fallbackLng is 'mr'. A missing English string therefore does not render a raw key;
 * it silently renders Marathi to an English reader. Expectations resolved through `t()` would
 * follow that same fallback and pass against the broken output, so the expected text is
 * written out in full here. That is what makes the test fail when resolution stops working.
 */
const EXPECTED = {
  en: {
    parent: 'Settings',
    title: 'Notification settings',
    subtitle: "Choose how you'd like to be notified.",
    inApp: 'In-app notifications',
    sms: 'SMS',
    voice: 'Voice call',
    email: 'Email',
    save: 'Save preferences',
    saved: 'Preferences saved',
  },
  mr: {
    parent: 'सेटिंग्ज',
    title: 'सूचना सेटिंग्ज',
    subtitle: 'तुम्हाला कशा प्रकारे सूचित करावे ते निवडा.',
    inApp: 'अ‍ॅपमधील सूचना',
    sms: 'SMS',
    voice: 'व्हॉइस कॉल',
    email: 'ईमेल',
    save: 'प्राधान्ये जतन करा',
    saved: 'प्राधान्ये जतन झाली',
  },
};

const renderPage = () =>
  render(
    <MemoryRouter>
      <NotificationSettings />
      <Toaster />
    </MemoryRouter>,
  );

afterAll(async () => {
  // setup.js pins English once at import; a language left switched would leak into other files.
  await i18n.changeLanguage('en');
});

beforeEach(() => localStorage.clear());

describe.each([
  ['English', 'en'],
  ['Marathi', 'mr'],
])('notification settings in %s', (_name, lang) => {
  const x = EXPECTED[lang];

  beforeEach(async () => {
    await i18n.changeLanguage(lang);
  });

  it('shows the page title and subtitle', () => {
    renderPage();
    expect(screen.getByRole('heading', { level: 1 })).toHaveTextContent(x.title);
    expect(screen.getByText(x.subtitle)).toBeInTheDocument();
  });

  it('labels every notification channel', () => {
    renderPage();
    for (const ch of NOTIFICATION_CHANNELS) {
      expect(screen.getByText(x[ch])).toBeInTheDocument();
    }
  });

  it('names the save button', () => {
    renderPage();
    expect(screen.getByRole('button', { name: x.save })).toBeInTheDocument();
  });

  it('confirms a save in words, and actually persists the preference', async () => {
    renderPage();
    const user = userEvent.setup();

    await user.click(screen.getByRole('checkbox', { name: x.email }));
    await user.click(screen.getByRole('button', { name: x.save }));

    // The toast is the only place `saved` ever reaches the user.
    expect(await screen.findByText(x.saved)).toBeInTheDocument();
    // Existing behaviour unchanged: the choice is written to the same storage key.
    expect(JSON.parse(localStorage.getItem('dgp_notification_prefs')).email).toBe(true);
  });

  it('leaves the in-app channel switched on and locked', () => {
    renderPage();
    // Pre-existing behaviour: in-app cannot be turned off, so it must not look editable.
    const inApp = screen.getByRole('checkbox', { name: x.inApp });
    expect(inApp).toBeChecked();
    expect(inApp).toBeDisabled();
  });

  it('renders no raw translation key anywhere on the page', () => {
    const { container } = renderPage();
    expect(container.textContent).not.toMatch(/notif.settings/);
  });
});

describe('the keys this page depends on', () => {
  it.each([
    ['en', EXPECTED.en],
    ['mr', EXPECTED.mr],
  ])('%s resolves every notification-settings key through i18next', (lang, x) => {
    const t = i18n.getFixedT(lang);
    expect(t('notif.settings.title')).toBe(x.title);
    expect(t('notif.settings.subtitle')).toBe(x.subtitle);
    expect(t('notif.settings.save')).toBe(x.save);
    expect(t('notif.settings.saved')).toBe(x.saved);
    for (const ch of NOTIFICATION_CHANNELS) expect(t(`notif.settings.${ch}`)).toBe(x[ch]);
  });

  it.each([
    ['en', EXPECTED.en],
    ['mr', EXPECTED.mr],
  ])('%s resolves the parent key and its children at the same time', (lang, x) => {
    // Both are live: `notif.settings` names the icon button that opens this page, and the
    // children fill the page itself. A restructure that fixes one by breaking the other is
    // the failure this guards.
    const t = i18n.getFixedT(lang);
    expect(t('notif.settings')).toBe(x.parent);
    expect(t('notif.settings.title')).toBe(x.title);
  });
});
