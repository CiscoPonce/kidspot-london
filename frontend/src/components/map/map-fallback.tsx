'use client';

export interface MapFallbackProps {
  variant?: 'full' | 'snippet';
  title?: string;
  message?: string;
}

/**
 * Rendered in place of a MapLibre map when WebGL is unavailable or when the
 * map fails to initialize. Keeps the rest of the page (search results, venue
 * list, etc.) fully functional instead of letting a WebGL throw bubble up to
 * the global error boundary.
 */
export function MapFallback({
  variant = 'full',
  title = 'Map unavailable in this browser',
  message = 'Your browser has WebGL disabled, so the interactive map can\u2019t load. Search results below are unaffected — try enabling hardware acceleration, updating your GPU drivers, or opening KidSpot in a different browser to view the map.',
}: MapFallbackProps) {
  if (variant === 'snippet') {
    return (
      <div
        className="relative w-full rounded-lg overflow-hidden bg-secondary-800/40 border border-border/50 flex items-center justify-center"
        style={{ height: 150 }}
        role="img"
        aria-label="Map preview unavailable"
      >
        <div className="flex items-center gap-2 px-4 text-center">
          <span className="material-symbols-outlined text-text-muted text-xl">
            map_off
          </span>
          <p className="text-xs font-bold uppercase tracking-widest text-text-muted">
            Map preview unavailable
          </p>
        </div>
      </div>
    );
  }

  return (
    <div
      className="relative w-full h-full flex items-center justify-center bg-secondary-800/40"
      role="status"
      aria-live="polite"
    >
      <div className="max-w-md text-center px-6 py-10 space-y-4">
        <div className="mx-auto w-14 h-14 rounded-2xl bg-secondary-800 border border-border/50 flex items-center justify-center">
          <span className="material-symbols-outlined text-3xl text-text-muted">
            map_off
          </span>
        </div>
        <h3 className="text-base font-black uppercase tracking-widest text-text-main">
          {title}
        </h3>
        <p className="text-sm text-text-muted leading-relaxed">{message}</p>
      </div>
    </div>
  );
}
