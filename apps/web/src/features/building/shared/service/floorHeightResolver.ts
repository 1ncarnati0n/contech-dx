import type { BuildingMeta, Floor, FloorClass } from '@/shared/types';

type Heights = BuildingMeta['heights'];

/** 셋팅층 오프셋 (필로티 + 이 값 = 셋팅층 번호) */
const SETTING_FLOOR_OFFSET = 2;

/**
 * BuildingMeta에서 셋팅층 번호를 계산
 * 전체 코어 중 최대 필로티 층 + 2 (필로티 없으면 2)
 */
export function getSettingFloorNum(meta: BuildingMeta): number {
  const pilotisHeights = meta.floorCount.corePilotisHeights;
  const maxPiloti = pilotisHeights && pilotisHeights.length > 0
    ? Math.max(...pilotisHeights, 0)
    : 0;
  return maxPiloti + SETTING_FLOOR_OFFSET;
}

/**
 * 지상층의 floorClass를 동적으로 결정
 *
 * - 최상층: 맨 위 층
 * - 셋팅층: 필로티+2 = 딱 한 층
 * - 일반층: 셋팅층 아래
 * - 기준층: 셋팅층 위 ~ 최상층 아래
 */
export function resolveFloorClass(
  floor: Floor,
  meta: BuildingMeta,
): FloorClass {
  // 지하층, 옥탑층은 그대로
  if (floor.levelType === '지하') return '지하층';
  if (floor.floorClass === '옥탑층' || floor.floorClass === 'PH층') return floor.floorClass;

  const floorMatch = floor.floorLabel.match(/(\d+)F/);
  if (!floorMatch) return floor.floorClass;

  const floorNum = parseInt(floorMatch[1], 10);
  const maxGround = Math.max(
    meta.floorCount.ground || 0,
    ...(meta.floorCount.coreGroundFloors || []),
  );
  const settingFloor = getSettingFloorNum(meta);
  const effectiveSetting = Math.min(settingFloor, maxGround > 1 ? maxGround - 1 : maxGround);

  if (maxGround > 1 && floorNum === maxGround) return '최상층';
  if (effectiveSetting > 0 && floorNum === effectiveSetting) return '셋팅층';
  if (floorNum < effectiveSetting) return '일반층';
  return '기준층';
}

/**
 * meta.heights에서 층에 해당하는 층고를 조회하는 순수 함수
 *
 * floor.height가 있으면 그대로 반환하고,
 * null이면 meta.heights에서 floorLabel/floorClass 기반으로 fallback 조회합니다.
 */
export function resolveFloorHeight(floor: Floor, heights: Heights | undefined): number | null {
  if (floor.height !== null && floor.height !== undefined) return floor.height;
  if (!heights) return null;

  if (floor.levelType === '지하') return resolveBasementHeight(floor.floorLabel, heights);
  if (floor.levelType === '지상') return resolveGroundHeight(floor, heights);

  return null;
}

/**
 * meta.heights에서 지하층 높이를 동적으로 조회
 * basementN 키 (basement1, basement2, basement3, basement4) 지원
 */
export function resolveBasementHeight(floorLabel: string, heights: Heights): number | null {
  const match = floorLabel.match(/B(\d+)/);
  if (!match) return null;

  const key = `basement${match[1]}` as keyof Heights;
  const val = heights[key];
  return typeof val === 'number' ? val : null;
}

/**
 * meta.heights에서 지상층 높이를 조회
 * 1~5층 → floorN 키, 그 외 → floorClass 기반 (기준층/최상층/옥탑층)
 */
export function resolveGroundHeight(floor: Floor, heights: Heights): number | null {
  // 1~5층: floorN 키로 직접 조회
  const floorMatch = floor.floorLabel.match(/(\d+)F/);
  if (floorMatch) {
    const num = parseInt(floorMatch[1], 10);
    const byNum = resolveFloorNumHeight(num, heights);
    if (byNum !== null) return byNum;
  }

  // floorClass 기반 fallback
  return resolveFloorClassHeight(floor, heights);
}

/**
 * 층 번호(1~5)에 해당하는 개별 층고 조회
 */
export function resolveFloorNumHeight(floorNum: number, heights: Heights): number | null {
  if (floorNum < 1 || floorNum > 5) return null;

  const key = `floor${floorNum}` as keyof Heights;
  const val = heights[key];
  return typeof val === 'number' ? val : null;
}

/**
 * floorClass 기반 층고 조회 (기준층, 최상층, 옥탑층)
 */
export function resolveFloorClassHeight(floor: Floor, heights: Heights): number | null {
  if (floor.floorClass === '기준층' || floor.floorClass === '셋팅층' || floor.floorClass === '일반층') {
    return typeof heights.standard === 'number' ? heights.standard : null;
  }
  if (floor.floorClass === '최상층') {
    return typeof heights.top === 'number' ? heights.top : null;
  }
  if (floor.floorClass === '옥탑층' || floor.floorClass === 'PH층') {
    return resolvePhHeight(floor.floorLabel, heights);
  }

  // 기본 fallback: 기준층 층고
  return typeof heights.standard === 'number' ? heights.standard : null;
}

/**
 * 옥탑층 층고 조회 (PH1, PH2 등)
 */
export function resolvePhHeight(floorLabel: string, heights: Heights): number | null {
  const match = floorLabel.match(/PH(\d+)/i);
  if (!match || heights.ph == null) return null;

  const idx = parseInt(match[1], 10) - 1;
  if (Array.isArray(heights.ph)) return heights.ph[idx] ?? null;
  return heights.ph;
}
