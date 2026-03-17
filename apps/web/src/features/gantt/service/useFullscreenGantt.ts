'use client';

import { useEffect, useState, useCallback, useMemo, useRef } from 'react';
import { useRouter } from 'next/navigation';
import {
  useHistory,
  generateId,
  calculateDualCalendarDates,
  KOREAN_HOLIDAYS_ALL,
  serializeGanttDataForExport,
  parseImportedData,
  exportToExcel,
  type ConstructionTask,
  type Milestone,
  type GroupDependency,
  type GroupDragResult,
  type ViewMode,
  type CalendarSettings,
} from 'sa-gantt-lib';
import { createSupabaseGanttDataService } from '@/features/gantt/service/gantt-data.service';
import { recalculateCPData } from '@/features/gantt/service/gantt-cp-calculator';
import { toast } from 'sonner';
import { format } from 'date-fns';
import { logger } from '@/shared/utils/logger';

// 앱 상태 타입 (Undo/Redo 단위)
interface AppState {
  tasks: ConstructionTask[];
  milestones: Milestone[];
  groupDependencies: GroupDependency[];
}

const CALENDAR_SETTINGS: CalendarSettings = {
  workOnSaturdays: true,
  workOnSundays: false,
  workOnHolidays: false,
};

const HOLIDAYS = KOREAN_HOLIDAYS_ALL;

export function useFullscreenGantt(projectId: string, projectName: string) {
  const router = useRouter();

  const dataService = useMemo(
    () => createSupabaseGanttDataService(projectId),
    [projectId]
  );

  const {
    present: appState,
    set: setAppState,
    undo,
    redo,
    canUndo,
    canRedo,
    reset: resetHistory,
    historyLength,
  } = useHistory<AppState>({ tasks: [], milestones: [], groupDependencies: [] });

  const { tasks, milestones, groupDependencies } = appState;

  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [loadedFileName, setLoadedFileName] = useState<string | null>(null);
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);
  const [saveStatus, setSaveStatus] = useState<'idle' | 'saving' | 'saved'>('idle');
  const isInitialLoad = useRef(true);

  // ── 초기 데이터 로드 ──
  useEffect(() => {
    async function loadData() {
      try {
        setIsLoading(true);
        setError(null);
        const data = await dataService.loadAll();
        setAppState({
          tasks: data.tasks,
          milestones: data.milestones,
          groupDependencies: data.dependencies,
        });
        setTimeout(() => { isInitialLoad.current = false; }, 100);
      } catch (err) {
        logger.error('Failed to load gantt data:', err);
        setError('간트차트 데이터를 불러오는데 실패했습니다.');
        toast.error('데이터 로드 실패');
      } finally {
        setIsLoading(false);
      }
    }
    loadData();
  }, [dataService, setAppState]);

  // ── 키보드 단축키 (Undo/Redo) ──
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement;
      if (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA' || target.isContentEditable) return;

      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'z') {
        e.preventDefault();
        if (e.shiftKey) { if (canRedo) redo(); }
        else { if (canUndo) undo(); }
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [undo, redo, canUndo, canRedo]);

  // ── 변경사항 감지 ──
  useEffect(() => {
    if (isInitialLoad.current || isLoading) return;
    setHasUnsavedChanges(true);
    setSaveStatus('idle');
  }, [tasks, milestones, groupDependencies, isLoading]);

  // ── 날짜 재계산 헬퍼 ──
  const recalcDates = useCallback((taskList: ConstructionTask[]): ConstructionTask[] => {
    const withDates = taskList.map(t => {
      if (t.wbsLevel === 2 && t.task) {
        const dates = calculateDualCalendarDates(t, HOLIDAYS, CALENDAR_SETTINGS);
        return { ...t, startDate: dates.startDate, endDate: dates.endDate };
      }
      return t;
    });
    return recalculateCPData(withDates);
  }, []);

  // ── 저장 ──
  const handleSave = useCallback(async () => {
    if (!hasUnsavedChanges) return;
    if (tasks.length === 0) {
      logger.warn('[handleSave] Tasks array is empty. Skipping save to prevent data loss.');
      toast.error('저장할 데이터가 없습니다. 데이터 로드 상태를 확인하세요.');
      return;
    }

    setSaveStatus('saving');
    try {
      await dataService.saveAll({ tasks, milestones, dependencies: groupDependencies });
      setTimeout(() => {
        setHasUnsavedChanges(false);
        setSaveStatus('saved');
        setTimeout(() => setSaveStatus('idle'), 3000);
      }, 300);
    } catch (err) {
      logger.error('Failed to save data:', err);
      setSaveStatus('idle');
      toast.error('저장 중 오류가 발생했습니다.');
    }
  }, [tasks, milestones, groupDependencies, hasUnsavedChanges, dataService]);

  // ── 초기화 ──
  const handleReset = useCallback(async () => {
    if (!confirm('모든 변경사항을 취소하고 서버 데이터로 되돌리시겠습니까?')) return;
    try {
      const data = await dataService.loadAll();
      resetHistory({ tasks: data.tasks, milestones: data.milestones, groupDependencies: data.dependencies });
      setHasUnsavedChanges(false);
      setSaveStatus('idle');
      toast.success('데이터가 초기화되었습니다.');
    } catch (err) {
      logger.error('Failed to reset data:', err);
      toast.error('초기화 중 오류가 발생했습니다.');
    }
  }, [dataService, resetHistory]);

  // ── JSON 내보내기 ──
  const handleExport = useCallback(async () => {
    try {
      const jsonString = serializeGanttDataForExport({ tasks, milestones, dependencies: groupDependencies });
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
    } catch (err) {
      logger.error('Failed to export data:', err);
      toast.error('내보내기 중 오류가 발생했습니다.');
    }
  }, [tasks, milestones, groupDependencies, projectName]);

  // ── Excel 내보내기 ──
  const handleExportExcel = useCallback(async () => {
    try {
      await exportToExcel({ tasks, milestones, fileName: loadedFileName || projectName });
      toast.success('Excel 내보내기 완료');
    } catch (err) {
      logger.error('Failed to export Excel:', err);
      toast.error('Excel 내보내기 중 오류가 발생했습니다.');
    }
  }, [tasks, milestones, loadedFileName, projectName]);

  // ── JSON 가져오기 ──
  const handleImport = useCallback(async (file: File) => {
    try {
      const text = await file.text();
      const importedData = parseImportedData(text);
      if (!importedData) throw new Error('유효하지 않은 파일 형식입니다.');

      const { tasks: importedTasks, milestones: importedMilestones, dependencies: importedDependencies } = importedData;
      if (importedTasks.length === 0) throw new Error('가져올 수 있는 태스크가 없습니다.');

      setAppState({ tasks: importedTasks, milestones: importedMilestones, groupDependencies: importedDependencies });
      setLoadedFileName(file.name);
      setHasUnsavedChanges(true);
      toast.success(`가져오기 완료: ${importedTasks.length}개 태스크`);
    } catch (err) {
      logger.error('Failed to import data:', err);
      toast.error(err instanceof Error ? err.message : '가져오기 오류');
    }
  }, [setAppState]);

  // ── 태스크 업데이트 ──
  const handleTaskUpdate = useCallback(async (updatedTask: ConstructionTask) => {
    try {
      setAppState(prev => {
        const newTasks = prev.tasks.map(t => t.id === updatedTask.id ? updatedTask : t);
        return { ...prev, tasks: recalcDates(newTasks) };
      });
      await dataService.updateTask(updatedTask.id, updatedTask);
    } catch (err) {
      const errMsg = err instanceof Error ? err.message : String(err);
      logger.error('[handleTaskUpdate] Error:', errMsg);
      toast.error(`태스크 업데이트 실패: ${errMsg}`);
    }
  }, [setAppState, recalcDates, dataService]);

  // ── 태스크 생성 ──
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

      const sortOrder = newTask.sortOrder ?? tasks.length;
      const createdTask = await (dataService as { createTask: (task: ConstructionTask & { sortOrder?: number }) => Promise<ConstructionTask> }).createTask({ ...taskToAdd, sortOrder });

      setAppState(prev => {
        const insertIndex = Math.max(0, Math.min(sortOrder, prev.tasks.length));
        const newTasks = [...prev.tasks];
        newTasks.splice(insertIndex, 0, { ...taskToAdd, id: createdTask.id });
        return { ...prev, tasks: recalcDates(newTasks) };
      });
      toast.success('태스크가 생성되었습니다.');
    } catch (err) {
      const errMsg = err instanceof Error ? err.message : String(err);
      logger.error('[handleTaskCreate] Error:', errMsg);
      toast.error(`태스크 생성 실패: ${errMsg}`);
    }
  }, [setAppState, recalcDates, dataService, tasks.length]);

  // ── 태스크 순서 변경 ──
  const handleTaskReorder = useCallback(async (taskId: string, newIndex: number) => {
    try {
      let reorderedTasks: ConstructionTask[] | null = null;
      setAppState(prev => {
        const taskIndex = prev.tasks.findIndex(t => t.id === taskId);
        if (taskIndex === -1) return prev;
        const task = prev.tasks[taskIndex];
        const newTasks = [...prev.tasks];
        newTasks.splice(taskIndex, 1);
        const adjustedIndex = taskIndex < newIndex ? newIndex - 1 : newIndex;
        newTasks.splice(adjustedIndex, 0, task);
        reorderedTasks = newTasks;
        return { ...prev, tasks: newTasks };
      });
      if (reorderedTasks) await dataService.saveTasks(reorderedTasks);
    } catch (err) {
      logger.error('Failed to reorder task:', err);
      toast.error('순서 변경 실패');
    }
  }, [setAppState, dataService]);

  // ── 태스크 이동 (그룹 간) ──
  const handleTaskMove = useCallback(async (
    taskId: string, targetId: string, position: 'before' | 'after' | 'into'
  ) => {
    try {
      setAppState(prev => {
        const taskIndex = prev.tasks.findIndex(t => t.id === taskId);
        const targetIndex = prev.tasks.findIndex(t => t.id === targetId);
        if (taskIndex === -1 || targetIndex === -1) return prev;

        const task = prev.tasks[taskIndex];
        const targetTask = prev.tasks[targetIndex];
        const newTasks = [...prev.tasks];
        newTasks.splice(taskIndex, 1);
        const adj = taskIndex < targetIndex ? targetIndex - 1 : targetIndex;

        let updatedTask: ConstructionTask;
        if (position === 'into') {
          updatedTask = { ...task, parentId: targetId };
          newTasks.splice(adj + 1, 0, updatedTask);
        } else if (position === 'before') {
          updatedTask = { ...task, parentId: targetTask.parentId };
          newTasks.splice(adj, 0, updatedTask);
        } else {
          updatedTask = { ...task, parentId: targetTask.parentId };
          newTasks.splice(adj + 1, 0, updatedTask);
        }
        return { ...prev, tasks: newTasks };
      });

      const targetTask = tasks.find(t => t.id === targetId);
      const newParentId = position === 'into' ? targetId : (targetTask?.parentId ?? null);
      await dataService.updateTask(taskId, { parentId: newParentId });
    } catch (err) {
      logger.error('Failed to move task:', err);
      toast.error('태스크 이동 실패');
    }
  }, [setAppState, tasks, dataService]);

  // ── 태스크 삭제 ──
  const handleTaskDelete = useCallback(async (taskId: string) => {
    try {
      await dataService.deleteTask(taskId);
      setAppState(prev => {
        const collectChildIds = (parentId: string): string[] => {
          const children = prev.tasks.filter(t => t.parentId === parentId);
          return children.flatMap(c => [c.id, ...collectChildIds(c.id)]);
        };
        const allIds = [taskId, ...collectChildIds(taskId)];
        const newTasks = prev.tasks.filter(t => !allIds.includes(t.id));
        const newDeps = prev.groupDependencies.filter(dep =>
          !allIds.includes(dep.sourceGroupId) && !allIds.includes(dep.targetGroupId)
        );
        return { ...prev, tasks: recalculateCPData(newTasks), groupDependencies: newDeps };
      });
      toast.success('태스크가 삭제되었습니다.');
    } catch (err) {
      logger.error('Failed to delete task:', err);
      toast.error('태스크 삭제 실패');
    }
  }, [setAppState, dataService]);

  // ── 태스크 그룹화 ──
  const handleTaskGroup = useCallback(async (taskIds: string[]) => {
    try {
      const selectedTasks = tasks.filter(t => taskIds.includes(t.id));
      if (selectedTasks.length < 1) { toast.error('그룹화할 태스크를 선택하세요.'); return; }

      const parentIds = new Set(selectedTasks.map(t => t.parentId));
      const commonParentId = parentIds.size === 1 ? Array.from(parentIds)[0] : null;
      const minStart = selectedTasks.reduce((min, t) => t.startDate < min ? t.startDate : min, selectedTasks[0].startDate);
      const maxEnd = selectedTasks.reduce((max, t) => t.endDate > max ? t.endDate : max, selectedTasks[0].endDate);

      const newGroup: Partial<ConstructionTask> = {
        parentId: commonParentId, wbsLevel: selectedTasks[0].wbsLevel,
        type: 'GROUP', name: '새 그룹', startDate: minStart, endDate: maxEnd, dependencies: [],
      };

      const createdGroup = await dataService.createTask(newGroup as ConstructionTask);
      const newGroupId = createdGroup.id;

      await Promise.all(taskIds.map(id => dataService.updateTask(id, { parentId: newGroupId })));

      setAppState(prev => {
        const newTasks = prev.tasks.map(t => taskIds.includes(t.id) ? { ...t, parentId: newGroupId } : t);
        const firstIdx = newTasks.findIndex(t => taskIds.includes(t.id));
        newTasks.splice(firstIdx, 0, { ...newGroup as ConstructionTask, id: newGroupId });
        return { ...prev, tasks: newTasks };
      });
      toast.success('그룹이 생성되었습니다.');
    } catch (err) {
      logger.error('Failed to group tasks:', err);
      toast.error('그룹화 실패');
    }
  }, [tasks, dataService, setAppState]);

  // ── CP 블럭화 ──
  const handleTaskBlockify = useCallback(async (taskIds: string[]) => {
    try {
      const selectedCPs = tasks.filter(t => taskIds.includes(t.id) && t.type === 'CP');
      if (selectedCPs.length < 1) { toast.error('블럭화할 CP를 선택하세요.'); return; }

      const minStart = selectedCPs.reduce((min, t) => t.startDate < min ? t.startDate : min, selectedCPs[0].startDate);
      const maxEnd = selectedCPs.reduce((max, t) => t.endDate > max ? t.endDate : max, selectedCPs[0].endDate);

      const newBlock: Partial<ConstructionTask> = {
        parentId: null, wbsLevel: 1, type: 'BLOCK', name: '새 블럭',
        startDate: minStart, endDate: maxEnd, dependencies: [], isExpanded: true,
      };

      const createdBlock = await dataService.createTask(newBlock as ConstructionTask);
      const newBlockId = createdBlock.id;

      await Promise.all(taskIds.map(id => dataService.updateTask(id, { parentId: newBlockId })));

      setAppState(prev => {
        const newTasks = prev.tasks.map(t => taskIds.includes(t.id) ? { ...t, parentId: newBlockId } : t);
        const firstIdx = newTasks.findIndex(t => taskIds.includes(t.id));
        newTasks.splice(firstIdx, 0, { ...newBlock as ConstructionTask, id: newBlockId });
        return { ...prev, tasks: newTasks };
      });
      toast.success('블럭이 생성되었습니다.');
    } catch (err) {
      logger.error('Failed to blockify CPs:', err);
      if (err instanceof Error) {
        logger.error('[handleTaskBlockify] Error message:', err.message);
      }
      toast.error('블럭화 실패');
    }
  }, [tasks, dataService, setAppState]);

  // ── 그룹 해제 ──
  const handleTaskUngroup = useCallback(async (groupId: string) => {
    try {
      const group = tasks.find(t => t.id === groupId);
      if (!group || group.type !== 'GROUP') { toast.error('유효한 그룹이 아닙니다.'); return; }

      const children = tasks.filter(t => t.parentId === groupId);
      if (children.length > 0) {
        await Promise.all(children.map(child => dataService.updateTask(child.id, { parentId: group.parentId })));
      }
      await dataService.deleteTask(groupId);

      setAppState(prev => {
        let newTasks = prev.tasks.map(t => t.parentId === groupId ? { ...t, parentId: group.parentId } : t);
        newTasks = newTasks.filter(t => t.id !== groupId);
        return { ...prev, tasks: newTasks };
      });
      toast.success('그룹이 해제되었습니다.');
    } catch (err) {
      logger.error('Failed to ungroup tasks:', err);
      toast.error('그룹 해제 실패');
    }
  }, [tasks, dataService, setAppState]);

  // ── 그룹 드래그 ──
  const handleGroupDrag = useCallback(async (result: GroupDragResult) => {
    if (!result.taskUpdates) return;
    try {
      await Promise.all(
        result.taskUpdates.map(update =>
          dataService.updateTask(update.taskId, { startDate: update.newStartDate, endDate: update.newEndDate })
        )
      );
      setAppState(prev => ({
        ...prev,
        tasks: prev.tasks.map(t => {
          const update = result.taskUpdates?.find(u => u.taskId === t.id);
          return update ? { ...t, startDate: update.newStartDate, endDate: update.newEndDate } : t;
        }),
      }));
    } catch (err) {
      logger.error('Failed to update tasks after group drag:', err);
      toast.error('그룹 업데이트 실패');
    }
  }, [dataService, setAppState]);

  // ── 그룹 종속성 ──
  const handleGroupDependencyCreate = useCallback(async (dep: GroupDependency) => {
    try {
      const newDep = await dataService.createDependency(dep);
      setAppState(prev => ({ ...prev, groupDependencies: [...prev.groupDependencies, newDep] }));
    } catch (err) {
      logger.error('Failed to create dependency:', err);
      toast.error('종속성 생성 실패');
    }
  }, [dataService, setAppState]);

  const handleGroupDependencyDelete = useCallback(async (depId: string) => {
    try {
      await dataService.deleteDependency(depId);
      setAppState(prev => ({ ...prev, groupDependencies: prev.groupDependencies.filter(d => d.id !== depId) }));
    } catch (err) {
      logger.error('Failed to delete dependency:', err);
      toast.error('종속성 삭제 실패');
    }
  }, [dataService, setAppState]);

  const handleGroupCycleDetected = useCallback((info: { sourceGroupId: string; targetGroupId: string }) => {
    logger.warn('Cycle detected between groups:', info.sourceGroupId, '->', info.targetGroupId);
    toast.error('순환 종속성이 감지되었습니다. 다른 그룹을 선택해주세요.');
  }, []);

  // ── 마일스톤 ──
  const handleMilestoneCreate = useCallback(async (milestone: Partial<Milestone>) => {
    try {
      if (!milestone.name || !milestone.date) { toast.error('마일스톤 생성 데이터가 올바르지 않습니다.'); return; }
      const newMilestone = await dataService.createMilestone(milestone as Omit<Milestone, 'id'>);
      setAppState(prev => ({ ...prev, milestones: [...prev.milestones, newMilestone] }));
      toast.success('마일스톤이 생성되었습니다.');
    } catch (err) {
      logger.error('Failed to create milestone:', err);
      toast.error('마일스톤 생성 실패');
    }
  }, [dataService, setAppState]);

  const handleMilestoneUpdate = useCallback(async (milestone: Milestone) => {
    try {
      const updated = await dataService.updateMilestone(milestone.id, milestone);
      if (!updated) { toast.error('마일스톤 업데이트 실패'); return; }
      setAppState(prev => ({ ...prev, milestones: prev.milestones.map(m => m.id === updated.id ? updated : m) }));
    } catch (err) {
      logger.error('Failed to update milestone:', err);
      toast.error('마일스톤 업데이트 실패');
    }
  }, [dataService, setAppState]);

  const handleMilestoneDelete = useCallback(async (milestoneId: string) => {
    try {
      await dataService.deleteMilestone(milestoneId);
      setAppState(prev => ({ ...prev, milestones: prev.milestones.filter(m => m.id !== milestoneId) }));
      toast.success('마일스톤이 삭제되었습니다.');
    } catch (err) {
      logger.error('Failed to delete milestone:', err);
      toast.error('마일스톤 삭제 실패');
    }
  }, [dataService, setAppState]);

  // ── 뷰 전환 (no-op) ──
  const handleViewChange = useCallback((_view: ViewMode, _activeCPId?: string) => {
    // reserved for future
  }, []);

  // ── 닫기 ──
  const handleClose = useCallback(() => {
    if (hasUnsavedChanges) {
      if (!confirm('저장하지 않은 변경사항이 있습니다. 정말 닫으시겠습니까?')) return;
    }
    window.close();
    router.back();
  }, [hasUnsavedChanges, router]);

  return {
    // state
    tasks, milestones, groupDependencies,
    isLoading, error, loadedFileName,
    hasUnsavedChanges, saveStatus,
    canUndo, canRedo, historyLength,
    calendarSettings: CALENDAR_SETTINGS,
    // undo/redo
    undo, redo,
    // handlers
    handleSave, handleReset,
    handleExport, handleExportExcel, handleImport,
    handleTaskUpdate, handleTaskCreate, handleTaskDelete,
    handleTaskReorder, handleTaskMove,
    handleTaskGroup, handleTaskUngroup, handleTaskBlockify,
    handleGroupDrag,
    handleGroupDependencyCreate, handleGroupDependencyDelete, handleGroupCycleDetected,
    handleMilestoneCreate, handleMilestoneUpdate, handleMilestoneDelete,
    handleViewChange,
    handleClose,
  };
}
