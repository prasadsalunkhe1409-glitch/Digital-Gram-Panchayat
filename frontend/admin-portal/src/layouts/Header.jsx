import { useLocation } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { Menu } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useLanguage } from '@/store';

/** Prefix match, so /complaints/:id still reads as "Complaints". */
const SECTIONS = [
  ['/complaints', 'nav.complaints'],
  ['/notices', 'nav.notices'],
  ['/dakhala', 'nav.dakhala'],
  ['/tax', 'nav.tax'],
  ['/schemes', 'nav.schemes'],
  ['/users', 'nav.users'],
  ['/reports', 'nav.reports'],
  ['/audit', 'nav.audit'],
  ['/village', 'nav.village'],
  ['/events', 'nav.events'],
  ['/meetings', 'nav.meetings'],
  ['/projects', 'nav.projects'],
  ['/polls', 'nav.polls'],
  ['/help', 'nav.help'],
];

function sectionKey(pathname) {
  const hit = SECTIONS.find(([prefix]) => pathname.startsWith(prefix));
  return hit ? hit[1] : 'nav.dashboard';
}

export function Header({ onOpenNav }) {
  const { t } = useTranslation();
  const { language, setLanguage } = useLanguage();
  const { pathname } = useLocation();

  return (
    <header className="sticky top-0 z-20 flex h-16 items-center justify-between gap-2 border-b border-primary-hover bg-primary px-4 text-primary-foreground md:px-6">
      <div className="flex min-w-0 items-center gap-2">
        <Button
          variant="ghost"
          size="icon"
          className="md:hidden text-primary-foreground hover:bg-primary-foreground/10 hover:text-primary-foreground"
          onClick={onOpenNav}
          aria-label={t('nav.openMenu')}
        >
          <Menu className="h-5 w-5" />
        </Button>

        {/*
         * A breadcrumb, not a heading. The header used to hardcode `dashboard.title`, so every
         * screen announced itself as "Dashboard" — and it did so in an <h1>, giving each page
         * two competing top-level headings. The page's own <h1> is now the only one.
         */}
        <nav aria-label={t('nav.breadcrumb')} className="min-w-0">
          <ol className="flex min-w-0 items-center gap-1.5 text-caption text-primary-foreground/75">
            <li className="hidden shrink-0 sm:block">{t('nav.portalLabel')}</li>
            <li aria-hidden="true" className="hidden shrink-0 sm:block">
              /
            </li>
            <li className="truncate text-label font-medium text-primary-foreground">
              {t(sectionKey(pathname))}
            </li>
          </ol>
        </nav>
      </div>

      <div className="flex shrink-0 items-center gap-1">
        <Button
          variant="ghost"
          size="sm"
          className="text-primary-foreground hover:bg-primary-foreground/10 hover:text-primary-foreground"
          onClick={() => setLanguage(language === 'en' ? 'mr' : 'en')}
          aria-label={t('nav.toggleLanguage')}
        >
          {language === 'en' ? 'मर' : 'EN'}
        </Button>
      </div>
    </header>
  );
}
