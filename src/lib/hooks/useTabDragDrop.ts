/**
 * useTabDragDrop Hook
 * 탭 컴포넌트의 드래그앤드롭 재정렬 로직을 관리합니다.
 */

import { useState, useCallback } from 'react';

interface UseTabDragDropOptions<T extends { id: string }> {
  items: T[];
  onReorder?: (fromIndex: number, toIndex: number) => void;
  isEditingActive?: boolean;
}

interface UseTabDragDropReturn {
  draggedIndex: number | null;
  dragOverIndex: number | null;
  isDraggable: boolean;
  handleDragStart: (e: React.DragEvent, index: number, itemId: string) => void;
  handleDragOver: (e: React.DragEvent, index: number) => void;
  handleDragLeave: () => void;
  handleDrop: (e: React.DragEvent, dropIndex: number) => void;
  handleDragEnd: () => void;
  getDragStyles: (index: number) => string;
}

export function useTabDragDrop<T extends { id: string }>({
  items,
  onReorder,
  isEditingActive = false,
}: UseTabDragDropOptions<T>): UseTabDragDropReturn {
  const [draggedIndex, setDraggedIndex] = useState<number | null>(null);
  const [dragOverIndex, setDragOverIndex] = useState<number | null>(null);

  const isDraggable = onReorder !== undefined && !isEditingActive;

  const handleDragStart = useCallback(
    (e: React.DragEvent, index: number, itemId: string) => {
      if (isEditingActive) return;
      const item = items[index];
      if (!item) return;

      setDraggedIndex(index);
      e.dataTransfer.effectAllowed = 'move';
      e.dataTransfer.setData('text/html', itemId);
    },
    [items, isEditingActive]
  );

  const handleDragOver = useCallback(
    (e: React.DragEvent, index: number) => {
      e.preventDefault();
      e.dataTransfer.dropEffect = 'move';
      if (draggedIndex !== null && draggedIndex !== index) {
        setDragOverIndex(index);
      }
    },
    [draggedIndex]
  );

  const handleDragLeave = useCallback(() => {
    setDragOverIndex(null);
  }, []);

  const handleDrop = useCallback(
    (e: React.DragEvent, dropIndex: number) => {
      e.preventDefault();
      if (draggedIndex !== null && draggedIndex !== dropIndex && onReorder) {
        onReorder(draggedIndex, dropIndex);
      }
      setDraggedIndex(null);
      setDragOverIndex(null);
    },
    [draggedIndex, onReorder]
  );

  const handleDragEnd = useCallback(() => {
    setDraggedIndex(null);
    setDragOverIndex(null);
  }, []);

  const getDragStyles = useCallback(
    (index: number): string => {
      const styles: string[] = [];

      if (draggedIndex === index) {
        styles.push('opacity-50 cursor-move');
      }
      if (dragOverIndex === index) {
        styles.push('border-primary-300 dark:border-primary-700');
      }
      if (isDraggable) {
        styles.push('cursor-move');
      }

      return styles.join(' ');
    },
    [draggedIndex, dragOverIndex, isDraggable]
  );

  return {
    draggedIndex,
    dragOverIndex,
    isDraggable,
    handleDragStart,
    handleDragOver,
    handleDragLeave,
    handleDrop,
    handleDragEnd,
    getDragStyles,
  };
}
