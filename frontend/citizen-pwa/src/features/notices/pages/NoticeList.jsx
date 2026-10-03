import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { ModuleHeader } from '@/components/ModuleHeader';
import { NoticeMotif } from '@/components/ModuleArt';
import { Search, X } from 'lucide-react';
import { NOTICE_CATEGORIES } from '@dgp/shared';
import { SkeletonList } from '@/components/Skeleton';
import { QueryError } from '@/components/QueryError';
import { EmptyState } from '@/components/EmptyState';
import { NoNoticesArt } from '@/components/Illustration';
import { Button } from '@/components/ui/button';
import { Input, Select } from '@/components/ui/input';
import { NoticeCard } from '../components/NoticeCard';
import { useNotices } from '../hooks';

export function NoticeList() {
  const { t } = useTranslation();
  const [q, setQ] = useState('');
  const [category, setCategory] = useState('');

  const params = { ...(q ? { q } : {}), ...(category ? { category } : {}) };
  const { data, isLoading, isError, refetch, isFetching } = useNotices(params);
  const notices = data?.data ?? [];
  const filtered = Boolean(q || category);

  const clear = () => {
    setQ('');
    setCategory('');
  };

  return (
    <div className="dgp-page-wide">
      <ModuleHeader backTo="/" art={NoticeMotif} title={t('notice.list.title')} />

      <div className="mb-5 flex flex-col gap-2.5 sm:flex-row sm:items-center">
        <div className="relative sm:max-w-sm sm:flex-1">
          <Search
            className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground"
            aria-hidden="true"
          />
          <Input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder={t('notice.list.search')}
            aria-label={t('notice.list.search')}
            className="pl-9 pr-9"
          />
          {q ? (
            <button
              type="button"
              onClick={() => setQ('')}
              aria-label={t('notice.list.clearFilters')}
              className="absolute right-1 top-1/2 flex h-9 w-9 -translate-y-1/2 items-center justify-center rounded-md text-muted-foreground transition-colors duration-150 hover:text-foreground"
            >
              <X className="h-4 w-4" aria-hidden="true" />
            </button>
          ) : null}
        </div>
        <Select
          value={category}
          onChange={(e) => setCategory(e.target.value)}
          aria-label={t('notice.list.allCategories')}
          className="sm:w-56"
        >
          <option value="">{t('notice.list.allCategories')}</option>
          {NOTICE_CATEGORIES.map((c) => (
            <option key={c} value={c}>
              {t(`notice.category.${c}`, c)}
            </option>
          ))}
        </Select>
      </div>

      {isLoading ? (
        <SkeletonList />
      ) : isError ? (
        <QueryError
          message={t('notice.list.loadError')}
          onRetry={() => refetch()}
          isFetching={isFetching}
        />
      ) : notices.length === 0 ? (
        <EmptyState
          art={NoNoticesArt}
          title={filtered ? t('notice.list.emptyFiltered') : t('notice.list.empty')}
          action={
            filtered ? (
              <Button variant="outline" size="sm" onClick={clear}>
                {t('notice.list.clearFilters')}
              </Button>
            ) : null
          }
        />
      ) : (
        <ul className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {notices.map((n) => (
            <li key={n.id}>
              <NoticeCard notice={n} />
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
