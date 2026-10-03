import { readFileSync, readdirSync } from 'node:fs';
import { dirname, join, sep } from 'node:path';
import { fileURLToPath } from 'node:url';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import en from '@/locales/en/common.json';
import mrLocale from '@/locales/mr/common.json';

const SRC = join(dirname(fileURLToPath(import.meta.url)), '..');
const read = (rel) => readFileSync(join(SRC, rel), 'utf8');

vi.mock('react-i18next', () => ({
  useTranslation: () => ({ t: (k, f) => f ?? k, i18n: { language: 'en' } }),
}));

/**
 * Where the services grid sits on the authenticated home page.
 *
 * Order is a property of the source, not of a rendered tree we could query cheaply — Home
 * pulls eight hooks and renders a dozen sections. Reading the file is the honest way to
 * assert "immediately below the search box", and it fails if anything is inserted between
 * them, which is exactly the regression this guards.
 */
describe('authenticated home layout', () => {
  const src = read('pages/Home.jsx');
  const at = (needle) => {
    const i = src.indexOf(needle);
    expect(i, `${needle} not found in Home.jsx`).toBeGreaterThan(-1);
    return i;
  };

  it('puts the services grid directly below the search box', () => {
    const search = at('<GlobalSearch');
    const services = at('aria-labelledby="qs-h"');
    expect(services).toBeGreaterThan(search);

    // Nothing may sit between them. These are the two blocks that used to.
    const between = src.slice(search, services);
    expect(between).not.toContain('<PriorityBoard');
    expect(between).not.toContain('events-h');
  });

  it('keeps the personal status band and the events below the services', () => {
    expect(at('<PriorityBoard')).toBeGreaterThan(at('aria-labelledby="qs-h"'));
    expect(at('events-h')).toBeGreaterThan(at('aria-labelledby="qs-h"'));
  });

  it('does not show the village statistics to a signed-in citizen', () => {
    // Public-facing material; it stays on /welcome. The data and API are untouched.
    expect(src).not.toContain('VillageStats');
  });

  it('still shows the statistics on the public welcome page', () => {
    expect(read('pages/PublicHome.jsx')).toContain('id="stats"');
  });

  it('offers exactly the eight intended services, and none of the withdrawn ones', () => {
    for (const to of [
      '/complaints/new',
      '/dakhala',
      '/tax',
      '/schemes',
      '/notices',
      '/meetings',
      '/projects',
      '/polls',
    ]) {
      expect(src).toContain(`to: '${to}'`);
    }
    for (const gone of ['/directory', '/verify', '/notifications', '/downloads', '/feedback']) {
      expect(src).not.toContain(`to: '${gone}'`);
    }
  });
});

/**
 * The notification centre duplicated the notices feed, so it is gone from the citizen app.
 * The backend is deliberately untouched — certificate and tax events still create
 * notification records, and those flows are covered by the backend suite.
 */
describe('the notification centre is gone from the citizen app', () => {
  it('has no route to it', () => {
    const router = read('routes/AppRouter.jsx');
    expect(router).not.toContain("path: 'notifications'");
    expect(router).not.toContain("path: 'notifications/:id'");
    expect(router).not.toContain('NotificationCenter');
  });

  it('has no bell in the header', () => {
    const header = read('layouts/Header.jsx');
    expect(header).not.toContain('Bell');
    expect(header).not.toContain('useUnreadCount');
    expect(header).not.toContain('/notifications');
  });

  it('no longer offers an unread card on the home dashboard', () => {
    expect(read('features/home/PriorityBoard.jsx')).not.toContain("to: '/notifications'");
  });

  it('keeps notification preferences, which are settings rather than a feed', () => {
    expect(read('features/settings/pages/Settings.jsx')).toContain('NotificationPrefs');
  });
});

/** One way back, and it must say where it goes in both languages. */
describe('the Back control', () => {
  beforeEach(() => {
    window.history.replaceState({ idx: 0 }, '');
  });

  it('is a button with an accessible name', async () => {
    const { BackButton } = await import('@/components/BackButton');
    render(
      <MemoryRouter initialEntries={['/complaints/new']}>
        <BackButton to="/complaints" />
      </MemoryRouter>,
    );
    expect(screen.getByRole('button', { name: 'common.back' })).toBeInTheDocument();
  });

  it('falls back to the parent route when the page was opened directly', async () => {
    const { BackButton } = await import('@/components/BackButton');
    render(
      <MemoryRouter initialEntries={['/complaints/new']}>
        <Routes>
          <Route path="/complaints/new" element={<BackButton to="/complaints" />} />
          <Route path="/complaints" element={<p>complaint list</p>} />
        </Routes>
      </MemoryRouter>,
    );

    // history.state.idx is 0 — there is nothing behind this entry, so going "back" must land
    // on the parent rather than walking out of the app.
    await userEvent.click(screen.getByRole('button'));
    expect(screen.getByText('complaint list')).toBeInTheDocument();
  });

  it('renders nothing on a page that is its own fallback, instead of a button to here', async () => {
    const { BackButton } = await import('@/components/BackButton');
    const { container } = render(
      <MemoryRouter initialEntries={['/']}>
        <BackButton to="/" />
      </MemoryRouter>,
    );
    expect(container.querySelector('button')).toBeNull();
  });

  it('is translated in both languages', () => {
    expect(en.common.back).toBe('Back');
    expect(mrLocale.common.back).toBeTruthy();
    expect(mrLocale.common.back).not.toBe(en.common.back);
  });
});

/** Light theme only, and the gold accent reserved for the public call to action. */
describe('design tokens', () => {
  const css = read('styles/index.css');

  it('defines the approved government palette centrally', () => {
    expect(css).toContain('--primary: 224 64% 33%'); // #1E3B8B
    expect(css).toContain('--accent-gold: 42 98% 57%'); // #FDBD26
    expect(css).toContain('--background: 213 30% 93%'); // #E7ECF2
    expect(css).toContain('--card: 42 45% 96%'); // #F9F6EF
    expect(css).toContain('--interactive: 219 79% 56%'); // #3774E7
    expect(css).toContain('--primary-subtle: 212 100% 93%'); // #DAEBFF
  });

  it('keeps one name per colour — no near-duplicate surface token', () => {
    // --card is the warm surface now, so a second warm variable would be the thing the
    // brief forbids: two names for the same colour, drifting apart later.
    expect(css).not.toContain('--surface-warm');
  });

  it('splits the interactive blue by what it has to carry', () => {
    // #3774E7 as text is 3.68:1 on the page — fine for an icon, not for a link.
    expect(css).toContain('--interactive-strong: 219 79% 46%');
  });

  it('has no dark theme at all', () => {
    expect(css).not.toContain("data-theme='dark'");
    expect(css).not.toContain('prefers-color-scheme: dark');
  });

  it('uses the gold token for the public call to action, not a hardcoded hex', () => {
    const publicHome = read('pages/PublicHome.jsx');
    expect(publicHome).toContain('bg-gold');
    expect(publicHome).toContain('text-gold-foreground');
    expect(publicHome).not.toMatch(/#(FBBF24|fbbf24|F59E0B|f59e0b)/);
  });

  it('gives the public portal a royal-blue header', () => {
    expect(read('pages/PublicHome.jsx')).toContain('bg-primary text-primary-foreground');
  });
});

/**
 * Back navigation coverage, asserted from source because each of these pages pulls its own
 * query hooks and a rendered sweep would be eleven mock harnesses for one structural fact.
 *
 * Home is deliberately absent: it has no logical parent, and a back control there would
 * either loop or leave the app.
 */
describe('back navigation reaches every module screen', () => {
  it.each([
    ['features/dakhala/pages/ApplicationList.jsx', 'Certificates'],
    ['features/tax/pages/TaxSummary.jsx', 'Tax'],
    ['features/schemes/pages/SchemeList.jsx', 'Schemes'],
    ['features/notices/pages/NoticeList.jsx', 'Notices'],
    ['features/complaints/pages/ComplaintHistory.jsx', 'Complaints'],
    ['features/governance/pages/Meetings.jsx', 'Gram Sabha'],
    ['features/governance/pages/Projects.jsx', 'Works'],
    ['features/governance/pages/Polls.jsx', 'Polls'],
  ])('%s (%s) offers a way back to Home', (file) => {
    expect(read(file)).toContain('backTo="/"');
  });

  it.each([
    ['features/complaints/pages/ComplaintDetail.jsx'],
    ['features/dakhala/pages/ApplicationDetail.jsx'],
    ['features/notices/pages/NoticeDetail.jsx'],
    ['features/schemes/pages/SchemeDetail.jsx'],
  ])('%s returns to its parent list, not to Home', (file) => {
    const src = read(file);
    expect(src).toContain('backTo=');
    expect(src).not.toContain('backTo="/"');
  });

  it('routes both shared headers through the one Back control', () => {
    for (const c of ['components/PageHeader.jsx', 'components/ModuleHeader.jsx']) {
      expect(read(c)).toContain('<BackButton');
    }
  });

  it('leaves Home without one, because it has no parent', () => {
    expect(read('pages/Home.jsx')).not.toContain('BackButton');
  });

  it('gives the login page a way back to the public village page', () => {
    expect(read('features/auth/pages/Login.jsx')).toContain('<BackButton to="/welcome"');
  });
});

/** Buttons come from one system; no colour is mixed in at a call site. */
describe('the button system', () => {
  const src = read('components/ui/button.jsx');

  it('defines navy, interactive, gold, outline and destructive in one place', () => {
    expect(src).toContain('bg-primary text-primary-foreground');
    expect(src).toContain('bg-interactive-strong text-interactive-foreground');
    expect(src).toContain('bg-gold text-gold-foreground');
    expect(src).toContain('bg-destructive');
  });

  it('never puts white on gold', () => {
    // White on #FDBD26 is 1.68:1. The variant carries ink, and nothing may override it.
    expect(src).not.toMatch(/bg-gold[^']*text-(primary-)?foreground'/);
    expect(src).toContain('bg-gold text-gold-foreground');
  });

  it('is not bypassed by a hand-mixed colour on the login action', () => {
    const login = read('features/auth/components/LoginForm.jsx');
    // The class, not the word — the comment above it names the colour it replaced.
    expect(login).not.toMatch(/className=\{?[^}]*bg-info/);
    expect(login).toContain("variant={officer ? 'default' : 'secondary'}");
  });
});

/**
 * The village photograph belongs to the public welcome page and nowhere else. It is a 386 KB
 * above-the-fold image; on a signed-in screen it would be weight with no job to do.
 */
describe('the welcome hero image is scoped to /welcome', () => {
  const HERO = 'gram-panchayat-hero.webp';

  it('is referenced by PublicHome', () => {
    const src = read('pages/PublicHome.jsx');
    expect(src).toContain(HERO);
    expect(src).toContain('object-cover');
  });

  it('is referenced by no other component, layout or stylesheet', () => {
    const offenders = [];
    (function walk(dir) {
      for (const e of readdirSync(dir, { withFileTypes: true })) {
        const p = join(dir, e.name);
        if (e.isDirectory()) {
          if (!/node_modules|dist|test/.test(e.name)) walk(p);
        } else if (/\.(jsx?|css)$/.test(e.name)) {
          const rel = p
            .slice(SRC.length + 1)
            .split(sep)
            .join('/');
          if (rel === 'pages/PublicHome.jsx') continue;
          if (readFileSync(p, 'utf8').includes(HERO)) offenders.push(rel);
        }
      }
    })(SRC);
    expect(offenders).toEqual([]);
  });

  it('does not become a global page background', () => {
    const css = read('styles/index.css');
    expect(css).not.toContain(HERO);
    expect(css).not.toMatch(/body\s*\{[^}]*background-image/);
  });

  it('lets an officer-supplied banner take precedence over it', () => {
    // The village profile's own photograph is the real article; this is the stand-in.
    expect(read('pages/PublicHome.jsx')).toContain('g.banner || VILLAGE_HERO');
  });

  it('reserves the hero height so the page does not jump when the image decodes', () => {
    expect(read('pages/PublicHome.jsx')).toMatch(/min-h-\[\d+rem\]/);
  });
});
