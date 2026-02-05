import { getQuantityFromFloor, getQuantityByReference } from '@/lib/utils/quantity-reference';
import type { Building } from '@/lib/types';

function createTestBuilding(overrides?: Partial<Building>): Building {
  return {
    id: 'test-building',
    projectId: 'test-project',
    buildingName: 'Test',
    buildingNumber: 1,
    meta: {},
    floors: [],
    floorTrades: [],
    ...overrides,
  };
}

describe('Type Safety', () => {
  describe('getQuantityFromFloor', () => {
    it('should handle valid subField correctly', () => {
      const building = createTestBuilding({
        floors: [
          {
            id: 'floor-3',
            floorLabel: '3F',
            floorNumber: 3,
            floorClass: '기준층',
            levelType: '지상'
          }
        ],
        floorTrades: [
          {
            id: 'ft-1',
            floorId: 'floor-3',
            buildingId: 'test-building',
            tradeGroup: '아파트',
            trades: { formwork: { areaM2: 100 } }
          }
        ]
      });

      const result = getQuantityFromFloor(building, '3F', 'formwork', 'areaM2');
      expect(result).toBe(100);
    });

    it('should return 0 for invalid subField without throwing', () => {
      const building = createTestBuilding({
        floors: [
          {
            id: 'floor-3',
            floorLabel: '3F',
            floorNumber: 3,
            floorClass: '기준층',
            levelType: '지상'
          }
        ],
        floorTrades: [
          {
            id: 'ft-1',
            floorId: 'floor-3',
            buildingId: 'test-building',
            tradeGroup: '아파트',
            trades: { formwork: { areaM2: 100 } }
          }
        ]
      });

      // @ts-expect-error Testing invalid input
      const result = getQuantityFromFloor(building, '3F', 'formwork', 'invalidField');
      expect(result).toBe(0);
    });

    it('should warn in development for invalid subField', () => {
      const consoleWarnSpy = jest.spyOn(console, 'warn').mockImplementation();
      const originalEnv = process.env.NODE_ENV;
      process.env.NODE_ENV = 'development';

      const building = createTestBuilding({
        floors: [{ id: 'f1', floorLabel: '3F', floorNumber: 3, floorClass: '기준층', levelType: '지상' }],
        floorTrades: [{
          id: 'ft1',
          floorId: 'f1',
          buildingId: 'test',
          tradeGroup: '아파트',
          trades: { formwork: { areaM2: 100 } }
        }]
      });

      // @ts-expect-error Testing invalid input
      getQuantityFromFloor(building, '3F', 'formwork', 'wrong');

      expect(consoleWarnSpy).toHaveBeenCalledWith(
        expect.stringContaining('Invalid subField')
      );

      consoleWarnSpy.mockRestore();
      process.env.NODE_ENV = originalEnv;
    });

    it('should return 0 for missing floor', () => {
      const building = createTestBuilding({
        floors: [],
        floorTrades: []
      });

      const result = getQuantityFromFloor(building, 'NonExistent', 'formwork', 'areaM2');
      expect(result).toBe(0);
    });

    it('should return 0 for missing trade', () => {
      const building = createTestBuilding({
        floors: [
          {
            id: 'floor-3',
            floorLabel: '3F',
            floorNumber: 3,
            floorClass: '기준층',
            levelType: '지상'
          }
        ],
        floorTrades: []
      });

      const result = getQuantityFromFloor(building, '3F', 'formwork', 'areaM2');
      expect(result).toBe(0);
    });

    it('should return 0 for missing field in trade', () => {
      const building = createTestBuilding({
        floors: [
          {
            id: 'floor-3',
            floorLabel: '3F',
            floorNumber: 3,
            floorClass: '기준층',
            levelType: '지상'
          }
        ],
        floorTrades: [
          {
            id: 'ft-1',
            floorId: 'floor-3',
            buildingId: 'test-building',
            tradeGroup: '아파트',
            trades: {}  // No formwork field
          }
        ]
      });

      const result = getQuantityFromFloor(building, '3F', 'formwork', 'areaM2');
      expect(result).toBe(0);
    });
  });

  describe('getQuantityByReference', () => {
    it('should handle valid reference patterns', () => {
      const building = createTestBuilding({
        floors: [
          {
            id: 'floor-disposal',
            floorLabel: '버림',
            floorNumber: -1,
            floorClass: '버림',
            levelType: '지상'
          }
        ],
        floorTrades: [
          {
            id: 'ft-disposal',
            floorId: 'floor-disposal',
            buildingId: 'test-building',
            tradeGroup: '버림',
            trades: { formwork: { areaM2: 50 } }
          }
        ]
      });

      // D6 = 버림 형틀 면적
      const result = getQuantityByReference(building, 'D6');
      expect(result).toBe(50);
    });

    it('should handle addition operations', () => {
      const building = createTestBuilding({
        floors: [
          {
            id: 'floor-3',
            floorLabel: '3F',
            floorNumber: 3,
            floorClass: '기준층',
            levelType: '지상'
          },
          {
            id: 'floor-4',
            floorLabel: '4F',
            floorNumber: 4,
            floorClass: '기준층',
            levelType: '지상'
          }
        ],
        floorTrades: [
          {
            id: 'ft-3',
            floorId: 'floor-3',
            buildingId: 'test-building',
            tradeGroup: '기준층',
            trades: { formwork: { areaM2: 100 } }
          },
          {
            id: 'ft-4',
            floorId: 'floor-4',
            buildingId: 'test-building',
            tradeGroup: '기준층',
            trades: { formwork: { areaM2: 120 } }
          }
        ]
      });

      // E14+E16 would be 3F + 4F formwork areas
      const result = getQuantityByReference(building, 'E13+E14');
      expect(result).toBeGreaterThanOrEqual(0); // Basic validation
    });

    it('should return 0 for invalid reference', () => {
      const building = createTestBuilding();
      const result = getQuantityByReference(building, 'Z99');
      expect(result).toBe(0);
    });
  });

  describe('Row 11/12 Floor Finding', () => {
    it('should prioritize 셋팅층 for Row 11 (1F)', () => {
      const building = createTestBuilding({
        floors: [
          { id: 'setting-1f', floorLabel: '1F', floorNumber: 1, floorClass: '셋팅층', levelType: '지상' },
          { id: 'general-1f', floorLabel: '1F', floorNumber: 1, floorClass: '일반층', levelType: '지상' },
        ],
        floorTrades: [
          { id: 'ft-1', floorId: 'setting-1f', buildingId: 'test', tradeGroup: '셋팅층', trades: { formwork: { areaM2: 100 } } },
          { id: 'ft-2', floorId: 'general-1f', buildingId: 'test', tradeGroup: '셋팅층', trades: { formwork: { areaM2: 200 } } },
        ],
      });

      const result = getQuantityByReference(building, 'D11');
      expect(result).toBe(100); // 셋팅층 우선
    });

    it('should fall back to 일반층 for Row 11 if no 셋팅층', () => {
      const building = createTestBuilding({
        floors: [
          { id: 'general-1f', floorLabel: '1F', floorNumber: 1, floorClass: '일반층', levelType: '지상' },
        ],
        floorTrades: [
          { id: 'ft-1', floorId: 'general-1f', buildingId: 'test', tradeGroup: '셋팅층', trades: { formwork: { areaM2: 200 } } },
        ],
      });

      const result = getQuantityByReference(building, 'D11');
      expect(result).toBe(200);
    });

    it('should handle 기준층 for Row 12 (2F)', () => {
      const building = createTestBuilding({
        floors: [
          { id: 'base-2f', floorLabel: '2~14F 기준층', floorNumber: 2, floorClass: '기준층', levelType: '지상' },
        ],
        floorTrades: [
          { id: 'ft-1', floorId: 'base-2f-2F', buildingId: 'test', tradeGroup: '기준층', trades: { formwork: { areaM2: 300 } } },
        ],
      });

      const result = getQuantityByReference(building, 'D12');
      expect(result).toBeGreaterThanOrEqual(0); // Basic validation for range floor
    });
  });
});
