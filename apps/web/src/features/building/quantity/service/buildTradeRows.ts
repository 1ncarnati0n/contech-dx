import type { Building, Floor } from '@/shared/types';
import { TRADE_GROUPS } from '@/features/building/shared/service/floorIdUtils';

export type RowInfo = {
  type: 'group' | 'floor' | 'summary';
  label: string;
  floor?: Floor;
  tradeGroup?: string;
};

/**
 * 물량 입력 테이블의 행 목록을 생성하는 순수 함수.
 */
export function buildTradeRows(building: Building, floors: Floor[]): RowInfo[] {
  const result: RowInfo[] = [];

  // 버림, 기초 그룹 행
  TRADE_GROUPS.slice(0, 2).forEach(group => {
    result.push({ type: 'group', label: group, tradeGroup: group });
  });

  const coreCount = building.meta.coreCount;
  const coreGroundFloors = building.meta.floorCount.coreGroundFloors;

  if (coreCount > 1 && coreGroundFloors && coreGroundFloors.length > 0) {
    buildMultiCoreRows(result, building, floors, coreGroundFloors);
  } else {
    buildSingleCoreRows(result, building, floors);
  }

  result.push({ type: 'summary', label: '소계' });
  return result;
}

function buildMultiCoreRows(
  result: RowInfo[],
  building: Building,
  floors: Floor[],
  coreGroundFloors: number[],
) {
  // 가장 높은 코어 기준
  const tallestCoreIndex = coreGroundFloors.indexOf(Math.max(...coreGroundFloors));
  const tallestCoreLabel = tallestCoreIndex + 1;
  let maxFloor = coreGroundFloors[tallestCoreIndex] || 0;

  // 가장 높은 코어의 지상층 필터 (coreLabel 기반)
  const refCoreFloors = floors.filter(f =>
    f.coreLabel === tallestCoreLabel && f.levelType === '지상' &&
    f.floorClass !== '옥탑층' && f.floorClass !== 'PH층'
  );

  refCoreFloors.forEach(floor => {
    const match = floor.floorLabel.match(/^(\d+)F$/);
    if (match) {
      const floorNum = parseInt(match[1], 10);
      if (floorNum > maxFloor) maxFloor = floorNum;
    }
    const rangeMatch = floor.floorLabel.match(/(\d+)~(\d+)F/);
    if (rangeMatch) {
      const end = parseInt(rangeMatch[2], 10);
      if (end > maxFloor) maxFloor = end;
    }
  });

  // 지하층
  addBasementFloors(result, floors);

  // 지상층 (가장 높은 코어 기준)
  for (let i = 1; i <= maxFloor; i++) {
    const foundFloor = refCoreFloors.find(f => {
      const match = f.floorLabel.match(/^(\d+)F$/);
      if (match && parseInt(match[1], 10) === i) return true;
      const rangeMatch = f.floorLabel.match(/(\d+)~(\d+)F/);
      if (rangeMatch) {
        const start = parseInt(rangeMatch[1], 10);
        const end = parseInt(rangeMatch[2], 10);
        return i >= start && i <= end;
      }
      return false;
    });

    addGroundFloor(result, building, foundFloor, i, maxFloor);
  }

  // 옥탑층
  addPenthouseFloors(result, floors);
}

function buildSingleCoreRows(
  result: RowInfo[],
  building: Building,
  floors: Floor[],
) {
  let groundFloorCount = building.meta.floorCount.ground || 0;

  floors.filter(f => f.levelType === '지상').forEach(floor => {
    const match = floor.floorLabel.match(/^(\d+)F$/);
    if (match) {
      const floorNum = parseInt(match[1], 10);
      if (floorNum > groundFloorCount) groundFloorCount = floorNum;
    }
    const rangeMatch = floor.floorLabel.match(/(\d+)~(\d+)F/);
    if (rangeMatch) {
      const end = parseInt(rangeMatch[2], 10);
      if (end > groundFloorCount) groundFloorCount = end;
    }
  });

  // 지하층
  addBasementFloors(result, floors);

  // 지상층
  for (let i = 1; i <= groundFloorCount; i++) {
    const foundFloor = floors.find(f => {
      if (f.floorLabel === `${i}F`) return true;
      const rangeMatch = f.floorLabel.match(/(\d+)~(\d+)F/);
      if (rangeMatch) {
        const start = parseInt(rangeMatch[1], 10);
        const end = parseInt(rangeMatch[2], 10);
        return i >= start && i <= end;
      }
      return false;
    });

    addGroundFloor(result, building, foundFloor, i, groundFloorCount);
  }

  // 옥탑층
  addPenthouseFloors(result, floors);
}

function addBasementFloors(result: RowInfo[], floors: Floor[]) {
  const basementFloors = floors.filter(f => f.levelType === '지하');
  const addedLabels = new Set<string>();
  basementFloors.forEach(floor => {
    const cleanLabel = floor.floorLabel.replace(/코어\d+-/, '');
    if (addedLabels.has(cleanLabel)) return;
    addedLabels.add(cleanLabel);
    result.push({ type: 'floor', label: cleanLabel, floor });
  });
}

function addGroundFloor(
  result: RowInfo[],
  building: Building,
  foundFloor: Floor | undefined,
  floorNum: number,
  maxFloor: number,
) {
  if (foundFloor) {
    if (foundFloor.floorLabel.includes('~') && foundFloor.floorClass === '기준층') {
      result.push({
        type: 'floor',
        label: `${floorNum}F`,
        floor: { ...foundFloor, id: `${foundFloor.id}-${floorNum}F`, floorLabel: `${floorNum}F`, floorNumber: floorNum },
      });
    } else {
      result.push({ type: 'floor', label: `${floorNum}F`, floor: foundFloor });
    }
  } else {
    result.push({
      type: 'floor',
      label: `${floorNum}F`,
      floor: {
        id: `dummy-${floorNum}F`,
        buildingId: building.id,
        floorLabel: `${floorNum}F`,
        floorNumber: floorNum,
        levelType: '지상',
        floorClass: floorNum === 1 ? '셋팅층' : (floorNum === maxFloor ? '최상층' : '기준층'),
        height: null,
      } as Floor,
    });
  }
}

function addPenthouseFloors(result: RowInfo[], floors: Floor[]) {
  floors.filter(f => f.floorClass === '옥탑층').forEach(floor => {
    let label = floor.floorLabel.replace(/코어\d+-/, '');
    const phMatch = label.match(/^PH(\d+)/i);
    if (phMatch) label = `옥탑${phMatch[1]}`;
    result.push({ type: 'floor', label, floor });
  });
}
