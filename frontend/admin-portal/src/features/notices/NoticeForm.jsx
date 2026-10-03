import { useEffect, useState } from 'react';
import { useForm } from 'react-hook-form';
import { useNavigate, useParams } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { Paperclip } from 'lucide-react';
import toast from 'react-hot-toast';
import { NOTICE_CATEGORIES, SMS_SUMMARY_MAX_LENGTH } from '@dgp/shared';
import { Button } from '@/components/ui/button';
import { BackButton } from '@/components/BackButton';
import { controlClass } from '@/components/ui/input';
import { Field } from '@/components/ui/field';
import { cn } from '@/utils/cn';
import { useNotice, useNoticeMutations } from './hooks';

export function NoticeForm() {
  const { id } = useParams();
  const isEdit = Boolean(id);
  const { t } = useTranslation();
  const navigate = useNavigate();
  const [file, setFile] = useState(null);
  const { data: existing } = useNotice(id);
  const m = useNoticeMutations();

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm({ defaultValues: { category: 'General', isPublished: false } });

  useEffect(() => {
    if (existing) {
      reset({
        title: existing.title,
        summary: existing.summary || '',
        content: existing.content,
        category: existing.category,
        expiryDate: existing.expiryDate ? existing.expiryDate.slice(0, 10) : '',
        isPublished: existing.isPublished,
      });
    }
  }, [existing, reset]);

  const onSubmit = async (values) => {
    const payload = { ...values };
    if (payload.expiryDate) payload.expiryDate = new Date(payload.expiryDate).toISOString();
    try {
      if (isEdit) {
        await m.update.mutateAsync({ id, values: payload, file });
        toast.success(t('notice.form.updated'));
      } else {
        await m.create.mutateAsync({ values: payload, file });
        toast.success(t('notice.form.created'));
      }
      navigate('/notices', { replace: true });
    } catch (err) {
      toast.error(err.response?.data?.error?.message || t('notice.form.failed'));
    }
  };

  return (
    <div className="max-w-2xl">
      <BackButton to="/notices" label={t('notice.form.back')} />

      <h1 className="mb-4 text-title text-foreground">
        {isEdit ? t('notice.form.editTitle') : t('notice.form.createTitle')}
      </h1>

      <form onSubmit={handleSubmit(onSubmit)} className="space-y-4" noValidate>
        {/*
         * These fields used a bare <label> sibling with no htmlFor, so every control on this
         * form had no accessible name. Field (components/ui/field.jsx) already wires
         * label/htmlFor/id and points aria-describedby at the error — use it rather than
         * hand-rolling the pairing again.
         */}
        <Field label={t('notice.form.title')} error={errors.title?.message}>
          {({ id, 'aria-describedby': describedBy }) => (
            <input
              id={id}
              aria-describedby={describedBy}
              className={controlClass}
              {...register('title', { required: t('notice.form.required') })}
            />
          )}
        </Field>

        <Field label={t('notice.form.summary')}>
          {({ id }) => (
            <input
              id={id}
              className={controlClass}
              maxLength={SMS_SUMMARY_MAX_LENGTH}
              {...register('summary')}
            />
          )}
        </Field>

        <Field label={t('notice.form.content')} error={errors.content?.message}>
          {({ id, 'aria-describedby': describedBy }) => (
            <textarea
              id={id}
              aria-describedby={describedBy}
              rows={6}
              className={cn(controlClass, 'h-auto min-h-24 py-2.5')}
              {...register('content', { required: t('notice.form.required') })}
            />
          )}
        </Field>

        <div className="grid grid-cols-2 gap-4">
          <Field label={t('notice.form.category')}>
            {({ id }) => (
              <select id={id} className={controlClass} {...register('category')}>
                {NOTICE_CATEGORIES.map((c) => (
                  <option key={c} value={c}>
                    {t(`notice.category.${c}`, c)}
                  </option>
                ))}
              </select>
            )}
          </Field>
          <Field label={t('notice.form.expiry')}>
            {({ id }) => (
              <input id={id} type="date" className={controlClass} {...register('expiryDate')} />
            )}
          </Field>
        </div>

        <div className="space-y-1">
          <label className="block text-label text-foreground">{t('notice.form.attachment')}</label>
          <label className="flex cursor-pointer items-center gap-2 rounded-md border border-dashed border-input px-3 py-2 text-sm text-muted-foreground">
            <Paperclip className="h-4 w-4" />
            {file
              ? file.name
              : existing?.attachmentUrl
                ? t('notice.form.replaceFile')
                : t('notice.form.chooseFile')}
            <input
              type="file"
              accept="image/*,application/pdf"
              className="hidden"
              onChange={(e) => setFile(e.target.files?.[0] || null)}
            />
          </label>
        </div>

        <label className="flex items-center gap-2 text-sm text-foreground">
          <input type="checkbox" {...register('isPublished')} />
          {t('notice.form.publishNow')}
        </label>

        <Button type="submit" disabled={m.create.isPending || m.update.isPending}>
          {m.create.isPending || m.update.isPending ? t('common.loading') : t('notice.form.save')}
        </Button>
      </form>
    </div>
  );
}
