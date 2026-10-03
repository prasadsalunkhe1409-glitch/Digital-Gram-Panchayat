import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import toast from 'react-hot-toast';
import { CheckCircle2, Vote } from 'lucide-react';
import { formatDate } from '@dgp/shared';
import { PageHeader } from '@/components/PageHeader';
import { EmptyState } from '@/components/EmptyState';
import { SkeletonList } from '@/components/Skeleton';
import { QueryError } from '@/components/QueryError';
import { cn } from '@/utils/cn';
import { usePolls, useVote } from '../hooks';

/**
 * One poll.
 *
 * Before voting the options are radio buttons and no tallies are shown — the API withholds
 * them, so there is nothing to leak even if the markup wanted to. After voting the same rows
 * become result bars.
 */
function PollCard({ poll }) {
  const { t, i18n } = useTranslation();
  const locale = i18n.language === 'mr' ? 'mr' : 'en';
  const [choice, setChoice] = useState('');
  const vote = useVote();

  const closed = !poll.isOpen;
  const showResults = poll.hasVoted || closed;

  const submit = (e) => {
    e.preventDefault();
    if (!choice) return;
    vote.mutate(
      { pollId: poll.id, optionId: choice },
      {
        onSuccess: () => toast.success(t('poll.thanks')),
        onError: (err) => {
          const code = err?.response?.data?.error?.code;
          // The server is the authority on whether this citizen already voted.
          toast.error(code === 'ALREADY_VOTED' ? t('poll.alreadyVoted') : t('poll.voteFailed'));
        },
      },
    );
  };

  return (
    <article className="min-w-0 rounded-xl border border-border bg-card p-4 shadow-xs">
      <div className="flex flex-wrap items-center gap-2">
        {poll.hasVoted ? (
          <span className="inline-flex items-center gap-1 rounded-full bg-success-subtle px-2.5 py-0.5 text-caption font-medium text-success-strong">
            <CheckCircle2 className="h-3 w-3" aria-hidden="true" />
            {t('poll.voted')}
          </span>
        ) : null}
        {closed ? (
          <span className="rounded-full bg-secondary px-2.5 py-0.5 text-caption font-medium text-secondary-foreground">
            {t('poll.closed')}
          </span>
        ) : null}
        {poll.closesAt && !closed ? (
          <span className="text-caption text-muted-foreground">
            {t('poll.closesOn')} {formatDate(poll.closesAt, locale)}
          </span>
        ) : null}
      </div>

      <h2 className="mt-1.5 text-section text-foreground">{poll.question}</h2>
      {poll.description ? (
        <p className="mt-1 text-body text-muted-foreground">{poll.description}</p>
      ) : null}

      {showResults ? (
        <ul className="mt-3 space-y-2">
          {poll.options.map((o) => (
            <li key={o.id}>
              <div className="flex items-center justify-between gap-2 text-body">
                <span
                  className={cn(
                    'min-w-0 truncate',
                    o.id === poll.votedOptionId ? 'font-medium text-foreground' : 'text-foreground',
                  )}
                >
                  {o.text}
                </span>
                <span className="shrink-0 tabular-nums text-muted-foreground">{o.percent}%</span>
              </div>
              <div className="mt-1 h-2 w-full overflow-hidden rounded-full bg-secondary">
                <div
                  className={cn(
                    'h-full rounded-full transition-[width] duration-500',
                    o.id === poll.votedOptionId ? 'bg-primary' : 'bg-primary/40',
                  )}
                  style={{ width: `${o.percent ?? 0}%` }}
                />
              </div>
            </li>
          ))}
        </ul>
      ) : (
        <form onSubmit={submit} className="mt-3">
          <fieldset className="min-w-0">
            <legend className="sr-only">{poll.question}</legend>
            <ul className="space-y-1.5">
              {poll.options.map((o) => (
                <li key={o.id}>
                  <label className="flex min-h-11 cursor-pointer items-center gap-2.5 rounded-lg border border-border px-3 transition-colors duration-150 hover:bg-accent">
                    <input
                      type="radio"
                      name={`poll-${poll.id}`}
                      value={o.id}
                      checked={choice === o.id}
                      onChange={() => setChoice(o.id)}
                      className="h-4 w-4 shrink-0 accent-[hsl(var(--primary))]"
                    />
                    <span className="min-w-0 flex-1 truncate text-body text-foreground">
                      {o.text}
                    </span>
                  </label>
                </li>
              ))}
            </ul>
          </fieldset>

          <button
            type="submit"
            disabled={!choice || vote.isPending}
            className="mt-3 inline-flex min-h-11 items-center gap-1.5 rounded-lg bg-primary px-4 text-caption font-medium text-primary-foreground transition-colors duration-150 hover:bg-primary-hover disabled:opacity-50"
          >
            <Vote className="h-4 w-4" aria-hidden="true" />
            {t('poll.submit')}
          </button>
          {/* Say so before they vote — the reveal is deliberate, not a bug. */}
          <p className="mt-2 text-caption text-muted-foreground">{t('poll.resultsAfterVote')}</p>
        </form>
      )}

      {showResults ? (
        <p className="mt-2 text-caption text-muted-foreground">
          {t('poll.totalVotes', { count: poll.totalVotes ?? 0 })}
        </p>
      ) : null}
    </article>
  );
}

export function Polls() {
  const { t } = useTranslation();
  const { data, isLoading, isError, refetch } = usePolls();
  const rows = data?.data ?? [];

  return (
    <div className="dgp-page">
      <PageHeader backTo="/" title={t('poll.title')} subtitle={t('poll.intro')} />

      {isLoading ? (
        <SkeletonList count={2} />
      ) : isError ? (
        <QueryError message={t('poll.loadError')} onRetry={refetch} />
      ) : rows.length ? (
        <div className="grid gap-3">
          {rows.map((p) => (
            <PollCard key={p.id} poll={p} />
          ))}
        </div>
      ) : (
        <EmptyState icon={Vote} title={t('poll.empty')} description={t('poll.emptyHint')} />
      )}
    </div>
  );
}
