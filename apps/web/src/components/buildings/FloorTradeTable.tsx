'use client';

import { useState, useMemo, useEffect, forwardRef, useImperativeHandle, useCallback } from 'react';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui';
import { SaveStatusBar } from './SaveStatusBar';
import { ConfirmDialog } from '@/components/common/ConfirmDialog';
import { TradeInputCell } from './TradeInputCell';
import { ClipboardPaste } from 'lucide-react';
import type { Building, Floor, TradeData } from '@/lib/types';
import { getTradeValue } from '@/lib/utils/tradeDataHelpers';
import {
  TRADE_GROUPS,
  createSpecialFloorId,
} from '@/lib/utils/floorIdUtils';
import { logger } from '@/lib/utils/logger';
import { toast } from 'sonner';
import {
  useTradeTableState,
  useCellSelection,
  useTradeOperations,
} from './hooks';

interface Props {
  building: Building;
  onUpdate: () => void;
}

export interface FloorTradeTableHandle {
  flushPendingSaves: () => Promise<void>;
  saveChanges: () => Promise<void>;
  hasUnsavedChanges: () => boolean;
}

/** Read-only columns: 2 (formwork total), 6 (demolition = euroForm×2) */
const READ_ONLY_COLUMNS = [2, 6];
const MIN_DATA_COLUMN = 2;

/**
 * 열 인덱스를 공정모듈 열 문자로 변환
 * B=갱폼, C=알폼, D=형틀 합계, U=유로폼, E=해체/정리, F=철근, G=콘크리트
 */
function getColumnLetter(colIndex: number): string | null {
  const mapping: Record<number, string> = {
    2: 'D', 3: 'B', 4: 'C', 5: 'U', 6: 'E', 7: 'F', 8: 'G',
  };
  return mapping[colIndex] || null;
}

function parseFloorNumber(label: string): number | null {
  const match = label.match(/^(\d+)F?$/);
  return match ? parseInt(match[1], 10) : null;
}

type RowInfo = {
  type: 'group' | 'floor' | 'summary';
  label: string;
  floor?: Floor;
  tradeGroup?: string;
};

/**
 * 행 인덱스를 공정모듈 행 번호로 변환
 * row 6=버림, row 7=기초, row 8=B2, row 9=B1, row 11=1층, ...
 */
function getExcelRowNumber(rowIndex: number, rows: RowInfo[]): number {
  const row = rows[rowIndex];
  if (!row || row.type === 'summary') return -1;

  if (row.type === 'group') {
    if (row.label === '버림') return 6;
    if (row.label === '기초') return 7;
  }

  if (row.type === 'floor' && row.floor) {
    const floor = row.floor;

    if (floor.levelType === '지하') {
      const basementFloors = rows
        .filter(r => r.type === 'floor' && r.floor?.levelType === '지하')
        .reverse();
      const bIndex = basementFloors.findIndex(r => r.floor?.id === floor.id);
      return bIndex >= 0 ? 8 + bIndex : -1;
    }

    if (floor.floorClass === '옥탑층' || floor.floorClass === 'PH층') {
      const phFloors = rows
        .filter(r => r.type === 'floor' && (r.floor?.floorClass === '옥탑층' || r.floor?.floorClass === 'PH층'));
      const phIndex = phFloors.findIndex(r => r.floor?.id === floor.id);
      return phIndex >= 0 ? 26 + phIndex : -1;
    }

    if (floor.levelType === '지상') {
      const floorNum = parseFloorNumber(row.label);
      return floorNum ? 10 + floorNum : -1;
    }
  }

  return -1;
}

function getCellAddress(colIndex: number, rowIndex: number, rows: RowInfo[]): string | null {
  const columnLetter = getColumnLetter(colIndex);
  if (!columnLetter) return null;
  const rowNumber = getExcelRowNumber(rowIndex, rows);
  if (rowNumber < 0) return null;
  return `${columnLetter}${rowNumber}`;
}

/** Column index → fieldPath mapping */
function getColumnFieldPath(colIndex: number): string | null {
  if (colIndex < 2) return null;
  const dataColIndex = colIndex - 2;
  const map: Record<number, string | null> = {
    0: null,                  // 형틀 합계 (읽기전용)
    1: 'gangForm.areaM2',
    2: 'alForm.areaM2',
    3: 'euroForm.areaM2',
    4: null,                  // 해체/정리 (읽기전용)
    5: 'rebar.ton',
    6: 'concrete.volumeM3',
  };
  return map[dataColIndex] ?? null;
}

export const FloorTradeTable = forwardRef<FloorTradeTableHandle, Props>(
  ({ building, onUpdate }, ref) => {
  // --- Shared hooks ---
  const tableState = useTradeTableState(building);
  const { floors, trades, isSaving, hasUnsavedChanges, setTrades, setHasUnsavedChanges, setIsSaving, setOriginalTrades, pendingSavesRef, originalTrades } = tableState;

  const cellSelection = useCellSelection({ readOnlyColumns: READ_ONLY_COLUMNS, minDataColumn: MIN_DATA_COLUMN });
  const { selectedCells, isDragging, isDraggingTextRef, recentlyPastedCells, resetSelection, handleCellSelect, handleDragStart, handleDragMove, handleTextDragStart, handleTextDragEnd, markRecentlyPasted } = cellSelection;

  const tradeOps = useTradeOperations({
    building, floors, trades, originalTrades, setTrades, setHasUnsavedChanges, setIsSaving, setOriginalTrades, pendingSavesRef, onUpdate,
  });
  const { getTrade, updateTrade, saveChanges, discardChanges, flushPendingSaves } = tradeOps;

  // Confirm dialog state for discard
  const [showDiscardConfirm, setShowDiscardConfirm] = useState(false);

  // Reset selection when building changes
  useEffect(() => { resetSelection(); }, [building, resetSelection]);

  useImperativeHandle(ref, () => ({
    flushPendingSaves,
    saveChanges,
    hasUnsavedChanges: () => hasUnsavedChanges,
  }));

  // --- Row generation ---
  const rows = useMemo(() => {
    const result: RowInfo[] = [];

    TRADE_GROUPS.slice(0, 2).forEach(group => {
      result.push({ type: 'group', label: group, tradeGroup: group });
    });

    const coreCount = building.meta.coreCount;
    const coreGroundFloors = building.meta.floorCount.coreGroundFloors;

    if (coreCount > 1 && coreGroundFloors && coreGroundFloors.length > 0) {
      let core1MaxFloor = coreGroundFloors[0] || 0;

      const core1Floors = floors.filter(f => {
        return f.floorLabel.match(/코어1-(\d+)F/) || f.floorLabel.match(/코어1-(\d+)~(\d+)F 기준층/);
      });

      core1Floors.forEach(floor => {
        const match = floor.floorLabel.match(/코어1-(\d+)F$/);
        if (match) {
          const floorNum = parseInt(match[1], 10);
          if (floorNum > core1MaxFloor) core1MaxFloor = floorNum;
        }
        const rangeMatch = floor.floorLabel.match(/코어1-(\d+)~(\d+)F 기준층/);
        if (rangeMatch) {
          const end = parseInt(rangeMatch[2], 10);
          if (end > core1MaxFloor) core1MaxFloor = end;
        }
      });

      // 지하층
      const basementFloors = floors.filter(f => f.levelType === '지하');
      const addedLabels = new Set<string>();
      basementFloors.forEach(floor => {
        const cleanLabel = floor.floorLabel.replace(/코어\d+-/, '');
        if (addedLabels.has(cleanLabel)) return;
        addedLabels.add(cleanLabel);
        result.push({ type: 'floor', label: cleanLabel, floor });
      });

      // 지상층 (코어1 기준)
      for (let i = 1; i <= core1MaxFloor; i++) {
        const foundFloor = floors.find(f => {
          const match = f.floorLabel.match(/코어1-(\d+)F$/);
          if (match && parseInt(match[1], 10) === i) return true;
          const rangeMatch = f.floorLabel.match(/코어1-(\d+)~(\d+)F 기준층/);
          if (rangeMatch) {
            const start = parseInt(rangeMatch[1], 10);
            const end = parseInt(rangeMatch[2], 10);
            return i >= start && i <= end;
          }
          return false;
        });

        if (foundFloor) {
          if (foundFloor.floorLabel.includes('~') && foundFloor.floorClass === '기준층') {
            result.push({
              type: 'floor', label: `${i}F`,
              floor: { ...foundFloor, id: `${foundFloor.id}-${i}F`, floorLabel: `${i}F`, floorNumber: i },
            });
          } else {
            result.push({ type: 'floor', label: `${i}F`, floor: foundFloor });
          }
        } else {
          result.push({
            type: 'floor', label: `${i}F`,
            floor: { id: `dummy-${i}F`, buildingId: building.id, floorLabel: `${i}F`, floorNumber: i, levelType: '지상', floorClass: i === 1 ? '셋팅층' : (i === core1MaxFloor ? '최상층' : '기준층'), height: null } as Floor,
          });
        }
      }

      // 옥탑층
      floors.filter(f => f.floorClass === '옥탑층').forEach(floor => {
        let label = floor.floorLabel.replace(/코어\d+-/, '');
        const phMatch = label.match(/^PH(\d+)/i);
        if (phMatch) label = `옥탑${phMatch[1]}`;
        result.push({ type: 'floor', label, floor });
      });
    } else {
      let groundFloorCount = building.meta.floorCount.ground || 0;

      const groundFloors = floors.filter(f => f.levelType === '지상');
      groundFloors.forEach(floor => {
        const match = floor.floorLabel.match(/^(\d+)F$/);
        if (match) {
          const floorNum = parseInt(match[1], 10);
          if (floorNum > groundFloorCount) groundFloorCount = floorNum;
        }
        const rangeMatch = floor.floorLabel.match(/(\d+)~(\d+)F 기준층/);
        if (rangeMatch) {
          const end = parseInt(rangeMatch[2], 10);
          if (end > groundFloorCount) groundFloorCount = end;
        }
      });

      // 지하층
      const basementFloors = floors.filter(f => f.levelType === '지하');
      const addedLabels = new Set<string>();
      basementFloors.forEach(floor => {
        const cleanLabel = floor.floorLabel.replace(/코어\d+-/, '');
        if (addedLabels.has(cleanLabel)) return;
        addedLabels.add(cleanLabel);
        result.push({ type: 'floor', label: cleanLabel, floor });
      });
      // 지상층
      for (let i = 1; i <= groundFloorCount; i++) {
        const foundFloor = floors.find(f => {
          if (f.floorLabel === `${i}F`) return true;
          const rangeMatch = f.floorLabel.match(/(\d+)~(\d+)F 기준층/);
          if (rangeMatch) {
            const start = parseInt(rangeMatch[1], 10);
            const end = parseInt(rangeMatch[2], 10);
            return i >= start && i <= end;
          }
          return false;
        });

        if (foundFloor) {
          if (foundFloor.floorLabel.includes('~') && foundFloor.floorClass === '기준층') {
            result.push({
              type: 'floor', label: `${i}F`,
              floor: { ...foundFloor, id: `${foundFloor.id}-${i}F`, floorLabel: `${i}F`, floorNumber: i },
            });
          } else {
            result.push({ type: 'floor', label: `${i}F`, floor: foundFloor });
          }
        } else {
          result.push({
            type: 'floor', label: `${i}F`,
            floor: { id: `dummy-${i}F`, buildingId: building.id, floorLabel: `${i}F`, floorNumber: i, levelType: '지상', floorClass: i === 1 ? '셋팅층' : (i === groundFloorCount ? '최상층' : '기준층'), height: null } as Floor,
          });
        }
      }

      floors.filter(f => f.floorClass === '옥탑층').forEach(floor => {
        let label = floor.floorLabel.replace(/코어\d+-/, '');
        const phMatch = label.match(/^PH(\d+)/i);
        if (phMatch) label = `옥탑${phMatch[1]}`;
        result.push({ type: 'floor', label, floor });
      });
    }

    result.push({ type: 'summary', label: '소계' });
    return result;
  }, [floors, building]);

  // --- Delete/Backspace for multi-cell clear ---
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      const isInputFocused = document.activeElement?.tagName === 'INPUT';
      if (isInputFocused && selectedCells.size <= 1) return;

      if ((e.key === 'Delete' || e.key === 'Backspace') && selectedCells.size > 0) {
        if (isInputFocused) (document.activeElement as HTMLInputElement)?.blur();
        e.preventDefault();
        selectedCells.forEach(cellKey => {
          const [rowIdx, colIdx] = cellKey.split('-').map(Number);
          if (rowIdx >= 0 && rowIdx < rows.length) {
            const rowInfo = rows[rowIdx];
            if (rowInfo && rowInfo.type !== 'summary') {
              const tradeGroup = rowInfo.tradeGroup || '아파트';
              const floorId = rowInfo.floor?.id || (rowInfo.type === 'group' ? createSpecialFloorId(building.id, tradeGroup) : '');
              if (floorId) {
                const fieldPath = getColumnFieldPath(colIdx);
                if (fieldPath) updateTrade(floorId, tradeGroup, fieldPath, null);
              }
            }
          }
        });
        cellSelection.setSelectedCells(new Set());
        cellSelection.setSelectionStart(null);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [selectedCells, rows, building.id, updateTrade, cellSelection]);

  // --- Formwork total ---
  const calculateFormworkTotal = (trade: TradeData): number => {
    return (trade.gangForm?.areaM2 || 0) + (trade.alForm?.areaM2 || 0) + (trade.euroForm?.areaM2 || 0);
  };

  // --- Summary calculation ---
  const calculateSummary = (field: string): number => {
    let sum = 0;
    trades.forEach(trade => {
      const [category, subField] = field.split('.');
      if (subField) {
        const value = getTradeValue(trade.trades, category, subField);
        if (value) sum += value;
      }
    });
    return sum;
  };

  // --- Cell address helper for TradeInputCell ---
  const getCellAddressForCell = useCallback((colIndex: number, rowIndex: number): string | null => {
    return getCellAddress(colIndex, rowIndex, rows);
  }, [rows]);

  // --- Paste handler ---
  const handlePaste = useCallback((e: React.ClipboardEvent, startRowIndex: number, startColIndex: number) => {
    e.preventDefault();
    e.stopPropagation();

    const clipboardData = e.clipboardData.getData('text/plain');
    if (!clipboardData || !clipboardData.trim()) return;

    const normalizedData = clipboardData.replace(/\r\n/g, '\n').replace(/\r/g, '\n');
    const validRows = normalizedData.split('\n')
      .map(row => row.trim().split('\t').map(cell => cell || ''))
      .filter(row => row.length > 0 && row.some(cell => cell.trim() !== ''));

    if (validRows.length === 0) return;

    try {
      let updateCount = 0;
      const pastedCellKeys: string[] = [];

      validRows.forEach((pastedRow, rowOffset) => {
        const actualRowIndex = startRowIndex + rowOffset;
        if (actualRowIndex >= rows.length) return;

        const rowInfo = rows[actualRowIndex];
        if (!rowInfo || rowInfo.type === 'summary') return;

        const tradeGroup = rowInfo.tradeGroup || '아파트';
        const floorId = rowInfo.floor?.id || (rowInfo.type === 'group' ? createSpecialFloorId(building.id, tradeGroup) : '');
        if (!floorId) return;

        pastedRow.forEach((cellValue, colOffset) => {
          const actualColIndex = startColIndex + colOffset;
          const fieldPath = getColumnFieldPath(actualColIndex);
          if (!fieldPath) return;

          const trimmedValue = (cellValue || '').trim();
          if (!trimmedValue) return;

          const cleanedValue = trimmedValue.replace(/,/g, '').replace(/\s/g, '');
          const numValue = parseFloat(cleanedValue);

          if (!isNaN(numValue) && isFinite(numValue)) {
            if (updateTrade(floorId, tradeGroup, fieldPath, numValue)) {
              updateCount++;
              pastedCellKeys.push(`${actualRowIndex}-${actualColIndex}`);
            }
          } else {
            if (updateTrade(floorId, tradeGroup, fieldPath, null)) {
              updateCount++;
              pastedCellKeys.push(`${actualRowIndex}-${actualColIndex}`);
            }
          }
        });
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

  // --- Format helper ---
  const fv = (num: number): string => num === 0 ? '-' : num.toLocaleString('ko-KR', { minimumFractionDigits: 2, maximumFractionDigits: 2 });

  if (floors.length === 0) {
    return (
      <Card>
        <CardHeader><CardTitle>층별 물량 입력</CardTitle></CardHeader>
        <CardContent>
          <p className="text-sm text-slate-500 dark:text-slate-400">층 설정에서 층 정보를 입력해주세요.</p>
        </CardContent>
      </Card>
    );
  }

  /** Render a row of TradeInputCells for a given floorId/tradeGroup/trade */
  const renderTradeInputCells = (rowIndex: number, floorId: string, tradeGroup: string, trade: TradeData) => {
    const cellProps = (colIndex: number, value: number | null | undefined, fieldPath: string) => ({
      value,
      onChange: (v: number | null) => updateTrade(floorId, tradeGroup, fieldPath, v),
      rowIndex,
      colIndex,
      floorId,
      tradeGroup,
      fieldPath,
      onPaste: handlePaste,
      onSelect: handleCellSelect,
      onDragStart: handleDragStart,
      onDragMove: handleDragMove,
      isDragging,
      onTextDragStart: handleTextDragStart,
      onTextDragEnd: handleTextDragEnd,
      isDraggingTextRef,
      isSelected: selectedCells.has(`${rowIndex}-${colIndex}`),
      isRecentlyPasted: recentlyPastedCells.has(`${rowIndex}-${colIndex}`),
      getCellAddress: getCellAddressForCell,
    });

    return (
      <>
        {/* 형틀 합계 (읽기 전용) */}
        <td className="relative px-1 py-0.5 text-xs text-center border-r border-slate-200 dark:border-slate-800 bg-slate-100 dark:bg-slate-800 w-16">
          {getCellAddress(2, rowIndex, rows) && (
            <span className="absolute top-0.5 left-0.5 pointer-events-none select-none z-10 text-[9px] font-mono leading-none text-slate-400/60 dark:text-slate-600/60" aria-hidden="true">
              {getCellAddress(2, rowIndex, rows)}
            </span>
          )}
          {fv(calculateFormworkTotal(trade))}
        </td>
        <TradeInputCell {...cellProps(3, trade.gangForm?.areaM2 ?? null, 'gangForm.areaM2')} />
        <TradeInputCell {...cellProps(4, trade.alForm?.areaM2 ?? null, 'alForm.areaM2')} />
        <TradeInputCell {...cellProps(5, trade.euroForm?.areaM2 ?? null, 'euroForm.areaM2')} />
        {/* 해체/정리 (읽기 전용) */}
        <td className="relative px-1 py-0.5 text-xs text-center border-r border-slate-200 dark:border-slate-800 bg-slate-100 dark:bg-slate-800 w-16">
          {getCellAddress(6, rowIndex, rows) && (
            <span className="absolute top-0.5 left-0.5 pointer-events-none select-none z-10 text-[9px] font-mono leading-none text-slate-400/60 dark:text-slate-600/60" aria-hidden="true">
              {getCellAddress(6, rowIndex, rows)}
            </span>
          )}
          {fv(((trade.gangForm?.areaM2 || 0) + (trade.alForm?.areaM2 || 0) + (trade.euroForm?.areaM2 || 0)) * 2)}
        </td>
        <TradeInputCell {...cellProps(7, trade.rebar?.ton ?? null, 'rebar.ton')} />
        <TradeInputCell {...cellProps(8, trade.concrete?.volumeM3 ?? null, 'concrete.volumeM3')} />
      </>
    );
  };

  return (
    <Card>
      <div className="mx-4 mt-4 mb-0 p-3 bg-slate-50 dark:bg-slate-800/50 rounded-lg text-xs text-slate-600 dark:text-slate-400">
        <p className="font-medium mb-1">※ 산식 안내</p>
        <ul className="space-y-0.5 ml-3">
          <li>• 형틀 합계 = 갱폼(M²) + 알폼(M²) + 유로폼(M²)</li>
          <li>• 해체/정리 = 형틀합계(M²) × 2</li>
        </ul>
      </div>
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle>층별 물량 입력</CardTitle>
          <SaveStatusBar hasUnsavedChanges={hasUnsavedChanges} isSaving={isSaving} onSave={saveChanges} onDiscard={() => setShowDiscardConfirm(true)} />
        </div>
      </CardHeader>
      <div className="flex items-center gap-2 px-4 py-2 bg-blue-50 dark:bg-blue-900/20 text-xs text-blue-700 dark:text-blue-300 border-b border-blue-100 dark:border-blue-800">
        <ClipboardPaste className="w-4 h-4 flex-shrink-0" />
        <span>Excel에서 복사한 데이터를 셀에 붙여넣기(Ctrl+V)할 수 있습니다. 여러 셀을 한 번에 붙여넣기 가능합니다.</span>
      </div>
      <CardContent className="p-0">
        <div className="overflow-x-auto w-full">
          <table className="w-full border-collapse text-xs table-fixed min-w-full">
            <caption className="sr-only">층별 물량 입력 테이블 - 형틀, 해체/정리, 철근, 콘크리트 물량</caption>
            <thead className="sticky top-0 z-10 bg-white dark:bg-slate-950">
              <tr className="border-b-2 border-slate-300 dark:border-slate-700">
                <th scope="col" rowSpan={2} className="px-1 py-1 text-center text-xs font-semibold leading-tight text-slate-900 dark:text-white border-r border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950 w-16">구분</th>
                <th scope="col" rowSpan={2} className="px-1 py-1 text-center text-xs font-semibold leading-tight text-slate-900 dark:text-white border-r border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950 w-16">층</th>
                <th scope="colgroup" colSpan={4} className="px-1 py-1 text-center text-xs font-semibold leading-tight text-slate-900 dark:text-white border-r border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950">형틀</th>
                <th scope="col" className="px-1 py-1 text-center text-xs font-semibold leading-tight text-slate-900 dark:text-white border-r border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950">해체/정리</th>
                <th scope="col" className="px-1 py-1 text-center text-xs font-semibold leading-tight text-slate-900 dark:text-white border-r border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950">철근</th>
                <th scope="col" className="px-1 py-1 text-center text-xs font-semibold leading-tight text-slate-900 dark:text-white bg-white dark:bg-slate-950">콘크리트</th>
              </tr>
              <tr className="border-b border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-900">
                <th scope="col" className="px-1 py-1 text-xs font-medium leading-tight text-center text-slate-700 dark:text-slate-300 border-r border-slate-200 dark:border-slate-800 bg-slate-100 dark:bg-slate-800 w-16">합계(M²)</th>
                <th scope="col" className="px-1 py-1 text-xs font-medium leading-tight text-center text-slate-700 dark:text-slate-300 border-r border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-900 w-16">갱폼(M²)</th>
                <th scope="col" className="px-1 py-1 text-xs font-medium leading-tight text-center text-slate-700 dark:text-slate-300 border-r border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-900 w-16">알폼(M²)</th>
                <th scope="col" className="px-1 py-1 text-xs font-medium leading-tight text-center text-slate-700 dark:text-slate-300 border-r border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-900 w-16">유로폼(M²)</th>
                <th scope="col" className="px-1 py-1 text-xs font-medium leading-tight text-center text-slate-700 dark:text-slate-300 border-r border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-900 w-16">M²</th>
                <th scope="col" className="px-1 py-1 text-xs font-medium leading-tight text-center text-slate-700 dark:text-slate-300 border-r border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-900 w-16">TON</th>
                <th scope="col" className="px-1 py-1 text-xs font-medium leading-tight text-center text-slate-700 dark:text-slate-300 bg-slate-50 dark:bg-slate-900 w-16">M³</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((row, rowIndex) => {
                if (row.type === 'summary') {
                  const gangFormSum = calculateSummary('gangForm.areaM2');
                  const alFormSum = calculateSummary('alForm.areaM2');
                  const euroFormSum = calculateSummary('euroForm.areaM2');
                  return (
                    <tr key="summary" className="bg-slate-100 dark:bg-slate-800 font-semibold border-t-2 border-slate-300 dark:border-slate-700" style={{ height: '28px' }}>
                      <td className="px-1 py-0.5 text-xs text-center border-r border-slate-200 dark:border-slate-800 w-16">소계</td>
                      <td className="px-1 py-0.5 text-xs text-center border-r border-slate-200 dark:border-slate-800 w-16">합계</td>
                      <td className="px-1 py-0.5 text-xs text-center border-r border-slate-200 dark:border-slate-800 bg-slate-100 dark:bg-slate-800 w-16">{fv(gangFormSum + alFormSum + euroFormSum)}</td>
                      <td className="px-1 py-0.5 text-xs text-center border-r border-slate-200 dark:border-slate-800 w-16">{fv(gangFormSum)}</td>
                      <td className="px-1 py-0.5 text-xs text-center border-r border-slate-200 dark:border-slate-800 w-16">{fv(alFormSum)}</td>
                      <td className="px-1 py-0.5 text-xs text-center border-r border-slate-200 dark:border-slate-800 w-16">{fv(euroFormSum)}</td>
                      <td className="px-1 py-0.5 text-xs text-center border-r border-slate-200 dark:border-slate-800 bg-slate-100 dark:bg-slate-800 w-16">{fv((gangFormSum + alFormSum + euroFormSum) * 2)}</td>
                      <td className="px-1 py-0.5 text-xs text-center border-r border-slate-200 dark:border-slate-800 w-16">{fv(calculateSummary('rebar.ton'))}</td>
                      <td className="px-1 py-0.5 text-xs text-center w-16">{fv(calculateSummary('concrete.volumeM3'))}</td>
                    </tr>
                  );
                }

                const tradeGroup = row.tradeGroup || '아파트';
                const floorId = row.floor?.id || '';

                if (row.type === 'group') {
                  const specialFloorId = createSpecialFloorId(building.id, tradeGroup);
                  const groupTrade = getTrade(specialFloorId, tradeGroup);
                  return (
                    <tr key={row.label} className="bg-slate-50 dark:bg-slate-900/50" style={{ height: '28px' }}>
                      <td className="px-1 py-0.5 text-xs text-center font-medium border-r border-slate-200 dark:border-slate-800 w-16">{row.label}</td>
                      <td className="px-1 py-0.5 text-xs text-center border-r border-slate-200 dark:border-slate-800 w-16">-</td>
                      {renderTradeInputCells(rowIndex, specialFloorId, tradeGroup, groupTrade)}
                    </tr>
                  );
                }

                // 일반 층 행
                const floorTrade = getTrade(floorId, tradeGroup);
                const floorClass = row.floor?.floorClass || '';
                return (
                  <tr key={row.floor?.id} className="hover:bg-slate-50 dark:hover:bg-slate-900/50" style={{ height: '28px' }}>
                    <td className="px-1 py-0.5 text-xs text-center border-r border-slate-200 dark:border-slate-800 w-16">{floorClass}</td>
                    <td className="px-1 py-0.5 text-xs text-center font-medium border-r border-slate-200 dark:border-slate-800 w-16">{row.label}</td>
                    {renderTradeInputCells(rowIndex, floorId, tradeGroup, floorTrade)}
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </CardContent>
      <ConfirmDialog
        open={showDiscardConfirm}
        onOpenChange={setShowDiscardConfirm}
        title="변경사항 취소"
        description="저장하지 않은 변경사항이 모두 사라집니다. 정말 취소하시겠습니까?"
        variant="warning"
        confirmText="취소하기"
        cancelText="돌아가기"
        onConfirm={() => {
          discardChanges();
          setShowDiscardConfirm(false);
        }}
      />
    </Card>
  );
  }
);

FloorTradeTable.displayName = 'FloorTradeTable';
