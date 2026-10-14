import User, { users } from './user';

export interface WorkOrderLifecycleEvent {
  id: number;
  previousStatus: 'OPEN' | 'ON_HOLD' | 'IN_PROGRESS' | 'COMPLETE';
  newStatus: 'OPEN' | 'ON_HOLD' | 'IN_PROGRESS' | 'COMPLETE';
  actorUserId: number;
  actorName: string;
  occurredAt: string;
  reason?: string | null;
}

export default interface WorkOrderHistory {
  id: number;
  user: User;
  name: string;
  createdAt: string;
}

export const workOrderHistories: WorkOrderHistory[] = [
  {
    id: 75,
    user: users[1],
    name: 'fhgskd',
    createdAt: 'fdsdfvac'
  },
  {
    id: 421,
    user: users[0],
    name: 'gjhgaf fahgdhabf fagk',
    createdAt: 'fdsdfvac'
  }
];
