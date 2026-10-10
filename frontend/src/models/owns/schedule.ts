import { Audit } from './audit';

export default interface Schedule extends Audit {
  disabled: boolean;
  triggerType: 'CALENDAR' | 'METER';
  meterId?: number;
  meterName?: string;
  meterUnit?: string;
  meterCycleInterval?: number;
  meterReferenceValue?: number;
  meterEndValue?: number;
  nextMeterValue?: number;
  name: string;
  startsOn: string;
  endsOn: string;
  frequency: number;
  dueDateDelay: number;
  workOrderGenerationLeadDays: number;
  recurrenceBasedOn: 'SCHEDULED_DATE' | 'COMPLETED_DATE';
  recurrenceType: 'DAILY' | 'WEEKLY' | 'MONTHLY' | 'YEARLY';
  daysOfWeek: number[];
  planConfiguration?: PreventiveMaintenancePlanConfiguration | null;
}

export interface PreventiveMaintenancePlanConfiguration {
  mode: 'SINGLE' | 'STRATEGY' | 'MULTI_COUNTER';
  combination?: 'OR' | 'AND';
  packages?: Array<{
    code: string;
    name?: string;
    everyBaseCycles: number;
    taskBaseIds: number[];
  }>;
  cycles?: Array<{
    code: string;
    name?: string;
    dimension: 'CALENDAR' | 'METER';
    interval: number;
    recurrenceType?: 'DAILY' | 'WEEKLY' | 'MONTHLY' | 'YEARLY';
    meterId?: number;
    referenceValue?: number;
    endValue?: number;
    taskBaseIds: number[];
  }>;
}
