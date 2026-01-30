'use client';

import { useState, useCallback, useMemo } from 'react';
import type { ConstructionTask, DropPosition } from '../../../types';
import { canMoveTaskTo } from '../../../utils/hierarchyValidation';

interface UseSidebarDragDropOptions {
    tasks: ConstructionTask[];
    allTasks?: ConstructionTask[];  // 계층 검증용 전체 태스크
    onTaskReorder?: (taskId: string, newIndex: number) => void;
    onTaskMove?: (taskId: string, targetId: string, position: DropPosition) => void;
    rowHeight?: number;
    contentHeight?: number;  // 실제 콘텐츠 높이 (dynamicTotalHeight)
}

// 특수 ID: 최상단/최하단 드롭 존
export const DROP_ZONE_FIRST = '__DROP_ZONE_FIRST__';
export const DROP_ZONE_LAST = '__DROP_ZONE_LAST__';

// 투명 드래그 이미지 (브라우저 기본 아이콘 방지)
// 브라우저 환경에서만 생성, lazy initialization으로 SSR 호환
let transparentDragImage: HTMLImageElement | null = null;
const getTransparentDragImage = (): HTMLImageElement => {
    if (!transparentDragImage && typeof window !== 'undefined') {
        transparentDragImage = new Image();
        // 1x1 투명 GIF (Base64 인코딩)
        transparentDragImage.src = 'data:image/gif;base64,R0lGODlhAQABAIAAAAAAAP///yH5BAEAAAAALAAAAAABAAEAAAIBRAA7';
    }
    return transparentDragImage!;
};

export const useSidebarDragDrop = ({
    tasks,
    allTasks,
    onTaskReorder,
    onTaskMove,
    rowHeight = 36,
    contentHeight,
}: UseSidebarDragDropOptions) => {
    const [draggedTaskId, setDraggedTaskId] = useState<string | null>(null);
    const [dragOverTaskId, setDragOverTaskId] = useState<string | null>(null);
    const [dragOverPosition, setDragOverPosition] = useState<DropPosition | null>(null);

    // Task ID → Task 맵 (계층 검증용)
    const taskMap = useMemo(() => {
        const all = allTasks || tasks;
        return new Map(all.map(t => [t.id, t]));
    }, [allTasks, tasks]);

    const handleDragStart = useCallback((e: React.DragEvent, taskId: string) => {
        e.dataTransfer.effectAllowed = 'move';
        e.dataTransfer.setData('text/plain', taskId);
        setDraggedTaskId(taskId);

        // 사전 로딩된 투명 이미지 사용 (브라우저 기본 아이콘 방지)
        e.dataTransfer.setDragImage(getTransparentDragImage(), 0, 0);
    }, []);

    const handleDragOver = useCallback((e: React.DragEvent, taskId: string, isTargetGroup: boolean) => {
        e.preventDefault();
        e.dataTransfer.dropEffect = 'move';

        if (taskId === draggedTaskId) return;

        const rect = e.currentTarget.getBoundingClientRect();
        const relativeY = e.clientY - rect.top;
        const height = rect.height;

        let position: DropPosition;

        if (isTargetGroup) {
            if (relativeY < height / 3) {
                position = 'before';
            } else if (relativeY < (height * 2) / 3) {
                position = 'into';
            } else {
                position = 'after';
            }
        } else {
            position = relativeY < height / 2 ? 'before' : 'after';
        }

        setDragOverTaskId(taskId);
        setDragOverPosition(position);
    }, [draggedTaskId]);

    const handleDragLeave = useCallback(() => {
        setDragOverTaskId(null);
        setDragOverPosition(null);
    }, []);

    // 컨테이너 레벨 드래그 핸들러: 최상단/최하단 빈 공간 감지
    const handleContainerDragOver = useCallback((e: React.DragEvent, containerRect: DOMRect) => {
        e.preventDefault();
        e.dataTransfer.dropEffect = 'move';

        if (!draggedTaskId || tasks.length === 0) return;

        const relativeY = e.clientY - containerRect.top;
        const dropZoneThreshold = rowHeight / 2;  // 드롭 존 감지 범위

        // 첫 번째 태스크 위 (최상단 드롭 존)
        if (relativeY < dropZoneThreshold) {
            setDragOverTaskId(DROP_ZONE_FIRST);
            setDragOverPosition('before');
            return;
        }

        // 마지막 태스크 아래 (최하단 드롭 존)
        // contentHeight가 전달되면 사용 (UNIFIED 뷰 등 행 높이가 다른 경우)
        // 그렇지 않으면 기본값으로 계산
        const actualHeight = contentHeight || tasks.length * rowHeight;
        if (relativeY > actualHeight - dropZoneThreshold) {
            setDragOverTaskId(DROP_ZONE_LAST);
            setDragOverPosition('after');
            return;
        }
    }, [draggedTaskId, tasks.length, rowHeight, contentHeight]);

    const handleDrop = useCallback((e: React.DragEvent, targetTaskId: string) => {
        e.preventDefault();

        if (!draggedTaskId || draggedTaskId === targetTaskId || !dragOverPosition) {
            setDraggedTaskId(null);
            setDragOverTaskId(null);
            setDragOverPosition(null);
            return;
        }

        // 드래그 중인 태스크와 타겟 태스크 조회
        const movingTask = taskMap.get(draggedTaskId);
        const targetTask = taskMap.get(targetTaskId);
        const allTasksArray = allTasks || tasks;

        // 특수 드롭 존 처리 (최상단/최하단)
        if (targetTaskId === DROP_ZONE_FIRST || targetTaskId === DROP_ZONE_LAST) {
            // 최상위 이동은 BLOCK만 가능
            if (movingTask && movingTask.type !== 'BLOCK') {
                console.warn('[DragDrop] 최상위 레벨에는 BLOCK만 위치할 수 있습니다.');
                setDraggedTaskId(null);
                setDragOverTaskId(null);
                setDragOverPosition(null);
                return;
            }
            if (onTaskReorder) {
                const newIndex = targetTaskId === DROP_ZONE_FIRST ? 0 : tasks.length;
                onTaskReorder(draggedTaskId, newIndex);
            }
            setDraggedTaskId(null);
            setDragOverTaskId(null);
            setDragOverPosition(null);
            return;
        }

        // 계층 구조 검증
        if (movingTask && targetTask) {
            const validation = canMoveTaskTo(movingTask, targetTask, dragOverPosition, allTasksArray);
            if (!validation.valid) {
                console.warn(`[DragDrop] 이동 불가: ${validation.reason}`);
                setDraggedTaskId(null);
                setDragOverTaskId(null);
                setDragOverPosition(null);
                return;
            }
        }

        if (onTaskMove) {
            onTaskMove(draggedTaskId, targetTaskId, dragOverPosition);
        } else if (onTaskReorder && dragOverPosition !== 'into') {
            const targetIndex = tasks.findIndex(t => t.id === targetTaskId);
            const newIndex = dragOverPosition === 'after' ? targetIndex + 1 : targetIndex;
            onTaskReorder(draggedTaskId, newIndex);
        }

        setDraggedTaskId(null);
        setDragOverTaskId(null);
        setDragOverPosition(null);
    }, [draggedTaskId, dragOverPosition, onTaskMove, onTaskReorder, tasks, allTasks, taskMap]);

    const handleDragEnd = useCallback(() => {
        setDraggedTaskId(null);
        setDragOverTaskId(null);
        setDragOverPosition(null);
        // DOM 정리 불필요 - Image 객체는 자동으로 가비지 컬렉션됨
    }, []);

    // 컨테이너 레벨 드롭 핸들러: 특수 드롭 존 처리
    const handleContainerDrop = useCallback((e: React.DragEvent) => {
        e.preventDefault();

        if (!draggedTaskId || !dragOverTaskId || !dragOverPosition) {
            setDraggedTaskId(null);
            setDragOverTaskId(null);
            setDragOverPosition(null);
            return;
        }

        // 특수 드롭 존 처리 (최상단/최하단)
        if (dragOverTaskId === DROP_ZONE_FIRST || dragOverTaskId === DROP_ZONE_LAST) {
            if (onTaskReorder) {
                const newIndex = dragOverTaskId === DROP_ZONE_FIRST ? 0 : tasks.length;
                onTaskReorder(draggedTaskId, newIndex);
            }
        }

        setDraggedTaskId(null);
        setDragOverTaskId(null);
        setDragOverPosition(null);
    }, [draggedTaskId, dragOverTaskId, dragOverPosition, onTaskReorder, tasks.length]);

    return {
        draggedTaskId,
        dragOverTaskId,
        dragOverPosition,
        handleDragStart,
        handleDragOver,
        handleDragLeave,
        handleDrop,
        handleDragEnd,
        handleContainerDragOver,
        handleContainerDrop,
    };
};
