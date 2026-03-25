import type { BuildingMeta, Floor, FloorClass } from '@/shared/types';
import { getSettingFloorNum } from '@/features/building/shared/service/floorHeightResolver';

interface TransformOptions {
  floors: Floor[];
  coreCount: number;
  coreGroundFloors?: number[];
  buildingId: string;
  meta: BuildingMeta;
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
  meta,
}: TransformOptions): Floor[] {
  const settingFloor = getSettingFloorNum(meta);
  const maxGround = Math.max(
    meta.floorCount.ground || 0,
    ...(meta.floorCount.coreGroundFloors || []),
  );

  if (coreCount > 1 && coreGroundFloors && coreGroundFloors.length > 0) {
    return transformMultiCore(floors, coreCount, coreGroundFloors, buildingId, settingFloor, maxGround);
  }
  return transformSingleCore(floors, buildingId, settingFloor, maxGround);
}

/**
 * 층 번호에서 동적 floorClass를 계산
 */
function computeFloorClass(floorNum: number, settingFloor: number, maxGround: number): FloorClass {
  const effectiveSetting = Math.min(settingFloor, maxGround > 1 ? maxGround - 1 : maxGround);
  if (maxGround > 1 && floorNum === maxGround) return '최상층';
  if (effectiveSetting > 0 && floorNum === effectiveSetting) return '셋팅층';
  if (floorNum < effectiveSetting) return '일반층';
  return '기준층';
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
  settingFloor: number,
  maxGround: number,
) {
  let i = 0;
  while (i < groundFloors.length) {
    const current = groundFloors[i];
    const currentFloor = current.floor;
    const dynamicClass = computeFloorClass(current.floorNum, settingFloor, maxGround);

    // 셋팅층, 일반층, 최상층은 개별 추가
    if (dynamicClass === '셋팅층' || dynamicClass === '일반층' || dynamicClass === '최상층') {
      const floorToAdd = currentFloor
        ? { ...currentFloor, floorClass: dynamicClass }
        : { id: `dummy-${current.floorNum}F`, buildingId, coreLabel: 1, floorLabel: `${current.floorNum}F`, floorNumber: current.floorNum, levelType: '지상' as const, floorClass: dynamicClass, height: null };

      if (!addedFloorIds.has(floorToAdd.id)) {
        result.push(floorToAdd);
        addedFloorIds.add(floorToAdd.id);
      }
      i++;
      continue;
    }

    // 기준층: 연속 범위 찾기
    if (dynamicClass === '기준층') {
      if (excludedFloorNums.has(current.floorNum)) {
        i++;
        continue;
      }

      const rangeStart = current.floorNum;
      let rangeEnd = current.floorNum;
      const rangeFloors: Floor[] = currentFloor ? [currentFloor] : [];

      let j = i + 1;
      while (j < groundFloors.length) {
        const next = groundFloors[j];
        const nextClass = computeFloorClass(next.floorNum, settingFloor, maxGround);

        if (excludedFloorNums.has(next.floorNum)) break;
        if (nextClass !== '기준층' || next.floorNum !== rangeEnd + 1) break;

        rangeEnd = next.floorNum;
        if (next.floor) rangeFloors.push(next.floor);
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
        const floorToAdd = currentFloor
          ? { ...currentFloor, floorClass: '기준층' as const }
          : { id: `dummy-${current.floorNum}F`, buildingId, coreLabel: 1, floorLabel: `${current.floorNum}F`, floorNumber: current.floorNum, levelType: '지상' as const, floorClass: '기준층' as const, height: null };

        if (!addedFloorIds.has(floorToAdd.id)) {
          result.push(floorToAdd);
          addedFloorIds.add(floorToAdd.id);
        }
      }

      i = j;
    } else {
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
  settingFloor: number,
  maxGround: number,
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
  mergeConsecutiveStandardFloors(groundFloors, excludedFloorNums, addedFloorIds, buildingId, result, settingFloor, maxGround);

  // 옥탑층
  addPhFloors(floors, result, addedFloorIds);

  return result;
}

// ============================================
// 단일 코어 변환
// ============================================

function transformSingleCore(floors: Floor[], buildingId: string, settingFloor: number, maxGround: number): Floor[] {
  const sortedFloors = [...floors].sort((a, b) => a.floorNumber - b.floorNumber);
  const result: Floor[] = [];
  const addedFloorIds = new Set<string>();

  // 지하층
  addBasementFloors(sortedFloors, result, addedFloorIds);

  // 지상층 (옥탑 제외) → floorNum과 함께 배열 생성
  const groundFloors: Array<{ floor: Floor | null; floorNum: number }> = sortedFloors
    .filter(f => f.levelType === '지상' && f.floorClass !== '옥탑층' && f.floorClass !== 'PH층')
    .map(f => {
      const match = f.floorLabel.match(/(\d+)F/);
      return { floor: f, floorNum: match ? parseInt(match[1], 10) : f.floorNumber };
    });

  // 동일한 mergeConsecutiveStandardFloors 로직 재사용
  mergeConsecutiveStandardFloors(groundFloors, new Set(), addedFloorIds, buildingId, result, settingFloor, maxGround);

  // 옥탑층
  addPhFloors(sortedFloors, result, addedFloorIds);

  return result;
}
