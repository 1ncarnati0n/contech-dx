'use client';

import { createContext, useContext, useState, useCallback } from 'react';
import { toast } from 'sonner';
import type { Project } from '@/shared/types';

interface ProjectContextValue {
  project: Project;
  updateProject: (updated: Project) => void;
}

const ProjectContext = createContext<ProjectContextValue | null>(null);

export function ProjectProvider({
  initialProject,
  children,
}: {
  initialProject: Project;
  children: React.ReactNode;
}) {
  const [project, setProject] = useState(initialProject);

  const updateProject = useCallback((updated: Project) => {
    setProject(updated);
    toast.success('프로젝트 정보가 업데이트되었습니다.');
  }, []);

  return (
    <ProjectContext.Provider value={{ project, updateProject }}>
      {children}
    </ProjectContext.Provider>
  );
}

export function useProject() {
  const ctx = useContext(ProjectContext);
  if (!ctx) throw new Error('useProject must be used within ProjectProvider');
  return ctx;
}
