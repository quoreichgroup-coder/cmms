import { MD3LightTheme, configureFonts } from 'react-native-paper';
import { Montserrat_400Regular } from '@expo-google-fonts/montserrat/400Regular';
import { Montserrat_500Medium } from '@expo-google-fonts/montserrat/500Medium';
import { Montserrat_600SemiBold } from '@expo-google-fonts/montserrat/600SemiBold';
import { Montserrat_700Bold } from '@expo-google-fonts/montserrat/700Bold';

/**
 * Montserrat (brand charter) bundled with the app: the TTF files ship in the JS bundle, nothing is
 * downloaded at runtime. Each weight is its own family because Android does not pick a weight file
 * from fontWeight for custom fonts.
 */
export const qpmFontFiles = {
  Montserrat_400Regular,
  Montserrat_500Medium,
  Montserrat_600SemiBold,
  Montserrat_700Bold
};

const familyForWeight = (weight?: string) => {
  switch (weight) {
    case '500':
      return 'Montserrat_500Medium';
    case '600':
      return 'Montserrat_600SemiBold';
    case '700':
    case 'bold':
      return 'Montserrat_700Bold';
    default:
      return 'Montserrat_400Regular';
  }
};

type Variant = keyof typeof MD3LightTheme.fonts;

const config = Object.fromEntries(
  (Object.keys(MD3LightTheme.fonts) as Variant[]).map((variant) => {
    const base = MD3LightTheme.fonts[variant] as { fontWeight?: string };
    return [
      variant,
      { fontFamily: familyForWeight(base.fontWeight), fontWeight: 'normal' as const }
    ];
  })
);

export const qpmFonts = configureFonts({ config });
