import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import {
  AlertCircle,
  CalendarClock,
  CheckCircle2,
  ChevronRight,
  ClipboardList,
  Clock,
  FileText,
  Megaphone,
} from 'lucide-react';
import { formatCurrency, pickLocale } from '@dgp/shared';
import { cn } from '@/utils/cn';

const TONES = {
  due: 'bg-destructive-subtle text-destructive-strong',
  pending: 'bg-warning-subtle text-warning-strong',
  info: 'bg-primary-subtle text-primary',
};

function Row({ icon: Icon, tone = 'info', title, detail, to }) {
  return (
    <li>
      <Link
        to={to}
        className="flex min-h-14 items-center gap-3 px-4 py-2.5 transition-colors duration-150 hover:bg-muted/40"
      >
        <span
          className={cn(
            'flex h-10 w-10 shrink-0 items-center justify-center rounded-full',
            TONES[tone],
          )}
        >
          <Icon className="h-5 w-5" aria-hidden="true" />
        </span>
        <span className="min-w-0 flex-1">
          <span className="block truncate text-body font-medium text-foreground">{title}</span>
          {detail ? (
            <span className="block truncate text-caption text-muted-foreground">{detail}</span>
          ) : null}
        </span>
        <ChevronRight className="h-4 w-4 shrink-0 text-muted-foreground" aria-hidden="true" />
      </Link>
    </li>
  );
}

/** Whole days from today to a date; 0 is today. */
function daysUntil(value) {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const d = new Date(value);
  d.setHours(0, 0, 0, 0);
  return Math.round((d - today) / 86400000);
}

/**
 * What this citizen has to deal with today, above everything else.
 *
 * The dashboard used to open with the same content for everybody. This band is assembled per
 * person — their own open complaints, applications and dues come first, then
 * anything happening in the village today. When a citizen genuinely has nothing outstanding it
 * says so plainly rather than padding the screen with empty cards.
 */
export function PriorityBoard({
  activeComplaints,
  pendingCerts,
  outstanding,
  todayEvent,
  latestNotice,
  officeTimings,
}) {
  const { t, i18n } = useTranslation();
  const locale = i18n.language === 'mr' ? 'mr' : 'en';

  const personal = [];
  if (activeComplaints > 0) {
    personal.push({
      key: 'complaints',
      icon: ClipboardList,
      tone: 'pending',
      title: t('home.priority.complaints', { count: activeComplaints }),
      detail: t('home.priority.complaintsHint'),
      to: '/complaints',
    });
  }
  if (pendingCerts > 0) {
    personal.push({
      key: 'certs',
      icon: FileText,
      tone: 'pending',
      title: t('home.priority.certificates', { count: pendingCerts }),
      detail: t('home.priority.certificatesHint'),
      to: '/dakhala',
    });
  }
  if (outstanding > 0) {
    personal.push({
      key: 'tax',
      icon: AlertCircle,
      tone: 'due',
      title: t('home.priority.tax', { amount: formatCurrency(outstanding, locale) }),
      detail: t('home.priority.taxHint'),
      to: '/tax',
    });
  }

  const village = [];
  if (todayEvent) {
    const days = daysUntil(todayEvent.startDate);
    village.push({
      key: 'event',
      icon: CalendarClock,
      tone: 'info',
      title: todayEvent.title,
      detail: days <= 0 ? t('home.eventToday') : t('home.eventTomorrow'),
      to: '/',
    });
  }
  if (latestNotice) {
    village.push({
      key: 'notice',
      icon: Megaphone,
      tone: 'info',
      title: pickLocale(latestNotice.i18n, 'title', locale, latestNotice.title),
      detail: t('home.priority.latestNotice'),
      to: `/notices/${latestNotice.id}`,
    });
  }

  const rows = [...personal, ...village];

  return (
    <section aria-labelledby="today-h">
      <div className="mb-2 flex items-center justify-between gap-2">
        <h2 id="today-h" className="text-section text-foreground">
          {t('home.todayTitle')}
        </h2>
        {officeTimings ? (
          <span className="inline-flex items-center gap-1 text-caption text-muted-foreground">
            <Clock className="h-3.5 w-3.5 shrink-0" aria-hidden="true" />
            <span className="truncate">{officeTimings}</span>
          </span>
        ) : null}
      </div>

      <div className="overflow-hidden rounded-xl border border-border bg-card shadow-xs">
        {rows.length ? (
          <ul className="divide-y divide-border">
            {rows.map((r) => (
              <Row key={r.key} {...r} />
            ))}
          </ul>
        ) : (
          // Nothing outstanding is good news, and should read like it.
          <div className="flex items-center gap-3 px-4 py-5">
            <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-success-subtle text-success-strong">
              <CheckCircle2 className="h-5 w-5" aria-hidden="true" />
            </span>
            <span className="min-w-0">
              <span className="block text-body font-medium text-foreground">
                {t('home.priority.allClear')}
              </span>
              <span className="block text-caption text-muted-foreground">
                {t('home.priority.allClearHint')}
              </span>
            </span>
          </div>
        )}
      </div>
    </section>
  );
}
