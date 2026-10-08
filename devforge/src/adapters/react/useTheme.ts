import { useCallback, useSyncExternalStore } from 'react';
import {
  cycleThemePreference,
  getThemePreference,
  resolveTheme,
  setThemePreference,
  subscribeTheme,
  THEME_LABELS,
  type ResolvedTheme,
  type ThemePreference,
} from '../../core/theme/theme.js';

const subscribe = (onChange: () => void) => subscribeTheme(onChange);
const getServerPreference = (): ThemePreference => 'system';
const getServerTheme = (): ResolvedTheme => 'light';

/**
 * React hook for the light/dark theme.
 * Usage: const { theme, preference, setPreference, toggle } = useTheme();
 */
export function useTheme() {
  const preference = useSyncExternalStore(subscribe, getThemePreference, getServerPreference);
  const theme = useSyncExternalStore(subscribe, () => resolveTheme(), getServerTheme);

  const setPreference = useCallback((next: ThemePreference) => setThemePreference(next), []);
  const toggle = useCallback(() => cycleThemePreference(), []);

  return { theme, preference, labels: THEME_LABELS, setPreference, toggle };
}
