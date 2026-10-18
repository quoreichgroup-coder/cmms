import { AssetMiniDTO } from './asset';
import File from './file';
import { UserMiniDTO } from './user';
import { Audit } from './audit';
import { MeterMiniDTO } from './meter';

export type TaskType =
  | 'SUBTASK'
  | 'NUMBER'
  | 'TEXT'
  | 'INSPECTION'
  | 'MULTIPLE'
  | 'METER';

export interface TaskOption {
  id: number;
  label: string;
}

export interface TaskBase {
  id: number;
  label: string;
  taskType: TaskType;
  options?: TaskOption[];
  user?: UserMiniDTO;
  asset?: AssetMiniDTO;
  meter?: MeterMiniDTO | null;
}

export interface Task extends Audit {
  id: number;
  value?: string | number;
  notes: string;
  taskBase: TaskBase;
  images: File[];
}

/** Keep task progress and completion checks aligned while accepting zero readings. */
export const isTaskComplete = (task: Task): boolean => {
  if (task.value === undefined || task.value === null) return false;
  const value = String(task.value).trim();
  if (!value) return false;
  if (task.taskBase.taskType === 'SUBTASK') return value === 'COMPLETE';
  if (
    task.taskBase.taskType === 'NUMBER' ||
    task.taskBase.taskType === 'METER'
  ) {
    return Number.isFinite(Number(value));
  }
  return true;
};

export const isTask = (object): object is Task => {
  return !!object.taskBase;
};
