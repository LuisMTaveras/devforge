/**
 * ⚡ DEVFORGE Theme Engine (Light / Dark / System)
 * Zero-dependency, framework-agnostic. Every DEVFORGE project ships with BOTH themes.
 *
 * - Applies the `.dark` class + `color-scheme` on <html>.
 * - Persists the user's choice in localStorage.
 * - Follows the OS preference while the choice is 'system'.
 */

export type ThemePreference = 'light' | 'dark' | 'system';
export type ResolvedTheme = 'light' | 'dark';

export const THEME_STORAGE_KEY = 'devforge-theme';

/** Spanish UI labels for the theme selector (Zero-Spanglish). */
export const THEME_LABELS: Record<ThemePreference, string> = {
  light: 'Claro',
  dark: 'Oscuro',
  system: 'Sistema',
};

type Listener = (theme: ResolvedTheme, preference: ThemePreference) => void;
const listeners = new Set<Listener>();

const isBrowser = typeof window !== 'undefined' && typeof document !== 'undefined';
const darkQuery = isBrowser ? window.matchMedia('(prefers-color-scheme: dark)') : null;

function isPreference(value: unknown): value is ThemePreference {
  return value === 'light' || value === 'dark' || value === 'system';
}

export function getThemePreference(): ThemePreference {
  if (!isBrowser) return 'system';
  try {
    const stored = window.localStorage.getItem(THEME_STORAGE_KEY);
    return isPreference(stored) ? stored : 'system';
  } catch {
    return 'system';
  }
}

export function resolveTheme(preference: ThemePreference = getThemePreference()): ResolvedTheme {
  if (preference !== 'system') return preference;
  return darkQuery?.matches ? 'dark' : 'light';
}

function applyTheme(theme: ResolvedTheme): void {
  if (!isBrowser) return;
  const root = document.documentElement;
  root.classList.toggle('dark', theme === 'dark');
  root.style.colorScheme = theme;
}

function notify(): void {
  const preference = getThemePreference();
  const theme = resolveTheme(preference);
  applyTheme(theme);
  listeners.forEach(listener => listener(theme, preference));
}

export function setThemePreference(preference: ThemePreference): void {
  if (isBrowser) {
    try {
      window.localStorage.setItem(THEME_STORAGE_KEY, preference);
    } catch {
      // Storage blocked (private mode): theme still applies for this session
    }
  }
  notify();
}

/** Cycles light -> dark -> system. Handy for a single toggle button. */
export function cycleThemePreference(): ThemePreference {
  const order: ThemePreference[] = ['light', 'dark', 'system'];
  const next = order[(order.indexOf(getThemePreference()) + 1) % order.length];
  setThemePreference(next);
  return next;
}

export function subscribeTheme(listener: Listener): () => void {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

let initialized = false;

/**
 * Call once in main.ts / main.tsx before mounting the app.
 * Re-applies the theme when the OS preference changes (while on 'system')
 * and when another tab changes the stored preference.
 */
export function initTheme(): void {
  if (!isBrowser || initialized) return;
  initialized = true;

  darkQuery?.addEventListener('change', () => {
    if (getThemePreference() === 'system') notify();
  });
  window.addEventListener('storage', event => {
    if (event.key === THEME_STORAGE_KEY) notify();
  });

  notify();
}

/**
 * Inline this in <head> of index.html (before any CSS) to avoid the white flash
 * (FOUC) on dark mode before the JS bundle loads.
 */
export const THEME_INIT_SCRIPT = `(function(){try{var p=localStorage.getItem('${THEME_STORAGE_KEY}');var d=p==='dark'||((!p||p==='system')&&matchMedia('(prefers-color-scheme: dark)').matches);var r=document.documentElement;r.classList.toggle('dark',d);r.style.colorScheme=d?'dark':'light';}catch(e){}})();`;
