import { encode as encodeBase64 } from 'base-64';

export const encodeBytesToBase64 = (bytes: Uint8Array): string => {
  const binaryChunks: string[] = [];
  const chunkSize = 0x8000;
  for (let offset = 0; offset < bytes.length; offset += chunkSize) {
    binaryChunks.push(
      String.fromCharCode(...bytes.subarray(offset, offset + chunkSize))
    );
  }
  return encodeBase64(binaryChunks.join(''));
};
