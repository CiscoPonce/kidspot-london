/**
 * Returns true when the host browser can create *any* WebGL context.
 *
 * MapLibre GL JS requires WebGL (preferably WebGL2). On systems where
 * WebGL/WebGL2 has been disabled (hardware acceleration off, GPU driver
 * blocklist, embedded webview, `chrome://flags/#disable-webgl`, headless
 * Chromium without `--enable-webgl`, etc.) constructing a `Map` throws
 * synchronously and crashes the React tree. We probe up-front so we can
 * render a graceful fallback instead.
 */
export function isWebGLSupported(): boolean {
  if (typeof window === 'undefined' || typeof document === 'undefined') {
    return false;
  }

  try {
    const canvas = document.createElement('canvas');
    const ctx =
      canvas.getContext('webgl2') ||
      canvas.getContext('webgl') ||
      canvas.getContext('experimental-webgl');
    return Boolean(ctx);
  } catch {
    return false;
  }
}
