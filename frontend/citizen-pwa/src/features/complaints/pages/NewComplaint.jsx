import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import toast from 'react-hot-toast';
import { generateIdempotencyKey } from '@dgp/shared';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { controlClass } from '@/components/ui/input';
import { cn } from '@/utils/cn';
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
    <div className="mx-auto w-full max-w-md px-4 py-5">
      {/* Filing a complaint is reached from Home and from the complaint list; either way the
          citizen needs a way out that is not the browser chrome. */}
      <BackButton to="/complaints" />
      <h1 className="mb-4 text-title text-primary">{t('complaint.form.title')}</h1>

      {/*
        Three cards rather than one run of fields: what the complaint is, what it looks like,
        and where it is. The form itself is unchanged — same fields, same registrations, same
        validation, same offline queue — but the controls now use the shared `controlClass`
        instead of the 14px hand-rolled copies that had drifted from every other form.
      */}
      <form onSubmit={handleSubmit(onSubmit)} className="space-y-3.5" noValidate>
        <Card className="space-y-4 p-4">
          <CategorySelect
            register={register('category', { required: t('complaint.form.required') })}
            error={errors.category}
          />

          <FormRow label={t('complaint.form.subject')} error={errors.title}>
            <input
              className={controlClass}
              {...register('title', {
                required: t('complaint.form.required'),
                minLength: { value: 3, message: t('complaint.form.subjectShort') },
              })}
            />
          </FormRow>

          <FormRow label={t('complaint.form.description')} error={errors.description}>
            <textarea
              rows={4}
              className={cn(controlClass, 'h-auto min-h-24 py-2.5')}
              {...register('description', {
                required: t('complaint.form.required'),
                minLength: { value: 5, message: t('complaint.form.descShort') },
              })}
            />
          </FormRow>
        </Card>

        <Card className="p-4">
          <PhotoUploader files={images} onChange={setImages} />
        </Card>

        <Card className="space-y-4 p-4">
          <FormRow label={t('complaint.form.address')} error={errors.address} optional>
            <input className={controlClass} {...register('address')} />
          </FormRow>

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
              <p className="text-caption text-muted-foreground">{t('complaint.form.dragPin')}</p>
            </div>
          ) : null}
        </Card>

        <Button type="submit" className="w-full" disabled={createMutation.isPending}>
          {createMutation.isPending ? t('common.loading') : t('complaint.form.submit')}
        </Button>
      </form>
    </div>
  );
}
