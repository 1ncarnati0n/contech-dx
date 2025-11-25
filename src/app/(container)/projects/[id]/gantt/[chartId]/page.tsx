import { notFound } from 'next/navigation';
import { getProject } from '@/lib/services/projects';
import { getGanttChart } from '@/lib/services/ganttCharts';
import { getTasks } from '@/lib/services/tasks';
import { getLinks } from '@/lib/services/links';
import { GanttChartPageClient } from '@/components/projects/GanttChartPageClient';

interface Props {
  params: Promise<{ id: string; chartId: string }>;
}

export default async function GanttChartPage({ params }: Props) {
  const { id, chartId } = await params;

  // Load data
  const [project, ganttChart, tasks, links] = await Promise.all([
    getProject(id),
    getGanttChart(chartId),
    getTasks(chartId),
    getLinks(chartId),
  ]);

  if (!project || !ganttChart) {
    notFound();
  }

  return (
    <GanttChartPageClient
      project={project}
      ganttChart={ganttChart}
      initialTasks={tasks}
      initialLinks={links}
    />
  );
}

