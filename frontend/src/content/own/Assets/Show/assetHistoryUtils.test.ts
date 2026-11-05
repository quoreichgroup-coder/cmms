import type WorkOrder from '../../../../models/owns/workOrder';
import { plannedLaborHours, workCenters } from './assetHistoryUtils';

declare const describe: (name: string, run: () => void) => void;
declare const it: (name: string, run: () => void) => void;
declare const expect: (actual: number | string | null) => {
  toBe(expected: number | string | null): void;
  toBeNull(): void;
  toBeCloseTo(expected: number): void;
};

const workOrderWith = (plannedOperations: WorkOrder['plannedOperations']): WorkOrder =>
  ({ plannedOperations } as WorkOrder);

describe('asset work order history helpers', () => {
  it('converts operation labor from minutes and seconds to hours', () => {
    expect(plannedLaborHours(workOrderWith([
      { operationNumber: '10', shortDescription: 'A', operationOrder: 1, materials: [], plannedWork: 30, workUnit: 'MIN' },
      { operationNumber: '20', shortDescription: 'B', operationOrder: 2, materials: [], plannedWork: 1800, workUnit: 'S' }
    ]))).toBeCloseTo(1);
  });

  it('does not invent labor hours when an operation unit is missing or unsupported', () => {
    expect(plannedLaborHours(workOrderWith([
      { operationNumber: '10', shortDescription: 'A', operationOrder: 1, materials: [], plannedWork: 2, workUnit: 'DAY' }
    ]))).toBeNull();
    expect(plannedLaborHours(workOrderWith([]))).toBeNull();
  });

  it('lists unique non-empty work centers', () => {
    expect(workCenters(workOrderWith([
      { operationNumber: '10', shortDescription: 'A', operationOrder: 1, materials: [], workCenter: '  MECH ' },
      { operationNumber: '20', shortDescription: 'B', operationOrder: 2, materials: [], workCenter: 'MECH' },
      { operationNumber: '30', shortDescription: 'C', operationOrder: 3, materials: [] }
    ]))).toBe('MECH');
  });
});
