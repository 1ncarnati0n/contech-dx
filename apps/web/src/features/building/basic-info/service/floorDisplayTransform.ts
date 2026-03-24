import type { Floor } from '@/shared/types';

interface TransformOptions {
  floors: Floor[];
  coreCount: number;
  coreGroundFloors?: number[];
  buildingId: string;
}

/**
 * 층 목록을 화면 표시용으로 변환하는 순수 함수
 *
 * - 지하층: cleanLabel 기준 중복 제거
 * - 지상층: 연속된 기준층을 범위(예: 2~14F)로 묶음
 * - 다중 코어: 코어1 최대 층수를 기준으로 표 작성
 * - 옥탑층: 마지막에 추가
 */
export function transformFloorsForDisplay({
  floors,
  coreCount,
  coreGroundFloors,
  buildingId,
}: TransformOptions): Floor[] {
  if (coreCount > 1 && coreGroundFloors && coreGroundFloors.length > 0) {
    return transformMultiCore(floors, coreCount, coreGroundFloors, buildingId);
  }
  return transformSingleCore(floors, buildingId);
}

// ============================================
// 지하층/옥탑층 공통 헬퍼
// ============================================

function addBasementFloors(floors: Floor[], result: Floor[], addedFloorIds: Set<string>) {
  const basementFloors = floors.filter(f => f.levelType === '지하');
  const addedLabels = new Set<string>();

  basementFloors.forEach(f => {
    if (addedLabels.has(f.floorLabel)) return;
    addedLabels.add(f.floorLabel);

    if (!addedFloorIds.has(f.id)) {
      result.push(f);
      addedFloorIds.add(f.id);
    }
  });
}

function addPhFloors(floors: Floor[], result: Floor[], addedFloorIds: Set<string>) {
  const phFloors = floors.filter(f => f.floorClass === '옥탑층' || f.floorClass === 'PH층');
  phFloors.forEach(f => {
    if (!addedFloorIds.has(f.id)) {
      result.push(f);
      addedFloorIds.add(f.id);
    }
  });
}

// ============================================
// 범위 파싱 헬퍼
// ============================================

function parseRangeLabel(label: string): { start: number; end: number } | null {
  const match = label.match(/(\d+)~(\d+)F/);
  if (!match) return null;
  return { start: parseInt(match[1], 10), end: parseInt(match[2], 10) };
}

function buildExcludedSets(
  floors: Floor[],
  existingRangeFloors: Floor[],
  tallestCoreLabel: number = 1,
): { excludedFloorNums: Set<number>; excludedFloorIds: Set<string> } {
  const excludedFloorNums = new Set<number>();
  const excludedFloorIds = new Set<string>();

  existingRangeFloors.forEach(rangeFloor => {
    const range = parseRangeLabel(rangeFloor.floorLabel);
    if (!range) return;

    for (let num = range.start; num <= range.end; num++) {
      excludedFloorNums.add(num);

      const individualFloor = floors.find(f => {
        if (f.floorLabel.includes('~')) return false;
        const m = f.floorLabel.match(/^(\d+)F$/);
        if (m && parseInt(m[1], 10) === num && f.coreLabel === tallestCoreLabel) return true;
        return false;
      });
      if (individualFloor) {
        excludedFloorIds.add(individualFloor.id);
      }
    }
  });

  return { excludedFloorNums, excludedFloorIds };
}

// ============================================
// 연속 기준층 범위 묶기
// ============================================

function mergeConsecutiveStandardFloors(
  groundFloors: Array<{ floor: Floor | null; floorNum: number }>,
  excludedFloorNums: Set<number>,
  addedFloorIds: Set<string>,
  buildingId: string,
  result: Floor[],
) {
  let i = 0;
  while (i < groundFloors.length) {
    const current = groundFloors[i];
    const currentFloor = current.floor;

    // 셋팅층, 일반층, 최상층은 개별 추가
    if (currentFloor && (currentFloor.floorClass === '셋팅층' || currentFloor.floorClass === '일반층' || currentFloor.floorClass === '최상층')) {
      if (!addedFloorIds.has(currentFloor.id)) {
        result.push(currentFloor);
        addedFloorIds.add(currentFloor.id);
      }
      i++;
      continue;
    }

    // 기준층: 연속 범위 찾기
    if (currentFloor && currentFloor.floorClass === '기준층') {
      if (excludedFloorNums.has(current.floorNum)) {
        i++;
        continue;
      }

      const rangeStart = current.floorNum;
      let rangeEnd = current.floorNum;
      const rangeFloors: Floor[] = [currentFloor];

      let j = i + 1;
      while (j < groundFloors.length) {
        const next = groundFloors[j];
        const nextFloor = next.floor;

        if (excludedFloorNums.has(next.floorNum)) break;
        if (!nextFloor || nextFloor.floorClass !== '기준층' || next.floorNum !== rangeEnd + 1) break;

        rangeEnd = next.floorNum;
        rangeFloors.push(nextFloor);
        j++;
      }

      if (rangeEnd > rangeStart) {
        const dummyId = `dummy-range-${rangeStart}~${rangeEnd}F`;
        if (!addedFloorIds.has(dummyId)) {
          result.push({
            id: dummyId,
            buildingId,
            coreLabel: 1,
            floorLabel: `${rangeStart}~${rangeEnd}F`,
            floorNumber: rangeStart,
            levelType: '지상',
            floorClass: '기준층',
            height: rangeFloors[0]?.height || null,
          });
          addedFloorIds.add(dummyId);
        }
      } else {
        if (currentFloor && !addedFloorIds.has(currentFloor.id)) {
          result.push(currentFloor);
          addedFloorIds.add(currentFloor.id);
        }
      }

      i = j;
    } else {
      // 층이 없거나 다른 분류
      const isTopFloor = current.floor === null && current.floorNum === groundFloors[groundFloors.length - 1]?.floorNum;
      const dummyId = `dummy-${current.floorNum}F`;
      if (!addedFloorIds.has(dummyId)) {
        result.push({
          id: dummyId,
          buildingId,
          coreLabel: 1,
          floorLabel: `${current.floorNum}F`,
          floorNumber: current.floorNum,
          levelType: '지상',
          floorClass: isTopFloor ? '최상층' : '기준층',
          height: null,
        });
        addedFloorIds.add(dummyId);
      }
      i++;
    }
  }
}

// ============================================
// 다중 코어 변환
// ============================================

function transformMultiCore(
  floors: Floor[],
  _coreCount: number,
  coreGroundFloors: number[],
  buildingId: string,
): Floor[] {
  const result: Floor[] = [];
  const addedFloorIds = new Set<string>();

  // 가장 높은 코어 기준으로 층 표시
  const maxGroundFloor = Math.max(...coreGroundFloors, 0);
  // 가장 높은 코어의 coreLabel (1-based)
  const tallestCoreIndex = coreGroundFloors.indexOf(maxGroundFloor);
  const tallestCoreLabel = tallestCoreIndex + 1;

  // 지하층
  addBasementFloors(floors, result, addedFloorIds);

  // 기존 범위 형식 기준층 찾기 (가장 높은 코어 기준)
  const existingRangeFloors = floors.filter(f =>
    f.floorClass === '기준층' &&
    f.floorLabel.includes('~') &&
    f.coreLabel === tallestCoreLabel
  );

  const { excludedFloorNums, excludedFloorIds } = buildExcludedSets(floors, existingRangeFloors, tallestCoreLabel);

  // 셋팅층, 일반층 추가 (가장 높은 코어 기준)
  const settingAndNormalFloors = floors.filter(f => {
    if (f.floorClass !== '셋팅층' && f.floorClass !== '일반층') return false;
    if (f.coreLabel !== tallestCoreLabel) return false;
    if (f.floorLabel.includes('~')) return false;
    if (excludedFloorIds.has(f.id)) return false;

    const match = f.floorLabel.match(/^(\d+)F$/);
    if (match) {
      const floorNum = parseInt(match[1], 10);
      if (excludedFloorNums.has(floorNum)) return false;
    }
    return true;
  }).sort((a, b) => a.floorNumber - b.floorNumber);

  settingAndNormalFloors.forEach(f => {
    if (!addedFloorIds.has(f.id)) {
      result.push(f);
      addedFloorIds.add(f.id);
    }
  });

  // 기존 범위 형식 기준층 추가
  existingRangeFloors.forEach(f => {
    if (!addedFloorIds.has(f.id)) {
      result.push(f);
      addedFloorIds.add(f.id);
    }
  });

  // 가장 높은 코어 기준 지상층 수집 (범위 포함 층 제외)
  const groundFloors: Array<{ floor: Floor | null; floorNum: number }> = [];

  for (let i = 1; i <= maxGroundFloor; i++) {
    if (excludedFloorNums.has(i)) continue;

    const refFloor = floors.find(f => {
      if (f.floorLabel.includes('~')) return false;
      if (excludedFloorIds.has(f.id)) return false;
      if (f.coreLabel !== tallestCoreLabel) return false;

      const m = f.floorLabel.match(/^(\d+)F$/);
      if (!m) return false;
      const floorNum = parseInt(m[1], 10);

      if (excludedFloorNums.has(floorNum)) return false;
      return floorNum === i;
    });

    if (refFloor) {
      groundFloors.push({ floor: refFloor, floorNum: i });
    } else {
      groundFloors.push({ floor: null, floorNum: i });
    }
  }

  // 연속 기준층 범위 묶기
  mergeConsecutiveStandardFloors(groundFloors, excludedFloorNums, addedFloorIds, buildingId, result);

  // 옥탑층
  addPhFloors(floors, result, addedFloorIds);

  return result;
}

// ============================================
// 단일 코어 변환
// ============================================

function transformSingleCore(floors: Floor[], buildingId: string): Floor[] {
  const sortedFloors = [...floors].sort((a, b) => a.floorNumber - b.floorNumber);
  const result: Floor[] = [];
  const addedFloorIds = new Set<string>();

  // 지하층
  addBasementFloors(sortedFloors, result, addedFloorIds);

  // 지상층 (옥탑 제외)
  const groundFloors = sortedFloors.filter(
    f => f.levelType === '지상' && f.floorClass !== '옥탑층' && f.floorClass !== 'PH층'
  );

  let i = 0;
  while (i < groundFloors.length) {
    const current = groundFloors[i];

    // 셋팅층, 일반층, 최상층 → 개별 추가
    if (current.floorClass === '셋팅층' || current.floorClass === '일반층' || current.floorClass === '최상층') {
      result.push(current);
      i++;
      continue;
    }

    // 기준층 → 연속 범위 묶기
    if (current.floorClass === '기준층') {
      const rangeStart = current.floorNumber;
      let rangeEnd = current.floorNumber;
      const rangeFloors: Floor[] = [current];

      let j = i + 1;
      while (j < groundFloors.length) {
        const next = groundFloors[j];
        if (next.floorClass !== '기준층' || next.floorNumber !== rangeEnd + 1) break;
        rangeEnd = next.floorNumber;
        rangeFloors.push(next);
        j++;
      }

      if (rangeEnd > rangeStart) {
        const existingRangeFloor = floors.find(
          f => f.floorClass === '기준층' && f.floorLabel.includes('~')
        );

        if (existingRangeFloor) {
          if (!addedFloorIds.has(existingRangeFloor.id)) {
            result.push(existingRangeFloor);
            addedFloorIds.add(existingRangeFloor.id);
          }
        } else {
          const dummyId = `dummy-range-${rangeStart}~${rangeEnd}F`;
          if (!addedFloorIds.has(dummyId)) {
            result.push({
              id: dummyId,
              buildingId,
              coreLabel: 1,
              floorLabel: `${rangeStart}~${rangeEnd}F`,
              floorNumber: rangeStart,
              levelType: '지상',
              floorClass: '기준층',
              height: rangeFloors[0]?.height || null,
            });
            addedFloorIds.add(dummyId);
          }
        }
      } else {
        if (!addedFloorIds.has(current.id)) {
          result.push(current);
          addedFloorIds.add(current.id);
        }
      }

      i = j;
    } else {
      if (!addedFloorIds.has(current.id)) {
        result.push(current);
        addedFloorIds.add(current.id);
      }
      i++;
    }
  }

  // 옥탑층
  addPhFloors(sortedFloors, result, addedFloorIds);

  return result;
}
