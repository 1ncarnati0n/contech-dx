'use client';

import { useMemo, useCallback } from 'react';
import type { ConstructionTask, ViewMode } from '../../../types';

// ============================================
// useExpandCollapse Hook
// ============================================
// 단계별 펼치기/접기 로직 캡슐화

interface UseExpandCollapseOptions {
    tasks: ConstructionTask[];
    viewMode: ViewMode;
    activeCPId: string | null;
    expandedTaskIds: Set<string>;
    setExpandedTaskIds: (ids: Set<string>) => void;
}

interface UseExpandCollapseReturn {
    /** 다음 레벨 펼치기 */
    expandNextLevel: () => void;
    /** 마지막 레벨 접기 */
    collapseLastLevel: () => void;
    /** 특정 태스크의 depth 계산 */
    getDepthForTask: (task: ConstructionTask) => number;
}

export const useExpandCollapse = ({
    tasks,
    viewMode,
    activeCPId,
    expandedTaskIds,
    setExpandedTaskIds,
}: UseExpandCollapseOptions): UseExpandCollapseReturn => {
    // ========================================
    // Task ID → Task 매핑 (O(1) 조회용)
    // ========================================
    const taskMap = useMemo(() =>
        new Map(tasks.map(t => [t.id, t])),
        [tasks]
    );

    // ========================================
    // Depth 계산 함수 (viewMode별)
    // ========================================
    const getDepthForTask = useCallback((task: ConstructionTask): number => {
        if (viewMode === 'UNIFIED') {
            // UNIFIED: Block=0, CP=1, DetailGroup=2+
            if (task.type === 'GROUP') {
                const parent = task.parentId ? taskMap.get(task.parentId) : null;
                if (!parent || parent.type !== 'CP') return 0; // Block
                return 2; // Detail Group
            }
            if (task.type === 'CP') return 1;
            return 2; // Task
        }

        if (viewMode === 'DETAIL') {
            // DETAIL: CP 기준 상대 depth
            let depth = 0;
            let currentId: string | null | undefined = task.parentId;
            while (currentId) {
                const parent = taskMap.get(currentId);
                if (!parent) break;
                if (parent.type === 'CP') break;
                if (parent.type === 'GROUP') depth++;
                currentId = parent.parentId;
            }
            return depth;
        }

        // MASTER: 기본 로직
        let depth = 0;
        let currentId: string | null | undefined = task.parentId;
        while (currentId) {
            const parent = taskMap.get(currentId);
            if (!parent) break;
            if (parent.type === 'GROUP') depth++;
            currentId = parent.parentId;
        }
        return depth;
    }, [viewMode, taskMap]);

    // ========================================
    // 확장 가능한 항목들 Map
    // ========================================
    const expandableItemsMap = useMemo(() => {
        const filterByView = (task: ConstructionTask) => {
            if (viewMode === 'MASTER') {
                return task.wbsLevel === 1 && task.type === 'GROUP';
            } else if (viewMode === 'DETAIL') {
                return task.wbsLevel >= 2 && task.type === 'GROUP';
            } else {
                return task.type === 'GROUP' || task.type === 'CP';
            }
        };

        const map = new Map<string, { id: string; depth: number; parentId: string | null | undefined }>();
        tasks.filter(filterByView).forEach(t => {
            map.set(t.id, {
                id: t.id,
                depth: getDepthForTask(t),
                parentId: t.parentId,
            });
        });
        return map;
    }, [tasks, viewMode, getDepthForTask]);

    // ========================================
    // 부모가 확장되어 있는지 확인
    // ========================================
    const isParentExpanded = useCallback((taskId: string): boolean => {
        const item = expandableItemsMap.get(taskId);
        if (!item) return false;

        if (!item.parentId) return true;

        if (viewMode === 'DETAIL') {
            if (item.parentId === activeCPId) return true;
        }

        return expandedTaskIds.has(item.parentId);
    }, [expandableItemsMap, viewMode, activeCPId, expandedTaskIds]);

    // ========================================
    // 다음 레벨 펼치기
    // ========================================
    const expandNextLevel = useCallback(() => {
        const expandedDepths: number[] = [];
        expandedTaskIds.forEach(id => {
            const item = expandableItemsMap.get(id);
            if (item) expandedDepths.push(item.depth);
        });

        const currentMaxDepth = expandedDepths.length > 0
            ? Math.max(...expandedDepths)
            : -1;
        const nextDepth = currentMaxDepth + 1;

        const itemsToExpand: string[] = [];
        expandableItemsMap.forEach((item) => {
            if (item.depth === nextDepth && isParentExpanded(item.id)) {
                itemsToExpand.push(item.id);
            }
        });

        if (itemsToExpand.length > 0) {
            const newExpanded = new Set([...expandedTaskIds, ...itemsToExpand]);
            setExpandedTaskIds(newExpanded);
        }
    }, [expandableItemsMap, expandedTaskIds, isParentExpanded, setExpandedTaskIds]);

    // ========================================
    // 마지막 레벨 접기
    // ========================================
    const collapseLastLevel = useCallback(() => {
        const expandedDepths: number[] = [];
        expandedTaskIds.forEach(id => {
            const item = expandableItemsMap.get(id);
            if (item) expandedDepths.push(item.depth);
        });

        if (expandedDepths.length === 0) return;

        const maxDepth = Math.max(...expandedDepths);

        const newExpanded = new Set(
            [...expandedTaskIds].filter(id => {
                const item = expandableItemsMap.get(id);
                return item ? item.depth < maxDepth : true;
            })
        );

        setExpandedTaskIds(newExpanded);
    }, [expandableItemsMap, expandedTaskIds, setExpandedTaskIds]);

    return {
        expandNextLevel,
        collapseLastLevel,
        getDepthForTask,
    };
};
