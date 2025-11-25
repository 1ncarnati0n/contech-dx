import { NextRequest, NextResponse } from 'next/server';

const GEMINI_API_BASE = 'https://generativelanguage.googleapis.com/v1beta';

interface CitationSource {
  startIndex?: number;
  endIndex?: number;
  uri?: string;
  license?: string;
}

export async function POST(request: NextRequest) {
  try {
    const { query, storeName } = await request.json();

    if (!query) {
      return NextResponse.json(
        { error: '질문을 입력해주세요.' },
        { status: 400 }
      );
    }

    if (!storeName) {
      return NextResponse.json(
        { error: '스토어를 선택해주세요.' },
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

    // REST API로 검색 수행 (File Search는 gemini-2.5+ 모델 필요)
    const response = await fetch(
      `${GEMINI_API_BASE}/models/gemini-3-pro-preview:generateContent?key=${apiKey}`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          contents: [{
            parts: [{ text: query }]
          }],
          tools: [{
            file_search: {
              file_search_store_names: [storeName]
            }
          }]
        }),
      }
    );

    if (!response.ok) {
      const errorData = await response.json();
      let message = errorData.error?.message || '검색 실패';
      if (message.includes('overloaded') || response.status === 429) {
        message = '모델이 현재 과부하 상태입니다. 잠시 후 다시 시도해주세요.';
      } else if (message.includes('not found for API version')) {
        message = '잘못된 모델을 사용하고 있습니다. 모델 이름을 확인해주세요.';
      }
      throw new Error(message);
    }

    const data = await response.json();
    const candidate = data.candidates?.[0];
    const text = candidate?.content?.parts?.[0]?.text || '응답을 받지 못했습니다.';

    // Citation 정보 추출 (있는 경우)
    const citations = candidate?.citationMetadata?.citationSources || [];

    return NextResponse.json({
      success: true,
      answer: text,
      citations: citations.map((citation: CitationSource) => ({
        startIndex: citation.startIndex,
        endIndex: citation.endIndex,
        uri: citation.uri,
        license: citation.license
      }))
    });

  } catch (error) {
    console.error('Error searching:', error);
    const errorMessage = error instanceof Error ? error.message : '검색 중 오류가 발생했습니다.';
    return NextResponse.json(
      { error: errorMessage },
      { status: 500 }
    );
  }
}
