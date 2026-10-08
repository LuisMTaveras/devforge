import { onScopeDispose, readonly, ref } from 'vue';
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

/**
 * Vue 3 composable for the light/dark theme.
 * Usage: const { theme, preference, setPreference, toggle } = useTheme();
 */
export function useTheme() {
  const preference = ref<ThemePreference>(getThemePreference());
  const theme = ref<ResolvedTheme>(resolveTheme(preference.value));

  const unsubscribe = subscribeTheme((nextTheme, nextPreference) => {
    theme.value = nextTheme;
    preference.value = nextPreference;
  });
  onScopeDispose(unsubscribe);

  return {
    theme: readonly(theme),
    preference: readonly(preference),
    labels: THEME_LABELS,
    setPreference: setThemePreference,
    toggle: cycleThemePreference,
  };
}
