'use client';

import { useState, useEffect, useCallback } from 'react';
import Image from 'next/image';
import {
  Users,
  Plus,
  Edit2,
  Trash2,
  UserPlus,
  Shield,
  Crown,
  Wrench,
  ClipboardCheck,
  HardHat,
  Eye,
  Mail,
} from 'lucide-react';
import { toast } from 'sonner';
import { Button, Card, Badge } from '@/shared/components/ui';
import {
  getProjectMembers,
  addProjectMember,
  updateProjectMemberRole,
  removeProjectMember,
} from '@/features/project/services/projectMembers';
import type { ProjectMember, ProjectMemberRole } from '@/shared/types';
import { AddMemberModal } from './AddMemberModal';
import { logger } from '@/shared/utils/logger';

interface ProjectTeamPageProps {
  projectId: string;
  projectCreatedBy?: string;
}

// 메인 페이지와 일관된 역할 설정
const ROLE_CONFIG: Record<ProjectMemberRole, {
  label: string;
  shortLabel: string;
  icon: typeof Crown;
  bgColor: string;
  iconColor: string;
  badgeColors: string;
}> = {
  pm: {
    label: '프로젝트 매니저',
    shortLabel: 'PM',
    icon: Crown,
    bgColor: 'bg-purple-50 dark:bg-purple-900/20',
    iconColor: 'text-purple-600 dark:text-purple-400',
    badgeColors: 'bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400',
  },
  engineer: {
    label: '엔지니어',
    shortLabel: '엔지니어',
    icon: Wrench,
    bgColor: 'bg-blue-50 dark:bg-blue-900/20',
    iconColor: 'text-blue-600 dark:text-blue-400',
    badgeColors: 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400',
  },
  supervisor: {
    label: '감독관',
    shortLabel: '감독관',
    icon: ClipboardCheck,
    bgColor: 'bg-teal-50 dark:bg-teal-900/20',
    iconColor: 'text-teal-600 dark:text-teal-400',
    badgeColors: 'bg-teal-100 text-teal-700 dark:bg-teal-900/30 dark:text-teal-400',
  },
  worker: {
    label: '작업자',
    shortLabel: '작업자',
    icon: HardHat,
    bgColor: 'bg-orange-50 dark:bg-orange-900/20',
    iconColor: 'text-orange-600 dark:text-orange-400',
    badgeColors: 'bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-400',
  },
  member: {
    label: '일반 멤버',
    shortLabel: '멤버',
    icon: Eye,
    bgColor: 'bg-slate-100 dark:bg-slate-800',
    iconColor: 'text-slate-600 dark:text-slate-400',
    badgeColors: 'bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-400',
  },
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

  // 역할별 멤버 수 계산
  const roleCounts = members.reduce((acc, member) => {
    acc[member.role] = (acc[member.role] || 0) + 1;
    return acc;
  }, {} as Record<ProjectMemberRole, number>);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="flex flex-col items-center gap-3">
          <div className="w-8 h-8 border-3 border-slate-200 dark:border-slate-700 border-t-blue-500 rounded-full animate-spin" />
          <p className="text-sm text-slate-500 dark:text-slate-400">불러오는 중...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
      {/* 요약 카드들 */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4">
        {(['pm', 'engineer', 'supervisor', 'worker', 'member'] as ProjectMemberRole[]).map((role) => {
          const config = ROLE_CONFIG[role];
          const Icon = config.icon;
          const count = roleCounts[role] || 0;
          return (
            <Card key={role} className={`p-4 ${count === 0 ? 'opacity-50' : ''}`}>
              <div className="flex items-center gap-3">
                <div className={`p-2 rounded-lg ${config.bgColor}`}>
                  <Icon className={`w-5 h-5 ${config.iconColor}`} />
                </div>
                <div>
                  <div className="text-2xl font-bold text-slate-900 dark:text-white">{count}</div>
                  <div className="text-xs text-slate-500 dark:text-slate-400">{config.shortLabel}</div>
                </div>
              </div>
            </Card>
          );
        })}
      </div>

      {/* 멤버 목록 카드 */}
      <Card className="p-5">
        <div className="flex items-center justify-between mb-5">
          <h3 className="text-lg font-semibold text-slate-900 dark:text-white flex items-center gap-2">
            <Users className="w-5 h-5 text-blue-500" />
            팀 멤버
            <span className="text-sm font-normal text-slate-500 dark:text-slate-400">
              ({members.length}명)
            </span>
          </h3>
          <Button onClick={() => setIsAddModalOpen(true)} size="sm" className="gap-2">
            <UserPlus className="w-4 h-4" />
            추가
          </Button>
        </div>

        {members.length === 0 ? (
          <div className="text-center py-12">
            <div className="w-16 h-16 bg-slate-100 dark:bg-slate-800 rounded-full flex items-center justify-center mx-auto mb-4">
              <Users className="w-8 h-8 text-slate-400" />
            </div>
            <h3 className="text-base font-medium text-slate-900 dark:text-white mb-1">
              멤버가 없습니다
            </h3>
            <p className="text-sm text-slate-500 dark:text-slate-400 mb-4">
              프로젝트에 팀 멤버를 추가해보세요
            </p>
            <Button onClick={() => setIsAddModalOpen(true)} variant="outline" className="gap-2">
              <Plus className="w-4 h-4" />
              첫 멤버 추가
            </Button>
          </div>
        ) : (
          <div className="space-y-2">
            {members.map((member) => {
              const isCreator = member.user_id === projectCreatedBy;
              const isEditing = editingMemberId === member.id;
              const roleConfig = ROLE_CONFIG[member.role];
              const RoleIcon = roleConfig.icon;

              return (
                <div
                  key={member.id}
                  className={`flex items-center gap-4 p-3 rounded-lg transition-colors ${
                    isEditing
                      ? 'bg-blue-50 dark:bg-blue-950/20'
                      : 'hover:bg-slate-50 dark:hover:bg-slate-800/50'
                  }`}
                >
                  {/* 아바타 */}
                  <div className="relative shrink-0">
                    {member.user?.avatar_url ? (
                      <Image
                        src={member.user.avatar_url}
                        alt={member.user.display_name || member.user.email}
                        width={40}
                        height={40}
                        className="w-10 h-10 rounded-full"
                      />
                    ) : (
                      <div className={`w-10 h-10 rounded-full ${roleConfig.bgColor} flex items-center justify-center`}>
                        <span className={`font-semibold ${roleConfig.iconColor}`}>
                          {(member.user?.display_name || member.user?.email || 'U')[0].toUpperCase()}
                        </span>
                      </div>
                    )}
                  </div>

                  {/* 정보 */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="font-medium text-slate-900 dark:text-white truncate">
                        {member.user?.display_name || '이름 없음'}
                      </span>
                      {isCreator && (
                        <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-xs font-medium bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400">
                          <Shield className="w-3 h-3" />
                          생성자
                        </span>
                      )}
                    </div>
                    <div className="flex items-center gap-1 text-sm text-slate-500 dark:text-slate-400">
                      <Mail className="w-3 h-3" />
                      <span className="truncate">{member.user?.email}</span>
                    </div>
                  </div>

                  {/* 역할 & 액션 */}
                  <div className="flex items-center gap-2 shrink-0">
                    {isEditing ? (
                      <>
                        <select
                          value={member.role}
                          onChange={(e) => handleUpdateRole(member.id, e.target.value as ProjectMemberRole)}
                          onBlur={() => setEditingMemberId(null)}
                          className="px-3 py-1.5 text-sm border border-slate-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                          autoFocus
                        >
                          {Object.entries(ROLE_CONFIG).map(([value, config]) => (
                            <option key={value} value={value}>{config.label}</option>
                          ))}
                        </select>
                        <Button variant="ghost" size="sm" onClick={() => setEditingMemberId(null)}>
                          취소
                        </Button>
                      </>
                    ) : (
                      <>
                        <span className={`hidden sm:inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-sm font-medium ${roleConfig.badgeColors}`}>
                          <RoleIcon className="w-3.5 h-3.5" />
                          {roleConfig.shortLabel}
                        </span>
                        {!isCreator && (
                          <div className="flex items-center">
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => setEditingMemberId(member.id)}
                              className="h-8 w-8 p-0"
                              title="역할 변경"
                            >
                              <Edit2 className="w-4 h-4 text-slate-500" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => handleRemoveMember(member.id, member.user?.display_name || member.user?.email || '멤버')}
                              className="h-8 w-8 p-0 text-red-500 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20"
                              title="멤버 제거"
                            >
                              <Trash2 className="w-4 h-4" />
                            </Button>
                          </div>
                        )}
                      </>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </Card>

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
