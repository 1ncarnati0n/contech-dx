'use client';

import { useState, useRef, useCallback, useEffect } from 'react';

interface SelectionPosition {
  row: number;
  col: number;
}

interface UseFloorTradeSelectionOptions {
  /** 선택 불가 컬럼 인덱스 배열 (기본: [2, 6] - 형틀, 해체/정리) */
  excludedColumns?: number[];
  /** 최소 선택 가능 컬럼 인덱스 (기본: 2) */
  minSelectableColumn?: number;
}

interface UseFloorTradeSelectionReturn {
  /** 선택된 셀들 (Set<"rowIndex-colIndex">) */
  selectedCells: Set<string>;
  /** 셀 선택 시작점 */
  selectionStart: SelectionPosition | null;
  /** 셀 드래그 중 여부 */
  isDragging: boolean;
  /** 텍스트 드래그 중 여부 */
  isDraggingText: boolean;
  /** 텍스트 드래그 ref (동기 상태 확인용) */
  isDraggingTextRef: React.MutableRefObject<boolean>;
  /** 셀 선택 핸들러 */
  handleCellSelect: (rowIndex: number, colIndex: number, isMultiSelect: boolean) => void;
  /** 드래그 시작 핸들러 */
  handleDragStart: (rowIndex: number, colIndex: number) => void;
  /** 드래그 이동 핸들러 */
  handleDragMove: (rowIndex: number, colIndex: number) => void;
  /** 드래그 종료 핸들러 */
  handleDragEnd: () => void;
  /** 텍스트 드래그 시작 핸들러 */
  handleTextDragStart: () => void;
  /** 텍스트 드래그 종료 핸들러 */
  handleTextDragEnd: () => void;
  /** 선택 초기화 */
  clearSelection: () => void;
  /** 선택된 셀 키 배열 반환 */
  getSelectedCellKeys: () => string[];
}

/**
 * 테이블 셀 선택 및 드래그 선택 로직을 관리하는 훅
 */
export function useFloorTradeSelection(
  options: UseFloorTradeSelectionOptions = {}
): UseFloorTradeSelectionReturn {
  const {
    excludedColumns = [2, 6], // 형틀, 해체/정리
    minSelectableColumn = 2,
  } = options;

  // 상태
  const [selectedCells, setSelectedCells] = useState<Set<string>>(new Set());
  const [selectionStart, setSelectionStart] = useState<SelectionPosition | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [isDraggingText, setIsDraggingText] = useState(false);

  // Refs
  const isDraggingTextRef = useRef(false);
  const selectionStartRef = useRef<SelectionPosition | null>(null);

  // 컬럼이 선택 가능한지 확인
  const isColumnSelectable = useCallback((colIndex: number): boolean => {
    return colIndex >= minSelectableColumn && !excludedColumns.includes(colIndex);
  }, [excludedColumns, minSelectableColumn]);

  // 셀 선택 핸들러
  const handleCellSelect = useCallback((
    rowIndex: number,
    colIndex: number,
    isMultiSelect: boolean
  ) => {
    if (!isColumnSelectable(colIndex)) return;

    const cellKey = `${rowIndex}-${colIndex}`;

    if (isMultiSelect && selectionStart) {
      // 범위 선택
      const minRow = Math.min(selectionStart.row, rowIndex);
      const maxRow = Math.max(selectionStart.row, rowIndex);
      const minCol = Math.min(selectionStart.col, colIndex);
      const maxCol = Math.max(selectionStart.col, colIndex);

      const newSelection = new Set<string>();
      for (let r = minRow; r <= maxRow; r++) {
        for (let c = minCol; c <= maxCol; c++) {
          if (isColumnSelectable(c)) {
            newSelection.add(`${r}-${c}`);
          }
        }
      }
      setSelectedCells(newSelection);
    } else {
      // 단일 선택
      setSelectionStart({ row: rowIndex, col: colIndex });
      setSelectedCells(new Set([cellKey]));
    }
  }, [selectionStart, isColumnSelectable]);

  // 드래그 시작
  const handleDragStart = useCallback((rowIndex: number, colIndex: number) => {
    // 텍스트 선택 드래그 중이면 셀 선택 드래그 시작 안 함
    if (isDraggingTextRef.current) {
      return;
    }
    const start = { row: rowIndex, col: colIndex };
    setIsDragging(true);
    setSelectionStart(start);
    selectionStartRef.current = start;
    setSelectedCells(new Set([`${rowIndex}-${colIndex}`]));
  }, []);

  // 드래그 이동
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
        if (isColumnSelectable(c)) {
          newSelection.add(`${r}-${c}`);
        }
      }
    }
    setSelectedCells(newSelection);
  }, [isColumnSelectable]);

  // 드래그 종료
  const handleDragEnd = useCallback(() => {
    setIsDragging(false);
    selectionStartRef.current = null;
  }, []);

  // 텍스트 드래그 시작
  const handleTextDragStart = useCallback(() => {
    isDraggingTextRef.current = true;
    setIsDraggingText(true);
    // 셀 선택 드래그 중이면 중단
    if (isDragging) {
      handleDragEnd();
    }
  }, [isDragging, handleDragEnd]);

  // 텍스트 드래그 종료
  const handleTextDragEnd = useCallback(() => {
    isDraggingTextRef.current = false;
    setIsDraggingText(false);
  }, []);

  // 선택 초기화
  const clearSelection = useCallback(() => {
    setSelectedCells(new Set());
    setSelectionStart(null);
    selectionStartRef.current = null;
  }, []);

  // 선택된 셀 키 배열 반환
  const getSelectedCellKeys = useCallback(() => {
    return Array.from(selectedCells);
  }, [selectedCells]);

  // 마우스 이벤트 처리 (드래그 선택)
  useEffect(() => {
    if (!isDragging) return;

    const handleMouseMove = (e: MouseEvent) => {
      if (!isDragging || !selectionStartRef.current) return;

      const target = e.target as HTMLElement;

      // input 필드 내부이면 셀 선택 드래그 중단
      if (target.tagName === 'INPUT' || target.closest('input')) {
        handleDragEnd();
        return;
      }

      // input 필드에서 텍스트 선택 중이면 셀 선택 드래그 중단
      const activeEl = document.activeElement;
      if (activeEl?.tagName === 'INPUT' && (activeEl as HTMLInputElement).selectionStart !== null) {
        handleDragEnd();
        return;
      }

      // 마우스 위치에서 셀 찾기
      const cell = target.closest('td');
      if (!cell) return;

      const input = cell.querySelector('input[data-row-index][data-col-index]');
      if (!input) return;

      const rowIndex = input.getAttribute('data-row-index');
      const colIndex = input.getAttribute('data-col-index');

      if (rowIndex !== null && colIndex !== null) {
        const row = Number(rowIndex);
        const col = Number(colIndex);
        if (isColumnSelectable(col)) {
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
  }, [isDragging, handleDragMove, handleDragEnd, isColumnSelectable]);

  return {
    selectedCells,
    selectionStart,
    isDragging,
    isDraggingText,
    isDraggingTextRef,
    handleCellSelect,
    handleDragStart,
    handleDragMove,
    handleDragEnd,
    handleTextDragStart,
    handleTextDragEnd,
    clearSelection,
    getSelectedCellKeys,
  };
}
