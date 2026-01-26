/**
 * Users Service - Client Side
 * 클라이언트 컴포넌트에서 사용 가능한 함수들
 *
 * withClientAuth/withOptionalAuth 래퍼를 사용하여 인증 로직을 추상화합니다.
 */

import {
  withClientAuth,
  withOptionalAuth,
  type ServiceResult,
} from '@/lib/supabase/withAuth';
import type { UserRole, Profile } from '@/lib/types';

/**
 * 모든 사용자 목록 조회 (클라이언트 사이드)
 * 프로젝트 멤버 추가 시 사용자 선택에 사용
 * 인증 여부와 관계없이 조회 가능 (공개 데이터)
 */
export async function getAllUsersClient(): Promise<Profile[]> {
  const result = await withOptionalAuth<Profile[]>(async (supabase) => {
    const { data, error } = await supabase
      .from('profiles')
      .select('*')
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Error fetching users:', error);
      return { data: [], error: null };
    }

    return { data: data || [], error: null };
  });

  return result.data || [];
}

/**
 * 사용자 역할 업데이트 (클라이언트 사이드 - Admin 전용)
 * @param userId 사용자 ID
 * @param newRole 새로운 역할
 * @returns 업데이트된 사용자와 에러
 */
export async function updateUserRole(
  userId: string,
  newRole: UserRole
): Promise<ServiceResult<Profile>> {
  return withClientAuth(async (supabase) => {
    const { data, error } = await supabase
      .from('profiles')
      .update({ role: newRole })
      .eq('id', userId)
      .select()
      .single();

    return { data, error: error ? { message: error.message } : null };
  });
}

/**
 * 사용자 프로필 업데이트 (클라이언트 사이드)
 * @param userId 사용자 ID
 * @param updates 업데이트할 필드들
 * @returns 업데이트된 사용자와 에러
 */
export async function updateUserProfile(
  userId: string,
  updates: {
    display_name?: string;
    avatar_url?: string;
    bio?: string;
  }
): Promise<ServiceResult<Profile>> {
  return withClientAuth(async (supabase) => {
    const { data, error } = await supabase
      .from('profiles')
      .update({
        ...updates,
        updated_at: new Date().toISOString(),
      })
      .eq('id', userId)
      .select()
      .single();

    return { data, error: error ? { message: error.message } : null };
  });
}

/**
 * 현재 로그인된 사용자를 관리자로 승격 (클라이언트 사이드)
 * 개발/테스트 목적으로만 사용해야 합니다.
 * @returns 성공 여부와 업데이트된 사용자 정보
 */
export async function promoteCurrentUserToAdmin(): Promise<{
  success: boolean;
  user: Profile | null;
  error: string | null;
}> {
  try {
    const response = await fetch('/api/users/promote-to-admin', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
    });

    const data = await response.json();

    if (!response.ok) {
      return {
        success: false,
        error: data.error?.message || data.error || '권한 업데이트에 실패했습니다.',
        user: null,
      };
    }

    return { success: true, user: data.data?.user || data.user, error: null };
  } catch (error) {
    console.error('권한 업데이트 중 오류:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : '알 수 없는 오류가 발생했습니다.',
      user: null,
    };
  }
}
