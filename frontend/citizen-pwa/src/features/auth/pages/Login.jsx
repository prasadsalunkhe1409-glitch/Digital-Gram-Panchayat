import { useState } from 'react';
import { Navigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { BackButton } from '@/components/BackButton';
import { User, Landmark } from 'lucide-react';
import logo from '@dgp/shared/assets/logo.svg';
import { cn } from '@/utils/cn';
import { useAuth } from '@/hooks/useAuth';
import { LoginForm } from '../components/LoginForm';

const TABS = [
  { key: 'villager', icon: User, labelKey: 'auth.tabVillager' },
  { key: 'officer', icon: Landmark, labelKey: 'auth.tabOfficer' },
];

/**
 * The shared sign-in page, styled like a banking/government portal: masthead, then a
 * segmented Villager / Officer selector above one card. The tabs are presentation only —
 * both modes submit the same fields to the same endpoint, and the returned role routes
 * the browser. Switching tabs never navigates, reloads, or drops entered values (the form
 * stays mounted; only its copy changes).
 */
export function Login() {
  const { t } = useTranslation();
  const { isAuthenticated } = useAuth();
  const [mode, setMode] = useState('villager');

  if (isAuthenticated) return <Navigate to="/" replace />;

  return (
    <div className="mx-auto flex min-h-dvh w-full max-w-[460px] flex-col justify-center px-4 py-4 sm:py-5">
      {/*
        A way back to the public page. Someone who followed "Enter portal" and then decided
        they only wanted the office timings had no route back except the browser button, and
        on the installed PWA there is no browser button.
      */}
      {/*
        A full-width navy bar rather than a bare text link: at the top of a signed-out page it
        reads as the way out, and it lines up with the card below it instead of floating.
      */}
      <BackButton
        to="/welcome"
        label={t('auth.backToWelcome')}
        className="mb-3 w-full justify-start rounded-lg bg-primary px-4 py-2 text-primary-foreground hover:bg-primary-hover hover:text-primary-foreground"
      />

      {/*
        Masthead. Stacked on a phone, where width is the scarce dimension; a row from 640px up,
        where height is. The row is what buys the page its fit on a 720px-tall laptop — the logo
        sits beside the wordmark instead of stacking 136px of column above the card.
      */}
      <div className="mb-4 flex flex-col items-center gap-2 text-center sm:flex-row sm:gap-3 sm:text-left">
        <img src={logo} alt="" width={64} height={64} className="shrink-0" />
        <div className="min-w-0">
          <h1 className="text-title text-foreground">{t('appName')}</h1>
          <p className="text-body text-muted-foreground">{t('auth.subtitle')}</p>
        </div>
      </div>

      {/* Segmented mode selector — UI only, no navigation, no extra API. */}
      <div
        role="tablist"
        aria-label={t('auth.login')}
        className="mb-3 grid grid-cols-2 gap-1 rounded-lg border border-border bg-secondary p-1"
      >
        {TABS.map(({ key, icon: Icon, labelKey }) => {
          const active = mode === key;
          return (
            <button
              key={key}
              type="button"
              role="tab"
              id={`login-tab-${key}`}
              aria-selected={active}
              aria-controls="login-panel"
              onClick={() => setMode(key)}
              className={cn(
                'flex min-h-11 items-center justify-center gap-2 rounded-md px-3 text-body font-medium transition-[background-color,color,box-shadow] duration-200',
                active
                  ? 'bg-card text-primary shadow-sm'
                  : 'text-muted-foreground hover:text-foreground',
              )}
            >
              <Icon className="h-4 w-4" aria-hidden="true" />
              {t(labelKey)}
            </button>
          );
        })}
      </div>

      {/* One card, one form. Mode swaps copy/accents only; values persist. */}
      <div
        role="tabpanel"
        id="login-panel"
        aria-labelledby={`login-tab-${mode}`}
        className="rounded-lg border border-border bg-card p-5 shadow-sm sm:p-6"
      >
        {/*
          The mode illustration moved inside the form's heading block, which renders it beside
          the heading rather than as its own centred row. It cost 84px of column there and
          costs nothing here, because the heading is already taller than the badge.
        */}
        <LoginForm mode={mode} />
      </div>
    </div>
  );
}
