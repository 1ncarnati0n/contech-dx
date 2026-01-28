/**
 * API 라우트 검증 미들웨어
 *
 * Zod 스키마를 사용하여 요청 데이터를 검증합니다.
 */

import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { createApiError, ErrorCode, getHttpStatus } from '@/lib/types/error';

/**
 * 검증 소스
 */
type ValidationSource = 'body' | 'query' | 'params';

/**
 * 검증 설정
 */
interface ValidationConfig<T extends z.ZodSchema> {
  /** Zod 스키마 */
  schema: T;
  /** 데이터 소스 */
  source: ValidationSource;
}

/**
 * 검증 핸들러
 */
type ValidatedHandler<T> = (
  req: NextRequest,
  validatedData: T
) => Promise<NextResponse>;

/**
 * API 라우트에 Zod 스키마 검증을 적용하는 래퍼
 *
 * @example
 * const postSchema = z.object({
 *   title: z.string().min(1),
 *   content: z.string().min(10),
 * });
 *
 * export const POST = withValidation(
 *   { schema: postSchema, source: 'body' },
 *   async (req, data) => {
 *     // data는 타입 안전한 { title: string, content: string }
 *     return NextResponse.json({ success: true, data });
 *   }
 * );
 */
export function withValidation<T extends z.ZodSchema>(
  config: ValidationConfig<T>,
  handler: ValidatedHandler<z.infer<T>>
) {
  return async (req: NextRequest): Promise<NextResponse> => {
    try {
      let data: unknown;

      switch (config.source) {
        case 'body':
          try {
            data = await req.json();
          } catch {
            const error = createApiError(
              ErrorCode.INVALID_INPUT,
              '요청 본문을 파싱할 수 없습니다.'
            );
            return NextResponse.json(
              { success: false, error },
              { status: getHttpStatus(ErrorCode.INVALID_INPUT) }
            );
          }
          break;

        case 'query':
          const { searchParams } = new URL(req.url);
          data = Object.fromEntries(searchParams);
          break;

        case 'params':
          // 다이나믹 라우트 파라미터는 NextRequest에서 직접 접근 불가
          // 이 경우 핸들러에서 직접 처리해야 함
          data = {};
          break;
      }

      // Zod 스키마로 검증
      const result = config.schema.safeParse(data);

      if (!result.success) {
        const fieldErrors = result.error.flatten().fieldErrors;
        const errorMessages = Object.entries(fieldErrors)
          .map(([field, errors]) => `${field}: ${(errors as string[]).join(', ')}`)
          .join('; ');

        const error = createApiError(
          ErrorCode.VALIDATION_ERROR,
          errorMessages || '입력값이 올바르지 않습니다.',
          { fieldErrors }
        );

        return NextResponse.json(
          { success: false, error },
          { status: getHttpStatus(ErrorCode.VALIDATION_ERROR) }
        );
      }

      // 검증 성공 시 핸들러 실행
      return handler(req, result.data);
    } catch (error) {
      console.error('API validation error:', error);

      const apiError = createApiError(
        ErrorCode.SERVER_ERROR,
        error instanceof Error ? error.message : '서버 오류가 발생했습니다.'
      );

      return NextResponse.json(
        { success: false, error: apiError },
        { status: 500 }
      );
    }
  };
}

/**
 * Body와 Query를 함께 검증하는 래퍼
 *
 * @example
 * export const PUT = withBodyAndQuery(
 *   bodySchema,
 *   querySchema,
 *   async (req, body, query) => {
 *     // body와 query 모두 타입 안전
 *   }
 * );
 */
export function withBodyAndQuery<TBody extends z.ZodSchema, TQuery extends z.ZodSchema>(
  bodySchema: TBody,
  querySchema: TQuery,
  handler: (
    req: NextRequest,
    body: z.infer<TBody>,
    query: z.infer<TQuery>
  ) => Promise<NextResponse>
) {
  return async (req: NextRequest): Promise<NextResponse> => {
    try {
      // Body 검증
      let bodyData: unknown;
      try {
        bodyData = await req.json();
      } catch {
        const error = createApiError(
          ErrorCode.INVALID_INPUT,
          '요청 본문을 파싱할 수 없습니다.'
        );
        return NextResponse.json(
          { success: false, error },
          { status: getHttpStatus(ErrorCode.INVALID_INPUT) }
        );
      }

      const bodyResult = bodySchema.safeParse(bodyData);
      if (!bodyResult.success) {
        const error = createApiError(
          ErrorCode.VALIDATION_ERROR,
          '요청 본문이 올바르지 않습니다.',
          { fieldErrors: bodyResult.error.flatten().fieldErrors }
        );
        return NextResponse.json(
          { success: false, error },
          { status: getHttpStatus(ErrorCode.VALIDATION_ERROR) }
        );
      }

      // Query 검증
      const { searchParams } = new URL(req.url);
      const queryData = Object.fromEntries(searchParams);

      const queryResult = querySchema.safeParse(queryData);
      if (!queryResult.success) {
        const error = createApiError(
          ErrorCode.VALIDATION_ERROR,
          '쿼리 파라미터가 올바르지 않습니다.',
          { fieldErrors: queryResult.error.flatten().fieldErrors }
        );
        return NextResponse.json(
          { success: false, error },
          { status: getHttpStatus(ErrorCode.VALIDATION_ERROR) }
        );
      }

      return handler(req, bodyResult.data, queryResult.data);
    } catch (error) {
      console.error('API validation error:', error);

      const apiError = createApiError(
        ErrorCode.SERVER_ERROR,
        error instanceof Error ? error.message : '서버 오류가 발생했습니다.'
      );

      return NextResponse.json(
        { success: false, error: apiError },
        { status: 500 }
      );
    }
  };
}
