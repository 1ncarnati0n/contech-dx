/**
 * 서버 사이드 권한 관련 유틸리티
 */

import { createClient } from '@/lib/supabase/server';
import type { Profile } from '../types';

// 공통 유틸리티 re-export
export {
  hasRole,
  isSystemAdmin,
  isAdmin,
  isVIP,
  hasMinimumRole,
  getRoleDisplayName,
  getRoleBadgeColor,
  getRoleLevel,
  isRoleHigherOrEqual,
  getAllRoles,
  getRolesAboveLevel,
} from './shared';

/**
 * 서버 사이드에서 현재 사용자의 프로필 가져오기
 */
export async function getCurrentUserProfile(): Promise<Profile | null> {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return null;

  const { data: profile } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', user.id)
    .single();

  return profile;
}

/**
 * 서버 사이드에서 현재 사용자 인증 정보 가져오기
 */
export async function getCurrentUser() {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  return user;
}
