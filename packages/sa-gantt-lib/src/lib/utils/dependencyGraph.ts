// ============================================
// 종속성 그래프 유틸리티
// 양방향 연결 이동을 위한 그래프 탐색 로직
// ============================================

import type { ConstructionTask, AnchorDependency } from '../types';

/** 종속성 그래프 구조 */
export interface DependencyGraph {
    nodes: Map<string, ConstructionTask>;
    // taskId -> 해당 태스크에서 나가는 종속성들
    outgoingEdges: Map<string, AnchorDependency[]>;
    // taskId -> 해당 태스크로 들어오는 종속성들
    incomingEdges: Map<string, AnchorDependency[]>;
}

/**
 * 종속성 그래프 구축
 * @param tasks 모든 태스크 목록
 * @param dependencies 앵커 종속성 목록
 */
export const buildDependencyGraph = (
    tasks: ConstructionTask[],
    dependencies: AnchorDependency[]
): DependencyGraph => {
    const nodes = new Map<string, ConstructionTask>();
    const outgoingEdges = new Map<string, AnchorDependency[]>();
    const incomingEdges = new Map<string, AnchorDependency[]>();

    // 노드 초기화
    tasks.forEach(task => {
        nodes.set(task.id, task);
        outgoingEdges.set(task.id, []);
        incomingEdges.set(task.id, []);
    });

    // 엣지 추가
    dependencies.forEach(dep => {
        const outgoing = outgoingEdges.get(dep.sourceTaskId);
        const incoming = incomingEdges.get(dep.targetTaskId);

        if (outgoing) {
            outgoing.push(dep);
        }
        if (incoming) {
            incoming.push(dep);
        }
    });

    return { nodes, outgoingEdges, incomingEdges };
};

/**
 * 양방향으로 연결된 모든 태스크 수집 (BFS)
 * "하나의 간트바처럼" 이동하기 위해 연결된 모든 태스크를 찾음
 *
 * @param taskId 시작 태스크 ID
 * @param graph 종속성 그래프
 * @returns 연결된 모든 태스크 ID 배열 (시작 태스크 포함)
 */
export const collectConnectedTaskGroup = (
    taskId: string,
    graph: DependencyGraph
): string[] => {
    const visited = new Set<string>();
    const queue: string[] = [taskId];

    while (queue.length > 0) {
        const currentId = queue.shift()!;

        if (visited.has(currentId)) continue;
        visited.add(currentId);

        // 나가는 방향 탐색 (sourceTask -> targetTask)
        const outgoing = graph.outgoingEdges.get(currentId) || [];
        outgoing.forEach(dep => {
            if (!visited.has(dep.targetTaskId)) {
                queue.push(dep.targetTaskId);
            }
        });

        // 들어오는 방향 탐색 (sourceTask <- targetTask)
        const incoming = graph.incomingEdges.get(currentId) || [];
        incoming.forEach(dep => {
            if (!visited.has(dep.sourceTaskId)) {
                queue.push(dep.sourceTaskId);
            }
        });
    }

    return Array.from(visited);
};

/**
 * 단방향 후행 태스크만 수집 (선행 -> 후행 방향만)
 *
 * @param taskId 시작 태스크 ID
 * @param graph 종속성 그래프
 * @returns 후행 태스크 ID 배열 (시작 태스크 미포함)
 */
export const collectSuccessorTasks = (
    taskId: string,
    graph: DependencyGraph
): string[] => {
    const visited = new Set<string>();
    const queue: string[] = [taskId];
    visited.add(taskId); // 시작 태스크는 결과에서 제외

    while (queue.length > 0) {
        const currentId = queue.shift()!;

        const outgoing = graph.outgoingEdges.get(currentId) || [];
        outgoing.forEach(dep => {
            if (!visited.has(dep.targetTaskId)) {
                visited.add(dep.targetTaskId);
                queue.push(dep.targetTaskId);
            }
        });
    }

    // 시작 태스크 제거 후 반환
    visited.delete(taskId);
    return Array.from(visited);
};

/**
 * 단방향 선행 태스크만 수집 (후행 -> 선행 방향만)
 *
 * @param taskId 시작 태스크 ID
 * @param graph 종속성 그래프
 * @returns 선행 태스크 ID 배열 (시작 태스크 미포함)
 */
export const collectPredecessorTasks = (
    taskId: string,
    graph: DependencyGraph
): string[] => {
    const visited = new Set<string>();
    const queue: string[] = [taskId];
    visited.add(taskId);

    while (queue.length > 0) {
        const currentId = queue.shift()!;

        const incoming = graph.incomingEdges.get(currentId) || [];
        incoming.forEach(dep => {
            if (!visited.has(dep.sourceTaskId)) {
                visited.add(dep.sourceTaskId);
                queue.push(dep.sourceTaskId);
            }
        });
    }

    visited.delete(taskId);
    return Array.from(visited);
};

/**
 * 두 태스크 간 종속성 존재 여부 확인
 */
export const hasDependencyBetween = (
    sourceTaskId: string,
    targetTaskId: string,
    dependencies: AnchorDependency[]
): boolean => {
    return dependencies.some(
        dep =>
            (dep.sourceTaskId === sourceTaskId && dep.targetTaskId === targetTaskId) ||
            (dep.sourceTaskId === targetTaskId && dep.targetTaskId === sourceTaskId)
    );
};

/**
 * 특정 태스크와 연결된 모든 종속성 가져오기
 */
export const getDependenciesForTask = (
    taskId: string,
    dependencies: AnchorDependency[]
): AnchorDependency[] => {
    return dependencies.filter(
        dep => dep.sourceTaskId === taskId || dep.targetTaskId === taskId
    );
};

/**
 * 종속성이 있는 태스크인지 확인
 */
export const hasAnyDependency = (
    taskId: string,
    dependencies: AnchorDependency[]
): boolean => {
    return dependencies.some(
        dep => dep.sourceTaskId === taskId || dep.targetTaskId === taskId
    );
};

// ============================================
// 순환 참조 감지
// ============================================

/**
 * 순환 참조 감지 결과
 */
export interface CycleDetectionResult {
    /** 순환 참조 존재 여부 */
    hasCycle: boolean;
    /** 순환 경로 (taskId 배열). 순환이 없으면 빈 배열 */
    cyclePath: string[];
}

/**
 * 종속성 그래프에서 순환 참조 감지 (DFS 기반)
 *
 * @param graph 종속성 그래프
 * @returns 순환 감지 결과 (순환 여부 + 순환 경로)
 *
 * @example
 * const graph = buildDependencyGraph(tasks, dependencies);
 * const result = detectCyclicDependency(graph);
 * if (result.hasCycle) {
 *     console.log('Cycle detected:', result.cyclePath.join(' -> '));
 * }
 */
export const detectCyclicDependency = (
    graph: DependencyGraph
): CycleDetectionResult => {
    const visited = new Set<string>();
    const recursionStack = new Set<string>();
    const parentMap = new Map<string, string | null>();

    /**
     * DFS를 통한 순환 감지
     * @returns 순환이 발견되면 순환 시작 노드 ID, 없으면 null
     */
    const dfs = (nodeId: string): string | null => {
        visited.add(nodeId);
        recursionStack.add(nodeId);

        const outgoing = graph.outgoingEdges.get(nodeId) || [];

        for (const dep of outgoing) {
            const targetId = dep.targetTaskId;

            // 아직 방문하지 않은 노드
            if (!visited.has(targetId)) {
                parentMap.set(targetId, nodeId);
                const cycleStart = dfs(targetId);
                if (cycleStart !== null) {
                    return cycleStart;
                }
            }
            // 현재 재귀 스택에 있는 노드를 다시 만남 -> 순환 발견
            else if (recursionStack.has(targetId)) {
                parentMap.set(targetId, nodeId);
                return targetId;
            }
        }

        recursionStack.delete(nodeId);
        return null;
    };

    // 모든 노드에서 DFS 시작
    for (const nodeId of graph.nodes.keys()) {
        if (!visited.has(nodeId)) {
            parentMap.set(nodeId, null);
            const cycleStart = dfs(nodeId);

            if (cycleStart !== null) {
                // 순환 경로 재구성
                const cyclePath: string[] = [cycleStart];
                let current: string | null = parentMap.get(cycleStart) ?? null;

                while (current !== null && current !== cycleStart) {
                    cyclePath.unshift(current);
                    current = parentMap.get(current) ?? null;
                }

                // 순환 완성을 위해 시작점 추가
                if (current === cycleStart) {
                    cyclePath.unshift(cycleStart);
                }

                return { hasCycle: true, cyclePath };
            }
        }
    }

    return { hasCycle: false, cyclePath: [] };
};

/**
 * 새 종속성 추가 시 순환이 발생하는지 미리 검사
 *
 * @param sourceTaskId 출발 태스크 ID
 * @param targetTaskId 도착 태스크 ID
 * @param tasks 모든 태스크 목록
 * @param existingDependencies 기존 종속성 목록
 * @returns 순환 발생 시 true
 */
export const wouldCreateCycle = (
    sourceTaskId: string,
    targetTaskId: string,
    tasks: ConstructionTask[],
    existingDependencies: AnchorDependency[]
): boolean => {
    // 임시 종속성 생성
    const tempDependency: AnchorDependency = {
        id: '__temp_cycle_check__',
        sourceTaskId,
        targetTaskId,
        sourceDayIndex: 0,
        targetDayIndex: 0,
    };

    const graph = buildDependencyGraph(tasks, [...existingDependencies, tempDependency]);
    const result = detectCyclicDependency(graph);

    return result.hasCycle;
};

// ============================================
// 위상 정렬 및 겹침 방지 로직
// ============================================

/**
 * 연결된 task 그룹 내에서 위상 정렬 수행
 * @param connectedTaskIds 연결된 task ID 목록
 * @param graph 종속성 그래프
 * @returns 위상 정렬된 task ID 배열 (선행 → 후행 순서)
 */
export const topologicalSortConnectedTasks = (
    connectedTaskIds: string[],
    graph: DependencyGraph
): string[] => {
    const connectedSet = new Set(connectedTaskIds);
    const inDegree = new Map<string, number>();
    const result: string[] = [];

    // 연결된 task들만 대상으로 진입 차수 초기화
    connectedTaskIds.forEach(taskId => {
        inDegree.set(taskId, 0);
    });

    // 연결된 task 간의 종속성만 고려하여 진입 차수 계산
    connectedTaskIds.forEach(taskId => {
        const incoming = graph.incomingEdges.get(taskId) || [];
        incoming.forEach(dep => {
            if (connectedSet.has(dep.sourceTaskId)) {
                inDegree.set(taskId, (inDegree.get(taskId) || 0) + 1);
            }
        });
    });

    // 진입 차수가 0인 노드들로 큐 초기화
    const queue: string[] = [];
    connectedTaskIds.forEach(taskId => {
        if (inDegree.get(taskId) === 0) {
            queue.push(taskId);
        }
    });

    // BFS로 위상 정렬
    while (queue.length > 0) {
        const current = queue.shift()!;
        result.push(current);

        const outgoing = graph.outgoingEdges.get(current) || [];
        outgoing.forEach(dep => {
            if (connectedSet.has(dep.targetTaskId)) {
                const newDegree = (inDegree.get(dep.targetTaskId) || 1) - 1;
                inDegree.set(dep.targetTaskId, newDegree);
                if (newDegree === 0) {
                    queue.push(dep.targetTaskId);
                }
            }
        });
    }

    return result;
};

/**
 * 겹침 방지를 위한 task별 개별 deltaDays 계산
 * 후행 task가 선행 task 끝 이후에만 배치되도록 보장
 *
 * @param draggedTaskId 드래그 중인 task ID
 * @param baseDeltaDays 기본 이동량 (드래그로 인한 일수)
 * @param connectedTaskIds 연결된 모든 task ID
 * @param graph 종속성 그래프
 * @param tasks task 목록
 * @returns taskId -> 개별 조정된 deltaDays Map
 */
export const calculateChainedDeltaDays = (
    _draggedTaskId: string,  // 향후 확장용 (현재 미사용)
    baseDeltaDays: number,
    connectedTaskIds: string[],
    graph: DependencyGraph,
    tasks: ConstructionTask[]
): Map<string, number> => {
    const deltaMap = new Map<string, number>();
    const taskMap = new Map<string, ConstructionTask>();

    // task 맵 구축
    tasks.forEach(t => taskMap.set(t.id, t));

    // 위상 정렬
    const sorted = topologicalSortConnectedTasks(connectedTaskIds, graph);

    // 모든 task에 기본 deltaDays 적용
    sorted.forEach(taskId => {
        deltaMap.set(taskId, baseDeltaDays);
    });

    // 새 위치 계산용 맵 (startDate, endDate)
    const newPositions = new Map<string, { start: Date; end: Date }>();

    // 선행-후행 간 최소 간격 (일)
    const MIN_GAP_DAYS = 1;

    // 위상 정렬 순서대로 처리하며 겹침 보정
    sorted.forEach(taskId => {
        const task = taskMap.get(taskId);
        if (!task) return;

        const currentDelta = deltaMap.get(taskId) ?? baseDeltaDays;
        let newStart = new Date(task.startDate);
        newStart.setDate(newStart.getDate() + currentDelta);
        let newEnd = new Date(task.endDate);
        newEnd.setDate(newEnd.getDate() + currentDelta);

        // 이 task로 들어오는 종속성 확인 (선행 task들)
        const incoming = graph.incomingEdges.get(taskId) || [];

        // 모든 선행 task 중 가장 늦은 종료일 찾기
        let latestPredEnd: Date | null = null;
        incoming.forEach(dep => {
            const predPos = newPositions.get(dep.sourceTaskId);
            if (predPos) {
                if (!latestPredEnd || predPos.end > latestPredEnd) {
                    latestPredEnd = new Date(predPos.end);
                }
            }
        });

        // 가장 늦은 선행 task 종료일 + MIN_GAP_DAYS 이후로 시작해야 함
        if (latestPredEnd) {
            const minStart = new Date(latestPredEnd);
            minStart.setDate(minStart.getDate() + MIN_GAP_DAYS);

            if (newStart < minStart) {
                // 겹침 발생! 추가 밀어내기 필요
                const additionalDays = Math.ceil(
                    (minStart.getTime() - newStart.getTime()) / (1000 * 60 * 60 * 24)
                );
                const adjustedDelta = currentDelta + additionalDays;
                deltaMap.set(taskId, adjustedDelta);

                // 새 위치 재계산
                newStart = new Date(task.startDate);
                newStart.setDate(newStart.getDate() + adjustedDelta);
                newEnd = new Date(task.endDate);
                newEnd.setDate(newEnd.getDate() + adjustedDelta);
            }
        }

        newPositions.set(taskId, { start: newStart, end: newEnd });
    });

    return deltaMap;
};
