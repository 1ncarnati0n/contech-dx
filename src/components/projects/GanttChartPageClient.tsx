'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { ArrowLeft, Save, AlertCircle } from 'lucide-react';
import { Button, Card } from '@/components/ui';
import { GanttWrapper } from '@/components/gantt/GanttWrapper';
import type { Project } from '@/lib/types';
import type { GanttChart } from '@/lib/services/ganttCharts';
import type { Task, Link as GanttLink } from '@/lib/gantt/types';

interface Props {
  project: Project;
  ganttChart: GanttChart;
  initialTasks: Task[];
  initialLinks: GanttLink[];
}

export function GanttChartPageClient({
  project,
  ganttChart,
  initialTasks,
  initialLinks,
}: Props) {
  const [tasks, setTasks] = useState<Task[]>(initialTasks);
  const [links, setLinks] = useState<GanttLink[]>(initialLinks);
  const [hasChanges, setHasChanges] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [isClient, setIsClient] = useState(false);

  useEffect(() => {
    setIsClient(true);
  }, []);

  const handleSave = async () => {
    try {
      setIsSaving(true);
      // TODO: Implement save functionality
      console.log('Saving tasks:', tasks);
      console.log('Saving links:', links);
      
      // Mock save
      await new Promise((resolve) => setTimeout(resolve, 1000));
      
      setHasChanges(false);
      alert('저장되었습니다!');
    } catch (error) {
      console.error('Failed to save:', error);
      alert('저장에 실패했습니다.');
    } finally {
      setIsSaving(false);
    }
  };

  if (!isClient) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600 dark:text-gray-400">Gantt 차트 로딩 중...</p>
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
        <Button
          onClick={handleSave}
          disabled={!hasChanges || isSaving}
          className="gap-2"
        >
          <Save className="w-4 h-4" />
          {isSaving ? '저장 중...' : hasChanges ? '저장' : '저장됨'}
        </Button>
      </div>

      {/* Info Banner */}
      {hasChanges && (
        <Card className="p-4 bg-amber-50 dark:bg-amber-900/20 border-amber-200 dark:border-amber-800">
          <div className="flex items-center gap-3">
            <AlertCircle className="w-5 h-5 text-amber-600 dark:text-amber-400" />
            <p className="text-sm text-amber-800 dark:text-amber-200">
              변경사항이 있습니다. 저장 버튼을 눌러 저장하세요.
            </p>
          </div>
        </Card>
      )}

      {/* Gantt Chart */}
      <Card className="p-0 overflow-hidden">
        <div className="h-[calc(100vh-300px)] min-h-[600px]">
          <GanttWrapper
            tasks={tasks}
            links={links}
            scales={[
              { unit: 'month', step: 1, format: 'MMMM yyy' },
              { unit: 'day', step: 1, format: 'd' },
            ]}
            onGanttReady={(api) => {
              console.log('✅ Gantt API Ready:', api);
            }}
          />
        </div>
      </Card>

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card className="p-4 text-center">
          <div className="text-3xl font-bold text-blue-600 dark:text-blue-400">
            {tasks.length}
          </div>
          <div className="text-sm text-gray-600 dark:text-gray-400 mt-1">Tasks</div>
        </Card>
        <Card className="p-4 text-center">
          <div className="text-3xl font-bold text-purple-600 dark:text-purple-400">
            {links.length}
          </div>
          <div className="text-sm text-gray-600 dark:text-gray-400 mt-1">Links</div>
        </Card>
        <Card className="p-4 text-center">
          <div className="text-3xl font-bold text-green-600 dark:text-green-400">
            {tasks.filter((t) => t.type === 'milestone').length}
          </div>
          <div className="text-sm text-gray-600 dark:text-gray-400 mt-1">
            Milestones
          </div>
        </Card>
        <Card className="p-4 text-center">
          <div className="text-3xl font-bold text-amber-600 dark:text-amber-400">
            {Math.round(
              tasks.reduce((sum, t) => sum + (t.progress || 0), 0) / (tasks.length || 1)
            )}
            %
          </div>
          <div className="text-sm text-gray-600 dark:text-gray-400 mt-1">진행률</div>
        </Card>
      </div>
    </div>
  );
}

