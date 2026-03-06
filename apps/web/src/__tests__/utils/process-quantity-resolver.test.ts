import { resolveProcessQuantity } from '@/lib/utils/process-quantity-resolver';
import type { Building } from '@/lib/types';
import type { SemanticQuantityReference } from '@/lib/types/process-quantity';

function createTestBuilding(overrides?: Partial<Building>): Building {
  return {
    id: 'test-building-1',
    projectId: 'test-project-1',
    buildingName: 'Test Building',
    buildingNumber: 1,
    meta: {
      totalUnits: 100,
      unitTypePattern: [],
      coreCount: 1,
      coreType: '중복도(판상형)',
      slabType: '벽식구조',
      floorCount: { basement: 2, ground: 15, ph: 2 },
      heights: { basement2: 3.6, basement1: 3.6, standard: 2.9, floor1: 4.5, floor2: 2.9, floor3: 2.9, top: 2.9, ph: 2.9 },
      pumpCarCount: 2,
    },
    floors: [
      { id: 'floor-b2', buildingId: 'test-building-1', floorLabel: 'B2', floorNumber: -2, levelType: '지하', floorClass: '지하층', height: 3.6 },
      { id: 'floor-b1', buildingId: 'test-building-1', floorLabel: 'B1', floorNumber: -1, levelType: '지하', floorClass: '지하층', height: 3.6 },
      { id: 'floor-4f', buildingId: 'test-building-1', floorLabel: '4F', floorNumber: 4, levelType: '지상', floorClass: '기준층', height: 2.9 },
    ],
    floorTrades: [
      {
        id: 'ft-blinding', floorId: 'floor-blinding', buildingId: 'test-building-1',
        tradeGroup: '버림',
        trades: {
          formwork: { areaM2: 100, productivity: 0, workers: 0, cost: 0 },
          euroForm: { areaM2: 80, productivity: 0, workers: 0, cost: 0 },
          concrete: { volumeM3: 50, equipmentCount: 1, productivityM3: 0, workers: 0, cost: 0 },
        },
      },
      {
        id: 'ft-foundation', floorId: 'floor-foundation', buildingId: 'test-building-1',
        tradeGroup: '기초',
        trades: {
          rebar: { ton: 30, productivity: 0, workers: 0, cost: 0 },
          formwork: { areaM2: 200, productivity: 0, workers: 0, cost: 0 },
          concrete: { volumeM3: 120, equipmentCount: 1, productivityM3: 0, workers: 0, cost: 0 },
        },
      },
      {
        id: 'ft-b2', floorId: 'floor-b2', buildingId: 'test-building-1',
        tradeGroup: '아파트',
        trades: {
          rebar: { ton: 40, productivity: 0, workers: 0, cost: 0 },
          formwork: { areaM2: 300, productivity: 0, workers: 0, cost: 0 },
          concrete: { volumeM3: 80, equipmentCount: 1, productivityM3: 0, workers: 0, cost: 0 },
        },
      },
      {
        id: 'ft-b1', floorId: 'floor-b1', buildingId: 'test-building-1',
        tradeGroup: '아파트',
        trades: {
          rebar: { ton: 35, productivity: 0, workers: 0, cost: 0 },
          formwork: { areaM2: 280, productivity: 0, workers: 0, cost: 0 },
          concrete: { volumeM3: 70, equipmentCount: 1, productivityM3: 0, workers: 0, cost: 0 },
        },
      },
      {
        id: 'ft-4f', floorId: 'floor-4f', buildingId: 'test-building-1',
        tradeGroup: '아파트',
        trades: {
          gangForm: { areaM2: 500, productivity: 0, workers: 0, cost: 0 },
          alForm: { areaM2: 300, productivity: 0, workers: 0, cost: 0 },
          rebar: { ton: 20, productivity: 0, workers: 0, cost: 0 },
          concrete: { volumeM3: 60, equipmentCount: 1, productivityM3: 0, workers: 0, cost: 0 },
        },
      },
    ],
    ...overrides,
  };
}

describe('resolveProcessQuantity', () => {
  describe('sourceType: category', () => {
    it('should resolve blinding euroForm quantity', () => {
      const building = createTestBuilding();
      const ref: SemanticQuantityReference = {
        tradeField: 'euroForm', subField: 'areaM2', ratio: 1,
        sourceType: 'category', tradeGroup: '버림',
      };
      expect(resolveProcessQuantity(building, ref)).toBe(80);
    });

    it('should resolve foundation rebar with ratio', () => {
      const building = createTestBuilding();
      const ref: SemanticQuantityReference = {
        tradeField: 'rebar', subField: 'ton', ratio: 0.5,
        sourceType: 'category', tradeGroup: '기초',
      };
      expect(resolveProcessQuantity(building, ref)).toBe(15); // 30 * 0.5
    });

    it('should return 0 when tradeGroup is missing', () => {
      const building = createTestBuilding();
      const ref: SemanticQuantityReference = {
        tradeField: 'rebar', subField: 'ton', ratio: 1,
        sourceType: 'category',
        // tradeGroup 없음
      };
      expect(resolveProcessQuantity(building, ref)).toBe(0);
    });

    it('should return 0 when tradeGroup does not exist', () => {
      const building = createTestBuilding();
      const ref: SemanticQuantityReference = {
        tradeField: 'rebar', subField: 'ton', ratio: 1,
        sourceType: 'category', tradeGroup: '존재하지않는구분',
      };
      expect(resolveProcessQuantity(building, ref)).toBe(0);
    });
  });

  describe('sourceType: floor', () => {
    it('should resolve floor-specific quantity', () => {
      const building = createTestBuilding();
      const ref: SemanticQuantityReference = {
        tradeField: 'gangForm', subField: 'areaM2', ratio: 0.45,
        sourceType: 'floor',
      };
      expect(resolveProcessQuantity(building, ref, '4F')).toBe(225); // 500 * 0.45
    });

    it('should resolve rebar with ratio for a floor', () => {
      const building = createTestBuilding();
      const ref: SemanticQuantityReference = {
        tradeField: 'rebar', subField: 'ton', ratio: 0.5,
        sourceType: 'floor',
      };
      expect(resolveProcessQuantity(building, ref, 'B2')).toBe(20); // 40 * 0.5
    });

    it('should return 0 when floorLabel is not provided', () => {
      const building = createTestBuilding();
      const ref: SemanticQuantityReference = {
        tradeField: 'gangForm', subField: 'areaM2', ratio: 1,
        sourceType: 'floor',
      };
      expect(resolveProcessQuantity(building, ref)).toBe(0);
    });

    it('should return 0 when floor does not exist', () => {
      const building = createTestBuilding();
      const ref: SemanticQuantityReference = {
        tradeField: 'gangForm', subField: 'areaM2', ratio: 1,
        sourceType: 'floor',
      };
      expect(resolveProcessQuantity(building, ref, '99F')).toBe(0);
    });
  });

  describe('sourceType: combined', () => {
    it('should sum B1 and B2 rebar quantities', () => {
      const building = createTestBuilding();
      const ref: SemanticQuantityReference = {
        tradeField: 'rebar', subField: 'ton', ratio: 1,
        sourceType: 'combined', combineFloors: ['B1', 'B2'],
      };
      expect(resolveProcessQuantity(building, ref)).toBe(75); // 35 + 40
    });

    it('should sum B1 and B2 formwork with ratio', () => {
      const building = createTestBuilding();
      const ref: SemanticQuantityReference = {
        tradeField: 'formwork', subField: 'areaM2', ratio: 0.5,
        sourceType: 'combined', combineFloors: ['B1', 'B2'],
      };
      expect(resolveProcessQuantity(building, ref)).toBe(290); // (280 + 300) * 0.5
    });

    it('should return 0 when combineFloors is empty', () => {
      const building = createTestBuilding();
      const ref: SemanticQuantityReference = {
        tradeField: 'rebar', subField: 'ton', ratio: 1,
        sourceType: 'combined', combineFloors: [],
      };
      expect(resolveProcessQuantity(building, ref)).toBe(0);
    });

    it('should return 0 when combineFloors is not set', () => {
      const building = createTestBuilding();
      const ref: SemanticQuantityReference = {
        tradeField: 'rebar', subField: 'ton', ratio: 1,
        sourceType: 'combined',
      };
      expect(resolveProcessQuantity(building, ref)).toBe(0);
    });
  });

  describe('ratio application', () => {
    it('should apply ratio=1 correctly (no change)', () => {
      const building = createTestBuilding();
      const ref: SemanticQuantityReference = {
        tradeField: 'concrete', subField: 'volumeM3', ratio: 1,
        sourceType: 'category', tradeGroup: '버림',
      };
      expect(resolveProcessQuantity(building, ref)).toBe(50);
    });

    it('should apply ratio=0.45 correctly', () => {
      const building = createTestBuilding();
      const ref: SemanticQuantityReference = {
        tradeField: 'gangForm', subField: 'areaM2', ratio: 0.45,
        sourceType: 'floor',
      };
      expect(resolveProcessQuantity(building, ref, '4F')).toBe(225); // 500 * 0.45
    });
  });
});
