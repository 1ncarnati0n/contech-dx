'use client';

import { useState, useEffect, useRef, useCallback } from 'react';

interface UseCellSelectionOptions {
  /** Column indices that are read-only and should be excluded from selection */
  readOnlyColumns: number[];
  /** Minimum column index for drag selection (columns below this are label columns) */
  minDataColumn: number;
}

/**
 * Shared cell selection, drag, and paste infrastructure for trade tables.
 *
 * Extracts the identical drag-select + Delete/Backspace logic from
 * FloorTradeTable and DetailedFloorTradeTable.
 *
 * The read-only columns differ between the two tables:
 * - FloorTradeTable: columns 2 (formwork total), 6 (demolition)
 * - DetailedFloorTradeTable: columns 2, 6, 7, 10 (calculated totals)
 */
export function useCellSelection({ readOnlyColumns, minDataColumn }: UseCellSelectionOptions) {
  const [selectedCells, setSelectedCells] = useState<Set<string>>(new Set());
  const [selectionStart, setSelectionStart] = useState<{ row: number; col: number } | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [isDraggingText, setIsDraggingText] = useState(false);
  const [recentlyPastedCells, setRecentlyPastedCells] = useState<Set<string>>(new Set());
  const isDraggingTextRef = useRef(false);
  const selectionStartRef = useRef<{ row: number; col: number } | null>(null);

  const isReadOnly = useCallback((col: number) => readOnlyColumns.includes(col), [readOnlyColumns]);

  const resetSelection = useCallback(() => {
    setSelectedCells(new Set());
    setSelectionStart(null);
    selectionStartRef.current = null;
    setIsDragging(false);
    setIsDraggingText(false);
    isDraggingTextRef.current = false;
  }, []);

  const handleCellSelect = useCallback((rowIndex: number, colIndex: number, isMultiSelect: boolean) => {
    if (isReadOnly(colIndex)) return;

    const cellKey = `${rowIndex}-${colIndex}`;

    if (isMultiSelect && selectionStart) {
      const minRow = Math.min(selectionStart.row, rowIndex);
      const maxRow = Math.max(selectionStart.row, rowIndex);
      const minCol = Math.min(selectionStart.col, colIndex);
      const maxCol = Math.max(selectionStart.col, colIndex);

      const newSelection = new Set<string>();
      for (let r = minRow; r <= maxRow; r++) {
        for (let c = minCol; c <= maxCol; c++) {
          if (!isReadOnly(c)) {
            newSelection.add(`${r}-${c}`);
          }
        }
      }
      setSelectedCells(newSelection);
    } else {
      setSelectionStart({ row: rowIndex, col: colIndex });
      setSelectedCells(new Set([cellKey]));
    }
  }, [selectionStart, isReadOnly]);

  const handleDragStart = useCallback((rowIndex: number, colIndex: number) => {
    if (isDraggingTextRef.current) return;
    const start = { row: rowIndex, col: colIndex };
    setIsDragging(true);
    setSelectionStart(start);
    selectionStartRef.current = start;
    setSelectedCells(new Set([`${rowIndex}-${colIndex}`]));
  }, []);

  const handleDragMove = useCallback((rowIndex: number, colIndex: number) => {
    const start = selectionStartRef.current;
    if (!start) return;

    const minRow = Math.min(start.row, rowIndex);
    const maxRow = Math.max(start.row, rowIndex);
    const minCol = Math.min(start.col, colIndex);
    const maxCol = Math.max(start.col, colIndex);

    const newSelection = new Set<string>();
    for (let r = minRow; r <= maxRow; r++) {
      for (let c = minCol; c <= maxCol; c++) {
        if (c >= minDataColumn && !isReadOnly(c)) {
          newSelection.add(`${r}-${c}`);
        }
      }
    }
    setSelectedCells(newSelection);
  }, [minDataColumn, isReadOnly]);

  const handleDragEnd = useCallback(() => {
    setIsDragging(false);
    selectionStartRef.current = null;
  }, []);

  const handleTextDragStart = useCallback(() => {
    isDraggingTextRef.current = true;
    setIsDraggingText(true);
    if (isDragging) {
      handleDragEnd();
    }
  }, [isDragging, handleDragEnd]);

  const handleTextDragEnd = useCallback(() => {
    isDraggingTextRef.current = false;
    setIsDraggingText(false);
  }, []);

  // Global drag event listeners
  useEffect(() => {
    if (!isDragging) return;

    const handleMouseMove = (e: MouseEvent) => {
      if (!isDragging || !selectionStartRef.current) return;

      const target = e.target as HTMLElement;

      if (target.tagName === 'INPUT' || target.closest('input')) {
        handleDragEnd();
        return;
      }

      const activeEl = document.activeElement;
      if (activeEl?.tagName === 'INPUT' && (activeEl as HTMLInputElement).selectionStart !== null) {
        handleDragEnd();
        return;
      }

      const cell = target.closest('td');
      if (!cell) return;

      const input = cell.querySelector('input[data-row-index][data-col-index]');
      if (!input) return;

      const rowIndex = input.getAttribute('data-row-index');
      const colIndex = input.getAttribute('data-col-index');

      if (rowIndex !== null && colIndex !== null) {
        const row = Number(rowIndex);
        const col = Number(colIndex);
        if (col >= minDataColumn && !isReadOnly(col)) {
          handleDragMove(row, col);
        }
      }
    };

    const handleMouseUp = () => {
      handleDragEnd();
    };

    window.addEventListener('mousemove', handleMouseMove);
    window.addEventListener('mouseup', handleMouseUp);

    return () => {
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseup', handleMouseUp);
    };
  }, [isDragging, handleDragMove, handleDragEnd, minDataColumn, isReadOnly]);

  /**
   * Mark cells as recently pasted for visual feedback (1.5s highlight).
   */
  const markRecentlyPasted = useCallback((cellKeys: string[]) => {
    setRecentlyPastedCells(new Set(cellKeys));
    setTimeout(() => setRecentlyPastedCells(new Set()), 1500);
  }, []);

  return {
    selectedCells,
    setSelectedCells,
    selectionStart,
    setSelectionStart,
    isDragging,
    isDraggingText,
    recentlyPastedCells,
    isDraggingTextRef,
    selectionStartRef,
    resetSelection,
    handleCellSelect,
    handleDragStart,
    handleDragMove,
    handleDragEnd,
    handleTextDragStart,
    handleTextDragEnd,
    markRecentlyPasted,
  };
}
