import { createClient } from '@/lib/supabase/server';
import { createClient as createServiceClient } from '@supabase/supabase-js';
import { NextRequest, NextResponse } from 'next/server';
import { isSystemAdmin } from '@/lib/permissions/shared';
import { logger } from '@/lib/utils/logger';

/**
 * 사용자를 관리자로 승격시키는 API
 * Admin 권한을 가진 사용자만 다른 사용자를 승격할 수 있습니다.
 *
 * @param request - { targetUserId: string } 형식의 요청 본문
 */
export async function POST(request: NextRequest) {
  const supabase = await createClient();

  // 1. 현재 로그인된 사용자 확인
  const {
    data: { user: authUser },
    error: authError,
  } = await supabase.auth.getUser();

  if (authError || !authUser) {
    return NextResponse.json(
      { success: false, error: { code: 'UNAUTHORIZED', message: '인증되지 않은 사용자입니다.' } },
      { status: 401 }
    );
  }

  // 2. 현재 사용자의 프로필 조회 (권한 확인용)
  const { data: currentProfile, error: profileError } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', authUser.id)
    .single();

  if (profileError || !currentProfile) {
    return NextResponse.json(
      { success: false, error: { code: 'PROFILE_NOT_FOUND', message: '프로필을 찾을 수 없습니다.' } },
      { status: 404 }
    );
  }

  // 3. Admin 권한 확인
  if (!isSystemAdmin(currentProfile)) {
    logger.warn(`권한 없는 승격 시도: ${authUser.id}`);
    return NextResponse.json(
      { success: false, error: { code: 'FORBIDDEN', message: '관리자만 사용자 권한을 변경할 수 있습니다.' } },
      { status: 403 }
    );
  }

  // 4. 요청 본문에서 대상 사용자 ID 추출
  let targetUserId: string;
  try {
    const body = await request.json();
    targetUserId = body.targetUserId;

    if (!targetUserId || typeof targetUserId !== 'string') {
      return NextResponse.json(
        { success: false, error: { code: 'INVALID_REQUEST', message: '승격할 사용자 ID가 필요합니다.' } },
        { status: 400 }
      );
    }
  } catch {
    return NextResponse.json(
      { success: false, error: { code: 'INVALID_REQUEST', message: '잘못된 요청 형식입니다.' } },
      { status: 400 }
    );
  }

  // 5. RLS 정책을 우회하기 위해 service_role 키를 사용한 클라이언트 생성
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!serviceRoleKey) {
    logger.error('SERVICE_ROLE_KEY가 설정되지 않음');
    return NextResponse.json(
      { success: false, error: { code: 'SERVER_ERROR', message: '서버 설정 오류가 발생했습니다.' } },
      { status: 500 }
    );
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

  // 6. 대상 사용자의 프로필을 관리자로 업데이트
  const { data: updatedUser, error: updateError } = await serviceClient
    .from('profiles')
    .update({ role: 'admin' })
    .eq('id', targetUserId)
    .select()
    .single();

  if (updateError) {
    logger.error('권한 업데이트 실패', { targetUserId, error: updateError.message });
    return NextResponse.json(
      { success: false, error: { code: 'UPDATE_FAILED', message: '권한 업데이트에 실패했습니다.' } },
      { status: 500 }
    );
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

