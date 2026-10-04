import mime from 'mime';

export interface LocalUploadFile {
  uri: string;
  name: string;
  type: string;
}

type UploadFileInput = {
  uri: string;
  name?: string | null;
  fileName?: string | null;
  type?: string | null;
  mimeType?: string | null;
};

const nameFromUri = (uri: string): string => {
  const path = uri.split(/[?#]/, 1)[0] || '';
  const segment = path.slice(path.lastIndexOf('/') + 1);
  try {
    return decodeURIComponent(segment);
  } catch {
    return segment;
  }
};

export const createUploadFile = (
  file: UploadFileInput,
  fallbackName = 'attachment',
  fallbackType = 'application/octet-stream'
): LocalUploadFile => {
  const name =
    file.name?.trim() ||
    file.fileName?.trim() ||
    nameFromUri(file.uri) ||
    fallbackName;
  const type =
    file.type?.trim() ||
    file.mimeType?.trim() ||
    mime.getType(name) ||
    fallbackType;
  return { uri: file.uri, name, type };
};

export const createImageUploadFile = (
  asset: UploadFileInput,
  index: number
): LocalUploadFile => {
  const uriName = nameFromUri(asset.uri);
  const name =
    asset.fileName?.trim() || (/\.[a-z0-9]{2,5}$/i.test(uriName) ? uriName : '');
  return createUploadFile(
    {
      uri: asset.uri,
      name: name || `image-${index}.jpg`,
      mimeType: asset.mimeType
    },
    `image-${index}.jpg`,
    'image/jpeg'
  );
};
