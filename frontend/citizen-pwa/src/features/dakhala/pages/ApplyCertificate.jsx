import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import toast from 'react-hot-toast';
import { CERT_TYPES, CERT_TYPE_FIELDS, CERT_DOC_REQUIREMENTS } from '@dgp/shared';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Input, Select, Textarea } from '@/components/ui/input';
import { PageHeader } from '@/components/PageHeader';
import { DocUploader } from '../components/DocUploader';
import { useApplyCertificate } from '../hooks';

export function ApplyCertificate() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const [certificateType, setCertificateType] = useState('Marriage');
  // One flat list of { file, group, docType } — the server needs files + positional metadata.
  const [docs, setDocs] = useState([]);
  const applyMutation = useApplyCertificate();

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm();

  const fields = CERT_TYPE_FIELDS[certificateType] || [];
  const requirements = CERT_DOC_REQUIREMENTS[certificateType] || [];

  const onTypeChange = (e) => {
    setCertificateType(e.target.value);
    reset({});
    setDocs([]); // required documents differ per type
  };

  const onSubmit = async (values) => {
    // Client-side mirror of the server's required-document rule.
    const missing = requirements.filter(
      (g) => g.required && !docs.some((d) => d.group === g.key && g.anyOf.includes(d.docType)),
    );
    if (missing.length) {
      toast.error(t('dakhala.form.missingDocs'));
      return;
    }
    try {
      const created = await applyMutation.mutateAsync({
        certificateType,
        applicationData: values,
        documents: docs.map((d) => d.file),
        documentMeta: docs.map((d) => ({ group: d.group, docType: d.docType })),
      });
      toast.success(t('dakhala.form.submitted', { id: created.applicationId }));
      navigate(`/dakhala/${created.id}`, { replace: true });
    } catch (err) {
      toast.error(err.response?.data?.error?.message || t('dakhala.form.failed'));
    }
  };

  return (
    <div className="dgp-page">
      <PageHeader
        backTo="/dakhala"
        backLabel={t('dakhala.form.back')}
        title={t('dakhala.form.title')}
      />

      {/* Type drives which fields and which documents appear, so it leads the form. */}
      <Card className="mb-4">
        <CardContent className="space-y-1.5">
          <label htmlFor="certificate-type" className="block text-label text-foreground">
            {t('dakhala.form.type')}
          </label>
          <Select id="certificate-type" value={certificateType} onChange={onTypeChange}>
            {CERT_TYPES.map((c) => (
              <option key={c} value={c}>
                {t(`dakhala.type.${c}`, c)}
              </option>
            ))}
          </Select>
        </CardContent>
      </Card>

      <form onSubmit={handleSubmit(onSubmit)} noValidate>
        <Card className="mb-4">
          <CardContent className="space-y-4">
            {fields.map((field) => {
              const error = errors[field.key];
              const fieldId = `cert-${field.key}`;
              const errorId = `${fieldId}-error`;
              const reg = register(field.key, {
                required: field.required && t('dakhala.form.required'),
              });

              return (
                <div key={field.key} className="space-y-1.5">
                  <label htmlFor={fieldId} className="block text-label text-foreground">
                    {t(`dakhala.field.${field.key}`, field.label)}
                    {field.required ? (
                      <span className="ml-0.5 text-destructive" aria-hidden="true">
                        *
                      </span>
                    ) : null}
                  </label>
                  {field.type === 'textarea' ? (
                    <Textarea
                      id={fieldId}
                      rows={3}
                      invalid={Boolean(error)}
                      aria-describedby={error ? errorId : undefined}
                      {...reg}
                    />
                  ) : (
                    <Input
                      id={fieldId}
                      type={
                        field.type === 'number' ? 'number' : field.type === 'date' ? 'date' : 'text'
                      }
                      invalid={Boolean(error)}
                      aria-describedby={error ? errorId : undefined}
                      {...reg}
                    />
                  )}
                  {error ? (
                    <p id={errorId} role="alert" className="text-caption text-destructive-strong">
                      {error.message}
                    </p>
                  ) : null}
                </div>
              );
            })}
          </CardContent>
        </Card>

        <h2 className="mb-2 text-section text-foreground">{t('dakhala.form.documents')}</h2>
        <div className="space-y-3">
          {requirements.map((group) => (
            <DocUploader
              key={group.key}
              group={group}
              entries={docs.filter((d) => d.group === group.key)}
              totalCount={docs.length}
              onAdd={(files, docType) =>
                setDocs((prev) => [
                  ...prev,
                  ...files.map((file) => ({ file, group: group.key, docType })),
                ])
              }
              onRemove={(entry) => setDocs((prev) => prev.filter((d) => d !== entry))}
            />
          ))}
        </div>

        <Button type="submit" className="mt-5 w-full" loading={applyMutation.isPending}>
          {t('dakhala.form.submit')}
        </Button>
      </form>
    </div>
  );
}
