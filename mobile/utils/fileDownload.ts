import { logSafeError } from './safeErrorLog';
import * as FileSystem from 'expo-file-system';
import { Linking } from 'react-native';
import { encodeBytesToBase64 } from './encodeBase64';

export const openPdfResponse = async (
  response: Response,
  fileName: string
): Promise<void> => {
  const contentType = response.headers.get('content-type')?.toLowerCase() ?? '';
  if (!contentType.includes('application/pdf')) {
    throw new Error('Invalid work order report response');
  }

  const directoryUri =
    FileSystem.documentDirectory ?? FileSystem.cacheDirectory;
  if (!directoryUri) {
    throw new Error('Missing download directory path');
  }

  const safeFileName =
    fileName.replace(/[\\/:*?"<>|]/g, '_').replace(/\.+$/, '') ||
    'work-order-report.pdf';
  const fileUri = `${directoryUri}${safeFileName}`;

  try {
    const bytes = new Uint8Array(await response.arrayBuffer());
    if (bytes.length === 0) {
      throw new Error('Empty work order report response');
    }
    await FileSystem.writeAsStringAsync(fileUri, encodeBytesToBase64(bytes), {
      encoding: FileSystem.EncodingType.Base64
    });
    await Linking.openURL(fileUri);
  } catch (error) {
    logSafeError(
      'Failed to save or open authenticated work order report',
      error
    );
    throw error;
  }
};

export const downloadFile = async (
  uri: string,
  fileName: string
): Promise<void> => {
  const directoryUri =
    FileSystem.documentDirectory ?? FileSystem.cacheDirectory;
  if (!directoryUri) {
    throw new Error('Missing download directory path');
  }
  const fileUri = `${directoryUri}${fileName}`;
  const res = await FileSystem.downloadAsync(uri, fileUri);

  if (res && res.status === 200) {
    try {
      await Linking.openURL(res.uri);
    } catch (error) {
      logSafeError(
        'Failed to open local file, falling back to remote URL',
        error
      );
      await Linking.openURL(uri);
    }
  } else {
    throw new Error('Unable to download work order report');
  }
};
