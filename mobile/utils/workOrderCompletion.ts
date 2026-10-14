export interface WorkOrderCompletionCheck {
  fieldName: string;
  isMissing: boolean;
  message: string;
}

export interface WorkOrderFieldRequirement {
  fieldName: string;
  fieldType: string;
}

export type CompletionDataLoadStatus = 'idle' | 'loading' | 'success' | 'error';

export interface CompletionDataLoadIssue {
  fieldName: string;
  source: string;
  status: CompletionDataLoadStatus;
}

export type WorkOrderCompletionNextStep =
  | 'blocked'
  | 'collect-details'
  | 'confirm';

/** Keep the existing required-feedback/signature gates ahead of status change. */
export const getWorkOrderCompletionNextStep = (options: {
  feedbackRequired: boolean;
  signatureRequired: boolean;
  signatureFeatureEnabled: boolean;
}): WorkOrderCompletionNextStep => {
  if (options.signatureRequired && !options.signatureFeatureEnabled)
    return 'blocked';
  if (options.feedbackRequired || options.signatureRequired)
    return 'collect-details';
  return 'confirm';
};

/** Returns completion messages only for checks configured as required. */
export const getWorkOrderCompletionBlockers = (
  requirements: WorkOrderFieldRequirement[] | undefined,
  checks: WorkOrderCompletionCheck[]
): string[] => {
  const requiredFields = new Set(
    (requirements ?? [])
      .filter((requirement) => requirement.fieldType === 'REQUIRED')
      .map((requirement) => requirement.fieldName)
  );

  return checks
    .filter((check) => check.isMissing && requiredFields.has(check.fieldName))
    .map((check) => check.message);
};

/** Required checks must be based on loaded data, never default empty arrays. */
export const getWorkOrderCompletionLoadIssues = (
  requirements: WorkOrderFieldRequirement[] | undefined,
  sourceStatuses: Record<string, CompletionDataLoadStatus | undefined>
): CompletionDataLoadIssue[] => {
  const sourcesByField: Record<string, string[]> = {
    completeFiles: ['workOrder', 'comments'],
    completeTasks: ['tasks'],
    completeTime: ['labor'],
    completeParts: ['parts'],
    completeCost: ['costs']
  };
  const issues: CompletionDataLoadIssue[] = [];

  (requirements ?? [])
    .filter((requirement) => requirement.fieldType === 'REQUIRED')
    .forEach(({ fieldName }) => {
      (sourcesByField[fieldName] ?? []).forEach((source) => {
        const status = sourceStatuses[source] ?? 'idle';
        if (status !== 'success') issues.push({ fieldName, source, status });
      });
    });

  return issues;
};
