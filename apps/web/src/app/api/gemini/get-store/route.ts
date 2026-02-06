import { NextRequest, NextResponse } from 'next/server';
import { geminiStoreRequest } from '@/lib/utils/geminiApi';
import { checkAuth } from '@/lib/utils/apiAuth';
import { logger } from '@/lib/utils/logger';

export async function POST(request: NextRequest) {
  // 인증 확인
  const authCheck = await checkAuth();
  if (!authCheck.success) return authCheck.response;

  try {
    const { storeName } = await request.json();

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

    // REST API로 File search store 정보 조회
    // API 키를 헤더로 전달하여 URL 노출 방지
    const response = await geminiStoreRequest(storeName, apiKey, {
      method: 'GET',
    });

    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.error?.message || '스토어 조회 실패');
    }

    const data = await response.json();

    return NextResponse.json({
      success: true,
      store: {
        name: data.name,
        displayName: data.displayName,
        createTime: data.createTime,
        updateTime: data.updateTime,
        activeDocumentsCount: data.activeDocumentsCount || 0,
        pendingDocumentsCount: data.pendingDocumentsCount || 0,
        failedDocumentsCount: data.failedDocumentsCount || 0,
        sizeBytes: data.sizeBytes || 0,
      }
    });

  } catch (error) {
    logger.error('Error getting file search store:', error);
    const errorMessage = error instanceof Error ? error.message : '스토어 조회 중 오류가 발생했습니다.';
    return NextResponse.json(
      { success: false, error: errorMessage },
      { status: 500 }
    );
  }
}
