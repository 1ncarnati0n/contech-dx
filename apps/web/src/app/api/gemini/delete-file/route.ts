import { NextRequest, NextResponse } from 'next/server';
import { geminiStoreRequest } from '@/lib/utils/geminiApi';
import { checkAuth } from '@/lib/utils/apiAuth';
import { logger } from '@/lib/utils/logger';

export async function DELETE(request: NextRequest) {
  // 인증 확인
  const authCheck = await checkAuth();
  if (!authCheck.success) return authCheck.response;

  try {
    const { storeName, fileName } = await request.json();

    if (!storeName || !fileName) {
      return NextResponse.json(
        { success: false, error: '스토어 이름과 파일 이름을 입력해주세요.' },
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

    // REST API로 문서 삭제
    // API 키를 헤더로 전달하여 URL 노출 방지
    // force=true: 문서 내 청크(chunks)가 있어도 함께 삭제
    const response = await geminiStoreRequest(fileName, apiKey, {
      method: 'DELETE',
      queryParams: { force: 'true' },
    });

    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.error?.message || '파일 삭제 실패');
    }

    return NextResponse.json({
      success: true,
      message: '파일이 성공적으로 삭제되었습니다.'
    });

  } catch (error) {
    logger.error('Error deleting file:', error);
    const errorMessage = error instanceof Error ? error.message : '파일 삭제 중 오류가 발생했습니다.';
    return NextResponse.json(
      { success: false, error: errorMessage },
      { status: 500 }
    );
  }
}

