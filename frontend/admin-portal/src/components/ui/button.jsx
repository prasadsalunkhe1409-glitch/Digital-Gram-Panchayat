import * as React from 'react';
import { Slot } from '@radix-ui/react-slot';
import { cva } from 'class-variance-authority';
import { Loader2 } from 'lucide-react';
import { cn } from '@/utils/cn';

/**
 * The one button. Every action uses a variant of this — no bespoke <button> styling elsewhere.
 * States are deliberate and quiet: hover darkens, press settles 1px, focus shows the standard
 * ring, `loading` swaps in a spinner and blocks input. Primary actions are 48px tall
 * (government-portal standard); the dense `sm` size stays ≥40px for comfortable tapping.
 */
const buttonVariants = cva(
  [
    'inline-flex select-none items-center justify-center gap-2 whitespace-nowrap rounded-lg',
    'text-[0.9375rem] font-medium transition-[background-color,box-shadow,transform] duration-150',
    'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring',
    'focus-visible:ring-offset-2 focus-visible:ring-offset-background',
    'active:translate-y-px disabled:pointer-events-none disabled:opacity-50',
  ].join(' '),
  {
    variants: {
      variant: {
        // Navy: the decision on a screen.
        default: 'bg-primary text-primary-foreground shadow-xs hover:bg-primary-hover',
        // The palette's interactive blue, at the darkened value — white on #3774E7 itself is
        // 4.37:1 and fails AA, while `interactive-strong` measures 6.17:1.
        secondary:
          'bg-interactive-strong text-interactive-foreground shadow-xs hover:bg-interactive-strong/90',
        // Gold carries dark ink, never white: ink measures 10.6:1 on it, white 1.7:1.
        accent: 'bg-gold text-gold-foreground shadow-xs hover:bg-gold-hover',
        // The old neutral fill, kept for the quiet actions that used `secondary` as a wash.
        muted: 'bg-secondary text-secondary-foreground hover:bg-secondary/70',
        destructive: 'bg-destructive text-destructive-foreground shadow-xs hover:bg-destructive/90',
        outline:
          'border border-input bg-card shadow-xs hover:bg-accent hover:text-accent-foreground',
        ghost: 'hover:bg-accent hover:text-accent-foreground',
        // A link is text, so it uses the value that passes as text on both surfaces.
        link: 'text-interactive-strong underline-offset-4 hover:underline',
      },
      size: {
        default: 'h-12 px-5 py-2',
        sm: 'h-10 px-3.5 text-[0.8125rem]',
        lg: 'h-[3.25rem] px-6 text-base',
        icon: 'h-11 w-11',
      },
    },
    defaultVariants: { variant: 'default', size: 'default' },
  },
);

const Button = React.forwardRef(
  ({ className, variant, size, asChild = false, loading = false, children, ...props }, ref) => {
    const Comp = asChild ? Slot : 'button';
    // `asChild` must receive exactly one child (e.g. a Link) — never inject a spinner into it.
    if (asChild) {
      return (
        <Comp className={cn(buttonVariants({ variant, size, className }))} ref={ref} {...props}>
          {children}
        </Comp>
      );
    }
    return (
      <Comp
        className={cn(buttonVariants({ variant, size, className }))}
        ref={ref}
        aria-busy={loading || undefined}
        {...props}
        disabled={loading || props.disabled}
      >
        {loading ? <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" /> : null}
        {children}
      </Comp>
    );
  },
);
Button.displayName = 'Button';

export { Button, buttonVariants };
