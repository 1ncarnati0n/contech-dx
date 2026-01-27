'use client';

import { useEffect, useRef, useMemo } from 'react';
import type { ConstructionTask, ViewMode, ZoomLevel } from '../../../types';

interface UseGanttInitOptions {
    tasks: ConstructionTask[];
    initialView: ViewMode;
    initialZoomLevel: ZoomLevel;
    initialExpandedIds?: string[];
    setViewMode: (mode: ViewMode, cpId?: string) => void;
    setZoomLevel: (level: ZoomLevel) => void;
    expandAll: (ids: string[]) => void;
    collapseAll: () => void;
}

export const useGanttInit = ({
    tasks,
    initialView,
    initialZoomLevel,
    initialExpandedIds,
    setViewMode,
    setZoomLevel,
    expandAll,
    collapseAll,
}: UseGanttInitOptions) => {
    const isInitialized = useRef(false);
    const taskIds = useMemo(() => tasks.map(t => t.id), [tasks]);

    useEffect(() => {
        if (isInitialized.current) return;
        isInitialized.current = true;

        setViewMode(initialView);
        setZoomLevel(initialZoomLevel);

        collapseAll();
        if (initialExpandedIds && initialExpandedIds.length > 0) {
            expandAll(initialExpandedIds);
        } else if (taskIds.length > 0) {
            expandAll(taskIds);
        }
    }, [taskIds, initialExpandedIds, initialView, initialZoomLevel, setViewMode, setZoomLevel, expandAll, collapseAll]);

    // 새로 생성된 GROUP 자동 확장
    const prevTaskIdsRef = useRef<Set<string>>(new Set());

    useEffect(() => {
        const currentIds = new Set(tasks.map(t => t.id));
        const prevIds = prevTaskIdsRef.current;

        const newGroupIds: string[] = [];
        tasks.forEach(task => {
            if (task.type === 'GROUP' && !prevIds.has(task.id)) {
                newGroupIds.push(task.id);
            }
        });

        if (newGroupIds.length > 0) {
            expandAll(newGroupIds);
        }

        prevTaskIdsRef.current = currentIds;
    }, [tasks, expandAll]);
};
