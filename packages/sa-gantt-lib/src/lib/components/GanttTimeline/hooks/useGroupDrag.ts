'use client';

import { useCallback, useRef, useEffect } from 'react';
import { collectDescendantTasks, calculateGroupDateRange } from '../../../utils/groupUtils';
import {
    buildGroupDependencyGraph,
    collectConnectedGroupCluster,
} from '../../../utils/dependencyGraph';
import {
    calculateDeltaDays,
    calculateDeltaWorkingDays,
    calculateWorkingDaysOffsets,
    calculateGroupTasksMoveWithCriticalPath,
} from './dragUtils';
import { useDragState } from './useDragState';
import type { ConstructionTask, GroupDragResult, CalendarSettings, GroupDependency } from '../../../types';

// ============================================
// Hook Options
// ============================================

interface UseGroupDragOptions {
    pixelsPerDay: number;
    allTasks: ConstructionTask[];
    holidays: Date[];
    calendarSettings: CalendarSettings;
    onGroupDrag?: (result: GroupDragResult) => void;
    groupDependencies?: GroupDependency[];  // 그룹 간 종속선 정보
}

// ============================================
// 각 Task별 드래그 정보
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

// ============================================
// 향상된 그룹 드래그 상태 (크리티컬 패스 유지 방식)
// ============================================

interface EnhancedGroupDragState {
    groupId: string;
    startX: number;
    originalStartDate: Date;
    originalEndDate: Date;
    affectedTasks: ConstructionTask[];
    currentDeltaDays: number;
    // 각 task별 드래그 정보
    taskDragInfoMap: Map<string, TaskDragInfo>;
    // 크리티컬 패스 유지를 위한 정보
    referenceTask: ConstructionTask | null;      // 기준 task (가장 빠른 시작일)
    workingDaysOffsets: Map<string, number>;     // 각 task의 작업일 오프셋
    currentDeltaWorkingDays: number;             // 현재 작업일 단위 이동량
}

// ============================================
// useGroupDrag Hook (크리티컬 패스 유지 방식)
// ============================================
// 핵심 원리:
// 1. 모든 task가 같은 "작업일 수"만큼 이동
// 2. 기준 task (가장 빠른 시작일) 중심으로 계산
// 3. 각 task의 기준 task 대비 작업일 오프셋 유지
// 4. → task 간 크리티컬 패스(작업일 기준 상대 거리) 유지됨

export const useGroupDrag = ({
    pixelsPerDay,
    allTasks,
    holidays,
    calendarSettings,
    onGroupDrag,
    groupDependencies = [],
}: UseGroupDragOptions) => {
    // ========================================
    // 마지막 계산된 값 캐시 (불필요한 Map 재생성 방지)
    // ========================================
    const lastDeltaWorkingDaysRef = useRef<number>(0);
    const lastTaskDragInfoMapRef = useRef<Map<string, TaskDragInfo> | null>(null);

    // ========================================
    // 드래그 상태 관리
    // ========================================
    const {
        state: dragState,
        scheduleUpdate,
        start,
        isDragging,
        isPending,
        pendingState,
        clearPending,
    } = useDragState<EnhancedGroupDragState>({
        // 드래그 중: 작업일 기준으로 크리티컬 패스 유지하며 이동
        onMove: (e, state) => {
            if (!onGroupDrag || !state.referenceTask) return;

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

            // 작업일 변화가 없으면 deltaDays만 업데이트 (Map 재생성 방지)
            if (deltaWorkingDays === lastDeltaWorkingDaysRef.current && lastTaskDragInfoMapRef.current) {
                scheduleUpdate({
                    currentDeltaDays: deltaDays,
                });
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

            // taskDragInfoMap 최적화 업데이트: 실제 변경이 있을 때만 새 Map 생성
            let hasChanges = false;
            const updatedTaskDragInfoMap = new Map(state.taskDragInfoMap);

            for (const [taskId, moveResult] of taskMoveResults) {
                const originalInfo = state.taskDragInfoMap.get(taskId);
                if (originalInfo) {
                    // 실제 날짜가 변경되었는지 확인
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

            // GROUP/CP/BLOCK 날짜 업데이트: 하위 TASK들의 min/max로 재계산
            for (const task of state.affectedTasks) {
                if (task.type === 'GROUP' || task.type === 'CP' || task.type === 'BLOCK') {
                    const originalInfo = state.taskDragInfoMap.get(task.id);
                    if (originalInfo) {
                        // 이 그룹의 직접 하위 TASK들 찾기
                        const childTasks = state.affectedTasks.filter(
                            t => t.type === 'TASK' && t.parentId === task.id
                        );

                        if (childTasks.length > 0) {
                            let minStart = new Date(8640000000000000); // Max Date
                            let maxEnd = new Date(-8640000000000000); // Min Date

                            for (const child of childTasks) {
                                const childInfo = updatedTaskDragInfoMap.get(child.id);
                                if (childInfo) {
                                    if (childInfo.currentStartDate < minStart) {
                                        minStart = childInfo.currentStartDate;
                                    }
                                    if (childInfo.currentEndDate > maxEnd) {
                                        maxEnd = childInfo.currentEndDate;
                                    }
                                }
                            }

                            // 유효한 날짜 범위가 있으면 업데이트
                            if (minStart.getTime() !== 8640000000000000 &&
                                maxEnd.getTime() !== -8640000000000000) {
                                const currentGroupInfo = updatedTaskDragInfoMap.get(task.id);
                                if (currentGroupInfo &&
                                    (currentGroupInfo.currentStartDate.getTime() !== minStart.getTime() ||
                                     currentGroupInfo.currentEndDate.getTime() !== maxEnd.getTime())) {
                                    hasChanges = true;
                                    updatedTaskDragInfoMap.set(task.id, {
                                        ...currentGroupInfo,
                                        currentStartDate: minStart,
                                        currentEndDate: maxEnd,
                                    });
                                }
                            }
                        }
                    }
                }
            }

            // 캐시 업데이트
            lastDeltaWorkingDaysRef.current = deltaWorkingDays;
            lastTaskDragInfoMapRef.current = hasChanges ? updatedTaskDragInfoMap : state.taskDragInfoMap;

            // RAF 스케줄러로 배칭 업데이트
            scheduleUpdate({
                currentDeltaDays: deltaDays,
                currentDeltaWorkingDays: deltaWorkingDays,
                taskDragInfoMap: hasChanges ? updatedTaskDragInfoMap : state.taskDragInfoMap,
            });
        },
        // 드래그 완료: 작업일 단위 이동이 0이면 무시
        onEnd: (state) => {
            if (!onGroupDrag || state.currentDeltaWorkingDays === 0) return;

            // taskDragInfoMap에서 최종 결과 추출
            const taskUpdates = Array.from(state.taskDragInfoMap.entries()).map(
                ([taskId, info]) => ({
                    taskId,
                    newStartDate: info.currentStartDate,
                    newEndDate: info.currentEndDate,
                })
            );

            onGroupDrag({
                groupId: state.groupId,
                deltaDays: state.currentDeltaDays,
                affectedTaskIds: state.affectedTasks.map(t => t.id),
                taskUpdates,
            });
        },
        cursor: 'grabbing',
        usePendingUpdate: true, // 드래그 완료 후 깜빡임 방지
    });

    // ========================================
    // Pending 상태 해제: props 업데이트 감지
    // ========================================
    useEffect(() => {
        if (!isPending || !pendingState) return;

        // 영향받는 태스크 중 하나라도 업데이트되었는지 확인
        const isUpdated = pendingState.affectedTasks.some(task => {
            const taskInfo = pendingState.taskDragInfoMap.get(task.id);
            if (!taskInfo) return false;

            const currentTask = allTasks.find(t => t.id === task.id);
            if (!currentTask) return false;

            // props의 날짜가 드래그 후 날짜와 일치하면 업데이트 완료
            return (
                currentTask.startDate.getTime() === taskInfo.currentStartDate.getTime() &&
                currentTask.endDate.getTime() === taskInfo.currentEndDate.getTime()
            );
        });

        if (isUpdated) {
            clearPending();
        }
    }, [isPending, pendingState, allTasks, clearPending]);

    // 타임아웃 안전장치: 2초 후 강제 해제
    useEffect(() => {
        if (!isPending) return;

        const timeoutId = setTimeout(() => {
            console.warn('[useGroupDrag] Pending state timeout - clearing');
            clearPending();
        }, 2000);

        return () => clearTimeout(timeoutId);
    }, [isPending, clearPending]);

    // ========================================
    // 드래그 시작
    // ========================================
    const handleMouseDown = useCallback((
        e: React.MouseEvent,
        groupId: string,
        taskData: {
            startDate: Date;
            endDate: Date;
        }
    ) => {
        if (!onGroupDrag) return;
        e.preventDefault();
        e.stopPropagation();

        // 캐시 초기화
        lastDeltaWorkingDaysRef.current = 0;
        lastTaskDragInfoMapRef.current = null;

        // ========================================
        // 클러스터 수집: 연결된 그룹들 + 각 그룹의 하위 태스크
        // ========================================
        let connectedGroupIds: string[] = [groupId];

        // 그룹 종속선이 있으면 연결된 클러스터 전체 수집
        if (groupDependencies.length > 0) {
            const graph = buildGroupDependencyGraph(allTasks, groupDependencies);
            connectedGroupIds = collectConnectedGroupCluster(groupId, graph);
        }

        // 클러스터 내 모든 그룹의 하위 태스크 수집
        const affectedTasksSet = new Set<string>();
        const affectedTasks: ConstructionTask[] = [];

        for (const gId of connectedGroupIds) {
            // 그룹 자체도 포함 (그룹 바 이동을 위해)
            const groupTask = allTasks.find(t => t.id === gId);
            if (groupTask && !affectedTasksSet.has(gId)) {
                affectedTasksSet.add(gId);
                affectedTasks.push(groupTask);
            }

            // 그룹의 하위 태스크 수집
            const descendants = collectDescendantTasks(gId, allTasks);
            for (const task of descendants) {
                if (!affectedTasksSet.has(task.id)) {
                    affectedTasksSet.add(task.id);
                    affectedTasks.push(task);
                }
            }
        }

        // 기준 task 및 작업일 오프셋 계산 (한 번만)
        const { referenceTask, workingDaysOffsets } = calculateWorkingDaysOffsets(
            affectedTasks,
            holidays,
            calendarSettings
        );

        // 각 task의 초기 정보를 Map으로 구성 (모든 타입 포함)
        const taskDragInfoMap = new Map<string, TaskDragInfo>();
        for (const task of affectedTasks) {
            if (task.type === 'TASK' && task.task) {
                // TASK 타입: 간접작업일 정보 포함
                taskDragInfoMap.set(task.id, {
                    originalStartDate: task.startDate,
                    originalEndDate: task.endDate,
                    indirectWorkDaysPre: task.task.indirectWorkDaysPre,
                    netWorkDays: task.task.netWorkDays,
                    indirectWorkDaysPost: task.task.indirectWorkDaysPost,
                    currentStartDate: task.startDate,
                    currentEndDate: task.endDate,
                });
            } else if (task.type === 'GROUP' || task.type === 'CP' || task.type === 'BLOCK') {
                // GROUP/CP/BLOCK 타입: 실제 하위 태스크 범위로 계산
                // task.startDate/endDate 대신 calculateGroupDateRange()로 정확한 범위 사용
                const dateRange = calculateGroupDateRange(task.id, allTasks);
                if (dateRange) {
                    taskDragInfoMap.set(task.id, {
                        originalStartDate: dateRange.startDate,
                        originalEndDate: dateRange.endDate,
                        indirectWorkDaysPre: 0,
                        netWorkDays: 0,
                        indirectWorkDaysPost: 0,
                        currentStartDate: dateRange.startDate,
                        currentEndDate: dateRange.endDate,
                    });
                }
            }
        }

        start({
            groupId,
            startX: e.clientX,
            originalStartDate: taskData.startDate,
            originalEndDate: taskData.endDate,
            affectedTasks,
            currentDeltaDays: 0,
            taskDragInfoMap,
            referenceTask,
            workingDaysOffsets,
            currentDeltaWorkingDays: 0,
        });
    }, [onGroupDrag, allTasks, holidays, calendarSettings, start, groupDependencies]);

    // ========================================
    // 그룹 드래그 정보 조회 (하위 호환성)
    // ========================================
    const getDragInfo = useCallback((groupId: string): number => {
        if (dragState && dragState.groupId === groupId) {
            return dragState.currentDeltaDays;
        }
        return 0;
    }, [dragState]);

    // ========================================
    // 각 task별 스냅된 드래그 정보 조회 (새 방식)
    // ========================================
    const getTaskDragInfo = useCallback((taskId: string): {
        startDate: Date;
        endDate: Date;
    } | null => {
        // 1. 활성 드래그 상태 확인
        if (dragState) {
            const taskInfo = dragState.taskDragInfoMap.get(taskId);
            if (taskInfo) {
                return {
                    startDate: taskInfo.currentStartDate,
                    endDate: taskInfo.currentEndDate,
                };
            }
        }

        // 2. Pending 상태 확인 (드래그 완료 후 props 업데이트 대기 중)
        if (pendingState) {
            const taskInfo = pendingState.taskDragInfoMap.get(taskId);
            if (taskInfo) {
                return {
                    startDate: taskInfo.currentStartDate,
                    endDate: taskInfo.currentEndDate,
                };
            }
        }

        return null;
    }, [dragState, pendingState]);

    // 하위 호환성: deltaDays만 반환 (기존 방식)
    const getTaskDragDeltaDays = useCallback((taskId: string): number => {
        if (!dragState) return 0;

        const task = dragState.affectedTasks.find(t => t.id === taskId);
        if (!task) return 0;

        return dragState.currentDeltaDays;
    }, [dragState]);

    return {
        isDragging,
        handleGroupBarMouseDown: handleMouseDown,
        getGroupDragDeltaDays: getDragInfo,
        getTaskGroupDragDeltaDays: getTaskDragDeltaDays,
        getTaskDragInfo,  // 새 함수: 스냅된 시작일/종료일 포함
    };
};
