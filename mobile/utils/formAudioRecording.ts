export type ActiveAudioRecordingFields = Record<string, boolean>;

export const updateActiveAudioRecordingFields = (
  activeFields: ActiveAudioRecordingFields,
  fieldName: string,
  isRecording: boolean
): ActiveAudioRecordingFields => {
  const next = { ...activeFields };
  if (isRecording) next[fieldName] = true;
  else delete next[fieldName];
  return next;
};

export const hasActiveAudioRecording = (
  activeFields: ActiveAudioRecordingFields
): boolean => Object.keys(activeFields).length > 0;
