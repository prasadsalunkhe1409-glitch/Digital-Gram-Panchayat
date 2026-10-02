import { existsSync, readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { render, screen, within } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { describe, it, expect } from 'vitest';
import { WARDS } from '@dgp/shared';
import { HELP_TOPICS } from '@dgp/shared';
import en from '@/locales/en/common.json';
import mr from '@/locales/mr/common.json';
import { ThemeProvider, useTheme } from '@/store/ThemeProvider';
import { ServiceCard } from '@/features/home/ServiceCard';

/**
 * The citizen UI phase, asserted on what a citizen can actually reach.
 *
 * Most of these are absence tests, which are the ones that rot quietly: a service removed
 * from a grid but left in the search box is still in front of the citizen, and nothing but a
 * test notices.
 */

function flat(o, pre = '') {
  return Object.entries(o).flatMap(([k, v]) =>
    v && typeof v === 'object' ? flat(v, `${pre}${k}.`) : [`${pre}${k}`],
  );
}

describe('light theme only', () => {
  it('reports light and offers no way to change it', () => {
    let seen;
    function Probe() {
      seen = useTheme();
      return null;
    }
    render(
      <ThemeProvider>
        <Probe />
      </ThemeProvider>,
    );

    expect(seen.theme).toBe('light');
    // No setter at all: a leftover toggleTheme() call fails at build time rather than
    // silently doing nothing.
    expect(seen.setTheme).toBeUndefined();
    expect(seen.toggleTheme).toBeUndefined();
  });

  it('pins data-theme to light on the document', () => {
    render(
      <ThemeProvider>
        <span />
      </ThemeProvider>,
    );
    expect(document.documentElement.getAttribute('data-theme')).toBe('light');
  });

  it('clears any dark preference a browser had stored', () => {
    localStorage.setItem('dgp_theme', 'dark');
    render(
      <ThemeProvider>
        <span />
      </ThemeProvider>,
    );
    expect(localStorage.getItem('dgp_theme')).toBeNull();
  });

  it('has no theme strings left to translate', () => {
    const keys = flat(en);
    [
      'settings.theme',
      'settings.light',
      'settings.dark',
      'nav.themeLight',
      'nav.themeDark',
    ].forEach((k) => expect(keys).not.toContain(k));
  });
});

describe('withdrawn citizen services', () => {
  /*
   * Read from disk rather than imported.
   *
   * A removed service can survive in three places — the home grid, the search index and the
   * help content — and the interesting assertion is absence, which an import cannot express:
   * importing a deleted module fails the whole transform, and importing a live one tells you
   * nothing about what is missing from it.
   */
  // fileURLToPath, not `new URL(...)`: on Windows the latter mangles the drive letter and
  // resolves to E:\src\... instead of the file beside this test.
  const SRC = join(dirname(fileURLToPath(import.meta.url)), '..');
  const read = (rel) => readFileSync(join(SRC, rel), 'utf8');

  /*
   * The SERVICES list only — that is the tile index, the search equivalent of the home grid.
   * Content results further down the same file still deep-link to /directory and /downloads,
   * which is deliberate: those pages exist and work, and a citizen searching for a member by
   * name should land on that member. What was withdrawn is the service as a destination you
   * are offered, not the page as somewhere a result can point.
   */
  it.each(['/directory', '/verify', '/downloads', '/notifications'])(
    'the global search service index no longer offers %s',
    (route) => {
      const src = read('features/home/GlobalSearch.jsx');
      const index = src.slice(src.indexOf('const SERVICES'), src.indexOf('MAX_PER_GROUP'));
      expect(index).not.toContain(`'${route}'`);
    },
  );

  it.each(['/directory', '/verify', '/downloads', '/notifications', '/feedback'])(
    'the home services grid no longer links to %s',
    (route) => {
      const src = read('pages/Home.jsx');
      const grid = src.slice(src.indexOf('const SERVICES'), src.indexOf('export function Home'));
      expect(grid).not.toContain(`'${route}'`);
    },
  );

  it('the emergency section component is gone, not merely unlinked', () => {
    expect(existsSync(join(SRC, 'features/home/EmergencyContacts.jsx'))).toBe(false);
  });

  it('the post-login home no longer renders the officials band', () => {
    const src = read('pages/Home.jsx');
    expect(src).not.toContain('OfficialCard');
    expect(src).not.toContain('officials-h');
  });

  it('the public home carries the members section instead', () => {
    const src = read('pages/PublicHome.jsx');
    expect(src).toContain('id="members"');
    expect(src).toContain('tel:');
    // And no emergency section came with it.
    expect(src).not.toContain('id="emergency"');
  });

  it('the citizen router no longer routes to feedback', () => {
    expect(read('routes/AppRouter.jsx')).not.toContain("path: 'feedback'");
  });

  it('the public home no longer has an emergency string', () => {
    expect(flat(en)).not.toContain('public.emergency');
    expect(flat(mr)).not.toContain('public.emergency');
  });
});

describe('service cards', () => {
  const renderCard = (over = {}) =>
    render(
      <MemoryRouter>
        <ServiceCard
          to="/complaints/new"
          icon={(props) => <svg data-testid="icon" {...props} />}
          title="Complaints"
          description="Report a problem"
          cta="Open"
          {...over}
        />
      </MemoryRouter>,
    );

  it('is one link carrying the name, the description and the action', () => {
    renderCard();
    const link = screen.getByRole('link');

    expect(link).toHaveAttribute('href', '/complaints/new');
    expect(within(link).getByText('Complaints')).toBeInTheDocument();
    expect(within(link).getByText('Report a problem')).toBeInTheDocument();
    expect(within(link).getByText('Open')).toBeInTheDocument();
  });

  it('keeps its icon out of the accessibility tree', () => {
    renderCard();
    // The link's name comes from its text; a decorative glyph must not be announced.
    expect(screen.queryByRole('img')).toBeNull();
  });

  it('renders without a description', () => {
    renderCard({ description: undefined });
    expect(screen.getByRole('link')).toBeInTheDocument();
  });
});

describe('help content matches the application', () => {
  const ids = new Set(HELP_TOPICS.map((t) => t.id));

  it.each(['change-theme', 'emergency', 'directory'])('no longer documents %s', (id) => {
    expect(ids.has(id)).toBe(false);
  });

  it.each(['select-ward', 'timetable', 'timetable-ward', 'member-contacts'])(
    'documents %s',
    (id) => {
      expect(ids.has(id)).toBe(true);
    },
  );

  it('every related id still points at a topic', () => {
    const dangling = HELP_TOPICS.flatMap((t) =>
      (t.related || []).filter((r) => !ids.has(r)).map((r) => `${t.id} -> ${r}`),
    );
    expect(dangling).toEqual([]);
  });

  it('every topic is written in both languages', () => {
    const missing = HELP_TOPICS.filter((t) => !t.title?.en || !t.title?.mr).map((t) => t.id);
    expect(missing).toEqual([]);
  });

  it('the ward topic names every ward a citizen can choose', () => {
    const topic = HELP_TOPICS.find((t) => t.id === 'select-ward');
    const text = JSON.stringify(topic);
    // Ward 1 and Ward 6 bound the range the registration form offers.
    expect(text).toContain('Ward 1');
    expect(text).toContain('Ward 6');
    expect(WARDS).toHaveLength(6);
  });
});

describe('timetable and ward strings exist in both languages', () => {
  it.each([...WARDS, 'All Wards'])('has a label for %s', (ward) => {
    expect(en.timetable.ward[ward]).toBeTruthy();
    expect(mr.timetable.ward[ward]).toBeTruthy();
  });

  it('has a label for an entry with no ward', () => {
    expect(en.timetable.ward.general).toBeTruthy();
    expect(mr.timetable.ward.general).toBeTruthy();
  });

  it('keeps English and Marathi at full parity', () => {
    expect(flat(en).sort()).toEqual(flat(mr).sort());
  });
});

describe('registration ward field', () => {
  it('offers exactly the six wards and nothing else', () => {
    expect(WARDS).toEqual(['Ward 1', 'Ward 2', 'Ward 3', 'Ward 4', 'Ward 5', 'Ward 6']);
  });

  it('has its label, placeholder and error in both languages', () => {
    ['ward', 'wardPlaceholder', 'wardRequired'].forEach((k) => {
      expect(en.auth[k]).toBeTruthy();
      expect(mr.auth[k]).toBeTruthy();
    });
  });
});
