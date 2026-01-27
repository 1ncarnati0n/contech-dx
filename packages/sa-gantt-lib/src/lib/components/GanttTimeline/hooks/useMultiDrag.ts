'use client';

import { useCallback, useRef, useMemo } from 'react';
import {
    calculateDeltaDays,
    calculateDeltaWorkingDays,
    calculateWorkingDaysOffsets,
    calculateGroupTasksMoveWithCriticalPath,
} from './dragUtils';
import { useDragState } from './useDragState';
import type { ConstructionTask, CalendarSettings } from '../../../types';

// ============================================
// 다중 선택 드래그 훅
// ============================================
// Phase 3: 다중 선택된 Task들을 함께 드래그
//
// 핵심 원리:
// 1. 기준 Task (마우스로 드래그 시작한 Task) 대비 상대 오프셋 계산 (작업일 기준)
// 2. 선택된 모든 Task 동시 이동
// 3. 크리티컬 패스(작업일 기준 상대 거리) 유지

// ============================================
// Types
// ============================================

interface TaskDragInfo {
    originalStartDate: Date;
    originalEndDate: Date;
    indirectWorkDaysPre: number;
    netWorkDays: number;
    indirectWorkDaysPost: number;
    currentStartDate: Date;
    currentEndDate: Date;
}

interface MultiDragState {
    primaryTaskId: string;
    startX: number;
    selectedTaskIds: string[];
    affectedTasks: ConstructionTask[];
    taskDragInfoMap: Map<string, TaskDragInfo>;
    referenceTask: ConstructionTask | null;
    workingDaysOffsets: Map<string, number>;
    currentDeltaDays: number;
    currentDeltaWorkingDays: number;
}

export interface MultiDragResult {
    taskUpdates: Array<{
        taskId: string;
        newStartDate: Date;
        newEndDate: Date;
    }>;
    deltaDays: number;
}

interface UseMultiDragOptions {
    pixelsPerDay: number;
    allTasks: ConstructionTask[];
    holidays: Date[];
    calendarSettings: CalendarSettings;
    selectedTaskIds: Set<string>;
    onMultiDrag?: (result: MultiDragResult) => void;
}

// ============================================
// useMultiDrag Hook
// ============================================

export const useMultiDrag = ({
    pixelsPerDay,
    allTasks,
    holidays,
    calendarSettings,
    selectedTaskIds,
    onMultiDrag,
}: UseMultiDragOptions) => {
    // 마지막 계산된 값 캐시
    const lastDeltaWorkingDaysRef = useRef<number>(0);

    // ========================================
    // 선택된 Task들 필터링 (TASK 타입만)
    // ========================================
    const selectedTasks = useMemo(() => {
        return allTasks.filter(
            task => selectedTaskIds.has(task.id) && task.type === 'TASK' && task.task
        );
    }, [allTasks, selectedTaskIds]);

    // ========================================
    // 드래그 상태 관리
    // ========================================
    const { state: dragState, scheduleUpdate, start, isDragging } = useDragState<MultiDragState>({
        onMove: (e, state) => {
            if (!onMultiDrag || !state.referenceTask) return;

            const deltaX = e.clientX - state.startX;
            const deltaDays = calculateDeltaDays(deltaX, pixelsPerDay);

            // 픽셀 → 작업일 변환
            const deltaWorkingDays = calculateDeltaWorkingDays(
                deltaX,
                pixelsPerDay,
                state.referenceTask.startDate,
                holidays,
                calendarSettings
            );

            // 작업일 변화가 없으면 deltaDays만 업데이트
            if (deltaWorkingDays === lastDeltaWorkingDaysRef.current) {
                scheduleUpdate({ currentDeltaDays: deltaDays });
                return;
            }

            // 크리티컬 패스 유지하며 각 task 이동 계산
            const taskMoveResults = calculateGroupTasksMoveWithCriticalPath(
                state.referenceTask,
                state.workingDaysOffsets,
                state.affectedTasks,
                deltaWorkingDays,
                holidays,
                calendarSettings
            );

            // taskDragInfoMap 업데이트
            let hasChanges = false;
            const updatedTaskDragInfoMap = new Map(state.taskDragInfoMap);

            for (const [taskId, moveResult] of taskMoveResults) {
                const originalInfo = state.taskDragInfoMap.get(taskId);
                if (originalInfo) {
                    if (originalInfo.currentStartDate.getTime() !== moveResult.newStartDate.getTime() ||
                        originalInfo.currentEndDate.getTime() !== moveResult.newEndDate.getTime()) {
                        hasChanges = true;
                        updatedTaskDragInfoMap.set(taskId, {
                            ...originalInfo,
                            currentStartDate: moveResult.newStartDate,
                            currentEndDate: moveResult.newEndDate,
                        });
                    }
                }
            }

            // 캐시 업데이트
            lastDeltaWorkingDaysRef.current = deltaWorkingDays;

            scheduleUpdate({
                currentDeltaDays: deltaDays,
                currentDeltaWorkingDays: deltaWorkingDays,
                taskDragInfoMap: hasChanges ? updatedTaskDragInfoMap : state.taskDragInfoMap,
            });
        },

        onEnd: (state) => {
            if (!onMultiDrag || state.currentDeltaWorkingDays === 0) return;

            // taskDragInfoMap에서 최종 결과 추출
            const taskUpdates = Array.from(state.taskDragInfoMap.entries()).map(
                ([taskId, info]) => ({
                    taskId,
                    newStartDate: info.currentStartDate,
                    newEndDate: info.currentEndDate,
                })
            );

            onMultiDrag({
                taskUpdates,
                deltaDays: state.currentDeltaDays,
            });
        },

        cursor: 'grabbing',
    });

    // ========================================
    // 드래그 시작
    // ========================================
    const handleMultiDragStart = useCallback((
        e: React.MouseEvent,
        primaryTaskId: string
    ) => {
        if (!onMultiDrag) return;
        if (selectedTasks.length === 0) return;

        e.preventDefault();
        e.stopPropagation();

        // 캐시 초기화
        lastDeltaWorkingDaysRef.current = 0;

        // 기준 task 및 작업일 오프셋 계산
        const { referenceTask, workingDaysOffsets } = calculateWorkingDaysOffsets(
            selectedTasks,
            holidays,
            calendarSettings
        );

        // 각 task의 초기 정보를 Map으로 구성
        const taskDragInfoMap = new Map<string, TaskDragInfo>();
        for (const task of selectedTasks) {
            if (task.type === 'TASK' && task.task) {
                taskDragInfoMap.set(task.id, {
                    originalStartDate: task.startDate,
                    originalEndDate: task.endDate,
                    indirectWorkDaysPre: task.task.indirectWorkDaysPre,
                    netWorkDays: task.task.netWorkDays,
                    indirectWorkDaysPost: task.task.indirectWorkDaysPost,
                    currentStartDate: task.startDate,
                    currentEndDate: task.endDate,
                });
            }
        }

        start({
            primaryTaskId,
            startX: e.clientX,
            selectedTaskIds: Array.from(selectedTaskIds),
            affectedTasks: selectedTasks,
            taskDragInfoMap,
            referenceTask,
            workingDaysOffsets,
            currentDeltaDays: 0,
            currentDeltaWorkingDays: 0,
        });
    }, [onMultiDrag, selectedTasks, selectedTaskIds, holidays, calendarSettings, start]);

    // ========================================
    // 드래그 정보 조회
    // ========================================
    const getMultiDragInfo = useCallback((taskId: string): {
        startDate: Date;
        endDate: Date;
    } | null => {
        if (!dragState) return null;

        const taskInfo = dragState.taskDragInfoMap.get(taskId);
        if (!taskInfo) return null;

        return {
            startDate: taskInfo.currentStartDate,
            endDate: taskInfo.currentEndDate,
        };
    }, [dragState]);

    // ========================================
    // 다중 선택 드래그 가능 여부
    // ========================================
    const canMultiDrag = useMemo(() => {
        return selectedTasks.length > 1;
    }, [selectedTasks.length]);

    return {
        isDragging,
        canMultiDrag,
        selectedCount: selectedTasks.length,
        handleMultiDragStart,
        getMultiDragInfo,
        dragState,
    };
};
