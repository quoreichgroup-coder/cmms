export const DEFAULT_THEME_NAME = 'PureLightTheme';

export function readThemePreference(
  storage: Pick<Storage, 'getItem'> | null,
  availableThemes: readonly string[]
): string {
  try {
    const storedTheme = storage?.getItem('appTheme');
    return storedTheme && availableThemes.includes(storedTheme)
      ? storedTheme
      : DEFAULT_THEME_NAME;
  } catch (_error) {
    return DEFAULT_THEME_NAME;
  }
}

export function persistThemePreference(
  storage: Pick<Storage, 'setItem'> | null,
  themeName: string,
  availableThemes: readonly string[]
): void {
  if (!availableThemes.includes(themeName)) return;

  try {
    storage?.setItem('appTheme', themeName);
  } catch (_error) {
    // Theme switching should still work for this page load when storage is blocked.
  }
}
