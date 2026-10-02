import { useEffect, useId, useMemo, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { NoResultsArt } from '@/components/Illustration';
import {
  BadgeCheck,
  BookOpen,
  CalendarDays,
  ClipboardList,
  Download,
  FileText,
  Gavel,
  HardHat,
  Megaphone,
  Receipt,
  Search,
  Users,
  Vote,
  X,
} from 'lucide-react';
import { normalize } from '@dgp/shared';

const ICONS = {
  notice: Megaphone,
  scheme: BookOpen,
  complaint: ClipboardList,
  certificate: FileText,
  tax: Receipt,
  member: Users,
  event: CalendarDays,
  service: BadgeCheck,
  meeting: Gavel,
  project: HardHat,
  poll: Vote,
  download: Download,
};

/**
 * The eight things a citizen can reach directly. Both language versions of every label are
 * indexed, so typing "tax" finds it while the interface is in Marathi and "कर" finds it while
 * the interface is in English — a household often shares one phone between both.
 */
const SERVICES = [
  ['nav.complaints', '/complaints/new'],
  ['nav.dakhala', '/dakhala'],
  ['nav.tax', '/tax'],
  ['nav.schemes', '/schemes'],
  ['nav.notices', '/notices'],
  ['nav.meetings', '/meetings'],
  ['nav.projects', '/projects'],
  ['nav.polls', '/polls'],
];

const MAX_PER_GROUP = 4;

/** Every language variant of a localized field, so search is not tied to the current one. */
function bothLocales(record, field, fallback) {
  return [record?.i18n?.[field]?.en, record?.i18n?.[field]?.mr, fallback];
}

/**
 * One search box across everything a citizen can see.
 *
 * It searches what the app has already loaded — no new endpoint and no extra request, so it
 * works on the offline PWA too. Matching reuses the Help Center's `normalize`, which keeps
 * Devanagari combining marks; a naive strip would turn तक्रार into तक र र and never match.
 */
export function GlobalSearch({
  notices,
  schemes,
  complaints,
  applications,
  tax,
  profile,
  events,
  meetings,
  projects,
  polls,
  downloads,
}) {
  const { t, i18n } = useTranslation();
  const [query, setQuery] = useState('');
  const [open, setOpen] = useState(false);
  const boxRef = useRef(null);
  const listId = useId();

  // Both catalogues, so a result is findable by its name in either language.
  const tEn = useMemo(() => i18n.getFixedT('en'), [i18n]);
  const tMr = useMemo(() => i18n.getFixedT('mr'), [i18n]);

  const index = useMemo(() => {
    const rows = [];
    const add = (type, id, to, title, haystack) => {
      const text = normalize(haystack.filter(Boolean).join(' '));
      if (title && text) rows.push({ type, id, to, title, text });
    };

    for (const n of notices ?? []) {
      add('notice', n.id, `/notices/${n.id}`, n.title, [
        ...bothLocales(n, 'title', n.title),
        ...bothLocales(n, 'content', n.content),
        n.noticeId,
        n.category,
      ]);
    }
    for (const s of schemes ?? []) {
      add('scheme', s.id, `/schemes/${s.id}`, s.title, [
        ...bothLocales(s, 'title', s.title),
        ...bothLocales(s, 'summary', s.summary),
        s.schemeId,
        s.category,
      ]);
    }
    for (const c of complaints ?? []) {
      add('complaint', c.id, `/complaints/${c.id}`, c.title, [
        c.title,
        c.description,
        c.complaintId,
        c.category,
        c.status,
      ]);
    }
    for (const a of applications ?? []) {
      const label = t(`dakhala.type.${a.certificateType}`, a.certificateType);
      add('certificate', a.id, `/dakhala/${a.id}`, label, [
        label,
        tEn(`dakhala.type.${a.certificateType}`, a.certificateType),
        tMr(`dakhala.type.${a.certificateType}`, a.certificateType),
        a.applicationId,
        a.certificateNumber,
        a.status,
      ]);
    }
    for (const r of tax ?? []) {
      const label = `${t('nav.tax')} ${r.financialYear ?? ''}`.trim();
      add('tax', r.id, '/tax', label, [
        label,
        r.financialYear,
        r.propertyNumber,
        r.receiptNumber,
        tEn('nav.tax'),
        tMr('nav.tax'),
      ]);
    }
    for (const m of profile?.members ?? []) {
      add('member', m.id, '/directory', m.name, [
        m.name,
        m.designation,
        m.ward,
        m.responsibilities,
        m.mobile,
        m.email,
      ]);
    }
    for (const e of events ?? []) {
      add('event', e.id, '/', e.title, [e.title, e.description, e.location, e.organizer]);
    }
    for (const m of meetings ?? []) {
      add('meeting', m.id, '/meetings', m.title, [
        m.title,
        m.description,
        m.venue,
        m.meetingNumber,
        m.meetingType,
      ]);
    }
    for (const p of projects ?? []) {
      add('project', p.id, '/projects', p.name, [
        p.name,
        p.description,
        p.location,
        p.contractor,
        p.engineer,
        p.projectNumber,
        p.category,
        p.status,
      ]);
    }
    for (const p of polls ?? []) {
      add('poll', p.id, '/polls', p.question, [
        p.question,
        p.description,
        ...(p.options ?? []).map((o) => o.text),
      ]);
    }
    for (const d of downloads ?? []) {
      add('download', d.id, '/downloads', d.title, [
        d.title,
        d.description,
        d.fileName,
        d.category,
        d.year,
      ]);
    }
    for (const [key, to] of SERVICES) {
      add('service', key, to, t(key), [tEn(key), tMr(key)]);
    }

    return rows;
  }, [
    notices,
    schemes,
    complaints,
    applications,
    tax,
    profile,
    events,
    meetings,
    projects,
    polls,
    downloads,
    t,
    tEn,
    tMr,
  ]);

  const results = useMemo(() => {
    const terms = normalize(query).split(' ').filter(Boolean);
    if (!terms.length) return [];
    // Every term must appear, so "water notice" narrows instead of widening.
    const hits = index.filter((row) => terms.every((term) => row.text.includes(term)));

    const grouped = new Map();
    for (const hit of hits) {
      const bucket = grouped.get(hit.type) ?? [];
      if (bucket.length < MAX_PER_GROUP) bucket.push(hit);
      grouped.set(hit.type, bucket);
    }
    return [...grouped.entries()];
  }, [index, query]);

  const total = results.reduce((sum, [, rows]) => sum + rows.length, 0);

  // A click outside, or Escape, closes the panel without clearing what was typed.
  useEffect(() => {
    if (!open) return undefined;
    const onDown = (e) => {
      if (!boxRef.current?.contains(e.target)) setOpen(false);
    };
    const onKey = (e) => {
      if (e.key === 'Escape') setOpen(false);
    };
    document.addEventListener('mousedown', onDown);
    document.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('mousedown', onDown);
      document.removeEventListener('keydown', onKey);
    };
  }, [open]);

  const showPanel = open && query.trim().length > 0;

  return (
    <div ref={boxRef} className="relative">
      <label htmlFor={`${listId}-input`} className="sr-only">
        {t('search.label')}
      </label>
      <Search
        className="pointer-events-none absolute left-3.5 top-1/2 h-5 w-5 -translate-y-1/2 text-muted-foreground"
        aria-hidden="true"
      />
      <input
        id={`${listId}-input`}
        type="search"
        role="combobox"
        aria-expanded={showPanel}
        aria-controls={listId}
        aria-autocomplete="list"
        value={query}
        onChange={(e) => {
          setQuery(e.target.value);
          setOpen(true);
        }}
        onFocus={() => setOpen(true)}
        placeholder={t('search.placeholder')}
        className="h-12 w-full rounded-xl border border-border bg-card pl-11 pr-11 text-body text-foreground shadow-xs outline-none transition-shadow duration-150 placeholder:text-muted-foreground focus-visible:shadow-sm"
      />
      {query ? (
        <button
          type="button"
          onClick={() => {
            setQuery('');
            setOpen(false);
          }}
          aria-label={t('common.clear')}
          className="absolute right-2 top-1/2 flex h-9 w-9 -translate-y-1/2 items-center justify-center rounded-lg text-muted-foreground transition-colors duration-150 hover:bg-accent hover:text-foreground"
        >
          <X className="h-4 w-4" aria-hidden="true" />
        </button>
      ) : null}

      {showPanel ? (
        <div
          id={listId}
          role="listbox"
          aria-label={t('search.results')}
          className="absolute inset-x-0 top-full z-30 mt-2 max-h-[60vh] overflow-y-auto rounded-xl border border-border bg-card p-1.5 shadow-overlay"
        >
          {total ? (
            results.map(([type, rows]) => {
              const Icon = ICONS[type];
              return (
                <div key={type} className="py-1">
                  <p className="px-2.5 pb-1 text-caption font-medium uppercase tracking-wide text-muted-foreground">
                    {t(`search.type.${type}`)}
                  </p>
                  <ul>
                    {rows.map((row) => (
                      <li key={`${type}-${row.id}`}>
                        <Link
                          role="option"
                          aria-selected="false"
                          to={row.to}
                          onClick={() => setOpen(false)}
                          className="flex min-h-11 items-center gap-2.5 rounded-lg px-2.5 py-1.5 transition-colors duration-150 hover:bg-accent"
                        >
                          <Icon
                            className="h-4 w-4 shrink-0 text-muted-foreground"
                            aria-hidden="true"
                          />
                          <span className="min-w-0 flex-1 truncate text-body text-foreground">
                            {row.title}
                          </span>
                        </Link>
                      </li>
                    ))}
                  </ul>
                </div>
              );
            })
          ) : (
            <div className="flex flex-col items-center gap-2 px-3 py-8 text-center">
              <NoResultsArt className="h-20 w-20 text-muted-foreground" />
              <p className="text-body text-muted-foreground">
                {t('search.noResults', { query: query.trim() })}
              </p>
            </div>
          )}
        </div>
      ) : null}
    </div>
  );
}
