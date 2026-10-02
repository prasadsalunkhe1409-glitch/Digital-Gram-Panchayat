import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import {
  LogIn,
  MapPin,
  Phone,
  ClipboardList,
  FileText,
  Landmark,
  Receipt,
  Megaphone,
  CalendarDays,
  Building2,
  Award,
  Clock,
  Mail,
  ExternalLink,
} from 'lucide-react';
import { formatDate } from '@dgp/shared';
import logo from '@dgp/shared/assets/logo.svg';
import { sortMembers } from '@/features/village/members';
import { HERO, eventArtFor } from '@/components/Artwork';
import { SafeImage } from '@/components/SafeImage';
import { MapView } from '@/components/MapView';
import { LanguageGate } from '@/components/LanguageGate';
import { useLanguage } from '@/store';
import { useVillageProfile, useVillageEvents } from '@/features/village/hooks';
import { useNotices } from '@/features/notices/hooks';
import { useSchemes } from '@/features/schemes/hooks';

// The portal's built-in services — shown when an officer hasn't configured custom cards.
// Guests are pointed at login (the actions themselves need a session).
const DEFAULT_SERVICES = [
  { key: 'complaints', icon: ClipboardList },
  { key: 'dakhala', icon: FileText },
  { key: 'schemes', icon: Landmark },
  { key: 'tax', icon: Receipt },
  { key: 'notices', icon: Megaphone },
];

// In-page anchor links for the footer.
const QUICK_LINKS = [
  { href: '#services', key: 'public.services' },
  { href: '#members', key: 'public.members' },
  { href: '#notices', key: 'public.latestNotices' },
  { href: '#schemes', key: 'public.latestSchemes' },
];

// Official Government of India / Maharashtra portals (public, static — not sourced data).
const GOV_LINKS = [
  { href: 'https://www.india.gov.in', label: 'India.gov.in' },
  { href: 'https://www.maharashtra.gov.in', label: 'Maharashtra Govt.' },
  { href: 'https://www.digitalindia.gov.in', label: 'Digital India' },
];

// Location facts shown in the About sidebar (keys map to i18n labels).
const ABOUT_FACTS = ['taluka', 'district', 'state', 'pinCode'];

function Section({ id, title, children, className = '' }) {
  return (
    <section
      id={id}
      aria-labelledby={`${id}-h`}
      className={`mx-auto w-full max-w-5xl px-4 py-10 ${className}`}
    >
      {title ? (
        <h2 id={`${id}-h`} className="mb-5 text-title text-foreground">
          {title}
        </h2>
      ) : null}
      {children}
    </section>
  );
}

/** Humanize a statistics key ("literacyRate" → "Literacy rate"). */
function humanize(key) {
  return key
    .replace(/([A-Z])/g, ' $1')
    .replace(/^./, (c) => c.toUpperCase())
    .trim();
}

export function PublicHome() {
  const { t, i18n } = useTranslation();
  const locale = i18n.language === 'mr' ? 'mr' : 'en';
  const { language, toggleLanguage } = useLanguage();
  const { data: profile } = useVillageProfile();
  const { data: eventsData } = useVillageEvents();
  const { data: noticesData } = useNotices();
  const { data: schemesData } = useSchemes();

  const g = profile?.general ?? {};
  const members = sortMembers(profile?.members ?? []);
  const villageName = g.villageName || t('appName');
  const stats = Object.entries(profile?.statistics ?? {}).filter(([, v]) => v !== '' && v != null);
  const services = profile?.services?.length ? profile.services : DEFAULT_SERVICES;
  const notices = (noticesData?.data ?? []).slice(0, 5);
  const schemes = (schemesData?.data ?? []).slice(0, 5);
  const events = (eventsData?.data ?? []).slice(0, 4);
  const gallery = (profile?.gallery ?? []).slice(0, 6);
  const awards = profile?.awards ?? [];
  const hasMap = typeof g.latitude === 'number' && typeof g.longitude === 'number';

  const lead = profile?.leadership ?? {};
  const officeAddress = [
    g.panchayatName || villageName,
    g.taluka ? `Tal. ${g.taluka}` : '',
    g.district ? `Dist. ${g.district}` : '',
    g.state,
    g.pinCode ? `PIN ${g.pinCode}` : '',
  ]
    .filter(Boolean)
    .join(', ');
  const aboutFacts = ABOUT_FACTS.map((k) => [k, g[k]]).filter(([, v]) => v);
  const year = new Date().getFullYear();

  return (
    <div className="min-h-dvh bg-background">
      <LanguageGate />
      {/* Top bar */}
      <header className="sticky top-0 z-30 border-b border-border bg-card/95 backdrop-blur">
        <div className="mx-auto flex max-w-5xl items-center justify-between gap-3 px-4 py-3">
          <div className="flex min-w-0 items-center gap-2.5">
            <SafeImage src={g.logo || logo} alt="" className="h-9 w-9 rounded" />
            <div className="min-w-0">
              <p className="truncate text-section text-foreground">{villageName}</p>
              {g.panchayatName ? (
                <p className="truncate text-caption text-muted-foreground">{g.panchayatName}</p>
              ) : null}
            </div>
          </div>
          <div className="flex shrink-0 items-center gap-2">
            <button
              type="button"
              onClick={toggleLanguage}
              className="inline-flex min-h-11 items-center rounded-lg border border-border px-3 text-body font-medium text-foreground transition-colors duration-150 hover:bg-accent focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-card"
              aria-label={language === 'mr' ? 'Switch to English' : 'मराठीत बदला'}
            >
              {language === 'mr' ? 'English' : 'मराठी'}
            </button>
            <Link
              to="/login"
              className="inline-flex min-h-11 items-center gap-1.5 rounded-lg bg-primary px-4 text-body font-medium text-primary-foreground transition-colors duration-150 hover:bg-primary-hover"
            >
              <LogIn className="h-4 w-4" aria-hidden="true" />
              {t('public.enter')}
            </Link>
          </div>
        </div>
      </header>

      {/* Hero */}
      <div className="relative isolate overflow-hidden border-b border-border bg-primary text-primary-foreground">
        {/*
         * The officer's own photograph of the village leads when there is one. Without it the
         * hero used to be a flat block of primary colour — correct, and completely mute about
         * the place it is introducing. The drawn scene stands in.
         */}
        <SafeImage
          src={g.banner || HERO.villageWelcome}
          alt=""
          loading="eager"
          className={`absolute inset-0 -z-10 h-full w-full object-cover ${
            g.banner ? 'opacity-25' : 'opacity-40'
          }`}
        />
        {/*
         * Scrim, and it is load-bearing rather than decorative.
         *
         * Measured by compositing the artwork's real pixels over the hero colour: the sun in
         * the drawing put a bright patch behind the heading and white text there fell to
         * 2.15:1 in the dark theme. At 45% it is 5.00:1 dark and 7.56:1 light. It also fixes
         * what was already there — the flat dark-theme primary was 3.17:1, scraping past
         * large-text AA and failing it for the tagline underneath.
         */}
        <div aria-hidden="true" className="absolute inset-0 -z-10 bg-[#0B1E45]/45" />
        <div className="mx-auto max-w-5xl px-4 py-16 text-center sm:py-20">
          <h1 className="text-display">{villageName}</h1>
          {g.description ? (
            <p className="mx-auto mt-3 max-w-2xl text-body leading-relaxed opacity-90">
              {g.description}
            </p>
          ) : (
            <p className="mx-auto mt-3 max-w-2xl text-body opacity-90">{t('public.tagline')}</p>
          )}
          {(g.taluka || g.district) && (
            <p className="mt-4 inline-flex items-center gap-1.5 text-caption opacity-90">
              <MapPin className="h-3.5 w-3.5" aria-hidden="true" />
              {[g.taluka, g.district, g.state].filter(Boolean).join(', ')}
            </p>
          )}
        </div>
      </div>

      {/* About the village */}
      {g.description || g.history || aboutFacts.length ? (
        <Section id="about" title={t('public.about')}>
          <div className="grid gap-6 md:grid-cols-3">
            <div className="space-y-3 md:col-span-2">
              {g.description ? (
                <p className="text-body leading-relaxed text-foreground">{g.description}</p>
              ) : null}
              {g.history ? (
                <p className="text-body leading-relaxed text-muted-foreground">{g.history}</p>
              ) : null}
            </div>
            {aboutFacts.length ? (
              <dl className="h-fit space-y-2 rounded-lg border border-border bg-card p-4 shadow-xs">
                {aboutFacts.map(([k, v]) => (
                  <div key={k} className="flex justify-between gap-3">
                    <dt className="text-caption text-muted-foreground">{t(`public.field.${k}`)}</dt>
                    <dd className="text-caption font-medium text-foreground">{v}</dd>
                  </div>
                ))}
              </dl>
            ) : null}
          </div>
        </Section>
      ) : null}

      {/* Statistics */}
      {stats.length ? (
        <Section id="stats" title={t('public.stats')}>
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
            {stats.map(([key, value]) => (
              <div
                key={key}
                className="rounded-lg border border-border bg-card p-4 text-center shadow-xs"
              >
                <p className="text-title tabular-nums text-foreground">{String(value)}</p>
                <p className="mt-0.5 text-caption text-muted-foreground">{humanize(key)}</p>
              </div>
            ))}
          </div>
        </Section>
      ) : null}

      {/* Public services */}
      <Section id="services" title={t('public.services')}>
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
          {services.map((s) => {
            const Icon = s.icon || Building2;
            const title = s.title || t(`nav.${s.key}`, s.key);
            return (
              <Link
                key={s.key || s.title}
                to="/login"
                className="flex min-h-28 flex-col items-center justify-center gap-2 rounded-lg border border-border bg-card p-4 text-center shadow-xs transition-[box-shadow,transform] duration-150 hover:shadow-sm active:translate-y-px"
              >
                <span className="flex h-11 w-11 items-center justify-center rounded-full bg-primary-subtle text-primary">
                  <Icon className="h-5 w-5" aria-hidden="true" />
                </span>
                <span className="text-body font-medium text-foreground">{title}</span>
              </Link>
            );
          })}
        </div>
      </Section>

      {/* Latest notices + schemes. One page-level container (identical width to every other
          section) holding a two-column inner grid — previously each list was its own centred
          max-w-5xl Section nested inside the grid, so it centred within its column instead of
          the page and rendered narrow and off-axis whenever only one list had content. */}
      {notices.length || schemes.length ? (
        <section
          aria-labelledby={notices.length ? 'notices-h' : 'schemes-h'}
          className="mx-auto w-full max-w-5xl px-4 py-8"
        >
          {/* min-w-0 on each column: a grid item's default `min-width: auto` sized the column
              to its longest notice title (367px inside a 288px grid at 320px), so `truncate`
              below never engaged and the page scrolled sideways. */}
          <div className="grid gap-x-8 gap-y-6 md:grid-cols-2">
            {notices.length ? (
              <div className="min-w-0">
                <h2 id="notices-h" className="mb-5 text-title text-foreground">
                  {t('public.latestNotices')}
                </h2>
                <ul className="space-y-2">
                  {notices.map((n) => (
                    <li
                      key={n.id}
                      className="rounded-lg border border-border bg-card px-4 py-3 shadow-xs"
                    >
                      <p className="truncate text-body font-medium text-foreground">{n.title}</p>
                      <p className="mt-0.5 text-caption text-muted-foreground">
                        {formatDate(n.publishDate || n.createdAt, locale)}
                      </p>
                    </li>
                  ))}
                </ul>
              </div>
            ) : null}
            {schemes.length ? (
              <div className="min-w-0">
                <h2 id="schemes-h" className="mb-5 text-title text-foreground">
                  {t('public.latestSchemes')}
                </h2>
                <ul className="space-y-2">
                  {schemes.map((s) => (
                    <li
                      key={s.id}
                      className="rounded-lg border border-border bg-card px-4 py-3 shadow-xs"
                    >
                      <p className="truncate text-body font-medium text-foreground">{s.title}</p>
                      {s.summary ? (
                        <p className="mt-0.5 line-clamp-1 text-caption text-muted-foreground">
                          {s.summary}
                        </p>
                      ) : null}
                    </li>
                  ))}
                </ul>
              </div>
            ) : null}
          </div>
        </section>
      ) : null}

      {/*
       * Who to ring, before anyone has to sign in.
       *
       * This lived behind the login until now, which put the Panchayat's own phone numbers
       * out of reach of exactly the person most likely to need them — someone who has not
       * registered yet. It reads from the same village profile the directory does; nothing
       * is hard-coded and no field is shown that the directory does not already publish.
       */}
      {members.length ? (
        <Section id="members" title={t('public.members')}>
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {members.map((m) => (
              <article
                key={m.id ?? `${m.name}-${m.designation}`}
                className="flex min-w-0 flex-col gap-2 rounded-lg border border-border bg-card p-4 shadow-xs"
              >
                <div className="min-w-0">
                  <p className="truncate text-body font-semibold text-foreground">
                    {m.name || '—'}
                  </p>
                  {m.designation ? (
                    <p className="truncate text-caption text-muted-foreground">{m.designation}</p>
                  ) : null}
                  {m.ward ? (
                    <p className="truncate text-caption text-muted-foreground">
                      {t('directory.ward')}: {m.ward}
                    </p>
                  ) : null}
                </div>

                {m.mobile ? (
                  <div className="mt-auto flex items-center justify-between gap-2 pt-1">
                    {/* The digits, not only a Call button: a number you can read is one you
                        can write down, dictate, or dial from a landline. */}
                    <span className="truncate text-body tabular-nums text-foreground">
                      {m.mobile}
                    </span>
                    <a
                      href={`tel:${m.mobile}`}
                      aria-label={`${t('directory.call')} ${m.name || ''} ${m.mobile}`}
                      className="inline-flex min-h-11 shrink-0 items-center gap-1.5 rounded-md bg-primary px-3 text-body font-medium text-primary-foreground transition-colors duration-150 hover:bg-primary-hover focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                    >
                      <Phone className="h-4 w-4" aria-hidden="true" />
                      {t('directory.call')}
                    </a>
                  </div>
                ) : null}
              </article>
            ))}
          </div>
        </Section>
      ) : null}

      {/* Upcoming events */}
      {events.length ? (
        <Section id="events" title={t('public.events')}>
          <div className="grid gap-4 sm:grid-cols-2">
            {events.map((e) => (
              <article
                key={e.id}
                className="overflow-hidden rounded-lg border border-border bg-card shadow-xs"
              >
                {/* Every card gets a picture; without one the grid was a wall of grey blocks. */}
                <SafeImage
                  src={e.banner || eventArtFor(e.title)}
                  alt=""
                  className="h-36 w-full object-cover"
                />
                <div className="p-4">
                  <p className="inline-flex items-center gap-1.5 text-caption text-primary">
                    <CalendarDays className="h-3.5 w-3.5" aria-hidden="true" />
                    {formatDate(e.startDate, locale)}
                  </p>
                  <h3 className="mt-1 text-section text-foreground">{e.title}</h3>
                  {e.location ? (
                    <p className="mt-1 inline-flex items-center gap-1 text-caption text-muted-foreground">
                      <MapPin className="h-3 w-3" aria-hidden="true" />
                      {e.location}
                    </p>
                  ) : null}
                </div>
              </article>
            ))}
          </div>
        </Section>
      ) : null}

      {/* Gallery */}
      {gallery.length ? (
        <Section id="gallery" title={t('public.gallery')}>
          <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
            {gallery.map((item) => (
              <figure key={item.id} className="overflow-hidden rounded-lg border border-border">
                <SafeImage
                  src={item.image}
                  alt={item.title || ''}
                  loading="lazy"
                  className="h-32 w-full object-cover sm:h-40"
                />
                {item.title ? (
                  <figcaption className="truncate bg-card px-2 py-1 text-caption text-muted-foreground">
                    {item.title}
                  </figcaption>
                ) : null}
              </figure>
            ))}
          </div>
        </Section>
      ) : null}

      {/* Achievements */}
      {awards.length ? (
        <Section id="achievements" title={t('public.achievements')}>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {awards.map((a) => (
              <article key={a.id} className="rounded-lg border border-border bg-card p-4 shadow-xs">
                {a.image ? (
                  <SafeImage
                    src={a.image}
                    alt=""
                    loading="lazy"
                    className="mb-3 h-32 w-full rounded object-cover"
                  />
                ) : (
                  <span className="mb-3 flex h-10 w-10 items-center justify-center rounded-full bg-primary-subtle text-primary">
                    <Award className="h-5 w-5" aria-hidden="true" />
                  </span>
                )}
                <h3 className="text-section text-foreground">
                  {a.name}
                  {a.year ? (
                    <span className="text-caption font-normal text-muted-foreground">
                      {' '}
                      · {a.year}
                    </span>
                  ) : null}
                </h3>
                {a.description ? (
                  <p className="mt-1 text-caption text-muted-foreground">{a.description}</p>
                ) : null}
              </article>
            ))}
          </div>
        </Section>
      ) : null}

      {/* Location */}
      {hasMap ? (
        <Section id="location" title={t('public.location')}>
          <MapView latitude={g.latitude} longitude={g.longitude} height={280} interactive />
        </Section>
      ) : null}

      {/* Footer */}
      <footer className="border-t border-border bg-card">
        <div className="mx-auto grid max-w-5xl gap-8 px-4 py-10 sm:grid-cols-2 lg:grid-cols-4">
          {/* Identity */}
          <div className="space-y-2">
            <div className="flex items-center gap-2">
              <SafeImage src={g.logo || logo} alt="" className="h-8 w-8 rounded" />
              <p className="text-body font-medium text-foreground">
                {g.panchayatName || villageName}
              </p>
            </div>
            <p className="text-caption leading-relaxed text-muted-foreground">
              {t('public.tagline')}
            </p>
          </div>

          {/* Quick links */}
          <nav aria-label={t('public.quickLinks')} className="space-y-2">
            <p className="text-label text-foreground">{t('public.quickLinks')}</p>
            <ul className="space-y-1.5 text-caption">
              {QUICK_LINKS.map((q) => (
                <li key={q.href}>
                  <a
                    href={q.href}
                    className="text-muted-foreground transition-colors duration-150 hover:text-primary"
                  >
                    {t(q.key)}
                  </a>
                </li>
              ))}
              <li>
                <Link
                  to="/help"
                  className="text-muted-foreground transition-colors duration-150 hover:text-primary"
                >
                  {t('help.title')}
                </Link>
              </li>
              <li>
                <Link
                  to="/verify"
                  className="text-muted-foreground transition-colors duration-150 hover:text-primary"
                >
                  {t('verify.heading')}
                </Link>
              </li>
              <li>
                <Link
                  to="/login"
                  className="text-muted-foreground transition-colors duration-150 hover:text-primary"
                >
                  {t('public.enter')}
                </Link>
              </li>
            </ul>
          </nav>

          {/* Government links */}
          <nav aria-label={t('public.govLinks')} className="space-y-2">
            <p className="text-label text-foreground">{t('public.govLinks')}</p>
            <ul className="space-y-1.5 text-caption">
              {GOV_LINKS.map((l) => (
                <li key={l.href}>
                  <a
                    href={l.href}
                    target="_blank"
                    rel="noreferrer noopener"
                    className="inline-flex items-center gap-1 text-muted-foreground transition-colors duration-150 hover:text-primary"
                  >
                    {l.label}
                    <ExternalLink className="h-3 w-3" aria-hidden="true" />
                  </a>
                </li>
              ))}
            </ul>
          </nav>

          {/* Office */}
          <div className="space-y-2">
            <p className="text-label text-foreground">{t('public.office')}</p>
            <address className="space-y-1.5 not-italic text-caption text-muted-foreground">
              {officeAddress ? (
                <p className="flex items-start gap-1.5">
                  <MapPin className="mt-0.5 h-3.5 w-3.5 shrink-0" aria-hidden="true" />
                  <span>{officeAddress}</span>
                </p>
              ) : null}
              {lead.officeTimings ? (
                <p className="flex items-center gap-1.5">
                  <Clock className="h-3.5 w-3.5 shrink-0" aria-hidden="true" />
                  {lead.officeTimings}
                </p>
              ) : null}
              {lead.contactNumbers ? (
                <p className="flex items-center gap-1.5">
                  <Phone className="h-3.5 w-3.5 shrink-0" aria-hidden="true" />
                  <a href={`tel:${lead.contactNumbers}`} className="hover:text-primary">
                    {lead.contactNumbers}
                  </a>
                </p>
              ) : null}
              {lead.officeEmail ? (
                <p className="flex items-center gap-1.5">
                  <Mail className="h-3.5 w-3.5 shrink-0" aria-hidden="true" />
                  <a href={`mailto:${lead.officeEmail}`} className="hover:text-primary">
                    {lead.officeEmail}
                  </a>
                </p>
              ) : null}
            </address>
          </div>
        </div>

        <div className="border-t border-border">
          <p className="mx-auto max-w-5xl px-4 py-4 text-center text-caption text-muted-foreground">
            © {year} {g.panchayatName || villageName}. {t('public.rights')} · {t('appName')}
          </p>
        </div>
      </footer>
    </div>
  );
}
