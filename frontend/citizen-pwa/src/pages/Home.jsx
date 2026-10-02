import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import {
  ClipboardList,
  Megaphone,
  Landmark,
  FileText,
  Receipt,
  Users,
  BadgeCheck,
  Bell,
  Gavel,
  HardHat,
  Vote,
  Download,
} from 'lucide-react';
import { Card } from '@/components/ui/card';
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
import { sortMembers } from '@/features/village/members';
import { OfficialCard } from '@/features/village/OfficialCard';
import { TimetableSection } from '@/features/timetable/TimetableSection';
import { NoticeCard } from '@/features/notices/components/NoticeCard';
import { SchemeCard } from '@/features/schemes/components/SchemeCard';
import { useUnreadCount } from '@/features/notifications/hooks';
import { VillageHero } from '@/features/home/VillageHero';
import { GlobalSearch } from '@/features/home/GlobalSearch';
import { PriorityBoard } from '@/features/home/PriorityBoard';
import { VillageStats } from '@/features/home/VillageStats';
import { EmergencyContacts } from '@/features/home/EmergencyContacts';
import { EventCard, daysUntil } from '@/features/home/EventCard';
import { useMeetings, useProjects, useDownloads } from '@/features/governance/hooks';

// Quick services — every entry point a citizen has. The last four are the governance modules
// that give someone a reason to open this weekly rather than only when they need a document.
const SERVICES = [
  { to: '/complaints/new', label: 'nav.complaints', icon: ClipboardList },
  { to: '/dakhala', label: 'nav.dakhala', icon: FileText },
  { to: '/tax', label: 'nav.tax', icon: Receipt },
  { to: '/schemes', label: 'nav.schemes', icon: Landmark },
  { to: '/notices', label: 'nav.notices', icon: Megaphone },
  { to: '/directory', label: 'nav.directory', icon: Users },
  { to: '/verify', label: 'nav.verify', icon: BadgeCheck },
  { to: '/notifications', label: 'nav.notifications', icon: Bell },
  { to: '/meetings', label: 'nav.meetings', icon: Gavel },
  { to: '/projects', label: 'nav.projects', icon: HardHat },
  { to: '/polls', label: 'nav.polls', icon: Vote },
  { to: '/downloads', label: 'nav.downloads', icon: Download },
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
  const { data: unread = 0 } = useUnreadCount();
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

  const contacts = profile?.emergencyContacts ?? [];
  const officials = sortMembers(profile?.members ?? []).slice(0, 6);
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

      {/* 2 — what this particular citizen has to deal with, before anything generic */}
      <PriorityBoard
        activeComplaints={activeComplaints}
        pendingCerts={pendingCerts}
        outstanding={outstanding}
        unread={unread}
        todayEvent={imminentEvent}
        latestNotice={latestNotices[0]}
        officeTimings={profile?.leadership?.officeTimings}
      />

      {/* 3 — upcoming events */}
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

      {/* 4 — quick services */}
      <section aria-labelledby="qs-h">
        <SectionHeader id="qs-h" title={t('home.services')} />
        <div className="grid grid-cols-4 gap-2.5 sm:grid-cols-6 lg:grid-cols-12">
          {SERVICES.map(({ to, label, icon: Icon }) => (
            <Link
              key={label}
              to={to}
              className="flex min-h-24 flex-col items-center justify-center gap-2 rounded-xl border border-border bg-card p-2 text-center shadow-xs transition-[box-shadow,transform,border-color] duration-150 hover:border-primary/40 hover:shadow-sm active:translate-y-px"
            >
              <span className="flex h-11 w-11 items-center justify-center rounded-full bg-primary-subtle">
                <Icon className="h-5 w-5 text-primary" aria-hidden="true" />
              </span>
              <span className="text-caption font-medium leading-tight text-foreground">
                {t(label)}
              </span>
            </Link>
          ))}
        </div>
      </section>

      {/* 5 — when the village services run. Placed above the officials band because a
          collection time is the thing a citizen checks weekly; a member's number is the thing
          they look up once. */}
      <TimetableSection />

      {/* 6 — who runs the village */}
      <section aria-labelledby="officials-h">
        <SectionHeader
          id="officials-h"
          title={t('directory.officials')}
          action={
            <Link
              to="/directory"
              className="rounded-md px-1 py-0.5 text-caption font-medium text-primary transition-colors duration-150 hover:text-primary-hover"
            >
              {t('directory.viewAll')}
            </Link>
          }
        />
        {officials.length ? (
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {officials.map((m) => (
              <OfficialCard key={m.id} member={m} variant="compact" />
            ))}
          </div>
        ) : (
          <Card>
            <div className="flex flex-col items-center gap-2 px-4 py-8 text-center">
              <span className="flex h-12 w-12 items-center justify-center rounded-full bg-primary-subtle text-primary">
                <Users className="h-6 w-6" aria-hidden="true" />
              </span>
              <p className="text-body text-muted-foreground">{t('directory.willUpdate')}</p>
              <Link
                to="/directory"
                className="text-caption font-medium text-primary hover:text-primary-hover"
              >
                {t('directory.viewAll')}
              </Link>
            </div>
          </Card>
        )}
      </section>

      {/* 7 — the village in numbers */}
      <VillageStats statistics={profile?.statistics} />

      {/* 7 + 8 — notices and schemes, side by side on desktop */}
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

      {/* 8 — emergency */}
      <EmergencyContacts contacts={contacts} />
    </div>
  );
}
