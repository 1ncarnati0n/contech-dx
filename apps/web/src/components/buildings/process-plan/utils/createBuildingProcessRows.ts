import type { Building, ProcessCategory, Floor } from '@/lib/types';
import type { ProcessPlanRow } from '../types';

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
    const standardRangeFloor = floors.find(
      (f) =>
        f.floorClass === '기준층' &&
        f.floorLabel.includes('~') &&
        (f.floorLabel.includes('코어1-') || !f.floorLabel.includes('코어'))
    );

    const topFloorsMultiCore = floors.filter((f) => {
      if (f.floorClass !== '최상층') return false;
      return f.floorLabel.includes('코어1-') || !f.floorLabel.includes('코어');
    });

    topFloorsMultiCore.forEach((floor) => {
      const floorMatch = floor.floorLabel.match(/(\d+)F/);
      if (!floorMatch) return;

      const floorNum = parseInt(floorMatch[1], 10);
      rows.push({
        category: '최상층' as ProcessCategory,
        floorLabel: `${floorNum}F`,
        floor,
        floorClass: '최상층',
        rowIndex: rowIndex++,
      });
    });

    if (standardRangeFloor) {
      const rangeMatch = standardRangeFloor.floorLabel.match(/(\d+)~(\d+)F/);
      if (rangeMatch) {
        const startFloor = parseInt(rangeMatch[1], 10);
        const endFloor = parseInt(rangeMatch[2], 10);

        const topFloorNums = new Set<number>();
        topFloorsMultiCore.forEach((floor) => {
          const floorMatch = floor.floorLabel.match(/(\d+)F/);
          if (floorMatch) {
            topFloorNums.add(parseInt(floorMatch[1], 10));
          }
        });

        for (let i = endFloor; i >= startFloor; i--) {
          if (topFloorNums.has(i)) continue;
          rows.push({
            category: '기준층' as ProcessCategory,
            floorLabel: `${i}F`,
            floor: standardRangeFloor,
            floorClass: '기준층',
            rowIndex: rowIndex++,
          });
        }
      }
    }

    const standardRangeFloorNums = new Set<number>();
    if (standardRangeFloor) {
      const rangeMatch = standardRangeFloor.floorLabel.match(/(\d+)~(\d+)F/);
      if (rangeMatch) {
        const startFloor = parseInt(rangeMatch[1], 10);
        const endFloor = parseInt(rangeMatch[2], 10);
        for (let i = startFloor; i <= endFloor; i++) {
          standardRangeFloorNums.add(i);
        }
      }
    }

    const settingAndNormalFloors: Array<{ floor: Floor; floorNum: number }> = [];
    for (let i = 1; i <= core1MaxFloor; i++) {
      const foundFloor = floors.find((f) => {
        const exactMatch = f.floorLabel.match(/코어1-(\d+)F$/);
        if (exactMatch && parseInt(exactMatch[1], 10) === i) {
          return true;
        }

        const rangeMatch = f.floorLabel.match(/코어1-(\d+)~(\d+)F 기준층/);
        if (!rangeMatch) return false;
        const start = parseInt(rangeMatch[1], 10);
        const end = parseInt(rangeMatch[2], 10);
        return i >= start && i <= end;
      });

      if (foundFloor && (foundFloor.floorClass === '셋팅층' || foundFloor.floorClass === '일반층')) {
        if (!standardRangeFloorNums.has(i)) {
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
    const standardRangeFloor = floors.find(
      (f) => f.floorClass === '기준층' && f.floorLabel.includes('~')
    );

    const topFloors = floors.filter((f) => f.floorClass === '최상층');
    topFloors.forEach((floor) => {
      const floorMatch = floor.floorLabel.match(/(\d+)F/);
      if (!floorMatch) return;

      const floorNum = parseInt(floorMatch[1], 10);
      rows.push({
        category: '최상층' as ProcessCategory,
        floorLabel: `${floorNum}F`,
        floor,
        floorClass: '최상층',
        rowIndex: rowIndex++,
      });
    });

    if (standardRangeFloor) {
      const rangeMatch = standardRangeFloor.floorLabel.match(/(\d+)~(\d+)F/);
      if (rangeMatch) {
        const startFloor = parseInt(rangeMatch[1], 10);
        const endFloor = parseInt(rangeMatch[2], 10);

        const topFloorNums = new Set<number>();
        topFloors.forEach((floor) => {
          const floorMatch = floor.floorLabel.match(/(\d+)F/);
          if (floorMatch) {
            topFloorNums.add(parseInt(floorMatch[1], 10));
          }
        });

        for (let i = endFloor; i >= startFloor; i--) {
          if (topFloorNums.has(i)) continue;
          rows.push({
            category: '기준층' as ProcessCategory,
            floorLabel: `${i}F`,
            floor: standardRangeFloor,
            floorClass: '기준층',
            rowIndex: rowIndex++,
          });
        }
      }
    }

    const standardRangeFloorNumsSingleCore = new Set<number>();
    if (standardRangeFloor) {
      const rangeMatch = standardRangeFloor.floorLabel.match(/(\d+)~(\d+)F/);
      if (rangeMatch) {
        const startFloor = parseInt(rangeMatch[1], 10);
        const endFloor = parseInt(rangeMatch[2], 10);
        for (let i = startFloor; i <= endFloor; i++) {
          standardRangeFloorNumsSingleCore.add(i);
        }
      }
    }

    const settingAndNormalFloors: Array<{ floor: Floor; floorNum: number }> = [];
    for (let i = 1; i <= groundFloorCount; i++) {
      const foundFloor = floors.find((f) => {
        if (f.floorLabel === `${i}F` && (f.floorClass === '셋팅층' || f.floorClass === '일반층')) {
          return true;
        }
        const rangeMatch = f.floorLabel.match(/(\d+)~(\d+)F 기준층/);
        if (!rangeMatch) return false;
        const start = parseInt(rangeMatch[1], 10);
        const end = parseInt(rangeMatch[2], 10);
        return i >= start && i <= end;
      });

      if (foundFloor && (foundFloor.floorClass === '셋팅층' || foundFloor.floorClass === '일반층')) {
        if (!standardRangeFloorNumsSingleCore.has(i)) {
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
