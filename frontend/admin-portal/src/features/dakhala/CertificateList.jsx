import { useState } from 'react';
import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { FileText, Plus } from 'lucide-react';
import { CERT_TYPES_ALL, DAKHALA_STATUSES, formatDate } from '@dgp/shared';
import { Select } from '@/components/ui/input';
import { SkeletonRows } from '@/components/Skeleton';
import { EmptyState } from '@/components/EmptyState';
import { Button } from '@/components/ui/button';
import { FilterBar, SearchInput } from '@/components/FilterBar';
import { WardFilter } from '@/components/WardFilter';
import { AddCertificateDialog } from './AddCertificateDialog';
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
import { DakhalaStatusBadge } from './DakhalaStatusBadge';
import { useApplications } from './hooks';

const LIMIT = 20;
const COLS = 4;

export function CertificateList() {
  const { t, i18n } = useTranslation();
  const locale = i18n.language === 'mr' ? 'mr' : 'en';
  const [q, setQ] = useState('');
  const [status, setStatus] = useState('');
  const [certificateType, setCertificateType] = useState('');
  const [ward, setWard] = useState('');
  const [addOpen, setAddOpen] = useState(false);
  const [page, setPage] = useState(1);

  // Ward is resolved through the applicant on the server; historical applications carry no
  // ward of their own and are not rewritten to.
  const params = {
    page,
    limit: LIMIT,
    ...(q ? { q } : {}),
    ...(status ? { status } : {}),
    ...(certificateType ? { certificateType } : {}),
    ...(ward ? { ward } : {}),
  };
  const { data, isLoading, isError } = useApplications(params);
  const rows = data?.data ?? [];
  const total = data?.total ?? 0;
  const totalPages = Math.max(1, Math.ceil(total / LIMIT));

  const onFilter = (setter) => (v) => {
    setter(v);
    setPage(1);
  };

  return (
    <div>
      <div className="mb-4 flex flex-wrap items-center justify-between gap-2">
        <h1 className="text-title text-foreground">{t('dakhala.dash.title')}</h1>
        <Button onClick={() => setAddOpen(true)}>
          <Plus className="h-4 w-4" aria-hidden="true" />
          {t('dakhala.add.title')}
        </Button>
      </div>

      <FilterBar>
        <SearchInput value={q} onChange={onFilter(setQ)} placeholder={t('dakhala.dash.search')} />
        <WardFilter value={ward} onChange={onFilter(setWard)} variant="people" />
        <Select
          value={status}
          onChange={(e) => onFilter(setStatus)(e.target.value)}
          aria-label={t('dakhala.dash.allStatuses')}
          className="w-auto"
        >
          <option value="">{t('dakhala.dash.allStatuses')}</option>
          {DAKHALA_STATUSES.map((s) => (
            <option key={s} value={s}>
              {t(`dakhala.status.${s}`, s)}
            </option>
          ))}
        </Select>
        <Select
          value={certificateType}
          onChange={(e) => onFilter(setCertificateType)(e.target.value)}
          aria-label={t('dakhala.dash.allTypes')}
          className="w-auto"
        >
          <option value="">{t('dakhala.dash.allTypes')}</option>
          {/* _ALL, not CERT_TYPES: an officer still has to be able to filter the
              Residence applications that were filed before Marriage replaced them. */}
          {CERT_TYPES_ALL.map((c) => (
            <option key={c} value={c}>
              {t(`dakhala.type.${c}`, c)}
            </option>
          ))}
        </Select>
      </FilterBar>

      <TableShell className="max-h-[calc(100dvh-16rem)] overflow-y-auto">
        <Table>
          <THead>
            <tr>
              <TH>{t('dakhala.dash.application')}</TH>
              <TH>{t('dakhala.dash.type')}</TH>
              <TH>{t('dakhala.dash.date')}</TH>
              <TH>{t('dakhala.dash.status')}</TH>
            </tr>
          </THead>
          <TBody>
            {isLoading ? (
              <TableMessageRow colSpan={COLS} className="py-4">
                <SkeletonRows />
              </TableMessageRow>
            ) : isError ? (
              <TableMessageRow colSpan={COLS} className="text-destructive-strong">
                {t('dakhala.dash.loadError')}
              </TableMessageRow>
            ) : rows.length === 0 ? (
              <TableMessageRow colSpan={COLS} className="p-0">
                <EmptyState
                  icon={FileText}
                  title={t('dakhala.dash.empty')}
                  className="border-0 shadow-none"
                />
              </TableMessageRow>
            ) : (
              rows.map((a) => (
                <TR key={a.id}>
                  <TD>
                    <Link
                      to={`/dakhala/${a.id}`}
                      className="font-medium text-primary transition-colors duration-150 hover:text-primary-hover"
                    >
                      {a.applicationId}
                    </Link>
                  </TD>
                  <TD>{t(`dakhala.type.${a.certificateType}`, a.certificateType)}</TD>
                  <TD className="whitespace-nowrap text-muted-foreground">
                    {formatDate(a.createdAt, locale)}
                  </TD>
                  <TD>
                    <DakhalaStatusBadge status={a.status} />
                  </TD>
                </TR>
              ))
            )}
          </TBody>
        </Table>
      </TableShell>

      <AddCertificateDialog open={addOpen} onClose={() => setAddOpen(false)} />

      <Pagination
        page={page}
        totalPages={totalPages}
        onPage={setPage}
        totalLabel={t('dakhala.dash.total', { total })}
      />
    </div>
  );
}
