/** NFC scanning is available in native Android/iOS builds, not on Web. */
export const isNfcSupportedOnPlatform = (platform: string): boolean =>
  platform === 'android' || platform === 'ios';

/**
 * Request platform-supported technologies so non-NDEF asset tags can still
 * be identified by UID where the native reader exposes it.
 */
export const getAssetScanNfcTechnologies = <Technology extends string>(
  technologies: {
    Ndef: Technology;
    NfcA: Technology;
    NfcB: Technology;
    NfcF: Technology;
    NfcV: Technology;
    IsoDep: Technology;
    MifareClassic: Technology;
    MifareUltralight: Technology;
    NdefFormatable: Technology;
    MifareIOS?: Technology;
    Iso15693IOS?: Technology;
  },
  platform = 'android'
): Technology[] => {
  if (platform === 'ios') {
    return [technologies.MifareIOS, technologies.Iso15693IOS].filter(
      (technology): technology is Technology => typeof technology === 'string'
    );
  }

  return [
    technologies.Ndef,
    technologies.NfcA,
    technologies.NfcB,
    technologies.NfcF,
    technologies.NfcV,
    technologies.IsoDep,
    technologies.MifareClassic,
    technologies.MifareUltralight,
    technologies.NdefFormatable
  ];
};
