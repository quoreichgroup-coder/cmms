import { qpmAnalyticsTokens } from '../theme/tokens';

/** Returns a stable QPM chart color for an entity across renders and screens. */
export const getQpmChartColor = (key: string | number): string => {
  const normalizedKey = String(key);
  let hash = 2166136261;

  for (let index = 0; index < normalizedKey.length; index += 1) {
    hash ^= normalizedKey.charCodeAt(index);
    hash = Math.imul(hash, 16777619);
  }

  return qpmAnalyticsTokens[(hash >>> 0) % qpmAnalyticsTokens.length];
};
