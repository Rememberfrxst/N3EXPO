import colors from '@/constants/colors';
import { useTheme } from '@/context/ThemeContext';

/**
 * Returns the design tokens for the current (or overridden) color scheme.
 *
 * Reads from ThemeContext so users can force light/dark regardless of
 * the system setting. Falls back to light palette when dark tokens are
 * missing.
 */
export function useColors() {
  const { resolvedTheme } = useTheme();
  const palette =
    resolvedTheme === 'dark' && 'dark' in colors
      ? (colors as unknown as Record<string, typeof colors.light>).dark
      : colors.light;
  return { ...palette, radius: colors.radius };
}
