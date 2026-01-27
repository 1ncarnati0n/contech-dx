'use client';

import { useState, useCallback } from 'react';
import type { AnchorDependency, ConstructionTask } from '../../../types';
import { wouldCreateCycle } from '../../../utils/dependencyGraph';

/** 연결 시작 상태 (dayIndex 기반) */
export interface ConnectingState {
    taskId: string;
    dayIndex: number;
}

/** 순환 감지 정보 */
export interface CycleDetectedInfo {
    sourceTaskId: string;
    targetTaskId: string;
}

/** 훅 옵션 */
interface UseAnchorConnectionOptions {
    dependencies: AnchorDependency[];
    tasks: ConstructionTask[];
    onDependencyCreate?: (dependency: AnchorDependency) => void;
    onDependencyDelete?: (depId: string) => void;
    /** 순환 종속성 감지 시 호출되는 콜백 */
    onCycleDetected?: (info: CycleDetectedInfo) => void;
}

/**
 * dayIndex가 해당 태스크에 대해 유효한지 검증
 * - 음수 dayIndex: -indirectWorkDaysPre ~ -1 범위만 유효
 * - 0 이상: 0 ~ netWorkDays + indirectWorkDaysPost 범위
 */
const isValidDayIndex = (task: ConstructionTask | undefined, dayIndex: number): boolean => {
    if (!task) return false;

    // Level 1 태스크 (task.task 없음)
    if (!task.task) {
        // task.task가 없으면 순작업만 있음 (간접작업 없음)
        // 음수 dayIndex는 유효하지 않음
        if (dayIndex < 0) {
            console.warn(
                `[isValidDayIndex] Negative dayIndex ${dayIndex} is invalid ` +
                `for task ${task.id} without indirect work data.`
            );
            return false;
        }
        return true;
    }

    const { indirectWorkDaysPre, netWorkDays, indirectWorkDaysPost } = task.task;

    // 음수 dayIndex 범위 검증
    if (dayIndex < 0) {
        const minValidIndex = -indirectWorkDaysPre;
        if (dayIndex < minValidIndex) {
            console.warn(
                `[isValidDayIndex] dayIndex ${dayIndex} is out of range. ` +
                `Valid range for task ${task.id}: ${minValidIndex} to -1`
            );
            return false;
        }
        return true;
    }

    // 양수 dayIndex 범위 검증 (순작업 + 뒤 간접작업)
    const maxValidIndex = netWorkDays + indirectWorkDaysPost;
    if (dayIndex > maxValidIndex) {
        console.warn(
            `[isValidDayIndex] dayIndex ${dayIndex} is out of range. ` +
            `Valid range for task ${task.id}: 0 to ${maxValidIndex}`
        );
        return false;
    }

    return true;
};

/** 훅 반환 타입 */
interface UseAnchorConnectionReturn {
    connectingFrom: ConnectingState | null;
    hoveredAnchor: { taskId: string; dayIndex: number } | null;
    selectedDepId: string | null;
    hoveredDepId: string | null;
    isConnecting: boolean;
    handleAnchorClick: (taskId: string, dayIndex: number) => void;
    handleAnchorHover: (taskId: string, dayIndex: number | null) => void;
    handleDependencyClick: (depId: string) => void;
    handleDependencyHover: (depId: string | null) => void;
    cancelConnection: () => void;
    deleteSelectedDependency: () => void;
    clearSelection: () => void;
}

/**
 * 앵커 연결 관리 훅
 * - 앵커 클릭으로 종속성 생성 (dayIndex 기반)
 * - 종속성 선택/삭제
 */
export const useAnchorConnection = ({
    dependencies,
    tasks,
    onDependencyCreate,
    onDependencyDelete,
    onCycleDetected,
}: UseAnchorConnectionOptions): UseAnchorConnectionReturn => {
    const [connectingFrom, setConnectingFrom] = useState<ConnectingState | null>(null);
    const [hoveredAnchor, setHoveredAnchor] = useState<{
        taskId: string;
        dayIndex: number;
    } | null>(null);
    const [selectedDepId, setSelectedDepId] = useState<string | null>(null);
    const [hoveredDepId, setHoveredDepId] = useState<string | null>(null);

    // 앵커 클릭 핸들러 (dayIndex 기반)
    const handleAnchorClick = useCallback(
        (taskId: string, dayIndex: number) => {
            if (!connectingFrom) {
                // 연결 시작
                setConnectingFrom({ taskId, dayIndex });
                setSelectedDepId(null);
            } else {
                // 연결 완료
                if (connectingFrom.taskId !== taskId) {
                    // 다른 태스크 앵커 클릭 시 종속성 생성
                    // 이미 존재하는 종속성인지 확인
                    const exists = dependencies.some(
                        (dep) =>
                            (dep.sourceTaskId === connectingFrom.taskId &&
                                dep.targetTaskId === taskId &&
                                dep.sourceDayIndex === connectingFrom.dayIndex &&
                                dep.targetDayIndex === dayIndex) ||
                            (dep.sourceTaskId === taskId &&
                                dep.targetTaskId === connectingFrom.taskId &&
                                dep.sourceDayIndex === dayIndex &&
                                dep.targetDayIndex === connectingFrom.dayIndex)
                    );

                    if (!exists && onDependencyCreate) {
                        // dayIndex 유효성 검증
                        const sourceTask = tasks.find(t => t.id === connectingFrom.taskId);
                        const targetTask = tasks.find(t => t.id === taskId);

                        const isSourceValid = isValidDayIndex(sourceTask, connectingFrom.dayIndex);
                        const isTargetValid = isValidDayIndex(targetTask, dayIndex);

                        if (!isSourceValid || !isTargetValid) {
                            // dayIndex가 유효하지 않으면 연결 차단
                            console.warn(
                                `[handleAnchorClick] Blocking dependency creation due to invalid dayIndex. ` +
                                `Source: ${connectingFrom.taskId}[${connectingFrom.dayIndex}], ` +
                                `Target: ${taskId}[${dayIndex}]`
                            );
                            setConnectingFrom(null);
                            return;
                        }

                        // 순환 종속성 검사
                        const createsCycle = wouldCreateCycle(
                            connectingFrom.taskId,
                            taskId,
                            tasks,
                            dependencies
                        );

                        if (createsCycle) {
                            // 순환이 발생하면 콜백 호출 후 연결 차단
                            onCycleDetected?.({
                                sourceTaskId: connectingFrom.taskId,
                                targetTaskId: taskId,
                            });
                        } else {
                            // 순환이 없으면 종속성 생성
                            const newDep: AnchorDependency = {
                                id: `dep-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
                                sourceTaskId: connectingFrom.taskId,
                                targetTaskId: taskId,
                                sourceDayIndex: connectingFrom.dayIndex,
                                targetDayIndex: dayIndex,
                            };
                            onDependencyCreate(newDep);
                        }
                    }
                }
                // 연결 상태 초기화
                setConnectingFrom(null);
            }
        },
        [connectingFrom, dependencies, tasks, onDependencyCreate, onCycleDetected]
    );

    // 앵커 호버 핸들러
    const handleAnchorHover = useCallback(
        (taskId: string, dayIndex: number | null) => {
            if (dayIndex === null) {
                setHoveredAnchor(null);
            } else {
                setHoveredAnchor({ taskId, dayIndex });
            }
        },
        []
    );

    // 종속성 선 클릭 핸들러
    const handleDependencyClick = useCallback((depId: string) => {
        setSelectedDepId((prev) => (prev === depId ? null : depId));
        setConnectingFrom(null);
    }, []);

    // 종속성 선 호버 핸들러
    const handleDependencyHover = useCallback((depId: string | null) => {
        setHoveredDepId(depId);
    }, []);

    // 연결 취소
    const cancelConnection = useCallback(() => {
        setConnectingFrom(null);
    }, []);

    // 선택 해제 (빈 공간 클릭 시)
    const clearSelection = useCallback(() => {
        setSelectedDepId(null);
        setConnectingFrom(null);
    }, []);

    // 선택된 종속성 삭제
    const deleteSelectedDependency = useCallback(() => {
        if (selectedDepId && onDependencyDelete) {
            onDependencyDelete(selectedDepId);
            setSelectedDepId(null);
        }
    }, [selectedDepId, onDependencyDelete]);

    return {
        connectingFrom,
        hoveredAnchor,
        selectedDepId,
        hoveredDepId,
        isConnecting: connectingFrom !== null,
        handleAnchorClick,
        handleAnchorHover,
        handleDependencyClick,
        handleDependencyHover,
        cancelConnection,
        deleteSelectedDependency,
        clearSelection,
    };
};
