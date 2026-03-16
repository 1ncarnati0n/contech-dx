'use client';

import { useState, useMemo, useEffect, useCallback, useImperativeHandle, type RefObject } from 'react';
import type { Building, TradeData } from '@/shared/types';
import { useTradeTableState } from './useTradeTableState';
import { useCellSelection } from './useCellSelection';
import { useTradeOperations } from './useTradeOperations';
import { buildTradeRows, type RowInfo } from './buildTradeRows';
import {
  formatTradeValueEmpty,
  calculateFormworkTotal,
  calculateRebarTotal,
  calculateConcreteTotal,
  calculateSummary,
  toleranceClass,
  getDetailedColumnFieldPath,
  parsePasteData,
  parseDeleteCells,
} from './tradeTableHelpers';
import { toast } from 'sonner';
import { logger } from '@/shared/utils/logger';

export interface DetailedFloorTradeTableHandle {
  flushPendingSaves: () => Promise<void>;
  saveChanges: () => Promise<void>;
  hasUnsavedChanges: () => boolean;
}

const READ_ONLY_COLUMNS = [2, 6, 7, 10];
const MIN_DATA_COLUMN = 2;

interface UseDetailedFloorTradeTableLogicOptions {
  building: Building;
  onUpdate: () => void;
  ref?: RefObject<DetailedFloorTradeTableHandle | null>;
}

export function useDetailedFloorTradeTableLogic({ building, onUpdate, ref }: UseDetailedFloorTradeTableLogicOptions) {
  const tableState = useTradeTableState(building);
  const { floors, trades, isSaving, hasUnsavedChanges, setTrades, setHasUnsavedChanges, setIsSaving, setOriginalTrades, pendingSavesRef, originalTrades } = tableState;

  const cellSelection = useCellSelection({ readOnlyColumns: READ_ONLY_COLUMNS, minDataColumn: MIN_DATA_COLUMN });
  const { selectedCells, isDragging, isDraggingTextRef, recentlyPastedCells, resetSelection, handleCellSelect, handleDragStart, handleDragMove, handleTextDragStart, handleTextDragEnd, markRecentlyPasted } = cellSelection;

  const tradeOps = useTradeOperations({
    building, floors, trades, originalTrades, setTrades, setHasUnsavedChanges, setIsSaving, setOriginalTrades, pendingSavesRef, onUpdate,
  });
  const { getTrade, updateTrade, saveChanges, discardChanges, flushPendingSaves } = tradeOps;

  const [showDiscardConfirm, setShowDiscardConfirm] = useState(false);

  // Reset selection when building changes
  useEffect(() => { resetSelection(); }, [building, resetSelection]);

  useImperativeHandle(ref, () => ({
    flushPendingSaves,
    saveChanges,
    hasUnsavedChanges: () => hasUnsavedChanges,
  }));

  // Row generation
  const rows: RowInfo[] = useMemo(() => buildTradeRows(building, floors), [floors, building]);

  // Keyboard handler: Delete/Backspace
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      const isInputFocused = document.activeElement?.tagName === 'INPUT';
      if (isInputFocused && selectedCells.size <= 1) return;

      if ((e.key === 'Delete' || e.key === 'Backspace') && selectedCells.size > 0) {
        if (isInputFocused) (document.activeElement as HTMLInputElement)?.blur();
        e.preventDefault();

        const deleteCells = parseDeleteCells(selectedCells, rows, building.id, getDetailedColumnFieldPath);
        deleteCells.forEach(cell => updateTrade(cell.floorId, cell.tradeGroup, cell.fieldPath, null));

        cellSelection.setSelectedCells(new Set());
        cellSelection.setSelectionStart(null);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [selectedCells, rows, building.id, updateTrade, cellSelection]);

  // Paste handler
  const handlePaste = useCallback((e: React.ClipboardEvent, startRowIndex: number, startColIndex: number) => {
    e.preventDefault();
    e.stopPropagation();

    const clipboardData = e.clipboardData.getData('text/plain');
    if (!clipboardData || !clipboardData.trim()) return;

    try {
      const pastedCells = parsePasteData(clipboardData, startRowIndex, startColIndex, rows, building.id, getDetailedColumnFieldPath);
      let updateCount = 0;
      const pastedCellKeys: string[] = [];

      pastedCells.forEach(cell => {
        if (updateTrade(cell.floorId, cell.tradeGroup, cell.fieldPath, cell.value)) {
          updateCount++;
          pastedCellKeys.push(`${cell.rowIndex}-${cell.colIndex}`);
        }
      });

      if (updateCount > 0) {
        toast.success(`${updateCount}개의 셀이 업데이트되었습니다.`);
        markRecentlyPasted(pastedCellKeys);
      }
    } catch (error) {
      toast.error('붙여넣기에 실패했습니다.');
      logger.error('Paste error:', error);
    }
  }, [rows, building.id, updateTrade, markRecentlyPasted]);

  // Calculation helpers
  const getFormworkTotal = (trade: TradeData): number => calculateFormworkTotal(trade);
  const getRebarTotal = (trade: TradeData): number => calculateRebarTotal(trade);
  const getConcreteTotal = (trade: TradeData): number => calculateConcreteTotal(trade);

  const getQuantityInputRebar = (floorId: string, tradeGroup: string): number =>
    getTrade(floorId, tradeGroup).rebar?.ton || 0;

  const getQuantityInputConcrete = (floorId: string, tradeGroup: string): number =>
    getTrade(floorId, tradeGroup).concrete?.volumeM3 || 0;

  const getSummary = (field: string): number => calculateSummary(trades, field);

  const fv = formatTradeValueEmpty;
  const tc = toleranceClass;

  return {
    // State
    floors,
    trades,
    isSaving,
    hasUnsavedChanges,
    showDiscardConfirm,
    setShowDiscardConfirm,
    rows,

    // Trade operations
    getTrade,
    updateTrade,
    saveChanges,
    discardChanges,

    // Cell selection
    selectedCells,
    isDragging,
    isDraggingTextRef,
    recentlyPastedCells,
    handleCellSelect,
    handleDragStart,
    handleDragMove,
    handleTextDragStart,
    handleTextDragEnd,

    // Helpers
    handlePaste,
    getFormworkTotal,
    getRebarTotal,
    getConcreteTotal,
    getQuantityInputRebar,
    getQuantityInputConcrete,
    getSummary,
    fv,
    tc,
  };
}
