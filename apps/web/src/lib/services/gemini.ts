/**
 * Gemini AI 파일 검색 서비스 (클라이언트 사이드)
 * API 라우트를 통해 Gemini File Search API와 통신
 */

import type { FileSearchStore, UploadedFile, SearchMessage } from '@/lib/types';

// 타입 re-export (하위 호환성)
export type { FileSearchStore, UploadedFile, SearchMessage };

/**
 * 스토어 목록 조회
 * @returns 스토어 배열
 */
export async function listStores(): Promise<FileSearchStore[]> {
  const response = await fetch('/api/gemini/list-stores');
  const data = await response.json();

  if (!response.ok) {
    throw new Error(data.error || '스토어 목록 조회 실패');
  }

  return data.stores || [];
}

/**
 * 스토어 생성
 * @param displayName 스토어 표시 이름
 * @returns 생성된 스토어
 */
export async function createStore(
  displayName: string
): Promise<FileSearchStore> {
  const response = await fetch('/api/gemini/create-store', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ displayName }),
  });

  const data = await response.json();

  if (!response.ok) {
    throw new Error(data.error || '스토어 생성 실패');
  }

  return data.store;
}

/**
 * 스토어 삭제
 * @param storeName 스토어 이름
 */
export async function deleteStore(storeName: string): Promise<void> {
  const response = await fetch('/api/gemini/delete-store', {
    method: 'DELETE',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ storeName }),
  });

  const data = await response.json();

  if (!response.ok) {
    throw new Error(data.error || '스토어 삭제 실패');
  }
}

/**
 * 스토어 상세 정보 조회
 * @param storeName 스토어 이름
 * @returns 스토어 정보
 */
export async function getStore(storeName: string): Promise<FileSearchStore> {
  const response = await fetch(
    `/api/gemini/get-store?storeName=${encodeURIComponent(storeName)}`
  );

  const data = await response.json();

  if (!response.ok) {
    throw new Error(data.error || '스토어 조회 실패');
  }

  return data.store;
}

/**
 * 스토어의 파일 목록 조회
 * @param storeName 스토어 이름
 * @returns 파일 배열
 */
export async function listFiles(storeName: string): Promise<UploadedFile[]> {
  const response = await fetch(
    `/api/gemini/list-files?storeName=${encodeURIComponent(storeName)}`
  );

  const data = await response.json();

  if (!response.ok) {
    throw new Error(data.error || '파일 목록 조회 실패');
  }

  return data.files || [];
}

/**
 * 파일 업로드
 * @param storeName 스토어 이름
 * @param file 업로드할 파일
 * @param onProgress 업로드 진행률 콜백 (0-100)
 * @returns 업로드된 파일 정보
 */
export async function uploadFile(
  storeName: string,
  file: File,
  onProgress?: (progress: number) => void
): Promise<UploadedFile> {
  const formData = new FormData();
  formData.append('file', file);
  formData.append('storeName', storeName);

  const xhr = new XMLHttpRequest();

  return new Promise((resolve, reject) => {
    // 진행률 추적
    if (onProgress) {
      xhr.upload.addEventListener('progress', (e) => {
        if (e.lengthComputable) {
          const progress = Math.round((e.loaded / e.total) * 100);
          onProgress(progress);
        }
      });
    }

    // 완료 처리
    xhr.addEventListener('load', () => {
      if (xhr.status >= 200 && xhr.status < 300) {
        const data = JSON.parse(xhr.responseText);
        resolve(data.file);
      } else {
        const data = JSON.parse(xhr.responseText);
        reject(new Error(data.error || '파일 업로드 실패'));
      }
    });

    // 에러 처리
    xhr.addEventListener('error', () => {
      reject(new Error('네트워크 오류가 발생했습니다.'));
    });

    xhr.open('POST', '/api/gemini/upload-file');
    xhr.send(formData);
  });
}

/**
 * 문서 검색 수행
 * @param storeName 스토어 이름
 * @param query 검색 쿼리
 * @param history 대화 히스토리 (선택)
 * @returns 검색 결과 메시지
 */
export async function searchDocuments(
  storeName: string,
  query: string,
  history?: SearchMessage[]
): Promise<SearchMessage> {
  const response = await fetch('/api/gemini/search', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      storeName,
      query,
      history: history || [],
    }),
  });

  const data = await response.json();

  if (!response.ok) {
    throw new Error(data.error || '검색 실패');
  }

  return {
    role: 'assistant',
    content: data.response,
    citations: data.citations,
  };
}
