import { getAssetUrl, getPartUrl, getUserUrl } from '../../../utils/urlPaths';

export interface AnalyticsRecordFilter {
  key: string;
  value: string | number | boolean;
}

/** Resolve analytics rows only when a chart identifies one real record. */
export const getAnalyticsRecordPath = (
  filters: AnalyticsRecordFilter[]
): string | null => {
  if (!Array.isArray(filters) || filters.length !== 1) return null;

  const [{ key, value }] = filters;
  if (typeof value !== 'number' || !Number.isSafeInteger(value) || value <= 0) {
    return null;
  }

  switch (key) {
    case 'asset':
      return getAssetUrl(value);
    case 'part':
      return getPartUrl(value);
    case 'user':
      return getUserUrl(value);
    default:
      return null;
  }
};
