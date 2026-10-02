import { useTranslation } from 'react-i18next';
import toast from 'react-hot-toast';
import { CalendarDays, CalendarPlus, Clock, MapPin, Share2, Users } from 'lucide-react';
import { formatDate, formatTime } from '@dgp/shared';
import { SafeImage } from '@/components/SafeImage';
import { eventArtFor } from '@/components/Artwork';
import { downloadEventIcs } from '@/utils/calendar';

/** Whole days from today; 0 today, negative once past. */
export function daysUntil(value) {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const d = new Date(value);
  d.setHours(0, 0, 0, 0);
  return Math.round((d - today) / 86400000);
}

export function countdownLabel(value, t) {
  const days = daysUntil(value);
  if (days < 0) return t('home.eventPast');
  if (days === 0) return t('home.eventToday');
  if (days === 1) return t('home.eventTomorrow');
  return t('home.eventInDays', { count: days });
}

/**
 * A village event as a citizen needs it: what, when (date *and* time), where, who is running
 * it, how soon — and the two things they'll actually want to do, which are put it in their
 * calendar and send it to someone. Both work offline and need no backend.
 *
 * `featured` is the lead card on the dashboard; the rest are compact.
 */
export function EventCard({ event, featured = false }) {
  const { t, i18n } = useTranslation();
  const locale = i18n.language === 'mr' ? 'mr' : 'en';
  const past = daysUntil(event.startDate) < 0;

  const share = async () => {
    const text = [
      event.title,
      `${formatDate(event.startDate, locale)} · ${formatTime(event.startDate, locale)}`,
      event.location,
    ]
      .filter(Boolean)
      .join('\n');
    try {
      if (navigator.share) {
        await navigator.share({ title: event.title, text });
      } else {
        await navigator.clipboard.writeText(text);
        toast.success(t('home.eventCopied'));
      }
    } catch {
      // A cancelled share dialog is not an error worth interrupting anyone for.
    }
  };

  const meta = [
    { icon: CalendarDays, value: formatDate(event.startDate, locale) },
    { icon: Clock, value: formatTime(event.startDate, locale) },
    event.location ? { icon: MapPin, value: event.location } : null,
    event.organizer ? { icon: Users, value: event.organizer } : null,
  ].filter(Boolean);

  return (
    <article
      className={`flex min-w-0 flex-col overflow-hidden rounded-2xl border border-border bg-card shadow-xs transition-shadow duration-150 hover:shadow-sm ${
        past ? 'opacity-75' : ''
      }`}
    >
      <div className="relative isolate">
        {/*
         * With no uploaded banner the card used to fall back to a flat blue gradient. It now
         * falls back to artwork chosen from the event's own title — a tricolour for Republic
         * Day, a sapling for a plantation drive — so a list of events reads as a list of
         * different occasions. Decorative only: the title below still says what it is.
         */}
        <SafeImage
          src={event.banner || eventArtFor(event.title)}
          alt=""
          loading={featured ? 'eager' : 'lazy'}
          className={`w-full object-cover ${featured ? 'h-44 sm:h-56' : 'h-32'}`}
        />
        <span className="absolute left-3 top-3 rounded-full bg-white px-3 py-1 text-caption font-semibold text-[hsl(var(--brand-ink))] shadow-sm">
          {countdownLabel(event.startDate, t)}
        </span>
      </div>

      <div className="flex min-w-0 flex-1 flex-col gap-2 p-4">
        <h3
          className={`min-w-0 font-semibold text-foreground ${featured ? 'text-title' : 'text-body'}`}
        >
          {event.title}
        </h3>

        <ul className="flex flex-wrap gap-x-4 gap-y-1">
          {meta.map(({ icon: Icon, value }) => (
            <li
              key={value}
              className="inline-flex min-w-0 items-center gap-1.5 text-caption text-muted-foreground"
            >
              <Icon className="h-3.5 w-3.5 shrink-0" aria-hidden="true" />
              <span className="truncate">{value}</span>
            </li>
          ))}
        </ul>

        {featured && event.description ? (
          <p className="line-clamp-2 text-body text-muted-foreground">{event.description}</p>
        ) : null}

        <div className="mt-auto flex flex-wrap gap-2 pt-2">
          <button
            type="button"
            onClick={() => downloadEventIcs(event)}
            className="inline-flex min-h-11 flex-1 items-center justify-center gap-1.5 rounded-lg bg-primary px-3 text-caption font-medium text-primary-foreground transition-colors duration-150 hover:bg-primary-hover"
          >
            <CalendarPlus className="h-4 w-4" aria-hidden="true" />
            {t('home.addToCalendar')}
          </button>
          <button
            type="button"
            onClick={share}
            className="inline-flex min-h-11 flex-1 items-center justify-center gap-1.5 rounded-lg border border-border px-3 text-caption font-medium text-foreground transition-colors duration-150 hover:bg-accent"
          >
            <Share2 className="h-4 w-4" aria-hidden="true" />
            {t('home.share')}
          </button>
        </div>
      </div>
    </article>
  );
}
