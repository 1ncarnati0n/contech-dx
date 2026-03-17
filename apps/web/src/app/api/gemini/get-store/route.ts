import { NextRequest, NextResponse } from 'next/server';
import { geminiStoreRequest } from '@/features/ai-chat/service/geminiApi';
import { apiError, checkAuth, ErrorCode } from '@/shared/utils/apiAuth';
import { logger } from '@/shared/utils/logger';
import { withValidation } from '@/shared/lib/api/withValidation';
import { z } from 'zod';

const getStoreBodySchema = z.object({
  storeName: z.string().trim().min(1, '스토어 이름을 입력해주세요.'),
});

const getStoreQuerySchema = z.object({
  storeName: z.string().trim().min(1, '스토어 이름을 입력해주세요.'),
});

async function getStore(storeName: string): Promise<NextResponse> {
  const authCheck = await checkAuth();
  if (!authCheck.success) return authCheck.response;

  try {
    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
      return apiError(ErrorCode.SERVER_ERROR, 'Gemini API 키가 설정되지 않았습니다.');
    }

    // REST API로 File search store 정보 조회
    // API 키를 헤더로 전달하여 URL 노출 방지
    const response = await geminiStoreRequest(storeName, apiKey, {
      method: 'GET',
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      return apiError(
        ErrorCode.EXTERNAL_API_ERROR,
        errorData.error?.message || '스토어 조회 실패'
      );
    }

    const data = await response.json();

    return NextResponse.json({
      success: true,
      store: {
        name: data.name,
        displayName: data.displayName,
        createTime: data.createTime,
        updateTime: data.updateTime,
        activeDocumentsCount: data.activeDocumentsCount || 0,
        pendingDocumentsCount: data.pendingDocumentsCount || 0,
        failedDocumentsCount: data.failedDocumentsCount || 0,
        sizeBytes: data.sizeBytes || 0,
      },
    });
  } catch (error) {
    logger.error('Error getting file search store:', error);
    return apiError(
      ErrorCode.SERVER_ERROR,
      error instanceof Error ? error.message : '스토어 조회 중 오류가 발생했습니다.'
    );
  }
}

export const GET = withValidation(
  { schema: getStoreQuerySchema, source: 'query' },
  async (_request: NextRequest, query) => getStore(query.storeName)
);

export const POST = withValidation(
  { schema: getStoreBodySchema, source: 'body' },
  async (_request: NextRequest, body) => getStore(body.storeName)
);
