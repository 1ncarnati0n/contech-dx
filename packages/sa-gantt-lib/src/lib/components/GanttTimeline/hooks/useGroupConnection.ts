'use client';

import { useState, useCallback } from 'react';
import type { GroupDependency, ConstructionTask } from '../../../types';
import { generateId } from '../../../utils/uuid';

// ============================================
// Types
// ============================================

/** 연결 시작 상태 (Group 끝점 클릭 시 저장) */
export interface GroupConnectingState {
    groupId: string;
    edge: 'start' | 'end';
}

/** 순환 감지 정보 */
export interface GroupCycleDetectedInfo {
    sourceGroupId: string;
    targetGroupId: string;
}

/** 훅 옵션 */
interface UseGroupConnectionOptions {
    dependencies: GroupDependency[];
    tasks: ConstructionTask[];
    onDependencyCreate?: (dependency: GroupDependency) => void;
    onDependencyDelete?: (depId: string) => void;
    /** 순환 종속성 감지 시 호출되는 콜백 */
    onCycleDetected?: (info: GroupCycleDetectedInfo) => void;
}

/** 마우스 위치 */
export interface MousePosition {
    x: number;
    y: number;
}

/** 훅 반환 타입 */
interface UseGroupConnectionReturn {
    connectingFrom: GroupConnectingState | null;
    hoveredGroupEdge: { groupId: string; edge: 'start' | 'end' } | null;
    selectedDepId: string | null;
    hoveredDepId: string | null;
    isConnecting: boolean;
    mousePosition: MousePosition | null;
    handleGroupEdgeClick: (groupId: string, edge: 'start' | 'end') => void;
    handleGroupEdgeHover: (groupId: string, edge: 'start' | 'end' | null) => void;
    handleDependencyClick: (depId: string) => void;
    handleDependencyHover: (depId: string | null) => void;
    handleMouseMove: (position: MousePosition | null) => void;
    cancelConnection: () => void;
    deleteSelectedDependency: () => void;
    clearSelection: () => void;
}

// ============================================
// Utility Functions
// ============================================

/**
 * 새 종속성 추가 시 순환이 발생하는지 미리 검사 (Group 기반)
 */
const wouldCreateGroupCycle = (
    sourceGroupId: string,
    targetGroupId: string,
    existingDependencies: GroupDependency[]
): boolean => {
    // BFS로 sourceGroup에서 targetGroup으로 이미 도달 가능한지 확인
    // 도달 가능하면 새 연결(target -> source 방향)이 순환을 만듦
    const visited = new Set<string>();
    const queue: string[] = [targetGroupId];

    while (queue.length > 0) {
        const currentId = queue.shift()!;
        if (currentId === sourceGroupId) {
            return true; // 순환 발생
        }
        if (visited.has(currentId)) continue;
        visited.add(currentId);

        // currentId에서 나가는 종속성 찾기
        existingDependencies.forEach(dep => {
            if (dep.sourceGroupId === currentId && !visited.has(dep.targetGroupId)) {
                queue.push(dep.targetGroupId);
            }
        });
    }

    return false;
};

// ============================================
// Hook Implementation
// ============================================

/**
 * Group 바 연결 관리 훅
 * - Group 바 끝점 클릭으로 FS 종속성 생성
 * - 종속성 선택/삭제
 *
 * 연결 규칙:
 * - 'end' 클릭: 연결 시작 (선행 Group - Source)
 * - 'start' 클릭: 연결 완료 (후행 Group - Target)
 */
export const useGroupConnection = ({
    dependencies,
    tasks,
    onDependencyCreate,
    onDependencyDelete,
    onCycleDetected,
}: UseGroupConnectionOptions): UseGroupConnectionReturn => {
    const [connectingFrom, setConnectingFrom] = useState<GroupConnectingState | null>(null);
    const [hoveredGroupEdge, setHoveredGroupEdge] = useState<{
        groupId: string;
        edge: 'start' | 'end';
    } | null>(null);
    const [selectedDepId, setSelectedDepId] = useState<string | null>(null);
    const [hoveredDepId, setHoveredDepId] = useState<string | null>(null);
    const [mousePosition, setMousePosition] = useState<MousePosition | null>(null);

    // Group 바 edge 클릭 핸들러
    const handleGroupEdgeClick = useCallback(
        (groupId: string, edge: 'start' | 'end') => {
            // Group 타입인지 확인
            const task = tasks.find(t => t.id === groupId);
            if (!task || task.type !== 'GROUP') {
                console.warn(`[useGroupConnection] Task ${groupId} is not a GROUP type`);
                return;
            }

            if (!connectingFrom) {
                // 연결 시작: 'end' 클릭만 허용 (선행 Group의 끝점)
                if (edge === 'end') {
                    setConnectingFrom({ groupId, edge });
                    setSelectedDepId(null);
                }
                // 'start' 클릭은 무시 (연결 시작점이 될 수 없음)
            } else {
                // 연결 완료: 'start' 클릭만 허용 (후행 Group의 시작점)
                if (edge === 'start' && connectingFrom.groupId !== groupId) {
                    // 이미 존재하는 종속성인지 확인
                    const exists = dependencies.some(
                        dep =>
                            dep.sourceGroupId === connectingFrom.groupId &&
                            dep.targetGroupId === groupId
                    );

                    if (!exists && onDependencyCreate) {
                        // 순환 종속성 검사
                        const createsCycle = wouldCreateGroupCycle(
                            connectingFrom.groupId,
                            groupId,
                            dependencies
                        );

                        if (createsCycle) {
                            onCycleDetected?.({
                                sourceGroupId: connectingFrom.groupId,
                                targetGroupId: groupId,
                            });
                        } else {
                            // 새 종속성 생성
                            const newDep: GroupDependency = {
                                id: generateId(),
                                sourceGroupId: connectingFrom.groupId,
                                targetGroupId: groupId,
                                type: 'FS',
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

    // Group edge 호버 핸들러
    const handleGroupEdgeHover = useCallback(
        (groupId: string, edge: 'start' | 'end' | null) => {
            if (edge === null) {
                setHoveredGroupEdge(null);
            } else {
                setHoveredGroupEdge({ groupId, edge });
            }
        },
        []
    );

    // 종속성 선 클릭 핸들러
    const handleDependencyClick = useCallback((depId: string) => {
        setSelectedDepId(prev => (prev === depId ? null : depId));
        setConnectingFrom(null);
    }, []);

    // 종속성 선 호버 핸들러
    const handleDependencyHover = useCallback((depId: string | null) => {
        setHoveredDepId(depId);
    }, []);

    // 마우스 위치 업데이트 핸들러 (프리뷰 라인용)
    const handleMouseMove = useCallback((position: MousePosition | null) => {
        setMousePosition(position);
    }, []);

    // 연결 취소
    const cancelConnection = useCallback(() => {
        setConnectingFrom(null);
        setMousePosition(null);
    }, []);

    // 선택 해제 (빈 공간 클릭 시)
    const clearSelection = useCallback(() => {
        setSelectedDepId(null);
        setConnectingFrom(null);
        setMousePosition(null);
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
        hoveredGroupEdge,
        selectedDepId,
        hoveredDepId,
        isConnecting: connectingFrom !== null,
        mousePosition,
        handleGroupEdgeClick,
        handleGroupEdgeHover,
        handleDependencyClick,
        handleDependencyHover,
        handleMouseMove,
        cancelConnection,
        deleteSelectedDependency,
        clearSelection,
    };
};
