/**
 * 프로젝트 전역 상수 정의
 *
 * 사용 현황:
 * ✅ 사용 중: ROLE_HIERARCHY, ROLE_DISPLAY_NAMES, ROLE_BADGE_COLORS (permissions/shared.ts)
 * 📋 미사용 (향후 활용 가능): API_ENDPOINTS, ERROR_MESSAGES, SUCCESS_MESSAGES, ROUTES 등
 *
 * 새로운 기능 추가 시 하드코딩 대신 이 상수들을 활용하세요.
 */

/**
 * API 엔드포인트
 * @todo gemini.ts 서비스에서 활용 고려
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
 * 페이지네이션 설정
 */
export const PAGINATION = {
  DEFAULT_PAGE_SIZE: 20,
  MAX_PAGE_SIZE: 100,
  MIN_PAGE_SIZE: 10,
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
 * 역할별 뱃지 색상 (Tailwind CSS 클래스)
 * @deprecated Badge 컴포넌트의 variant를 사용하세요 (ROLE_BADGE_VARIANTS)
 */
export const ROLE_BADGE_COLORS = {
  admin: 'bg-purple-100 text-purple-800 border-purple-300',
  main_user: 'bg-blue-100 text-blue-800 border-blue-300',
  vip_user: 'bg-yellow-100 text-yellow-800 border-yellow-300',
  user: 'bg-gray-100 text-gray-800 border-gray-300',
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

/**
 * 에러 메시지
 */
export const ERROR_MESSAGES = {
  // 인증 관련
  AUTH_REQUIRED: '로그인이 필요합니다.',
  AUTH_INVALID_CREDENTIALS: '이메일 또는 비밀번호가 올바르지 않습니다.',
  AUTH_EMAIL_ALREADY_EXISTS: '이미 가입된 이메일입니다.',
  AUTH_WEAK_PASSWORD: '비밀번호는 최소 6자 이상이어야 합니다.',

  // 권한 관련
  PERMISSION_DENIED: '접근 권한이 없습니다.',
  PERMISSION_ADMIN_ONLY: '관리자만 접근할 수 있습니다.',
  PERMISSION_NOT_OWNER: '자신의 콘텐츠만 수정/삭제할 수 있습니다.',

  // 데이터 관련
  DATA_NOT_FOUND: '요청한 데이터를 찾을 수 없습니다.',
  DATA_FETCH_ERROR: '데이터를 불러오는 중 오류가 발생했습니다.',
  DATA_CREATE_ERROR: '데이터 생성 중 오류가 발생했습니다.',
  DATA_UPDATE_ERROR: '데이터 수정 중 오류가 발생했습니다.',
  DATA_DELETE_ERROR: '데이터 삭제 중 오류가 발생했습니다.',

  // 파일 관련
  FILE_TOO_LARGE: '파일 크기가 너무 큽니다.',
  FILE_INVALID_TYPE: '지원하지 않는 파일 형식입니다.',
  FILE_UPLOAD_ERROR: '파일 업로드 중 오류가 발생했습니다.',

  // Gemini AI 관련
  GEMINI_API_KEY_MISSING: 'Gemini API 키가 설정되지 않았습니다.',
  GEMINI_STORE_NOT_FOUND: '스토어를 찾을 수 없습니다.',
  GEMINI_SEARCH_ERROR: '검색 중 오류가 발생했습니다.',

  // 일반 오류
  GENERAL_ERROR: '오류가 발생했습니다.',
  NETWORK_ERROR: '네트워크 오류가 발생했습니다.',
  UNKNOWN_ERROR: '알 수 없는 오류가 발생했습니다.',
} as const;

/**
 * 성공 메시지
 */
export const SUCCESS_MESSAGES = {
  // 인증 관련
  AUTH_LOGIN_SUCCESS: '로그인되었습니다.',
  AUTH_LOGOUT_SUCCESS: '로그아웃되었습니다.',
  AUTH_SIGNUP_SUCCESS: '회원가입이 완료되었습니다.',

  // 데이터 관련
  DATA_CREATE_SUCCESS: '생성되었습니다.',
  DATA_UPDATE_SUCCESS: '수정되었습니다.',
  DATA_DELETE_SUCCESS: '삭제되었습니다.',

  // 파일 관련
  FILE_UPLOAD_SUCCESS: '파일이 업로드되었습니다.',

  // 역할 관련
  ROLE_UPDATE_SUCCESS: '역할이 변경되었습니다.',
} as const;

/**
 * 애니메이션 지속 시간 (ms)
 */
export const ANIMATION_DURATION = {
  FAST: 150,
  NORMAL: 300,
  SLOW: 500,
} as const;

/**
 * Toast 알림 지속 시간 (ms)
 */
export const TOAST_DURATION = {
  SHORT: 2000,
  NORMAL: 3000,
  LONG: 5000,
} as const;

/**
 * Gemini 모델 설정
 */
export const GEMINI_CONFIG = {
  DEFAULT_MODEL: 'gemini-2.5-flash',
  THINKING_MODEL: 'gemini-2.5-pro',
  API_BASE_URL: 'https://generativelanguage.googleapis.com/v1beta',
  MAX_TOKENS: 8192,
  TEMPERATURE: 0.7,
} as const;

/**
 * 라우트 경로
 */
export const ROUTES = {
  HOME: '/',
  LOGIN: '/login',
  SIGNUP: '/signup',
  PROFILE: '/profile',
  POSTS: '/posts',
  POST_NEW: '/posts/new',
  POST_DETAIL: (id: string) => `/posts/${id}`,
  POST_EDIT: (id: string) => `/posts/${id}/edit`,
  ADMIN_USERS: '/admin/users',
  FILE_SEARCH: '/file-search',
} as const;

/**
 * 로컬 스토리지 키
 */
export const STORAGE_KEYS = {
  THEME: 'theme',
  LAST_SELECTED_STORE: 'lastSelectedStore',
} as const;
