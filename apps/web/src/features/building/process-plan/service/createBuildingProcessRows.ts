import type { Building, ProcessCategory, Floor } from '@/shared/types';
import type { ProcessPlanRow } from '../types';

const FLOOR_RANGE_REGEX = /(?:코어\d+-)?(\d+)~(\d+)F/;
const FLOOR_NUMBER_REGEX = /(?:코어\d+-)?(\d+)F$/;

function toRooftopLabel(rawLabel: string): string {
  let cleanLabel = rawLabel.replace(/코어\d+-/, '');
  if (cleanLabel.match(/^PH\d+$/i)) {
    const phMatch = cleanLabel.match(/PH(\d+)/i);
    if (phMatch) {
      cleanLabel = `옥탑${phMatch[1]}`;
    }
  }
  return cleanLabel;
}

function isPrimaryCoreFloor(floor: Floor): boolean {
  return floor.floorLabel.includes('코어1-') || !floor.floorLabel.includes('코어');
}

function getGroundFloorNumber(floor: Floor): number | null {
  if (typeof floor.floorNumber === 'number' && floor.floorNumber > 0) {
    return floor.floorNumber;
  }

  const match = floor.floorLabel.replace(/ 기준층$/, '').match(FLOOR_NUMBER_REGEX);
  return match ? parseInt(match[1], 10) : null;
}

function getRangeFloorNumbers(floorLabel: string): number[] {
  const match = floorLabel.match(FLOOR_RANGE_REGEX);
  if (!match) return [];

  const startFloor = parseInt(match[1], 10);
  const endFloor = parseInt(match[2], 10);
  return Array.from({ length: endFloor - startFloor + 1 }, (_, index) => startFloor + index);
}

function buildStandardFloorMap(floors: Floor[]): Map<number, Floor> {
  const standardFloorMap = new Map<number, Floor>();
  const sortedFloors = [...floors].sort((a, b) => {
    const aIsRange = a.floorLabel.includes('~') ? 1 : 0;
    const bIsRange = b.floorLabel.includes('~') ? 1 : 0;
    return aIsRange - bIsRange;
  });

  sortedFloors.forEach((floor) => {
    const floorNumbers = floor.floorLabel.includes('~')
      ? getRangeFloorNumbers(floor.floorLabel)
      : [getGroundFloorNumber(floor)].filter((value): value is number => value !== null);

    floorNumbers.forEach((floorNumber) => {
      if (!standardFloorMap.has(floorNumber)) {
        standardFloorMap.set(floorNumber, floor);
      }
    });
  });

  return standardFloorMap;
}

export function createBuildingProcessRows(activeBuilding: Building | null): ProcessPlanRow[] {
  if (!activeBuilding) return [];

  const rows: ProcessPlanRow[] = [];
  let rowIndex = 0;
  const floors = activeBuilding.floors;
  const coreCount = activeBuilding.meta.coreCount;
  const coreGroundFloors = activeBuilding.meta.floorCount.coreGroundFloors;

  // 1. 옥탑층 추가 (맨 위)
  const rooftopFloors = floors
    .filter((f) => f.floorClass === '옥탑층')
    .sort((a, b) => (b.floorNumber || 0) - (a.floorNumber || 0));

  rooftopFloors.forEach((floor) => {
    rows.push({
      category: '옥탑층',
      floorLabel: toRooftopLabel(floor.floorLabel),
      floor,
      floorClass: floor.floorClass,
      rowIndex: rowIndex++,
    });
  });

  // 2. PH층 추가
  const phFloors = floors.filter((f) => f.floorClass === 'PH층');
  phFloors.forEach((floor) => {
    rows.push({
      category: '옥탑층',
      floorLabel: toRooftopLabel(floor.floorLabel),
      floor,
      floorClass: floor.floorClass,
      rowIndex: rowIndex++,
    });
  });

  // 3. 지상층 추가 (기준층, 일반층, 셋팅층 순서 - 역순)
  if (coreCount > 1 && coreGroundFloors && coreGroundFloors.length > 0) {
    const core1MaxFloor = coreGroundFloors[0] || 0;
    const primaryCoreFloors = floors.filter(isPrimaryCoreFloor);
    const standardFloors = primaryCoreFloors.filter((f) => f.floorClass === '기준층');

    const topFloorsMultiCore = primaryCoreFloors
      .filter((f) => f.floorClass === '최상층')
      .sort((a, b) => (b.floorNumber || 0) - (a.floorNumber || 0));

    topFloorsMultiCore.forEach((floor) => {
      const floorNum = getGroundFloorNumber(floor);
      if (floorNum === null) return;

      rows.push({
        category: '최상층' as ProcessCategory,
        floorLabel: `${floorNum}F`,
        floor,
        floorClass: '최상층',
        rowIndex: rowIndex++,
      });
    });

    const topFloorNums = new Set<number>(
      topFloorsMultiCore
        .map(getGroundFloorNumber)
        .filter((value): value is number => value !== null)
    );
    const standardFloorMap = buildStandardFloorMap(standardFloors);
    const standardFloorNums = new Set<number>(standardFloorMap.keys());

    Array.from(standardFloorMap.entries())
      .sort(([a], [b]) => b - a)
      .forEach(([floorNum, floor]) => {
        if (topFloorNums.has(floorNum)) return;

        rows.push({
          category: '기준층' as ProcessCategory,
          floorLabel: `${floorNum}F`,
          floor,
          floorClass: '기준층',
          rowIndex: rowIndex++,
        });
      });

    const settingAndNormalFloors: Array<{ floor: Floor; floorNum: number }> = [];
    for (let i = 1; i <= core1MaxFloor; i++) {
      const foundFloor = primaryCoreFloors.find((f) => getGroundFloorNumber(f) === i);

      if (foundFloor && (foundFloor.floorClass === '셋팅층' || foundFloor.floorClass === '일반층')) {
        if (!standardFloorNums.has(i)) {
          settingAndNormalFloors.push({ floor: foundFloor, floorNum: i });
        }
      }
    }

    settingAndNormalFloors.reverse().forEach(({ floor, floorNum }) => {
      rows.push({
        category: (floor.floorClass === '일반층' ? '일반층' : '셋팅층') as ProcessCategory,
        floorLabel: `${floorNum}F`,
        floor,
        floorClass: floor.floorClass,
        rowIndex: rowIndex++,
      });
    });
  } else {
    const groundFloorCount = activeBuilding.meta.floorCount.ground || 0;
    const standardFloors = floors.filter((f) => f.floorClass === '기준층');

    const topFloors = floors
      .filter((f) => f.floorClass === '최상층')
      .sort((a, b) => (b.floorNumber || 0) - (a.floorNumber || 0));
    topFloors.forEach((floor) => {
      const floorNum = getGroundFloorNumber(floor);
      if (floorNum === null) return;

      rows.push({
        category: '최상층' as ProcessCategory,
        floorLabel: `${floorNum}F`,
        floor,
        floorClass: '최상층',
        rowIndex: rowIndex++,
      });
    });

    const topFloorNums = new Set<number>(
      topFloors
        .map(getGroundFloorNumber)
        .filter((value): value is number => value !== null)
    );
    const standardFloorMap = buildStandardFloorMap(standardFloors);
    const standardFloorNumsSingleCore = new Set<number>(standardFloorMap.keys());

    Array.from(standardFloorMap.entries())
      .sort(([a], [b]) => b - a)
      .forEach(([floorNum, floor]) => {
        if (topFloorNums.has(floorNum)) return;

        rows.push({
          category: '기준층' as ProcessCategory,
          floorLabel: `${floorNum}F`,
          floor,
          floorClass: '기준층',
          rowIndex: rowIndex++,
        });
      });

    const settingAndNormalFloors: Array<{ floor: Floor; floorNum: number }> = [];
    for (let i = 1; i <= groundFloorCount; i++) {
      const foundFloor = floors.find((f) => getGroundFloorNumber(f) === i);

      if (foundFloor && (foundFloor.floorClass === '셋팅층' || foundFloor.floorClass === '일반층')) {
        if (!standardFloorNumsSingleCore.has(i)) {
          settingAndNormalFloors.push({ floor: foundFloor, floorNum: i });
        }
      }
    }

    settingAndNormalFloors.reverse().forEach(({ floor, floorNum }) => {
      rows.push({
        category: (floor.floorClass === '일반층' ? '일반층' : '셋팅층') as ProcessCategory,
        floorLabel: `${floorNum}F`,
        floor,
        floorClass: floor.floorClass,
        rowIndex: rowIndex++,
      });
    });
  }

  return rows;
}
