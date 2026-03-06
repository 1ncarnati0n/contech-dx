import { calculateModuleWorkDays } from '@/lib/utils/process-days-calculator';
import type { Building } from '@/lib/types';
import type { ProcessModule } from '@/lib/data/process-modules';

function createTestBuilding(overrides?: Partial<Building>): Building {
  return {
    id: 'test-building-1',
    projectId: 'test-project-1',
    buildingName: 'Test Building',
    buildingNumber: 1,
    meta: { pumpCarCount: 2 },
    floors: [],
    floorTrades: [],
    ...overrides,
  };
}

describe('calculateModuleWorkDays', () => {
  describe('rounding behavior', () => {
    it('should use Math.ceil for conservative estimation', () => {
      const building = createTestBuilding();
      const mod: ProcessModule = {
        id: 'test-module',
        name: 'Test Module',
        items: [
          {
            id: 'item-1',
            name: 'Item 1',
            directWorkDays: 2.3,  // ceil → 3일
            dailyProductivity: 0,
            equipmentCount: 1,
            indirectDays: 0,
            unit: 'M2',
          },
          {
            id: 'item-2',
            name: 'Item 2',
            directWorkDays: 1.8,  // ceil → 2일
            dailyProductivity: 0,
            equipmentCount: 1,
            indirectDays: 0,
            unit: 'M2',
          },
        ],
      };

      const result = calculateModuleWorkDays(building, mod, '기준층');

      // ceil(2.3 + 1.8) = ceil(4.1) = 5
      // 기존 floor(4.1) = 4 였음
      expect(result).toBe(5);
    });

    it('should return 0 for empty module', () => {
      const building = createTestBuilding();
      const mod: ProcessModule = {
        id: 'empty',
        name: 'Empty',
        items: []
      };

      expect(calculateModuleWorkDays(building, mod, '기준층')).toBe(0);
    });

    it('should handle exact integer sums correctly', () => {
      const building = createTestBuilding();
      const mod: ProcessModule = {
        id: 'exact-module',
        name: 'Exact Module',
        items: [
          {
            id: 'item-1',
            name: 'Item 1',
            directWorkDays: 2.0,
            dailyProductivity: 0,
            equipmentCount: 1,
            indirectDays: 0,
            unit: 'M2',
          },
          {
            id: 'item-2',
            name: 'Item 2',
            directWorkDays: 3.0,
            dailyProductivity: 0,
            equipmentCount: 1,
            indirectDays: 0,
            unit: 'M2',
          },
        ],
      };

      const result = calculateModuleWorkDays(building, mod, '기준층');
      // ceil(2.0 + 3.0) = ceil(5.0) = 5
      expect(result).toBe(5);
    });

    it('should always round up for any fractional total', () => {
      const building = createTestBuilding();
      const mod: ProcessModule = {
        id: 'fractional-module',
        name: 'Fractional Module',
        items: [
          {
            id: 'item-1',
            name: 'Item 1',
            directWorkDays: 1.1,
            dailyProductivity: 0,
            equipmentCount: 1,
            indirectDays: 0,
            unit: 'M2',
          },
          {
            id: 'item-2',
            name: 'Item 2',
            directWorkDays: 2.9,
            dailyProductivity: 0,
            equipmentCount: 1,
            indirectDays: 0,
            unit: 'M2',
          },
        ],
      };

      const result = calculateModuleWorkDays(building, mod, '기준층');
      // ceil(1.1 + 2.9) = ceil(4.0) = 4
      expect(result).toBe(4);
    });
  });
});
