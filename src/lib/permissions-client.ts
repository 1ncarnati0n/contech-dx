import type { UserRole, Profile } from './types';

/**
 * 특정 역할인지 확인
 */
export function hasRole(profile: Profile | null, role: UserRole): boolean {
  return profile?.role === role;
}

/**
 * 최소 역할 요구사항 확인
 */
export function hasMinimumRole(profile: Profile | null, minimumRole: UserRole): boolean {
  if (!profile) return false;

  const roleHierarchy: Record<UserRole, number> = {
    admin: 4,
    main_user: 3,
    vip_user: 2,
    user: 1,
  };

  const userLevel = roleHierarchy[profile.role] || 0;
  const requiredLevel = roleHierarchy[minimumRole] || 0;

  return userLevel >= requiredLevel;
}

/**
 * 역할 이름을 한글로 변환
 */
export function getRoleDisplayName(role: UserRole): string {
  const roleNames: Record<UserRole, string> = {
    admin: '관리자',
    main_user: '주요 사용자',
    vip_user: 'VIP 사용자',
    user: '일반 사용자',
  };

  return roleNames[role] || '알 수 없음';
}

/**
 * 역할별 뱃지 색상
 */
export function getRoleBadgeColor(role: UserRole): string {
  const colors: Record<UserRole, string> = {
    admin: 'bg-purple-100 text-purple-800 border-purple-300',
    main_user: 'bg-blue-100 text-blue-800 border-blue-300',
    vip_user: 'bg-yellow-100 text-yellow-800 border-yellow-300',
    user: 'bg-gray-100 text-gray-800 border-gray-300',
  };

  return colors[role] || 'bg-gray-100 text-gray-800 border-gray-300';
}
