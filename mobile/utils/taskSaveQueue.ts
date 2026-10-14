/** Run a task save after the prior save settles, preserving edit order. */
export const enqueueTaskSave = <T>(
  previousSave: Promise<unknown>,
  save: () => Promise<T>
): Promise<T> => previousSave.catch(() => undefined).then(save);
