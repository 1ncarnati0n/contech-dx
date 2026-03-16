'use client';

import { useState, useEffect } from 'react';
import { getUserRoleInProject } from '@/features/project/repository/projectMembers';
import { getCurrentUserProfile, isSystemAdmin } from '@/shared/lib/permissions/client';
import type { ProjectMemberRole, Profile } from '@/shared/types';
import { logger } from '@/shared/utils/logger';

export function useProjectPermissions(projectId: string) {
  const [userRole, setUserRole] = useState<ProjectMemberRole | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    async function loadPermissions() {
      try {
        const currentProfile = await getCurrentUserProfile();
        setProfile(currentProfile);
        if (currentProfile) {
          const role = await getUserRoleInProject(projectId, currentProfile.id);
          setUserRole(role as ProjectMemberRole);
        }
      } catch (error) {
        logger.error('Failed to load permissions:', error);
      } finally {
        setIsLoading(false);
      }
    }
    loadPermissions();
  }, [projectId]);

  const isAdmin = isSystemAdmin(profile);
  const canEdit = userRole === 'pm' || isAdmin;
  const canDelete = canEdit;

  return { userRole, profile, isAdmin, canEdit, canDelete, isLoading };
}
