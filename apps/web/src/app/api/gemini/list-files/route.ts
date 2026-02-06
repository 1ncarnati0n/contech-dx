import { NextRequest, NextResponse } from 'next/server';
import { geminiStoreRequest } from '@/lib/utils/geminiApi';
import { checkAuth } from '@/lib/utils/apiAuth';
import { logger } from '@/lib/utils/logger';

interface GeminiDocument {
  name: string;
  displayName?: string;
  mimeType?: string;
  sizeBytes?: string | number;
  createTime?: string;
  updateTime?: string;
  state?: string;
}

export async function GET(request: NextRequest) {
  // 인증 확인
  const authCheck = await checkAuth();
  if (!authCheck.success) return authCheck.response;

  try {
    // 쿼리 파라미터에서 storeName, pageToken 추출
    const { searchParams } = new URL(request.url);
    const storeName = searchParams.get('storeName');
    const pageToken = searchParams.get('pageToken');

    if (!storeName) {
      return NextResponse.json(
        { success: false, error: '스토어 이름을 입력해주세요.' },
        { status: 400 }
      );
    }

    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
      return NextResponse.json(
        { success: false, error: 'Gemini API 키가 설정되지 않았습니다.' },
        { status: 500 }
      );
    }

    // REST API로 문서 목록 조회
    // API 키를 헤더로 전달하여 URL 노출 방지
    const response = await geminiStoreRequest(
      `${storeName}/documents`,
      apiKey,
      {
        method: 'GET',
        queryParams: {
          pageSize: '20',
          ...(pageToken && { pageToken }),
        },
      }
    );

    if (!response.ok) {
      const errorText = await response.text();
      logger.error('Gemini API Error Response:', {
        status: response.status,
        statusText: response.statusText,
        endpoint: `${storeName}/documents`,
        body: errorText,
      });

      try {
        const errorData = JSON.parse(errorText);
        throw new Error(errorData.error?.message || '문서 목록 조회 실패');
      } catch {
        throw new Error(`API 오류 (${response.status}): ${errorText.slice(0, 200)}`);
      }
    }

    const data = await response.json();

    // 문서 목록 포맷팅
    const files = (data.documents || []).map((doc: GeminiDocument) => ({
      name: doc.name,
      displayName: doc.displayName || '이름 없음',
      mimeType: doc.mimeType || 'unknown',
      sizeBytes: doc.sizeBytes || 0,
      createTime: doc.createTime,
      updateTime: doc.updateTime,
      state: doc.state,
    }));

    return NextResponse.json({
      success: true,
      files,
      nextPageToken: data.nextPageToken,
    });

  } catch (error) {
    logger.error('Error listing documents:', error);
    const errorMessage = error instanceof Error ? error.message : '문서 목록 조회 중 오류가 발생했습니다.';
    return NextResponse.json(
      { success: false, error: errorMessage },
      { status: 500 }
    );
  }
}
