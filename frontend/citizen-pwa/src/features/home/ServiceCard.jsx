import { Link } from 'react-router-dom';
import { ChevronRight } from 'lucide-react';

/**
 * One citizen service, as a government-service tile.
 *
 * The services grid used to be icon-and-caption squares — compact, but a villager reading
 * "Dakhala" had no way to know what it does without opening it. Each tile now carries a line
 * of plain description and a visible way in.
 *
 * One component for every service, deliberately: the previous grid built its markup inline,
 * so any change to a tile had to be made in one place and remembered in the next.
 */
export function ServiceCard({ to, icon: Icon, title, description, cta }) {
  return (
    <Link
      to={to}
      className="group flex min-h-[7.5rem] min-w-0 flex-col gap-2 rounded-xl border border-border bg-card p-4 shadow-xs transition-[box-shadow,border-color] duration-150 hover:border-primary/40 hover:shadow-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
    >
      <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-primary-subtle">
        <Icon className="h-5 w-5 text-primary" aria-hidden="true" />
      </span>

      <span className="min-w-0">
        <span className="block truncate text-body font-semibold text-foreground">{title}</span>
        {description ? (
          <span className="mt-0.5 block text-caption leading-snug text-muted-foreground">
            {description}
          </span>
        ) : null}
      </span>

      <span className="mt-auto inline-flex items-center gap-1 text-caption font-medium text-primary">
        {cta}
        {/* Decorative: the link's own accessible name is the title and description above. */}
        <ChevronRight
          className="h-3.5 w-3.5 transition-transform duration-150 group-hover:translate-x-0.5"
          aria-hidden="true"
        />
      </span>
    </Link>
  );
}
