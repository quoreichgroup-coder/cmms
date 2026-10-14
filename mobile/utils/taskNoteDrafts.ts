import type { Task } from '../models/tasks';

export const isTaskNoteDirty = (draft: string, saved: string): boolean =>
  draft !== saved;

/** Keep note drafts out of unrelated task autosave requests. */
export const getPersistedTaskNote = (
  taskId: number,
  currentNote: string,
  persistedTasks: Task[] | undefined,
  initialTasks: Task[]
): string =>
  persistedTasks?.find((task) => task.id === taskId)?.notes ??
  initialTasks.find((task) => task.id === taskId)?.notes ??
  currentNote;

/** Keep local note drafts when refreshed task records replace the list. */
export const mergeTaskNotesWithDrafts = (
  incomingTasks: Task[],
  currentTasks: Task[],
  dirtyTaskIds: ReadonlySet<number>
): Task[] => {
  const currentTasksById = new Map(currentTasks.map((task) => [task.id, task]));

  return incomingTasks.map((task) => {
    if (!dirtyTaskIds.has(task.id)) return task;
    const currentTask = currentTasksById.get(task.id);
    return currentTask ? { ...task, notes: currentTask.notes } : task;
  });
};
