import { useTranslation } from 'react-i18next';
import { Trash2, Droplets, Clock } from 'lucide-react';
import { SectionHeader } from '@/components/PageHeader';
import { Card } from '@/components/ui/card';
import { SkeletonList } from '@/components/Skeleton';
import { QueryError } from '@/components/QueryError';
import { NoTimetableArt } from '@/components/Illustration';
import { useTimetable } from './hooks';

const SERVICES = [
  { key: 'Ghantagadi', icon: Trash2 },
  { key: 'WaterSupply', icon: Droplets },
];

/**
 * Formats a slot's times for display. Stored as 24-hour "HH:mm" strings, shown as given —
 * no Date is constructed, because a recurring wall-clock time has no date and converting it
 * would hand a timezone the chance to shift a village's collection round by an hour.
 */
function slotTime(entry) {
  return entry.endTime ? `${entry.startTime} – ${entry.endTime}` : entry.startTime;
}

function ServiceCard({ serviceKey, icon: Icon, entries }) {
  const { t, i18n } = useTranslation();
  const mr = i18n.language === 'mr';
  /** Marathi where the officer entered it, English otherwise — never an empty line. */
  const text = (en, enMr) => (mr && enMr ? enMr : en);

  return (
    <Card className="flex h-full min-w-0 flex-col gap-3 p-4">
      <div className="flex items-center gap-2.5">
        <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-primary-subtle text-primary">
          <Icon className="h-5 w-5" aria-hidden="true" />
        </span>
        <h3 className="min-w-0 truncate text-section text-foreground">
          {t(`timetable.service.${serviceKey}`)}
        </h3>
      </div>

      {entries.length === 0 ? (
        /*
         * No fabricated timings. A village that has not published its schedule says so, because
         * a guessed time on a public page sends a citizen to the roadside with their bin at an
         * hour nobody collects.
         */
        <div className="flex flex-col items-center gap-2 rounded-lg border border-dashed border-border px-3 py-5 text-center">
          <NoTimetableArt className="h-16 w-16 text-muted-foreground" />
          <p className="text-body text-muted-foreground">{t('timetable.empty')}</p>
        </div>
      ) : (
        <ul className="divide-y divide-border">
          {entries.map((e) => (
            <li key={e.id} className="flex items-start justify-between gap-3 py-2.5">
              <div className="min-w-0">
                <p className="truncate text-body font-medium text-foreground">
                  {text(e.title, e.titleMr)}
                </p>
                {e.area || e.areaMr ? (
                  <p className="truncate text-caption text-muted-foreground">
                    {text(e.area, e.areaMr)}
                  </p>
                ) : null}
                {e.note || e.noteMr ? (
                  <p className="mt-0.5 text-caption text-muted-foreground">
                    {text(e.note, e.noteMr)}
                  </p>
                ) : null}
              </div>
              <div className="shrink-0 text-right">
                <p className="text-caption font-medium text-primary">
                  {t(`timetable.day.${e.day}`, e.day)}
                </p>
                <p className="inline-flex items-center gap-1 text-caption tabular-nums text-foreground">
                  <Clock className="h-3 w-3 shrink-0" aria-hidden="true" />
                  {slotTime(e)}
                </p>
              </div>
            </li>
          ))}
        </ul>
      )}
    </Card>
  );
}

/**
 * The village service schedule on the citizen home page: when the Ghantagadi comes round and
 * when the water runs. Both services always render, so an unpublished one reads as "not
 * published yet" rather than vanishing.
 */
export function TimetableSection() {
  const { t } = useTranslation();
  const { data, isLoading, isError, refetch, isFetching } = useTimetable();

  return (
    <section aria-labelledby="timetable-heading">
      <SectionHeader id="timetable-heading" title={t('timetable.title')} />
      {isLoading ? (
        <SkeletonList />
      ) : isError ? (
        <QueryError
          message={t('timetable.loadError')}
          onRetry={() => refetch()}
          isFetching={isFetching}
        />
      ) : (
        <div className="grid gap-4 sm:grid-cols-2">
          {SERVICES.map(({ key, icon }) => (
            <ServiceCard key={key} serviceKey={key} icon={icon} entries={data?.[key] ?? []} />
          ))}
        </div>
      )}
    </section>
  );
}
