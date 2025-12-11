import { createClient as createServerClient } from '@/lib/supabase/server';
import { createClient as createBrowserClient } from '@/lib/supabase/client';
import type { UserRole } from '@/lib/types';

/**
 * 모든 사용자 목록 조회 (서버 사이드 - Admin 전용)
 * @returns 사용자 배열과 에러
 */
export async function getAllUsers() {
  const supabase = await createServerClient();

  const { data: users, error } = await supabase
    .from('profiles')
    .select('*')
    .order('created_at', { ascending: false });

  return { users, error };
}

/**
 * 특정 사용자 프로필 조회 (서버 사이드)
 * @param userId 사용자 ID
 * @returns 사용자 프로필과 에러
 */
export async function getUserById(userId: string) {
  const supabase = await createServerClient();

  const { data: user, error } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', userId)
    .single();

  return { user, error };
}

/**
 * 현재 로그인한 사용자의 프로필 조회 (서버 사이드)
 * @returns 현재 사용자 프로필과 에러
 */
export async function getCurrentUser() {
  const supabase = await createServerClient();

  const {
    data: { user: authUser },
  } = await supabase.auth.getUser();

  if (!authUser) {
    return { user: null, error: null };
  }

  const { data: user, error } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', authUser.id)
    .single();

  return { user, error };
}

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
 * 역할별 사용자 수 통계 조회 (서버 사이드)
 * @returns 역할별 통계 객체와 에러
 */
export async function getUserRoleStats() {
  const supabase = await createServerClient();

  const { data: users, error } = await supabase.from('profiles').select('role');

  if (error || !users) {
    return {
      stats: {
        total: 0,
        admin: 0,
        main_user: 0,
        vip_user: 0,
        user: 0,
      },
      error,
    };
  }

  const stats = {
    total: users.length,
    admin: users.filter((u) => u.role === 'admin').length,
    main_user: users.filter((u) => u.role === 'main_user').length,
    vip_user: users.filter((u) => u.role === 'vip_user').length,
    user: users.filter((u) => u.role === 'user').length,
  };

  return { stats, error: null };
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