'use client';

import { useEffect, useState, useCallback, useMemo } from 'react';
import {
  GanttChart,
  ThemeProvider,
  type ConstructionTask,
  type Milestone,
  type AnchorDependency,
  type GanttData,
  type GroupDragResult,
  type AnchorDependencyDragResult,
} from 'sa-gantt-lib';
import 'sa-gantt-lib/style.css';
import { createSupabaseGanttDataService } from '@/lib/services/SupabaseGanttDataService';
import { toast } from 'sonner';
import { Loader2 } from 'lucide-react';

interface GanttChartPageProps {
  projectId: string;
}

export function GanttChartPage({ projectId }: GanttChartPageProps) {
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [tasks, setTasks] = useState<ConstructionTask[]>([]);
  const [milestones, setMilestones] = useState<Milestone[]>([]);
  const [dependencies, setDependencies] = useState<AnchorDependency[]>([]);

  // Supabase DataService 생성 (projectId 기반)
  const dataService = useMemo(
    () => createSupabaseGanttDataService(projectId, { debug: true }),
    [projectId]
  );

  // 초기 데이터 로드
  useEffect(() => {
    async function loadData() {
      try {
        setIsLoading(true);
        setError(null);
        const data = await dataService.loadAll();
        setTasks(data.tasks);
        setMilestones(data.milestones);
        setDependencies(data.dependencies);
      } catch (err) {
        console.error('Failed to load gantt data:', err);
        setError('간트차트 데이터를 불러오는데 실패했습니다.');
        toast.error('데이터 로드 실패', {
          description: '간트차트 데이터를 불러오는데 실패했습니다.',
        });
      } finally {
        setIsLoading(false);
      }
    }

    loadData();
  }, [dataService]);

  // Task 업데이트 핸들러
  const handleTaskUpdate = useCallback(
    async (task: ConstructionTask) => {
      try {
        await dataService.updateTask(task.id, task);
        // 로컬 상태 업데이트
        setTasks((prev) =>
          prev.map((t) => (t.id === task.id ? task : t))
        );
      } catch (err) {
        console.error('Failed to update task:', err);
        toast.error('태스크 업데이트 실패');
      }
    },
    [dataService]
  );

  // Task 생성 핸들러
  const handleTaskCreate = useCallback(
    async (task: Partial<ConstructionTask>) => {
      try {
        const newTask = await dataService.createTask(task as Omit<ConstructionTask, 'id'>);
        setTasks((prev) => [...prev, newTask]);
        toast.success('태스크가 생성되었습니다.');
      } catch (err) {
        console.error('Failed to create task:', err);
        toast.error('태스크 생성 실패');
      }
    },
    [dataService]
  );

  // Task 삭제 핸들러
  const handleTaskDelete = useCallback(
    async (taskId: string) => {
      try {
        await dataService.deleteTask(taskId);
        setTasks((prev) => prev.filter((t) => t.id !== taskId));
        toast.success('태스크가 삭제되었습니다.');
      } catch (err) {
        console.error('Failed to delete task:', err);
        toast.error('태스크 삭제 실패');
      }
    },
    [dataService]
  );

  // Group 드래그 핸들러
  const handleGroupDrag = useCallback(
    async (result: GroupDragResult) => {
      if (!result.taskUpdates) return;

      try {
        // 모든 영향받은 태스크 업데이트
        await Promise.all(
          result.taskUpdates.map((update) =>
            dataService.updateTask(update.taskId, {
              startDate: update.newStartDate,
            })
          )
        );
        // 로컬 상태 업데이트
        setTasks((prev) =>
          prev.map((t) => {
            const update = result.taskUpdates?.find((u) => u.taskId === t.id);
            return update ? { ...t, startDate: update.newStartDate } : t;
          })
        );
      } catch (err) {
        console.error('Failed to update tasks after group drag:', err);
        toast.error('그룹 업데이트 실패');
      }
    },
    [dataService]
  );

  // 앵커 종속성 드래그 핸들러
  const handleAnchorDependencyDrag = useCallback(
    async (result: AnchorDependencyDragResult) => {
      if (!result.taskUpdates) return;

      try {
        await Promise.all(
          result.taskUpdates.map((update) =>
            dataService.updateTask(update.taskId, {
              startDate: update.newStartDate,
              endDate: update.newEndDate,
            })
          )
        );
        // 로컬 상태 업데이트
        setTasks((prev) =>
          prev.map((t) => {
            const update = result.taskUpdates?.find((u) => u.taskId === t.id);
            return update
              ? { ...t, startDate: update.newStartDate, endDate: update.newEndDate }
              : t;
          })
        );
      } catch (err) {
        console.error('Failed to update tasks after dependency drag:', err);
        toast.error('연결 이동 업데이트 실패');
      }
    },
    [dataService]
  );

  // 앵커 종속성 생성 핸들러
  const handleAnchorDependencyCreate = useCallback(
    async (dependency: AnchorDependency) => {
      try {
        const newDep = await dataService.createDependency(dependency);
        setDependencies((prev) => [...prev, newDep]);
      } catch (err) {
        console.error('Failed to create dependency:', err);
        toast.error('종속성 생성 실패');
      }
    },
    [dataService]
  );

  // 앵커 종속성 삭제 핸들러
  const handleAnchorDependencyDelete = useCallback(
    async (depId: string) => {
      try {
        await dataService.deleteDependency(depId);
        setDependencies((prev) => prev.filter((d) => d.id !== depId));
      } catch (err) {
        console.error('Failed to delete dependency:', err);
        toast.error('종속성 삭제 실패');
      }
    },
    [dataService]
  );

  // 마일스톤 업데이트 핸들러
  const handleMilestoneUpdate = useCallback(
    async (milestone: Milestone) => {
      try {
        await dataService.updateMilestone(milestone.id, milestone);
        setMilestones((prev) =>
          prev.map((m) => (m.id === milestone.id ? milestone : m))
        );
      } catch (err) {
        console.error('Failed to update milestone:', err);
        toast.error('마일스톤 업데이트 실패');
      }
    },
    [dataService]
  );

  // 마일스톤 생성 핸들러
  const handleMilestoneCreate = useCallback(
    async (milestone: Partial<Milestone>) => {
      try {
        const newMilestone = await dataService.createMilestone(
          milestone as Omit<Milestone, 'id'>
        );
        setMilestones((prev) => [...prev, newMilestone]);
        toast.success('마일스톤이 생성되었습니다.');
      } catch (err) {
        console.error('Failed to create milestone:', err);
        toast.error('마일스톤 생성 실패');
      }
    },
    [dataService]
  );

  // 마일스톤 삭제 핸들러
  const handleMilestoneDelete = useCallback(
    async (milestoneId: string) => {
      try {
        await dataService.deleteMilestone(milestoneId);
        setMilestones((prev) => prev.filter((m) => m.id !== milestoneId));
        toast.success('마일스톤이 삭제되었습니다.');
      } catch (err) {
        console.error('Failed to delete milestone:', err);
        toast.error('마일스톤 삭제 실패');
      }
    },
    [dataService]
  );

  if (isLoading) {
    return (
      <div className="w-full h-full flex items-center justify-center">
        <div className="flex flex-col items-center gap-4">
          <Loader2 className="w-8 h-8 animate-spin text-blue-500" />
          <span className="text-slate-500">간트차트 로딩 중...</span>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="w-full h-full flex items-center justify-center">
        <div className="flex flex-col items-center gap-4 text-center">
          <div className="w-16 h-16 bg-red-50 dark:bg-red-900/20 rounded-full flex items-center justify-center">
            <span className="text-2xl">⚠️</span>
          </div>
          <h3 className="text-lg font-medium text-slate-900 dark:text-white">
            오류 발생
          </h3>
          <p className="text-sm text-slate-500">{error}</p>
        </div>
      </div>
    );
  }

  return (
    <ThemeProvider defaultTheme="system">
      <div className="w-full h-full">
        <GanttChart
          tasks={tasks}
          milestones={milestones}
          anchorDependencies={dependencies}
          onTaskUpdate={handleTaskUpdate}
          onTaskCreate={handleTaskCreate}
          onTaskDelete={handleTaskDelete}
          onGroupDrag={handleGroupDrag}
          onAnchorDependencyDrag={handleAnchorDependencyDrag}
          onAnchorDependencyCreate={handleAnchorDependencyCreate}
          onAnchorDependencyDelete={handleAnchorDependencyDelete}
          onMilestoneUpdate={handleMilestoneUpdate}
          onMilestoneCreate={handleMilestoneCreate}
          onMilestoneDelete={handleMilestoneDelete}
        />
      </div>
    </ThemeProvider>
  );
}
