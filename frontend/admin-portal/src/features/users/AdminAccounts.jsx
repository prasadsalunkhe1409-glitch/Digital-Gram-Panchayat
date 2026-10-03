import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import toast from 'react-hot-toast';
import { ShieldCheck, UserPlus, Trash2 } from 'lucide-react';
import { formatDate, ROLES, WARDS } from '@dgp/shared';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Dialog } from '@/components/ui/dialog';
import { Field } from '@/components/ui/field';
import { controlClass } from '@/components/ui/input';
import { Chip } from '@/components/ui/chip';
import { SectionHeader } from '@/components/PageHeader';
import { useAuth } from '@/store';
import { useAdminAccounts, useAdminAccountMutations } from './hooks';

const EMPTY = { fullName: '', email: '', password: '', mobile: '', ward: '' };

/**
 * Root-admin management of officer accounts.
 *
 * Rendered on the existing Users screen and only for a root admin — an ordinary officer never
 * sees it, and the API refuses them regardless, so hiding it is a courtesy rather than the
 * control. Nothing here touches the citizen list above it.
 *
 * Removal is deactivation, not deletion: an officer who resolved a complaint or issued a
 * certificate keeps their name on it.
 */
export function AdminAccounts() {
  const { t } = useTranslation();
  const { user } = useAuth();
  const isRoot = user?.role === ROLES.ROOT_ADMIN;

  const [open, setOpen] = useState(false);
  const [form, setForm] = useState(EMPTY);
  const [toDelete, setToDelete] = useState(null);
  const { data: accounts, isLoading } = useAdminAccounts(isRoot);
  const m = useAdminAccountMutations();

  if (!isRoot) return null;

  const set = (k) => (e) => setForm((prev) => ({ ...prev, [k]: e.target.value }));

  const submit = (e) => {
    e.preventDefault();
    const payload = {
      fullName: form.fullName.trim(),
      email: form.email.trim(),
      password: form.password,
      ...(form.mobile ? { mobile: form.mobile.trim() } : {}),
      ...(form.ward ? { ward: form.ward } : {}),
    };
    m.create.mutate(payload, {
      onSuccess: () => {
        toast.success(t('admins.created'));
        setForm(EMPTY);
        setOpen(false);
      },
      onError: (err) => toast.error(err.response?.data?.error?.message || t('admins.failed')),
    });
  };

  const toggle = (account) => {
    const next = account.isActive ? 'inactive' : 'active';
    m.setStatus.mutate(
      { id: account.id, status: next },
      {
        onSuccess: () =>
          toast.success(t(next === 'active' ? 'admins.activated' : 'admins.deactivated')),
        onError: (err) => toast.error(err.response?.data?.error?.message || t('admins.failed')),
      },
    );
  };

  const confirmDelete = () => {
    m.remove.mutate(toDelete.id, {
      onSuccess: () => {
        toast.success(t('admins.deleted'));
        setToDelete(null);
      },
      onError: (err) => {
        // A refusal names what stands in the way, so the officer is told to deactivate
        // instead rather than being left with a generic failure.
        toast.error(err.response?.data?.error?.message || t('admins.failed'));
        setToDelete(null);
      },
    });
  };

  return (
    <section className="mt-8" aria-labelledby="admin-accounts-h">
      <SectionHeader
        id="admin-accounts-h"
        title={t('admins.title')}
        action={
          <Button size="sm" onClick={() => setOpen(true)}>
            <UserPlus className="h-4 w-4" aria-hidden="true" />
            {t('admins.add')}
          </Button>
        }
      />
      <p className="mb-1 text-caption text-muted-foreground">{t('admins.intro')}</p>
      <p className="mb-3 text-caption text-muted-foreground">{t('admins.deactivateHint')}</p>

      <Card>
        <CardContent className="p-0">
          {isLoading ? (
            <p className="p-5 text-body text-muted-foreground">{t('common.loading')}</p>
          ) : (
            <ul className="divide-y divide-border">
              {(accounts ?? []).map((a) => (
                <li key={a.id} className="flex flex-wrap items-center justify-between gap-3 p-4">
                  <div className="min-w-0">
                    <p className="flex items-center gap-2 text-body font-medium text-foreground">
                      <span className="truncate">{a.fullName}</span>
                      {a.role === ROLES.ROOT_ADMIN ? (
                        <Chip color="blue">
                          <ShieldCheck className="mr-1 h-3 w-3" aria-hidden="true" />
                          {t('admins.roleRoot')}
                        </Chip>
                      ) : (
                        <Chip color="grey">{t('admins.roleOfficer')}</Chip>
                      )}
                      <Chip color={a.isActive ? 'green' : 'grey'}>
                        {t(a.isActive ? 'admins.active' : 'admins.inactive')}
                      </Chip>
                    </p>
                    <p className="truncate text-caption text-muted-foreground">
                      {[a.email, a.ward, a.createdAt ? formatDate(a.createdAt) : null]
                        .filter(Boolean)
                        .join(' · ')}
                    </p>
                  </div>

                  {/* A root admin cannot switch themselves off; the API refuses it too. */}
                  {a.id === user?.id ? (
                    <span className="text-caption text-muted-foreground">{t('admins.you')}</span>
                  ) : (
                    <span className="flex items-center gap-1">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => toggle(a)}
                        loading={m.setStatus.isPending}
                      >
                        {t(a.isActive ? 'admins.deactivate' : 'admins.activate')}
                      </Button>
                      {/* Permanent removal is for an account created in error. A root admin
                          is never deletable, and the API refuses it regardless. */}
                      {a.role === ROLES.ROOT_ADMIN ? null : (
                        <Button
                          variant="ghost"
                          size="icon"
                          aria-label={`${t('admins.delete')} — ${a.fullName}`}
                          title={t('admins.delete')}
                          className="text-destructive-strong hover:bg-destructive-subtle"
                          onClick={() => setToDelete(a)}
                        >
                          <Trash2 className="h-4 w-4" aria-hidden="true" />
                        </Button>
                      )}
                    </span>
                  )}
                </li>
              ))}
            </ul>
          )}
        </CardContent>
      </Card>

      <Dialog
        open={open}
        onClose={() => setOpen(false)}
        title={t('admins.add')}
        description={t('admins.addHint')}
        footer={
          <>
            <Button variant="outline" onClick={() => setOpen(false)}>
              {t('common.close')}
            </Button>
            <Button type="submit" form="add-admin-form" loading={m.create.isPending}>
              {t('admins.add')}
            </Button>
          </>
        }
      >
        <form id="add-admin-form" onSubmit={submit} className="space-y-4" noValidate>
          <Field label={t('admins.fullName')} required>
            {({ id }) => (
              <input
                id={id}
                className={controlClass}
                value={form.fullName}
                onChange={set('fullName')}
                required
              />
            )}
          </Field>
          <Field label={t('admins.email')} required>
            {({ id }) => (
              <input
                id={id}
                type="email"
                className={controlClass}
                value={form.email}
                onChange={set('email')}
                required
              />
            )}
          </Field>
          <Field label={t('admins.password')} hint={t('admins.passwordHint')} required>
            {({ id }) => (
              <input
                id={id}
                type="password"
                autoComplete="new-password"
                minLength={8}
                className={controlClass}
                value={form.password}
                onChange={set('password')}
                required
              />
            )}
          </Field>
          <Field label={t('admins.mobile')}>
            {({ id }) => (
              <input
                id={id}
                inputMode="numeric"
                className={controlClass}
                value={form.mobile}
                onChange={set('mobile')}
              />
            )}
          </Field>
          <Field label={t('ward.label')}>
            {({ id }) => (
              <select id={id} className={controlClass} value={form.ward} onChange={set('ward')}>
                <option value="">{t('admins.noWard')}</option>
                {WARDS.map((w) => (
                  <option key={w} value={w}>
                    {t(`ward.names.${w}`, w)}
                  </option>
                ))}
              </select>
            )}
          </Field>
        </form>
      </Dialog>
      <Dialog
        open={Boolean(toDelete)}
        onClose={() => setToDelete(null)}
        title={t('admins.deleteTitle')}
        description={t('admins.deleteBody')}
        footer={
          <>
            <Button variant="outline" onClick={() => setToDelete(null)}>
              {t('admins.deleteCancel')}
            </Button>
            <Button variant="destructive" onClick={confirmDelete} loading={m.remove.isPending}>
              <Trash2 className="h-4 w-4" aria-hidden="true" />
              {t('admins.deleteConfirm')}
            </Button>
          </>
        }
      >
        {toDelete ? (
          <p className="text-body text-foreground">
            {toDelete.fullName} · {toDelete.email}
          </p>
        ) : null}
      </Dialog>
    </section>
  );
}
