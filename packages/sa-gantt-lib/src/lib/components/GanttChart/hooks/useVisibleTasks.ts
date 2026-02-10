import { useMemo } from 'react';
import type { ConstructionTask, ViewMode } from '../../../types';

interface UseVisibleTasksOptions {
    tasks: ConstructionTask[];
    viewMode: ViewMode;
    activeCPId: string | null;
    expandedTaskIds: Set<string>;
}

const buildChildrenMap = (tasks: ConstructionTask[]): Map<string | null, ConstructionTask[]> => {
    const map = new Map<string | null, ConstructionTask[]>();

    tasks.forEach(task => {
        const parentId = task.parentId;
        const existingChildren = map.get(parentId);
        if (existingChildren) {
            existingChildren.push(task);
            return;
        }
        map.set(parentId, [task]);
    });

    return map;
};

const getMasterVisibleTasks = (
    childrenMap: Map<string | null, ConstructionTask[]>,
    expandedTaskIds: Set<string>
): ConstructionTask[] => {
    const visible: ConstructionTask[] = [];

    const collectVisible = (parentId: string | null) => {
        const children = childrenMap.get(parentId) || [];
        children.forEach(task => {
            if (task.type === 'BLOCK') {
                if (parentId === null || expandedTaskIds.has(parentId)) {
                    visible.push(task);
                    if (expandedTaskIds.has(task.id)) {
                        collectVisible(task.id);
                    }
                }
                return;
            }

            if (task.wbsLevel !== 1) return;

            if (parentId === null || expandedTaskIds.has(parentId)) {
                visible.push(task);
                if (task.type === 'GROUP' && expandedTaskIds.has(task.id)) {
                    collectVisible(task.id);
                }
            }
        });
    };

    collectVisible(null);
    return visible;
};

const getDetailVisibleTasks = (
    childrenMap: Map<string | null, ConstructionTask[]>,
    activeCPId: string | null,
    expandedTaskIds: Set<string>
): ConstructionTask[] => {
    if (!activeCPId) {
        return [];
    }

    const visible: ConstructionTask[] = [];

    const collectVisible = (parentId: string | null) => {
        const children = childrenMap.get(parentId) || [];
        children.forEach(task => {
            if (task.wbsLevel !== 2) return;

            if (parentId === activeCPId || (parentId !== null && expandedTaskIds.has(parentId))) {
                visible.push(task);
                if (task.type === 'GROUP') {
                    collectVisible(task.id);
                }
            }
        });
    };

    collectVisible(activeCPId);
    return visible;
};

const getUnifiedVisibleTasks = (
    childrenMap: Map<string | null, ConstructionTask[]>,
    expandedTaskIds: Set<string>
): ConstructionTask[] => {
    const visible: ConstructionTask[] = [];

    const collectVisible = (parentId: string | null) => {
        const children = childrenMap.get(parentId) || [];
        children.forEach(task => {
            if (task.wbsLevel === 1) {
                if (parentId === null || expandedTaskIds.has(parentId)) {
                    visible.push(task);
                    if (expandedTaskIds.has(task.id)) {
                        collectVisible(task.id);
                    }
                }
                return;
            }

            if (task.wbsLevel === 2) {
                visible.push(task);
                if (task.type === 'GROUP' && expandedTaskIds.has(task.id)) {
                    collectVisible(task.id);
                }
            }
        });
    };

    collectVisible(null);
    return visible;
};

export const useVisibleTasks = ({
    tasks,
    viewMode,
    activeCPId,
    expandedTaskIds,
}: UseVisibleTasksOptions): ConstructionTask[] => {
    const childrenMap = useMemo(() => buildChildrenMap(tasks), [tasks]);

    return useMemo(() => {
        if (viewMode === 'MASTER') {
            return getMasterVisibleTasks(childrenMap, expandedTaskIds);
        }

        if (viewMode === 'DETAIL') {
            return getDetailVisibleTasks(childrenMap, activeCPId, expandedTaskIds);
        }

        return getUnifiedVisibleTasks(childrenMap, expandedTaskIds);
    }, [childrenMap, viewMode, activeCPId, expandedTaskIds]);
};

