/**
 * 서버 컴포넌트용 인증 체크 유틸리티
 * 비로그인 사용자를 랜딩 페이지로 리다이렉트
 */

import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import { getCurrentUserProfile } from '@/lib/permissions/server';

/**
 * 인증된 사용자만 접근 가능하도록 체크
 * @param redirectTo - 미인증 시 리다이렉트할 경로 (기본값: '/')
 * @returns user와 profile 객체
 */
export async function requireAuth(redirectTo = '/') {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    redirect(redirectTo);
  }

  const profile = await getCurrentUserProfile();
  if (!profile) {
    redirect(redirectTo);
  }

  return { user, profile };
}

/**
 * 인증 체크만 수행 (프로필 없이)
 * @param redirectTo - 미인증 시 리다이렉트할 경로 (기본값: '/')
 * @returns user 객체
 */
export async function requireUser(redirectTo = '/') {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    redirect(redirectTo);
  }

  return { user };
}
