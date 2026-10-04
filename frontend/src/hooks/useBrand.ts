import {
  apiUrl,
  BrandRawConfig,
  brandRawConfig,
  customLogoPaths
} from '../config';

const DEFAULT_WHITE_LOGO = '/static/images/logo/logo-white.png';
const DEFAULT_DARK_LOGO = '/static/images/logo/logo.png';
const CUSTOM_DARK_LOGO = `${apiUrl}images/custom-logo.png`;
const CUSTOM_WHITE_LOGO = `${apiUrl}images/custom-logo-white.png`;

interface BrandConfig extends BrandRawConfig {
  logo: { white: string; dark: string };
}
export function useBrand(): BrandConfig {
  const defaultBrand: Omit<BrandConfig, 'logo'> = {
    name: 'QUOREICH GROUP · QPM',
    shortName: 'QUOREICH',
    website: '',
    mail: '',
    phone: '',
    addressStreet: '',
    addressCity: ''
  };
  return {
    logo: {
      white: customLogoPaths
        ? CUSTOM_WHITE_LOGO
        : DEFAULT_WHITE_LOGO,
      dark: customLogoPaths
        ? CUSTOM_DARK_LOGO
        : DEFAULT_DARK_LOGO
    },
    ...(brandRawConfig
      ? {
          ...defaultBrand,
          ...brandRawConfig,
          name: defaultBrand.name,
          shortName: defaultBrand.shortName
        }
      : defaultBrand)
  };
}
