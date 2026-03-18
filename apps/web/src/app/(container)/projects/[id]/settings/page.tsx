'use client';

import dynamic from 'next/dynamic';
import { useProject } from '../ProjectContext';
import { TabLoadingSkeleton } from '@/shared/components/ui';

const ProjectSettingsPage = dynamic(
  () => import('@/features/project/view/ProjectSettingsPage').then(m => ({ default: m.ProjectSettingsPage })),
  { loading: () => <TabLoadingSkeleton title="설정 로딩 중..." /> }
);

export default function SettingsRoute() {
  const { project, updateProject } = useProject();
  return <ProjectSettingsPage project={project} onUpdate={updateProject} />;
}
