import type { Building, Floor } from '@/shared/types';
import { createBuildingProcessRows } from '@/features/building/process-plan/utils/createBuildingProcessRows';

function createFloor(overrides: Partial<Floor>): Floor {
  return {
    id: overrides.id ?? `floor-${overrides.floorLabel ?? '1F'}`,
    buildingId: overrides.buildingId ?? 'building-1',
    floorLabel: overrides.floorLabel ?? '1F',
    floorNumber: overrides.floorNumber ?? 1,
    levelType: overrides.levelType ?? '지상',
    floorClass: overrides.floorClass ?? '일반층',
    height: overrides.height ?? 2850,
  };
}

function createBuilding(overrides?: Partial<Building>): Building {
  return {
    id: overrides?.id ?? 'building-1',
    projectId: overrides?.projectId ?? 'project-1',
    buildingName: overrides?.buildingName ?? '1동',
    buildingNumber: overrides?.buildingNumber ?? 1,
    meta: overrides?.meta ?? {
      totalUnits: 0,
      unitTypePattern: [],
      coreCount: 1,
      coreType: '타워형',
      slabType: 'RC구조',
      floorCount: {
        basement: 0,
        ground: 5,
        ph: 0,
      },
      heights: {
        basement2: 0,
        basement1: 0,
        standard: 2850,
        floor1: 3000,
        floor2: 2900,
        floor3: 2850,
        top: 2850,
        ph: 0,
      },
    },
    floors: overrides?.floors ?? [],
    floorTrades: overrides?.floorTrades ?? [],
  };
}

describe('createBuildingProcessRows', () => {
  it('개별 기준층이 저장된 단일 코어 건물에서도 기준층 행을 생성한다', () => {
    const building = createBuilding({
      floors: [
        createFloor({ floorLabel: '1F', floorNumber: 1, floorClass: '일반층' }),
        createFloor({ floorLabel: '2F', floorNumber: 2, floorClass: '셋팅층' }),
        createFloor({ floorLabel: '3F', floorNumber: 3, floorClass: '기준층' }),
        createFloor({ floorLabel: '4F', floorNumber: 4, floorClass: '기준층' }),
        createFloor({ floorLabel: '5F', floorNumber: 5, floorClass: '최상층' }),
      ],
    });

    const rows = createBuildingProcessRows(building);

    expect(rows.map((row) => `${row.category}:${row.floorLabel}`)).toEqual([
      '최상층:5F',
      '기준층:4F',
      '기준층:3F',
      '셋팅층:2F',
      '일반층:1F',
    ]);
  });

  it('멀티 코어에서는 코어1 기준 개별 기준층만 대표 행으로 생성한다', () => {
    const building = createBuilding({
      meta: {
        totalUnits: 0,
        unitTypePattern: [],
        coreCount: 2,
        coreType: '타워형',
        slabType: 'RC구조',
        floorCount: {
          basement: 0,
          ground: 5,
          ph: 0,
          coreGroundFloors: [5, 5],
        },
        heights: {
          basement2: 0,
          basement1: 0,
          standard: 2850,
          floor1: 3000,
          floor2: 2900,
          floor3: 2850,
          top: 2850,
          ph: 0,
        },
      },
      floors: [
        createFloor({ id: 'c1-1', floorLabel: '코어1-1F', floorNumber: 1, floorClass: '일반층' }),
        createFloor({ id: 'c1-2', floorLabel: '코어1-2F', floorNumber: 2, floorClass: '셋팅층' }),
        createFloor({ id: 'c1-3', floorLabel: '코어1-3F', floorNumber: 3, floorClass: '기준층' }),
        createFloor({ id: 'c1-4', floorLabel: '코어1-4F', floorNumber: 4, floorClass: '기준층' }),
        createFloor({ id: 'c1-5', floorLabel: '코어1-5F', floorNumber: 5, floorClass: '최상층' }),
        createFloor({ id: 'c2-3', floorLabel: '코어2-3F', floorNumber: 3, floorClass: '기준층' }),
        createFloor({ id: 'c2-4', floorLabel: '코어2-4F', floorNumber: 4, floorClass: '기준층' }),
      ],
    });

    const rows = createBuildingProcessRows(building);
    const standardRows = rows.filter((row) => row.category === '기준층');

    expect(standardRows.map((row) => row.floorLabel)).toEqual(['4F', '3F']);
    expect(standardRows.map((row) => row.floor?.id)).toEqual(['c1-4', 'c1-3']);
  });

  it('범위형 기준층은 기존처럼 각 층으로 펼쳐서 생성한다', () => {
    const rangeFloor = createFloor({
      id: 'range-2-4',
      floorLabel: '2~4F 기준층',
      floorNumber: 2,
      floorClass: '기준층',
    });
    const building = createBuilding({
      floors: [
        createFloor({ floorLabel: '1F', floorNumber: 1, floorClass: '일반층' }),
        rangeFloor,
        createFloor({ floorLabel: '5F', floorNumber: 5, floorClass: '최상층' }),
      ],
    });

    const rows = createBuildingProcessRows(building);
    const standardRows = rows.filter((row) => row.category === '기준층');

    expect(standardRows.map((row) => row.floorLabel)).toEqual(['4F', '3F', '2F']);
    expect(standardRows.every((row) => row.floor?.id === rangeFloor.id)).toBe(true);
  });
});
