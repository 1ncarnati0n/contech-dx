/**
 * 프로젝트 타입 정의
 */

// ============================================
// 기본 타입
// ============================================

/**
 * 회원 등급 타입
 */
export type UserRole = 'admin' | 'main_user' | 'vip_user' | 'user';

/**
 * 작성자 정보 (Post, Comment에서 공통 사용)
 */
export interface Author {
  email: string;
  role?: UserRole;
}

// ============================================
// 데이터베이스 모델 타입
// ============================================

/**
 * 게시글 타입
 */
export interface Post {
  id: string;
  title: string;
  content: string;
  author_id: string;
  author?: Author | null;
  created_at: string;
  updated_at: string;
}

/**
 * 댓글 타입
 */
export interface Comment {
  id: string;
  post_id: string;
  content: string;
  author_id: string;
  author?: Author | null;
  post?: Pick<Post, 'id' | 'title'> | null;
  created_at: string;
}

/**
 * 사용자 프로필 타입
 */
export interface Profile {
  id: string;
  email: string;
  role: UserRole;
  display_name?: string | null;
  avatar_url?: string | null;
  bio?: string | null;
  created_at: string;
  updated_at?: string;
}

// ============================================
// API 응답 타입
// ============================================

/**
 * API 에러 타입
 */
export interface ApiError {
  code?: string;
  message: string;
  details?: Record<string, unknown>;
}

/**
 * 표준 API 응답 타입
 */
export interface ApiResponse<T = unknown> {
  success: boolean;
  data?: T;
  error?: ApiError;
}

/**
 * 페이지네이션 파라미터
 */
export interface PaginationParams {
  page: number;
  perPage: number;
}

/**
 * 페이지네이션된 응답 타입
 */
export interface PaginatedResponse<T> {
  data: T[];
  count: number;
  page: number;
  perPage: number;
  totalPages: number;
}

// ============================================
// 역할 통계 타입
// ============================================

/**
 * 역할별 사용자 통계
 */
export interface RoleStats {
  total: number;
  admin: number;
  main_user: number;
  vip_user: number;
  user: number;
}

// ============================================
// 폼 입력 타입
// ============================================

/**
 * 로그인 폼 입력
 */
export interface LoginFormInput {
  email: string;
  password: string;
}

/**
 * 회원가입 폼 입력
 */
export interface SignupFormInput {
  email: string;
  password: string;
  confirmPassword: string;
}

/**
 * 게시글 폼 입력
 */
export interface PostFormInput {
  title: string;
  content: string;
}

/**
 * 댓글 폼 입력
 */
export interface CommentFormInput {
  content: string;
}

/**
 * 프로필 수정 폼 입력
 */
export interface ProfileFormInput {
  display_name?: string;
  bio?: string;
  avatar_url?: string;
}

// ============================================
// Gemini AI 관련 타입
// ============================================

/**
 * 파일 검색 스토어
 */
export interface FileSearchStore {
  name: string;
  displayName: string;
  createTime: string;
}

/**
 * 업로드된 파일
 */
export interface UploadedFile {
  name: string;
  displayName: string;
  mimeType: string;
  sizeBytes: string;
  createTime: string;
  uri: string;
}

/**
 * 검색 인용 정보
 */
export interface SearchCitation {
  startIndex: number;
  endIndex: number;
  uri: string;
  title: string;
}

/**
 * 검색 메시지
 */
export interface SearchMessage {
  role: 'user' | 'assistant';
  content: string;
  citations?: SearchCitation[];
}

// ============================================
// Gemini API 응답 타입 (서버 사이드)
// ============================================

/**
 * Gemini File Search Store (API 원본 응답)
 */
export interface GeminiFileSearchStore {
  name: string;
  displayName: string;
  createTime: string;
  activeDocumentsCount?: number;
  pendingDocumentsCount?: number;
  failedDocumentsCount?: number;
  sizeBytes?: string;
}

/**
 * Gemini Document (API 원본 응답)
 */
export interface GeminiDocument {
  name: string;
  displayName: string;
  mimeType: string;
  sizeBytes: string;
  createTime: string;
  state: string;
}

/**
 * Gemini Citation (API 원본 응답)
 */
export interface GeminiCitation {
  startIndex: number;
  endIndex: number;
  uri?: string;
  license?: string;
}

/**
 * Gemini API 에러 응답
 */
export interface GeminiApiError {
  error?: {
    code: number;
    message: string;
    status: string;
  };
}

// ============================================
// 컴포넌트 Props 타입
// ============================================

/**
 * 게시글 목록 Props
 */
export interface PostsListProps {
  posts: (Post & { author: Author | null })[];
}

/**
 * 댓글 목록 Props
 */
export interface CommentListProps {
  postId: string;
}

/**
 * 모바일 메뉴 Props
 */
export interface MobileMenuProps {
  user: { id: string; email?: string } | null;
  profile: Profile | null;
  isAdmin: boolean;
}

// ============================================
// 프로젝트 관리 타입
// ============================================

/**
 * 프로젝트 상태
 */
export type ProjectStatus = 'planning' | 'active' | 'completed' | 'on_hold' | 'cancelled' | 'dummy';

/**
 * 프로젝트 멤버 역할
 */
export type ProjectMemberRole = 'pm' | 'engineer' | 'supervisor' | 'worker' | 'member';

/**
 * 프로젝트 타입
 */
export interface Project {
  id: string;
  name: string;
  description?: string;
  location?: string;
  client?: string;
  contract_amount?: number;
  start_date: string;  // ISO 8601 date string
  end_date?: string;
  status: ProjectStatus;
  created_by?: string;
  created_at: string;
  updated_at: string;
}

/**
 * 프로젝트 생성 DTO
 */
export interface CreateProjectDTO {
  name: string;
  description?: string;
  location?: string;
  client?: string;
  contract_amount?: number;
  start_date: string;
  end_date?: string;
  status?: ProjectStatus;
}

/**
 * 프로젝트 수정 DTO
 */
export interface UpdateProjectDTO {
  name?: string;
  description?: string;
  location?: string;
  client?: string;
  contract_amount?: number;
  start_date?: string;
  end_date?: string;
  status?: ProjectStatus;
}

/**
 * 프로젝트 멤버 타입
 */
export interface ProjectMember {
  id: string;
  project_id: string;
  user_id: string;
  role: ProjectMemberRole;
  created_at: string;
  // Joined data
  user?: {
    email: string;
    display_name?: string;
    avatar_url?: string;
  };
}

/**
 * 프로젝트 멤버 추가 DTO
 */
export interface AddProjectMemberDTO {
  project_id: string;
  user_id: string;
  role?: ProjectMemberRole;
}

/**
 * 프로젝트 멤버 역할 수정 DTO
 */
export interface UpdateProjectMemberRoleDTO {
  role: ProjectMemberRole;
}
