/**
 * 권한 관련 공통 유틸리티
 * 서버/클라이언트 양쪽에서 사용 가능
 */

import type { UserRole, Profile } from '../types';
import {
  ROLE_HIERARCHY,
  ROLE_DISPLAY_NAMES,
  ROLE_BADGE_COLORS,
} from '../constants';

/**
 * 특정 역할인지 확인
 */
export function hasRole(profile: Profile | null, role: UserRole): boolean {
  return profile?.role === role;
}

/**
 * Admin인지 확인 (관리자)
 */
export function isSystemAdmin(profile: Profile | null): boolean {
  return hasRole(profile, 'admin');
}

/**
 * Admin 또는 Main User인지 확인
 */
export function isAdmin(profile: Profile | null): boolean {
  return profile?.role === 'admin' || profile?.role === 'main_user';
}

/**
 * VIP 이상인지 확인 (admin, main_user, vip_user)
 */
export function isVIP(profile: Profile | null): boolean {
  const vipRoles: UserRole[] = ['admin', 'main_user', 'vip_user'];
  return profile?.role ? vipRoles.includes(profile.role) : false;
}

/**
 * 최소 역할 요구사항 확인
 */
export function hasMinimumRole(
  profile: Profile | null,
  minimumRole: UserRole
): boolean {
  if (!profile) return false;

  const userLevel = ROLE_HIERARCHY[profile.role] || 0;
  const requiredLevel = ROLE_HIERARCHY[minimumRole] || 0;

  return userLevel >= requiredLevel;
}

/**
 * 역할 이름을 한글로 변환
 */
export function getRoleDisplayName(role: UserRole): string {
  return ROLE_DISPLAY_NAMES[role] || '알 수 없음';
}

/**
 * 역할별 뱃지 색상
 */
export function getRoleBadgeColor(role: UserRole): string {
  return ROLE_BADGE_COLORS[role] || ROLE_BADGE_COLORS.user;
}

/**
 * 역할 레벨 가져오기
 */
export function getRoleLevel(role: UserRole): number {
  return ROLE_HIERARCHY[role] || 0;
}

/**
 * 두 역할 비교 (첫 번째 역할이 더 높거나 같으면 true)
 */
export function isRoleHigherOrEqual(
  roleA: UserRole,
  roleB: UserRole
): boolean {
  return getRoleLevel(roleA) >= getRoleLevel(roleB);
}

/**
 * 모든 역할 목록 (높은 순)
 */
export function getAllRoles(): UserRole[] {
  return ['admin', 'main_user', 'vip_user', 'user'];
}

/**
 * 특정 레벨 이상의 역할 목록
 */
export function getRolesAboveLevel(minimumRole: UserRole): UserRole[] {
  const minimumLevel = ROLE_HIERARCHY[minimumRole];
  return getAllRoles().filter((role) => ROLE_HIERARCHY[role] >= minimumLevel);
}
