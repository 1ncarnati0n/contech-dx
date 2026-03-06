import { NextResponse } from 'next/server';
import type { GeminiFileSearchStore } from '@/lib/types';

import { geminiStoreRequest } from '@/lib/utils/geminiApi';
import { apiError, checkAuth, ErrorCode } from '@/lib/utils/apiAuth';
import { logger } from '@/lib/utils/logger';
import { withValidation } from '@/lib/api/withValidation';
import { z } from 'zod';

const emptyQuerySchema = z.object({}).passthrough();

export const GET = withValidation(
  { schema: emptyQuerySchema, source: 'query' },
  async () => {
    // 인증 확인
    const authCheck = await checkAuth();
    if (!authCheck.success) return authCheck.response;

    try {
      const apiKey = process.env.GEMINI_API_KEY;
      if (!apiKey) {
        return apiError(ErrorCode.SERVER_ERROR, 'Gemini API 키가 설정되지 않았습니다.');
      }

      // REST API로 File search stores 목록 가져오기
      // API 키를 헤더로 전달하여 URL 노출 방지
      const response = await geminiStoreRequest('fileSearchStores', apiKey, {
        method: 'GET',
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        return apiError(
          ErrorCode.EXTERNAL_API_ERROR,
          errorData.error?.message || '스토어 목록 조회 실패'
        );
      }

      const data = await response.json();
      const stores: GeminiFileSearchStore[] = data.fileSearchStores || [];

      return NextResponse.json({
        success: true,
        stores: stores.map((store) => ({
          name: store.name,
          displayName: store.displayName,
          createTime: store.createTime,
        })),
      });
    } catch (error: unknown) {
      logger.error('Error listing file search stores:', error);
      return apiError(
        ErrorCode.SERVER_ERROR,
        error instanceof Error ? error.message : '알 수 없는 오류가 발생했습니다.'
      );
    }
  }
);
