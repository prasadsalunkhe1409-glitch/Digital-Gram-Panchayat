import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { ModuleHeader } from '@/components/ModuleHeader';
import { CertificateMotif } from '@/components/ModuleArt';
import { Plus, ChevronRight } from 'lucide-react';
import { formatDate } from '@dgp/shared';
import { Button } from '@/components/ui/button';
import { SkeletonList } from '@/components/Skeleton';
import { QueryError } from '@/components/QueryError';
import { EmptyState } from '@/components/EmptyState';
import { NoCertificatesArt } from '@/components/Illustration';
import { DakhalaStatusBadge } from '../components/DakhalaStatusBadge';
import { useMyApplications } from '../hooks';

export function ApplicationList() {
  const { t, i18n } = useTranslation();
  const locale = i18n.language === 'mr' ? 'mr' : 'en';
  const { data, isLoading, isError, refetch, isFetching } = useMyApplications();
  const apps = data?.data ?? [];

  return (
    <div className="dgp-page-wide">
      <ModuleHeader
        backTo="/"
        art={CertificateMotif}
        title={t('dakhala.list.title')}
        action={
          <Button asChild size="sm">
            <Link to="/dakhala/new">
              <Plus className="h-4 w-4" aria-hidden="true" />
              {t('dakhala.list.apply')}
            </Link>
          </Button>
        }
      />

      {isLoading ? (
        <SkeletonList />
      ) : isError ? (
        <QueryError
          message={t('dakhala.list.loadError')}
          onRetry={() => refetch()}
          isFetching={isFetching}
        />
      ) : apps.length === 0 ? (
        <EmptyState
          art={NoCertificatesArt}
          title={t('dakhala.list.empty')}
          action={
            <Button asChild size="sm">
              <Link to="/dakhala/new">{t('dakhala.list.apply')}</Link>
            </Button>
          }
        />
      ) : (
        <ul className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {apps.map((a) => (
            <li key={a.id}>
              <Link
                to={`/dakhala/${a.id}`}
                className="group block h-full rounded-xl border border-border bg-card p-4 shadow-sm transition-[box-shadow,transform] duration-150 hover:-translate-y-0.5 hover:border-primary/30 hover:shadow-md active:translate-y-0"
              >
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0">
                    <p className="truncate text-body font-medium text-foreground">
                      {t(`dakhala.type.${a.certificateType}`, a.certificateType)}
                    </p>
                    <p className="mt-0.5 text-caption text-muted-foreground">{a.applicationId}</p>
                  </div>
                  <DakhalaStatusBadge status={a.status} />
                </div>
                <div className="mt-2.5 flex items-center justify-between gap-2">
                  <p className="text-caption text-muted-foreground">
                    {formatDate(a.createdAt, locale)}
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

      {apps.length ? (
        <Link
          to="/dakhala/new"
          aria-label={t('dakhala.list.apply')}
          className="fixed bottom-[calc(4.75rem+env(safe-area-inset-bottom))] right-4 z-30 flex h-14 w-14 items-center justify-center rounded-full bg-primary text-primary-foreground shadow-md transition-[background-color,transform] duration-150 hover:bg-primary-hover active:translate-y-px md:hidden"
        >
          <Plus className="h-6 w-6" aria-hidden="true" />
        </Link>
      ) : null}
    </div>
  );
}
