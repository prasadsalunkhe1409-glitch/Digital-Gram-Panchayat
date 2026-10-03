import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { Paperclip, Radio } from 'lucide-react';
import { formatDate, pickLocale } from '@dgp/shared';

/**
 * A notice in a list.
 *
 * Notices that went out as a broadcast carry a badge — that's the strongest "the panchayat
 * pushed this to everyone" signal the record actually holds. There is no pinned flag on the
 * notice model, so genuine pinning would need a schema field rather than a UI guess.
 *
 * Laid out as a column so a row of these lines up: title and summary take the space they
 * need, and `mt-auto` drops the category and date to the bottom edge whatever the summary
 * does above them. Nothing is truncated to achieve it — the grid stretches every card in a
 * row to the tallest, and this card distributes that height rather than cropping to fit.
 */
export function NoticeCard({ notice }) {
  const { t, i18n } = useTranslation();
  const locale = i18n.language === 'mr' ? 'mr' : 'en';
  const title = pickLocale(notice.i18n, 'title', locale, notice.title);
  const summary = pickLocale(notice.i18n, 'summary', locale, notice.summary);
  const broadcast = Boolean(notice.broadcast?.dispatchedAt);

  return (
    <Link
      to={`/notices/${notice.id}`}
      className="flex h-full flex-col rounded-xl border border-border bg-card p-4 shadow-xs transition-[box-shadow,border-color,transform] duration-150 hover:border-primary/30 hover:shadow-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background active:translate-y-px"
    >
      <div className="flex items-start justify-between gap-2">
        <p className="min-w-0 flex-1 text-body font-semibold text-primary">{title}</p>
        {notice.attachmentUrl ? (
          <Paperclip
            className="h-4 w-4 shrink-0 text-muted-foreground"
            aria-label={t('notice.detail.attachment')}
          />
        ) : null}
      </div>

      {summary ? (
        <p className="mt-1 line-clamp-3 text-caption leading-snug text-muted-foreground">
          {summary}
        </p>
      ) : null}

      {/* Pinned to the bottom so the metadata line of every card in a row shares a baseline. */}
      <div className="mt-auto flex flex-wrap items-center gap-2 pt-3">
        <span className="inline-flex items-center rounded-full bg-primary-subtle px-2.5 py-0.5 text-caption font-medium text-primary ring-1 ring-inset ring-primary/15">
          {t(`notice.category.${notice.category}`, notice.category)}
        </span>
        {broadcast ? (
          <span className="inline-flex items-center gap-1 rounded-full bg-secondary px-2.5 py-0.5 text-caption font-medium text-secondary-foreground ring-1 ring-inset ring-border">
            <Radio className="h-3 w-3" aria-hidden="true" />
            {t('notice.broadcast')}
          </span>
        ) : null}
        <span className="text-caption text-muted-foreground">
          {formatDate(notice.publishDate || notice.createdAt, locale)}
        </span>
      </div>
    </Link>
  );
}
