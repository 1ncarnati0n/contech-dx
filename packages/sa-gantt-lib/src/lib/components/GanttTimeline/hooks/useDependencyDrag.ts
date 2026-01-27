'use client';

import { useCallback, useMemo } from 'react';
import {
    buildDependencyGraph,
    collectConnectedTaskGroup,
    hasAnyDependency,
} from '../../../utils/dependencyGraph';
import {
    calculateDeltaDays,
    calculateWorkingDaysOffsets,
    calculateDeltaWorkingDays,
    calculateGroupTasksMoveWithCriticalPath,
} from './dragUtils';
import { useDragState, updateDragState } from './useDragState';
import type {
    ConstructionTask,
    AnchorDependency,
    AnchorDependencyDragResult,
    CalendarSettings,
} from '../../../types';
import type { DependencyDragState, BaseDragOptions, TaskDragInfo } from '../types';

// ============================================
// Hook Options
// ============================================

interface UseDependencyDragOptions extends BaseDragOptions {
    holidays: Date[];
    calendarSettings: CalendarSettings;
    allTasks: ConstructionTask[];
    dependencies: AnchorDependency[];
    onDependencyDrag?: (result: AnchorDependencyDragResult) => void;
}

// ============================================
// useDependencyDrag Hook (리팩토링됨)
// ============================================
// UX 개선: 드래그 중에는 모든 연결된 task가 동일한 deltaDays로 이동
// 드래그 완료 시에만 최종 위치 계산

export const useDependencyDrag = ({
    pixelsPerDay,
    holidays,
    calendarSettings,
    allTasks,
    dependencies,
    onDependencyDrag,
}: UseDependencyDragOptions) => {
    // 종속성 그래프 메모이제이션
    const dependencyGraph = useMemo(
        () => buildDependencyGraph(allTasks, dependencies),
        [allTasks, dependencies]
    );

    // 태스크가 종속성을 가지고 있는지 확인
    const taskHasDependency = useCallback(
        (taskId: string): boolean => hasAnyDependency(taskId, dependencies),
        [dependencies]
    );

    // ========================================
    // 공통 드래그 상태 관리 훅 사용
    // ========================================
    const { state: dragState, start, isDragging } = useDragState<DependencyDragState>({
        // 드래그 중 처리 (그룹 드래그와 동일한 로직)
        onMove: (e, state, setState) => {
            // 콜백 없이도 시각적 드래그 허용
            if (!state.referenceTask) return;

            const deltaX = e.clientX - state.startX;
            const deltaDays = calculateDeltaDays(deltaX, pixelsPerDay);

            // 픽셀 → 작업일 변환 (휴일 건너뛰기)
            const deltaWorkingDays = calculateDeltaWorkingDays(
                deltaX,
                pixelsPerDay,
                state.referenceTask.startDate,
                holidays,
                calendarSettings
            );

            // 크리티컬 패스를 유지하며 각 태스크 이동 계산
            const taskMoveResults = calculateGroupTasksMoveWithCriticalPath(
                state.referenceTask,
                state.workingDaysOffsets,
                state.connectedTasks,
                deltaWorkingDays,
                holidays,
                calendarSettings
            );

            // taskDragInfoMap 업데이트
            const updatedTaskDragInfoMap = new Map(state.taskDragInfoMap);
            for (const [taskId, moveResult] of taskMoveResults) {
                const originalInfo = state.taskDragInfoMap.get(taskId);
                if (originalInfo) {
                    updatedTaskDragInfoMap.set(taskId, {
                        ...originalInfo,
                        currentStartDate: moveResult.newStartDate,
                        currentEndDate: moveResult.newEndDate,
                    });
                }
            }

            updateDragState(setState, {
                currentDeltaDays: deltaDays,  // 하위 호환성용
                currentDeltaWorkingDays: deltaWorkingDays,
                lastDeltaX: deltaX,
                taskDragInfoMap: updatedTaskDragInfoMap,
            });
        },
        // 드래그 완료 처리
        onEnd: (state) => {
            // 작업일 단위 이동이 0이면 무시 (그룹 드래그와 동일)
            if (!onDependencyDrag || state.currentDeltaWorkingDays === 0) return;

            // taskDragInfoMap에서 최종 결과 추출
            const taskUpdates = Array.from(state.taskDragInfoMap.entries()).map(
                ([taskId, info]) => ({
                    taskId,
                    newStartDate: info.currentStartDate,
                    newEndDate: info.currentEndDate,
                })
            );

            // 개선된 콜백 결과 전달 (taskUpdates 포함)
            onDependencyDrag({
                sourceTaskId: state.sourceTaskId,
                deltaDays: state.currentDeltaDays,  // 참고용 (하위 호환성)
                affectedTaskIds: state.connectedTaskIds,
                taskUpdates,  // 신규: 각 태스크의 스냅된 날짜
            });
        },
        cursor: 'grabbing',
    });

    // ========================================
    // 드래그 시작
    // ========================================
    const handleMouseDown = useCallback(
        (
            e: React.MouseEvent,
            taskId: string,
            taskData: { startDate: Date; endDate: Date }
        ): boolean => {
            // 종속성이 없으면 처리하지 않음
            if (!taskHasDependency(taskId)) return false;

            // 콜백 없이도 시각적 드래그 허용 (콜백은 드래그 완료 시에만 체크)

            e.preventDefault();
            e.stopPropagation();

            // 양방향으로 연결된 모든 태스크 수집
            const connectedTaskIds = collectConnectedTaskGroup(taskId, dependencyGraph);
            const connectedTasks = allTasks.filter((t) => connectedTaskIds.includes(t.id));

            // 기준 태스크 및 작업일 오프셋 계산 (그룹 드래그와 동일)
            const { referenceTask, workingDaysOffsets } = calculateWorkingDaysOffsets(
                connectedTasks,
                holidays,
                calendarSettings
            );

            // 각 태스크의 초기 정보를 Map으로 구성
            const taskDragInfoMap = new Map<string, TaskDragInfo>();
            for (const task of connectedTasks) {
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
                sourceTaskId: taskId,
                startX: e.clientX,
                originalStartDate: taskData.startDate,
                connectedTaskIds,
                connectedTasks,
                currentDeltaDays: 0,
                lastDeltaX: 0,
                taskDeltaMap: new Map(), // 하위 호환성을 위해 유지 (deprecated)
                // 크리티컬 패스 유지를 위한 신규 필드
                taskDragInfoMap,
                referenceTask,
                workingDaysOffsets,
                currentDeltaWorkingDays: 0,
            });

            return true;
        },
        [onDependencyDrag, taskHasDependency, dependencyGraph, allTasks, holidays, calendarSettings, start]
    );

    // ========================================
    // 드래그 정보 조회
    // ========================================
    const isDraggingTask = useCallback(
        (taskId: string): boolean => {
            if (!dragState) return false;
            return dragState.connectedTaskIds.includes(taskId);
        },
        [dragState]
    );

    // UX 개선: 모든 연결된 task에 동일한 deltaDays 반환
    const getTaskDeltaDays = useCallback(
        (taskId: string): number => {
            if (!dragState || !dragState.connectedTaskIds.includes(taskId)) return 0;
            // 기존: taskDeltaMap.get(taskId) ?? currentDeltaDays
            // 개선: 항상 currentDeltaDays (모든 task 동일 속도 이동)
            return dragState.currentDeltaDays;
        },
        [dragState]
    );

    const getConnectedTaskIds = useCallback((): string[] => {
        if (!dragState) return [];
        return dragState.connectedTaskIds;
    }, [dragState]);

    // 신규: 스냅된 날짜 정보 조회 (groupDragInfo와 동일한 패턴)
    const getTaskDragInfo = useCallback((taskId: string): {
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

    return {
        isDragging,
        taskHasDependency,
        handleDependencyBarMouseDown: handleMouseDown,
        isDraggingTask,
        getTaskDeltaDays,
        getTaskDragInfo,  // 신규: 스냅된 날짜 정보 조회
        getConnectedTaskIds,
    };
};
