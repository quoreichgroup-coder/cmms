export const shouldRequestPhotoLibraryPermission = (platform: string): boolean =>
  platform !== 'ios';

export const getImageLibraryOptions = <T extends object>(
  platform: string,
  options: T
): T & { preferredAssetRepresentationMode?: 'compatible' } =>
  platform === 'ios'
    ? { ...options, preferredAssetRepresentationMode: 'compatible' }
    : options;
