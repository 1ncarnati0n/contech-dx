/**
 * UUID 생성 유틸리티
 *
 * Gantt 차트의 모든 엔티티(Task, Milestone, Dependency)에서 사용되는
 * 표준화된 UUID 생성 함수입니다.
 *
 * Supabase의 gen_random_uuid()와 호환되는 형식을 사용합니다.
 */

/**
 * 표준 UUID v4 생성
 *
 * @returns UUID 문자열 (예: "550e8400-e29b-41d4-a716-446655440000")
 *
 * @example
 * const taskId = generateId();
 * const milestoneId = generateId();
 * const dependencyId = generateId();
 */
export const generateId = (): string => {
  // crypto.randomUUID()는 모든 modern 브라우저와 Node.js 16+에서 지원
  if (typeof crypto !== 'undefined' && crypto.randomUUID) {
    return crypto.randomUUID();
  }

  // Fallback: 브라우저 또는 Node.js 환경에서 crypto가 없는 경우
  // RFC 4122 version 4 UUID 형식으로 생성
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
    const r = (Math.random() * 16) | 0;
    const v = c === 'x' ? r : (r & 0x3) | 0x8;
    return v.toString(16);
  });
};

/**
 * UUID 유효성 검사
 *
 * @param id - 검사할 문자열
 * @returns UUID 형식인지 여부
 *
 * @example
 * isValidUUID("550e8400-e29b-41d4-a716-446655440000") // true
 * isValidUUID("task-1234567890") // false
 */
export const isValidUUID = (id: string): boolean => {
  const uuidRegex =
    /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
  return uuidRegex.test(id);
};

/**
 * Legacy ID (timestamp 기반)인지 확인
 *
 * @param id - 검사할 문자열
 * @returns Legacy ID 형식인지 여부
 *
 * @example
 * isLegacyId("task-1704067200000") // true
 * isLegacyId("550e8400-e29b-41d4-a716-446655440000") // false
 */
export const isLegacyId = (id: string): boolean => {
  // task-{timestamp}, cp-{timestamp}, milestone-{timestamp}, dep-{timestamp} 형식
  return /^(task|cp|milestone|dep|group|m)-\d+/.test(id);
};
