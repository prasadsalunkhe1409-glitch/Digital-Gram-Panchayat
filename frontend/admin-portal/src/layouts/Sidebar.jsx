import { useEffect, useRef } from 'react';
import { NavLink, useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import logo from '@dgp/shared/assets/logo.svg';
import {
  LayoutDashboard,
  ClipboardList,
  Megaphone,
  FileText,
  Landmark,
  BookOpen,
  Users,
  BarChart3,
  ScrollText,
  Home,
  CalendarDays,
  CalendarClock,
  LogOut,
  HelpCircle,
  X,
  Gavel,
  HardHat,
  Vote,
} from 'lucide-react';
import { cn } from '@/utils/cn';
import { useAuth } from '@/hooks/useAuth';
import { Button } from '@/components/ui/button';

const items = [
  { to: '/', label: 'nav.dashboard', icon: LayoutDashboard, end: true },
  { to: '/complaints', label: 'nav.complaints', icon: ClipboardList },
  { to: '/notices', label: 'nav.notices', icon: Megaphone },
  { to: '/dakhala', label: 'nav.dakhala', icon: FileText },
  { to: '/tax', label: 'nav.tax', icon: Landmark },
  { to: '/schemes', label: 'nav.schemes', icon: BookOpen },
  { to: '/users', label: 'nav.users', icon: Users },
  { to: '/reports', label: 'nav.reports', icon: BarChart3 },
  { to: '/audit', label: 'nav.audit', icon: ScrollText },
  { to: '/village', label: 'nav.village', icon: Home },
  { to: '/events', label: 'nav.events', icon: CalendarDays },
  { to: '/meetings', label: 'nav.meetings', icon: Gavel },
  { to: '/timetable', label: 'nav.timetable', icon: CalendarClock },
  { to: '/projects', label: 'nav.projects', icon: HardHat },
  { to: '/polls', label: 'nav.polls', icon: Vote },
  { to: '/help', label: 'nav.help', icon: HelpCircle },
];

/**
 * Brand mark — grounds the portal as an official product, not a generic dashboard.
 *
 * The same `logo.svg` the citizen app uses, not a lucide glyph on a themed square. The two were
 * different marks in different colours, so the officer portal and the citizen portal read as two
 * products rather than two doors into one panchayat. The file lives in `@dgp/shared` precisely so
 * there is one mark to change.
 */
function Brand() {
  const { t } = useTranslation();
  return (
    <span className="flex min-w-0 items-center gap-2.5">
      <img src={logo} alt="" aria-hidden="true" className="h-8 w-8 shrink-0 rounded-md" />
      <span className="truncate text-section font-semibold text-primary">{t('appName')}</span>
    </span>
  );
}

function NavItems() {
  const { t } = useTranslation();

  return items.map(({ to, label, icon: Icon, end }) => (
    <NavLink
      key={to}
      to={to}
      end={end}
      className={({ isActive }) =>
        cn(
          // 44px min height keeps every row a comfortable touch target in the mobile drawer.
          'group relative flex min-h-11 items-center gap-3 rounded-md pl-4 pr-3 py-2 text-body font-medium',
          // Navy at rest rather than grey: a government navigation list should read as one
          // family, and muted grey made every section look half-disabled next to the active
          // one. Hover is the page colour, so the row lifts off the warm sidebar without
          // introducing a third surface.
          'text-primary transition-colors duration-150',
          'hover:bg-background hover:text-primary',
          'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-ring',
          isActive && 'bg-primary-subtle text-primary',
        )
      }
    >
      {({ isActive }) => (
        <>
          {/*
            The rail marks the section — quieter than a full-width fill, and in the action
            blue so it reads as the one live thing in the list rather than more navy.
          */}
          <span
            aria-hidden="true"
            className={cn(
              'absolute inset-y-1.5 left-0 w-1 rounded-full transition-colors duration-150',
              isActive ? 'bg-interactive' : 'bg-transparent',
            )}
          />
          <Icon className="h-4 w-4 shrink-0" aria-hidden="true" />
          <span className="truncate">{t(label)}</span>
        </>
      )}
    </NavLink>
  ));
}

/** Signed-in officer plus the sign-out control, shared by the fixed rail and the drawer. */
function AccountFooter() {
  const { t } = useTranslation();
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  const handleLogout = async () => {
    await logout();
    navigate('/login', { replace: true });
  };

  return (
    <div className="border-t border-border p-3">
      {user ? (
        <div className="mb-2 flex items-center gap-2.5 px-1">
          <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-secondary text-caption font-semibold text-secondary-foreground">
            {user.fullName?.slice(0, 1)?.toUpperCase()}
          </span>
          <span className="min-w-0">
            <span className="block truncate text-label font-medium text-primary">
              {user.fullName}
            </span>
            <span className="block truncate text-caption text-muted-foreground">{user.email}</span>
          </span>
        </div>
      ) : null}
      <Button
        variant="ghost"
        size="sm"
        className="w-full justify-start text-primary hover:bg-primary-subtle hover:text-primary"
        onClick={handleLogout}
      >
        <LogOut className="h-4 w-4" />
        {t('auth.logout')}
      </Button>
    </div>
  );
}

/** Fixed navigation rail. Desktop and large tablets only. */
export function Sidebar() {
  const { t } = useTranslation();

  return (
    <aside className="sticky top-0 hidden h-dvh w-64 shrink-0 flex-col border-r border-border bg-card md:flex">
      <div className="flex h-16 items-center border-b border-border px-5">
        <Brand />
      </div>

      <nav
        aria-label={t('nav.primary')}
        className="dgp-scroll flex-1 space-y-1 overflow-y-auto p-3"
      >
        <NavItems />
      </nav>

      <AccountFooter />
    </aside>
  );
}

/**
 * Off-canvas navigation for phones and portrait tablets, where the rail is hidden. Without it
 * an officer below 768px could reach a screen and then had no way to leave it — there was no
 * navigation on the page at all.
 */
export function MobileSidebar({ open, onClose }) {
  const { t } = useTranslation();
  const panelRef = useRef(null);

  useEffect(() => {
    if (!open) return undefined;

    const onKeyDown = (e) => {
      if (e.key === 'Escape') {
        onClose();
        return;
      }
      // aria-modal promises focus stays inside, so Tab has to wrap at both ends.
      if (e.key !== 'Tab') return;
      const focusable = panelRef.current?.querySelectorAll('a[href], button:not([disabled])');
      if (!focusable?.length) return;
      const first = focusable[0];
      const last = focusable[focusable.length - 1];
      if (e.shiftKey && document.activeElement === first) {
        e.preventDefault();
        last.focus();
      } else if (!e.shiftKey && document.activeElement === last) {
        e.preventDefault();
        first.focus();
      }
    };

    document.addEventListener('keydown', onKeyDown);
    // Move focus into the drawer so the keyboard and screen reader follow it open.
    panelRef.current?.querySelector('a, button')?.focus();
    // Stop the page behind the overlay from scrolling under the drawer.
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';

    return () => {
      document.removeEventListener('keydown', onKeyDown);
      document.body.style.overflow = previousOverflow;
    };
  }, [open, onClose]);

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 md:hidden">
      <button
        type="button"
        aria-label={t('common.close')}
        onClick={onClose}
        className="absolute inset-0 h-full w-full cursor-default bg-foreground/40 backdrop-blur-[2px]"
      />
      <div
        ref={panelRef}
        role="dialog"
        aria-modal="true"
        aria-label={t('nav.primary')}
        className="absolute inset-y-0 left-0 flex w-72 max-w-[85vw] flex-col border-r border-border bg-card shadow-lg"
      >
        <div className="flex h-16 items-center justify-between gap-2 border-b border-border px-4">
          <Brand />
          <Button variant="ghost" size="icon" onClick={onClose} aria-label={t('common.close')}>
            <X className="h-5 w-5" />
          </Button>
        </div>

        <nav
          aria-label={t('nav.primary')}
          className="dgp-scroll flex-1 space-y-1 overflow-y-auto p-3"
        >
          <NavItems />
        </nav>

        <AccountFooter />
      </div>
    </div>
  );
}
