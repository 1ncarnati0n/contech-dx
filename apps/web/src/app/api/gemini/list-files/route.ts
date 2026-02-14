import { NextRequest, NextResponse } from 'next/server';
import { geminiStoreRequest } from '@/lib/utils/geminiApi';
import { apiError, checkAuth, ErrorCode } from '@/lib/utils/apiAuth';
import { logger } from '@/lib/utils/logger';
import { withValidation } from '@/lib/api/withValidation';
import { z } from 'zod';

interface GeminiDocument {
  name: string;
  displayName?: string;
  mimeType?: string;
  sizeBytes?: string | number;
  createTime?: string;
  updateTime?: string;
  state?: string;
}

const listFilesQuerySchema = z.object({
  storeName: z.string().trim().min(1, '스토어 이름을 입력해주세요.'),
  pageToken: z.string().optional(),
});

export const GET = withValidation(
  { schema: listFilesQuerySchema, source: 'query' },
  async (_request: NextRequest, query) => {
    // 인증 확인
    const authCheck = await checkAuth();
    if (!authCheck.success) return authCheck.response;

    try {
      const { storeName, pageToken } = query;

      const apiKey = process.env.GEMINI_API_KEY;
      if (!apiKey) {
        return apiError(ErrorCode.SERVER_ERROR, 'Gemini API 키가 설정되지 않았습니다.');
      }

      // REST API로 문서 목록 조회
      // API 키를 헤더로 전달하여 URL 노출 방지
      const response = await geminiStoreRequest(
        `${storeName}/documents`,
        apiKey,
        {
          method: 'GET',
          queryParams: {
            pageSize: '20',
            ...(pageToken && { pageToken }),
          },
        }
      );

      if (!response.ok) {
        const errorText = await response.text();
        logger.error('Gemini API Error Response:', {
          status: response.status,
          statusText: response.statusText,
          endpoint: `${storeName}/documents`,
          body: errorText,
        });

        try {
          const errorData = JSON.parse(errorText);
          return apiError(
            ErrorCode.EXTERNAL_API_ERROR,
            errorData.error?.message || '문서 목록 조회 실패',
            { status: response.status }
          );
        } catch {
          return apiError(
            ErrorCode.EXTERNAL_API_ERROR,
            `API 오류 (${response.status}): ${errorText.slice(0, 200)}`,
            { status: response.status }
          );
        }
      }

      const data = await response.json();

      // 문서 목록 포맷팅
      const files = (data.documents || []).map((doc: GeminiDocument) => ({
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
        files,
        nextPageToken: data.nextPageToken,
      });
    } catch (error) {
      logger.error('Error listing documents:', error);
      return apiError(
        ErrorCode.SERVER_ERROR,
        error instanceof Error ? error.message : '문서 목록 조회 중 오류가 발생했습니다.'
      );
    }
  }
);
