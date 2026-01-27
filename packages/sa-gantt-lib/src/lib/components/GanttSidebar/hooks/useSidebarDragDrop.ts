'use client';

import { useState, useCallback } from 'react';
import type { ConstructionTask, DropPosition } from '../../../types';

interface UseSidebarDragDropOptions {
    tasks: ConstructionTask[];
    onTaskReorder?: (taskId: string, newIndex: number) => void;
    onTaskMove?: (taskId: string, targetId: string, position: DropPosition) => void;
}

export const useSidebarDragDrop = ({
    tasks,
    onTaskReorder,
    onTaskMove,
}: UseSidebarDragDropOptions) => {
    const [draggedTaskId, setDraggedTaskId] = useState<string | null>(null);
    const [dragOverTaskId, setDragOverTaskId] = useState<string | null>(null);
    const [dragOverPosition, setDragOverPosition] = useState<DropPosition | null>(null);

    const handleDragStart = useCallback((e: React.DragEvent, taskId: string) => {
        e.dataTransfer.effectAllowed = 'move';
        e.dataTransfer.setData('text/plain', taskId);
        setDraggedTaskId(taskId);

        const dragImage = document.createElement('div');
        dragImage.style.opacity = '0';
        document.body.appendChild(dragImage);
        e.dataTransfer.setDragImage(dragImage, 0, 0);
        setTimeout(() => document.body.removeChild(dragImage), 0);
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

    const handleDrop = useCallback((e: React.DragEvent, targetTaskId: string) => {
        e.preventDefault();

        if (!draggedTaskId || draggedTaskId === targetTaskId || !dragOverPosition) {
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
    }, []);

    return {
        draggedTaskId,
        dragOverTaskId,
        dragOverPosition,
        handleDragStart,
        handleDragOver,
        handleDragLeave,
        handleDrop,
        handleDragEnd,
    };
};
