import { notFound } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import { getProject } from '@/lib/services/projects';
import { getGanttChart } from '@/lib/services/ganttCharts';
import { GanttChartPageClient } from '@/components/projects/GanttChartPageClient';

interface Props {
  params: Promise<{ id: string; chartId: string }>;
}

export default async function GanttChartPage({ params }: Props) {
  const supabase = await createClient();
  const { id, chartId } = await params;

  // Only load basic project and gantt chart info
  // Tasks and links will be loaded client-side to properly handle Mock data
  const [project, ganttChart] = await Promise.all([
    getProject(id, supabase),
    getGanttChart(chartId, supabase),
  ]);

  if (!project || !ganttChart) {
    notFound();
  }

  return (
    <GanttChartPageClient
      project={project}
      ganttChart={ganttChart}
    // Remove initialTasks and initialLinks - they'll be loaded client-side
    />
  );
}

