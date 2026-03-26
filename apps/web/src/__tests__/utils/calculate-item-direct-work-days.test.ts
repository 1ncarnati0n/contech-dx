import type { ProcessItem } from '@/features/building/data/process-modules';
import { calculateItemDirectWorkDays } from '@/features/building/process-plan/service/process-calculation';

function createBaseItem(overrides: Partial<ProcessItem> = {}): ProcessItem {
  return {
    id: 'test-item',
    workItem: 'test',
    unit: '㎡',
    dailyProductivity: 10,
    equipmentCount: 1,
    indirectDays: 0,
    ...overrides,
  };
}

describe('calculateItemDirectWorkDays', () => {
  it('uses fixed directWorkDays when provided', () => {
    const item = createBaseItem({ directWorkDays: 3 });
    expect(calculateItemDirectWorkDays({ item, quantity: 100 })).toBe(3);
  });

  it('calculates equipment-based direct work days', () => {
    const item = createBaseItem({
      dailyProductivity: 130,
      equipmentCalculationBase: 650,
      equipmentWorkersPerUnit: 4,
      quantityReference: 'G6',
    });

    expect(calculateItemDirectWorkDays({ item, quantity: 1300, maxPumpCarCount: 2 })).toBe(1);
  });

  it('calculates productivity-based direct work days', () => {
    const item = createBaseItem({
      quantityReference: 'D6',
      dailyProductivity: 10,
      equipmentCount: 2,
    });

    expect(calculateItemDirectWorkDays({ item, quantity: 100 })).toBe(2);
  });

  it('uses productivity formula when equipment formula is disabled', () => {
    const item = createBaseItem({
      quantityReference: 'D6',
      dailyProductivity: 10,
      equipmentCount: 2,
      equipmentCalculationBase: 50,
      equipmentWorkersPerUnit: 4,
    });

    expect(
      calculateItemDirectWorkDays({ item, quantity: 100, useEquipmentFormula: false })
    ).toBe(2);
  });

  it('returns 0 when quantity is invalid for calculated items', () => {
    const item = createBaseItem({ quantityReference: 'D6' });
    expect(calculateItemDirectWorkDays({ item, quantity: 0 })).toBe(0);
  });
});
