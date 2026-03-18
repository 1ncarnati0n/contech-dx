'use client';

import { useState, useCallback, useEffect, useRef } from 'react';
import { usePathname } from 'next/navigation';
import {
  LayoutDashboard,
  type LucideIcon,
} from 'lucide-react';
import type { Project, Profile, ProjectMemberRole } from '@/shared/types';
import { getCurrentUserProfile, isSystemAdmin } from '@/shared/lib/permissions/client';
import { getUserRoleInProject } from '@/features/project/repository/projectMembers';
import { ProjectSidebar } from '@/features/project/view/ProjectSidebar';
import { TAB_TITLES, TAB_DESCRIPTIONS, TAB_ICONS, pathToTabId } from './route-config';
import { ProjectProvider } from './ProjectContext';

interface Props {
  project: Project;
  children: React.ReactNode;
}

export function ProjectLayoutClient({ project: initialProject, children }: Props) {
  const pathname = usePathname();
  const [project, setProject] = useState<Project>(initialProject);
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [sidebarPinned, setSidebarPinned] = useState(true);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [userRole, setUserRole] = useState<ProjectMemberRole | null>(null);

  // 현재 URL에서 활성 탭 ID 추출
  const activeTab = pathToTabId(pathname);

  // 프로필 및 역할 로드
  useEffect(() => {
    async function loadProfileAndRole() {
      const currentProfile = await getCurrentUserProfile();
      setProfile(currentProfile);

      if (currentProfile) {
        const role = await getUserRoleInProject(initialProject.id, currentProfile.id);
        setUserRole(role as ProjectMemberRole);
      }
    }
    loadProfileAndRole();
  }, [initialProject.id]);

  const isAdmin = isSystemAdmin(profile);
  const canViewProcessLogic = isAdmin || userRole === 'pm';

  useEffect(() => {
    setProject(initialProject);
  }, [initialProject]);

  const handleTogglePin = useCallback(() => {
    setSidebarPinned(prev => {
      const newPinned = !prev;
      if (!newPinned) {
        setSidebarCollapsed(true);
      }
      return newPinned;
    });
  }, []);

  const handleBodyClick = useCallback(() => {
    if (!sidebarCollapsed && !sidebarPinned) {
      setSidebarCollapsed(true);
    }
  }, [sidebarCollapsed, sidebarPinned]);

  const hoverTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  const handleSidebarMouseEnter = useCallback(() => {
    if (hoverTimeoutRef.current) {
      clearTimeout(hoverTimeoutRef.current);
      hoverTimeoutRef.current = null;
    }
    if (!sidebarPinned) {
      setSidebarCollapsed(false);
    }
  }, [sidebarPinned]);

  const handleSidebarMouseLeave = useCallback(() => {
    if (sidebarPinned) return;
    hoverTimeoutRef.current = setTimeout(() => {
      setSidebarCollapsed(true);
    }, 300);
  }, [sidebarPinned]);

  useEffect(() => {
    return () => {
      if (hoverTimeoutRef.current) {
        clearTimeout(hoverTimeoutRef.current);
      }
    };
  }, []);

  const Icon = TAB_ICONS[activeTab] || LayoutDashboard;
  const title = TAB_TITLES[activeTab] || '';
  const description = TAB_DESCRIPTIONS[activeTab] || '';

  return (
    <ProjectProvider initialProject={project}>
      <div className="fixed inset-0 top-16 flex bg-background overflow-hidden">
        <ProjectSidebar
          isCollapsed={sidebarCollapsed}
          isPinned={sidebarPinned}
          onTogglePin={handleTogglePin}
          project={project}
          activeTab={activeTab}
          projectId={project.id}
          onMouseEnter={handleSidebarMouseEnter}
          onMouseLeave={handleSidebarMouseLeave}
          canViewProcessLogic={canViewProcessLogic}
        />

        <div
          className={`flex-1 flex flex-col h-full transition-all duration-300 ease-in-out ${
            sidebarCollapsed ? 'ml-16' : 'ml-54'
          }`}
          onClick={handleBodyClick}
        >
          <main className="flex-1 overflow-y-auto">
            <div className="max-w-7xl mx-auto py-10 px-4 sm:px-6 lg:px-8">
              {/* 공통 헤더 */}
              <div className="mb-8 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                <div className="flex items-center gap-3">
                  <div className="p-3 bg-white rounded-xl shadow-sm border border-zinc-200 dark:bg-zinc-900 dark:border-zinc-800">
                    <Icon className="w-6 h-6 text-zinc-700 dark:text-zinc-300" />
                  </div>
                  <div>
                    <h1 className="text-2xl font-bold text-zinc-900 dark:text-white">
                      {title}
                    </h1>
                    <p className="text-zinc-500 dark:text-zinc-400 text-sm">
                      {description}
                    </p>
                  </div>
                </div>
              </div>

              {children}
            </div>
          </main>
        </div>
      </div>
    </ProjectProvider>
  );
}
