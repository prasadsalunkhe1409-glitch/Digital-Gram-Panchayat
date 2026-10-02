import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import toast from 'react-hot-toast';
import { Plus, Trash2, Pencil } from 'lucide-react';
import { TIMETABLE_SERVICES, TIMETABLE_DAYS } from '@dgp/shared';
import { Button } from '@/components/ui/button';
import { Field } from '@/components/ui/field';
import { controlClass } from '@/components/ui/input';
import { Dialog } from '@/components/ui/dialog';
import { QueryError } from '@/components/QueryError';
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
import { cn } from '@/utils/cn';
import { useAdminTimetable, useTimetableMutations } from './hooks';

const EMPTY = {
  serviceType: 'Ghantagadi',
  title: '',
  titleMr: '',
  area: '',
  areaMr: '',
  day: 'Daily',
  startTime: '',
  endTime: '',
  note: '',
  noteMr: '',
  displayOrder: 0,
  isPublished: false,
};

const COLS = 6;

/**
 * Ghantagadi and water-supply schedules.
 *
 * One dialog serves create and edit: the fields are identical, and two near-identical forms
 * is how one of them drifts. `editing` holds the row's id when the dialog was opened from a
 * row, and is null when it was opened from the Add button.
 */
export function TimetableAdmin() {
  const { t } = useTranslation();
  const { data, isLoading, isError, refetch } = useAdminTimetable();
  const { create, update, remove } = useTimetableMutations();

  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState(null);
  const [values, setValues] = useState(EMPTY);

  const rows = data?.data ?? [];

  const set = (key) => (e) =>
    setValues((v) => ({
      ...v,
      [key]: e.target.type === 'checkbox' ? e.target.checked : e.target.value,
    }));

  const openNew = () => {
    setEditing(null);
    setValues(EMPTY);
    setOpen(true);
  };

  const openEdit = (row) => {
    setEditing(row.id);
    setValues({ ...EMPTY, ...row });
    setOpen(true);
  };

  const submit = (e) => {
    e.preventDefault();
    const payload = { ...values, displayOrder: Number(values.displayOrder) || 0 };
    const done = {
      onSuccess: () => {
        toast.success(t('timetable.saved'));
        setOpen(false);
        setEditing(null);
        setValues(EMPTY);
      },
      onError: (err) =>
        toast.error(err.response?.data?.error?.message || t('timetable.saveFailed')),
    };
    if (editing) update.mutate({ id: editing, values: payload }, done);
    else create.mutate(payload, done);
  };

  const togglePublish = (row) =>
    update.mutate(
      { id: row.id, values: { isPublished: !row.isPublished } },
      { onError: () => toast.error(t('timetable.saveFailed')) },
    );

  const destroy = (row) => {
    if (!window.confirm(t('timetable.confirmDelete'))) return;
    remove.mutate(row.id, {
      onSuccess: () => toast.success(t('timetable.deleted')),
      onError: () => toast.error(t('timetable.deleteFailed')),
    });
  };

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="min-w-0">
          <h1 className="text-title text-foreground">{t('timetable.title')}</h1>
          <p className="mt-0.5 text-caption text-muted-foreground">{t('timetable.subtitle')}</p>
        </div>
        <Button onClick={openNew}>
          <Plus className="h-4 w-4" />
          {t('timetable.new')}
        </Button>
      </div>

      <TableShell>
        <Table>
          <THead>
            <TR>
              <TH>{t('timetable.field.serviceType')}</TH>
              <TH>{t('timetable.field.title')}</TH>
              <TH>{t('timetable.field.day')}</TH>
              <TH>{t('timetable.field.startTime')}</TH>
              <TH>{t('timetable.field.isPublished')}</TH>
              <TH>{t('gov.actions')}</TH>
            </TR>
          </THead>
          <TBody>
            {isLoading ? (
              <TableMessageRow colSpan={COLS}>{t('common.loading')}</TableMessageRow>
            ) : isError ? (
              // A failed load must not read as "nothing here yet" — a different fact.
              <TableMessageRow colSpan={COLS}>
                <QueryError message={t('timetable.loadError')} onRetry={refetch} />
              </TableMessageRow>
            ) : rows.length ? (
              rows.map((r) => (
                <TR key={r.id}>
                  <TD className="whitespace-nowrap">{t(`timetable.service.${r.serviceType}`)}</TD>
                  <TD>
                    <span className="block">{r.title}</span>
                    {r.area ? (
                      <span className="block text-caption text-muted-foreground">{r.area}</span>
                    ) : null}
                  </TD>
                  <TD className="whitespace-nowrap">{t(`timetable.day.${r.day}`, r.day)}</TD>
                  <TD className="whitespace-nowrap tabular-nums">
                    {r.endTime ? `${r.startTime} – ${r.endTime}` : r.startTime}
                  </TD>
                  <TD>
                    <button
                      type="button"
                      onClick={() => togglePublish(r)}
                      aria-label={r.isPublished ? t('timetable.unpublish') : t('timetable.publish')}
                      className={cn(
                        'rounded-full px-2.5 py-0.5 text-caption font-medium',
                        r.isPublished
                          ? 'bg-success-subtle text-success-strong'
                          : 'bg-secondary text-secondary-foreground',
                      )}
                    >
                      {r.isPublished ? t('timetable.published') : t('timetable.draft')}
                    </button>
                  </TD>
                  <TD>
                    <div className="flex gap-1">
                      <Button
                        variant="ghost"
                        size="icon"
                        aria-label={t('timetable.edit')}
                        onClick={() => openEdit(r)}
                      >
                        <Pencil className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        aria-label={t('gov.remove')}
                        onClick={() => destroy(r)}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </TD>
                </TR>
              ))
            ) : (
              <TableMessageRow colSpan={COLS}>{t('timetable.empty')}</TableMessageRow>
            )}
          </TBody>
        </Table>
      </TableShell>

      <Dialog
        open={open}
        onClose={() => setOpen(false)}
        title={editing ? t('timetable.edit') : t('timetable.new')}
        className="max-w-lg"
        footer={
          <>
            <Button variant="outline" onClick={() => setOpen(false)}>
              {t('common.close')}
            </Button>
            <Button
              type="submit"
              form="timetable-form"
              loading={create.isPending || update.isPending}
            >
              {t('common.save')}
            </Button>
          </>
        }
      >
        <form id="timetable-form" onSubmit={submit} className="space-y-3">
          <div className="grid grid-cols-2 gap-3">
            <Field label={t('timetable.field.serviceType')}>
              {({ id }) => (
                <select
                  id={id}
                  className={controlClass}
                  value={values.serviceType}
                  onChange={set('serviceType')}
                >
                  {TIMETABLE_SERVICES.map((s) => (
                    <option key={s} value={s}>
                      {t(`timetable.service.${s}`)}
                    </option>
                  ))}
                </select>
              )}
            </Field>
            <Field label={t('timetable.field.day')}>
              {({ id }) => (
                <select id={id} className={controlClass} value={values.day} onChange={set('day')}>
                  {TIMETABLE_DAYS.map((d) => (
                    <option key={d} value={d}>
                      {t(`timetable.day.${d}`, d)}
                    </option>
                  ))}
                </select>
              )}
            </Field>
          </div>

          <Field label={t('timetable.field.title')} required>
            {({ id }) => (
              <input
                id={id}
                required
                className={controlClass}
                value={values.title}
                onChange={set('title')}
              />
            )}
          </Field>
          <Field label={t('timetable.field.titleMr')}>
            {({ id }) => (
              <input
                id={id}
                className={controlClass}
                value={values.titleMr}
                onChange={set('titleMr')}
              />
            )}
          </Field>

          <div className="grid grid-cols-2 gap-3">
            <Field label={t('timetable.field.area')}>
              {({ id }) => (
                <input
                  id={id}
                  className={controlClass}
                  value={values.area}
                  onChange={set('area')}
                />
              )}
            </Field>
            <Field label={t('timetable.field.areaMr')}>
              {({ id }) => (
                <input
                  id={id}
                  className={controlClass}
                  value={values.areaMr}
                  onChange={set('areaMr')}
                />
              )}
            </Field>
          </div>

          <div className="grid grid-cols-2 gap-3">
            {/* type="time" gives the officer a picker and submits exactly the "HH:mm" the API
                validates, so a malformed time cannot reach a public page from this screen. */}
            <Field label={t('timetable.field.startTime')} required>
              {({ id }) => (
                <input
                  id={id}
                  type="time"
                  required
                  className={controlClass}
                  value={values.startTime}
                  onChange={set('startTime')}
                />
              )}
            </Field>
            <Field label={t('timetable.field.endTime')}>
              {({ id }) => (
                <input
                  id={id}
                  type="time"
                  className={controlClass}
                  value={values.endTime}
                  onChange={set('endTime')}
                />
              )}
            </Field>
          </div>

          <Field label={t('timetable.field.note')}>
            {({ id }) => (
              <input id={id} className={controlClass} value={values.note} onChange={set('note')} />
            )}
          </Field>
          <Field label={t('timetable.field.noteMr')}>
            {({ id }) => (
              <input
                id={id}
                className={controlClass}
                value={values.noteMr}
                onChange={set('noteMr')}
              />
            )}
          </Field>

          <div className="grid grid-cols-2 items-end gap-3">
            <Field label={t('timetable.field.displayOrder')}>
              {({ id }) => (
                <input
                  id={id}
                  type="number"
                  min="0"
                  className={controlClass}
                  value={values.displayOrder}
                  onChange={set('displayOrder')}
                />
              )}
            </Field>
            <label className="flex min-h-11 items-center gap-2 text-body text-foreground">
              <input
                type="checkbox"
                checked={values.isPublished}
                onChange={set('isPublished')}
                className="h-4 w-4"
              />
              {t('timetable.field.isPublished')}
            </label>
          </div>
        </form>
      </Dialog>
    </div>
  );
}
