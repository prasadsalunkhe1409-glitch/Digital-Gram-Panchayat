import { useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import toast from 'react-hot-toast';
import { UserCheck, Paperclip } from 'lucide-react';
import { CERT_TYPES, CERT_TYPE_FIELDS, CERT_DOC_REQUIREMENTS } from '@dgp/shared';
import { Button } from '@/components/ui/button';
import { Field } from '@/components/ui/field';
import { controlClass } from '@/components/ui/input';
import { Dialog } from '@/components/ui/dialog';
import { taxService } from '@/features/tax/taxService';
import { useOfficerCreateCertificate } from './hooks';

/**
 * An officer records a certificate the Panchayat is issuing at the counter — a marriage
 * registered in person, a birth taken from the hospital's paperwork — rather than one a
 * citizen applied for online.
 *
 * Every field and every required document group is read from the shared definitions the
 * citizen form already uses. There is no second field map here: if a certificate type gains
 * a field, both forms gain it, and neither can drift from what the API validates.
 *
 * `CERT_TYPES`, not the field map — the map still holds Residence so historical applications
 * render, but Residence is withdrawn and cannot be issued again.
 */
export function AddCertificateDialog({ open, onClose }) {
  const { t } = useTranslation();
  const create = useOfficerCreateCertificate();

  const [certificateType, setCertificateType] = useState(CERT_TYPES[0]);
  const [mobile, setMobile] = useState('');
  const [citizen, setCitizen] = useState(null);
  const [lookingUp, setLookingUp] = useState(false);
  const [values, setValues] = useState({});
  const [docs, setDocs] = useState({});

  const fields = CERT_TYPE_FIELDS[certificateType] ?? [];
  const groups = useMemo(() => CERT_DOC_REQUIREMENTS[certificateType] ?? [], [certificateType]);

  const reset = () => {
    setCertificateType(CERT_TYPES[0]);
    setMobile('');
    setCitizen(null);
    setValues({});
    setDocs({});
  };

  const close = () => {
    reset();
    onClose();
  };

  /** A certificate belongs to somebody; the officer resolves who before anything else. */
  const lookup = async () => {
    if (!/^[6-9]\d{9}$/.test(mobile)) {
      toast.error(t('dakhala.add.badMobile'));
      return;
    }
    setLookingUp(true);
    try {
      setCitizen(await taxService.lookupCitizen(mobile));
    } catch (err) {
      setCitizen(null);
      toast.error(err.response?.data?.error?.message || t('dakhala.add.citizenNotFound'));
    } finally {
      setLookingUp(false);
    }
  };

  const submit = (e) => {
    e.preventDefault();
    if (!citizen) {
      toast.error(t('dakhala.add.lookupFirst'));
      return;
    }

    // Checked here so the officer sees which group is missing, not a generic 400. The API
    // enforces the same rule — this is a courtesy, not the guarantee.
    const missing = groups.filter((g) => g.required && !docs[g.key]);
    if (missing.length) {
      toast.error(t('dakhala.add.missingDocs', { count: missing.length }));
      return;
    }

    const attached = groups.filter((g) => docs[g.key]);
    create.mutate(
      {
        values: {
          certificateType,
          citizenId: citizen.id,
          applicationData: JSON.stringify(values),
          documentMeta: JSON.stringify(
            attached.map((g) => ({ group: g.key, docType: g.anyOf[0] })),
          ),
        },
        files: attached.map((g) => docs[g.key]),
      },
      {
        onSuccess: (created) => {
          toast.success(t('dakhala.add.created', { number: created.certificateNumber }));
          close();
        },
        onError: (err) =>
          toast.error(err.response?.data?.error?.message || t('dakhala.add.failed')),
      },
    );
  };

  return (
    <Dialog
      open={open}
      onClose={close}
      title={t('dakhala.add.title')}
      className="max-w-2xl"
      footer={
        <>
          <Button variant="outline" onClick={close}>
            {t('common.close')}
          </Button>
          <Button type="submit" form="add-certificate-form" loading={create.isPending}>
            {t('dakhala.add.submit')}
          </Button>
        </>
      }
    >
      <form id="add-certificate-form" onSubmit={submit} className="space-y-4">
        <Field label={t('dakhala.add.citizenMobile')}>
          {({ id }) => (
            <div className="flex gap-2">
              <input
                id={id}
                className={controlClass}
                value={mobile}
                inputMode="numeric"
                placeholder="9876543210"
                onChange={(e) => setMobile(e.target.value)}
              />
              <Button
                type="button"
                variant="outline"
                onClick={lookup}
                loading={lookingUp}
                className="shrink-0"
              >
                {t('dakhala.add.lookup')}
              </Button>
            </div>
          )}
        </Field>
        {citizen ? (
          <p className="flex items-center gap-1.5 text-body text-success-strong">
            <UserCheck className="h-4 w-4" aria-hidden="true" />
            {citizen.fullName} · {citizen.mobile}
          </p>
        ) : null}

        <Field label={t('dakhala.add.type')}>
          {({ id }) => (
            <select
              id={id}
              className={controlClass}
              value={certificateType}
              onChange={(e) => {
                setCertificateType(e.target.value);
                // The next type has different fields and different document groups; carrying
                // the old answers over would submit one type's data under another's name.
                setValues({});
                setDocs({});
              }}
            >
              {CERT_TYPES.map((c) => (
                <option key={c} value={c}>
                  {t(`dakhala.type.${c}`, c)}
                </option>
              ))}
            </select>
          )}
        </Field>

        <div className="grid gap-3 sm:grid-cols-2">
          {fields.map((f) => (
            <Field key={f.key} label={t(`dakhala.field.${f.key}`, f.label)} required={f.required}>
              {({ id }) =>
                f.type === 'textarea' ? (
                  <textarea
                    id={id}
                    rows={2}
                    className={controlClass}
                    value={values[f.key] ?? ''}
                    onChange={(e) => setValues((v) => ({ ...v, [f.key]: e.target.value }))}
                  />
                ) : (
                  <input
                    id={id}
                    type={f.type === 'date' ? 'date' : 'text'}
                    className={controlClass}
                    value={values[f.key] ?? ''}
                    onChange={(e) => setValues((v) => ({ ...v, [f.key]: e.target.value }))}
                  />
                )
              }
            </Field>
          ))}
        </div>

        <div className="space-y-2">
          <p className="text-label text-foreground">{t('dakhala.add.documents')}</p>
          {/* Manual review: the officer is looking at the paperwork in front of them. Nothing
              here checks authenticity — the system only carries the files. */}
          <p className="text-caption text-muted-foreground">{t('dakhala.add.documentsNote')}</p>
          {groups.map((g) => (
            <Field
              key={g.key}
              label={t(`dakhala.docGroup.${g.key}`, g.key)}
              required={g.required}
              hint={docs[g.key] ? docs[g.key].name : undefined}
            >
              {({ id }) => (
                <input
                  id={id}
                  type="file"
                  accept="image/*,application/pdf"
                  className="block w-full text-body text-muted-foreground file:mr-3 file:rounded-md file:border file:border-input file:bg-background file:px-3 file:py-1.5 file:text-body file:font-medium file:text-foreground hover:file:bg-accent"
                  onChange={(e) =>
                    setDocs((d) => ({ ...d, [g.key]: e.target.files?.[0] ?? undefined }))
                  }
                />
              )}
            </Field>
          ))}
          <p className="flex items-center gap-1.5 text-caption text-muted-foreground">
            <Paperclip className="h-3.5 w-3.5" aria-hidden="true" />
            {t('dakhala.add.attachedCount', {
              count: groups.filter((g) => docs[g.key]).length,
              total: groups.length,
            })}
          </p>
        </div>
      </form>
    </Dialog>
  );
}
