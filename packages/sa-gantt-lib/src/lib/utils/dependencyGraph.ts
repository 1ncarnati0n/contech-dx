// ============================================
// 종속성 그래프 유틸리티
// GROUP 바 간 FS (Finish-to-Start) 연결을 위한 그래프 탐색 로직
// ============================================

import type { ConstructionTask, GroupDependency } from '../types';

// ============================================
// 순환 참조 감지
// ============================================

/**
 * 순환 참조 감지 결과
 */
export interface CycleDetectionResult {
    /** 순환 참조 존재 여부 */
    hasCycle: boolean;
    /** 순환 경로 (groupId 배열). 순환이 없으면 빈 배열 */
    cyclePath: string[];
}

// ============================================
// GroupDependency 전용 유틸리티
// ============================================

/** Group 종속성 그래프 구조 */
export interface GroupDependencyGraph {
    nodes: Map<string, ConstructionTask>;
    // groupId -> 해당 그룹에서 나가는 종속성들
    outgoingEdges: Map<string, GroupDependency[]>;
    // groupId -> 해당 그룹으로 들어오는 종속성들
    incomingEdges: Map<string, GroupDependency[]>;
}

/**
 * Group 종속성 그래프 구축
 * @param tasks 모든 태스크 목록 (BLOCK, GROUP 타입을 노드로 추가)
 * @param dependencies Group 종속성 목록
 */
export const buildGroupDependencyGraph = (
    tasks: ConstructionTask[],
    dependencies: GroupDependency[]
): GroupDependencyGraph => {
    const nodes = new Map<string, ConstructionTask>();
    const outgoingEdges = new Map<string, GroupDependency[]>();
    const incomingEdges = new Map<string, GroupDependency[]>();

    // BLOCK, GROUP 타입을 노드로 초기화
    tasks.forEach(task => {
        if (task.type === 'BLOCK' || task.type === 'GROUP') {
            nodes.set(task.id, task);
            outgoingEdges.set(task.id, []);
            incomingEdges.set(task.id, []);
        }
    });

    // 엣지 추가
    dependencies.forEach(dep => {
        const outgoing = outgoingEdges.get(dep.sourceGroupId);
        const incoming = incomingEdges.get(dep.targetGroupId);

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
 * 양방향으로 연결된 모든 Group 수집 (BFS)
 */
export const collectConnectedGroupCluster = (
    groupId: string,
    graph: GroupDependencyGraph
): string[] => {
    const visited = new Set<string>();
    const queue: string[] = [groupId];

    while (queue.length > 0) {
        const currentId = queue.shift();
        if (!currentId) {
            break;
        }

        if (visited.has(currentId)) continue;
        visited.add(currentId);

        // 나가는 방향 탐색
        const outgoing = graph.outgoingEdges.get(currentId) || [];
        outgoing.forEach(dep => {
            if (!visited.has(dep.targetGroupId)) {
                queue.push(dep.targetGroupId);
            }
        });

        // 들어오는 방향 탐색
        const incoming = graph.incomingEdges.get(currentId) || [];
        incoming.forEach(dep => {
            if (!visited.has(dep.sourceGroupId)) {
                queue.push(dep.sourceGroupId);
            }
        });
    }

    return Array.from(visited);
};

/**
 * Group 종속성 그래프에서 순환 참조 감지 (DFS 기반)
 */
export const detectGroupCyclicDependency = (
    graph: GroupDependencyGraph
): CycleDetectionResult => {
    const visited = new Set<string>();
    const recursionStack = new Set<string>();
    const parentMap = new Map<string, string | null>();

    const dfs = (nodeId: string): string | null => {
        visited.add(nodeId);
        recursionStack.add(nodeId);

        const outgoing = graph.outgoingEdges.get(nodeId) || [];

        for (const dep of outgoing) {
            const targetId = dep.targetGroupId;

            if (!visited.has(targetId)) {
                parentMap.set(targetId, nodeId);
                const cycleStart = dfs(targetId);
                if (cycleStart !== null) {
                    return cycleStart;
                }
            } else if (recursionStack.has(targetId)) {
                parentMap.set(targetId, nodeId);
                return targetId;
            }
        }

        recursionStack.delete(nodeId);
        return null;
    };

    for (const nodeId of graph.nodes.keys()) {
        if (!visited.has(nodeId)) {
            parentMap.set(nodeId, null);
            const cycleStart = dfs(nodeId);

            if (cycleStart !== null) {
                const cyclePath: string[] = [cycleStart];
                let current: string | null = parentMap.get(cycleStart) ?? null;

                while (current !== null && current !== cycleStart) {
                    cyclePath.unshift(current);
                    current = parentMap.get(current) ?? null;
                }

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
 * 새 Group 종속성 추가 시 순환이 발생하는지 미리 검사
 */
export const wouldCreateGroupCycle = (
    sourceGroupId: string,
    targetGroupId: string,
    tasks: ConstructionTask[],
    existingDependencies: GroupDependency[]
): boolean => {
    const tempDependency: GroupDependency = {
        id: '__temp_group_cycle_check__',
        sourceGroupId,
        targetGroupId,
        type: 'FS',
    };

    const graph = buildGroupDependencyGraph(tasks, [...existingDependencies, tempDependency]);
    const result = detectGroupCyclicDependency(graph);

    return result.hasCycle;
};

/**
 * Group이 종속성을 가지고 있는지 확인
 */
export const hasAnyGroupDependency = (
    groupId: string,
    dependencies: GroupDependency[]
): boolean => {
    return dependencies.some(
        dep => dep.sourceGroupId === groupId || dep.targetGroupId === groupId
    );
};

/**
 * 특정 Group과 연결된 모든 종속성 가져오기
 */
export const getDependenciesForGroup = (
    groupId: string,
    dependencies: GroupDependency[]
): GroupDependency[] => {
    return dependencies.filter(
        dep => dep.sourceGroupId === groupId || dep.targetGroupId === groupId
    );
};

/**
 * 두 Group 간 종속성 존재 여부 확인
 */
export const hasGroupDependencyBetween = (
    sourceGroupId: string,
    targetGroupId: string,
    dependencies: GroupDependency[]
): boolean => {
    return dependencies.some(
        dep =>
            (dep.sourceGroupId === sourceGroupId && dep.targetGroupId === targetGroupId) ||
            (dep.sourceGroupId === targetGroupId && dep.targetGroupId === sourceGroupId)
    );
};
