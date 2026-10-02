import { existsSync, readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, it, expect, vi } from 'vitest';
import { WARDS, WARD_ALL, WARD_UNSET, CERT_TYPES } from '@dgp/shared';
import en from '@/locales/en/common.json';
import mrLocale from '@/locales/mr/common.json';
import { WardFilter, wardLabel } from '@/components/WardFilter';
import { ThemeProvider, useTheme } from '@/store/ThemeProvider';

const SRC = join(dirname(fileURLToPath(import.meta.url)), '..');
const read = (rel) => readFileSync(join(SRC, rel), 'utf8');

/**
 * i18next's `t(key, fallback)` returns the fallback when the key is missing. The stub has to
 * do the same, or code that leans on that contract — the ward names do — looks broken here
 * while working in the app.
 */
const CATALOGUE = {
  'ward.all': 'All Wards',
  'ward.allWards': 'All Wards (village-wide)',
  'ward.unset': 'Ward not set',
  'ward.filter': 'Filter by ward',
  'ward.names.Ward 3': 'Ward 3',
};
const t = (key, fallback) => CATALOGUE[key] ?? fallback ?? key;

vi.mock('react-i18next', () => ({
  useTranslation: () => ({ t, i18n: { language: 'en' } }),
}));

const options = () => [...screen.getByRole('combobox').options].map((o) => o.value);

/**
 * One ward control across four officer screens.
 *
 * The variants exist because the question differs per screen, and the dangerous mistake is
 * offering a value the API will refuse: 'unset' is a filter token for finding records that
 * predate the ward field, and must never appear where something is being assigned.
 */
describe('the shared ward control', () => {
  it('offers the six wards plus "not set" for people, and no village-wide value', () => {
    render(<WardFilter value="" onChange={() => {}} variant="people" />);
    expect(options()).toEqual(['', ...WARDS, WARD_UNSET]);
    expect(options()).not.toContain(WARD_ALL);
  });

  it('offers the village-wide value on the timetable filter', () => {
    render(<WardFilter value="" onChange={() => {}} variant="schedule" />);
    expect(options()).toEqual(['', WARD_ALL, ...WARDS, WARD_UNSET]);
  });

  it.each([
    ['assign', WARDS],
    ['scheduleAssign', [WARD_ALL, ...WARDS]],
  ])('the %s editor never offers the "unset" token', (variant, expected) => {
    render(<WardFilter value="" onChange={() => {}} variant={variant} includeAll={false} />);
    expect(options()).toEqual(expected);
    expect(options()).not.toContain(WARD_UNSET);
  });

  it('reports the chosen ward to its caller', async () => {
    const onChange = vi.fn();
    render(<WardFilter value="" onChange={onChange} variant="people" />);

    await userEvent.selectOptions(screen.getByRole('combobox'), 'Ward 3');
    expect(onChange).toHaveBeenCalledWith('Ward 3');
  });

  it('is announced, not just visually placed', () => {
    render(<WardFilter value="" onChange={() => {}} />);
    expect(screen.getByRole('combobox', { name: 'Filter by ward' })).toBeInTheDocument();
  });

  it('labels a missing ward in words rather than leaving it blank', () => {
    expect(wardLabel(null, t)).toBe('Ward not set');
    expect(wardLabel('', t)).toBe('Ward not set');
    expect(wardLabel(WARD_ALL, t)).toBe('All Wards (village-wide)');
    // Falls back to the stored value when a catalogue has no name for it...
    expect(wardLabel('Ward 2', t)).toBe('Ward 2');
    // ...and uses the catalogue when it does, which is what makes the Marathi list readable.
    expect(wardLabel('Ward 3', t)).toBe('Ward 3');
  });
});

/**
 * Where each screen sends its filters.
 *
 * Read from source: the point of these is that the value reaches the API query rather than
 * being applied to the page the API already returned, and that is a property of the code, not
 * of a rendered DOM.
 */
describe('officer screens filter on the server', () => {
  it.each([
    ['features/users/UsersList.jsx', 'users'],
    ['features/tax/TaxList.jsx', 'tax'],
    ['features/dakhala/CertificateList.jsx', 'certificates'],
    ['features/complaints/ComplaintsList.jsx', 'complaints'],
  ])('%s sends ward in the %s query', (file) => {
    const src = read(file);
    expect(src).toContain('...(ward ? { ward } : {})');
    expect(src).toContain('WardFilter');
  });

  it('the timetable passes its ward filter to the query, not to the rendered rows', () => {
    const src = read('features/timetable/TimetableAdmin.jsx');
    expect(src).toContain('useAdminTimetable(');
    expect(src).toContain('wardFilter ? { ward: wardFilter } : undefined');
  });

  it('users keeps its existing search and status filters alongside ward', () => {
    const src = read('features/users/UsersList.jsx');
    expect(src).toContain('...(q ? { q } : {})');
    expect(src).toContain('...(status ? { status } : {})');
  });

  it('complaints keeps its status, category and search filters alongside ward', () => {
    const src = read('features/complaints/ComplaintsList.jsx');
    [
      '...(q ? { q } : {})',
      '...(status ? { status } : {})',
      '...(category ? { category } : {})',
    ].forEach((frag) => expect(src).toContain(frag));
  });

  it('the users table shows a ward column and can assign one', () => {
    const src = read('features/users/UsersList.jsx');
    expect(src).toContain('WardCell');
    expect(read('features/users/WardCell.jsx')).toContain('useSetUserWard');
  });
});

describe('manual certificate creation', () => {
  const src = read('features/dakhala/AddCertificateDialog.jsx');

  it('reuses the shared field and document definitions rather than its own', () => {
    expect(src).toContain('CERT_TYPE_FIELDS');
    expect(src).toContain('CERT_DOC_REQUIREMENTS');
    // A second field map in the officer app is how the two forms drift apart.
    expect(src).not.toMatch(/const\s+FIELDS\s*=\s*\{/);
  });

  it('offers only the types a certificate may still be issued under', () => {
    expect(src).toContain('CERT_TYPES.map');
    // CERT_TYPES_ALL would put Residence back in the new-certificate selector.
    expect(src).not.toContain('CERT_TYPES_ALL');
    expect(CERT_TYPES).not.toContain('Residence');
    expect(CERT_TYPES).toContain('Marriage');
  });

  it('posts to the existing officer-create route, not a new generator', () => {
    expect(read('features/dakhala/certificateService.js')).toContain("post('/admin/dakhala'");
  });

  it('says plainly that it does not verify the documents', () => {
    expect(en.dakhala.add.documentsNote).toMatch(/does not verify/i);
    expect(mrLocale.dakhala.add.documentsNote).toBeTruthy();
  });

  it('is reachable from the certificate list', () => {
    expect(read('features/dakhala/CertificateList.jsx')).toContain('AddCertificateDialog');
  });
});

describe('certificate review hierarchy', () => {
  const src = read('features/dakhala/CertificateReview.jsx');

  it('makes Approve the only filled action', () => {
    const approve = src.indexOf('dakhala.review.approve');
    const reject = src.indexOf('dakhala.review.reject');
    expect(approve).toBeGreaterThan(-1);
    expect(reject).toBeGreaterThan(approve); // approve comes first
    // Reject was variant="destructive" — as prominent as Approve. It is now a ghost.
    expect(src).not.toContain('variant="destructive" onClick={() => setRejectOpen(true)}');
    expect(src).toContain('variant="ghost"');
  });

  it('keeps Reject available, because historical records and the API still use it', () => {
    expect(src).toContain('setRejectOpen');
    expect(src).toContain('RejectDialog');
  });

  it('still previews the submitted documents', () => {
    expect(src).toContain('uploadedDocuments');
    expect(src).toContain('DocModal');
  });
});

describe('officer portal is light only', () => {
  it('reports light and offers no setter', () => {
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
    expect(seen.setTheme).toBeUndefined();
    expect(seen.toggleTheme).toBeUndefined();
  });

  it('pins data-theme and clears a stored dark preference', () => {
    localStorage.setItem('dgp_theme', 'dark');
    render(
      <ThemeProvider>
        <span />
      </ThemeProvider>,
    );
    expect(document.documentElement.getAttribute('data-theme')).toBe('light');
    expect(localStorage.getItem('dgp_theme')).toBeNull();
  });

  it('has no dark block left in the stylesheet', () => {
    expect(read('styles/index.css')).not.toContain("data-theme='dark'");
  });

  it('has no theme strings left to translate', () => {
    expect(en.nav.themeDark).toBeUndefined();
    expect(mrLocale.nav.themeDark).toBeUndefined();
  });
});

describe('timetable admin ward support', () => {
  const src = read('features/timetable/TimetableAdmin.jsx');

  it('defaults a new entry to village-wide rather than a ward nobody chose', () => {
    expect(src).toContain('ward: WARD_ALL');
  });

  it('shows the ward on each row, labelled even when absent', () => {
    expect(src).toContain('wardLabel(r.ward, t)');
  });

  it('keeps every existing field on the form', () => {
    [
      'serviceType',
      'titleMr',
      'areaMr',
      'startTime',
      'endTime',
      'noteMr',
      'displayOrder',
      'isPublished',
    ].forEach((f) => expect(src).toContain(f));
    // area must stay descriptive, not be repurposed as the ward.
    expect(src).toContain('timetable.field.area');
  });
});

describe('ward strings exist in both languages', () => {
  it.each(['all', 'allWards', 'unset', 'label', 'filter', 'assign'])('ward.%s', (k) => {
    expect(en.ward[k]).toBeTruthy();
    expect(mrLocale.ward[k]).toBeTruthy();
  });

  it('the WardCell component exists for assignment', () => {
    expect(existsSync(join(SRC, 'features/users/WardCell.jsx'))).toBe(true);
  });
});
