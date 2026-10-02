import { createContext, useContext, useEffect, useMemo } from 'react';

const STORAGE_KEY = 'dgp_theme';

const ThemeContext = createContext(undefined);

/**
 * The portal is light, always.
 *
 * It used to offer a dark theme, follow the operating system's preference and remember the
 * choice. All three are gone: a government service reads as one thing to everybody, and the
 * accessibility work behind the light palette was measured against the light surfaces only.
 *
 * The provider stays rather than being deleted so `data-theme` is still pinned explicitly —
 * leaving the attribute off would let a future stylesheet's media query decide — and so any
 * remaining consumer gets a defined value instead of throwing. It no longer exposes a setter:
 * a stale `toggleTheme()` call now fails at build time rather than silently doing nothing.
 */
export function ThemeProvider({ children }) {
  useEffect(() => {
    document.documentElement.setAttribute('data-theme', 'light');
    // Clear the remembered preference, so a browser that stored 'dark' before this change
    // does not keep carrying it around in localStorage for no reason.
    try {
      localStorage.removeItem(STORAGE_KEY);
    } catch {
      // Private mode or blocked storage: nothing to clean up, and nothing depends on it.
    }
  }, []);

  const value = useMemo(() => ({ theme: 'light' }), []);

  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>;
}

export function useTheme() {
  const ctx = useContext(ThemeContext);
  if (!ctx) throw new Error('useTheme must be used within ThemeProvider');
  return ctx;
}
