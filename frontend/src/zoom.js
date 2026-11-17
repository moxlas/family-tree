// Browser-local zoom preference shared by the private tree and public share
// links. Separate keys keep a shared link from overwriting the owner's zoom.
export const ZOOM_KEY = 'familyTreeZoom';
export const PUBLIC_ZOOM_KEY = 'familyTreePublicZoom';
export const ZOOM_MIN = 0.5;
export const ZOOM_MAX = 2;
export const ZOOM_STEP = 0.1;
export const ZOOM_RESET = 1;

export function defaultZoomForWidth(width) {
  if (typeof width !== 'number' || !Number.isFinite(width)) return ZOOM_RESET;
  if (width <= 430) return 0.6;
  if (width <= 600) return 0.7;
  if (width <= 820) return 0.8;
  return ZOOM_RESET;
}

// Returns a clamped, one-decimal zoom, or null when the input is unusable.
export function clampZoom(value) {
  const parsed = typeof value === 'number' ? value : Number.parseFloat(value);
  if (!Number.isFinite(parsed)) return null;
  const rounded = Math.round(parsed * 10) / 10;
  return Math.min(ZOOM_MAX, Math.max(ZOOM_MIN, rounded));
}

export function readZoom(storageKey, width) {
  const fallback = defaultZoomForWidth(width);
  try {
    if (typeof localStorage === 'undefined') return fallback;
    const stored = clampZoom(localStorage.getItem(storageKey));
    return stored == null ? fallback : stored;
  } catch (_error) {
    return fallback;
  }
}

export function writeZoom(storageKey, value) {
  const zoom = clampZoom(value);
  if (zoom == null) return null;
  try {
    if (typeof localStorage !== 'undefined') {
      localStorage.setItem(storageKey, String(zoom));
    }
  } catch (_error) {
    // Ignore private-mode or storage-quota failures; the session still works.
  }
  return zoom;
}

export function adjustZoom(value, delta) {
  const base = clampZoom(value) ?? ZOOM_RESET;
  return clampZoom(base + delta);
}
