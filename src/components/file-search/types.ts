/**
 * File Search 컴포넌트 타입 정의
 *
 * 기본 타입은 @/lib/types에서 가져오고,
 * UI 전용 확장 타입은 여기서 정의합니다.
 */

import type {
  GeminiFileSearchStore,
  GeminiDocument,
  GeminiCitation,
} from '@/lib/types';

// 컴포넌트에서 사용하는 스토어 타입 (API 응답 기반 + UI용 필드)
export interface FileSearchStore extends Omit<GeminiFileSearchStore, 'sizeBytes'> {
  sizeBytes?: number; // UI에서는 number로 변환하여 사용
}

// 컴포넌트에서 사용하는 파일 타입 (API 응답 기반 + UI용 필드)
export interface UploadedFile extends Omit<GeminiDocument, 'sizeBytes'> {
  sizeBytes: number; // UI에서는 number로 변환하여 사용
}

// Citation 타입 (API 응답과 동일)
export type Citation = GeminiCitation;

/**
 * 채팅 메시지 (UI 전용)
 * - id, timestamp는 클라이언트에서 생성
 * - role은 'model'로 표시 (Gemini API 응답 형식)
 */
export interface Message {
  id: string;
  role: 'user' | 'model';
  content: string;
  citations?: Citation[];
  timestamp: Date;
}

/**
 * 채팅 세션 (LocalStorage 저장용)
 */
export interface ChatSession {
  id: string;          // 세션 고유 ID
  storeName: string;   // 소속 스토어
  title: string;       // 채팅방 제목
  preview: string;     // 마지막 메시지 미리보기
  updatedAt: number;   // 정렬용 타임스탬프
}

/**
 * File Search 전체 상태 (UI 전용)
 */
export interface FileSearchState {
  stores: FileSearchStore[];
  selectedStore: string;
  selectedStoreInfo: FileSearchStore | null;
  uploadedFiles: UploadedFile[];
  attachedFiles: File[];
  messages: Message[];
  sessions: ChatSession[];
  currentSessionId: string | null;
  query: string;
  isSearching: boolean;
  sidebarOpen: boolean;
  loading: boolean;
  error: string;
  success: string;
}
