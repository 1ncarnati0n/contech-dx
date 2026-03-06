import { NextRequest, NextResponse } from 'next/server';
import { geminiModelRequest } from '@/lib/utils/geminiApi';
import { apiError, checkAuth, ErrorCode } from '@/lib/utils/apiAuth';
import { logger } from '@/lib/utils/logger';
import { withValidation } from '@/lib/api/withValidation';
import { z } from 'zod';

interface CitationSource {
  startIndex?: number;
  endIndex?: number;
  uri?: string;
  license?: string;
}

const searchBodySchema = z.object({
  query: z.string().trim().min(1, '질문을 입력해주세요.'),
  storeName: z.string().trim().min(1, '스토어를 선택해주세요.'),
});

export const POST = withValidation(
  { schema: searchBodySchema, source: 'body' },
  async (_request: NextRequest, body) => {
    // 인증 확인
    const authCheck = await checkAuth();
    if (!authCheck.success) return authCheck.response;

    try {
      const { query, storeName } = body;

      const apiKey = process.env.GEMINI_API_KEY;
      if (!apiKey) {
        return apiError(ErrorCode.SERVER_ERROR, 'Gemini API 키가 설정되지 않았습니다.');
      }

      // REST API로 검색 수행 (File Search는 gemini-2.5+ 모델 필요)
      // API 키를 헤더로 전달하여 URL 노출 방지
      const response = await geminiModelRequest(
        'gemini-3-pro-preview',
        'generateContent',
        apiKey,
        {
          contents: [{
            parts: [{ text: query }],
          }],
          tools: [{
            file_search: {
              file_search_store_names: [storeName],
            },
          }],
        }
      );

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        let message = errorData.error?.message || '검색 실패';
        let code = ErrorCode.EXTERNAL_API_ERROR;

        if (message.includes('overloaded') || response.status === 429) {
          message = '모델이 현재 과부하 상태입니다. 잠시 후 다시 시도해주세요.';
          code = ErrorCode.LIMIT_EXCEEDED;
        } else if (message.includes('not found for API version')) {
          message = '잘못된 모델을 사용하고 있습니다. 모델 이름을 확인해주세요.';
          code = ErrorCode.INVALID_INPUT;
        }

        return apiError(code, message, { status: response.status });
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
          license: citation.license,
        })),
      });
    } catch (error) {
      logger.error('Error searching:', error);
      return apiError(
        ErrorCode.SERVER_ERROR,
        error instanceof Error ? error.message : '검색 중 오류가 발생했습니다.'
      );
    }
  }
);
