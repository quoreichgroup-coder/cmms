import { WorkOrderBase } from './workOrderBase';
import Schedule from './schedule';

export default interface PreventiveMaintenance extends WorkOrderBase {
  name: string;
  schedule: Schedule;
  customId?: string;
  nextWorkOrderDate?: string | null;
}
export interface PreventiveMaintenancePost extends PreventiveMaintenance {
  triggerType: 'CALENDAR' | 'METER';
  frequency?: number;
  startsOn?: string;
  endsOn?: string | null;
  recurrenceBasedOn?: 'SCHEDULED_DATE' | 'COMPLETED_DATE';
  recurrenceType?: 'DAILY' | 'WEEKLY' | 'MONTHLY' | 'YEARLY';
  daysOfWeek?: number[];
  dueDateDelay?: number | null;
  workOrderGenerationLeadDays?: number;
  meterId?: number | null;
  meterCycleInterval?: number | null;
  meterReferenceValue?: number | null;
  meterEndValue?: number | null;
}
