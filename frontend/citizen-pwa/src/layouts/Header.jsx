import { useTranslation } from 'react-i18next';
import { Link } from 'react-router-dom';
import { Wifi, WifiOff, Settings, HelpCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useLanguage } from '@/store';
import { useOnline } from '@/hooks/useOnline';

/**
 * The application header.
 *
 * Navy, not paper. A citizen arriving from the public page should see the same official band
 * they saw there, so the portal reads as one government service rather than a white app that
 * happens to sit under it. Nothing here changed but the surface it is painted on: the same
 * four controls, in the same order, doing the same things.
 *
 * Controls on this band carry their own on-dark treatment rather than a new button variant —
 * `ghost` is defined against a light surface, and a second "ghost but inverted" variant would
 * be a token that exists for one header.
 */
const onNavy =
  'text-primary-foreground hover:bg-white/15 hover:text-primary-foreground ' +
  'focus-visible:ring-white focus-visible:ring-offset-0';

export function Header() {
  const { t } = useTranslation();
  const { language, toggleLanguage } = useLanguage();
  const isOnline = useOnline();

  return (
    <header className="sticky top-0 z-20 bg-primary px-3 py-2 pt-[max(0.5rem,env(safe-area-inset-top))] text-primary-foreground shadow-sm sm:px-4">
      <div className="mx-auto flex w-full max-w-6xl items-center justify-between gap-2 lg:px-2">
        {/*
          min-w-0 lets the title truncate instead of pushing the controls off a 320px screen.
          A step smaller below 640px: the Marathi name is half again as wide as the English one
          and was being cut on a 320px phone at the larger size.
        */}
        <span className="min-w-0 flex-1 truncate text-body font-semibold sm:text-section">
          {t('appName')}
        </span>

        <div className="flex shrink-0 items-center gap-0.5">
          {/*
            Connectivity. Offline takes the gold accent because it is the one state a citizen
            needs to notice — a white icon on navy would read as decoration.
          */}
          <span
            className={isOnline ? 'px-1 text-primary-foreground/80' : 'px-1 text-gold'}
            aria-label={isOnline ? t('common.online') : t('common.offline')}
            title={isOnline ? t('common.online') : t('common.offline')}
          >
            {isOnline ? <Wifi className="h-4 w-4" /> : <WifiOff className="h-4 w-4" />}
          </span>

          <Button
            variant="ghost"
            size="sm"
            onClick={toggleLanguage}
            aria-label={t('nav.toggleLanguage')}
            className={`min-w-11 px-2 ${onNavy}`}
          >
            {language === 'mr' ? 'EN' : 'मर'}
          </Button>

          <Button
            asChild
            variant="ghost"
            size="icon"
            aria-label={t('help.title')}
            className={onNavy}
          >
            <Link to="/help">
              <HelpCircle className="h-5 w-5" />
            </Link>
          </Button>

          <Button
            asChild
            variant="ghost"
            size="icon"
            aria-label={t('settings.title')}
            className={onNavy}
          >
            <Link to="/settings">
              <Settings className="h-5 w-5" />
            </Link>
          </Button>
        </div>
      </div>
    </header>
  );
}
