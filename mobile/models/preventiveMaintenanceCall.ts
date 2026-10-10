import { WorkOrderStatus } from './workOrder';

export type PreventiveMaintenanceCallStatus =
  | 'PLANNED'
  | 'DUE'
  | 'RESCHEDULED'
  | 'GENERATED'
  | 'COMPLETED'
  | 'IGNORED';

export interface PreventiveMaintenanceCallWorkOrder {
  id: number;
  title: string;
  status: WorkOrderStatus;
  dueDate?: string | null;
  customId?: string | null;
  createdAt?: string;
}

export interface PreventiveMaintenanceCallReschedule {
  previousDueDate: string;
  rescheduledFor: string;
  reason: string;
  actorName: string;
  createdAt: string;
}

export default interface PreventiveMaintenanceCall {
  id: number;
  dueValue?: number | null;
  dueDate?: string | null;
  originalDueDate?: string | null;
  rescheduledFor?: string | null;
  callType: 'CALENDAR' | 'METER';
  unit?: string | null;
  readingValue?: number | null;
  triggeredCycleCodes?: string[];
  status: PreventiveMaintenanceCallStatus;
  workOrder?: PreventiveMaintenanceCallWorkOrder | null;
  rescheduleHistory?: PreventiveMaintenanceCallReschedule[];
}
