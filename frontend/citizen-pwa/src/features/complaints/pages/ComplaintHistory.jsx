import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { ModuleHeader } from '@/components/ModuleHeader';
import { ComplaintMotif } from '@/components/ModuleArt';
import { Plus, ChevronRight } from 'lucide-react';
import { formatDate } from '@dgp/shared';
import { Button } from '@/components/ui/button';
import { StatusBadge } from '@/components/StatusBadge';
import { SkeletonList } from '@/components/Skeleton';
import { QueryError } from '@/components/QueryError';
import { EmptyState } from '@/components/EmptyState';
import { NoComplaintsArt } from '@/components/Illustration';
import { useMyComplaints } from '../hooks';

export function ComplaintHistory() {
  const { t, i18n } = useTranslation();
  const locale = i18n.language === 'mr' ? 'mr' : 'en';
  const { data, isLoading, isError, refetch, isFetching } = useMyComplaints();

  const complaints = data?.data ?? [];

  return (
    <div className="dgp-page-wide">
      <ModuleHeader
        backTo="/"
        art={ComplaintMotif}
        title={t('complaint.history.title')}
        action={
          <Button asChild size="sm">
            <Link to="/complaints/new">
              <Plus className="h-4 w-4" aria-hidden="true" />
              {t('complaint.history.new')}
            </Link>
          </Button>
        }
      />

      {isLoading ? (
        <SkeletonList />
      ) : isError ? (
        <QueryError
          message={t('complaint.history.loadError')}
          onRetry={() => refetch()}
          isFetching={isFetching}
        />
      ) : complaints.length === 0 ? (
        <EmptyState
          art={NoComplaintsArt}
          title={t('complaint.history.empty')}
          action={
            <Button asChild size="sm">
              <Link to="/complaints/new">{t('complaint.history.new')}</Link>
            </Button>
          }
        />
      ) : (
        <ul className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {complaints.map((c) => (
            <li key={c.id}>
              <Link
                to={`/complaints/${c.id}`}
                className="group block h-full rounded-xl border border-border bg-card p-4 shadow-sm transition-[box-shadow,transform] duration-150 hover:-translate-y-0.5 hover:border-primary/30 hover:shadow-md active:translate-y-0"
              >
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0">
                    <p className="truncate text-body font-medium text-foreground">{c.title}</p>
                    <p className="mt-0.5 text-caption text-muted-foreground">{c.complaintId}</p>
                  </div>
                  <StatusBadge status={c.status} />
                </div>
                <div className="mt-2.5 flex items-center justify-between gap-2">
                  <p className="truncate text-caption text-muted-foreground">
                    {t(`complaint.category.${c.category}`, c.category)} ·{' '}
                    {formatDate(c.createdAt, locale)}
                  </p>
                  <ChevronRight
                    className="h-4 w-4 shrink-0 text-muted-foreground transition-transform duration-150 group-hover:translate-x-0.5"
                    aria-hidden="true"
                  />
                </div>
              </Link>
            </li>
          ))}
        </ul>
      )}

      {/* Filing a complaint is the primary job on this screen — keep it reachable with a
          thumb without scrolling back to the top. Sits above the bottom nav. */}
      {complaints.length ? (
        <Link
          to="/complaints/new"
          aria-label={t('complaint.history.new')}
          className="fixed bottom-[calc(4.75rem+env(safe-area-inset-bottom))] right-4 z-30 flex h-14 w-14 items-center justify-center rounded-full bg-primary text-primary-foreground shadow-md transition-[background-color,transform] duration-150 hover:bg-primary-hover active:translate-y-px md:hidden"
        >
          <Plus className="h-6 w-6" aria-hidden="true" />
        </Link>
      ) : null}
    </div>
  );
}
