'use client';

import { useEffect, useState } from 'react';
import { Shield, Trash2, Settings as SettingsIcon, AlertTriangle } from 'lucide-react';
import { Button } from '@/components/ui';
import { ProjectSettingsForm } from './ProjectSettingsForm';
import { ProjectDeleteModal } from './ProjectDeleteModal';
import type { Project, ProjectMemberRole, Profile } from '@/lib/types';
import { getUserRoleInProject } from '@/lib/services/projectMembers';
import { getCurrentUserProfile, isSystemAdmin } from '@/lib/permissions/client';
import { logger } from '@/lib/utils/logger';

interface ProjectSettingsPageProps {
  project: Project;
  onUpdate: () => void;
}

export function ProjectSettingsPage({ project, onUpdate }: ProjectSettingsPageProps) {
  const [userRole, setUserRole] = useState<ProjectMemberRole | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    async function loadPermissions() {
      try {
        const currentProfile = await getCurrentUserProfile();
        setProfile(currentProfile);

        if (currentProfile) {
          const role = await getUserRoleInProject(project.id, currentProfile.id);
          setUserRole(role as ProjectMemberRole);
        }
      } catch (error) {
        logger.error('Failed to load permissions:', error);
      } finally {
        setIsLoading(false);
      }
    }

    loadPermissions();
  }, [project.id]);

  const isAdmin = isSystemAdmin(profile);
  const canEdit = userRole === 'pm' || isAdmin;
  const canDelete = canEdit;

  const getRoleBadge = (role: string | null) => {
    if (!role) return null;

    const badges: Record<string, { label: string; color: string }> = {
      pm: { label: 'PM', color: 'bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400' },
      engineer: { label: '엔지니어', color: 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400' },
      member: { label: '멤버', color: 'bg-gray-100 text-gray-700 dark:bg-gray-900/30 dark:text-gray-400' },
    };

    const badge = badges[role] || badges.member;

    return (
      <span className={`inline-flex items-center px-3 py-1 rounded-full text-sm font-medium ${badge.color}`}>
        {badge.label}
      </span>
    );
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="flex flex-col items-center gap-3">
          <div className="w-8 h-8 border-4 border-zinc-200 dark:border-zinc-700 border-t-blue-600 rounded-full animate-spin" />
          <p className="text-sm text-zinc-500 dark:text-zinc-400">권한 확인 중...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-8 max-w-4xl mx-auto p-6">
      {/* General Information Section */}
      <section className="space-y-4">
        <div className="flex items-center gap-3 pb-3 border-b border-zinc-200 dark:border-zinc-800">
          <SettingsIcon className="w-5 h-5 text-zinc-600 dark:text-zinc-400" />
          <h2 className="text-xl font-semibold text-zinc-900 dark:text-white">
            일반 정보
          </h2>
        </div>

        {!canEdit && (
          <div className="p-4 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-md">
            <p className="text-sm text-blue-700 dark:text-blue-400">
              ℹ️ 읽기 전용 모드입니다. PM 또는 관리자만 프로젝트 정보를 수정할 수 있습니다.
            </p>
          </div>
        )}

        <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-lg p-6">
          <ProjectSettingsForm
            project={project}
            canEdit={canEdit}
            onUpdate={onUpdate}
          />
        </div>
      </section>

      {/* Permissions Section */}
      <section className="space-y-4">
        <div className="flex items-center gap-3 pb-3 border-b border-zinc-200 dark:border-zinc-800">
          <Shield className="w-5 h-5 text-zinc-600 dark:text-zinc-400" />
          <h2 className="text-xl font-semibold text-zinc-900 dark:text-white">
            권한
          </h2>
        </div>

        <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-lg p-6 space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-zinc-700 dark:text-zinc-300">
                내 역할
              </p>
              <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-1">
                이 프로젝트에서의 권한 레벨
              </p>
            </div>
            <div className="flex items-center gap-2">
              {getRoleBadge(userRole)}
              {isAdmin && (
                <span className="inline-flex items-center px-3 py-1 rounded-full text-sm font-medium bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400">
                  시스템 관리자
                </span>
              )}
            </div>
          </div>

          <div className="pt-4 border-t border-zinc-200 dark:border-zinc-800">
            <div className="space-y-2">
              <p className="text-sm font-medium text-zinc-700 dark:text-zinc-300">
                권한 설명
              </p>
              <ul className="space-y-2 text-sm text-zinc-600 dark:text-zinc-400">
                <li className="flex items-start gap-2">
                  <span className="text-purple-600 dark:text-purple-400">•</span>
                  <span><strong>PM</strong>: 프로젝트 정보 수정, 멤버 관리, 프로젝트 삭제 가능</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-blue-600 dark:text-blue-400">•</span>
                  <span><strong>엔지니어</strong>: 프로젝트 데이터 입력 및 조회 가능</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-gray-600 dark:text-gray-400">•</span>
                  <span><strong>멤버</strong>: 프로젝트 조회만 가능</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-red-600 dark:text-red-400">•</span>
                  <span><strong>시스템 관리자</strong>: 모든 프로젝트에 대한 전체 권한 보유</span>
                </li>
              </ul>
            </div>
          </div>
        </div>
      </section>

      {/* Danger Zone Section */}
      {canDelete && (
        <section className="space-y-4">
          <div className="flex items-center gap-3 pb-3 border-b border-red-200 dark:border-red-900">
            <AlertTriangle className="w-5 h-5 text-red-600 dark:text-red-400" />
            <h2 className="text-xl font-semibold text-red-600 dark:text-red-400">
              위험 영역
            </h2>
          </div>

          <div className="bg-white dark:bg-zinc-900 border-2 border-red-200 dark:border-red-900 rounded-lg p-6">
            <div className="flex items-start justify-between gap-6">
              <div className="flex-1 space-y-2">
                <h3 className="text-lg font-semibold text-zinc-900 dark:text-white">
                  프로젝트 삭제
                </h3>
                <p className="text-sm text-zinc-600 dark:text-zinc-400">
                  프로젝트와 관련된 모든 데이터가 영구적으로 삭제됩니다. 이 작업은 되돌릴 수 없습니다.
                </p>
                <div className="pt-2">
                  <ul className="space-y-1 text-xs text-zinc-500 dark:text-zinc-500">
                    <li>• 모든 건물 및 층 정보</li>
                    <li>• 지하층/건물 공정 계획</li>
                    <li>• 프로젝트 팀 멤버 정보</li>
                    <li>• 간트 차트 데이터</li>
                  </ul>
                </div>
              </div>
              <div>
                <Button
                  variant="danger"
                  onClick={() => setIsDeleteModalOpen(true)}
                  className="whitespace-nowrap"
                >
                  <Trash2 className="w-4 h-4 mr-2" />
                  프로젝트 삭제
                </Button>
              </div>
            </div>
          </div>
        </section>
      )}

      {/* Delete Modal */}
      <ProjectDeleteModal
        project={project}
        isOpen={isDeleteModalOpen}
        onClose={() => setIsDeleteModalOpen(false)}
      />
    </div>
  );
}
