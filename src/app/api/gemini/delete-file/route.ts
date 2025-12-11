import { NextRequest, NextResponse } from 'next/server';

const GEMINI_API_BASE = 'https://generativelanguage.googleapis.com/v1beta';

export async function DELETE(request: NextRequest) {
  try {
    const { storeName, fileName } = await request.json();

    if (!storeName || !fileName) {
      return NextResponse.json(
        { error: '스토어 이름과 파일 이름을 입력해주세요.' },
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

    // REST API로 문서 삭제
    const url = new URL(`${GEMINI_API_BASE}/${fileName}`);
    url.searchParams.set('key', apiKey);

    const response = await fetch(url.toString(), {
      method: 'DELETE',
      headers: {
        'Content-Type': 'application/json',
      },
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
    console.error('Error deleting file:', error);
    const errorMessage = error instanceof Error ? error.message : '파일 삭제 중 오류가 발생했습니다.';
    return NextResponse.json(
      { error: errorMessage },
      { status: 500 }
    );
  }
}

