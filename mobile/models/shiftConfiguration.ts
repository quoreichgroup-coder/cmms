export type ShiftDayName =
  | 'MONDAY'
  | 'TUESDAY'
  | 'WEDNESDAY'
  | 'THURSDAY'
  | 'FRIDAY'
  | 'SATURDAY'
  | 'SUNDAY';

export interface ShiftDayConfiguration {
  dayOfWeek: ShiftDayName;
  availabilityMinutes: number;
  enabled: boolean;
}

export interface ShiftException {
  exceptionDate: string;
  availabilityMinutes: number;
  enabled: boolean;
}

export interface ShiftConfiguration {
  id?: number;
  days: ShiftDayConfiguration[];
  exceptions: ShiftException[];
  enabled: boolean;
}
