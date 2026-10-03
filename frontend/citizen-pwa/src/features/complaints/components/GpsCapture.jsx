import { useTranslation } from 'react-i18next';
import { MapPin, LocateFixed, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';

/**
 * GPS capture control. Optional by design — if denied/unavailable the citizen still
 * submits (blueprint: "Not Available", proceed).
 */
export function GpsCapture({ coords, status, address, onRequest }) {
  const { t } = useTranslation();

  return (
    <div className="space-y-2">
      {/* A heading, not a <label> — this block heads a button, not a form control. */}
      <p className="block text-label text-foreground">{t('complaint.form.location')}</p>

      <Button type="button" variant="outline" onClick={onRequest} disabled={status === 'loading'}>
        {status === 'loading' ? (
          <Loader2 className="h-4 w-4 animate-spin" />
        ) : (
          <LocateFixed className="h-4 w-4" />
        )}
        {status === 'loading'
          ? t('complaint.form.gpsLoading')
          : coords
            ? t('complaint.form.updateLocation')
            : t('complaint.form.captureLocation')}
      </Button>

      {coords ? (
        <p className="flex items-center gap-1 text-caption text-muted-foreground">
          <MapPin className="h-3.5 w-3.5 text-primary" />
          {t('complaint.form.gpsCoords', {
            lat: coords.latitude.toFixed(5),
            lng: coords.longitude.toFixed(5),
          })}
          {coords.accuracy ? ` (±${Math.round(coords.accuracy)}m)` : ''}
        </p>
      ) : null}

      {coords && address ? <p className="text-caption text-muted-foreground">{address}</p> : null}

      {!coords && status === 'loading' ? (
        <p className="text-caption text-muted-foreground">{t('complaint.form.gpsFetching')}</p>
      ) : !coords && status !== 'idle' ? (
        <div className="space-y-1">
          <p className="text-caption text-destructive-strong">
            {t(`complaint.form.gps_${status}`)}
          </p>
          <button
            type="button"
            onClick={onRequest}
            className="inline-flex min-h-11 items-center text-caption font-medium text-interactive-strong underline-offset-2 hover:underline"
          >
            {t('complaint.form.gpsRetry')}
          </button>
          <p className="text-caption text-muted-foreground">
            {t('complaint.form.locationUnavailable')}
          </p>
        </div>
      ) : null}
    </div>
  );
}
