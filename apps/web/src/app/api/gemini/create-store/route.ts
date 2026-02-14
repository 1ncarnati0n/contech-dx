import { NextRequest, NextResponse } from 'next/server';
import { geminiStoreRequest } from '@/lib/utils/geminiApi';
import { apiError, checkAuth, ErrorCode } from '@/lib/utils/apiAuth';
import { logger } from '@/lib/utils/logger';
import { withValidation } from '@/lib/api/withValidation';
import { z } from 'zod';

const createStoreBodySchema = z.object({
  displayName: z.string().trim().min(1, '스토어 이름을 입력해주세요.').max(100),
});

export const POST = withValidation(
  { schema: createStoreBodySchema, source: 'body' },
  async (_request: NextRequest, body) => {
    // 인증 확인
    const authCheck = await checkAuth();
    if (!authCheck.success) return authCheck.response;

    try {
      const { displayName } = body;

      const apiKey = process.env.GEMINI_API_KEY;
      if (!apiKey) {
        return apiError(ErrorCode.SERVER_ERROR, 'Gemini API 키가 설정되지 않았습니다.');
      }

      // REST API로 File search store 생성
      // API 키를 헤더로 전달하여 URL 노출 방지
      const response = await geminiStoreRequest('fileSearchStores', apiKey, {
        method: 'POST',
        body: { displayName },
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        return apiError(
          ErrorCode.EXTERNAL_API_ERROR,
          errorData.error?.message || '스토어 생성 실패'
        );
      }

      const data = await response.json();

      return NextResponse.json({
        success: true,
        store: {
          name: data.name,
          displayName: data.displayName,
          createTime: data.createTime,
        },
      });
    } catch (error) {
      logger.error('Error creating file search store:', error);
      return apiError(
        ErrorCode.SERVER_ERROR,
        error instanceof Error ? error.message : '스토어 생성 중 오류가 발생했습니다.'
      );
    }
  }
);
