'use client';

import { useEffect, useState } from 'react';
import {
  Shield,
  Trash2,
  Settings as SettingsIcon,
  AlertTriangle,
  Crown,
  Wrench,
  Eye,
  ShieldCheck,
  Lock,
  ClipboardCheck,
  HardHat,
  ChevronRight,
} from 'lucide-react';
import { Button, Card } from '@/components/ui';
import { ProjectSettingsForm } from './ProjectSettingsForm';
import { ProjectDeleteModal } from './ProjectDeleteModal';
import type { Project, ProjectMemberRole, Profile } from '@/lib/types';
import { getUserRoleInProject } from '@/lib/services/projectMembers';
import { getCurrentUserProfile, isSystemAdmin } from '@/lib/permissions/client';
import { logger } from '@/lib/utils/logger';

interface ProjectSettingsPageProps {
  project: Project;
  onUpdate: (updated: Project) => void;
}

const ROLE_CONFIG: Record<ProjectMemberRole, {
  label: string;
  description: string;
  icon: typeof Crown;
  bgColor: string;
  iconColor: string;
  badgeColors: string;
}> = {
  pm: {
    label: 'PM',
    description: '프로젝트 정보 수정, 멤버 관리, 삭제 가능',
    icon: Crown,
    bgColor: 'bg-purple-50 dark:bg-purple-900/20',
    iconColor: 'text-purple-600 dark:text-purple-400',
    badgeColors: 'bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400',
  },
  engineer: {
    label: '엔지니어',
    description: '데이터 입력 및 조회 가능',
    icon: Wrench,
    bgColor: 'bg-blue-50 dark:bg-blue-900/20',
    iconColor: 'text-blue-600 dark:text-blue-400',
    badgeColors: 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400',
  },
  supervisor: {
    label: '감독관',
    description: '공정 감독 및 검토 권한',
    icon: ClipboardCheck,
    bgColor: 'bg-teal-50 dark:bg-teal-900/20',
    iconColor: 'text-teal-600 dark:text-teal-400',
    badgeColors: 'bg-teal-100 text-teal-700 dark:bg-teal-900/30 dark:text-teal-400',
  },
  worker: {
    label: '작업자',
    description: '현장 작업 데이터 입력 가능',
    icon: HardHat,
    bgColor: 'bg-orange-50 dark:bg-orange-900/20',
    iconColor: 'text-orange-600 dark:text-orange-400',
    badgeColors: 'bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-400',
  },
  member: {
    label: '멤버',
    description: '프로젝트 조회만 가능',
    icon: Eye,
    bgColor: 'bg-slate-100 dark:bg-slate-800',
    iconColor: 'text-slate-600 dark:text-slate-400',
    badgeColors: 'bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-400',
  },
};

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

  const currentRoleConfig = userRole ? ROLE_CONFIG[userRole] : null;
  const CurrentRoleIcon = currentRoleConfig?.icon ?? Eye;

  return (
    <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
      {/* 읽기 전용 알림 */}
      {!canEdit && (
        <Card className="p-4 border-blue-200 dark:border-blue-900 bg-blue-50/50 dark:bg-blue-950/20">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-blue-100 dark:bg-blue-900/50 rounded-lg">
              <Lock className="w-4 h-4 text-blue-600 dark:text-blue-400" />
            </div>
            <div>
              <p className="text-sm font-medium text-blue-800 dark:text-blue-300">읽기 전용 모드</p>
              <p className="text-xs text-blue-600 dark:text-blue-400">PM 또는 시스템 관리자만 수정할 수 있습니다</p>
            </div>
          </div>
        </Card>
      )}

      {/* 내 권한 카드 */}
      <Card className="p-5">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-semibold text-slate-900 dark:text-white flex items-center gap-2">
            <Shield className="w-5 h-5 text-blue-500" />
            내 권한
          </h3>
        </div>
        <div className="flex items-center gap-4">
          <div className={`p-3 rounded-lg ${currentRoleConfig?.bgColor ?? ROLE_CONFIG.member.bgColor}`}>
            <CurrentRoleIcon className={`w-6 h-6 ${currentRoleConfig?.iconColor ?? ROLE_CONFIG.member.iconColor}`} />
          </div>
          <div className="flex-1">
            <div className="flex items-center gap-2 flex-wrap">
              <span className={`inline-flex items-center px-2.5 py-1 rounded-md text-sm font-medium ${currentRoleConfig?.badgeColors ?? ROLE_CONFIG.member.badgeColors}`}>
                {currentRoleConfig?.label ?? '멤버'}
              </span>
              {isAdmin && (
                <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-md text-sm font-medium bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400">
                  <ShieldCheck className="w-3.5 h-3.5" />
                  시스템 관리자
                </span>
              )}
            </div>
            <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
              {currentRoleConfig?.description ?? '프로젝트 조회만 가능'}
            </p>
          </div>
        </div>
      </Card>

      {/* 프로젝트 정보 카드 */}
      <Card className="p-5">
        <div className="flex items-center justify-between mb-5">
          <h3 className="text-lg font-semibold text-slate-900 dark:text-white flex items-center gap-2">
            <SettingsIcon className="w-5 h-5 text-slate-500" />
            프로젝트 정보
          </h3>
        </div>
        <ProjectSettingsForm
          project={project}
          canEdit={canEdit}
          onUpdate={onUpdate}
        />
      </Card>

      {/* 역할별 권한 안내 */}
      <Card className="p-5">
        <h3 className="text-lg font-semibold text-slate-900 dark:text-white mb-4">역할별 권한</h3>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
          {Object.entries(ROLE_CONFIG).slice(0, 3).map(([key, config]) => {
            const Icon = config.icon;
            const isCurrentRole = userRole === key;
            return (
              <div
                key={key}
                className={`p-3 rounded-lg border transition-all ${
                  isCurrentRole
                    ? 'border-blue-300 dark:border-blue-700 bg-blue-50/50 dark:bg-blue-950/20'
                    : 'border-slate-200 dark:border-slate-800 hover:border-slate-300 dark:hover:border-slate-700'
                }`}
              >
                <div className="flex items-center gap-2.5 mb-1.5">
                  <div className={`p-1.5 rounded-md ${config.bgColor}`}>
                    <Icon className={`w-4 h-4 ${config.iconColor}`} />
                  </div>
                  <span className="text-sm font-semibold text-slate-900 dark:text-white">
                    {config.label}
                  </span>
                  {isCurrentRole && (
                    <span className="ml-auto text-xs text-blue-600 dark:text-blue-400 font-medium">현재</span>
                  )}
                </div>
                <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed pl-9">
                  {config.description}
                </p>
              </div>
            );
          })}
        </div>
      </Card>

      {/* 위험 영역 */}
      {canDelete && (
        <Card className="p-5 border-red-200 dark:border-red-900/50">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-semibold text-red-600 dark:text-red-400 flex items-center gap-2">
              <AlertTriangle className="w-5 h-5" />
              위험 영역
            </h3>
          </div>
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <p className="text-sm font-medium text-slate-900 dark:text-white mb-1">프로젝트 삭제</p>
              <p className="text-sm text-slate-500 dark:text-slate-400">
                모든 데이터가 영구 삭제됩니다. 되돌릴 수 없습니다.
              </p>
              <div className="flex flex-wrap gap-1.5 mt-2">
                {['건물/층 정보', '공정 계획', '팀 멤버', '간트 차트'].map((item) => (
                  <span
                    key={item}
                    className="inline-flex items-center px-2 py-0.5 text-xs text-red-600 dark:text-red-400 bg-red-50 dark:bg-red-950/30 rounded"
                  >
                    {item}
                  </span>
                ))}
              </div>
            </div>
            <Button
              variant="danger"
              onClick={() => setIsDeleteModalOpen(true)}
              className="shrink-0 gap-2"
            >
              <Trash2 className="w-4 h-4" />
              삭제
            </Button>
          </div>
        </Card>
      )}

      <ProjectDeleteModal
        project={project}
        isOpen={isDeleteModalOpen}
        onClose={() => setIsDeleteModalOpen(false)}
      />
    </div>
  );
}
