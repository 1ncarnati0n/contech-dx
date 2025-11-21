/**
 * 권한 관련 유틸리티 통합 export
 *
 * 사용 예:
 * 서버 컴포넌트에서:
 *   import { getCurrentUserProfile, isSystemAdmin } from '@/lib/permissions/server';
 *
 * 클라이언트 컴포넌트에서:
 *   import { getRoleDisplayName, getRoleBadgeColor } from '@/lib/permissions/client';
 *
 * 공통 유틸리티만 필요할 때:
 *   import { hasMinimumRole, getAllRoles } from '@/lib/permissions/shared';
 */

// 공통 유틸리티 (서버/클라이언트 모두 사용 가능)
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
