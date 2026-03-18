'use client';

import dynamic from 'next/dynamic';
import { useProject } from '../ProjectContext';
import { TabLoadingSkeleton } from '@/shared/components/ui';

const GanttChartPage = dynamic(
  () => import('@/features/gantt/view/GanttChartPage').then(m => ({ default: m.GanttChartPage })),
  { loading: () => <TabLoadingSkeleton title="간트차트 로딩 중..." />, ssr: false }
);

export default function GanttRoute() {
  const { project } = useProject();
  return <GanttChartPage projectId={project.id} projectNumber={project.project_number} />;
}
