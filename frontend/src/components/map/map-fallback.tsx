'use client';

export interface MapFallbackProps {
  variant?: 'full' | 'snippet';
  title?: string;
  message?: string;
}

/**
 * Rendered in place of a MapLibre map when WebGL is unavailable or the map
 * fails to initialize. Keeps the rest of the page functional and uses the
 * shared Material Design 3 surface tokens so it matches the rest of the UI.
 */
export function MapFallback({
  variant = 'full',
  title = 'Map view unavailable',
  message = "Your browser has WebGL disabled, so the interactive map can't load. Search results below still work — try enabling hardware acceleration, updating your GPU drivers, or opening KidSpot in a different browser to view the map.",
}: MapFallbackProps) {
  if (variant === 'snippet') {
    return (
      <div
        className="relative w-full rounded-lg overflow-hidden bg-surface-container border border-outline-variant flex items-center justify-center"
        style={{ height: 150 }}
        role="img"
        aria-label="Map preview unavailable"
      >
        <div className="flex items-center gap-2 px-4 text-center">
          <span className="material-symbols-outlined text-outline text-xl">
            map
          </span>
          <p className="text-xs font-semibold text-on-surface-variant">
            Map preview unavailable
          </p>
        </div>
      </div>
    );
  }

  return (
    <div
      className="relative w-full h-full flex items-center justify-center bg-surface-container border border-outline-variant rounded-3xl"
      role="status"
      aria-live="polite"
    >
      <div className="max-w-md text-center px-6 py-10 space-y-3">
        <div className="mx-auto w-14 h-14 rounded-2xl bg-primary-container/60 text-on-primary-container flex items-center justify-center">
          <span className="material-symbols-outlined text-[28px]">map</span>
        </div>
        <h3 className="font-display text-base font-semibold text-on-background">
          {title}
        </h3>
        <p className="text-sm text-on-surface-variant leading-relaxed">
          {message}
        </p>
      </div>
    </div>
  );
}
