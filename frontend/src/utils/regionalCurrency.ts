const UEMOA_COUNTRY_CODES = new Set([
  'BJ', // Benin
  'BF', // Burkina Faso
  'CI', // Côte d'Ivoire
  'GW', // Guinea-Bissau
  'ML', // Mali
  'NE', // Niger
  'SN', // Senegal
  'TG' // Togo
]);

export function isUemoaCountry(countryCode?: string | null): boolean {
  return UEMOA_COUNTRY_CODES.has((countryCode || '').trim().toUpperCase());
}
