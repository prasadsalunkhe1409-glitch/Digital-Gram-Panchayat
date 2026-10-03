import tailwindcssAnimate from 'tailwindcss-animate';

/** @type {import('tailwindcss').Config} */
export default {
  // Light theme only: no dark CSS, no `dark:` utilities, and an impossible selector so
  // the OS preference can never switch anything.
  darkMode: ['selector', '[data-theme="never"]'],
  content: ['./index.html', './src/**/*.{js,jsx}'],
  theme: {
    container: {
      center: true,
      padding: '1rem',
    },
    extend: {
      colors: {
        border: 'hsl(var(--border))',
        input: 'hsl(var(--input))',
        ring: 'hsl(var(--ring))',
        background: 'hsl(var(--background))',
        foreground: 'hsl(var(--foreground))',
        surface: 'hsl(var(--surface))',
        gold: {
          DEFAULT: 'hsl(var(--accent-gold))',
          hover: 'hsl(var(--accent-gold-hover))',
          foreground: 'hsl(var(--accent-gold-foreground))',
        },
        interactive: {
          DEFAULT: 'hsl(var(--interactive))',
          strong: 'hsl(var(--interactive-strong))',
          foreground: 'hsl(var(--interactive-foreground))',
        },
        primary: {
          DEFAULT: 'hsl(var(--primary))',
          hover: 'hsl(var(--primary-hover))',
          foreground: 'hsl(var(--primary-foreground))',
          subtle: 'hsl(var(--primary-subtle))',
        },
        secondary: {
          DEFAULT: 'hsl(var(--secondary))',
          foreground: 'hsl(var(--secondary-foreground))',
        },
        slate: { DEFAULT: 'hsl(var(--slate))' },
        // Teal — sparing secondary accent for informational highlights.
        teal: {
          DEFAULT: 'hsl(var(--teal))',
          foreground: 'hsl(var(--teal-foreground))',
        },
        // Body copy sits a step darker than muted for long-form readability.
        body: { foreground: 'hsl(var(--body-foreground))' },
        pending: { DEFAULT: 'hsl(var(--pending))' },
        muted: {
          DEFAULT: 'hsl(var(--muted))',
          foreground: 'hsl(var(--muted-foreground))',
        },
        accent: {
          DEFAULT: 'hsl(var(--accent))',
          foreground: 'hsl(var(--accent-foreground))',
        },
        card: {
          DEFAULT: 'hsl(var(--card))',
          foreground: 'hsl(var(--card-foreground))',
        },
        // Semantic status colours — solid for fills, `subtle` for chip/callout backgrounds.
        success: {
          DEFAULT: 'hsl(var(--success))',
          foreground: 'hsl(var(--success-foreground))',
          subtle: 'hsl(var(--success-subtle))',
          strong: 'hsl(var(--success-strong))',
        },
        warning: {
          DEFAULT: 'hsl(var(--warning))',
          foreground: 'hsl(var(--warning-foreground))',
          subtle: 'hsl(var(--warning-subtle))',
          strong: 'hsl(var(--warning-strong))',
        },
        info: {
          DEFAULT: 'hsl(var(--info))',
          foreground: 'hsl(var(--info-foreground))',
          subtle: 'hsl(var(--info-subtle))',
          strong: 'hsl(var(--info-strong))',
        },
        destructive: {
          DEFAULT: 'hsl(var(--destructive))',
          foreground: 'hsl(var(--destructive-foreground))',
          subtle: 'hsl(var(--destructive-subtle))',
          strong: 'hsl(var(--destructive-strong))',
        },
      },
      borderRadius: {
        '2xl': 'calc(var(--radius) + 12px)', // 22px — hero / large media surfaces
        xl: 'calc(var(--radius) + 4px)', // 14px — cards, media
        lg: 'var(--radius)', // 10px — buttons, controls
        md: 'calc(var(--radius) - 2px)', // 8px — inner controls
        sm: 'calc(var(--radius) - 4px)', // 6px — chips, inner elements
      },
      // Type scale — one ramp, used by every screen. Government-portal proportions:
      // a large display, a clear page heading, then a 16px reading body.
      fontSize: {
        display: [
          '2.125rem',
          { lineHeight: '2.5rem', fontWeight: '700', letterSpacing: '-0.02em' },
        ],
        title: ['1.5rem', { lineHeight: '2rem', fontWeight: '600', letterSpacing: '-0.01em' }],
        section: ['1.125rem', { lineHeight: '1.625rem', fontWeight: '600' }],
        body: ['1rem', { lineHeight: '1.5rem' }],
        label: ['0.875rem', { lineHeight: '1.25rem', fontWeight: '500' }],
        caption: ['0.8125rem', { lineHeight: '1.125rem' }],
      },
      // Elevation — soft, layered, government-grade. Resting cards sit on `sm`; hover/raised
      // uses `md`; popovers/menus `lg`; modals `overlay`. Never harsh, always double-layered.
      boxShadow: {
        xs: '0 1px 2px 0 rgb(16 24 40 / 0.05)',
        sm: '0 1px 2px 0 rgb(16 24 40 / 0.06), 0 1px 3px 0 rgb(16 24 40 / 0.09)',
        md: '0 2px 4px -1px rgb(16 24 40 / 0.06), 0 6px 16px -2px rgb(16 24 40 / 0.12)',
        lg: '0 8px 24px -4px rgb(16 24 40 / 0.14), 0 4px 8px -4px rgb(16 24 40 / 0.08)',
        overlay: '0 16px 48px -8px rgb(16 24 40 / 0.28)',
      },
      keyframes: {
        shimmer: { '100%': { transform: 'translateX(100%)' } },
      },
      animation: {
        shimmer: 'shimmer 1.6s infinite',
      },
      transitionDuration: { DEFAULT: '150ms' },
    },
  },
  plugins: [tailwindcssAnimate],
};
