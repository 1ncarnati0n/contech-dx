import { NextRequest, NextResponse } from 'next/server';
import { geminiStoreRequest } from '@/lib/utils/geminiApi';
import { apiError, checkAuth, ErrorCode } from '@/lib/utils/apiAuth';
import { logger } from '@/lib/utils/logger';
import { withValidation } from '@/lib/api/withValidation';
import { z } from 'zod';

const deleteFileBodySchema = z.object({
  storeName: z.string().trim().min(1, '스토어 이름을 입력해주세요.'),
  fileName: z.string().trim().min(1, '파일 이름을 입력해주세요.'),
});

export const DELETE = withValidation(
  { schema: deleteFileBodySchema, source: 'body' },
  async (_request: NextRequest, body) => {
    // 인증 확인
    const authCheck = await checkAuth();
    if (!authCheck.success) return authCheck.response;

    try {
      const { fileName } = body;

      const apiKey = process.env.GEMINI_API_KEY;
      if (!apiKey) {
        return apiError(ErrorCode.SERVER_ERROR, 'Gemini API 키가 설정되지 않았습니다.');
      }

      // REST API로 문서 삭제
      // API 키를 헤더로 전달하여 URL 노출 방지
      // force=true: 문서 내 청크(chunks)가 있어도 함께 삭제
      const response = await geminiStoreRequest(fileName, apiKey, {
        method: 'DELETE',
        queryParams: { force: 'true' },
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        return apiError(
          ErrorCode.EXTERNAL_API_ERROR,
          errorData.error?.message || '파일 삭제 실패'
        );
      }

      return NextResponse.json({
        success: true,
        message: '파일이 성공적으로 삭제되었습니다.',
      });
    } catch (error) {
      logger.error('Error deleting file:', error);
      return apiError(
        ErrorCode.SERVER_ERROR,
        error instanceof Error ? error.message : '파일 삭제 중 오류가 발생했습니다.'
      );
    }
  }
);
