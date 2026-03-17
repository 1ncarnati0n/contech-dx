/**
 * Building 메타데이터 타입 가드 및 접근자 유틸리티
 *
 * Supabase에서 반환되는 동적 데이터의 타입 안전 접근을 제공합니다.
 */

import type { BuildingMeta, CoreType, SlabType } from '@/shared/types';

// ============================================
// 타입 가드
// ============================================

/**
 * floorCount 객체 타입 가드
 */
function isFloorCount(
  value: unknown
): value is { basement: number; ground: number; ph: number } {
  if (!value || typeof value !== 'object') return false;
  const v = value as Record<string, unknown>;
  return (
    typeof v.basement === 'number' &&
    typeof v.ground === 'number' &&
    typeof v.ph === 'number'
  );
}

/**
 * BuildingMeta 타입 가드
 */
export function isBuildingMeta(meta: unknown): meta is BuildingMeta {
  if (!meta || typeof meta !== 'object') return false;
  const m = meta as Record<string, unknown>;

  return (
    'floorCount' in m &&
    isFloorCount(m.floorCount) &&
    'coreCount' in m &&
    typeof m.coreCount === 'number'
  );
}

/**
 * CoreType 타입 가드
 */
export function isCoreType(value: unknown): value is CoreType {
  const validCoreTypes: CoreType[] = ['중복도(판상형)', '타워형', '편복도'];
  return typeof value === 'string' && validCoreTypes.includes(value as CoreType);
}

/**
 * SlabType 타입 가드
 */
export function isSlabType(value: unknown): value is SlabType {
  const validSlabTypes: SlabType[] = ['벽식구조', 'RC구조', '벽식구조(내부기둥)'];
  return typeof value === 'string' && validSlabTypes.includes(value as SlabType);
}

// ============================================
// 타입 안전 접근자
// ============================================

/**
 * BuildingMeta 접근자 인터페이스
 */
export interface BuildingMetaAccessor {
  /** 층 수 정보 (basement, ground, ph) */
  getFloorCount(): { basement: number; ground: number; ph: number };
  /** 코어 타입 */
  getCoreType(): CoreType | null;
  /** 슬래브 타입 */
  getSlabType(): SlabType | null;
  /** 코어 수 */
  getCoreCount(): number;
  /** 총 세대수 */
  getTotalUnits(): number;
  /** 원본 메타데이터 (타입 체크 완료) */
  getMeta(): BuildingMeta | null;
}

/**
 * BuildingMeta 타입 안전 접근자 생성
 *
 * @example
 * const accessor = createBuildingMetaAccessor(row.meta);
 * const groundFloors = accessor.getFloorCount().ground;
 * const coreType = accessor.getCoreType() ?? '-';
 */
export function createBuildingMetaAccessor(meta: unknown): BuildingMetaAccessor {
  const safeMeta = isBuildingMeta(meta) ? meta : null;

  return {
    getFloorCount: () =>
      safeMeta?.floorCount ?? { basement: 0, ground: 0, ph: 0 },

    getCoreType: () => {
      if (safeMeta && isCoreType(safeMeta.coreType)) {
        return safeMeta.coreType;
      }
      return null;
    },

    getSlabType: () => {
      if (safeMeta && isSlabType(safeMeta.slabType)) {
        return safeMeta.slabType;
      }
      return null;
    },

    getCoreCount: () => safeMeta?.coreCount ?? 1,

    getTotalUnits: () => safeMeta?.totalUnits ?? 0,

    getMeta: () => safeMeta,
  };
}

// ============================================
// 헬퍼 함수
// ============================================

/**
 * 빌딩 행 데이터에서 메타 정보 추출 (리스트 표시용)
 *
 * @example
 * const rows = buildings.map(b => ({
 *   ...b,
 *   ...extractBuildingDisplayData(b.meta),
 * }));
 */
export function extractBuildingDisplayData(meta: unknown): {
  floorCount: number;
  coreType: string;
  slabType: string;
  coreCount: number;
} {
  const accessor = createBuildingMetaAccessor(meta);

  return {
    floorCount: accessor.getFloorCount().ground,
    coreType: accessor.getCoreType() ?? '-',
    slabType: accessor.getSlabType() ?? '-',
    coreCount: accessor.getCoreCount(),
  };
}

/**
 * 총 층 수 계산 (지하 + 지상 + PH)
 */
export function getTotalFloorCount(meta: unknown): number {
  const accessor = createBuildingMetaAccessor(meta);
  const floors = accessor.getFloorCount();
  return floors.basement + floors.ground + floors.ph;
}
