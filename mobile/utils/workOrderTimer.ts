import type Labor from '../models/labor';

export interface WorkOrderTimerColors {
  background: string;
  foreground: string;
}

/** Keep the expanded timer actionable before the first labor entry exists. */
export const getWorkOrderTimerLabel = (
  expanded: boolean,
  running: boolean,
  duration: string | undefined,
  startLabel: string
): string | undefined => {
  // Keep elapsed time visible while the technician scrolls through a long WO.
  if (running) return duration;
  return expanded ? duration ?? startLabel : undefined;
};

/** Keep start and stop timer actions readable using semantic QPM status colors. */
export const getWorkOrderTimerColors = (
  colors: {
    primary: string;
    onPrimary: string;
    error: string;
    onError: string;
    surfaceDisabled: string;
    onSurfaceDisabled: string;
  },
  running: boolean,
  disabled = false
): WorkOrderTimerColors =>
  disabled
    ? {
        background: colors.surfaceDisabled,
        foreground: colors.onSurfaceDisabled
      }
    : running
    ? { background: colors.error, foreground: colors.onError }
    : { background: colors.primary, foreground: colors.onPrimary };

/** The timer is available only when the existing edit, plan and license gates allow it. */
export const canUseWorkOrderTimer = (
  canEditWorkOrder: boolean,
  hasAdditionalTimeFeature: boolean,
  hasTimeTrackingEntitlement: boolean
): boolean =>
  canEditWorkOrder && hasAdditionalTimeFeature && hasTimeTrackingEntitlement;

/** Return the current user's logged timer without assuming every labor row is assigned. */
export const getPrimaryWorkOrderLabor = (
  labors: Labor[],
  userId: number
): Labor | undefined =>
  labors.find((labor) => labor.logged && labor.assignedTo?.id === userId);
