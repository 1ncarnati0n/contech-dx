/**
 * 프로젝트 전역 상수 정의
 *
 * 사용 현황:
 * ✅ 사용 중: API_ENDPOINTS, ALLOWED_FILE_TYPES, FILE_SIZE_LIMITS (file-search)
 * ✅ 사용 중: ROLE_HIERARCHY, ROLE_DISPLAY_NAMES, ROLE_BADGE_VARIANTS (permissions)
 */

/**
 * API 엔드포인트
 */
export const API_ENDPOINTS = {
  // Gemini AI
  GEMINI_LIST_STORES: '/api/gemini/list-stores',
  GEMINI_CREATE_STORE: '/api/gemini/create-store',
  GEMINI_DELETE_STORE: '/api/gemini/delete-store',
  GEMINI_GET_STORE: '/api/gemini/get-store',
  GEMINI_LIST_FILES: '/api/gemini/list-files',
  GEMINI_UPLOAD_FILE: '/api/gemini/upload-file',
  GEMINI_DELETE_FILE: '/api/gemini/delete-file',
  GEMINI_SEARCH: '/api/gemini/search',

  // Auth
  AUTH_CALLBACK: '/auth/callback',
} as const;

/**
 * 허용되는 파일 타입
 */
export const ALLOWED_FILE_TYPES = [
  '.pdf',
  '.docx',
  '.doc',
  '.txt',
  '.json',
  '.csv',
  '.xlsx',
  '.xls',
] as const;

/**
 * 파일 크기 제한 (바이트)
 */
export const FILE_SIZE_LIMITS = {
  MAX_FILE_SIZE: 50 * 1024 * 1024, // 50MB
  MAX_TOTAL_SIZE: 200 * 1024 * 1024, // 200MB
} as const;

/**
 * 사용자 역할 계층 (숫자가 높을수록 높은 권한)
 */
export const ROLE_HIERARCHY = {
  admin: 4,
  main_user: 3,
  vip_user: 2,
  user: 1,
} as const;

/**
 * 역할 표시 이름 (한글)
 */
export const ROLE_DISPLAY_NAMES = {
  admin: '관리자',
  main_user: '주요 사용자',
  vip_user: 'VIP 사용자',
  user: '일반 사용자',
} as const;

/**
 * 역할별 Badge 컴포넌트 variant
 * Badge 컴포넌트의 variant prop과 타입 안전하게 매핑됩니다.
 */
export const ROLE_BADGE_VARIANTS = {
  admin: 'admin',
  main_user: 'main_user',
  vip_user: 'vip_user',
  user: 'user',
} as const;

export type RoleBadgeVariant = (typeof ROLE_BADGE_VARIANTS)[keyof typeof ROLE_BADGE_VARIANTS];
