/**
 * 층 ID 유틸리티 함수
 *
 * 층 ID 형식:
 * 1. 일반 층: UUID (e.g., "123e4567-e89b-12d3-a456-426614174000")
 * 2. 범위 기준층: UUID-NF (e.g., "uuid-2F", "uuid-3F")
 * 3. 더미층: dummy-NF (e.g., "dummy-2F")
 * 4. 특별층(버림/기초): group-{buildingId}-{tradeGroup} (e.g., "group-uuid-버림")
 */

// ============================================
// 상수
// ============================================

export const SPECIAL_FLOOR_GROUPS = ['버림', '기초'] as const;
export type SpecialFloorGroup = typeof SPECIAL_FLOOR_GROUPS[number];

export const TRADE_GROUPS = ['버림', '기초', '아파트', '옥탑층'] as const;
export type TradeGroup = typeof TRADE_GROUPS[number];

// ============================================
// 특별층 (버림/기초) ID 관련
// ============================================

/**
 * 특별층 ID 생성
 * @param buildingId 동 ID
 * @param tradeGroup 공종 그룹 (버림, 기초)
 * @returns 특별층 ID (e.g., "group-uuid-버림")
 */
export function createSpecialFloorId(buildingId: string, tradeGroup: string): string {
  return `group-${buildingId}-${tradeGroup}`;
}

/**
 * 특별층 ID 여부 확인
 * @param floorId 층 ID
 * @returns 특별층 여부
 */
export function isSpecialFloorId(floorId: string): boolean {
  return floorId.startsWith('group-');
}

/**
 * 특별층 ID 파싱
 * @param floorId 특별층 ID
 * @returns 파싱된 정보 또는 null
 */
export function parseSpecialFloorId(floorId: string): { buildingId: string; tradeGroup: string } | null {
  if (!isSpecialFloorId(floorId)) return null;

  // "group-{buildingId}-{tradeGroup}" 형식
  const withoutPrefix = floorId.slice(6); // "group-" 제거
  const lastDashIndex = withoutPrefix.lastIndexOf('-');

  if (lastDashIndex === -1) {
    // 이전 형식 호환: "group-{tradeGroup}"
    return { buildingId: '', tradeGroup: withoutPrefix };
  }

  const buildingId = withoutPrefix.slice(0, lastDashIndex);
  const tradeGroup = withoutPrefix.slice(lastDashIndex + 1);

  return { buildingId, tradeGroup };
}

// ============================================
// 더미층 ID 관련
// ============================================

/**
 * 더미층 ID 생성
 * @param floorNum 층 번호
 * @returns 더미층 ID (e.g., "dummy-2F")
 */
export function createDummyFloorId(floorNum: number): string {
  return `dummy-${floorNum}F`;
}

/**
 * 더미층 ID 여부 확인
 * @param floorId 층 ID
 * @returns 더미층 여부
 */
export function isDummyFloorId(floorId: string): boolean {
  return floorId.startsWith('dummy-');
}

/**
 * 더미층 ID 파싱
 * @param floorId 더미층 ID
 * @returns 층 번호 또는 null
 */
export function parseDummyFloorId(floorId: string): number | null {
  if (!isDummyFloorId(floorId)) return null;

  const match = floorId.match(/^dummy-(\d+)F$/);
  return match ? parseInt(match[1], 10) : null;
}

// ============================================
// 범위 기준층 ID 관련
// ============================================

/**
 * 범위 기준층 ID 생성
 * @param baseId 기준층의 UUID
 * @param floorNum 층 번호
 * @returns 범위 기준층 ID (e.g., "uuid-2F")
 */
export function createRangedFloorId(baseId: string, floorNum: number): string {
  return `${baseId}-${floorNum}F`;
}

/**
 * 범위 기준층 ID 여부 확인
 * @param floorId 층 ID
 * @returns 범위 기준층 여부
 */
export function isRangedFloorId(floorId: string): boolean {
  // UUID-NF 형식 (N은 숫자)
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}-\d+F$/i.test(floorId);
}

/**
 * 범위 기준층 ID 파싱
 * @param floorId 범위 기준층 ID
 * @returns 파싱된 정보 또는 null
 */
export function parseRangedFloorId(floorId: string): { baseId: string; floorNum: number } | null {
  if (!isRangedFloorId(floorId)) return null;

  const match = floorId.match(/^(.+)-(\d+)F$/);
  if (!match) return null;

  return {
    baseId: match[1],
    floorNum: parseInt(match[2], 10)
  };
}

// ============================================
// 일반 유틸리티
// ============================================

/**
 * UUID 형식 여부 확인
 * @param id ID 문자열
 * @returns UUID 여부
 */
export function isUUID(id: string): boolean {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(id);
}

/**
 * 유효한 층 ID 여부 확인
 * @param floorId 층 ID
 * @returns 유효한 층 ID 여부
 */
export function isValidFloorId(floorId: string): boolean {
  return (
    isUUID(floorId) ||
    isRangedFloorId(floorId) ||
    isDummyFloorId(floorId) ||
    isSpecialFloorId(floorId)
  );
}

/**
 * 층 ID 타입 반환
 * @param floorId 층 ID
 * @returns 층 ID 타입
 */
export type FloorIdType = 'regular' | 'ranged' | 'dummy' | 'special' | 'unknown';

export function getFloorIdType(floorId: string): FloorIdType {
  if (isSpecialFloorId(floorId)) return 'special';
  if (isDummyFloorId(floorId)) return 'dummy';
  if (isRangedFloorId(floorId)) return 'ranged';
  if (isUUID(floorId)) return 'regular';
  return 'unknown';
}
