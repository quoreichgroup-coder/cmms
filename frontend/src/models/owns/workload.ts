export interface WorkloadWorkOrderDTO {
  id: number;
  customId: string;
  title: string;
  status: string;
  estimatedDuration: number;
  estimatedStartDate: string;
  dueDate: string;
}

export interface WorkloadUserDayDTO {
  userId: number;
  fullName: string;
  capacityMinutes: number;
  capacityStatus?: 'AVAILABLE' | 'NON_WORKING_DAY' | 'DAY_NOT_CONFIGURED' | 'NOT_CONFIGURED' | 'SCHEDULE_DISABLED';
  startTime?: string;
  allocatedMinutes: number;
  workOrders: WorkloadWorkOrderDTO[];
}

export interface WorkloadDayDTO {
  date: string;
  dayOfWeek: string;
  teamCapacityMinutes: number;
  teamAllocatedMinutes: number;
  users: WorkloadUserDayDTO[];
}

export interface WorkloadOverviewDTO {
  startDate: string;
  endDate: string;
  teamCapacityMinutes: number;
  teamAllocatedMinutes: number;
  days: WorkloadDayDTO[];
}

export interface UnscheduledWorkOrdersDTO {
  statusCounts: Record<string, number>;
  overdueCount: number;
  dueSoonCount: number;
  workOrders: WorkloadWorkOrderDTO[];
}
