import { render, screen, fireEvent, within } from '@testing-library/react';
import { MemoryRouter, Routes, Route } from 'react-router-dom';
import { vi } from 'vitest';
import { Header } from '@/layouts/Header';
import { MobileSidebar } from '@/layouts/Sidebar';
import { Dialog } from '@/components/ui/dialog';
import { ThemeProvider, LanguageProvider } from '@/store';

// The account footer inside the drawer reads the signed-in officer.
vi.mock('@/hooks/useAuth', () => ({
  useAuth: () => ({
    user: { fullName: 'Panchayat Officer', email: 'officer@example.test' },
    logout: vi.fn(),
  }),
}));

const renderAt = (ui, route = '/') =>
  render(
    <ThemeProvider>
      <LanguageProvider>
        <MemoryRouter initialEntries={[route]}>
          <Routes>
            <Route path="*" element={ui} />
          </Routes>
        </MemoryRouter>
      </LanguageProvider>
    </ThemeProvider>,
  );

describe('Header breadcrumb', () => {
  // The header used to hardcode dashboard.title, so every screen claimed to be "Dashboard".
  it.each([
    ['/', 'Dashboard'],
    ['/complaints', 'Complaints'],
    ['/tax', 'Tax Records'],
    ['/village', 'Village Profile'],
  ])('names the current section on %s', (route, expected) => {
    renderAt(<Header onOpenNav={() => {}} />, route);
    expect(within(screen.getByRole('banner')).getByText(expected)).toBeInTheDocument();
  });

  it('keeps naming the section on a detail route', () => {
    renderAt(<Header onOpenNav={() => {}} />, '/complaints/abc123');
    expect(within(screen.getByRole('banner')).getByText('Complaints')).toBeInTheDocument();
  });

  it('renders no heading of its own, leaving the page <h1> unique', () => {
    const { container } = renderAt(<Header onOpenNav={() => {}} />, '/complaints');
    expect(container.querySelectorAll('h1, h2, h3, h4, h5, h6')).toHaveLength(0);
  });

  it('opens the navigation drawer from the menu button', () => {
    const onOpenNav = vi.fn();
    renderAt(<Header onOpenNav={onOpenNav} />, '/');
    fireEvent.click(screen.getByRole('button', { name: 'Open menu' }));
    expect(onOpenNav).toHaveBeenCalledTimes(1);
  });

  it('gives the language and theme toggles translated names', () => {
    renderAt(<Header onOpenNav={() => {}} />, '/');
    // These were hardcoded English strings before, invisible to the Marathi catalogue.
    expect(screen.getByRole('button', { name: 'Switch language' })).toBeInTheDocument();
    expect(
      screen.getByRole('button', { name: /Switch to (dark|light) theme/ }),
    ).toBeInTheDocument();
  });
});

describe('MobileSidebar', () => {
  // Below md the rail is hidden; without this drawer there was no navigation at all.
  it('renders nothing while closed', () => {
    renderAt(<MobileSidebar open={false} onClose={() => {}} />);
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
  });

  it('exposes every section as a modal dialog when open', () => {
    renderAt(<MobileSidebar open onClose={() => {}} />);
    const dialog = screen.getByRole('dialog');
    expect(dialog).toHaveAttribute('aria-modal', 'true');
    const hrefs = within(dialog)
      .getAllByRole('link')
      .map((a) => a.getAttribute('href'));
    expect(hrefs).toEqual([
      '/',
      '/complaints',
      '/notices',
      '/dakhala',
      '/tax',
      '/schemes',
      '/users',
      '/notifications',
      '/reports',
      '/audit',
      '/village',
      '/events',
      // Phase 4 governance modules — an officer on a phone must reach these too.
      '/meetings',
      // The village service schedule, managed from the same drawer.
      '/timetable',
      '/projects',
      '/polls',
      '/documents',
      '/feedback',
      '/help',
    ]);
  });

  it('offers the account and sign-out that the hidden rail would have', () => {
    renderAt(<MobileSidebar open onClose={() => {}} />);
    const dialog = screen.getByRole('dialog');
    expect(within(dialog).getByText('Panchayat Officer')).toBeInTheDocument();
    expect(within(dialog).getByRole('button', { name: /log out/i })).toBeInTheDocument();
  });

  it('closes on Escape', () => {
    const onClose = vi.fn();
    renderAt(<MobileSidebar open onClose={onClose} />);
    fireEvent.keyDown(document, { key: 'Escape' });
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it('closes when the scrim is clicked', () => {
    const onClose = vi.fn();
    renderAt(<MobileSidebar open onClose={onClose} />);
    fireEvent.click(screen.getAllByRole('button', { name: 'Close' })[0]);
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it('moves focus into the drawer and locks the page behind it', () => {
    const { unmount } = renderAt(<MobileSidebar open onClose={() => {}} />);
    expect(screen.getByRole('dialog').contains(document.activeElement)).toBe(true);
    expect(document.body.style.overflow).toBe('hidden');
    unmount();
    expect(document.body.style.overflow).not.toBe('hidden');
  });

  it('wraps Tab at the end of the drawer, as aria-modal promises', () => {
    renderAt(<MobileSidebar open onClose={() => {}} />);
    const dialog = screen.getByRole('dialog');
    const focusable = dialog.querySelectorAll('a[href], button:not([disabled])');
    const last = focusable[focusable.length - 1];
    last.focus();
    fireEvent.keyDown(document, { key: 'Tab' });
    expect(document.activeElement).toBe(focusable[0]);
  });
});

describe('Dialog viewport fit', () => {
  // A tall dialog on a short viewport used to clip its own submit button off-screen while
  // body{overflow:hidden} removed any way to scroll to it.
  it('caps its height and scrolls the body, keeping the footer reachable', () => {
    render(
      <Dialog
        open
        onClose={() => {}}
        title="Broadcast"
        footer={<button type="button">Send</button>}
      >
        <p>Body</p>
      </Dialog>,
    );
    const panel = screen.getByRole('dialog');
    expect(panel.className).toContain('max-h-[calc(100dvh-2rem)]');
    expect(panel.className).toContain('flex-col');

    const scroller = panel.querySelector('.overflow-y-auto');
    expect(scroller).not.toBeNull();
    expect(screen.getByRole('button', { name: 'Send' })).toBeInTheDocument();
  });
});
