import { NextRequest, NextResponse } from 'next/server';

const GEMINI_API_BASE = 'https://generativelanguage.googleapis.com/v1beta';

export async function POST(request: NextRequest) {
  try {
    const { displayName } = await request.json();

    if (!displayName) {
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

    // REST API로 File search store 생성
    const response = await fetch(
      `${GEMINI_API_BASE}/fileSearchStores?key=${apiKey}`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          displayName,
        }),
      }
    );

    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.error?.message || '스토어 생성 실패');
    }

    const data = await response.json();

    return NextResponse.json({
      success: true,
      store: {
        name: data.name,
        displayName: data.displayName,
        createTime: data.createTime,
      }
    });

  } catch (error) {
    console.error('Error creating file search store:', error);
    const errorMessage = error instanceof Error ? error.message : '스토어 생성 중 오류가 발생했습니다.';
    return NextResponse.json(
      { error: errorMessage },
      { status: 500 }
    );
  }
}
