import { NextRequest, NextResponse } from 'next/server';
import { geminiStoreRequest } from '@/lib/utils/geminiApi';
import { checkAuth } from '@/lib/utils/apiAuth';

export async function DELETE(request: NextRequest) {
  // 인증 확인
  const authCheck = await checkAuth();
  if (!authCheck.success) return authCheck.response;

  try {
    const { storeName, force } = await request.json();

    if (!storeName) {
      return NextResponse.json(
        { error: '스토어 이름을 입력해주세요.' },
        { status: 400 }
      );
    }

    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
      return NextResponse.json(
        { error: 'Gemini API 키가 설정되지 않았습니다.' },
        { status: 500 }
      );
    }

    // REST API로 File search store 삭제
    // API 키를 헤더로 전달하여 URL 노출 방지
    const response = await geminiStoreRequest(storeName, apiKey, {
      method: 'DELETE',
      queryParams: force ? { force: 'true' } : undefined,
    });

    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.error?.message || '스토어 삭제 실패');
    }

    return NextResponse.json({
      success: true,
      message: '스토어가 성공적으로 삭제되었습니다.'
    });

  } catch (error) {
    console.error('Error deleting file search store:', error);
    const errorMessage = error instanceof Error ? error.message : '스토어 삭제 중 오류가 발생했습니다.';
    return NextResponse.json(
      { error: errorMessage },
      { status: 500 }
    );
  }
}
