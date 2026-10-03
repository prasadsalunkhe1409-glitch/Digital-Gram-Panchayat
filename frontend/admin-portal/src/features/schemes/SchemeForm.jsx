import { useEffect, useMemo, useState } from 'react';
import { useForm } from 'react-hook-form';
import { useNavigate, useParams } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import {
  ImagePlus,
  Paperclip,
  FileText,
  ExternalLink,
  Download,
  Trash2,
  Undo2,
  X,
} from 'lucide-react';
import toast from 'react-hot-toast';
import { SCHEME_CATEGORIES } from '@dgp/shared';
import { Button } from '@/components/ui/button';
import { BackButton } from '@/components/BackButton';
import { controlClass } from '@/components/ui/input';
import { SafeImage } from '@/components/SafeImage';
import { cn } from '@/utils/cn';
import { useScheme, useSchemeMutations } from './hooks';

const MAX_ATTACHMENTS = 5;

/** One already-uploaded attachment row: preview / download / remove-toggle. */
function ExistingAttachment({ att, marked, onToggle, t }) {
  return (
    <li
      className={cn(
        'flex items-center gap-2 rounded-md border border-border px-3 py-2',
        marked && 'opacity-60',
      )}
    >
      <FileText className="h-4 w-4 shrink-0 text-primary" aria-hidden="true" />
      <span className={cn('min-w-0 flex-1 truncate text-body', marked && 'line-through')}>
        {att.name || att.url.split('/').pop()}
      </span>
      {marked ? (
        <span className="shrink-0 text-caption text-warning-strong">
          {t('scheme.form.markedRemove')}
        </span>
      ) : (
        <>
          <a
            href={att.url}
            target="_blank"
            rel="noopener noreferrer"
            aria-label={t('scheme.form.preview')}
            title={t('scheme.form.preview')}
            className="rounded p-1.5 text-muted-foreground transition-colors duration-150 hover:text-foreground"
          >
            <ExternalLink className="h-4 w-4" aria-hidden="true" />
          </a>
          <a
            href={att.url}
            download
            target="_blank"
            rel="noopener noreferrer"
            aria-label={t('scheme.form.download')}
            title={t('scheme.form.download')}
            className="rounded p-1.5 text-muted-foreground transition-colors duration-150 hover:text-foreground"
          >
            <Download className="h-4 w-4" aria-hidden="true" />
          </a>
        </>
      )}
      <button
        type="button"
        onClick={onToggle}
        aria-label={marked ? t('scheme.form.undoRemove') : t('scheme.form.removeFile')}
        title={marked ? t('scheme.form.undoRemove') : t('scheme.form.removeFile')}
        className="rounded p-1.5 text-muted-foreground transition-colors duration-150 hover:text-foreground"
      >
        {marked ? (
          <Undo2 className="h-4 w-4" aria-hidden="true" />
        ) : (
          <Trash2 className="h-4 w-4 text-destructive" aria-hidden="true" />
        )}
      </button>
    </li>
  );
}

export function SchemeForm() {
  const { id } = useParams();
  const isEdit = Boolean(id);
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { data: existing } = useScheme(id);
  const m = useSchemeMutations();

  const [file, setFile] = useState(null); // new banner image
  const [removeImage, setRemoveImage] = useState(false);
  const [newAttachments, setNewAttachments] = useState([]); // File[]
  const [removeAttachments, setRemoveAttachments] = useState([]); // urls marked for removal

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm({ defaultValues: { category: 'Other', isPublished: false } });

  useEffect(() => {
    if (existing) {
      reset({
        title: existing.title,
        summary: existing.summary || '',
        description: existing.description,
        category: existing.category,
        eligibility: existing.eligibility || '',
        requiredDocuments: (existing.requiredDocuments || []).join('\n'),
        benefits: existing.benefits || '',
        applicationProcess: existing.applicationProcess || '',
        officialWebsite: existing.officialWebsite || '',
        expiryDate: existing.expiryDate ? existing.expiryDate.slice(0, 10) : '',
        isPublished: existing.isPublished,
      });
    }
  }, [existing, reset]);

  const existingAttachments = useMemo(() => existing?.attachments ?? [], [existing]);
  const keptCount = existingAttachments.length - removeAttachments.length;

  const toggleRemove = (url) =>
    setRemoveAttachments((prev) =>
      prev.includes(url) ? prev.filter((u) => u !== url) : [...prev, url],
    );

  const addFiles = (list) => {
    const incoming = Array.from(list || []);
    setNewAttachments((prev) => {
      const room = Math.max(0, MAX_ATTACHMENTS - keptCount - prev.length);
      return [...prev, ...incoming.slice(0, room)];
    });
  };

  const onSubmit = async (values) => {
    const payload = { ...values };
    const files = {
      image: file,
      attachments: newAttachments,
      removeAttachments,
      removeImage: removeImage && !file,
    };
    try {
      if (isEdit) {
        // Same document updated in place — never a duplicate.
        await m.update.mutateAsync({ id, values: payload, files });
        toast.success(t('scheme.form.updated'));
      } else {
        await m.create.mutateAsync({ values: payload, files });
        toast.success(t('scheme.form.created'));
      }
      navigate('/schemes', { replace: true });
    } catch (err) {
      toast.error(err.response?.data?.error?.message || t('scheme.form.failed'));
    }
  };

  return (
    <div className="max-w-2xl">
      <BackButton to="/schemes" label={t('scheme.form.back')} />

      <h1 className="mb-4 text-title text-foreground">
        {isEdit ? t('scheme.form.editTitle') : t('scheme.form.createTitle')}
      </h1>

      <form onSubmit={handleSubmit(onSubmit)} className="space-y-4" noValidate>
        <div className="space-y-1">
          <label htmlFor="scheme-title" className="block text-label text-foreground">
            {t('scheme.form.title')}
          </label>
          <input
            id="scheme-title"
            className={controlClass}
            {...register('title', { required: t('scheme.form.required') })}
          />
          {errors.title ? (
            <p className="text-caption text-destructive-strong">{errors.title.message}</p>
          ) : null}
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-1">
            <label htmlFor="scheme-category" className="block text-label text-foreground">
              {t('scheme.form.category')}
            </label>
            <select id="scheme-category" className={controlClass} {...register('category')}>
              {SCHEME_CATEGORIES.map((c) => (
                <option key={c} value={c}>
                  {t(`scheme.category.${c}`, c)}
                </option>
              ))}
            </select>
          </div>
          <div className="space-y-1">
            <label htmlFor="scheme-officialWebsite" className="block text-label text-foreground">
              {t('scheme.form.website')}
            </label>
            <input
              id="scheme-officialWebsite"
              className={controlClass}
              placeholder="https://…"
              {...register('officialWebsite')}
            />
          </div>
        </div>

        <div className="space-y-1">
          <label htmlFor="scheme-expiryDate" className="block text-label text-foreground">
            {t('scheme.form.expiry')}
          </label>
          <input
            id="scheme-expiryDate"
            type="date"
            className={controlClass}
            {...register('expiryDate')}
          />
          <p className="text-caption text-muted-foreground">{t('scheme.form.expiryHint')}</p>
        </div>

        <div className="space-y-1">
          <label htmlFor="scheme-summary" className="block text-label text-foreground">
            {t('scheme.form.summary')}
          </label>
          <input
            id="scheme-summary"
            className={controlClass}
            maxLength={300}
            {...register('summary')}
          />
        </div>

        <div className="space-y-1">
          <label htmlFor="scheme-description" className="block text-label text-foreground">
            {t('scheme.form.description')}
          </label>
          <textarea
            id="scheme-description"
            rows={5}
            className={cn(controlClass, 'h-auto min-h-24 py-2.5')}
            {...register('description', { required: t('scheme.form.required') })}
          />
          {errors.description ? (
            <p className="text-caption text-destructive-strong">{errors.description.message}</p>
          ) : null}
        </div>

        <div className="space-y-1">
          <label htmlFor="scheme-eligibility" className="block text-label text-foreground">
            {t('scheme.form.eligibility')}
          </label>
          <textarea
            id="scheme-eligibility"
            rows={3}
            className={cn(controlClass, 'h-auto min-h-24 py-2.5')}
            {...register('eligibility')}
          />
        </div>

        <div className="space-y-1">
          <label htmlFor="scheme-requiredDocuments" className="block text-label text-foreground">
            {t('scheme.form.requiredDocuments')}
          </label>
          <textarea
            id="scheme-requiredDocuments"
            rows={3}
            className={cn(controlClass, 'h-auto min-h-24 py-2.5')}
            placeholder={t('scheme.form.docsHint')}
            {...register('requiredDocuments')}
          />
        </div>

        <div className="space-y-1">
          <label htmlFor="scheme-benefits" className="block text-label text-foreground">
            {t('scheme.form.benefits')}
          </label>
          <textarea
            id="scheme-benefits"
            rows={3}
            className={cn(controlClass, 'h-auto min-h-24 py-2.5')}
            {...register('benefits')}
          />
        </div>

        <div className="space-y-1">
          <label htmlFor="scheme-applicationProcess" className="block text-label text-foreground">
            {t('scheme.form.applicationProcess')}
          </label>
          <textarea
            id="scheme-applicationProcess"
            rows={3}
            className={cn(controlClass, 'h-auto min-h-24 py-2.5')}
            {...register('applicationProcess')}
          />
        </div>

        {/* Banner image: preview current, replace, or remove. */}
        <div className="space-y-2">
          <label className="block text-label text-foreground">{t('scheme.form.image')}</label>
          {isEdit && existing?.imageUrl && !file ? (
            <div className="flex items-center gap-3">
              <SafeImage
                src={existing.imageUrl}
                alt={t('scheme.form.currentImage')}
                className={cn(
                  'h-20 w-32 rounded-md border border-border object-cover',
                  removeImage && 'opacity-40',
                )}
              />
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => setRemoveImage((v) => !v)}
              >
                {removeImage ? (
                  <>
                    <Undo2 className="h-4 w-4" aria-hidden="true" />
                    {t('scheme.form.undoRemove')}
                  </>
                ) : (
                  <>
                    <Trash2 className="h-4 w-4" aria-hidden="true" />
                    {t('scheme.form.removeImage')}
                  </>
                )}
              </Button>
            </div>
          ) : null}
          <label className="flex cursor-pointer items-center gap-2 rounded-md border border-dashed border-input px-3 py-2 text-sm text-muted-foreground">
            <ImagePlus className="h-4 w-4" />
            {file
              ? file.name
              : existing?.imageUrl
                ? t('scheme.form.replaceImage')
                : t('scheme.form.chooseImage')}
            <input
              type="file"
              accept="image/*"
              className="hidden"
              onChange={(e) => setFile(e.target.files?.[0] || null)}
            />
          </label>
        </div>

        {/* Supporting files: existing survive unless removed; new ones append. */}
        <div className="space-y-2">
          <label className="block text-label text-foreground">{t('scheme.form.attachments')}</label>

          {existingAttachments.length ? (
            <ul className="space-y-1.5">
              {existingAttachments.map((att) => (
                <ExistingAttachment
                  key={att.url}
                  att={att}
                  marked={removeAttachments.includes(att.url)}
                  onToggle={() => toggleRemove(att.url)}
                  t={t}
                />
              ))}
            </ul>
          ) : null}

          {newAttachments.length ? (
            <ul className="space-y-1.5">
              {newAttachments.map((f, i) => (
                <li
                  key={`${f.name}-${i}`}
                  className="flex items-center gap-2 rounded-md border border-dashed border-input px-3 py-2"
                >
                  <Paperclip
                    className="h-4 w-4 shrink-0 text-muted-foreground"
                    aria-hidden="true"
                  />
                  <span className="min-w-0 flex-1 truncate text-body">{f.name}</span>
                  <button
                    type="button"
                    onClick={() => setNewAttachments((prev) => prev.filter((_, j) => j !== i))}
                    aria-label={t('scheme.form.removeFile')}
                    className="rounded p-1.5 text-muted-foreground transition-colors duration-150 hover:text-foreground"
                  >
                    <X className="h-4 w-4" aria-hidden="true" />
                  </button>
                </li>
              ))}
            </ul>
          ) : null}

          <label className="flex cursor-pointer items-center gap-2 rounded-md border border-dashed border-input px-3 py-2 text-sm text-muted-foreground">
            <Paperclip className="h-4 w-4" />
            {t('scheme.form.addAttachments')}
            <input
              type="file"
              accept="image/*,application/pdf"
              multiple
              className="hidden"
              onChange={(e) => {
                addFiles(e.target.files);
                e.target.value = '';
              }}
            />
          </label>
          <p className="text-caption text-muted-foreground">{t('scheme.form.attachmentsHint')}</p>
        </div>

        <label className="flex items-center gap-2 text-sm text-foreground">
          <input type="checkbox" {...register('isPublished')} />
          {t('scheme.form.publishNow')}
        </label>

        <Button type="submit" loading={m.create.isPending || m.update.isPending}>
          {t('scheme.form.save')}
        </Button>
      </form>
    </div>
  );
}
