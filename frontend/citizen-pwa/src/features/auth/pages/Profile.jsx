import { useMemo } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import {
  LogOut,
  ClipboardList,
  FileText,
  Receipt,
  ChevronRight,
  CalendarCheck,
  IndianRupee,
  Languages,
} from 'lucide-react';
import { formatCurrency, formatDate, formatDateTime } from '@dgp/shared';
import { useLanguage } from '@/store';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Banner } from '@/components/Banner';
import { HERO } from '@/components/Artwork';
import { SectionHeader } from '@/components/PageHeader';
import { useAuth } from '@/hooks/useAuth';
import { useMyComplaints } from '@/features/complaints/hooks';
import { useMyApplications } from '@/features/dakhala/hooks';
import { useMyTax } from '@/features/tax/hooks';
import { ProfileForm } from '../components/ProfileForm';

/**
 * Initials stand in for a profile picture. The backend stores no avatar, and adding one
 * would mean a new upload endpoint — out of scope for a UI pass — so we render something
 * identifiable from the name we already have rather than a generic grey silhouette.
 */
function initialsOf(name = '') {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (!parts.length) return '?';
  return (parts[0][0] + (parts.length > 1 ? parts[parts.length - 1][0] : '')).toUpperCase();
}

function StatTile({ icon: Icon, value, label }) {
  return (
    <div className="flex flex-col items-center gap-1 rounded-lg border border-border bg-card p-3 text-center shadow-xs">
      <Icon className="h-4 w-4 text-primary" aria-hidden="true" />
      <p className="text-section tabular-nums text-foreground">{value}</p>
      <p className="text-caption leading-tight text-muted-foreground">{label}</p>
    </div>
  );
}

export function Profile() {
  const { t, i18n } = useTranslation();
  const locale = i18n.language === 'mr' ? 'mr' : 'en';
  const { user, logout } = useAuth();
  const { language, toggleLanguage } = useLanguage();
  const navigate = useNavigate();

  const { data: complaints } = useMyComplaints();
  const { data: applications } = useMyApplications();
  const { data: tax } = useMyTax();

  const complaintList = useMemo(() => complaints?.data ?? [], [complaints]);
  const applicationList = useMemo(() => applications?.data ?? [], [applications]);

  // Recent activity is stitched from what the citizen has already filed — no new endpoint,
  // just the two lists we're holding merged and sorted newest-first.
  const activity = useMemo(() => {
    const items = [
      ...complaintList.map((c) => ({
        id: `c-${c.id}`,
        to: `/complaints/${c.id}`,
        icon: ClipboardList,
        title: c.title || c.complaintId,
        status: c.status,
        at: c.updatedAt || c.createdAt,
      })),
      ...applicationList.map((a) => ({
        id: `a-${a.id}`,
        to: `/dakhala/${a.id}`,
        icon: FileText,
        title: t(`dakhala.type.${a.certificateType}`, a.certificateType),
        status: a.status,
        at: a.updatedAt || a.createdAt,
      })),
    ];
    return items.sort((x, y) => new Date(y.at) - new Date(x.at)).slice(0, 5);
  }, [complaintList, applicationList, t]);

  // Issued certificates carry a number; the rest are still applications in flight.
  const issuedCount = applicationList.filter(
    (a) => a.certificateNumber || a.status === 'Issued' || a.status === 'Approved',
  ).length;
  // Sum of what this citizen has actually paid, across their tax records.
  const totalPaid = (tax?.data ?? []).reduce((sum, r) => sum + (r.amountPaid ?? 0), 0);

  const handleLogout = async () => {
    await logout();
    navigate('/login', { replace: true });
  };

  return (
    <div className="dgp-page">
      {/*
       * A village strip above the identity card. The card itself is untouched: this is the one
       * screen that is entirely about the citizen, and it opened with a white rectangle.
       */}
      <Banner
        src={HERO.villageEntrance}
        ratio="h-24 sm:h-28"
        className="mb-[-2.5rem] rounded-2xl"
        scrim={false}
      />
      {/* Identity */}
      <Card className="relative mb-5">
        <CardContent className="flex items-center gap-3.5">
          <span
            aria-hidden="true"
            className="flex h-14 w-14 shrink-0 items-center justify-center rounded-full bg-primary text-title font-semibold text-primary-foreground"
          >
            {initialsOf(user?.fullName)}
          </span>
          <div className="min-w-0 flex-1">
            <h1 className="truncate text-title text-foreground">{user?.fullName}</h1>
            <p className="truncate text-body text-muted-foreground">{user?.mobile}</p>
            {user?.village ? (
              <p className="truncate text-caption text-muted-foreground">{user.village}</p>
            ) : null}
            {user?.createdAt ? (
              <p className="mt-1 inline-flex items-center gap-1.5 text-caption text-muted-foreground">
                <CalendarCheck className="h-3.5 w-3.5 shrink-0" aria-hidden="true" />
                {t('auth.memberSince')} {formatDate(user.createdAt, locale)}
              </p>
            ) : null}
          </div>
          <Button variant="outline" size="sm" onClick={handleLogout} className="shrink-0">
            <LogOut className="h-4 w-4" aria-hidden="true" />
            {t('auth.logout')}
          </Button>
        </CardContent>
      </Card>

      {/* Statistics */}
      <SectionHeader title={t('auth.stats')} />
      <div className="mb-6 grid grid-cols-2 gap-3 sm:grid-cols-4">
        <StatTile
          icon={ClipboardList}
          value={complaintList.length}
          label={t('auth.statComplaints')}
        />
        {/*
         * Applications and certificates are not the same thing. Counting every application as
         * a "certificate received" overstated what the citizen actually holds, so issued ones
         * are counted separately — an issued record is one that carries a certificate number.
         */}
        <StatTile icon={FileText} value={issuedCount} label={t('auth.statCertificatesIssued')} />
        <StatTile
          icon={IndianRupee}
          value={formatCurrency(totalPaid, locale)}
          label={t('auth.statPaid')}
        />
        <StatTile
          icon={Receipt}
          value={formatCurrency(tax?.totalDues ?? 0, locale)}
          label={t('auth.statDues')}
        />
      </div>

      {/* Preferences — the two settings citizens change most, without a trip to Settings. */}
      <SectionHeader title={t('auth.preferences')} />
      <Card className="mb-6">
        <ul className="divide-y divide-border">
          <li className="flex min-h-14 items-center gap-3 px-4 py-2.5">
            <Languages className="h-4 w-4 shrink-0 text-muted-foreground" aria-hidden="true" />
            <span className="min-w-0 flex-1 truncate text-body text-foreground">
              {t('settings.language')}
            </span>
            <Button variant="outline" size="sm" onClick={toggleLanguage}>
              {language === 'mr' ? 'English' : 'मराठी'}
            </Button>
          </li>
        </ul>
      </Card>

      {/* Recent activity */}
      <SectionHeader title={t('auth.recentActivity')} />
      <Card className="mb-6">
        {activity.length ? (
          <ul className="divide-y divide-border">
            {activity.map((a) => (
              <li key={a.id}>
                <Link
                  to={a.to}
                  className="flex min-h-11 items-center gap-2.5 px-3 py-2.5 transition-colors duration-150 hover:bg-muted/40"
                >
                  <a.icon className="h-4 w-4 shrink-0 text-muted-foreground" aria-hidden="true" />
                  <span className="min-w-0 flex-1">
                    <span className="block truncate text-body text-foreground">{a.title}</span>
                    <span className="block truncate text-caption text-muted-foreground">
                      {formatDateTime(a.at, locale)}
                    </span>
                  </span>
                  <ChevronRight
                    className="h-4 w-4 shrink-0 text-muted-foreground"
                    aria-hidden="true"
                  />
                </Link>
              </li>
            ))}
          </ul>
        ) : (
          <CardContent>
            <p className="text-body text-muted-foreground">{t('auth.noActivity')}</p>
          </CardContent>
        )}
      </Card>

      {/* Editable details */}
      <SectionHeader title={t('auth.editProfile')} />
      <Card>
        <CardContent>
          <ProfileForm />
        </CardContent>
      </Card>
    </div>
  );
}
