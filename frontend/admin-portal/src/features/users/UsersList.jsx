import { useState } from 'react';
import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { Users } from 'lucide-react';
import { formatDate } from '@dgp/shared';
import { Select } from '@/components/ui/input';
import { SkeletonRows } from '@/components/Skeleton';
import { EmptyState } from '@/components/EmptyState';
import { FilterBar, SearchInput } from '@/components/FilterBar';
import { WardFilter } from '@/components/WardFilter';
import { WardCell } from './WardCell';
import { AdminAccounts } from './AdminAccounts';
import { Pagination } from '@/components/Pagination';
import {
  TableShell,
  Table,
  THead,
  TBody,
  TR,
  TH,
  TD,
  TableMessageRow,
} from '@/components/ui/table';
import { useUsers } from './hooks';

const LIMIT = 20;
const COLS = 6; // name, mobile, village, ward, joined, status

export function UsersList() {
  const { t, i18n } = useTranslation();
  const locale = i18n.language === 'mr' ? 'mr' : 'en';
  const [q, setQ] = useState('');
  const [status, setStatus] = useState('');
  const [ward, setWard] = useState('');
  const [page, setPage] = useState(1);

  // Sent to the API, not applied to the page it returns: the list is server-paginated,
  // so filtering in the browser would only filter the slice already on screen.
  const params = {
    page,
    limit: LIMIT,
    ...(q ? { q } : {}),
    ...(status ? { status } : {}),
    ...(ward ? { ward } : {}),
  };
  const { data, isLoading, isError } = useUsers(params);
  const rows = data?.data ?? [];
  const total = data?.total ?? 0;
  const totalPages = Math.max(1, Math.ceil(total / LIMIT));

  const onFilter = (setter) => (v) => {
    setter(v);
    setPage(1);
  };

  return (
    <div>
      <h1 className="mb-4 text-title text-foreground">{t('users.title')}</h1>

      <FilterBar>
        <SearchInput value={q} onChange={onFilter(setQ)} placeholder={t('users.search')} />
        <Select
          value={status}
          onChange={(e) => onFilter(setStatus)(e.target.value)}
          aria-label={t('users.allStatuses')}
          className="w-auto"
        >
          <option value="">{t('users.allStatuses')}</option>
          <option value="active">{t('users.active')}</option>
          <option value="inactive">{t('users.inactive')}</option>
        </Select>
        <WardFilter value={ward} onChange={onFilter(setWard)} variant="people" />
      </FilterBar>

      <TableShell className="max-h-[calc(100dvh-16rem)] overflow-y-auto">
        <Table>
          <THead>
            <tr>
              <TH>{t('users.name')}</TH>
              <TH>{t('users.mobile')}</TH>
              <TH>{t('users.village')}</TH>
              <TH>{t('ward.label')}</TH>
              <TH>{t('users.joined')}</TH>
              <TH>{t('users.status')}</TH>
            </tr>
          </THead>
          <TBody>
            {isLoading ? (
              <TableMessageRow colSpan={COLS} className="py-4">
                <SkeletonRows />
              </TableMessageRow>
            ) : isError ? (
              <TableMessageRow colSpan={COLS} className="text-destructive-strong">
                {t('users.loadError')}
              </TableMessageRow>
            ) : rows.length === 0 ? (
              <TableMessageRow colSpan={COLS} className="p-0">
                <EmptyState
                  icon={Users}
                  title={t('users.empty')}
                  className="border-0 shadow-none"
                />
              </TableMessageRow>
            ) : (
              rows.map((u) => (
                <TR key={u.id}>
                  <TD>
                    <Link
                      to={`/users/${u.id}`}
                      className="font-medium text-primary transition-colors duration-150 hover:text-primary-hover"
                    >
                      {u.fullName}
                    </Link>
                  </TD>
                  <TD className="text-muted-foreground">{u.mobile || '—'}</TD>
                  <TD className="text-muted-foreground">{u.village || '—'}</TD>
                  <TD>
                    <WardCell user={u} />
                  </TD>
                  <TD className="whitespace-nowrap text-muted-foreground">
                    {formatDate(u.createdAt, locale)}
                  </TD>
                  <TD>
                    <span
                      className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-caption font-medium ring-1 ring-inset ${
                        u.isActive
                          ? 'bg-success-subtle text-success-strong ring-success/20'
                          : 'bg-muted text-body-foreground ring-border'
                      }`}
                    >
                      {u.isActive ? t('users.active') : t('users.inactive')}
                    </span>
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
        totalLabel={t('users.total', { total })}
      />
      {/* Root-admin only; renders nothing for an ordinary officer. */}
      <AdminAccounts />
    </div>
  );
}
