import { useTranslation } from 'react-i18next';
import { CalendarPlus, Download, FileText, MapPin, Radio, Share2 } from 'lucide-react';
import toast from 'react-hot-toast';
import { formatDate, formatTime } from '@dgp/shared';
import { PageHeader } from '@/components/PageHeader';
import { EmptyState } from '@/components/EmptyState';
import { NoEventsArt } from '@/components/Illustration';
import { SkeletonList } from '@/components/Skeleton';
import { QueryError } from '@/components/QueryError';
import { cn } from '@/utils/cn';
import { downloadEventIcs } from '@/utils/calendar';
import { useMeetings } from '../hooks';

const STATUS_STYLES = {
  Live: 'bg-destructive-subtle text-destructive-strong',
  Upcoming: 'bg-primary-subtle text-primary',
  Completed: 'bg-secondary text-secondary-foreground',
};

function MeetingCard({ meeting }) {
  const { t, i18n } = useTranslation();
  const locale = i18n.language === 'mr' ? 'mr' : 'en';

  const share = async () => {
    const text = [
      meeting.title,
      `${formatDate(meeting.scheduledAt, locale)} · ${formatTime(meeting.scheduledAt, locale)}`,
      meeting.venue,
    ]
      .filter(Boolean)
      .join('\n');
    try {
      if (navigator.share) await navigator.share({ title: meeting.title, text });
      else {
        await navigator.clipboard.writeText(text);
        toast.success(t('meeting.copied'));
      }
    } catch {
      // A dismissed share sheet is not an error.
    }
  };

  return (
    <article className="min-w-0 rounded-xl border border-border bg-card p-4 shadow-xs">
      <div className="flex flex-wrap items-start justify-between gap-2">
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <span
              className={cn(
                'inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-caption font-medium',
                STATUS_STYLES[meeting.status],
              )}
            >
              {meeting.status === 'Live' ? <Radio className="h-3 w-3" aria-hidden="true" /> : null}
              {t(`meeting.status.${meeting.status}`, meeting.status)}
            </span>
            <span className="text-caption text-muted-foreground">
              {t(`meeting.type.${meeting.meetingType}`, meeting.meetingType)}
            </span>
            {meeting.meetingNumber ? (
              <span className="text-caption tabular-nums text-muted-foreground">
                {meeting.meetingNumber}
              </span>
            ) : null}
          </div>
          <h2 className="mt-1.5 text-section text-foreground">{meeting.title}</h2>
        </div>
      </div>

      <ul className="mt-2 flex flex-wrap gap-x-4 gap-y-1">
        <li className="text-caption text-muted-foreground">
          {formatDate(meeting.scheduledAt, locale)} · {formatTime(meeting.scheduledAt, locale)}
        </li>
        {meeting.venue ? (
          <li className="inline-flex min-w-0 items-center gap-1.5 text-caption text-muted-foreground">
            <MapPin className="h-3.5 w-3.5 shrink-0" aria-hidden="true" />
            <span className="truncate">{meeting.venue}</span>
          </li>
        ) : null}
      </ul>

      {meeting.agenda?.length ? (
        <div className="mt-3">
          <p className="text-label font-medium text-foreground">{t('meeting.agenda')}</p>
          <ol className="mt-1 list-decimal space-y-0.5 pl-5">
            {meeting.agenda.map((item) => (
              <li key={item.id ?? item.title} className="text-body text-muted-foreground">
                {item.title}
                {item.description ? ` — ${item.description}` : ''}
              </li>
            ))}
          </ol>
        </div>
      ) : null}

      <div className="mt-3 flex flex-wrap gap-2">
        {meeting.status !== 'Completed' ? (
          <button
            type="button"
            onClick={() =>
              downloadEventIcs({
                id: meeting.id,
                title: meeting.title,
                startDate: meeting.scheduledAt,
                endDate: meeting.endsAt,
                location: meeting.venue,
                description: meeting.description,
              })
            }
            className="inline-flex min-h-11 items-center gap-1.5 rounded-lg bg-primary px-3 text-caption font-medium text-primary-foreground transition-colors duration-150 hover:bg-primary-hover"
          >
            <CalendarPlus className="h-4 w-4" aria-hidden="true" />
            {t('home.addToCalendar')}
          </button>
        ) : null}

        {meeting.noticeUrl ? (
          <a
            href={meeting.noticeUrl}
            target="_blank"
            rel="noreferrer noopener"
            className="inline-flex min-h-11 items-center gap-1.5 rounded-lg border border-border px-3 text-caption font-medium text-foreground transition-colors duration-150 hover:bg-accent"
          >
            <FileText className="h-4 w-4" aria-hidden="true" />
            {t('meeting.notice')}
          </a>
        ) : null}

        {meeting.minutesUrl ? (
          <a
            href={meeting.minutesUrl}
            target="_blank"
            rel="noreferrer noopener"
            className="inline-flex min-h-11 items-center gap-1.5 rounded-lg border border-border px-3 text-caption font-medium text-foreground transition-colors duration-150 hover:bg-accent"
          >
            <Download className="h-4 w-4" aria-hidden="true" />
            {t('meeting.minutes')}
          </a>
        ) : null}

        <button
          type="button"
          onClick={share}
          className="inline-flex min-h-11 items-center gap-1.5 rounded-lg border border-border px-3 text-caption font-medium text-foreground transition-colors duration-150 hover:bg-accent"
        >
          <Share2 className="h-4 w-4" aria-hidden="true" />
          {t('home.share')}
        </button>
      </div>
    </article>
  );
}

/** Gram Sabha and other statutory meetings, live and upcoming ones first. */
export function Meetings() {
  const { t } = useTranslation();
  const { data, isLoading, isError, refetch } = useMeetings();
  const rows = data?.data ?? [];

  return (
    <div className="dgp-page">
      <PageHeader backTo="/" title={t('meeting.title')} subtitle={t('meeting.intro')} />

      {isLoading ? (
        <SkeletonList count={3} />
      ) : isError ? (
        <QueryError message={t('meeting.loadError')} onRetry={refetch} />
      ) : rows.length ? (
        <div className="grid gap-3">
          {rows.map((m) => (
            <MeetingCard key={m.id} meeting={m} />
          ))}
        </div>
      ) : (
        <EmptyState
          art={NoEventsArt}
          title={t('meeting.empty')}
          description={t('meeting.emptyHint')}
        />
      )}
    </div>
  );
}
