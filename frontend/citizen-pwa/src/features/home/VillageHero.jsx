import { useTranslation } from 'react-i18next';
import { CalendarDays, CloudSun, Languages, MapPin } from 'lucide-react';
import { formatDate } from '@dgp/shared';
import { SafeImage } from '@/components/SafeImage';
import { useLanguage } from '@/store';

/**
 * The home masthead's own photograph, served from `public/images` like the public page's
 * banner. Deliberately a different picture from the one on /welcome: that one is the
 * panchayat office a visitor is deciding whether to trust, this one is the village a
 * resident already lives in.
 */
const VILLAGE_LANDSCAPE = '/images/village-landscape.webp';

/** Morning / afternoon / evening, from the device clock. */
function greetingKey(hour) {
  if (hour < 12) return 'home.goodMorning';
  if (hour < 17) return 'home.goodAfternoon';
  return 'home.goodEvening';
}

/**
 * The masthead of the citizen portal: the village itself, not the app.
 *
 * A villager opening this should see where they are (village, taluka, district), when they
 * are (date), and who they are (greeting) before anything else. The banner is the village
 * photo an officer uploads in the Village Profile; with none, the same government-blue scrim
 * used elsewhere stands in.
 */
export function VillageHero({ profile, firstName }) {
  const { t, i18n } = useTranslation();
  const locale = i18n.language === 'mr' ? 'mr' : 'en';
  const { language, toggleLanguage } = useLanguage();

  const g = profile?.general ?? {};
  const now = new Date();
  // Taluka / district, skipping whichever the profile has not filled in.
  const place = [g.taluka, g.district].filter(Boolean).join(', ');

  // Translucent white over the photograph, not a solid block: the chips read as glass laid
  // on the landscape, and the hairline is what keeps their edge visible over a bright sky.
  const chip =
    'inline-flex min-h-9 items-center gap-1.5 rounded-full bg-white/[0.16] px-3 text-caption font-medium ring-1 ring-inset ring-white/[0.22] backdrop-blur';

  return (
    <section
      aria-label={t('home.villageHeader')}
      className="relative isolate overflow-hidden rounded-2xl border border-border shadow-sm"
    >
      {/*
       * Three layers, and the order matters: these all share `-z-10`, so they paint in DOM
       * order. The navy used to sit *after* the photograph and covered it completely, which is
       * why this card read as one more blue rectangle. It is now the base — what shows if the
       * photograph ever fails — with the image over it and the scrim over that.
       */}
      <div className="absolute inset-0 -z-10 bg-gradient-to-br from-primary to-primary-hover" />

      {/*
       * The officer's village photograph when there is one, the village landscape when there
       * is not. The crop sits low: the top third of the landscape is sky, so a short card
       * centred on the image would show weather rather than the village. Lower still on a
       * phone, where the card is proportionally taller and the fields would otherwise vanish.
       */}
      <SafeImage
        src={g.banner || VILLAGE_LANDSCAPE}
        alt=""
        loading="eager"
        fetchpriority="high"
        className="absolute inset-0 -z-10 h-full w-full object-cover object-[center_58%] sm:object-[center_68%]"
      />

      {/*
       * Readability without a second blue block. The scrim is neutral and graded across the
       * card — heaviest under the village name at the left, lightest at the right where the
       * sunset is the whole point of the picture. Roughly 60% → 15%, which measures as
       * comfortably readable white text while leaving the landscape plainly visible.
       */}
      <div className="absolute inset-0 -z-10 bg-gradient-to-r from-black/60 via-black/40 to-black/15" />

      {/* Tighter on a phone, where this band competes with the services for the first screen. */}
      <div className="flex min-h-[11.875rem] flex-col gap-3 p-4 text-white [text-shadow:0_1px_3px_rgba(0,0,0,0.45)] sm:min-h-[13.75rem] sm:gap-4 sm:p-6">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <h1 className="truncate text-title font-semibold leading-tight sm:text-display">
              {g.villageName || t('appName')}
            </h1>
            {place ? (
              <p className="mt-1 flex items-center gap-1.5 text-body opacity-95">
                <MapPin className="h-4 w-4 shrink-0" aria-hidden="true" />
                <span className="truncate">{place}</span>
              </p>
            ) : null}
          </div>

          {/* Language and theme within thumb reach of the first screen — the two settings a
              first-time visitor is most likely to want. */}
          <div className="flex shrink-0 items-center gap-1.5">
            <button
              type="button"
              onClick={toggleLanguage}
              aria-label={t('nav.toggleLanguage')}
              className="flex h-11 w-11 items-center justify-center rounded-full bg-white/[0.16] ring-1 ring-inset ring-white/[0.22] backdrop-blur transition-colors duration-150 hover:bg-white/25"
            >
              <Languages className="h-5 w-5" aria-hidden="true" />
              <span className="sr-only">{language === 'mr' ? 'EN' : 'मर'}</span>
            </button>
          </div>
        </div>

        <p className="text-section font-medium">
          {t(greetingKey(now.getHours()))}
          {firstName ? `, ${firstName}` : ''}
        </p>

        <div className="flex flex-wrap items-center gap-2">
          <span className={chip}>
            <CalendarDays className="h-4 w-4" aria-hidden="true" />
            {formatDate(now, locale)}
          </span>
          {/*
           * Weather slot. Deliberately shows no temperature: nothing in this system supplies
           * weather, and inventing one on a village portal would be worse than an honest gap.
           * Wire a provider to `profile.weather` and this chip fills itself in.
           */}
          <span className={chip} title={t('home.weatherUnavailable')}>
            <CloudSun className="h-4 w-4" aria-hidden="true" />
            {t('home.weatherUnavailable')}
          </span>
        </div>
      </div>
    </section>
  );
}
