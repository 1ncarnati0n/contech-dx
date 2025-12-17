/**
 * Users Service - Client Side
 * 클라이언트 컴포넌트에서 사용 가능한 함수들
 * createBrowserClient 또는 API 호출만 사용
 */

import { createClient as createBrowserClient } from '@/lib/supabase/client';
import type { UserRole } from '@/lib/types';

/**
 * 사용자 역할 업데이트 (클라이언트 사이드 - Admin 전용)
 * @param userId 사용자 ID
 * @param newRole 새로운 역할
 * @returns 업데이트된 사용자와 에러
 */
export async function updateUserRole(userId: string, newRole: UserRole) {
  const supabase = createBrowserClient();

  const { data: user, error } = await supabase
    .from('profiles')
    .update({ role: newRole })
    .eq('id', userId)
    .select()
    .single();

  return { user, error };
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
) {
  const supabase = createBrowserClient();

  const { data: user, error } = await supabase
    .from('profiles')
    .update({
      ...updates,
      updated_at: new Date().toISOString(),
    })
    .eq('id', userId)
    .select()
    .single();

  return { user, error };
}

/**
 * 현재 로그인된 사용자를 관리자로 승격 (클라이언트 사이드)
 * 개발/테스트 목적으로만 사용해야 합니다.
 * @returns 성공 여부와 업데이트된 사용자 정보
 */
export async function promoteCurrentUserToAdmin() {
  try {
    const response = await fetch('/api/users/promote-to-admin', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
    });

    const data = await response.json();

    if (!response.ok) {
      return { success: false, error: data.error || '권한 업데이트에 실패했습니다.', user: null };
    }

    return { success: true, user: data.user, error: null };
  } catch (error) {
    console.error('권한 업데이트 중 오류:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : '알 수 없는 오류가 발생했습니다.',
      user: null,
    };
  }
}
