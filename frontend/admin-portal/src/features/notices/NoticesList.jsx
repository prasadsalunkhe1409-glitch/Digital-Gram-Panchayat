import { useState } from 'react';
import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { Plus, Megaphone, Pencil, Trash2, Archive } from 'lucide-react';
import { formatDate } from '@dgp/shared';
import toast from 'react-hot-toast';
import { Button } from '@/components/ui/button';
import { Chip } from '@/components/ui/chip';
import { SkeletonRows } from '@/components/Skeleton';
import { EmptyState } from '@/components/EmptyState';
import { FilterBar, SearchInput } from '@/components/FilterBar';
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
import { useNotices, useNoticeMutations } from './hooks';
import { ConfirmDialog } from './ConfirmDialog';

const LIMIT = 20;
const COLS = 5;

export function NoticesList() {
  const { t, i18n } = useTranslation();
  const locale = i18n.language === 'mr' ? 'mr' : 'en';
  const [q, setQ] = useState('');
  const [page, setPage] = useState(1);
  const [toDelete, setToDelete] = useState(null);

  const params = { page, limit: LIMIT, ...(q ? { q } : {}) };
  const { data, isLoading, isError } = useNotices(params);
  const m = useNoticeMutations();

  const rows = data?.data ?? [];
  const total = data?.total ?? 0;
  const totalPages = Math.max(1, Math.ceil(total / LIMIT));

  const togglePublish = async (n) => {
    try {
      if (n.isPublished) await m.archive.mutateAsync(n.id);
      else await m.publish.mutateAsync(n.id);
      toast.success(n.isPublished ? t('notice.toast.archived') : t('notice.toast.published'));
    } catch {
      toast.error(t('notice.toast.actionFailed'));
    }
  };

  const confirmDelete = async () => {
    try {
      await m.remove.mutateAsync(toDelete.id);
      toast.success(t('notice.toast.deleted'));
    } catch {
      toast.error(t('notice.toast.actionFailed'));
    } finally {
      setToDelete(null);
    }
  };

  return (
    <div>
      <div className="mb-4 flex items-center justify-between gap-2">
        <h1 className="text-title text-foreground">{t('notice.dash.title')}</h1>
        <Button asChild size="sm">
          <Link to="/notices/new">
            <Plus className="h-4 w-4" aria-hidden="true" />
            {t('notice.dash.new')}
          </Link>
        </Button>
      </div>

      <FilterBar>
        <SearchInput
          value={q}
          onChange={(v) => {
            setQ(v);
            setPage(1);
          }}
          placeholder={t('notice.dash.search')}
        />
      </FilterBar>

      <TableShell className="max-h-[calc(100dvh-16rem)] overflow-y-auto">
        <Table>
          <THead>
            <tr>
              <TH>{t('notice.dash.notice')}</TH>
              <TH>{t('notice.dash.category')}</TH>
              <TH>{t('notice.dash.state')}</TH>
              <TH>{t('notice.dash.date')}</TH>
              <TH className="text-right">{t('notice.dash.actions')}</TH>
            </tr>
          </THead>
          <TBody>
            {isLoading ? (
              <TableMessageRow colSpan={COLS} className="py-4">
                <SkeletonRows />
              </TableMessageRow>
            ) : isError ? (
              <TableMessageRow colSpan={COLS} className="text-destructive-strong">
                {t('notice.dash.loadError')}
              </TableMessageRow>
            ) : rows.length === 0 ? (
              <TableMessageRow colSpan={COLS} className="p-0">
                <EmptyState
                  icon={Megaphone}
                  title={t('notice.dash.empty')}
                  className="border-0 shadow-none"
                  action={
                    <Button asChild size="sm">
                      <Link to="/notices/new">{t('notice.dash.new')}</Link>
                    </Button>
                  }
                />
              </TableMessageRow>
            ) : (
              rows.map((n) => (
                <TR key={n.id}>
                  <TD>
                    <p className="max-w-xs truncate font-medium text-foreground">{n.title}</p>
                    <p className="text-caption text-muted-foreground">{n.noticeId}</p>
                  </TD>
                  <TD>{t(`notice.category.${n.category}`, n.category)}</TD>
                  <TD>
                    <Chip color={n.isPublished ? 'green' : 'grey'}>
                      {n.isPublished ? t('notice.state.published') : t('notice.state.draft')}
                    </Chip>
                  </TD>
                  <TD className="whitespace-nowrap text-muted-foreground">
                    {formatDate(n.createdAt, locale)}
                  </TD>
                  <TD>
                    <div className="flex items-center justify-end gap-0.5">
                      <Button
                        asChild
                        variant="ghost"
                        size="icon"
                        aria-label={t('notice.dash.edit')}
                        title={t('notice.dash.edit')}
                      >
                        <Link to={`/notices/${n.id}/edit`}>
                          <Pencil className="h-4 w-4" aria-hidden="true" />
                        </Link>
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        aria-label={
                          n.isPublished ? t('notice.dash.archive') : t('notice.dash.publish')
                        }
                        title={n.isPublished ? t('notice.dash.archive') : t('notice.dash.publish')}
                        onClick={() => togglePublish(n)}
                      >
                        <Archive className="h-4 w-4" aria-hidden="true" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        aria-label={t('notice.dash.delete')}
                        title={t('notice.dash.delete')}
                        onClick={() => setToDelete(n)}
                      >
                        <Trash2 className="h-4 w-4 text-destructive" aria-hidden="true" />
                      </Button>
                    </div>
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
        totalLabel={t('notice.dash.total', { total })}
      />

      <ConfirmDialog
        open={Boolean(toDelete)}
        title={t('notice.delete.title')}
        message={t('notice.delete.message', { title: toDelete?.title })}
        confirmLabel={t('notice.dash.delete')}
        danger
        onConfirm={confirmDelete}
        onCancel={() => setToDelete(null)}
      />

      <div className="mt-6 flex items-center gap-2 text-caption text-muted-foreground">
        <Megaphone className="h-4 w-4" aria-hidden="true" />
        {t('notice.dash.hint')}
      </div>
    </div>
  );
}
