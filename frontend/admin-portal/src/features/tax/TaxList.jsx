import { useState } from 'react';
import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { Plus, Receipt } from 'lucide-react';
import { TAX_TYPES, PAYMENT_STATUSES, formatCurrency } from '@dgp/shared';
import { Button } from '@/components/ui/button';
import { Select } from '@/components/ui/input';
import { SkeletonRows } from '@/components/Skeleton';
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
  TableMessageRow,
} from '@/components/ui/table';
import { PaymentStatusBadge } from './PaymentStatusBadge';
import { useTaxRecords } from './hooks';

const LIMIT = 20;
/**
 * A record raised from a scanned bill carries no assessed total. Nothing here may render
 * that as a rupee figure — ₹0 tells the citizen and the officer the demand is settled.
 */
const unknownAmount = (r) => r.amount === null || r.amount === undefined;

const COLS = 6;

export function TaxList() {
  const { t, i18n } = useTranslation();
  const locale = i18n.language === 'mr' ? 'mr' : 'en';
  const [q, setQ] = useState('');
  const [taxType, setTaxType] = useState('');
  const [paymentStatus, setPaymentStatus] = useState('');
  const [ward, setWard] = useState('');
  const [page, setPage] = useState(1);

  /*
   * Every filter goes to the API. `q` matches the record's own identifiers or the citizen's
   * name, and `ward` is resolved through the citizen — neither is something the browser can
   * do, because the list is server-paginated and the name and ward live on another document.
   */
  const params = {
    page,
    limit: LIMIT,
    ...(q ? { q } : {}),
    ...(taxType ? { taxType } : {}),
    ...(paymentStatus ? { paymentStatus } : {}),
    ...(ward ? { ward } : {}),
  };
  const { data, isLoading, isError } = useTaxRecords(params);
  const rows = data?.data ?? [];
  const total = data?.total ?? 0;
  const totalPages = Math.max(1, Math.ceil(total / LIMIT));

  const onFilter = (setter) => (v) => {
    setter(v);
    setPage(1);
  };

  return (
    <div>
      <div className="mb-4 flex items-center justify-between gap-2">
        <h1 className="text-title text-foreground">{t('tax.dash.title')}</h1>
        <Button asChild size="sm">
          <Link to="/tax/new">
            <Plus className="h-4 w-4" aria-hidden="true" />
            {t('tax.dash.new')}
          </Link>
        </Button>
      </div>

      <FilterBar>
        <SearchInput value={q} onChange={onFilter(setQ)} placeholder={t('tax.dash.search')} />
        <WardFilter value={ward} onChange={onFilter(setWard)} variant="people" />
        <Select
          value={taxType}
          onChange={(e) => onFilter(setTaxType)(e.target.value)}
          aria-label={t('tax.dash.allTypes')}
          className="w-auto"
        >
          <option value="">{t('tax.dash.allTypes')}</option>
          {TAX_TYPES.map((tp) => (
            <option key={tp} value={tp}>
              {t(`tax.type.${tp}`, tp)}
            </option>
          ))}
        </Select>
        <Select
          value={paymentStatus}
          onChange={(e) => onFilter(setPaymentStatus)(e.target.value)}
          aria-label={t('tax.dash.allStatuses')}
          className="w-auto"
        >
          <option value="">{t('tax.dash.allStatuses')}</option>
          {PAYMENT_STATUSES.map((s) => (
            <option key={s} value={s}>
              {t(`tax.status.${s}`, s)}
            </option>
          ))}
        </Select>
      </FilterBar>

      <TableShell className="max-h-[calc(100dvh-16rem)] overflow-y-auto">
        <Table>
          <THead>
            <tr>
              <TH>{t('tax.dash.record')}</TH>
              <TH>{t('tax.dash.type')}</TH>
              <TH>{t('tax.dash.year')}</TH>
              <TH className="text-right">{t('tax.dash.amount')}</TH>
              <TH className="text-right">{t('tax.dash.dues')}</TH>
              <TH>{t('tax.dash.status')}</TH>
            </tr>
          </THead>
          <TBody>
            {isLoading ? (
              <TableMessageRow colSpan={COLS} className="py-4">
                <SkeletonRows />
              </TableMessageRow>
            ) : isError ? (
              <TableMessageRow colSpan={COLS} className="text-destructive-strong">
                {t('tax.dash.loadError')}
              </TableMessageRow>
            ) : rows.length === 0 ? (
              <TableMessageRow colSpan={COLS} className="p-0">
                <EmptyState
                  icon={Receipt}
                  title={t('tax.dash.empty')}
                  className="border-0 shadow-none"
                />
              </TableMessageRow>
            ) : (
              rows.map((r) => (
                <TR key={r.id}>
                  <TD>
                    <Link
                      to={`/tax/${r.id}`}
                      className="font-medium text-primary transition-colors duration-150 hover:text-primary-hover"
                    >
                      {r.taxRecordId}
                    </Link>
                    <p className="text-caption text-muted-foreground">{r.propertyNumber}</p>
                  </TD>
                  <TD>{t(`tax.type.${r.taxType}`, r.taxType)}</TD>
                  <TD className="whitespace-nowrap text-muted-foreground">{r.financialYear}</TD>
                  <TD className="text-right tabular-nums">
                    {unknownAmount(r) ? t('tax.card.viewBill') : formatCurrency(r.amount, locale)}
                  </TD>
                  <TD
                    className={`text-right font-medium tabular-nums ${
                      r.balance > 0 && !unknownAmount(r)
                        ? 'text-destructive-strong'
                        : 'text-muted-foreground'
                    }`}
                  >
                    {/* An unknown total has no dues figure. ₹0 here would read as "nothing owed". */}
                    {unknownAmount(r) ? '—' : formatCurrency(r.balance, locale)}
                  </TD>
                  <TD>
                    <PaymentStatusBadge status={r.paymentStatus} />
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
        totalLabel={t('tax.dash.total', { total })}
      />
    </div>
  );
}
