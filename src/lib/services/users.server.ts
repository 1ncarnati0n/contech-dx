/**
 * Users Service - Server Side
 * 서버 컴포넌트에서만 사용 가능한 함수들
 * next/headers를 사용하는 createServerClient 의존
 */

import { createClient as createServerClient } from '@/lib/supabase/server';

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
