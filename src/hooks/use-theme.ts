/**
 * Learn more about light and dark modes:
 * https://docs.expo.dev/guides/color-schemes/
 */

import { Colors } from '@/constants/theme';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { useSettings } from '@/stores/settings';

/** Effective scheme: the user's theme setting, falling back to the system one. */
export function useScheme(): 'light' | 'dark' {
  const system = useColorScheme();
  const setting = useSettings((s) => s.theme);
  if (setting !== 'system') return setting;
  return system === 'dark' ? 'dark' : 'light';
}

export function useTheme() {
  return Colors[useScheme()];
}
