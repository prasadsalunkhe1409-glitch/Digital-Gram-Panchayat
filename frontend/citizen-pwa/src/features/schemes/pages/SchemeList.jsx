import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { ModuleHeader } from '@/components/ModuleHeader';
import { SchemeMotif } from '@/components/ModuleArt';
import { Search, X } from 'lucide-react';
import { SCHEME_CATEGORIES } from '@dgp/shared';
import { SkeletonList } from '@/components/Skeleton';
import { QueryError } from '@/components/QueryError';
import { EmptyState } from '@/components/EmptyState';
import { NoSchemesArt } from '@/components/Illustration';
import { Button } from '@/components/ui/button';
import { Input, Select } from '@/components/ui/input';
import { SchemeCard } from '../components/SchemeCard';
import { useSchemes } from '../hooks';

export function SchemeList() {
  const { t } = useTranslation();
  const [q, setQ] = useState('');
  const [category, setCategory] = useState('');

  const params = { ...(q ? { q } : {}), ...(category ? { category } : {}) };
  const { data, isLoading, isError, refetch, isFetching } = useSchemes(params);
  const schemes = data?.data ?? [];
  const filtered = Boolean(q || category);

  const clear = () => {
    setQ('');
    setCategory('');
  };

  return (
    <div className="dgp-page-wide">
      <ModuleHeader backTo="/" art={SchemeMotif} title={t('scheme.list.title')} />

      <div className="mb-5 flex flex-col gap-2.5 sm:flex-row sm:items-center">
        <div className="relative sm:max-w-sm sm:flex-1">
          <Search
            className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground"
            aria-hidden="true"
          />
          <Input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder={t('scheme.list.search')}
            aria-label={t('scheme.list.search')}
            className="pl-9 pr-9"
          />
          {q ? (
            <button
              type="button"
              onClick={() => setQ('')}
              aria-label={t('scheme.list.clearFilters')}
              className="absolute right-1 top-1/2 flex h-9 w-9 -translate-y-1/2 items-center justify-center rounded-md text-muted-foreground transition-colors duration-150 hover:text-foreground"
            >
              <X className="h-4 w-4" aria-hidden="true" />
            </button>
          ) : null}
        </div>
        <Select
          value={category}
          onChange={(e) => setCategory(e.target.value)}
          aria-label={t('scheme.list.allCategories')}
          className="sm:w-56"
        >
          <option value="">{t('scheme.list.allCategories')}</option>
          {SCHEME_CATEGORIES.map((c) => (
            <option key={c} value={c}>
              {t(`scheme.category.${c}`, c)}
            </option>
          ))}
        </Select>
      </div>

      {isLoading ? (
        <SkeletonList />
      ) : isError ? (
        <QueryError
          message={t('scheme.list.loadError')}
          onRetry={() => refetch()}
          isFetching={isFetching}
        />
      ) : schemes.length === 0 ? (
        <EmptyState
          art={NoSchemesArt}
          title={filtered ? t('scheme.list.emptyFiltered') : t('scheme.list.empty')}
          action={
            filtered ? (
              <Button variant="outline" size="sm" onClick={clear}>
                {t('scheme.list.clearFilters')}
              </Button>
            ) : null
          }
        />
      ) : (
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {schemes.map((s) => (
            <SchemeCard key={s.id} scheme={s} />
          ))}
        </div>
      )}
    </div>
  );
}
