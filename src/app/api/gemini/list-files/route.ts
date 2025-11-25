import { NextRequest, NextResponse } from 'next/server';

const GEMINI_API_BASE = 'https://generativelanguage.googleapis.com/v1beta';

interface GeminiDocument {
  name: string;
  displayName?: string;
  mimeType?: string;
  sizeBytes?: string | number;
  createTime?: string;
  updateTime?: string;
  state?: string;
}

export async function POST(request: NextRequest) {
  try {
    const { storeName } = await request.json();

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

    // REST API로 문서 목록 조회
    const response = await fetch(
      `${GEMINI_API_BASE}/${storeName}/documents?key=${apiKey}&pageSize=100`,
      {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        },
      }
    );

    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.error?.message || '문서 목록 조회 실패');
    }

    const data = await response.json();

    // 문서 목록 포맷팅
    const documents = (data.documents || []).map((doc: GeminiDocument) => ({
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
      documents,
      nextPageToken: data.nextPageToken,
    });

  } catch (error) {
    console.error('Error listing documents:', error);
    const errorMessage = error instanceof Error ? error.message : '문서 목록 조회 중 오류가 발생했습니다.';
    return NextResponse.json(
      { error: errorMessage },
      { status: 500 }
    );
  }
}
