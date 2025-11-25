'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { ArrowLeft } from 'lucide-react';
import { Card } from '@/components/ui';
import { GanttWrapper } from '@/components/gantt/GanttWrapper';
import type { Project } from '@/lib/types';
import type { GanttChart } from '@/lib/services/ganttCharts';

interface Props {
  project: Project;
  ganttChart: GanttChart;
}

export function GanttChartPageClient({
  project,
  ganttChart,
}: Props) {
  const [isClient, setIsClient] = useState(false);

  useEffect(() => {
    setIsClient(true);
  }, []);

  if (!isClient) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600 dark:text-gray-400">Gantt 차트 초기화 중...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-center justify-between">
        <div>
          <Link
            href={`/projects/${project.id}`}
            className="inline-flex items-center gap-2 text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white transition-colors mb-2"
          >
            <ArrowLeft className="w-4 h-4" />
            {project.name}
          </Link>
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white">
            {ganttChart.name}
          </h1>
          {ganttChart.description && (
            <p className="mt-1 text-gray-600 dark:text-gray-400">
              {ganttChart.description}
            </p>
          )}
        </div>
      </div>

      {/* Gantt Chart */}
      <Card className="p-0 overflow-hidden">
        <div className="h-[calc(100vh-300px)] min-h-[600px]">
          <GanttWrapper
            ganttChartId={ganttChart.id}
            onGanttReady={(api) => {
              console.log('✅ Gantt API Ready:', api);
            }}
          />
        </div>
      </Card>
    </div>
  );
}

