import { useTranslation } from 'react-i18next';
import { Link } from 'react-router-dom';
import { Wifi, WifiOff, Bell, Settings, HelpCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useLanguage } from '@/store';
import { useOnline } from '@/hooks/useOnline';
import { useUnreadCount } from '@/features/notifications/hooks';

export function Header() {
  const { t } = useTranslation();
  const { language, toggleLanguage } = useLanguage();
  const isOnline = useOnline();
  const { data: unread = 0 } = useUnreadCount();

  return (
    <header className="sticky top-0 z-20 flex items-center justify-between border-b border-border bg-card/95 px-4 py-3 pt-[max(0.75rem,env(safe-area-inset-top))] backdrop-blur supports-[backdrop-filter]:bg-card/80">
      <span className="truncate text-section text-foreground">{t('appName')}</span>

      <div className="flex items-center gap-1">
        <span
          className="mr-1 flex items-center gap-1 text-xs text-muted-foreground"
          aria-label={isOnline ? t('common.online') : t('common.offline')}
          title={isOnline ? t('common.online') : t('common.offline')}
        >
          {isOnline ? <Wifi className="h-4 w-4" /> : <WifiOff className="h-4 w-4" />}
        </span>

        <Button asChild variant="ghost" size="icon" aria-label={t('notif.title')}>
          <Link to="/notifications" className="relative">
            <Bell className="h-5 w-5" />
            {unread > 0 ? (
              <span className="absolute -right-0.5 -top-0.5 flex h-4 min-w-4 items-center justify-center rounded-full bg-destructive px-1 text-[10px] font-semibold text-destructive-foreground">
                {unread > 9 ? '9+' : unread}
              </span>
            ) : null}
          </Link>
        </Button>

        <Button
          variant="ghost"
          size="sm"
          onClick={toggleLanguage}
          aria-label={t('nav.toggleLanguage')}
        >
          {language === 'mr' ? 'EN' : 'मर'}
        </Button>

        <Button asChild variant="ghost" size="icon" aria-label={t('help.title')}>
          <Link to="/help">
            <HelpCircle className="h-5 w-5" />
          </Link>
        </Button>

        <Button asChild variant="ghost" size="icon" aria-label={t('settings.title')}>
          <Link to="/settings">
            <Settings className="h-5 w-5" />
          </Link>
        </Button>
      </div>
    </header>
  );
}
