import { cn } from '@/utils/cn';
import { BackButton } from '@/components/BackButton';

/**
 * A module's title, on a soft branded band with the module's own motif behind it.
 *
 * It replaces a bare `<h1>` on a white page. The band costs no extra vertical space worth
 * speaking of — the heading moves into it rather than sitting under it — so a 320px phone
 * loses nothing, and the module announces itself the way a government service should.
 *
 * The motif is clipped by the band and sits at low opacity behind the text. It is drawn at the
 * right edge and pushed off-screen below `sm`, because at 320px there is no room for a picture
 * and a Marathi heading and an action button in one row: the heading wins.
 *
 * `backTo` is optional and sits above the band rather than inside it, so the way out of a
 * module is in the same place on every module screen. Home does not use this component, which
 * is why there is no back control on the one page that has no parent.
 */
export function ModuleHeader({ art: Art, title, description, action, backTo, className }) {
  return (
    <>
      {backTo ? <BackButton to={backTo} /> : null}
      <div
        className={cn(
          'relative isolate mb-5 overflow-hidden rounded-2xl border border-border',
          'bg-gradient-to-r from-primary-subtle via-primary-subtle/40 to-card',
          'px-4 py-4 sm:px-5',
          className,
        )}
      >
        {Art ? (
          <div
            aria-hidden="true"
            className="pointer-events-none absolute -right-4 -top-2 hidden h-[130%] text-primary opacity-[0.14] sm:block"
          >
            <Art className="h-full w-auto" />
          </div>
        ) : null}

        <div className="relative flex flex-wrap items-center justify-between gap-3">
          <div className="min-w-0">
            <h1 className="text-title text-foreground">{title}</h1>
            {description ? (
              <p className="mt-1 text-body text-muted-foreground">{description}</p>
            ) : null}
          </div>
          {action ? <div className="shrink-0">{action}</div> : null}
        </div>
      </div>
    </>
  );
}
