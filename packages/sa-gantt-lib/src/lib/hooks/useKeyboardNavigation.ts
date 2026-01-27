'use client';

import { useEffect, useCallback } from 'react';
import type { ConstructionTask, ViewMode } from '../types';
import { useGanttSelection, useGanttExpansion } from '../store/useGanttStore';

interface UseKeyboardNavigationOptions {
    /** 현재 보이는 Task 목록 */
    visibleTasks: ConstructionTask[];
    /** 현재 뷰 모드 */
    viewMode: ViewMode;
    /** 뷰 변경 핸들러 */
    onViewChange: (mode: ViewMode, cpId?: string) => void;
    /** Task 포커스 함수 (양방향 스크롤) */
    focusTask: (taskId: string) => void;
    /** Task 편집 핸들러 (Enter 키) */
    onTaskEdit?: (task: ConstructionTask) => void;
    /** 키보드 네비게이션 활성화 여부 */
    enabled?: boolean;
}

/**
 * 키보드 네비게이션 훅
 *
 * 화살표 키로 Task 간 이동, Enter로 편집 모달 열기 등을 지원합니다.
 *
 * 키 바인딩:
 * - ArrowUp: 이전 Task로 이동
 * - ArrowDown: 다음 Task로 이동
 * - ArrowLeft: CP/GROUP 접기 (펼쳐져 있을 때)
 * - ArrowRight: CP/GROUP 펼치기 (접혀 있을 때)
 * - Enter: 선택된 Task 편집 모달 열기
 * - Escape: 선택 해제
 * - Backspace: Detail View에서 Master View로 복귀
 * - Home: 첫 번째 Task로 이동
 * - End: 마지막 Task로 이동
 */
export function useKeyboardNavigation({
    visibleTasks,
    viewMode,
    onViewChange,
    focusTask,
    onTaskEdit,
    enabled = true,
}: UseKeyboardNavigationOptions) {
    const {
        selectedTaskIds,
        focusedTaskId,
        moveFocus,
        clearSelection,
        selectTask,
    } = useGanttSelection();

    const {
        expandedTaskIds,
        toggleTask,
    } = useGanttExpansion();

    // 포커스 변경 시 해당 Task로 스크롤
    useEffect(() => {
        if (focusedTaskId && enabled) {
            focusTask(focusedTaskId);
        }
    }, [focusedTaskId, focusTask, enabled]);

    const handleKeyDown = useCallback((e: KeyboardEvent) => {
        if (!enabled) return;

        // 입력 필드에서는 키보드 네비게이션 비활성화
        const target = e.target as HTMLElement;
        if (
            target.tagName === 'INPUT' ||
            target.tagName === 'TEXTAREA' ||
            target.isContentEditable
        ) {
            return;
        }

        switch (e.key) {
            case 'ArrowUp':
                e.preventDefault();
                moveFocus('up', visibleTasks);
                break;

            case 'ArrowDown':
                e.preventDefault();
                moveFocus('down', visibleTasks);
                break;

            case 'ArrowLeft':
                // 포커스된 Task가 펼칠 수 있는 항목(CP, GROUP, Block)이고 펼쳐져 있으면 접기
                if (focusedTaskId) {
                    const task = visibleTasks.find(t => t.id === focusedTaskId);
                    if (task && (task.type === 'CP' || task.type === 'GROUP')) {
                        // 하위 항목이 있는지 확인 (펼칠 수 있는지)
                        const hasChildren = visibleTasks.some(t => t.parentId === task.id) ||
                            expandedTaskIds.has(task.id);
                        if (hasChildren && expandedTaskIds.has(task.id)) {
                            e.preventDefault();
                            toggleTask(task.id);
                        }
                    }
                }
                break;

            case 'ArrowRight':
                // 포커스된 Task가 펼칠 수 있는 항목(CP, GROUP, Block)이고 접혀 있으면 펼치기
                if (focusedTaskId) {
                    const task = visibleTasks.find(t => t.id === focusedTaskId);
                    if (task && (task.type === 'CP' || task.type === 'GROUP')) {
                        // 펼쳐져 있지 않으면 펼치기
                        if (!expandedTaskIds.has(task.id)) {
                            e.preventDefault();
                            toggleTask(task.id);
                        }
                    }
                }
                break;

            case 'Enter':
                e.preventDefault();
                if (focusedTaskId) {
                    const task = visibleTasks.find(t => t.id === focusedTaskId);
                    if (task) {
                        // 마스터 뷰에서 CP(Level 1) 선택 시 → 디테일 뷰로 전환
                        if (viewMode === 'MASTER' && task.wbsLevel === 1) {
                            onViewChange('DETAIL', task.id);
                        }
                        // 그 외에는 편집 모달 열기
                        else if (onTaskEdit) {
                            onTaskEdit(task);
                        }
                    }
                }
                break;

            case 'Escape':
                e.preventDefault();
                clearSelection();
                break;

            case 'Backspace':
                // Detail View에서만 동작
                if (viewMode === 'DETAIL') {
                    e.preventDefault();
                    onViewChange('MASTER');
                }
                break;

            case 'Home':
                // 첫 번째 Task로 이동
                e.preventDefault();
                if (visibleTasks.length > 0) {
                    selectTask(visibleTasks[0].id, { visibleTasks });
                }
                break;

            case 'End':
                // 마지막 Task로 이동
                e.preventDefault();
                if (visibleTasks.length > 0) {
                    selectTask(visibleTasks[visibleTasks.length - 1].id, { visibleTasks });
                }
                break;
        }
    }, [enabled, visibleTasks, viewMode, focusedTaskId, moveFocus, clearSelection, onViewChange, onTaskEdit, selectTask, expandedTaskIds, toggleTask]);

    useEffect(() => {
        document.addEventListener('keydown', handleKeyDown);
        return () => document.removeEventListener('keydown', handleKeyDown);
    }, [handleKeyDown]);

    return {
        focusedTaskId,
        selectedTaskIds,
    };
}
