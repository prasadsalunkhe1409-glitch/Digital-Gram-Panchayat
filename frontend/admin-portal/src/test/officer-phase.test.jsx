import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
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
 * Three sections left the officer portal this phase. Each was removed for a reason, and each
 * reason is the thing that would make someone put it back, so it is written down here.
 */
describe('sections removed from the officer portal', () => {
  const sidebar = read('layouts/Sidebar.jsx');
  const router = read('routes/AppRouter.jsx');
  const header = read('layouts/Header.jsx');

  it.each([
    ['notifications', 'the notification centre duplicated the Notices feed'],
    ['documents', 'the Download Centre had no place in an officer’s day'],
    ['feedback', 'citizen feedback analytics were already withdrawn from the citizen app'],
  ])('%s is gone from the sidebar, the router and the breadcrumb map', (slug) => {
    expect(sidebar).not.toContain(`to: '/${slug}'`);
    expect(router).not.toContain(`path: '${slug}'`);
    expect(header).not.toContain(`'/${slug}'`);
  });

  it('leaves no route to the broadcast form', () => {
    expect(router).not.toContain('BroadcastForm');
    expect(router).not.toContain("path: 'notifications/broadcast'");
  });

  it('keeps every section an officer still needs', () => {
    for (const slug of [
      'complaints',
      'notices',
      'dakhala',
      'tax',
      'schemes',
      'users',
      'timetable',
    ]) {
      expect(sidebar).toContain(`to: '/${slug}'`);
    }
  });
});

/**
 * Notices now have one lifecycle — draft, publish, unpublish — and no way to push a copy of
 * a notice at every citizen. The backend route and its audit trail are untouched; this is a
 * decision about what the officer screen offers.
 */
describe('notices use publish and unpublish, not broadcast', () => {
  const src = read('features/notices/NoticesList.jsx');

  it('offers no broadcast action', () => {
    expect(src).not.toContain('broadcast');
    expect(src).not.toContain('BroadcastDialog');
    expect(src).not.toContain('Send');
  });

  it('still offers the publication lifecycle and the destructive actions', () => {
    expect(src).toContain('togglePublish');
    expect(src).toContain('notice.dash.publish');
    expect(src).toContain('notice.dash.archive');
    expect(src).toContain('notice.dash.delete');
  });
});

/**
 * Certificates are prepared by a person, signed, and then issued. The screen used to generate
 * one on a button press, which is the behaviour these assertions exist to keep out.
 */
describe('certificates are issued, not generated', () => {
  const src = read('features/dakhala/CertificateReview.jsx');

  it('has no "Generate & approve" action left', () => {
    expect(src).not.toContain('generateApprove');
    expect(en.dakhala.review.generateApprove).toBeUndefined();
    expect(mrLocale.dakhala.review.generateApprove).toBeUndefined();
  });

  it('asks the officer for the prepared certificate and will not issue without it', () => {
    expect(src).toContain('dakhala.review.certificateFile');
    expect(src).toContain('certificateRequired');
    expect(src).toContain('disabled={!certFile}');
    expect(src).toContain('type="file"');
  });

  it('presents issuance as its own step, with a status and the chosen filename', () => {
    // The upload used to hide inside a confirm step on the decision panel, which read as a
    // decision rather than as handing over a document.
    expect(src).toContain('dakhala.review.issuedSection');
    expect(src).toContain('dakhala.review.statusNotIssued');
    expect(src).toContain('dakhala.review.statusIssued');
    expect(src).toContain('{certFile.name}');
    expect(src).not.toContain('confirmApprove');
  });

  it('leaves the decision panel to review and reject, not to issuing', () => {
    const decision = src.slice(src.indexOf('dakhala.review.decision'));
    expect(decision).toContain('dakhala.review.reject');
    // The issue action lives with the file it needs.
    expect(decision).not.toContain('dakhala.review.issue');
  });

  it('sends the certificate as multipart on the existing approve route', () => {
    const service = read('features/dakhala/certificateService.js');
    expect(service).toContain("form.append('certificate', file)");
    // One pipeline: the same route that already minted the number and notified the citizen.
    expect(service).toContain('/approve');
  });

  it('names the action issuance in both languages', () => {
    expect(en.dakhala.review.issue).toBeTruthy();
    expect(mrLocale.dakhala.review.issue).toBeTruthy();
    expect(en.dakhala.review.certificateRequired).toMatch(/attach/i);
  });

  it('still offers Reject, which is a real outcome', () => {
    expect(src).toContain('RejectDialog');
  });

  it('accepts only a PDF as the issued certificate', () => {
    expect(src).toContain('accept="application/pdf"');
    expect(src).not.toMatch(/accept="[^"]*image\//);
  });

  it('keeps the supporting documents read-only — view and download, nothing else', () => {
    expect(src).toContain("t('doc.view')");
    expect(src).toContain("t('doc.download')");
    // No affordance to alter a citizen's evidence from the review screen.
    for (const forbidden of [
      'Replace document',
      'deleteDocument',
      'removeDocument',
      'editDocument',
    ]) {
      expect(src).not.toContain(forbidden);
    }
  });

  it('shows the issued certificate as its own section, separate from the evidence', () => {
    expect(src).toContain('dakhala.review.issuedSection');
    expect(src).toContain('dakhala.review.downloadPdf');
  });
});

/**
 * Counter issuance records the application and issues it in one movement, so it needs the
 * prepared PDF too. It did not send one after issuance stopped being automatic, which made
 * every counter certificate fail with CERTIFICATE_REQUIRED — a gap no test covered.
 */
describe('counter issuance carries the prepared certificate', () => {
  const dialog = read('features/dakhala/AddCertificateDialog.jsx');

  it('collects a PDF and refuses to submit without one', () => {
    expect(dialog).toContain('accept="application/pdf"');
    expect(dialog).toContain('dakhala.add.certificateRequired');
    expect(dialog).toContain('setCertificate');
  });

  it('sends it to the API under the certificate field', () => {
    expect(dialog).toContain('certificate,');
    const service = read('features/dakhala/certificateService.js');
    expect(service).toContain("form.append('certificate', certificate)");
  });

  it('keeps supporting documents on their own field', () => {
    expect(read('features/dakhala/certificateService.js')).toContain("form.append('documents', f)");
  });
});

/** New certificates exclude the withdrawn Residence type; historical ones stay readable. */
describe('certificate types available for issuance', () => {
  it('offers CERT_TYPES and never the legacy list', () => {
    const dialog = read('features/dakhala/AddCertificateDialog.jsx');
    expect(dialog).toContain('CERT_TYPES.map');
    expect(dialog).not.toContain('CERT_TYPES_ALL');
  });
});

/**
 * Finding the citizen a bill or certificate belongs to. The field demanded a whole ten-digit
 * mobile, which is rarely what an officer has in front of them.
 */
describe('citizen search accepts a name or a number', () => {
  it('the tax form delegates to the shared autocomplete rather than its own lookup', () => {
    const src = read('features/tax/TaxForm.jsx');
    expect(src).toContain('<CitizenSearch');
    // The old contract: a regex gate on a full mobile, and a single result or a 404.
    expect(src).not.toContain('lookupCitizen');
    expect(src).not.toMatch(/\[6-9\]\d\{9\}/);
  });

  it('the autocomplete searches partially and lets the officer pick', () => {
    const src = read('components/CitizenSearch.jsx');
    expect(src).toContain('searchCitizens');
    expect(src).toContain('tax.form.citizenSearch');
    // Several matches must be offered rather than guessed at.
    expect(src).toContain('results.map');
  });

  it('the certificate dialog still finds a citizen by name or number', () => {
    const src = read('features/dakhala/AddCertificateDialog.jsx');
    expect(src).toContain('searchCitizens');
    expect(src).toContain('dakhala.add.citizenSearch');
    expect(src).not.toContain('lookupCitizen');
    expect(src).toContain('results.map');
  });

  it('sends the fragment to the server rather than filtering a fetched page', () => {
    const service = read('features/tax/taxService.js');
    expect(service).toContain("apiClient.get('/admin/tax/lookup'");
    expect(service).toContain('params: { q');
  });

  it('labels the field for both name and number, in both languages', () => {
    for (const cat of [en, mrLocale]) {
      expect(cat.tax.form.citizenSearch).toBeTruthy();
      expect(cat.tax.form.citizenSearchHint).toBeTruthy();
      expect(cat.dakhala.add.citizenSearch).toBeTruthy();
    }
    expect(en.tax.form.citizenSearchHint).toMatch(/name/i);
    expect(en.tax.form.citizenSearchHint).toMatch(/mobile|number/i);
    // The mobile-only strings went with the mobile-only field.
    expect(en.tax.form.citizenMobile).toBeUndefined();
    expect(mrLocale.tax.form.badMobile).toBeUndefined();
  });
});

/** Complaint ward filtering, composed with the filters that were already there. */
describe('officer complaint filters', () => {
  const src = read('features/complaints/ComplaintsList.jsx');

  it('sends ward to the server beside search, status and category', () => {
    expect(src).toContain('WardFilter');
    for (const frag of [
      '...(ward ? { ward } : {})',
      '...(q ? { q } : {})',
      '...(status ? { status } : {})',
      '...(category ? { category } : {})',
    ]) {
      expect(src).toContain(frag);
    }
  });
});

/** One way back, and it must say where it goes in both languages. */
describe('the Back control', () => {
  beforeEach(() => {
    window.history.replaceState({ idx: 0 }, '');
  });

  it('falls back to the parent list when a screen was opened directly', async () => {
    const { BackButton } = await import('@/components/BackButton');
    render(
      <MemoryRouter initialEntries={['/notices/new']}>
        <Routes>
          <Route path="/notices/new" element={<BackButton to="/notices" />} />
          <Route path="/notices" element={<p>notice list</p>} />
        </Routes>
      </MemoryRouter>,
    );
    await userEvent.click(screen.getByRole('button'));
    expect(screen.getByText('notice list')).toBeInTheDocument();
  });

  it('is used by the nested editors rather than a hand-rolled link', () => {
    for (const file of ['features/notices/NoticeForm.jsx', 'features/schemes/SchemeForm.jsx']) {
      expect(read(file)).toContain('<BackButton');
    }
  });

  it('is translated in both languages', () => {
    expect(en.common.back).toBe('Back');
    expect(mrLocale.common.back).toBeTruthy();
  });
});

/** Shared brand tokens, separate layouts. */
describe('officer design tokens', () => {
  const css = read('styles/index.css');

  it('carries the same brand palette as the citizen app', () => {
    expect(css).toContain('--primary: 224 64% 33%'); // #1E3B8B
    expect(css).toContain('--accent-gold: 42 98% 57%'); // #FDBD26
    expect(css).toContain('--background: 213 30% 93%'); // #E7ECF2
    expect(css).toContain('--card: 42 45% 96%'); // #F9F6EF
    expect(css).toContain('--interactive: 219 79% 56%'); // #3774E7
    expect(css).toContain('--interactive-strong: 219 79% 46%');
  });

  it('is light only', () => {
    expect(css).not.toContain("data-theme='dark'");
    expect(css).not.toContain('prefers-color-scheme: dark');
  });

  it('gives form controls a boundary that meets non-text contrast', () => {
    // A card edge is decoration; an input edge is the control itself, so WCAG 1.4.11 holds it
    // to 3:1. Measured against the harder of the two surfaces now that the page is #E7ECF2:
    // 3.56:1 on a warm card, 3.23:1 on the page.
    expect(css).toContain('--input: 214 22% 53%');
  });
});
