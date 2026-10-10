import { Audit } from './audit';

export default interface Schedule extends Audit {
  disabled: boolean;
  triggerType: 'CALENDAR' | 'METER';
  meterId?: number | null;
  meterName?: string | null;
  meterUnit?: string | null;
  meterCycleInterval?: number | null;
  meterReferenceValue?: number | null;
  meterEndValue?: number | null;
  nextMeterValue?: number | null;
  name: string;
  startsOn: string;
  endsOn?: string | null;
  frequency: number;
  dueDateDelay?: number | null;
  workOrderGenerationLeadDays: number;
  recurrenceBasedOn: 'SCHEDULED_DATE' | 'COMPLETED_DATE';
  recurrenceType: 'DAILY' | 'WEEKLY' | 'MONTHLY' | 'YEARLY';
  daysOfWeek: number[];
  planConfiguration?: {
    mode: 'SINGLE' | 'STRATEGY' | 'MULTI_COUNTER';
    combination?: 'OR' | 'AND';
    packages?: Array<{ code: string; name?: string; everyBaseCycles: number; taskBaseIds: number[] }>;
    cycles?: Array<{ code: string; name?: string; dimension: 'CALENDAR' | 'METER'; interval: number; meterId?: number; referenceValue?: number; endValue?: number; taskBaseIds: number[] }>;
  } | null;
}
