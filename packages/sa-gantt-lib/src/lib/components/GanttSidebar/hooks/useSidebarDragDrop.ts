'use client';

import { useState, useCallback } from 'react';
import type { ConstructionTask, DropPosition } from '../../../types';

interface UseSidebarDragDropOptions {
    tasks: ConstructionTask[];
    onTaskReorder?: (taskId: string, newIndex: number) => void;
    onTaskMove?: (taskId: string, targetId: string, position: DropPosition) => void;
    rowHeight?: number;
}

// 특수 ID: 최상단/최하단 드롭 존
export const DROP_ZONE_FIRST = '__DROP_ZONE_FIRST__';
export const DROP_ZONE_LAST = '__DROP_ZONE_LAST__';

export const useSidebarDragDrop = ({
    tasks,
    onTaskReorder,
    onTaskMove,
    rowHeight = 36,
}: UseSidebarDragDropOptions) => {
    const [draggedTaskId, setDraggedTaskId] = useState<string | null>(null);
    const [dragOverTaskId, setDragOverTaskId] = useState<string | null>(null);
    const [dragOverPosition, setDragOverPosition] = useState<DropPosition | null>(null);

    const handleDragStart = useCallback((e: React.DragEvent, taskId: string) => {
        e.dataTransfer.effectAllowed = 'move';
        e.dataTransfer.setData('text/plain', taskId);
        setDraggedTaskId(taskId);

        // SVG 1x1px 투명 이미지 (모든 브라우저 호환 - Safari/Firefox 포함)
        // DOM 요소 방식은 화면 외부 요소를 일부 브라우저가 무시함
        const transparentImg = new Image();
        transparentImg.src = 'data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" width="1" height="1"/>';
        e.dataTransfer.setDragImage(transparentImg, 0, 0);
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
        const contentHeight = tasks.length * rowHeight;
        if (relativeY > contentHeight - dropZoneThreshold) {
            setDragOverTaskId(DROP_ZONE_LAST);
            setDragOverPosition('after');
            return;
        }
    }, [draggedTaskId, tasks.length, rowHeight]);

    const handleDrop = useCallback((e: React.DragEvent, targetTaskId: string) => {
        e.preventDefault();

        if (!draggedTaskId || draggedTaskId === targetTaskId || !dragOverPosition) {
            setDraggedTaskId(null);
            setDragOverTaskId(null);
            setDragOverPosition(null);
            return;
        }

        // 특수 드롭 존 처리 (최상단/최하단)
        if (targetTaskId === DROP_ZONE_FIRST || targetTaskId === DROP_ZONE_LAST) {
            if (onTaskReorder) {
                const newIndex = targetTaskId === DROP_ZONE_FIRST ? 0 : tasks.length;
                onTaskReorder(draggedTaskId, newIndex);
            }
            setDraggedTaskId(null);
            setDragOverTaskId(null);
            setDragOverPosition(null);
            return;
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
    }, [draggedTaskId, dragOverPosition, onTaskMove, onTaskReorder, tasks]);

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
