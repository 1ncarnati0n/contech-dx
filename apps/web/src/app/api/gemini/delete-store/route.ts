import { NextRequest, NextResponse } from 'next/server';
import { geminiStoreRequest } from '@/features/ai-chat/service/geminiApi';
import { apiError, checkAuth, ErrorCode } from '@/shared/utils/apiAuth';
import { logger } from '@/shared/utils/logger';
import { withValidation } from '@/shared/lib/api/withValidation';
import { z } from 'zod';

const deleteStoreBodySchema = z.object({
  storeName: z.string().trim().min(1, '스토어 이름을 입력해주세요.'),
  force: z.boolean().optional(),
});

export const DELETE = withValidation(
  { schema: deleteStoreBodySchema, source: 'body' },
  async (_request: NextRequest, body) => {
    // 인증 확인
    const authCheck = await checkAuth();
    if (!authCheck.success) return authCheck.response;

    try {
      const { storeName, force } = body;

      const apiKey = process.env.GEMINI_API_KEY;
      if (!apiKey) {
        return apiError(ErrorCode.SERVER_ERROR, 'Gemini API 키가 설정되지 않았습니다.');
      }

      // REST API로 File search store 삭제
      // API 키를 헤더로 전달하여 URL 노출 방지
      const response = await geminiStoreRequest(storeName, apiKey, {
        method: 'DELETE',
        queryParams: force ? { force: 'true' } : undefined,
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        return apiError(
          ErrorCode.EXTERNAL_API_ERROR,
          errorData.error?.message || '스토어 삭제 실패'
        );
      }

      return NextResponse.json({
        success: true,
        message: '스토어가 성공적으로 삭제되었습니다.',
      });
    } catch (error) {
      logger.error('Error deleting file search store:', error);
      return apiError(
        ErrorCode.SERVER_ERROR,
        error instanceof Error ? error.message : '스토어 삭제 중 오류가 발생했습니다.'
      );
    }
  }
);
