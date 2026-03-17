'use client';

import { useState, useEffect, useCallback } from 'react';
import { toast } from 'sonner';
import {
  getProjectMembers,
  addProjectMember,
  updateProjectMemberRole,
  removeProjectMember,
} from '@/features/project/repository/projectMembers';
import type { ProjectMember, ProjectMemberRole } from '@/shared/types';
import { logger } from '@/shared/utils/logger';

export function useProjectTeam(projectId: string) {
  const [members, setMembers] = useState<ProjectMember[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const loadMembers = useCallback(async () => {
    try {
      setIsLoading(true);
      const data = await getProjectMembers(projectId);
      setMembers(data);
    } catch (error) {
      logger.error('Failed to load project members:', error);
      toast.error('멤버 목록을 불러오는데 실패했습니다.');
    } finally {
      setIsLoading(false);
    }
  }, [projectId]);

  useEffect(() => { loadMembers(); }, [loadMembers]);

  const handleAddMember = useCallback(async (userId: string, role: ProjectMemberRole) => {
    try {
      await addProjectMember({ project_id: projectId, user_id: userId, role });
      toast.success('멤버가 추가되었습니다.');
      loadMembers();
      return true;
    } catch (error) {
      logger.error('Failed to add member:', error);
      toast.error('멤버 추가에 실패했습니다.');
      return false;
    }
  }, [projectId, loadMembers]);

  const handleUpdateRole = useCallback(async (memberId: string, newRole: ProjectMemberRole) => {
    try {
      await updateProjectMemberRole(memberId, { role: newRole });
      toast.success('역할이 변경되었습니다.');
      loadMembers();
    } catch (error) {
      logger.error('Failed to update role:', error);
      toast.error('역할 변경에 실패했습니다.');
    }
  }, [loadMembers]);

  const handleRemoveMember = useCallback(async (memberId: string, memberName: string) => {
    if (!window.confirm(`${memberName}님을 프로젝트에서 제거하시겠습니까?`)) return;
    try {
      await removeProjectMember(memberId);
      toast.success('멤버가 제거되었습니다.');
      loadMembers();
    } catch (error) {
      logger.error('Failed to remove member:', error);
      toast.error('멤버 제거에 실패했습니다.');
    }
  }, [loadMembers]);

  const roleCounts = members.reduce((acc, member) => {
    acc[member.role] = (acc[member.role] || 0) + 1;
    return acc;
  }, {} as Record<ProjectMemberRole, number>);

  return {
    members, isLoading, roleCounts,
    handleAddMember, handleUpdateRole, handleRemoveMember,
  };
}
