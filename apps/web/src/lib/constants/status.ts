/**
 * 프로젝트 상태 상수
 *
 * 매직 스트링을 제거하고 타입 안전한 상태 관리를 제공합니다.
 */

// ============================================
// 프로젝트 상태
// ============================================

export const PROJECT_STATUS = {
  ANNOUNCEMENT: 'announcement',
  BIDDING: 'bidding',
  AWARD: 'award',
  CONSTRUCTION_START: 'construction_start',
  COMPLETION: 'completion',
} as const;

export type ProjectStatusType = typeof PROJECT_STATUS[keyof typeof PROJECT_STATUS];

export const PROJECT_STATUS_LABELS: Record<ProjectStatusType, string> = {
  [PROJECT_STATUS.ANNOUNCEMENT]: '공모',
  [PROJECT_STATUS.BIDDING]: '입찰',
  [PROJECT_STATUS.AWARD]: '수주',
  [PROJECT_STATUS.CONSTRUCTION_START]: '착공',
  [PROJECT_STATUS.COMPLETION]: '준공',
};

export const PROJECT_STATUS_COLORS: Record<ProjectStatusType, string> = {
  [PROJECT_STATUS.ANNOUNCEMENT]: 'bg-purple-100 text-purple-800 dark:bg-purple-900/30 dark:text-purple-300',
  [PROJECT_STATUS.BIDDING]: 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300',
  [PROJECT_STATUS.AWARD]: 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300',
  [PROJECT_STATUS.CONSTRUCTION_START]: 'bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-300',
  [PROJECT_STATUS.COMPLETION]: 'bg-zinc-100 text-zinc-800 dark:bg-zinc-800 dark:text-zinc-300',
};

/**
 * 모든 프로젝트 상태 값 배열
 */
export const PROJECT_STATUS_VALUES = Object.values(PROJECT_STATUS);

/**
 * 상태가 유효한 ProjectStatusType인지 확인
 */
export function isValidProjectStatus(status: unknown): status is ProjectStatusType {
  return typeof status === 'string' && PROJECT_STATUS_VALUES.includes(status as ProjectStatusType);
}

// ============================================
// 사용자 역할
// ============================================

export const USER_ROLE = {
  ADMIN: 'admin',
  MAIN_USER: 'main_user',
  VIP_USER: 'vip_user',
  USER: 'user',
} as const;

export type UserRoleType = typeof USER_ROLE[keyof typeof USER_ROLE];

export const USER_ROLE_LABELS: Record<UserRoleType, string> = {
  [USER_ROLE.ADMIN]: '관리자',
  [USER_ROLE.MAIN_USER]: '주요 사용자',
  [USER_ROLE.VIP_USER]: 'VIP 사용자',
  [USER_ROLE.USER]: '일반 사용자',
};

export const USER_ROLE_VALUES = Object.values(USER_ROLE);

// ============================================
// 층 레벨 타입
// ============================================

export const LEVEL_TYPE = {
  BASEMENT: 'basement',
  GROUND: 'ground',
  PENTHOUSE: 'penthouse',
} as const;

export type LevelTypeValue = typeof LEVEL_TYPE[keyof typeof LEVEL_TYPE];

export const LEVEL_TYPE_LABELS: Record<LevelTypeValue, string> = {
  [LEVEL_TYPE.BASEMENT]: '지하',
  [LEVEL_TYPE.GROUND]: '지상',
  [LEVEL_TYPE.PENTHOUSE]: '옥탑',
};

// ============================================
// 빌딩 구조 타입
// ============================================

export const CORE_TYPE = {
  JUNGBOKDO: '중복도(판상형)',
  TOWER: '타워형',
  PYEONBOKDO: '편복도',
} as const;

export type CoreTypeValue = typeof CORE_TYPE[keyof typeof CORE_TYPE];

export const SLAB_TYPE = {
  WALL: '벽식구조',
  RC: 'RC구조',
  WALL_INTERNAL: '벽식구조(내부기둥)',
} as const;

export type SlabTypeValue = typeof SLAB_TYPE[keyof typeof SLAB_TYPE];
