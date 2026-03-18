/**
 * Gemini API 헬퍼 함수
 *
 * API 키를 URL 파라미터 대신 헤더로 전달하여 보안을 강화합니다.
 * URL에 키가 노출되면 서버 로그, 브라우저 히스토리, Referrer 헤더 등에서 유출될 수 있습니다.
 */

const GEMINI_API_BASE = 'https://generativelanguage.googleapis.com/v1beta';
const GEMINI_UPLOAD_BASE = 'https://generativelanguage.googleapis.com/upload/v1beta';

export interface GeminiRequestOptions {
  method?: 'GET' | 'POST' | 'DELETE';
  body?: Record<string, unknown>;
  headers?: Record<string, string>;
}

export interface GeminiUploadOptions {
  uploadProtocol?: 'resumable';
  uploadCommand?: string;
  contentType?: string;
}

/**
 * Gemini API를 안전하게 호출합니다 (API 키를 헤더로 전달)
 */
export async function geminiRequest(
  endpoint: string,
  apiKey: string,
  options: GeminiRequestOptions = {}
): Promise<Response> {
  const { method = 'GET', body, headers = {} } = options;

  // URL에서 기존 key 파라미터 제거 (있는 경우)
  const url = new URL(
    endpoint.startsWith('http') ? endpoint : `${GEMINI_API_BASE}/${endpoint}`
  );
  url.searchParams.delete('key');

  const requestHeaders: Record<string, string> = {
    'Content-Type': 'application/json',
    'x-goog-api-key': apiKey,
    ...headers,
  };

  const requestInit: RequestInit = {
    method,
    headers: requestHeaders,
  };

  if (body && method !== 'GET') {
    requestInit.body = JSON.stringify(body);
  }

  return fetch(url.toString(), requestInit);
}

/**
 * Gemini 모델 API 호출용 (generateContent 등)
 */
export async function geminiModelRequest(
  modelId: string,
  action: string,
  apiKey: string,
  body: Record<string, unknown>
): Promise<Response> {
  const url = `${GEMINI_API_BASE}/models/${modelId}:${action}`;

  return fetch(url, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-goog-api-key': apiKey,
    },
    body: JSON.stringify(body),
  });
}

/**
 * Gemini 파일 업로드 시작용 (resumable upload)
 */
export async function geminiUploadStart(
  storeName: string,
  apiKey: string,
  metadata: Record<string, unknown>,
  contentType: string
): Promise<Response> {
  const url = `${GEMINI_UPLOAD_BASE}/${storeName}:uploadToFileSearchStore`;

  return fetch(url, {
    method: 'POST',
    headers: {
      'x-goog-api-key': apiKey,
      'X-Goog-Upload-Protocol': 'resumable',
      'X-Goog-Upload-Command': 'start',
      'X-Goog-Upload-Header-Content-Type': contentType,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(metadata),
  });
}

/**
 * File Search Store 관련 API 호출
 */
export async function geminiStoreRequest(
  endpoint: string,
  apiKey: string,
  options: GeminiRequestOptions & { queryParams?: Record<string, string> } = {}
): Promise<Response> {
  const { method = 'GET', body, queryParams, headers = {} } = options;

  const url = new URL(`${GEMINI_API_BASE}/${endpoint}`);

  // 추가 쿼리 파라미터 설정 (key 제외)
  if (queryParams) {
    Object.entries(queryParams).forEach(([key, value]) => {
      if (key !== 'key') {
        url.searchParams.set(key, value);
      }
    });
  }

  const requestHeaders: Record<string, string> = {
    'Content-Type': 'application/json',
    'x-goog-api-key': apiKey,
    ...headers,
  };

  const requestInit: RequestInit = {
    method,
    headers: requestHeaders,
  };

  if (body && method !== 'GET') {
    requestInit.body = JSON.stringify(body);
  }

  return fetch(url.toString(), requestInit);
}

export { GEMINI_API_BASE, GEMINI_UPLOAD_BASE };
