'use client';

import { useState } from 'react';
import Image from 'next/image';
import {
  Users,
  Plus,
  Edit2,
  Trash2,
  UserPlus,
  Shield,
  Mail,
} from 'lucide-react';
import { Button, Card, Badge } from '@/shared/components/ui';
import type { ProjectMemberRole } from '@/shared/types';
import { AddMemberModal } from './AddMemberModal';
import { useProjectTeam } from '@/features/project/service/useProjectTeam';
import { ROLE_CONFIG, ROLE_ORDER } from '@/features/project/service/project.constants';

interface ProjectTeamPageProps {
  projectId: string;
  projectCreatedBy?: string;
}

export function ProjectTeamPage({ projectId, projectCreatedBy }: ProjectTeamPageProps) {
  const { members, isLoading, roleCounts, handleAddMember, handleUpdateRole, handleRemoveMember } = useProjectTeam(projectId);
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [editingMemberId, setEditingMemberId] = useState<string | null>(null);

  const onAddMember = async (userId: string, role: ProjectMemberRole) => {
    const success = await handleAddMember(userId, role);
    if (success) setIsAddModalOpen(false);
  };

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
        {ROLE_ORDER.map((role) => {
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
                          onChange={(e) => { handleUpdateRole(member.id, e.target.value as ProjectMemberRole); setEditingMemberId(null); }}
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
        onAdd={onAddMember}
        projectId={projectId}
        existingMemberIds={members.map((m) => m.user_id)}
      />
    </div>
  );
}
