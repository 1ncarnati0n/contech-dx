import { notFound } from 'next/navigation';
import { getProject } from '@/lib/services/projects';
import { getGanttCharts } from '@/lib/services/ganttCharts';
import { ProjectDetailClient } from '@/components/projects/ProjectDetailClient';

interface Props {
  params: Promise<{ id: string }>;
}

export default async function ProjectDetailPage({ params }: Props) {
  const { id } = await params;
  
  // Load project data
  const project = await getProject(id);

  if (!project) {
    notFound();
  }

  // Load gantt charts for this project
  const ganttCharts = await getGanttCharts(id);

  return <ProjectDetailClient project={project} ganttCharts={ganttCharts} />;
}

