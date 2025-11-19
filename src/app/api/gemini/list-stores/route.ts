import { NextRequest, NextResponse } from 'next/server';

const GEMINI_API_BASE = 'https://generativelanguage.googleapis.com/v1beta';

export async function GET(request: NextRequest) {
  try {
    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
      return NextResponse.json(
        { error: 'Gemini API 키가 설정되지 않았습니다.' },
        { status: 500 }
      );
    }

    // REST API로 File search stores 목록 가져오기
    const response = await fetch(
      `${GEMINI_API_BASE}/fileSearchStores?key=${apiKey}`,
      {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        },
      }
    );

    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.error?.message || '스토어 목록 조회 실패');
    }

    const data = await response.json();
    const stores = data.fileSearchStores || [];

    return NextResponse.json({
      success: true,
      stores: stores.map((store: any) => ({
        name: store.name,
        displayName: store.displayName,
        createTime: store.createTime,
      }))
    });

  } catch (error: any) {
    console.error('Error listing file search stores:', error);
    return NextResponse.json(
      { error: error.message || '스토어 목록을 가져오는 중 오류가 발생했습니다.' },
      { status: 500 }
    );
  }
}
