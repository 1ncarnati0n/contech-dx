/**
 * 서버 컴포넌트용 프로젝트 멤버 체크 유틸리티
 * 프로젝트 멤버가 아닌 사용자를 차단하고 리다이렉트
 * 관리자(admin)는 모든 프로젝트에 접근 가능
 */

import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import { requireAuth } from './requireAuth';
import { isSystemAdmin } from '@/lib/permissions/shared';

/**
 * 프로젝트 ID가 UUID 형식인지 확인
 * UUID v4: 8-4-4-4-12 형식 (예: 550e8400-e29b-41d4-a716-446655440000)
 */
function isUUID(value: string): boolean {
  const uuidRegex =
    /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
  return uuidRegex.test(value);
}

/**
 * 프로젝트 ID가 숫자(프로젝트 번호)인지 확인
 */
function isProjectNumber(value: string): boolean {
  return /^\d+$/.test(value);
}

/**
 * 프로젝트 멤버만 접근 가능하도록 체크
 * 1. 인증 체크 (비로그인 시 redirectTo로 리다이렉트)
 * 2. 관리자 체크 (admin은 모든 프로젝트 접근 가능)
 * 3. 프로젝트 ID 형식 판별 (프로젝트 번호 → UUID 변환)
 * 4. 멤버십 체크 (멤버가 아니면 redirectTo로 리다이렉트)
 *
 * @param projectId - 프로젝트 ID (UUID 또는 프로젝트 번호)
 * @param redirectTo - 미인증/비멤버 시 리다이렉트할 경로 (기본값: '/projects')
 * @returns user와 profile 객체
 */
export async function requireProjectMember(
  projectId: string,
  redirectTo = '/projects'
) {
  // 1. 인증 체크
  const { user, profile } = await requireAuth(redirectTo);

  // 2. 관리자는 모든 프로젝트 접근 허용 (Early Return으로 DB 쿼리 방지)
  if (isSystemAdmin(profile)) {
    return { user, profile };
  }

  // 3. 일반 사용자는 멤버십 체크 (서버 Supabase 클라이언트 사용)
  const supabase = await createClient();

  // 4. 프로젝트 ID 형식 판별 및 UUID 변환
  let actualProjectId = projectId;

  if (isProjectNumber(projectId)) {
    // 프로젝트 번호(숫자)인 경우 → UUID로 변환
    const { data: project } = await supabase
      .from('projects')
      .select('id')
      .eq('project_number', Number(projectId))
      .single();

    if (!project) {
      // 프로젝트가 존재하지 않으면 리다이렉트
      redirect(redirectTo);
    }
    actualProjectId = project.id;
  } else if (!isUUID(projectId)) {
    // UUID도 숫자도 아닌 잘못된 형식
    redirect(redirectTo);
  }

  // 5. 멤버십 체크 (UUID 사용)
  const { data, error } = await supabase
    .from('project_members')
    .select('id')
    .eq('project_id', actualProjectId)
    .eq('user_id', user.id)
    .single();

  if (error || !data) {
    // 멤버가 아니면 안내 메시지와 함께 프로젝트 목록으로 리다이렉트
    const redirectUrl = new URL(redirectTo, 'http://localhost');
    redirectUrl.searchParams.set('access', 'denied');
    redirect(redirectUrl.pathname + redirectUrl.search);
  }

  return { user, profile };
}
