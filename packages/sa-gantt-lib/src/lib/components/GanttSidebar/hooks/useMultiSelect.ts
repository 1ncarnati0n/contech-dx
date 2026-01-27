'use client';

import { useCallback } from 'react';
import type { ConstructionTask } from '../../../types';
import { useGanttSelection } from '../../../store/useGanttStore';

interface UseMultiSelectOptions {
    tasks: ConstructionTask[];
    draggedTaskId: string | null;
}

/**
 * 다중 선택 훅 (Store 연동)
 *
 * Zustand Store를 사용하여 선택 상태를 전역으로 관리합니다.
 * Ctrl/Cmd + 클릭: 토글 선택
 * Shift + 클릭: 범위 선택
 * 단순 클릭: 단일 선택
 */
export const useMultiSelect = ({ tasks, draggedTaskId }: UseMultiSelectOptions) => {
    const {
        selectedTaskIds,
        focusedTaskId,
        selectTask,
        selectMultipleTasks,
        clearSelection,
    } = useGanttSelection();

    const handleRowClick = useCallback((e: React.MouseEvent, task: ConstructionTask, _rowIndex: number) => {
        e.stopPropagation();

        // 드래그 중에는 선택 무시
        if (draggedTaskId) return;

        const isCtrlOrCmd = e.ctrlKey || e.metaKey;
        const isShift = e.shiftKey;

        selectTask(task.id, {
            ctrlKey: isCtrlOrCmd,
            shiftKey: isShift,
            visibleTasks: tasks,
        });
    }, [draggedTaskId, tasks, selectTask]);

    // 단일 Task 선택 (키보드 네비게이션 등에서 사용)
    const selectSingleTask = useCallback((taskId: string) => {
        selectTask(taskId, { visibleTasks: tasks });
    }, [selectTask, tasks]);

    return {
        selectedTaskIds,
        focusedTaskId,
        handleRowClick,
        clearSelection,
        selectTask: selectSingleTask,
        selectMultipleTasks,
    };
};
