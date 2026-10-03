import { useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import { X } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { cn } from '@/utils/cn';

/**
 * Modal shell for the admin portal.
 *
 * Four dialogs each hand-rolled `fixed inset-0 … bg-black/50` with a card inside, and none
 * of them closed on Escape, moved focus, or announced themselves as a dialog. This adds the
 * behaviour once: Escape and backdrop-click close, focus lands inside on open and returns to
 * the trigger on close, and the scrim uses the foreground token so it tracks the theme
 * rather than being pure black in both.
 */
export function Dialog({ open, onClose, title, description, children, footer, className }) {
  const { t } = useTranslation();
  const panelRef = useRef(null);
  const restoreRef = useRef(null);

  /*
   * `onClose` is held in a ref, and the effect below depends on `open` alone.
   *
   * Every caller passes an inline `onClose={() => setOpen(false)}`, so its identity changes on
   * each render. With `onClose` in the dependency array, one keystroke inside the dialog ran
   * the whole open/close effect again: the cleanup restored focus to the element that opened
   * the dialog, the re-run then captured *that* element as the new restore target and moved
   * focus to the panel — so the field lost focus after a single character, and the real
   * restore target was overwritten. Keeping the handler in a ref lets Escape always call the
   * latest one while the effect runs only when the dialog actually opens or closes.
   */
  const onCloseRef = useRef(onClose);
  onCloseRef.current = onClose;

  useEffect(() => {
    if (!open) return undefined;

    restoreRef.current = document.activeElement;
    // Focus the panel so the next Tab lands inside the dialog, not behind it.
    panelRef.current?.focus();

    const onKeyDown = (e) => {
      if (e.key === 'Escape') onCloseRef.current?.();
    };
    document.addEventListener('keydown', onKeyDown);

    // The page behind must not scroll while a modal owns the screen.
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';

    return () => {
      document.removeEventListener('keydown', onKeyDown);
      document.body.style.overflow = prevOverflow;
      restoreRef.current?.focus?.();
    };
  }, [open]);

  if (!open) return null;

  return createPortal(
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-foreground/50 p-4 backdrop-blur-[2px]"
      onMouseDown={(e) => {
        // Only a click that both starts and ends on the scrim should dismiss.
        if (e.target === e.currentTarget) onClose?.();
      }}
    >
      <div
        ref={panelRef}
        role="dialog"
        aria-modal="true"
        aria-label={title}
        tabIndex={-1}
        className={cn(
          // Cap to the viewport and scroll the middle. Without this a tall dialog on a short
          // viewport (a landscape phone, or a zoomed laptop) was clipped top and bottom with
          // its submit button off-screen — and `body { overflow: hidden }` meant there was no
          // way to scroll to it at all.
          'flex max-h-[calc(100dvh-2rem)] w-full max-w-md flex-col rounded-lg border border-border bg-card shadow-overlay outline-none',
          className,
        )}
      >
        <div className="flex shrink-0 items-start justify-between gap-3 p-5 pb-0">
          <div className="min-w-0">
            <h2 className="text-section text-foreground">{title}</h2>
            {description ? (
              <p className="mt-1 text-body text-muted-foreground">{description}</p>
            ) : null}
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label={t('common.close')}
            className="-mr-1 -mt-1 flex h-8 w-8 shrink-0 items-center justify-center rounded-md text-muted-foreground transition-colors duration-150 hover:bg-muted hover:text-foreground"
          >
            <X className="h-4 w-4" aria-hidden="true" />
          </button>
        </div>

        {children ? <div className="min-h-0 flex-1 overflow-y-auto p-5">{children}</div> : null}

        {footer ? (
          <div className="flex shrink-0 justify-end gap-2 border-t border-border p-4">{footer}</div>
        ) : null}
      </div>
    </div>,
    document.body,
  );
}
