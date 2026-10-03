import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import {
  ClipboardList,
  Megaphone,
  Landmark,
  FileText,
  Receipt,
  Gavel,
  HardHat,
  Vote,
} from 'lucide-react';
import { SectionHeader } from '@/components/PageHeader';
import { EmptyState } from '@/components/EmptyState';
import { NoEventsArt, NoNoticesArt, NoSchemesArt } from '@/components/Illustration';
import { useAuth } from '@/hooks/useAuth';
import { useMyComplaints } from '@/features/complaints/hooks';
import { useMyApplications } from '@/features/dakhala/hooks';
import { useMyTax } from '@/features/tax/hooks';
import { useNotices } from '@/features/notices/hooks';
import { useSchemes } from '@/features/schemes/hooks';
import { useVillageProfile, useVillageEvents } from '@/features/village/hooks';
import { TimetableSection } from '@/features/timetable/TimetableSection';
import { ServiceCard } from '@/features/home/ServiceCard';
import { NoticeCard } from '@/features/notices/components/NoticeCard';
import { SchemeCard } from '@/features/schemes/components/SchemeCard';
import { VillageHero } from '@/features/home/VillageHero';
import { GlobalSearch } from '@/features/home/GlobalSearch';
import { PriorityBoard } from '@/features/home/PriorityBoard';
import { EventCard, daysUntil } from '@/features/home/EventCard';
import { useMeetings, useProjects, useDownloads } from '@/features/governance/hooks';

// Quick services — every entry point a citizen has. The last four are the governance modules
// that give someone a reason to open this weekly rather than only when they need a document.
/*
 * The services a citizen acts on.
 *
 * Directory, Verify, Alerts and Downloads have gone from this grid. They were reference
 * surfaces sitting among things you *do* — the directory is now public and on the home page
 * before login, and the rest stay reachable by their routes without taking a tile here.
 * Nothing was deleted from the backend; these are navigation decisions.
 */
const SERVICES = [
  {
    to: '/complaints/new',
    label: 'nav.complaints',
    desc: 'home.svc.complaints',
    icon: ClipboardList,
  },
  { to: '/dakhala', label: 'nav.dakhala', desc: 'home.svc.dakhala', icon: FileText },
  { to: '/tax', label: 'nav.tax', desc: 'home.svc.tax', icon: Receipt },
  { to: '/schemes', label: 'nav.schemes', desc: 'home.svc.schemes', icon: Landmark },
  { to: '/notices', label: 'nav.notices', desc: 'home.svc.notices', icon: Megaphone },
  { to: '/meetings', label: 'nav.meetings', desc: 'home.svc.meetings', icon: Gavel },
  { to: '/projects', label: 'nav.projects', desc: 'home.svc.projects', icon: HardHat },
  { to: '/polls', label: 'nav.polls', desc: 'home.svc.polls', icon: Vote },
];

export function Home() {
  const { t } = useTranslation();
  const { user } = useAuth();

  const { data: complaints } = useMyComplaints();
  const { data: applications } = useMyApplications();
  const { data: tax } = useMyTax();
  const { data: notices } = useNotices();
  const { data: schemes } = useSchemes();
  const { data: profile } = useVillageProfile();
  const { data: eventsData } = useVillageEvents();
  // Fetched here purely so global search can reach them; each list caches for minutes.
  const { data: meetings } = useMeetings();
  const { data: projects } = useProjects();
  const { data: downloads } = useDownloads();

  const activeComplaints = (complaints?.data ?? []).filter((c) => c.status !== 'Resolved').length;
  const pendingCerts = (applications?.data ?? []).filter(
    (a) => a.status === 'Submitted' || a.status === 'UnderReview',
  ).length;
  const outstanding = tax?.totalDues ?? 0;
  const latestNotices = (notices?.data ?? []).slice(0, 4);
  const latestSchemes = (schemes?.data ?? []).slice(0, 4);

  const events = eventsData?.data ?? [];
  const [nextEvent, ...laterEvents] = events;
  // Anything happening today or tomorrow belongs in the "today" band, not further down.
  const imminentEvent = events.find((e) => daysUntil(e.startDate) <= 1);

  const firstName = user?.fullName?.split(' ')[0];

  return (
    <div className="mx-auto w-full max-w-6xl space-y-7 px-4 py-5 lg:px-6">
      {/* 1 — the village itself */}
      <VillageHero profile={profile} firstName={firstName} />

      {/* One box across everything already loaded — no extra request, works offline. */}
      <GlobalSearch
        notices={notices?.data}
        schemes={schemes?.data}
        complaints={complaints?.data}
        applications={applications?.data}
        tax={tax?.data}
        profile={profile}
        events={events}
        meetings={meetings?.data}
        projects={projects?.data}
        downloads={downloads?.data}
      />

      {/*
        2 — services, immediately under the search box.
        A citizen arriving here wants to *do* something. The services grid is the answer to
        that, so it sits directly below the box they would otherwise type into; the personal
        status band and the events follow it rather than pushing it below the fold.
      */}
      <section aria-labelledby="qs-h">
        <SectionHeader id="qs-h" title={t('home.services')} />
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
          {SERVICES.map(({ to, label, desc, icon }) => (
            <ServiceCard
              key={label}
              to={to}
              icon={icon}
              title={t(label)}
              description={t(desc)}
              cta={t('home.svc.open')}
            />
          ))}
        </div>
      </section>

      {/* 3 — what this particular citizen has to deal with, before anything generic */}
      <PriorityBoard
        activeComplaints={activeComplaints}
        pendingCerts={pendingCerts}
        outstanding={outstanding}
        todayEvent={imminentEvent}
        latestNotice={latestNotices[0]}
        officeTimings={profile?.leadership?.officeTimings}
      />

      {/* 4 — upcoming events */}
      <section aria-labelledby="events-h">
        <SectionHeader
          id="events-h"
          title={t('home.upcomingEvents')}
          action={
            events.length > 1 ? (
              <Link
                to="/welcome#events"
                className="rounded-md px-1 py-0.5 text-caption font-medium text-primary transition-colors duration-150 hover:text-primary-hover"
              >
                {t('home.seeAll')}
              </Link>
            ) : null
          }
        />
        {nextEvent ? (
          <div className="grid gap-3 lg:grid-cols-3">
            <div className="lg:col-span-2">
              <EventCard event={nextEvent} featured />
            </div>
            {laterEvents.length ? (
              <div className="grid min-w-0 gap-3 sm:grid-cols-2 lg:grid-cols-1">
                {laterEvents.slice(0, 2).map((e) => (
                  <EventCard key={e.id} event={e} />
                ))}
              </div>
            ) : null}
          </div>
        ) : (
          <EmptyState
            art={NoEventsArt}
            title={t('home.noEvents')}
            description={t('home.noEventsHint')}
          />
        )}
      </section>

      {/* 5 — when the village services run. Placed above the officials band because a
          collection time is the thing a citizen checks weekly; a member's number is the thing
          they look up once. */}
      <TimetableSection />

      {/*
        "Our village in numbers" is deliberately absent here. It is public-facing material
        aimed at someone deciding whether to trust the portal, which is a question a signed-in
        citizen has already answered. It still renders on /welcome, and the statistics API and
        data are untouched — this is a visibility decision, not a removal.
      */}

      {/* 6 + 7 — notices and schemes, side by side on desktop */}
      <div className="grid gap-6 lg:grid-cols-2">
        <section aria-labelledby="notices-h" className="min-w-0">
          <SectionHeader
            id="notices-h"
            title={t('home.latestNotices')}
            action={
              <Link
                to="/notices"
                className="rounded-md px-1 py-0.5 text-caption font-medium text-primary transition-colors duration-150 hover:text-primary-hover"
              >
                {t('home.seeAll')}
              </Link>
            }
          />
          {latestNotices.length ? (
            <div className="grid gap-2.5">
              {latestNotices.map((n) => (
                <NoticeCard key={n.id} notice={n} />
              ))}
            </div>
          ) : (
            <EmptyState art={NoNoticesArt} title={t('notice.list.empty')} />
          )}
        </section>

        <section aria-labelledby="schemes-h" className="min-w-0">
          <SectionHeader
            id="schemes-h"
            title={t('home.latestSchemes')}
            action={
              <Link
                to="/schemes"
                className="rounded-md px-1 py-0.5 text-caption font-medium text-primary transition-colors duration-150 hover:text-primary-hover"
              >
                {t('home.seeAll')}
              </Link>
            }
          />
          {latestSchemes.length ? (
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              {latestSchemes.map((s) => (
                <SchemeCard key={s.id} scheme={s} />
              ))}
            </div>
          ) : (
            <EmptyState art={NoSchemesArt} title={t('scheme.list.empty')} />
          )}
        </section>
      </div>
    </div>
  );
}
