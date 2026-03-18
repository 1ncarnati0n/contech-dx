import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { createClient } from '@/shared/lib/supabase/server';
import { createClient as createServiceClient } from '@supabase/supabase-js';
import { isSystemAdmin } from '@/shared/lib/permissions/shared';
import { logger } from '@/shared/utils/logger';
import { withValidation } from '@/shared/lib/api/withValidation';
import { apiError, ErrorCode } from '@/shared/utils/apiAuth';

const promoteBodySchema = z.object({
  targetUserId: z.string().trim().min(1).optional(),
});

/**
 * 사용자를 관리자로 승격시키는 API (개발 환경 전용)
 * Admin 권한을 가진 사용자만 승격할 수 있습니다.
 */
export const POST = withValidation(
  { schema: promoteBodySchema, source: 'body' },
  async (_request: NextRequest, body) => {
    if (process.env.NODE_ENV !== 'development') {
      return apiError(ErrorCode.NOT_FOUND, 'Not Found');
    }

    const supabase = await createClient();

    // 1. 현재 로그인된 사용자 확인
    const {
      data: { user: authUser },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !authUser) {
      return apiError(ErrorCode.AUTH_REQUIRED, '인증되지 않은 사용자입니다.');
    }

    // 2. 현재 사용자의 프로필 조회 (권한 확인용)
    const { data: currentProfile, error: profileError } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', authUser.id)
      .single();

    if (profileError || !currentProfile) {
      return apiError(ErrorCode.NOT_FOUND, '프로필을 찾을 수 없습니다.');
    }

    // 3. Admin 권한 확인
    if (!isSystemAdmin(currentProfile)) {
      logger.warn(`권한 없는 승격 시도: ${authUser.id}`);
      return apiError(ErrorCode.PERMISSION_DENIED, '관리자만 사용자 권한을 변경할 수 있습니다.');
    }

    // 요청 본문에 대상 ID가 없으면 현재 사용자 승격
    const targetUserId = body.targetUserId ?? authUser.id;

    // 4. RLS 정책을 우회하기 위해 service_role 키를 사용한 클라이언트 생성
    const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
    if (!serviceRoleKey) {
      logger.error('SUPABASE_SERVICE_ROLE_KEY가 설정되지 않음');
      return apiError(ErrorCode.SERVER_ERROR, '서버 설정 오류가 발생했습니다.');
    }

    const serviceClient = createServiceClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      serviceRoleKey,
      {
        auth: {
          autoRefreshToken: false,
          persistSession: false,
        },
      }
    );

    // 5. 대상 사용자의 프로필을 관리자로 업데이트
    const { data: updatedUser, error: updateError } = await serviceClient
      .from('profiles')
      .update({ role: 'admin' })
      .eq('id', targetUserId)
      .select()
      .single();

    if (updateError) {
      logger.error('권한 업데이트 실패', { targetUserId, error: updateError.message });
      return apiError(ErrorCode.OPERATION_FAILED, '권한 업데이트에 실패했습니다.');
    }

    logger.info(`사용자 권한 승격 완료: ${targetUserId} -> admin (by ${authUser.id})`);

    return NextResponse.json({
      success: true,
      data: {
        message: '사용자 권한이 관리자로 변경되었습니다.',
        user: updatedUser,
      },
    });
  }
);
