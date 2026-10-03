import { NavLink } from 'react-router-dom';
import { Home, ClipboardList, Megaphone, FileText, User } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { cn } from '@/utils/cn';

const items = [
  { to: '/', label: 'nav.home', icon: Home, end: true },
  { to: '/complaints', label: 'nav.complaints', icon: ClipboardList },
  { to: '/notices', label: 'nav.notices', icon: Megaphone },
  { to: '/dakhala', label: 'nav.dakhala', icon: FileText },
  { to: '/profile', label: 'nav.profile', icon: User },
];

/**
 * The citizen's primary navigation.
 *
 * Navy to match the header, so the two bands frame the page as one official surface. The
 * selected destination is a gold pill carrying a navy icon — gold appears nowhere else in
 * this bar, which is what makes "you are here" readable at a glance and at arm's length.
 * Routes, order and behaviour are untouched.
 */
export function BottomNav() {
  const { t } = useTranslation();

  return (
    <nav
      aria-label={t('nav.home')}
      // pb-safe keeps the bar clear of the iOS/Android home indicator when installed.
      // min-h pins the bar to the token the page padding and the help button measure from,
      // so the three cannot drift apart.
      className="fixed inset-x-0 bottom-0 z-20 min-h-[calc(var(--citizen-bottom-nav-height)+env(safe-area-inset-bottom))] border-t border-white/10 bg-primary pb-[env(safe-area-inset-bottom)] shadow-[0_-1px_3px_rgba(15,23,41,0.18)]"
    >
      <ul className="mx-auto flex max-w-md items-stretch justify-between px-1">
        {items.map(({ to, label, icon: Icon, end }) => (
          // min-w-0 lets a cell shrink below its label's intrinsic width. Without it, flex
          // items default to min-width:auto and a longer label (Marathi runs wider than the
          // English one) pushes the whole bar past a 320px viewport.
          <li key={to} className="min-w-0 flex-1">
            <NavLink
              to={to}
              end={end}
              className={({ isActive }) =>
                cn(
                  'group flex min-h-[56px] flex-col items-center justify-center gap-1 py-1.5',
                  'text-[0.6875rem] font-medium tracking-tight transition-colors duration-150',
                  'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-white',
                  isActive
                    ? 'text-gold'
                    : 'text-primary-foreground/85 hover:text-primary-foreground',
                )
              }
            >
              {({ isActive }) => (
                <>
                  {/* Material-style active pill behind the icon — the only "selected" affordance. */}
                  <span
                    className={cn(
                      'flex h-7 w-full max-w-14 items-center justify-center rounded-full transition-colors duration-150',
                      isActive ? 'bg-gold text-gold-foreground' : 'group-hover:bg-white/15',
                    )}
                  >
                    <Icon className="h-5 w-5" aria-hidden="true" />
                  </span>
                  <span className="max-w-full truncate px-0.5">{t(label)}</span>
                </>
              )}
            </NavLink>
          </li>
        ))}
      </ul>
    </nav>
  );
}
