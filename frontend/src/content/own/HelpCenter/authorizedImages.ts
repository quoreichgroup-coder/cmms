import { apiUrl } from '../../../config';
import { authHeader } from '../../../utils/api';

const ASSET_ID_PATTERN = '[0-9a-f-]{36}';
const assetUrlPattern = new RegExp(
  `${apiUrl.replace(
    /[.*+?^${}()|[\]\\]/g,
    '\\$&'
  )}documentation/assets/(${ASSET_ID_PATTERN})`,
  'gi'
);

export interface HydratedImages {
  html: string;
  assetUrls: Record<string, string>;
  objectUrls: string[];
}

export async function hydrateAuthorizedImages(
  html: string
): Promise<HydratedImages> {
  const assetIds = Array.from(
    html.matchAll(assetUrlPattern),
    (match) => match[1]
  );
  const uniqueAssetIds = Array.from(new Set(assetIds));
  const assetUrls: Record<string, string> = {};
  const objectUrls: string[] = [];

  try {
    await Promise.all(
      uniqueAssetIds.map(async (assetId) => {
        const response = await fetch(
          `${apiUrl}documentation/assets/${assetId}`,
          {
            headers: authHeader(false)
          }
        );
        if (!response.ok)
          throw new Error(
            `Unable to load documentation image (${response.status})`
          );
        const objectUrl = URL.createObjectURL(await response.blob());
        assetUrls[assetId] = objectUrl;
        objectUrls.push(objectUrl);
      })
    );
  } catch (error) {
    objectUrls.forEach((objectUrl) => URL.revokeObjectURL(objectUrl));
    throw error;
  }

  const hydratedHtml = html.replace(
    assetUrlPattern,
    (_match, assetId: string) => assetUrls[assetId] ?? ''
  );
  return { html: hydratedHtml, assetUrls, objectUrls };
}

export function storeAuthorizedImages(
  html: string,
  objectUrls: Record<string, string>
): string {
  const parsed = new DOMParser().parseFromString(html, 'text/html');
  parsed.body.querySelectorAll('img[src]').forEach((image) => {
    const source = image.getAttribute('src') ?? '';
    const assetId = Object.keys(objectUrls).find(
      (id) => objectUrls[id] === source
    );
    if (assetId) image.setAttribute('src', `qpm-help-asset:${assetId}`);
  });
  return parsed.body.innerHTML;
}
