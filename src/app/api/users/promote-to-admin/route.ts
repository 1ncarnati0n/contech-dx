import { createClient } from '@/lib/supabase/server';
import { createClient as createServiceClient } from '@supabase/supabase-js';
import { NextResponse } from 'next/server';

/**
 * 현재 로그인된 사용자를 관리자로 승격시키는 API
 * 개발/테스트 목적으로만 사용해야 합니다.
 * RLS 정책을 우회하기 위해 service_role 키를 사용합니다.
 */
export async function POST() {
  const supabase = await createClient();

  // 현재 로그인된 사용자 확인
  const {
    data: { user: authUser },
    error: authError,
  } = await supabase.auth.getUser();

  if (authError || !authUser) {
    return NextResponse.json(
      { error: '인증되지 않은 사용자입니다.' },
      { status: 401 }
    );
  }

  // RLS 정책을 우회하기 위해 service_role 키를 사용한 클라이언트 생성
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!serviceRoleKey) {
    return NextResponse.json(
      { error: '서버 설정 오류: SERVICE_ROLE_KEY가 설정되지 않았습니다.' },
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

  // 현재 사용자의 프로필을 관리자로 업데이트
  const { data: updatedUser, error: updateError } = await serviceClient
    .from('profiles')
    .update({ role: 'admin' })
    .eq('id', authUser.id)
    .select()
    .single();

  if (updateError) {
    console.error('권한 업데이트 실패:', updateError);
    return NextResponse.json(
      { error: '권한 업데이트에 실패했습니다.', details: updateError.message },
      { status: 500 }
    );
  }

  return NextResponse.json({
    success: true,
    message: '사용자 권한이 관리자로 변경되었습니다.',
    user: updatedUser,
  });
}

