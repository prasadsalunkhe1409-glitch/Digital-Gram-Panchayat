/**
 * Empty-state artwork.
 *
 * Inline SVG rather than image files: it ships in the bundle (so it renders offline, which
 * matters here), costs no request, and — because it paints with `currentColor` and the theme
 * tokens — it is correct in both light and dark without a second asset. Every piece is
 * decorative; the `EmptyState` text carries the meaning, so these are aria-hidden.
 */

const COMMON = 'h-28 w-28 text-primary';

function Frame({ children, className }) {
  return (
    <svg
      viewBox="0 0 120 120"
      fill="none"
      role="presentation"
      aria-hidden="true"
      className={className ?? COMMON}
    >
      {/* Soft disc behind every illustration, so the set reads as one family. */}
      <circle cx="60" cy="60" r="52" className="fill-primary/10" />
      {children}
    </svg>
  );
}

const stroke = {
  stroke: 'currentColor',
  strokeWidth: 3,
  strokeLinecap: 'round',
  strokeLinejoin: 'round',
};

/** A notice board with nothing pinned to it. */
export function NoNoticesArt(props) {
  return (
    <Frame {...props}>
      <rect x="34" y="32" width="52" height="46" rx="4" {...stroke} />
      <path d="M60 78v14M46 92h28" {...stroke} />
      <path d="M46 46h28M46 56h20" {...stroke} className="opacity-50" />
    </Frame>
  );
}

/** An open folder — schemes yet to be published. */
export function NoSchemesArt(props) {
  return (
    <Frame {...props}>
      <path
        d="M30 46a4 4 0 0 1 4-4h16l6 8h30a4 4 0 0 1 4 4v28a4 4 0 0 1-4 4H34a4 4 0 0 1-4-4V46Z"
        {...stroke}
      />
      <path d="M30 62h60" {...stroke} className="opacity-50" />
    </Frame>
  );
}

/** A calendar with no dates marked. */
export function NoEventsArt(props) {
  return (
    <Frame {...props}>
      <rect x="32" y="38" width="56" height="48" rx="5" {...stroke} />
      <path d="M32 54h56M46 32v12M74 32v12" {...stroke} />
      <circle cx="52" cy="68" r="3" className="fill-current opacity-40" />
      <circle cx="68" cy="68" r="3" className="fill-current opacity-40" />
    </Frame>
  );
}

/** A clipboard with a tick — nothing outstanding. */
export function NoComplaintsArt(props) {
  return (
    <Frame {...props}>
      <rect x="36" y="34" width="48" height="56" rx="5" {...stroke} />
      <path d="M50 34a4 4 0 0 1 4-4h12a4 4 0 0 1 4 4v6H50v-6Z" {...stroke} />
      <path d="M48 64l8 8 16-18" {...stroke} />
    </Frame>
  );
}

/** A certificate with a seal. */
export function NoCertificatesArt(props) {
  return (
    <Frame {...props}>
      <path
        d="M36 32h40a4 4 0 0 1 4 4v44a4 4 0 0 1-4 4H36a4 4 0 0 1-4-4V36a4 4 0 0 1 4-4Z"
        {...stroke}
      />
      <path d="M44 48h24M44 60h16" {...stroke} className="opacity-50" />
      <circle cx="78" cy="76" r="10" {...stroke} />
      <path d="M74 86l4 8 4-8" {...stroke} />
    </Frame>
  );
}

/** A quiet bell. */
export function NoNotificationsArt(props) {
  return (
    <Frame {...props}>
      <path d="M60 30a16 16 0 0 1 16 16v14l6 10H38l6-10V46a16 16 0 0 1 16-16Z" {...stroke} />
      <path d="M52 70a8 8 0 0 0 16 0" {...stroke} />
    </Frame>
  );
}

/** A rupee receipt — no dues. */
export function NoTaxArt(props) {
  return (
    <Frame {...props}>
      <path d="M40 30h40v58l-8-6-6 6-6-6-6 6-6-6-8 6V30Z" {...stroke} />
      <path d="M52 44h16M52 52h16M64 44c6 0 6 8 0 8h-8l12 12" {...stroke} className="opacity-70" />
    </Frame>
  );
}

/** A magnifier over an empty page — a search that matched nothing. */
export function NoResultsArt(props) {
  return (
    <Frame {...props}>
      <circle cx="54" cy="54" r="20" {...stroke} />
      <path d="M69 69 84 84" {...stroke} />
      <path d="M46 54h16" {...stroke} className="opacity-50" />
    </Frame>
  );
}

/** A download tray with nothing in it. */
export function NoDownloadsArt(props) {
  return (
    <Frame {...props}>
      <path d="M60 32v30" {...stroke} />
      <path d="M50 54l10 10 10-10" {...stroke} />
      <path d="M36 74v8a4 4 0 0 0 4 4h40a4 4 0 0 0 4-4v-8" {...stroke} />
    </Frame>
  );
}

/**
 * A cloud with the link struck through. Distinct from the error drawing on purpose: offline is
 * the citizen's connection and it will come back; a server error is ours and it will not fix
 * itself by walking up the hill.
 */
export function OfflineArt(props) {
  return (
    <Frame {...props}>
      <path d="M44 74a14 14 0 0 1 1-28 18 18 0 0 1 34-4 12 12 0 0 1 2 32H44Z" {...stroke} />
      <path d="M38 38l44 44" {...stroke} />
    </Frame>
  );
}

/** A building with a warning — something on our side failed. */
export function ServerErrorArt(props) {
  return (
    <Frame {...props}>
      <rect x="34" y="38" width="52" height="18" rx="4" {...stroke} />
      <rect x="34" y="64" width="52" height="18" rx="4" {...stroke} />
      <path d="M44 47h.01M44 73h.01" {...stroke} />
      <path d="M60 30v-8" {...stroke} className="opacity-50" />
      <path d="M74 47h4M74 73h4" {...stroke} className="opacity-50" />
    </Frame>
  );
}

/** A signpost pointing nowhere — the address does not exist. */
export function NotFoundArt(props) {
  return (
    <Frame {...props}>
      <path d="M60 34v52" {...stroke} />
      <path d="M60 42h22l8 8-8 8H60Z" {...stroke} />
      <path d="M60 64H38l-8 8 8 8h22Z" {...stroke} className="opacity-60" />
      <path d="M46 90h28" {...stroke} />
    </Frame>
  );
}

/** A clock over a calendar page — a schedule that has not been published yet. */
export function NoTimetableArt(props) {
  return (
    <Frame {...props}>
      <rect x="30" y="34" width="46" height="46" rx="4" {...stroke} />
      <path d="M30 46h46M44 28v10M62 28v10" {...stroke} />
      <circle cx="78" cy="74" r="18" {...stroke} />
      <path d="M78 64v10l7 5" {...stroke} />
    </Frame>
  );
}
