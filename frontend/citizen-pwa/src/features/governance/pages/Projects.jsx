import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { HardHat, MapPin, User } from 'lucide-react';
import { formatCurrency, formatDate, PROJECT_STATUSES } from '@dgp/shared';
import { PageHeader } from '@/components/PageHeader';
import { EmptyState } from '@/components/EmptyState';
import { NoSchemesArt } from '@/components/Illustration';
import { SkeletonList } from '@/components/Skeleton';
import { QueryError } from '@/components/QueryError';
import { SafeImage } from '@/components/SafeImage';
import { cn } from '@/utils/cn';
import { useProjects, useProjectSummary } from '../hooks';

const STATUS_STYLES = {
  Planned: 'bg-secondary text-secondary-foreground',
  InProgress: 'bg-warning-subtle text-warning-strong',
  Completed: 'bg-success-subtle text-success-strong',
  OnHold: 'bg-destructive-subtle text-destructive-strong',
};

/** A labelled bar. `aria-valuenow` carries the number for anyone not seeing the fill. */
function ProgressBar({ value, label }) {
  return (
    <div
      role="progressbar"
      aria-valuenow={value}
      aria-valuemin={0}
      aria-valuemax={100}
      aria-label={label}
      className="h-2 w-full overflow-hidden rounded-full bg-secondary"
    >
      <div
        className="h-full rounded-full bg-primary transition-[width] duration-500"
        style={{ width: `${value}%` }}
      />
    </div>
  );
}

function ProjectCard({ project }) {
  const { t, i18n } = useTranslation();
  const locale = i18n.language === 'mr' ? 'mr' : 'en';
  const photo = project.photos?.[0]?.url;

  return (
    <article className="flex min-w-0 flex-col overflow-hidden rounded-xl border border-border bg-card shadow-xs">
      {photo ? <SafeImage src={photo} alt="" className="h-36 w-full object-cover" /> : null}

      <div className="flex min-w-0 flex-1 flex-col gap-2 p-4">
        <div className="flex flex-wrap items-center gap-2">
          <span
            className={cn(
              'rounded-full px-2.5 py-0.5 text-caption font-medium',
              STATUS_STYLES[project.status],
            )}
          >
            {t(`project.status.${project.status}`, project.status)}
          </span>
          <span className="text-caption text-muted-foreground">
            {t(`project.category.${project.category}`, project.category)}
          </span>
        </div>

        <h2 className="text-section text-foreground">{project.name}</h2>

        <div className="space-y-1">
          <div className="flex items-center justify-between text-caption text-muted-foreground">
            <span>{t('project.progress')}</span>
            <span className="tabular-nums text-foreground">{project.progress}%</span>
          </div>
          <ProgressBar value={project.progress} label={t('project.progress')} />
        </div>

        {project.budget ? (
          <div className="space-y-1">
            <div className="flex items-center justify-between text-caption text-muted-foreground">
              <span>{t('project.utilisation')}</span>
              <span className="tabular-nums text-foreground">
                {formatCurrency(project.amountSpent, locale)} /{' '}
                {formatCurrency(project.budget, locale)}
              </span>
            </div>
            <ProgressBar value={project.utilisation} label={t('project.utilisation')} />
          </div>
        ) : null}

        <ul className="mt-1 flex flex-wrap gap-x-4 gap-y-1 text-caption text-muted-foreground">
          {project.location ? (
            <li className="inline-flex min-w-0 items-center gap-1.5">
              <MapPin className="h-3.5 w-3.5 shrink-0" aria-hidden="true" />
              <span className="truncate">{project.location}</span>
            </li>
          ) : null}
          {project.contractor ? (
            <li className="inline-flex min-w-0 items-center gap-1.5">
              <HardHat className="h-3.5 w-3.5 shrink-0" aria-hidden="true" />
              <span className="truncate">{project.contractor}</span>
            </li>
          ) : null}
          {project.engineer ? (
            <li className="inline-flex min-w-0 items-center gap-1.5">
              <User className="h-3.5 w-3.5 shrink-0" aria-hidden="true" />
              <span className="truncate">{project.engineer}</span>
            </li>
          ) : null}
          {project.startDate ? <li>{formatDate(project.startDate, locale)}</li> : null}
        </ul>

        {project.milestones?.length ? (
          <ol className="mt-1 space-y-1 border-l border-border pl-3">
            {project.milestones.slice(-3).map((m) => (
              <li key={m.id ?? m.at} className="text-caption text-muted-foreground">
                <span className="text-foreground">{m.label}</span>
                {m.at ? ` · ${formatDate(m.at, locale)}` : ''}
              </li>
            ))}
          </ol>
        ) : null}
      </div>
    </article>
  );
}

/** Village development works, with the money shown as plainly as the progress. */
export function Projects() {
  const { t, i18n } = useTranslation();
  const locale = i18n.language === 'mr' ? 'mr' : 'en';
  const [status, setStatus] = useState('');

  const { data, isLoading, isError, refetch } = useProjects(status ? { status } : undefined);
  const { data: summary } = useProjectSummary();
  const rows = data?.data ?? [];

  return (
    <div className="dgp-page">
      <PageHeader backTo="/" title={t('project.title')} subtitle={t('project.intro')} />

      {summary?.count ? (
        <div className="mb-4 grid grid-cols-2 gap-3 sm:grid-cols-4">
          {[
            { label: t('project.totalWorks'), value: summary.count },
            { label: t('project.completed'), value: summary.completed },
            { label: t('project.sanctioned'), value: formatCurrency(summary.totalBudget, locale) },
            { label: t('project.spent'), value: formatCurrency(summary.totalSpent, locale) },
          ].map((tile) => (
            <div
              key={tile.label}
              className="min-w-0 rounded-xl border border-border bg-card p-3 shadow-xs"
            >
              <p className="truncate text-section tabular-nums text-foreground">{tile.value}</p>
              <p className="truncate text-caption text-muted-foreground">{tile.label}</p>
            </div>
          ))}
        </div>
      ) : null}

      <div className="mb-4 flex flex-wrap gap-2">
        <button
          type="button"
          onClick={() => setStatus('')}
          aria-pressed={status === ''}
          className={cn(
            'inline-flex min-h-9 items-center rounded-full border px-3.5 text-caption font-medium transition-colors duration-150',
            status === ''
              ? 'border-primary bg-primary text-primary-foreground'
              : 'border-border bg-card text-muted-foreground hover:bg-accent',
          )}
        >
          {t('project.allStatuses')}
        </button>
        {PROJECT_STATUSES.map((s) => (
          <button
            key={s}
            type="button"
            onClick={() => setStatus(s)}
            aria-pressed={status === s}
            className={cn(
              'inline-flex min-h-9 items-center rounded-full border px-3.5 text-caption font-medium transition-colors duration-150',
              status === s
                ? 'border-primary bg-primary text-primary-foreground'
                : 'border-border bg-card text-muted-foreground hover:bg-accent',
            )}
          >
            {t(`project.status.${s}`, s)}
          </button>
        ))}
      </div>

      {isLoading ? (
        <SkeletonList count={3} />
      ) : isError ? (
        <QueryError message={t('project.loadError')} onRetry={refetch} />
      ) : rows.length ? (
        <div className="grid gap-3 sm:grid-cols-2">
          {rows.map((p) => (
            <ProjectCard key={p.id} project={p} />
          ))}
        </div>
      ) : (
        <EmptyState
          art={NoSchemesArt}
          title={status ? t('project.emptyFiltered') : t('project.empty')}
        />
      )}
    </div>
  );
}
