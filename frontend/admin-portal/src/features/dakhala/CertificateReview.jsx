import { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { X, FileText, Eye, BadgeCheck, Download } from 'lucide-react';
import toast from 'react-hot-toast';
import { formatDateTime, formatDate } from '@dgp/shared';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { controlClass } from '@/components/ui/input';
import { PageHeader } from '@/components/PageHeader';
import { Timeline } from '@/components/Timeline';
import { DocModal } from '@/components/DocModal';
import { SafeImage } from '@/components/SafeImage';
import { cn } from '@/utils/cn';
import { DakhalaStatusBadge } from './DakhalaStatusBadge';
import { useApplication, useReviewMutations } from './hooks';
import { RejectDialog } from './RejectDialog';

function Panel({ title, children }) {
  return (
    <Card>
      <h2 className="border-b border-border px-5 py-3 text-section text-foreground">{title}</h2>
      {children}
    </Card>
  );
}

export function CertificateReview() {
  const { id } = useParams();
  const { t, i18n } = useTranslation();
  const locale = i18n.language === 'mr' ? 'mr' : 'en';
  const { data: a, isLoading, isError } = useApplication(id);
  const m = useReviewMutations(id);
  const [rejectOpen, setRejectOpen] = useState(false);
  const [preview, setPreview] = useState(null);
  // Officer corrections, and the prepared certificate they are issuing.
  const [edits, setEdits] = useState({});
  const [remarks, setRemarks] = useState('');
  const [certFile, setCertFile] = useState(null);

  // The officer corrects the submitted details in place, so the fields are seeded as soon as
  // the application loads rather than behind a "start review" step.
  useEffect(() => {
    if (!a) return;
    setEdits({ ...(a.applicationData || {}) });
    setRemarks(a.officerRemarks || '');
  }, [a]);

  if (isLoading) return <p className="text-body text-muted-foreground">{t('common.loading')}</p>;
  if (isError || !a)
    return <p className="text-body text-destructive-strong">{t('dakhala.review.notFound')}</p>;

  const pending = a.status === 'Submitted' || a.status === 'UnderReview';

  const doApprove = async () => {
    // The officer issues a document they prepared and signed; there is nothing to generate,
    // so there is nothing to issue without it. The API enforces the same rule.
    if (!certFile) {
      toast.error(t('dakhala.review.certificateRequired'));
      return;
    }
    try {
      await m.approve.mutateAsync({
        applicationData: edits,
        officerRemarks: remarks,
        file: certFile,
      });
      toast.success(t('dakhala.review.approved'));
      setCertFile(null);
    } catch (err) {
      toast.error(err.response?.data?.error?.message || t('dakhala.review.actionFailed'));
    }
  };

  const doReject = async (reason) => {
    try {
      await m.reject.mutateAsync(reason);
      toast.success(t('dakhala.review.rejected'));
      setRejectOpen(false);
    } catch (err) {
      toast.error(err.response?.data?.error?.message || t('dakhala.review.actionFailed'));
    }
  };

  return (
    <div>
      <PageHeader
        backTo="/dakhala"
        backLabel={t('dakhala.review.back')}
        title={t(`dakhala.type.${a.certificateType}`, a.certificateType)}
        subtitle={a.applicationId}
        action={<DakhalaStatusBadge status={a.status} />}
      />

      <div className="grid gap-6 lg:grid-cols-3">
        <div className="space-y-4 lg:col-span-2">
          <Panel title={t('dakhala.review.details')}>
            <dl className="divide-y divide-border">
              {Object.entries(a.applicationData || {}).map(([key, value]) => (
                <div key={key} className="flex justify-between gap-3 px-5 py-2.5">
                  <dt className="text-body text-muted-foreground">
                    {t(`dakhala.field.${key}`, key)}
                  </dt>
                  <dd className="text-right text-body font-medium text-foreground">
                    {String(value)}
                  </dd>
                </div>
              ))}
            </dl>
          </Panel>

          <Panel title={t('dakhala.review.documents')}>
            <CardContent className="p-5">
              {a.uploadedDocuments?.length ? (
                <div className="flex flex-wrap gap-3">
                  {a.uploadedDocuments.map((d, i) => (
                    <div
                      key={`${d.url}-${i}`}
                      className="w-40 overflow-hidden rounded-md border border-border"
                    >
                      <button
                        type="button"
                        onClick={() => setPreview(d)}
                        title={t('doc.view')}
                        className="block w-full transition-opacity duration-150 hover:opacity-90"
                      >
                        {d.type === 'image' ? (
                          <SafeImage
                            src={d.url}
                            alt={d.name || ''}
                            className="h-24 w-full object-cover"
                          />
                        ) : (
                          <span className="flex h-24 w-full items-center justify-center bg-primary-subtle">
                            <FileText className="h-8 w-8 text-primary" aria-hidden="true" />
                          </span>
                        )}
                      </button>
                      <div className="border-t border-border p-2">
                        <p className="truncate text-caption font-medium text-foreground">
                          {d.docType ? t(`dakhala.doc.${d.docType}`, d.docType) : d.name || '—'}
                        </p>
                        {d.group ? (
                          <p className="truncate text-caption text-muted-foreground">
                            {t(`dakhala.docGroup.${d.group}`, d.group)}
                          </p>
                        ) : null}
                        {/* View and download only — a citizen's evidence is never editable
                            or replaceable from here. */}
                        <div className="mt-1 flex items-center gap-3">
                          <button
                            type="button"
                            onClick={() => setPreview(d)}
                            className="inline-flex items-center gap-1 text-caption font-medium text-primary transition-colors duration-150 hover:text-primary-hover"
                          >
                            <Eye className="h-3 w-3" aria-hidden="true" />
                            {t('doc.view')}
                          </button>
                          <a
                            href={d.url}
                            download
                            target="_blank"
                            rel="noopener noreferrer"
                            className="inline-flex items-center gap-1 text-caption font-medium text-primary transition-colors duration-150 hover:text-primary-hover"
                          >
                            <Download className="h-3 w-3" aria-hidden="true" />
                            {t('doc.download')}
                          </a>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-body text-muted-foreground">{t('dakhala.review.noDocuments')}</p>
              )}
            </CardContent>
          </Panel>

          {/*
            The final certificate, as its own step. It is always present so the officer can see
            at a glance whether one has been issued, and so the act of issuing is visibly an
            upload of a document they prepared — not a button that manufactures one.
          */}
          <Panel title={t('dakhala.review.issuedSection')}>
            <CardContent className="space-y-3 p-5">
              {a.status === 'Approved' && a.pdfUrl ? (
                <>
                  <p className="text-body font-medium text-success-strong">
                    {t('dakhala.review.statusIssued')}
                  </p>
                  <dl className="space-y-1.5">
                    {a.certificateNumber ? (
                      <div className="flex justify-between gap-3">
                        <dt className="text-caption text-muted-foreground">
                          {t('dakhala.review.certNumber')}
                        </dt>
                        <dd className="text-caption font-medium tabular-nums text-foreground">
                          {a.certificateNumber}
                        </dd>
                      </div>
                    ) : null}
                    {a.issuedAt ? (
                      <div className="flex justify-between gap-3">
                        <dt className="text-caption text-muted-foreground">
                          {t('dakhala.review.issuedOn')}
                        </dt>
                        <dd className="text-caption font-medium text-foreground">
                          {formatDate(a.issuedAt, locale)}
                        </dd>
                      </div>
                    ) : null}
                  </dl>
                  <div className="flex flex-wrap items-center gap-4">
                    <button
                      type="button"
                      onClick={() =>
                        setPreview({
                          url: a.pdfUrl,
                          type: 'pdf',
                          name: `${a.certificateNumber || a.applicationId}.pdf`,
                        })
                      }
                      className="inline-flex items-center gap-2 text-body font-medium text-primary transition-colors duration-150 hover:text-primary-hover"
                    >
                      <Eye className="h-4 w-4" aria-hidden="true" />
                      {t('dakhala.review.openPdf')}
                    </button>
                    <a
                      href={a.pdfUrl}
                      download
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-2 text-body font-medium text-primary transition-colors duration-150 hover:text-primary-hover"
                    >
                      <Download className="h-4 w-4" aria-hidden="true" />
                      {t('dakhala.review.downloadPdf')}
                    </a>
                  </div>
                </>
              ) : pending ? (
                <>
                  <p className="text-body text-muted-foreground">
                    {t('dakhala.review.statusNotIssued')}
                  </p>
                  <label className="block space-y-1">
                    <span className="block text-label text-foreground">
                      {t('dakhala.review.certificateFile')}
                    </span>
                    <input
                      type="file"
                      accept="application/pdf"
                      className={cn(controlClass, 'h-auto py-2 file:mr-3 file:border-0')}
                      onChange={(e) => setCertFile(e.target.files?.[0] ?? null)}
                    />
                    <span className="block text-caption text-muted-foreground">
                      {t('dakhala.review.certificateFileHint')}
                    </span>
                  </label>

                  {/* The officer should be able to confirm they picked the right file. */}
                  {certFile ? (
                    <p className="flex items-center gap-2 text-body text-foreground">
                      <FileText className="h-4 w-4 shrink-0 text-primary" aria-hidden="true" />
                      <span className="truncate font-medium">{certFile.name}</span>
                      <span className="shrink-0 text-caption text-muted-foreground">
                        {Math.ceil(certFile.size / 1024)} KB
                      </span>
                    </p>
                  ) : null}

                  <Button onClick={doApprove} loading={m.approve.isPending} disabled={!certFile}>
                    <BadgeCheck className="h-4 w-4" aria-hidden="true" />
                    {t('dakhala.review.issue')}
                  </Button>
                </>
              ) : (
                <p className="text-body text-muted-foreground">
                  {t('dakhala.review.statusNoCertificate')}
                </p>
              )}
            </CardContent>
          </Panel>

          {a.status === 'Rejected' && a.rejectionReason ? (
            <div
              role="alert"
              className="rounded-lg bg-destructive-subtle p-4 text-body text-destructive-strong ring-1 ring-inset ring-destructive/20"
            >
              <span className="font-medium">{t('dakhala.review.rejectionReason')}: </span>
              {a.rejectionReason}
            </div>
          ) : null}
        </div>

        <div className="space-y-4">
          {pending ? (
            <Panel title={t('dakhala.review.decision')}>
              <CardContent className="space-y-3 p-5">
                <p className="text-caption text-muted-foreground">
                  {t('dakhala.review.reviewBeforeIssue')}
                </p>
                <div className="space-y-2.5">
                  {Object.keys(edits).length === 0 ? (
                    <p className="text-caption text-muted-foreground">
                      {t('dakhala.review.noFields')}
                    </p>
                  ) : (
                    Object.entries(edits).map(([key, value]) => (
                      <label key={key} className="block space-y-1">
                        <span className="block text-label text-foreground">
                          {t(`dakhala.field.${key}`, key)}
                        </span>
                        <input
                          className={controlClass}
                          value={value ?? ''}
                          onChange={(e) => setEdits((prev) => ({ ...prev, [key]: e.target.value }))}
                        />
                      </label>
                    ))
                  )}
                  <label className="block space-y-1">
                    <span className="block text-label text-foreground">
                      {t('dakhala.review.remarks')}
                    </span>
                    <textarea
                      rows={2}
                      className={cn(controlClass, 'h-auto min-h-16 py-2.5')}
                      placeholder={t('dakhala.review.remarksHint')}
                      value={remarks}
                      onChange={(e) => setRemarks(e.target.value)}
                    />
                  </label>
                </div>

                {/*
                  Issuing happens in the Final Certificate section, because it is an upload
                  rather than a decision taken here. Reject stays — it is a real outcome the
                  API and the historical Rejected records both depend on — but as a quiet
                  action, so the two never read as equals.
                */}
                <div className="border-t border-border pt-3">
                  <Button
                    variant="ghost"
                    size="sm"
                    className="w-full text-destructive-strong hover:bg-destructive-subtle"
                    onClick={() => setRejectOpen(true)}
                  >
                    <X className="h-4 w-4" aria-hidden="true" />
                    {t('dakhala.review.reject')}
                  </Button>
                </div>
              </CardContent>
            </Panel>
          ) : (
            <Card>
              <CardContent className="p-5">
                <p className="text-body text-muted-foreground">{t('dakhala.review.decided')}</p>
              </CardContent>
            </Card>
          )}

          <Panel title={t('dakhala.review.timeline')}>
            <CardContent className="p-5">
              <Timeline
                items={[...a.history].reverse().map((h, i) => ({
                  key: `${h.status}-${h.at}-${i}`,
                  title: t(`dakhala.status.${h.status}`, h.status),
                  meta: formatDateTime(h.at, locale),
                  note: h.note,
                }))}
              />
            </CardContent>
          </Panel>
        </div>
      </div>

      <RejectDialog
        open={rejectOpen}
        application={a}
        isPending={m.reject.isPending}
        onReject={doReject}
        onClose={() => setRejectOpen(false)}
      />

      <DocModal doc={preview} onClose={() => setPreview(null)} />
    </div>
  );
}
