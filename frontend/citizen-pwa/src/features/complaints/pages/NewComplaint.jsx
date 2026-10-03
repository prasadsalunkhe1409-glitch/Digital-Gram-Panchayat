import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import toast from 'react-hot-toast';
import { generateIdempotencyKey } from '@dgp/shared';
import { Button } from '@/components/ui/button';
import { BackButton } from '@/components/BackButton';
import { useGeolocation } from '@/hooks/useGeolocation';
import { MapView } from '@/components/MapView';
import { enqueueComplaint } from '@/services/offline-queue';
import { CategorySelect } from '../components/CategorySelect';
import { PhotoUploader } from '../components/PhotoUploader';
import { GpsCapture } from '../components/GpsCapture';
import { FormRow } from '../components/FormRow';
import { useCreateComplaint } from '../hooks';

export function NewComplaint() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const [images, setImages] = useState([]);
  const { coords, status, address, request, setManual } = useGeolocation();
  const createMutation = useCreateComplaint();

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm();

  const onSubmit = async (values) => {
    const payload = {
      ...values,
      images,
      latitude: coords?.latitude,
      longitude: coords?.longitude,
      accuracy: coords?.accuracy,
    };
    // One key minted per submission attempt, reused on every replay so the backend
    // idempotency middleware collapses retries into a single complaint.
    const idempotencyKey = generateIdempotencyKey('cmp');

    // Offline: park it in IndexedDB; the background sync hook delivers it on reconnect.
    if (!navigator.onLine) {
      await enqueueComplaint({
        id: idempotencyKey,
        idempotencyKey,
        payload,
        createdAt: Date.now(),
      });
      toast.success(t('complaint.form.queuedOffline'));
      navigate('/complaints', { replace: true });
      return;
    }

    try {
      const created = await createMutation.mutateAsync({ input: payload, idempotencyKey });
      toast.success(t('complaint.form.submitted', { id: created.complaintId }));
      navigate(`/complaints/${created.id}`, { replace: true });
    } catch (err) {
      // Lost connectivity mid-request (no server response) → queue instead of failing.
      if (!err.response) {
        await enqueueComplaint({
          id: idempotencyKey,
          idempotencyKey,
          payload,
          createdAt: Date.now(),
        });
        toast.success(t('complaint.form.queuedOffline'));
        navigate('/complaints', { replace: true });
        return;
      }
      toast.error(err.response?.data?.error?.message || t('complaint.form.failed'));
    }
  };

  return (
    <div className="mx-auto w-full max-w-md px-4 py-6">
      {/* Filing a complaint is reached from Home and from the complaint list; either way the
          citizen needs a way out that is not the browser chrome. */}
      <BackButton to="/complaints" />
      <h1 className="mb-4 text-lg font-semibold text-foreground">{t('complaint.form.title')}</h1>

      <form onSubmit={handleSubmit(onSubmit)} className="space-y-4" noValidate>
        <CategorySelect
          register={register('category', { required: t('complaint.form.required') })}
          error={errors.category}
        />

        <FormRow label={t('complaint.form.subject')} error={errors.title}>
          <input
            className="h-11 w-full rounded-md border border-input bg-background px-3 text-sm outline-none focus-visible:ring-2 focus-visible:ring-ring"
            {...register('title', {
              required: t('complaint.form.required'),
              minLength: { value: 3, message: t('complaint.form.subjectShort') },
            })}
          />
        </FormRow>

        <FormRow label={t('complaint.form.description')} error={errors.description}>
          <textarea
            rows={4}
            className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm outline-none focus-visible:ring-2 focus-visible:ring-ring"
            {...register('description', {
              required: t('complaint.form.required'),
              minLength: { value: 5, message: t('complaint.form.descShort') },
            })}
          />
        </FormRow>

        <FormRow label={t('complaint.form.address')} error={errors.address} optional>
          <input
            className="h-11 w-full rounded-md border border-input bg-background px-3 text-sm outline-none focus-visible:ring-2 focus-visible:ring-ring"
            {...register('address')}
          />
        </FormRow>

        <PhotoUploader files={images} onChange={setImages} />
        <GpsCapture coords={coords} status={status} address={address} onRequest={request} />

        {/* Once a fix exists, show it on a map and let the citizen drag the pin (or tap)
            to correct an imprecise reading. Movable — accuracy resets to a manual point. */}
        {coords ? (
          <div className="space-y-1">
            <MapView
              latitude={coords.latitude}
              longitude={coords.longitude}
              height={200}
              onMove={setManual}
            />
            <p className="text-xs text-muted-foreground">{t('complaint.form.dragPin')}</p>
          </div>
        ) : null}

        <Button type="submit" className="w-full" disabled={createMutation.isPending}>
          {createMutation.isPending ? t('common.loading') : t('complaint.form.submit')}
        </Button>
      </form>
    </div>
  );
}
