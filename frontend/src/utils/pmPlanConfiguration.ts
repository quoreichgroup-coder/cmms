export type PMPlanMode = 'SINGLE' | 'STRATEGY' | 'MULTI_COUNTER';

export interface PMPlanConfiguration {
  mode: PMPlanMode;
  combination?: 'OR' | 'AND';
  packages?: Array<{
    code: string;
    name: string;
    everyBaseCycles: number;
    taskBaseIds: number[];
  }>;
  cycles?: Array<{
    code: string;
    name: string;
    dimension: 'METER';
    interval: number;
    meterId?: number;
    referenceValue: number;
    endValue?: number;
    taskBaseIds: number[];
  }>;
}

const validCode = (code: unknown): code is string =>
  typeof code === 'string' && /^[a-zA-Z0-9_-]{1,100}$/.test(code);

const hasUniqueCodes = (codes: string[]) => new Set(codes).size === codes.length;

export const parsePMPlanConfiguration = (raw?: string): PMPlanConfiguration => {
  const value = JSON.parse(raw || '{"mode":"SINGLE"}');
  if (!['SINGLE', 'STRATEGY', 'MULTI_COUNTER'].includes(value.mode)) {
    throw new Error('pm_plan_mode_invalid');
  }
  return value as PMPlanConfiguration;
};

/** Returns an i18n key when the configuration cannot be accepted by the API. */
export const validatePMPlanConfiguration = (
  configuration: PMPlanConfiguration
): string | null => {
  if (configuration.mode === 'SINGLE') return null;
  if (configuration.mode === 'STRATEGY') {
    const packages = configuration.packages ?? [];
    if (!packages.length) return 'pm_validation_add_package';
    if (!hasUniqueCodes(packages.map((item) => item.code))) return 'pm_validation_unique_codes';
    if (packages.some((item) => !validCode(item.code))) return 'pm_validation_code_format';
    if (packages.some((item) => !Number.isInteger(item.everyBaseCycles) || item.everyBaseCycles < 1)) {
      return 'pm_validation_package_interval';
    }
    if (packages.some((item) => !item.taskBaseIds?.length)) return 'pm_validation_package_tasks';
    return null;
  }

  const cycles = configuration.cycles ?? [];
  if (!['OR', 'AND'].includes(configuration.combination ?? '')) return 'pm_validation_combination';
  if (cycles.length < 2) return 'pm_validation_two_cycles';
  if (!hasUniqueCodes(cycles.map((cycle) => cycle.code))) return 'pm_validation_unique_codes';
  if (cycles.some((cycle) => !validCode(cycle.code))) return 'pm_validation_code_format';
  if (cycles.some((cycle) => !Number.isInteger(cycle.meterId) || (cycle.meterId ?? 0) < 1)) {
    return 'pm_validation_cycle_meter';
  }
  if (cycles.some((cycle) => !Number.isFinite(cycle.interval) || cycle.interval <= 0)) {
    return 'pm_validation_cycle_interval';
  }
  if (cycles.some((cycle) => !Number.isFinite(cycle.referenceValue) || cycle.referenceValue < 0)) {
    return 'pm_validation_cycle_reference';
  }
  if (cycles.some((cycle) => cycle.endValue !== undefined
      && (!Number.isFinite(cycle.endValue) || cycle.endValue <= cycle.referenceValue))) {
    return 'pm_validation_cycle_end';
  }
  if (cycles.some((cycle) => !cycle.taskBaseIds?.length)) return 'pm_validation_cycle_tasks';
  return null;
};
