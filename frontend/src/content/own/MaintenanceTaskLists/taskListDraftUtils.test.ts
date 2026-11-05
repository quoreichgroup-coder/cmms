import { calculateLaborWork, copyCounterOperations, filterPartsByQuery, nextOperationNumber, supportsLaborWorkCalculation } from './taskListDraftUtils';

declare const describe: (name: string, run: () => void) => void;
declare const it: (name: string, run: () => void) => void;
declare const expect: (actual: unknown) => {
  toEqual(expected: unknown): void;
  toBe(expected: unknown): void;
  not: { toBe(expected: unknown): void };
};

describe('copyCounterOperations', () => {
  it('copies the operation and material plan without carrying persistent identifiers', () => {
    const source = [
      {
        id: 10,
        operationNumber: '0010',
        operationOrder: 4,
        materials: [{ id: 20, partId: 3, quantity: 2 }]
      },
      {
        id: 11,
        operationNumber: '0020',
        operationOrder: 8,
        materials: [{ id: 21, partId: 4, quantity: 1 }]
      }
    ];

    const copied = copyCounterOperations(source);

    expect(copied).toEqual([
      {
        id: undefined,
        operationNumber: '0010',
        operationOrder: 0,
        materials: [{ id: undefined, partId: 3, quantity: 2 }]
      },
      {
        id: undefined,
        operationNumber: '0020',
        operationOrder: 1,
        materials: [{ id: undefined, partId: 4, quantity: 1 }]
      }
    ]);
    expect(copied[0]).not.toBe(source[0]);
    expect(copied[0].materials[0]).not.toBe(source[0].materials[0]);
    expect(source[0].id).toBe(10);
    expect(source[0].materials[0].id).toBe(20);
  });
});

describe('automatic operation numbering', () => {
  it('uses configured start and increment and advances after the highest existing operation', () => {
    expect(nextOperationNumber([], 20, 5)).toBe('0020');
    expect(nextOperationNumber(['0010', '0030'], 20, 5)).toBe('0035');
  });

  it('skips collisions and ignores nonnumeric operation IDs when finding the high-water mark', () => {
    expect(nextOperationNumber(['A001', '0010', '0015'], 10, 5)).toBe('0020');
    expect(nextOperationNumber(['0010'], 10, 10)).toBe('0020');
  });
});

describe('filterPartsByQuery', () => {
  const parts = [
    { id: 1, barcode: 'BRG-6205', name: 'Bearing', description: 'Drive motor bearing' },
    { id: 2, barcode: 'SEAL-100', name: 'Seal', description: 'Pump service seal' }
  ];

  it('searches code, name, and description without case sensitivity', () => {
    expect(filterPartsByQuery(parts, 'brg-62').map((part) => part.id)).toEqual([1]);
    expect(filterPartsByQuery(parts, 'PUMP SERVICE').map((part) => part.id)).toEqual([2]);
    expect(filterPartsByQuery(parts, 'bearing').map((part) => part.id)).toEqual([1]);
  });

  it('returns all parts for an empty query and none for an unmatched query', () => {
    expect(filterPartsByQuery(parts, '   ')).toBe(parts);
    expect(filterPartsByQuery(parts, 'not found')).toEqual([]);
  });
});

describe('planned labor work calculation', () => {
  it('uses duration times workers and converts recognized time units', () => {
    const operation = { duration: 2.5, durationUnit: 'h', workers: 3, workUnit: 'H' };
    expect(supportsLaborWorkCalculation(operation)).toBe(true);
    expect(calculateLaborWork(operation)).toBe(7.5);
    expect(calculateLaborWork({ duration: 30, durationUnit: 'MIN', workers: 2, workUnit: 'H' })).toBe(1);
    expect(calculateLaborWork({ duration: 1, durationUnit: 'HOUR', workers: 2, workUnit: 'MIN' })).toBe(120);
  });

  it('does not convert unknown units or invalid values silently', () => {
    expect(calculateLaborWork({ duration: 2, durationUnit: 'SHIFT', workers: 2, workUnit: 'H' })).toBe(null);
    expect(calculateLaborWork({ duration: 0, durationUnit: 'H', workers: 2, workUnit: 'H' })).toBe(null);
    expect(calculateLaborWork({ duration: 2, durationUnit: 'H', workers: null, workUnit: 'H' })).toBe(null);
    expect(calculateLaborWork({ duration: Number.POSITIVE_INFINITY, durationUnit: 'H', workers: 2, workUnit: 'H' })).toBe(null);
  });
});
