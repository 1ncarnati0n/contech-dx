import { updateUserRole } from '../repository/users.client';
import { logger } from '@/shared/utils/logger';
import type { UserRole, Profile } from '@/shared/types';

export type RoleChangeResult =
  | { success: true }
  | { success: false; error: string };

export async function changeUserRole(
  userId: string,
  newRole: UserRole,
): Promise<RoleChangeResult> {
  try {
    const { error } = await updateUserRole(userId, newRole);
    if (error) {
      return { success: false, error: error.message };
    }
    return { success: true };
  } catch {
    return { success: false, error: '등급 변경 중 오류가 발생했습니다.' };
  }
}

/**
 * 현재 로그인된 사용자를 관리자로 승격 (API 호출)
 * 개발/테스트 목적으로만 사용해야 합니다.
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
      body: JSON.stringify({}),
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
    logger.error('권한 업데이트 중 오류:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : '알 수 없는 오류가 발생했습니다.',
      user: null,
    };
  }
}
