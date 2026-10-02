import { useState } from 'react';
import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { Inbox } from 'lucide-react';
import { COMPLAINT_CATEGORIES, COMPLAINT_STATUSES, formatDate } from '@dgp/shared';
import { StatusBadge } from '@/components/StatusBadge';
import { Select } from '@/components/ui/input';
import { SkeletonRows } from '@/components/Skeleton';
import { QueryError } from '@/components/QueryError';
import { EmptyState } from '@/components/EmptyState';
import { FilterBar, SearchInput } from '@/components/FilterBar';
import { WardFilter } from '@/components/WardFilter';
import { Pagination } from '@/components/Pagination';
import {
  TableShell,
  Table,
  THead,
  TBody,
  TR,
  TH,
  TD,
  SortableTH,
  TableMessageRow,
} from '@/components/ui/table';
import { useComplaints } from './hooks';

const LIMIT = 20;
const COLS = 5;

export function ComplaintsList() {
  const { t, i18n } = useTranslation();
  const locale = i18n.language === 'mr' ? 'mr' : 'en';

  const [q, setQ] = useState('');
  const [status, setStatus] = useState('');
  const [category, setCategory] = useState('');
  const [ward, setWard] = useState('');
  const [sortBy, setSortBy] = useState('createdAt');
  const [sortDir, setSortDir] = useState('desc');
  const [page, setPage] = useState(1);

  const params = {
    page,
    limit: LIMIT,
    sortBy,
    sortDir,
    ...(q ? { q } : {}),
    ...(status ? { status } : {}),
    ...(category ? { category } : {}),
    ...(ward ? { ward } : {}),
  };
  const { data, isLoading, isError, refetch, isFetching } = useComplaints(params);

  const rows = data?.data ?? [];
  const total = data?.total ?? 0;
  const totalPages = Math.max(1, Math.ceil(total / LIMIT));
  const filtered = Boolean(q || status || category);

  const toggleSort = (field) => {
    if (sortBy === field) {
      setSortDir((d) => (d === 'asc' ? 'desc' : 'asc'));
    } else {
      setSortBy(field);
      setSortDir('desc');
    }
    setPage(1);
  };

  /** Sort state for one column, in the shape SortableTH expects. */
  const sortOf = (field) => (sortBy === field ? sortDir : false);

  const resetPageAnd = (setter) => (value) => {
    setter(value);
    setPage(1);
  };

  const clearFilters = () => {
    setQ('');
    setStatus('');
    setCategory('');
    setWard('');
    setPage(1);
  };

  return (
    <div>
      <h1 className="mb-4 text-title text-foreground">{t('complaint.list.title')}</h1>

      <FilterBar>
        <SearchInput
          value={q}
          onChange={resetPageAnd(setQ)}
          placeholder={t('complaint.list.search')}
        />
        <Select
          value={status}
          onChange={(e) => resetPageAnd(setStatus)(e.target.value)}
          aria-label={t('complaint.list.allStatuses')}
          className="w-auto"
        >
          <option value="">{t('complaint.list.allStatuses')}</option>
          {COMPLAINT_STATUSES.map((s) => (
            <option key={s} value={s}>
              {t(`complaint.status.${s}`, s)}
            </option>
          ))}
        </Select>
        <Select
          value={category}
          onChange={(e) => resetPageAnd(setCategory)(e.target.value)}
          aria-label={t('complaint.list.allCategories')}
          className="w-auto"
        >
          <option value="">{t('complaint.list.allCategories')}</option>
          {COMPLAINT_CATEGORIES.map((c) => (
            <option key={c} value={c}>
              {t(`complaint.category.${c}`, c)}
            </option>
          ))}
        </Select>
        <WardFilter value={ward} onChange={resetPageAnd(setWard)} variant="people" />
      </FilterBar>

      <TableShell className="max-h-[calc(100dvh-16rem)] overflow-y-auto">
        <Table>
          <THead>
            <tr>
              <TH>{t('complaint.list.id')}</TH>
              <TH>{t('complaint.list.subject')}</TH>
              <SortableTH state={sortOf('category')} onToggle={() => toggleSort('category')}>
                {t('complaint.list.category')}
              </SortableTH>
              <SortableTH state={sortOf('status')} onToggle={() => toggleSort('status')}>
                {t('complaint.list.status')}
              </SortableTH>
              <SortableTH state={sortOf('createdAt')} onToggle={() => toggleSort('createdAt')}>
                {t('complaint.list.date')}
              </SortableTH>
            </tr>
          </THead>
          <TBody>
            {isLoading ? (
              <TableMessageRow colSpan={COLS} className="py-4">
                <SkeletonRows />
              </TableMessageRow>
            ) : isError ? (
              <TableMessageRow colSpan={COLS} className="py-4">
                <QueryError
                  message={t('complaint.list.loadError')}
                  onRetry={() => refetch()}
                  isFetching={isFetching}
                />
              </TableMessageRow>
            ) : rows.length === 0 ? (
              <TableMessageRow colSpan={COLS} className="p-0">
                <EmptyState
                  icon={Inbox}
                  title={t('complaint.list.empty')}
                  className="border-0 shadow-none"
                  action={
                    filtered ? (
                      <button
                        type="button"
                        onClick={clearFilters}
                        className="text-body font-medium text-primary transition-colors duration-150 hover:text-primary-hover"
                      >
                        {t('common.clear')}
                      </button>
                    ) : null
                  }
                />
              </TableMessageRow>
            ) : (
              rows.map((c) => (
                <TR key={c.id}>
                  <TD>
                    <Link
                      to={`/complaints/${c.id}`}
                      className="font-medium text-primary transition-colors duration-150 hover:text-primary-hover"
                    >
                      {c.complaintId}
                    </Link>
                  </TD>
                  <TD className="max-w-xs truncate">{c.title}</TD>
                  <TD className="text-muted-foreground">
                    {t(`complaint.category.${c.category}`, c.category)}
                  </TD>
                  <TD>
                    <StatusBadge status={c.status} />
                  </TD>
                  <TD className="whitespace-nowrap text-muted-foreground">
                    {formatDate(c.createdAt, locale)}
                  </TD>
                </TR>
              ))
            )}
          </TBody>
        </Table>
      </TableShell>

      <Pagination
        page={page}
        totalPages={totalPages}
        onPage={setPage}
        totalLabel={t('complaint.list.total', { total })}
      />
    </div>
  );
}
