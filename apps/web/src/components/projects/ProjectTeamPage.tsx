'use client';

import { useState, useEffect, useCallback } from 'react';
import Image from 'next/image';
import { Users, Plus, Edit2, Trash2, UserPlus, Shield } from 'lucide-react';
import { toast } from 'sonner';
import { Button, Card, Badge } from '@/components/ui';
import {
  getProjectMembers,
  addProjectMember,
  updateProjectMemberRole,
  removeProjectMember,
} from '@/lib/services/projectMembers';
import type { ProjectMember, ProjectMemberRole } from '@/lib/types';
import { AddMemberModal } from './AddMemberModal';
import { logger } from '@/lib/utils/logger';

interface ProjectTeamPageProps {
  projectId: string;
  projectCreatedBy?: string;
}

const ROLE_LABELS: Record<ProjectMemberRole, string> = {
  pm: '프로젝트 매니저',
  engineer: '엔지니어',
  supervisor: '감독자',
  worker: '작업자',
  member: '일반 멤버',
};

const ROLE_COLORS: Record<ProjectMemberRole, string> = {
  pm: 'bg-admin-100 text-admin-700 dark:bg-admin-900/30 dark:text-admin-300',
  engineer: 'bg-accent-100 text-accent-700 dark:bg-accent-900/30 dark:text-accent-300',
  supervisor: 'bg-warning-100 text-warning-700 dark:bg-warning-900/30 dark:text-warning-300',
  worker: 'bg-success-100 text-success-700 dark:bg-success-900/30 dark:text-success-300',
  member: 'bg-zinc-100 text-zinc-700 dark:bg-zinc-800 dark:text-zinc-300',
};

export function ProjectTeamPage({ projectId, projectCreatedBy }: ProjectTeamPageProps) {
  const [members, setMembers] = useState<ProjectMember[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [editingMemberId, setEditingMemberId] = useState<string | null>(null);

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

  useEffect(() => {
    loadMembers();
  }, [loadMembers]);

  const handleAddMember = useCallback(
    async (userId: string, role: ProjectMemberRole) => {
      try {
        await addProjectMember({
          project_id: projectId,
          user_id: userId,
          role,
        });
        toast.success('멤버가 추가되었습니다.');
        setIsAddModalOpen(false);
        loadMembers();
      } catch (error) {
        logger.error('Failed to add member:', error);
        toast.error('멤버 추가에 실패했습니다.');
      }
    },
    [projectId, loadMembers]
  );

  const handleUpdateRole = useCallback(
    async (memberId: string, newRole: ProjectMemberRole) => {
      try {
        await updateProjectMemberRole(memberId, { role: newRole });
        toast.success('역할이 변경되었습니다.');
        setEditingMemberId(null);
        loadMembers();
      } catch (error) {
        logger.error('Failed to update role:', error);
        toast.error('역할 변경에 실패했습니다.');
      }
    },
    [loadMembers]
  );

  const handleRemoveMember = useCallback(
    async (memberId: string, memberName: string) => {
      if (!window.confirm(`${memberName}님을 프로젝트에서 제거하시겠습니까?`)) {
        return;
      }

      try {
        await removeProjectMember(memberId);
        toast.success('멤버가 제거되었습니다.');
        loadMembers();
      } catch (error) {
        logger.error('Failed to remove member:', error);
        toast.error('멤버 제거에 실패했습니다.');
      }
    },
    [loadMembers]
  );

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-zinc-400">로딩 중...</div>
      </div>
    );
  }

  return (
    <div className="space-y-6 max-w-5xl">
      {/* 멤버 추가 버튼 */}
      <div className="flex justify-end">
        <Button onClick={() => setIsAddModalOpen(true)} className="gap-2">
          <UserPlus className="w-4 h-4" />
          멤버 추가
        </Button>
      </div>

      {/* Members List */}
      {members.length === 0 ? (
        <Card className="p-12 text-center">
          <Users className="w-12 h-12 text-zinc-300 dark:text-zinc-600 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-zinc-900 dark:text-white mb-2">
            멤버가 없습니다
          </h3>
          <p className="text-sm text-zinc-500 dark:text-zinc-400 mb-4">
            프로젝트에 멤버를 추가하여 협업을 시작하세요.
          </p>
          <Button onClick={() => setIsAddModalOpen(true)} variant="outline" className="gap-2">
            <Plus className="w-4 h-4" />
            첫 멤버 추가하기
          </Button>
        </Card>
      ) : (
        <div className="grid gap-4">
          {members.map((member) => {
            const isCreator = member.user_id === projectCreatedBy;
            const isEditing = editingMemberId === member.id;

            return (
              <Card key={member.id} className="p-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-4 flex-1">
                    {/* Avatar */}
                    <div className="w-10 h-10 rounded-full bg-zinc-200 dark:bg-zinc-700 flex items-center justify-center">
                      {member.user?.avatar_url ? (
                        <Image
                          src={member.user.avatar_url}
                          alt={member.user.display_name || member.user.email}
                          width={40}
                          height={40}
                          className="w-10 h-10 rounded-full"
                        />
                      ) : (
                        <span className="text-zinc-600 dark:text-zinc-300 font-medium">
                          {(member.user?.display_name || member.user?.email || 'U')[0].toUpperCase()}
                        </span>
                      )}
                    </div>

                    {/* User Info */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <h3 className="font-medium text-zinc-900 dark:text-white truncate">
                          {member.user?.display_name || member.user?.email || '알 수 없음'}
                        </h3>
                        {isCreator && (
                          <Badge variant="outline" className="text-xs">
                            <Shield className="w-3 h-3 mr-1" />
                            생성자
                          </Badge>
                        )}
                      </div>
                      <p className="text-sm text-zinc-500 dark:text-zinc-400 truncate">
                        {member.user?.email}
                      </p>
                    </div>

                    {/* Role */}
                    <div className="flex items-center gap-3">
                      {isEditing ? (
                        <select
                          value={member.role}
                          onChange={(e) =>
                            handleUpdateRole(member.id, e.target.value as ProjectMemberRole)
                          }
                          onBlur={() => setEditingMemberId(null)}
                          className="px-3 py-1.5 text-sm border border-zinc-300 dark:border-zinc-600 rounded-md bg-white dark:bg-zinc-800 text-zinc-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-primary-500"
                          autoFocus
                        >
                          {Object.entries(ROLE_LABELS).map(([value, label]) => (
                            <option key={value} value={value}>
                              {label}
                            </option>
                          ))}
                        </select>
                      ) : (
                        <>
                          <Badge className={ROLE_COLORS[member.role]}>
                            {ROLE_LABELS[member.role]}
                          </Badge>
                          {!isCreator && (
                            <div className="flex items-center gap-1">
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => setEditingMemberId(member.id)}
                                className="h-8 w-8 p-0"
                              >
                                <Edit2 className="w-4 h-4" />
                              </Button>
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() =>
                                  handleRemoveMember(
                                    member.id,
                                    member.user?.display_name || member.user?.email || '멤버'
                                  )
                                }
                                className="h-8 w-8 p-0 text-red-600 hover:text-red-700 hover:bg-red-50 dark:hover:bg-red-900/20"
                              >
                                <Trash2 className="w-4 h-4" />
                              </Button>
                            </div>
                          )}
                        </>
                      )}
                    </div>
                  </div>
                </div>
              </Card>
            );
          })}
        </div>
      )}

      {/* Add Member Modal */}
      <AddMemberModal
        isOpen={isAddModalOpen}
        onClose={() => setIsAddModalOpen(false)}
        onAdd={handleAddMember}
        projectId={projectId}
        existingMemberIds={members.map((m) => m.user_id)}
      />
    </div>
  );
}
