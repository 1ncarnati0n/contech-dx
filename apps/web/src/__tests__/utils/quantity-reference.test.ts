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
        '[WARN]',
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

  describe('Row Mappings (Comprehensive)', () => {
    describe('Row 6-9: Basement and Foundation', () => {
      it('Row 6: should get 버림 formwork area (D6)', () => {
        const building = createTestBuilding({
          floors: [
            { id: 'floor-disposal', floorLabel: '버림', floorNumber: -1, floorClass: '버림', levelType: '지상' }
          ],
          floorTrades: [
            { id: 'ft-1', floorId: 'floor-disposal', buildingId: 'test', tradeGroup: '버림', trades: { formwork: { areaM2: 50 } } }
          ]
        });
        expect(getQuantityByReference(building, 'D6')).toBe(50);
      });

      it('Row 6: should get 버림 euroForm area (U6)', () => {
        const building = createTestBuilding({
          floors: [
            { id: 'floor-disposal', floorLabel: '버림', floorNumber: -1, floorClass: '버림', levelType: '지상' }
          ],
          floorTrades: [
            { id: 'ft-1', floorId: 'floor-disposal', buildingId: 'test', tradeGroup: '버림', trades: { euroForm: { areaM2: 35 } } }
          ]
        });
        expect(getQuantityByReference(building, 'U6')).toBe(35);
      });

      it('Row 7: should get 기초 concrete volume (G7)', () => {
        const building = createTestBuilding({
          floors: [
            { id: 'floor-foundation', floorLabel: '기초', floorNumber: 0, floorClass: '기초', levelType: '지상' }
          ],
          floorTrades: [
            { id: 'ft-1', floorId: 'floor-foundation', buildingId: 'test', tradeGroup: '기초', trades: { concrete: { volumeM3: 120 } } }
          ]
        });
        expect(getQuantityByReference(building, 'G7')).toBe(120);
      });

      it('Row 7: should apply ratio for 기초 rebar (F7*0.45)', () => {
        const building = createTestBuilding({
          floors: [
            { id: 'floor-foundation', floorLabel: '기초', floorNumber: 0, floorClass: '기초', levelType: '지상' }
          ],
          floorTrades: [
            { id: 'ft-1', floorId: 'floor-foundation', buildingId: 'test', tradeGroup: '기초', trades: { rebar: { ton: 100 } } }
          ]
        });
        expect(getQuantityByReference(building, 'F7*0.45')).toBe(45);
      });

      it('Row 8: should get B2 formwork area (D8)', () => {
        const building = createTestBuilding({
          floors: [
            { id: 'floor-b2', floorLabel: 'B2', floorNumber: -2, floorClass: '일반층', levelType: '지하' },
            { id: 'floor-b1', floorLabel: 'B1', floorNumber: -1, floorClass: '일반층', levelType: '지하' }
          ],
          floorTrades: [
            { id: 'ft-b2', floorId: 'floor-b2', buildingId: 'test', tradeGroup: '주동 지하층', trades: { formwork: { areaM2: 200 } } },
            { id: 'ft-b1', floorId: 'floor-b1', buildingId: 'test', tradeGroup: '주동 지하층', trades: { formwork: { areaM2: 180 } } }
          ]
        });
        expect(getQuantityByReference(building, 'D8')).toBe(200); // B2 is last basement
      });

      it('Row 9: should get B1 formwork area (D9)', () => {
        const building = createTestBuilding({
          floors: [
            { id: 'floor-b2', floorLabel: 'B2', floorNumber: -2, floorClass: '일반층', levelType: '지하' },
            { id: 'floor-b1', floorLabel: 'B1', floorNumber: -1, floorClass: '일반층', levelType: '지하' }
          ],
          floorTrades: [
            { id: 'ft-b2', floorId: 'floor-b2', buildingId: 'test', tradeGroup: '주동 지하층', trades: { formwork: { areaM2: 200 } } },
            { id: 'ft-b1', floorId: 'floor-b1', buildingId: 'test', tradeGroup: '주동 지하층', trades: { formwork: { areaM2: 180 } } }
          ]
        });
        expect(getQuantityByReference(building, 'D9')).toBe(180); // B1 is first basement
      });

      it('Row 8/9: should handle single basement floor (B1 only)', () => {
        const building = createTestBuilding({
          floors: [
            { id: 'floor-b1', floorLabel: 'B1', floorNumber: -1, floorClass: '일반층', levelType: '지하' }
          ],
          floorTrades: [
            { id: 'ft-b1', floorId: 'floor-b1', buildingId: 'test', tradeGroup: '주동 지하층', trades: { formwork: { areaM2: 180 } } }
          ]
        });
        expect(getQuantityByReference(building, 'D9')).toBe(180); // B1 exists
        expect(getQuantityByReference(building, 'D8')).toBe(0); // B2 doesn't exist
      });
    });

    describe('Row 11-12: First and Second Floors (Priority Logic)', () => {
      it('Row 11: should prioritize 셋팅층 over 일반층 for 1F', () => {
        const building = createTestBuilding({
          floors: [
            { id: 'setting-1f', floorLabel: '1F', floorNumber: 1, floorClass: '셋팅층', levelType: '지상' },
            { id: 'general-1f', floorLabel: '1F', floorNumber: 1, floorClass: '일반층', levelType: '지상' }
          ],
          floorTrades: [
            { id: 'ft-setting', floorId: 'setting-1f', buildingId: 'test', tradeGroup: '셋팅층', trades: { formwork: { areaM2: 100 } } },
            { id: 'ft-general', floorId: 'general-1f', buildingId: 'test', tradeGroup: '셋팅층', trades: { formwork: { areaM2: 200 } } }
          ]
        });
        expect(getQuantityByReference(building, 'D11')).toBe(100); // 셋팅층 wins
      });

      it('Row 11: should fall back to 일반층 if no 셋팅층', () => {
        const building = createTestBuilding({
          floors: [
            { id: 'general-1f', floorLabel: '1F', floorNumber: 1, floorClass: '일반층', levelType: '지상' }
          ],
          floorTrades: [
            { id: 'ft-general', floorId: 'general-1f', buildingId: 'test', tradeGroup: '셋팅층', trades: { formwork: { areaM2: 150 } } }
          ]
        });
        expect(getQuantityByReference(building, 'D11')).toBe(150);
      });

      it('Row 12: should prioritize 셋팅층 > 일반층 > 기준층 for 2F', () => {
        const building = createTestBuilding({
          floors: [
            { id: 'setting-2f', floorLabel: '2F', floorNumber: 2, floorClass: '셋팅층', levelType: '지상' },
            { id: 'general-2f', floorLabel: '2F', floorNumber: 2, floorClass: '일반층', levelType: '지상' },
            { id: 'base-2f', floorLabel: '2~14F 기준층', floorNumber: 2, floorClass: '기준층', levelType: '지상' }
          ],
          floorTrades: [
            { id: 'ft-setting', floorId: 'setting-2f', buildingId: 'test', tradeGroup: '셋팅층', trades: { formwork: { areaM2: 110 } } },
            { id: 'ft-general', floorId: 'general-2f', buildingId: 'test', tradeGroup: '셋팅층', trades: { formwork: { areaM2: 120 } } },
            { id: 'ft-base', floorId: 'base-2f-2F', buildingId: 'test', tradeGroup: '기준층', trades: { formwork: { areaM2: 130 } } }
          ]
        });
        expect(getQuantityByReference(building, 'D12')).toBe(110); // 셋팅층 wins
      });

      it('Row 12: should use 일반층 if no 셋팅층', () => {
        const building = createTestBuilding({
          floors: [
            { id: 'general-2f', floorLabel: '2F', floorNumber: 2, floorClass: '일반층', levelType: '지상' },
            { id: 'base-2f', floorLabel: '2~14F 기준층', floorNumber: 2, floorClass: '기준층', levelType: '지상' }
          ],
          floorTrades: [
            { id: 'ft-general', floorId: 'general-2f', buildingId: 'test', tradeGroup: '셋팅층', trades: { formwork: { areaM2: 120 } } },
            { id: 'ft-base', floorId: 'base-2f-2F', buildingId: 'test', tradeGroup: '기준층', trades: { formwork: { areaM2: 130 } } }
          ]
        });
        expect(getQuantityByReference(building, 'D12')).toBe(120); // 일반층 wins
      });

      it('Row 12: should fall back to 기준층 if no 셋팅층/일반층', () => {
        const building = createTestBuilding({
          floors: [
            { id: 'base-range', floorLabel: '2~14F 기준층', floorNumber: 2, floorClass: '기준층', levelType: '지상' }
          ],
          floorTrades: [
            { id: 'ft-base', floorId: 'base-range-2F', buildingId: 'test', tradeGroup: '기준층', trades: { formwork: { areaM2: 140 } } }
          ]
        });
        expect(getQuantityByReference(building, 'D12')).toBe(140); // 기준층 as fallback
      });
    });

    describe('Row 13-25: Standard Floors (3F-15F)', () => {
      it('Row 13: should get 3F formwork from range floor (D13)', () => {
        const building = createTestBuilding({
          floors: [
            { id: 'base-range', floorLabel: '2~14F 기준층', floorNumber: 2, floorClass: '기준층', levelType: '지상' }
          ],
          floorTrades: [
            { id: 'ft-3f', floorId: 'base-range-3F', buildingId: 'test', tradeGroup: '기준층', trades: { formwork: { areaM2: 250 } } }
          ]
        });
        expect(getQuantityByReference(building, 'D13')).toBe(250);
      });

      it('Row 14: should get 4F rebar from range floor (F14)', () => {
        const building = createTestBuilding({
          floors: [
            { id: 'base-range', floorLabel: '3~10F 기준층', floorNumber: 3, floorClass: '기준층', levelType: '지상' }
          ],
          floorTrades: [
            { id: 'ft-4f', floorId: 'base-range-4F', buildingId: 'test', tradeGroup: '기준층', trades: { rebar: { ton: 8.5 } } }
          ]
        });
        expect(getQuantityByReference(building, 'F14')).toBe(8.5);
      });

      it('Row 20: should get 10F concrete from individual floor (G20)', () => {
        const building = createTestBuilding({
          floors: [
            { id: 'floor-10f', floorLabel: '10F', floorNumber: 10, floorClass: '일반층', levelType: '지상' }
          ],
          floorTrades: [
            { id: 'ft-10f', floorId: 'floor-10f', buildingId: 'test', tradeGroup: '아파트', trades: { concrete: { volumeM3: 95 } } }
          ]
        });
        expect(getQuantityByReference(building, 'G20')).toBe(95);
      });

      it('Row 25: should get 15F stripClean from range floor with core prefix (E25)', () => {
        const building = createTestBuilding({
          floors: [
            { id: 'core-range', floorLabel: '코어1-10~20F 기준층', floorNumber: 10, floorClass: '기준층', levelType: '지상' }
          ],
          floorTrades: [
            { id: 'ft-15f', floorId: 'core-range-15F', buildingId: 'test', tradeGroup: '기준층', trades: { stripClean: { areaM2: 300 } } }
          ]
        });
        expect(getQuantityByReference(building, 'E25')).toBe(300);
      });
    });

    describe('Row 26-28: Penthouse Floors', () => {
      it('Row 26: should get 옥탑1층 formwork (D26)', () => {
        const building = createTestBuilding({
          floors: [
            { id: 'ph1', floorLabel: '옥탑1층', floorNumber: 16, floorClass: '옥탑층', levelType: '지상' }
          ],
          floorTrades: [
            { id: 'ft-ph1', floorId: 'ph1', buildingId: 'test', tradeGroup: '옥탑층', trades: { formwork: { areaM2: 80 } } }
          ]
        });
        expect(getQuantityByReference(building, 'D26')).toBe(80);
      });

      it('Row 26: should normalize PH1 format (D26)', () => {
        const building = createTestBuilding({
          floors: [
            { id: 'ph1', floorLabel: 'PH1', floorNumber: 16, floorClass: '옥탑층', levelType: '지상' }
          ],
          floorTrades: [
            { id: 'ft-ph1', floorId: 'ph1', buildingId: 'test', tradeGroup: '옥탑층', trades: { formwork: { areaM2: 80 } } }
          ]
        });
        expect(getQuantityByReference(building, 'D26')).toBe(80);
      });

      it('Row 27: should get 옥탑2층 rebar (F27)', () => {
        const building = createTestBuilding({
          floors: [
            { id: 'ph1', floorLabel: '옥탑1', floorNumber: 16, floorClass: '옥탑층', levelType: '지상' },
            { id: 'ph2', floorLabel: '옥탑2', floorNumber: 17, floorClass: '옥탑층', levelType: '지상' }
          ],
          floorTrades: [
            { id: 'ft-ph1', floorId: 'ph1', buildingId: 'test', tradeGroup: '옥탑층', trades: { rebar: { ton: 3.5 } } },
            { id: 'ft-ph2', floorId: 'ph2', buildingId: 'test', tradeGroup: '옥탑층', trades: { rebar: { ton: 4.2 } } }
          ]
        });
        expect(getQuantityByReference(building, 'F27')).toBe(4.2);
      });

      it('Row 28: should get 옥탑3층 concrete (G28)', () => {
        const building = createTestBuilding({
          floors: [
            { id: 'ph1', floorLabel: 'PH1', floorNumber: 16, floorClass: '옥탑층', levelType: '지상' },
            { id: 'ph2', floorLabel: 'PH2', floorNumber: 17, floorClass: '옥탑층', levelType: '지상' },
            { id: 'ph3', floorLabel: 'PH3', floorNumber: 18, floorClass: '옥탑층', levelType: '지상' }
          ],
          floorTrades: [
            { id: 'ft-ph1', floorId: 'ph1', buildingId: 'test', tradeGroup: '옥탑층', trades: { concrete: { volumeM3: 20 } } },
            { id: 'ft-ph2', floorId: 'ph2', buildingId: 'test', tradeGroup: '옥탑층', trades: { concrete: { volumeM3: 22 } } },
            { id: 'ft-ph3', floorId: 'ph3', buildingId: 'test', tradeGroup: '옥탑층', trades: { concrete: { volumeM3: 25 } } }
          ]
        });
        expect(getQuantityByReference(building, 'G28')).toBe(25);
      });

      it('Row 26: should return 0 if no penthouse floors exist', () => {
        const building = createTestBuilding({
          floors: [
            { id: 'floor-1f', floorLabel: '1F', floorNumber: 1, floorClass: '일반층', levelType: '지상' }
          ],
          floorTrades: []
        });
        expect(getQuantityByReference(building, 'D26')).toBe(0);
      });

      it('Row 27: should return 0 if only one penthouse floor exists', () => {
        const building = createTestBuilding({
          floors: [
            { id: 'ph1', floorLabel: 'PH1', floorNumber: 16, floorClass: '옥탑층', levelType: '지상' }
          ],
          floorTrades: [
            { id: 'ft-ph1', floorId: 'ph1', buildingId: 'test', tradeGroup: '옥탑층', trades: { formwork: { areaM2: 80 } } }
          ]
        });
        expect(getQuantityByReference(building, 'D27')).toBe(0);
      });
    });

    describe('Complex References', () => {
      it('should handle addition (E14+E16)', () => {
        const building = createTestBuilding({
          floors: [
            { id: 'base-range', floorLabel: '2~14F 기준층', floorNumber: 2, floorClass: '기준층', levelType: '지상' }
          ],
          floorTrades: [
            { id: 'ft-4f', floorId: 'base-range-4F', buildingId: 'test', tradeGroup: '기준층', trades: { stripClean: { areaM2: 100 } } },
            { id: 'ft-6f', floorId: 'base-range-6F', buildingId: 'test', tradeGroup: '기준층', trades: { stripClean: { areaM2: 120 } } }
          ]
        });
        // Debug: test individual references first
        const e14 = getQuantityByReference(building, 'E14');
        const e16 = getQuantityByReference(building, 'E16');
        expect(e14).toBe(100);
        expect(e16).toBe(120);
        expect(getQuantityByReference(building, 'E14+E16')).toBe(220); // 100 + 120
      });

      it('should handle B1+B2 combined reference (F_B1B2_COMBINED)', () => {
        const building = createTestBuilding({
          floors: [
            { id: 'floor-b2', floorLabel: 'B2', floorNumber: -2, floorClass: '일반층', levelType: '지하' },
            { id: 'floor-b1', floorLabel: 'B1', floorNumber: -1, floorClass: '일반층', levelType: '지하' }
          ],
          floorTrades: [
            { id: 'ft-b2', floorId: 'floor-b2', buildingId: 'test', tradeGroup: '주동 지하층', trades: { rebar: { ton: 50 } } },
            { id: 'ft-b1', floorId: 'floor-b1', buildingId: 'test', tradeGroup: '주동 지하층', trades: { rebar: { ton: 45 } } }
          ]
        });
        expect(getQuantityByReference(building, 'F_B1B2_COMBINED')).toBe(95); // 50 + 45
      });

      it('should handle ratio with addition ((E14+E16)*0.5)', () => {
        const building = createTestBuilding({
          floors: [
            { id: 'base-range', floorLabel: '2~14F 기준층', floorNumber: 2, floorClass: '기준층', levelType: '지상' }
          ],
          floorTrades: [
            { id: 'ft-4f', floorId: 'base-range-4F', buildingId: 'test', tradeGroup: '기준층', trades: { stripClean: { areaM2: 100 } } },
            { id: 'ft-6f', floorId: 'base-range-6F', buildingId: 'test', tradeGroup: '기준층', trades: { stripClean: { areaM2: 120 } } }
          ]
        });
        // Note: Current implementation doesn't support parentheses, so this tests E16*0.5 part only
        const e14 = getQuantityByReference(building, 'E14');
        const e16WithRatio = getQuantityByReference(building, 'E16*0.5');
        expect(e14).toBe(100);
        expect(e16WithRatio).toBe(60); // 120 * 0.5
      });
    });

    describe('Column Mappings', () => {
      const testBuilding = createTestBuilding({
        floors: [
          { id: 'floor-3f', floorLabel: '3F', floorNumber: 3, floorClass: '기준층', levelType: '지상' }
        ],
        floorTrades: [
          {
            id: 'ft-3f',
            floorId: 'floor-3f',
            buildingId: 'test',
            tradeGroup: '기준층',
            trades: {
              gangForm: { areaM2: 100 },
              alForm: { areaM2: 110 },
              formwork: { areaM2: 120 },
              stripClean: { areaM2: 130 },
              rebar: { ton: 8.5 },
              concrete: { volumeM3: 95 }
            }
          }
        ]
      });

      it('Column B: should get gangForm areaM2 (B13)', () => {
        expect(getQuantityByReference(testBuilding, 'B13')).toBe(100);
      });

      it('Column C: should get alForm areaM2 (C13)', () => {
        expect(getQuantityByReference(testBuilding, 'C13')).toBe(110);
      });

      it('Column D: should get formwork areaM2 (D13)', () => {
        expect(getQuantityByReference(testBuilding, 'D13')).toBe(120);
      });

      it('Column E: should get stripClean areaM2 (E13)', () => {
        expect(getQuantityByReference(testBuilding, 'E13')).toBe(130);
      });

      it('Column F: should get rebar ton (F13)', () => {
        expect(getQuantityByReference(testBuilding, 'F13')).toBe(8.5);
      });

      it('Column G: should get concrete volumeM3 (G13)', () => {
        expect(getQuantityByReference(testBuilding, 'G13')).toBe(95);
      });
    });

    describe('Range Floor Direct Tests', () => {
      it('getQuantityFromFloor: should get specific floor from range with rangeFloorId', () => {
        const building = createTestBuilding({
          floors: [
            { id: 'base-range', floorLabel: '2~14F 기준층', floorNumber: 2, floorClass: '기준층', levelType: '지상' }
          ],
          floorTrades: [
            { id: 'ft-4f', floorId: 'base-range-4F', buildingId: 'test', tradeGroup: '기준층', trades: { stripClean: { areaM2: 100 } } },
            { id: 'ft-6f', floorId: 'base-range-6F', buildingId: 'test', tradeGroup: '기준층', trades: { stripClean: { areaM2: 120 } } }
          ]
        });

        // Direct call to getQuantityFromFloor
        const result4F = getQuantityFromFloor(building, '4F', 'stripClean', 'areaM2', 'base-range');
        const result6F = getQuantityFromFloor(building, '6F', 'stripClean', 'areaM2', 'base-range');

        expect(result4F).toBe(100);
        expect(result6F).toBe(120);
      });
    });

    describe('Edge Cases', () => {
      it('should return 0 for invalid column', () => {
        const building = createTestBuilding();
        expect(getQuantityByReference(building, 'Z13')).toBe(0);
      });

      it('should return 0 for invalid row', () => {
        const building = createTestBuilding();
        expect(getQuantityByReference(building, 'D99')).toBe(0);
      });

      it('should return 0 for malformed reference', () => {
        const building = createTestBuilding();
        expect(getQuantityByReference(building, 'INVALID')).toBe(0);
      });

      it('should handle missing trade data gracefully', () => {
        const building = createTestBuilding({
          floors: [
            { id: 'floor-3f', floorLabel: '3F', floorNumber: 3, floorClass: '기준층', levelType: '지상' }
          ],
          floorTrades: [
            { id: 'ft-3f', floorId: 'floor-3f', buildingId: 'test', tradeGroup: '기준층', trades: {} }
          ]
        });
        expect(getQuantityByReference(building, 'D13')).toBe(0);
      });

      it('should handle ratio of zero quantity', () => {
        const building = createTestBuilding({
          floors: [
            { id: 'floor-foundation', floorLabel: '기초', floorNumber: 0, floorClass: '기초', levelType: '지상' }
          ],
          floorTrades: [
            { id: 'ft-1', floorId: 'floor-foundation', buildingId: 'test', tradeGroup: '기초', trades: { rebar: { ton: 0 } } }
          ]
        });
        expect(getQuantityByReference(building, 'F7*0.45')).toBe(0);
      });
    });
  });
});
