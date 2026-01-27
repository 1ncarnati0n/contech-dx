'use client';

import { useEffect, useState, useCallback, useMemo, useRef } from 'react';
import { useRouter } from 'next/navigation';
import {
  GanttChart,
  useHistory,
  generateId,
  type ConstructionTask,
  type Milestone,
  type AnchorDependency,
  type GroupDragResult,
  type AnchorDependencyDragResult,
  type ViewMode,
  type CalendarSettings,
  calculateDualCalendarDates,
  KOREAN_HOLIDAYS_ALL,
  serializeGanttDataForExport,
  parseImportedData,
  exportToExcel,
} from 'sa-gantt-lib';
import 'sa-gantt-lib/style.css';
import { createSupabaseGanttDataService } from '@/lib/services/SupabaseGanttDataService';
import { toast } from 'sonner';
import { Loader2, X, Undo2, Redo2, Sun, Moon } from 'lucide-react';
import { useTheme } from 'next-themes';
import { format } from 'date-fns';

interface FullscreenGanttPageProps {
  projectId: string;
  projectName: string;
}

// 앱 상태 타입 (Undo/Redo 단위)
interface AppState {
  tasks: ConstructionTask[];
  milestones: Milestone[];
  anchorDependencies: AnchorDependency[];
}

// 캘린더 설정
const CALENDAR_SETTINGS: CalendarSettings = {
  workOnSaturdays: true,
  workOnSundays: false,
  workOnHolidays: false,
};

const HOLIDAYS = KOREAN_HOLIDAYS_ALL;

// 커스텀 테마 토글 컴포넌트 (next-themes 기반)
function CustomThemeToggle() {
  const { setTheme, resolvedTheme } = useTheme();
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  if (!mounted) {
    return (
      <button
        className="flex items-center justify-center rounded p-2 transition-colors"
        style={{ backgroundColor: 'var(--gantt-bg-secondary)' }}
      >
        <Sun className="h-4 w-4" style={{ color: 'var(--gantt-text-secondary)' }} />
      </button>
    );
  }

  const isDark = resolvedTheme === 'dark';

  return (
    <button
      onClick={() => setTheme(isDark ? 'light' : 'dark')}
      className="flex items-center justify-center rounded p-2 transition-colors hover:opacity-80"
      style={{ backgroundColor: 'var(--gantt-bg-secondary)' }}
      title={isDark ? '라이트 모드로 전환' : '다크 모드로 전환'}
    >
      {isDark ? (
        <Sun className="h-4 w-4" style={{ color: 'var(--gantt-text-secondary)' }} />
      ) : (
        <Moon className="h-4 w-4" style={{ color: 'var(--gantt-text-secondary)' }} />
      )}
    </button>
  );
}

export function FullscreenGanttPage({ projectId, projectName }: FullscreenGanttPageProps) {
  const router = useRouter();

  // Supabase DataService 생성
  const dataService = useMemo(
    () => createSupabaseGanttDataService(projectId, { debug: true }),
    [projectId]
  );

  // Undo/Redo 히스토리 관리
  const {
    present: appState,
    set: setAppState,
    undo,
    redo,
    canUndo,
    canRedo,
    reset: resetHistory,
    historyLength,
  } = useHistory<AppState>({ tasks: [], milestones: [], anchorDependencies: [] });

  const { tasks, milestones, anchorDependencies } = appState;

  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [loadedFileName, setLoadedFileName] = useState<string | null>(null);
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);
  const [saveStatus, setSaveStatus] = useState<'idle' | 'saving' | 'saved'>('idle');
  const isInitialLoad = useRef(true);

  // 초기 데이터 로드
  useEffect(() => {
    async function loadData() {
      try {
        setIsLoading(true);
        setError(null);
        const data = await dataService.loadAll();
        setAppState({
          tasks: data.tasks,
          milestones: data.milestones,
          anchorDependencies: data.dependencies,
        });
        setTimeout(() => {
          isInitialLoad.current = false;
        }, 100);
      } catch (err) {
        console.error('Failed to load gantt data:', err);
        setError('간트차트 데이터를 불러오는데 실패했습니다.');
        toast.error('데이터 로드 실패');
      } finally {
        setIsLoading(false);
      }
    }
    loadData();
  }, [dataService, setAppState]);

  // 키보드 단축키 (Undo/Redo)
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement;
      if (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA' || target.isContentEditable) {
        return;
      }

      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'z') {
        e.preventDefault();
        if (e.shiftKey) {
          if (canRedo) redo();
        } else {
          if (canUndo) undo();
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [undo, redo, canUndo, canRedo]);

  // 변경사항 감지
  useEffect(() => {
    if (isInitialLoad.current || isLoading) return;
    setHasUnsavedChanges(true);
    setSaveStatus('idle');
  }, [tasks, milestones, anchorDependencies, isLoading]);

  // CP 재계산 헬퍼
  const recalculateCPData = useCallback((taskList: ConstructionTask[]): ConstructionTask[] => {
    const taskMap = new Map<string, ConstructionTask>();
    taskList.forEach(t => taskMap.set(t.id, t));

    const findRootCPId = (taskId: string | null): string | null => {
      if (!taskId) return null;
      const task = taskMap.get(taskId);
      if (!task) return null;
      if (task.type === 'CP') return task.id;
      return findRootCPId(task.parentId);
    };

    const cpMap = new Map<string, {
      work: number;
      nonWork: number;
      minStart: Date;
      maxEnd: Date;
    }>();

    taskList.forEach(t => {
      if (t.wbsLevel === 2 && t.type === 'TASK' && t.task) {
        const rootCPId = findRootCPId(t.parentId);
        if (!rootCPId) return;

        const current = cpMap.get(rootCPId) || {
          work: 0,
          nonWork: 0,
          minStart: new Date(8640000000000000),
          maxEnd: new Date(-8640000000000000),
        };

        current.work += t.task.netWorkDays;
        current.nonWork += t.task.indirectWorkDaysPre + t.task.indirectWorkDaysPost;
        if (t.startDate < current.minStart) current.minStart = t.startDate;
        if (t.endDate > current.maxEnd) current.maxEnd = t.endDate;

        cpMap.set(rootCPId, current);
      }
    });

    return taskList.map(t => {
      if (t.wbsLevel === 1 && cpMap.has(t.id)) {
        const agg = cpMap.get(t.id)!;
        return {
          ...t,
          startDate: agg.minStart,
          endDate: agg.maxEnd,
          cp: {
            workDaysTotal: agg.work,
            nonWorkDaysTotal: agg.nonWork,
          },
        };
      }
      return t;
    });
  }, []);

  // 저장 핸들러
  const handleSave = useCallback(async () => {
    if (!hasUnsavedChanges) return;

    // 안전 장치: 데이터가 비어있으면 저장하지 않음
    if (tasks.length === 0) {
      console.warn('[handleSave] Tasks array is empty. Skipping save to prevent data loss.');
      toast.error('저장할 데이터가 없습니다. 데이터 로드 상태를 확인하세요.');
      return;
    }

    setSaveStatus('saving');

    try {
      console.log('[handleSave] Saving data:', {
        tasks: tasks.length,
        milestones: milestones.length,
        dependencies: anchorDependencies.length,
      });

      await dataService.saveAll({
        tasks,
        milestones,
        dependencies: anchorDependencies,
      });

      setTimeout(() => {
        setHasUnsavedChanges(false);
        setSaveStatus('saved');
        setTimeout(() => setSaveStatus('idle'), 3000);
      }, 300);
    } catch (error) {
      console.error('Failed to save data:', error);
      setSaveStatus('idle');
      toast.error('저장 중 오류가 발생했습니다.');
    }
  }, [tasks, milestones, anchorDependencies, hasUnsavedChanges, dataService]);

  // 초기화 핸들러
  const handleReset = useCallback(async () => {
    if (!confirm('모든 변경사항을 취소하고 서버 데이터로 되돌리시겠습니까?')) return;

    try {
      const data = await dataService.loadAll();
      resetHistory({
        tasks: data.tasks,
        milestones: data.milestones,
        anchorDependencies: data.dependencies,
      });
      setHasUnsavedChanges(false);
      setSaveStatus('idle');
      toast.success('데이터가 초기화되었습니다.');
    } catch (error) {
      console.error('Failed to reset data:', error);
      toast.error('초기화 중 오류가 발생했습니다.');
    }
  }, [dataService, resetHistory]);

  // 내보내기 핸들러
  const handleExport = useCallback(async () => {
    try {
      const jsonString = serializeGanttDataForExport({
        tasks,
        milestones,
        dependencies: anchorDependencies,
      });

      const defaultFileName = `${projectName}-gantt-${format(new Date(), 'yyyy-MM-dd')}.json`;

      const blob = new Blob([jsonString], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = defaultFileName;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);

      toast.success('내보내기 완료');
    } catch (error) {
      console.error('Failed to export data:', error);
      toast.error('내보내기 중 오류가 발생했습니다.');
    }
  }, [tasks, milestones, anchorDependencies, projectName]);

  // Excel 내보내기 핸들러
  const handleExportExcel = useCallback(async () => {
    try {
      await exportToExcel({
        tasks,
        milestones,
        fileName: loadedFileName || projectName,
      });
      toast.success('Excel 내보내기 완료');
    } catch (error) {
      console.error('Failed to export Excel:', error);
      toast.error('Excel 내보내기 중 오류가 발생했습니다.');
    }
  }, [tasks, milestones, loadedFileName, projectName]);

  // 가져오기 핸들러
  const handleImport = useCallback(async (file: File) => {
    try {
      const text = await file.text();
      const importedData = parseImportedData(text);
      if (!importedData) {
        throw new Error('유효하지 않은 파일 형식입니다.');
      }

      const { tasks: importedTasks, milestones: importedMilestones, dependencies: importedDependencies } = importedData;

      if (importedTasks.length === 0) {
        throw new Error('가져올 수 있는 태스크가 없습니다.');
      }

      setAppState({
        tasks: importedTasks,
        milestones: importedMilestones,
        anchorDependencies: importedDependencies,
      });

      setLoadedFileName(file.name);
      setHasUnsavedChanges(true);
      toast.success(`가져오기 완료: ${importedTasks.length}개 태스크`);
    } catch (error) {
      console.error('Failed to import data:', error);
      toast.error(error instanceof Error ? error.message : '가져오기 오류');
    }
  }, [setAppState]);

  // 태스크 업데이트 핸들러
  const handleTaskUpdate = useCallback(async (updatedTask: ConstructionTask) => {
    try {
      setAppState(prev => {
        let newTasks = prev.tasks.map(t =>
          t.id === updatedTask.id ? updatedTask : t
        );

        newTasks = newTasks.map(t => {
          if (t.wbsLevel === 2 && t.task) {
            const dates = calculateDualCalendarDates(t, HOLIDAYS, CALENDAR_SETTINGS);
            return { ...t, startDate: dates.startDate, endDate: dates.endDate };
          }
          return t;
        });

        newTasks = recalculateCPData(newTasks);
        return { ...prev, tasks: newTasks };
      });

      // Supabase 업데이트
      await dataService.updateTask(updatedTask.id, updatedTask);
    } catch (error) {
      const errMsg = error instanceof Error ? error.message : String(error);
      console.log('[handleTaskUpdate] ❌ Error:', errMsg);
      console.log('[handleTaskUpdate] Full error:', error);
      toast.error(`태스크 업데이트 실패: ${errMsg}`);
    }
  }, [setAppState, recalculateCPData, dataService]);

  // 태스크 생성 핸들러
  const handleTaskCreate = useCallback(async (newTask: Partial<ConstructionTask> & { sortOrder?: number }) => {
    try {
      const taskToAdd: ConstructionTask = {
        id: newTask.id || generateId(),
        parentId: newTask.parentId ?? null,
        wbsLevel: newTask.wbsLevel || 2,
        type: newTask.type || 'TASK',
        name: newTask.name || '새 공정',
        startDate: newTask.startDate || new Date(),
        endDate: newTask.endDate || new Date(),
        cp: newTask.cp,
        task: newTask.task,
        dependencies: newTask.dependencies || [],
      };

      // sortOrder가 전달되면 사용, 없으면 현재 tasks 배열 길이 사용 (맨 뒤에 추가)
      const sortOrder = newTask.sortOrder ?? tasks.length;
      // DataService 인터페이스는 sortOrder를 정의하지 않으므로 타입 단언 사용
      const createdTask = await (dataService as { createTask: (task: ConstructionTask & { sortOrder?: number }) => Promise<ConstructionTask> }).createTask({ ...taskToAdd, sortOrder });

      setAppState(prev => {
        let newTasks = [...prev.tasks, { ...taskToAdd, id: createdTask.id }];

        newTasks = newTasks.map(t => {
          if (t.wbsLevel === 2 && t.task) {
            const dates = calculateDualCalendarDates(t, HOLIDAYS, CALENDAR_SETTINGS);
            return { ...t, startDate: dates.startDate, endDate: dates.endDate };
          }
          return t;
        });

        newTasks = recalculateCPData(newTasks);
        return { ...prev, tasks: newTasks };
      });

      toast.success('태스크가 생성되었습니다.');
    } catch (error) {
      // 에러 정보를 문자열로 추출
      const errMsg = error instanceof Error ? error.message : String(error);
      const errName = error instanceof Error ? error.name : 'Unknown';
      console.log('[handleTaskCreate] ❌ Error:', errName, '-', errMsg);
      console.log('[handleTaskCreate] Full error:', error);
      toast.error(`태스크 생성 실패: ${errMsg}`);
    }
  }, [setAppState, recalculateCPData, dataService]);

  // 태스크 순서 변경 핸들러
  const handleTaskReorder = useCallback(async (taskId: string, newIndex: number) => {
    try {
      setAppState(prev => {
        const taskIndex = prev.tasks.findIndex(t => t.id === taskId);
        if (taskIndex === -1) return prev;

        const task = prev.tasks[taskIndex];
        const newTasks = [...prev.tasks];

        // 기존 위치에서 제거
        newTasks.splice(taskIndex, 1);

        // 새 위치에 삽입 (인덱스 조정)
        const adjustedIndex = taskIndex < newIndex ? newIndex - 1 : newIndex;
        newTasks.splice(adjustedIndex, 0, task);

        return { ...prev, tasks: newTasks };
      });

      // TODO: Supabase에 순서 정보 저장 (order 컬럼 필요 시)
    } catch (error) {
      console.error('Failed to reorder task:', error);
      toast.error('순서 변경 실패');
    }
  }, [setAppState]);

  // 태스크 이동 핸들러 (그룹 간 이동 지원)
  const handleTaskMove = useCallback(async (
    taskId: string,
    targetId: string,
    position: 'before' | 'after' | 'into'
  ) => {
    try {
      setAppState(prev => {
        const taskIndex = prev.tasks.findIndex(t => t.id === taskId);
        const targetIndex = prev.tasks.findIndex(t => t.id === targetId);
        if (taskIndex === -1 || targetIndex === -1) return prev;

        const task = prev.tasks[taskIndex];
        const targetTask = prev.tasks[targetIndex];
        const newTasks = [...prev.tasks];

        // 기존 위치에서 제거
        newTasks.splice(taskIndex, 1);

        // 새 위치 계산 (제거 후 인덱스 조정)
        const adjustedTargetIndex = taskIndex < targetIndex ? targetIndex - 1 : targetIndex;

        let updatedTask: ConstructionTask;

        if (position === 'into') {
          // 그룹 안에 넣기: parentId 변경
          updatedTask = { ...task, parentId: targetId };
          // 타겟 그룹 바로 뒤에 삽입
          newTasks.splice(adjustedTargetIndex + 1, 0, updatedTask);
        } else if (position === 'before') {
          // 타겟 앞에 삽입, 같은 부모로 설정
          updatedTask = { ...task, parentId: targetTask.parentId };
          newTasks.splice(adjustedTargetIndex, 0, updatedTask);
        } else {
          // 타겟 뒤에 삽입, 같은 부모로 설정
          updatedTask = { ...task, parentId: targetTask.parentId };
          newTasks.splice(adjustedTargetIndex + 1, 0, updatedTask);
        }

        return { ...prev, tasks: newTasks };
      });

      // Supabase에 parentId 업데이트
      const targetTask = tasks.find(t => t.id === targetId);
      const newParentId = position === 'into' ? targetId : (targetTask?.parentId ?? null);
      await dataService.updateTask(taskId, { parentId: newParentId });
    } catch (error) {
      console.error('Failed to move task:', error);
      toast.error('태스크 이동 실패');
    }
  }, [setAppState, tasks, dataService]);

  // 태스크 삭제 핸들러
  const handleTaskDelete = useCallback(async (taskId: string) => {
    try {
      await dataService.deleteTask(taskId);

      setAppState(prev => {
        const collectChildIds = (parentId: string): string[] => {
          const children = prev.tasks.filter(t => t.parentId === parentId);
          const childIds = children.map(c => c.id);
          const grandChildIds = children.flatMap(c => collectChildIds(c.id));
          return [...childIds, ...grandChildIds];
        };

        const allIdsToDelete = [taskId, ...collectChildIds(taskId)];
        let newTasks = prev.tasks.filter(t => !allIdsToDelete.includes(t.id));
        const newDependencies = prev.anchorDependencies.filter(dep =>
          !allIdsToDelete.includes(dep.sourceTaskId) &&
          !allIdsToDelete.includes(dep.targetTaskId)
        );

        newTasks = recalculateCPData(newTasks);
        return { ...prev, tasks: newTasks, anchorDependencies: newDependencies };
      });

      toast.success('태스크가 삭제되었습니다.');
    } catch (error) {
      console.error('Failed to delete task:', error);
      toast.error('태스크 삭제 실패');
    }
  }, [setAppState, recalculateCPData, dataService]);

  // 태스크 그룹화 핸들러 (선택된 태스크들을 새 GROUP으로 묶기)
  const handleTaskGroup = useCallback(async (taskIds: string[]) => {
    try {
      // 현재 상태에서 선택된 태스크들 찾기
      const selectedTasks = tasks.filter(t => taskIds.includes(t.id));
      if (selectedTasks.length < 1) {
        toast.error('그룹화할 태스크를 선택하세요.');
        return;
      }

      // 선택된 태스크들이 같은 부모를 가지는지 확인
      const parentIds = new Set(selectedTasks.map(t => t.parentId));
      const commonParentId = parentIds.size === 1 ? Array.from(parentIds)[0] : null;

      // 날짜 범위 계산
      const minStart = selectedTasks.reduce((min, t) => t.startDate < min ? t.startDate : min, selectedTasks[0].startDate);
      const maxEnd = selectedTasks.reduce((max, t) => t.endDate > max ? t.endDate : max, selectedTasks[0].endDate);

      // 새 GROUP 생성 (UUID는 DB에서 생성)
      const newGroup: Partial<ConstructionTask> = {
        parentId: commonParentId,
        wbsLevel: selectedTasks[0].wbsLevel,
        type: 'GROUP',
        name: '새 그룹',
        startDate: minStart,
        endDate: maxEnd,
        dependencies: [],
      };

      // DB에 그룹 생성
      const createdGroup = await dataService.createTask(newGroup as ConstructionTask);
      const newGroupId = createdGroup.id;

      console.log('[handleTaskGroup] Created group with ID:', newGroupId);

      // 선택된 태스크들의 parentId를 새 그룹으로 업데이트 (DB)
      await Promise.all(
        taskIds.map(taskId =>
          dataService.updateTask(taskId, { parentId: newGroupId })
        )
      );

      // 로컬 상태 업데이트
      setAppState(prev => {
        // 선택된 태스크들의 parentId를 새 그룹으로 변경
        let newTasks = prev.tasks.map(t => {
          if (taskIds.includes(t.id)) {
            return { ...t, parentId: newGroupId };
          }
          return t;
        });

        // 첫 번째 선택된 태스크 위치에 GROUP 삽입
        const firstSelectedIndex = newTasks.findIndex(t => taskIds.includes(t.id));
        const groupTask: ConstructionTask = {
          ...newGroup as ConstructionTask,
          id: newGroupId,
        };
        newTasks.splice(firstSelectedIndex, 0, groupTask);

        return { ...prev, tasks: newTasks };
      });

      toast.success('그룹이 생성되었습니다.');
    } catch (error) {
      console.error('Failed to group tasks:', error);
      toast.error('그룹화 실패');
    }
  }, [tasks, dataService, setAppState]);

  // 그룹 해제 핸들러 (GROUP을 해체하고 자식들을 상위로 이동)
  const handleTaskUngroup = useCallback(async (groupId: string) => {
    try {
      const group = tasks.find(t => t.id === groupId);
      if (!group || group.type !== 'GROUP') {
        toast.error('유효한 그룹이 아닙니다.');
        return;
      }

      // 그룹의 자식들 찾기
      const children = tasks.filter(t => t.parentId === groupId);

      console.log('[handleTaskUngroup] Ungrouping:', {
        groupId,
        groupParentId: group.parentId,
        childrenCount: children.length,
      });

      // 자식들의 parentId를 그룹의 parentId로 업데이트 (DB)
      if (children.length > 0) {
        await Promise.all(
          children.map(child =>
            dataService.updateTask(child.id, { parentId: group.parentId })
          )
        );
      }

      // 그룹 삭제 (DB)
      await dataService.deleteTask(groupId);

      // 로컬 상태 업데이트
      setAppState(prev => {
        // 자식들의 parentId를 그룹의 parentId로 변경
        let newTasks = prev.tasks.map(t => {
          if (t.parentId === groupId) {
            return { ...t, parentId: group.parentId };
          }
          return t;
        });

        // 그룹 삭제
        newTasks = newTasks.filter(t => t.id !== groupId);

        return { ...prev, tasks: newTasks };
      });

      toast.success('그룹이 해제되었습니다.');
    } catch (error) {
      console.error('Failed to ungroup tasks:', error);
      toast.error('그룹 해제 실패');
    }
  }, [tasks, dataService, setAppState]);

  // 그룹 드래그 핸들러
  const handleGroupDrag = useCallback(async (result: GroupDragResult) => {
    if (!result.taskUpdates) return;

    try {
      await Promise.all(
        result.taskUpdates.map((update) =>
          dataService.updateTask(update.taskId, {
            startDate: update.newStartDate,
          })
        )
      );

      setAppState(prev => ({
        ...prev,
        tasks: prev.tasks.map(t => {
          const update = result.taskUpdates?.find(u => u.taskId === t.id);
          return update ? { ...t, startDate: update.newStartDate } : t;
        }),
      }));
    } catch (error) {
      console.error('Failed to update tasks after group drag:', error);
      toast.error('그룹 업데이트 실패');
    }
  }, [dataService, setAppState]);

  // 앵커 종속성 드래그 핸들러
  const handleAnchorDependencyDrag = useCallback(async (result: AnchorDependencyDragResult) => {
    const { taskUpdates } = result;
    if (!taskUpdates || taskUpdates.length === 0) return;

    try {
      await Promise.all(
        taskUpdates.map((update) =>
          dataService.updateTask(update.taskId, {
            startDate: update.newStartDate,
            endDate: update.newEndDate,
          })
        )
      );

      setAppState(prev => ({
        ...prev,
        tasks: prev.tasks.map(task => {
          const update = taskUpdates.find(u => u.taskId === task.id);
          if (update) {
            return {
              ...task,
              startDate: update.newStartDate,
              endDate: update.newEndDate,
            };
          }
          return task;
        }),
      }));
    } catch (error) {
      console.error('Failed to apply dependency drag:', error);
      toast.error('종속성 드래그 실패');
    }
  }, [dataService, setAppState]);

  // 앵커 종속성 생성 핸들러
  const handleAnchorDependencyCreate = useCallback(async (dep: AnchorDependency) => {
    try {
      const newDep = await dataService.createDependency(dep);
      setAppState(prev => ({
        ...prev,
        anchorDependencies: [...prev.anchorDependencies, newDep],
      }));
    } catch (error) {
      console.error('Failed to create dependency:', error);
      toast.error('종속성 생성 실패');
    }
  }, [dataService, setAppState]);

  // 앵커 종속성 삭제 핸들러
  const handleAnchorDependencyDelete = useCallback(async (depId: string) => {
    try {
      await dataService.deleteDependency(depId);
      setAppState(prev => ({
        ...prev,
        anchorDependencies: prev.anchorDependencies.filter(d => d.id !== depId),
      }));
    } catch (error) {
      console.error('Failed to delete dependency:', error);
      toast.error('종속성 삭제 실패');
    }
  }, [dataService, setAppState]);

  // 마일스톤 핸들러
  const handleMilestoneCreate = useCallback(async (milestone: Partial<Milestone>) => {
    try {
      const newMilestone = await dataService.createMilestone(
        milestone as Omit<Milestone, 'id'>
      );
      setAppState(prev => ({
        ...prev,
        milestones: [...prev.milestones, newMilestone],
      }));
      toast.success('마일스톤이 생성되었습니다.');
    } catch (error) {
      console.error('Failed to create milestone:', error);
      toast.error('마일스톤 생성 실패');
    }
  }, [dataService, setAppState]);

  const handleMilestoneUpdate = useCallback(async (milestone: Milestone) => {
    try {
      await dataService.updateMilestone(milestone.id, milestone);
      setAppState(prev => ({
        ...prev,
        milestones: prev.milestones.map(m => m.id === milestone.id ? milestone : m),
      }));
    } catch (error) {
      console.error('Failed to update milestone:', error);
      toast.error('마일스톤 업데이트 실패');
    }
  }, [dataService, setAppState]);

  const handleMilestoneDelete = useCallback(async (milestoneId: string) => {
    try {
      await dataService.deleteMilestone(milestoneId);
      setAppState(prev => ({
        ...prev,
        milestones: prev.milestones.filter(m => m.id !== milestoneId),
      }));
      toast.success('마일스톤이 삭제되었습니다.');
    } catch (error) {
      console.error('Failed to delete milestone:', error);
      toast.error('마일스톤 삭제 실패');
    }
  }, [dataService, setAppState]);

  // 뷰 전환 핸들러
  const handleViewChange = useCallback((view: ViewMode, activeCPId?: string) => {
    console.log('View changed:', view, activeCPId);
  }, []);

  // 창 닫기 핸들러
  const handleClose = useCallback(() => {
    if (hasUnsavedChanges) {
      if (!confirm('저장하지 않은 변경사항이 있습니다. 정말 닫으시겠습니까?')) {
        return;
      }
    }
    window.close();
    // window.close()가 작동하지 않으면 (새 탭에서 열린 경우) 뒤로가기
    router.back();
  }, [hasUnsavedChanges, router]);

  if (isLoading) {
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-white dark:bg-zinc-900">
        <div className="flex flex-col items-center gap-4">
          <Loader2 className="w-8 h-8 animate-spin text-blue-500" />
          <span className="text-slate-500 dark:text-slate-400">간트차트 로딩 중...</span>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-white dark:bg-zinc-900">
        <div className="flex flex-col items-center gap-4 text-center">
          <div className="w-16 h-16 bg-red-50 dark:bg-red-900/20 rounded-full flex items-center justify-center">
            <span className="text-2xl">⚠️</span>
          </div>
          <h3 className="text-lg font-medium text-slate-900 dark:text-white">
            오류 발생
          </h3>
          <p className="text-sm text-slate-500">{error}</p>
          <button
            onClick={handleClose}
            className="px-4 py-2 bg-slate-900 text-white rounded-md hover:bg-slate-800"
          >
            닫기
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 z-50 flex flex-col overflow-hidden sa-gantt-root"
         style={{ backgroundColor: 'var(--gantt-bg-secondary)' }}>
      {/* 상단 헤더 바 - sa-gantt-lib 데모 앱 스타일 */}
      <div
        className="flex h-12 shrink-0 items-center justify-between px-4 shadow-sm"
        style={{
          backgroundColor: 'var(--gantt-bg-primary)',
          borderBottom: '1px solid var(--gantt-border)'
        }}
      >
        <div className="flex items-center gap-3">
          <h1
            className="flex items-center gap-2 text-lg font-extrabold"
            style={{ color: 'var(--gantt-text-primary)' }}
          >
            <span>
              <span style={{ color: 'var(--gantt-teal)' }}>건설</span>{' '}
              <span style={{ color: 'var(--gantt-vermilion)' }}>표준공정표</span>
            </span>
            <span className="text-sm font-normal" style={{ color: 'var(--gantt-text-secondary)' }}>
              - {projectName}
            </span>
          </h1>

          {/* Undo/Redo 버튼 */}
          <div
            className="flex items-center gap-1 pl-3"
            style={{ borderLeft: '1px solid var(--gantt-border)' }}
          >
            <button
              onClick={undo}
              disabled={!canUndo}
              className="flex items-center gap-1 rounded px-2 py-1 text-xs font-medium transition-colors"
              style={{
                backgroundColor: canUndo ? 'var(--gantt-bg-secondary)' : 'var(--gantt-bg-tertiary)',
                color: canUndo ? 'var(--gantt-text-primary)' : 'var(--gantt-text-muted)',
                cursor: canUndo ? 'pointer' : 'not-allowed',
              }}
              title="실행 취소 (Ctrl+Z / Cmd+Z)"
            >
              <Undo2 className="h-3.5 w-3.5" />
              <span className="hidden sm:inline">실행취소</span>
              {historyLength.past > 0 && (
                <span className="ml-0.5 text-[10px]" style={{ color: 'var(--gantt-text-muted)' }}>
                  ({historyLength.past})
                </span>
              )}
            </button>
            <button
              onClick={redo}
              disabled={!canRedo}
              className="flex items-center gap-1 rounded px-2 py-1 text-xs font-medium transition-colors"
              style={{
                backgroundColor: canRedo ? 'var(--gantt-bg-secondary)' : 'var(--gantt-bg-tertiary)',
                color: canRedo ? 'var(--gantt-text-primary)' : 'var(--gantt-text-muted)',
                cursor: canRedo ? 'pointer' : 'not-allowed',
              }}
              title="다시 실행 (Ctrl+Shift+Z / Cmd+Shift+Z)"
            >
              <Redo2 className="h-3.5 w-3.5" />
              <span className="hidden sm:inline">다시실행</span>
              {historyLength.future > 0 && (
                <span className="ml-0.5 text-[10px]" style={{ color: 'var(--gantt-text-muted)' }}>
                  ({historyLength.future})
                </span>
              )}
            </button>
          </div>

          {/* 변경사항 표시 */}
          {hasUnsavedChanges && (
            <span className="flex items-center gap-1 rounded-full bg-amber-100 px-2 py-0.5 text-xs font-medium text-amber-700 dark:bg-amber-900/30 dark:text-amber-400">
              <span className="h-1.5 w-1.5 rounded-full bg-amber-500" />
              변경사항 있음
            </span>
          )}

          {/* 저장 완료 표시 */}
          {saveStatus === 'saved' && !hasUnsavedChanges && (
            <span className="flex items-center gap-1 rounded-full bg-green-100 px-2 py-0.5 text-xs font-medium text-green-700 dark:bg-green-900/30 dark:text-green-400">
              <span className="h-1.5 w-1.5 rounded-full bg-green-500" />
              저장됨
            </span>
          )}
        </div>

        <div className="flex items-center gap-2">
          {/* 테마 토글 버튼 */}
          <CustomThemeToggle />

          {/* 닫기 버튼 */}
          <button
            onClick={handleClose}
            className="flex items-center gap-1 rounded px-3 py-1.5 text-sm font-medium transition-colors hover:bg-red-50 dark:hover:bg-red-900/20"
            style={{ color: 'var(--gantt-text-secondary)' }}
            title="닫기"
          >
            <X className="h-4 w-4" />
            <span className="hidden sm:inline">닫기</span>
          </button>
        </div>
      </div>

      {/* 간트 차트 영역 */}
      <div className="flex-1 overflow-hidden">
        <GanttChart
          tasks={tasks}
          milestones={milestones}
          calendarSettings={CALENDAR_SETTINGS}
          onTaskUpdate={handleTaskUpdate}
          onTaskCreate={handleTaskCreate}
          onTaskDelete={handleTaskDelete}
          onTaskReorder={handleTaskReorder}
          onTaskMove={handleTaskMove}
          onTaskGroup={handleTaskGroup}
          onTaskUngroup={handleTaskUngroup}
          onViewChange={handleViewChange}
          onGroupDrag={handleGroupDrag}
          onMilestoneCreate={handleMilestoneCreate}
          onMilestoneUpdate={handleMilestoneUpdate}
          onMilestoneDelete={handleMilestoneDelete}
          anchorDependencies={anchorDependencies}
          onAnchorDependencyCreate={handleAnchorDependencyCreate}
          onAnchorDependencyDelete={handleAnchorDependencyDelete}
          onAnchorDependencyDrag={handleAnchorDependencyDrag}
          onSave={handleSave}
          onReset={handleReset}
          hasUnsavedChanges={hasUnsavedChanges}
          saveStatus={saveStatus}
          onExport={handleExport}
          onExportExcel={handleExportExcel}
          onImport={handleImport}
          loadedFileName={loadedFileName}
        />
      </div>
    </div>
  );
}
