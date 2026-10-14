import { MD3DarkTheme, MD3LightTheme, useTheme } from 'react-native-paper';
import { qpmDesignTokens } from './theme/tokens';
import { createQpmPaperColors } from './theme/paperColors';

export { qpmDesignTokens, qpmLayoutTokens } from './theme/tokens';

function makeTheme(dark: boolean) {
  const base = dark ? MD3DarkTheme : MD3LightTheme;
  const tokens = dark ? qpmDesignTokens.dark : qpmDesignTokens.light;

  return {
    ...base,
    dark,
    colors: createQpmPaperColors(base.colors, tokens)
  };
}

export const customTheme = makeTheme(false);
export const darkTheme = makeTheme(true);
export type QpmTheme = typeof customTheme;
export const useAppTheme = () => useTheme<QpmTheme>();
