import type { TradeData, FloorTrade } from '@/shared/types';
import { getTradeValue } from './tradeDataHelpers';
import type { RowInfo } from './buildTradeRows';

// ─── 값 포맷팅 ───

export function formatTradeValue(num: number): string {
  return num === 0 ? '-' : num.toLocaleString('ko-KR', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

export function formatTradeValueEmpty(num: number): string {
  return num === 0 ? '' : num.toLocaleString('ko-KR', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

// ─── 계산 함수 ───

export function calculateFormworkTotal(trade: TradeData): number {
  return (trade.gangForm?.areaM2 || 0) + (trade.alForm?.areaM2 || 0) + (trade.euroForm?.areaM2 || 0);
}

export function calculateDemolitionTotal(trade: TradeData): number {
  return calculateFormworkTotal(trade) * 2;
}

export function calculateRebarTotal(trade: TradeData): number {
  return (trade.rebar?.wall || 0) + (trade.rebar?.beamSlab || 0);
}

export function calculateConcreteTotal(trade: TradeData): number {
  return (trade.concrete?.wall || 0) + (trade.concrete?.beamSlab || 0);
}

export function calculateSummary(trades: Map<string, FloorTrade>, field: string): number {
  let sum = 0;
  trades.forEach(trade => {
    const [category, subField] = field.split('.');
    if (subField) {
      const value = getTradeValue(trade.trades, category, subField);
      if (typeof value === 'number') sum += value;
    }
  });
  return sum;
}

export function toleranceClass(input: number, detailed: number): string {
  return Math.abs(input - detailed) > 0.01 ? 'text-red-600 dark:text-red-400' : '';
}

// ─── FloorTradeTable 셀 주소 매핑 ───

/**
 * 열 인덱스를 공정모듈 열 문자로 변환
 * B=갱폼, C=알폼, D=형틀 합계, U=유로폼, E=해체/정리, F=철근, G=콘크리트
 */
export function getColumnLetter(colIndex: number): string | null {
  const mapping: Record<number, string> = {
    2: 'D', 3: 'B', 4: 'C', 5: 'U', 6: 'E', 7: 'F', 8: 'G',
  };
  return mapping[colIndex] || null;
}

function parseFloorNumber(label: string): number | null {
  const match = label.match(/^(\d+)F?$/);
  return match ? parseInt(match[1], 10) : null;
}

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

export function getCellAddress(colIndex: number, rowIndex: number, rows: RowInfo[]): string | null {
  const columnLetter = getColumnLetter(colIndex);
  if (!columnLetter) return null;
  const rowNumber = getExcelRowNumber(rowIndex, rows);
  if (rowNumber < 0) return null;
  return `${columnLetter}${rowNumber}`;
}

// ─── 컬럼→필드 매핑 ───

/** FloorTradeTable column index → fieldPath */
export function getColumnFieldPath(colIndex: number): string | null {
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

/** DetailedFloorTradeTable column index → fieldPath */
const DETAILED_COLUMN_FIELD_MAP: Record<number, string | null> = {
  2: null,              // 형틀 합계
  3: 'gangForm.areaM2',
  4: 'alForm.areaM2',
  5: 'euroForm.areaM2',
  6: null,              // 해체/정리
  7: null,              // 철근 합계
  8: 'rebar.wall',
  9: 'rebar.beamSlab',
  10: null,             // 콘크리트 합계
  11: 'concrete.wall',
  12: 'concrete.beamSlab',
};

export function getDetailedColumnFieldPath(colIndex: number): string | null {
  if (colIndex < 2) return null;
  return DETAILED_COLUMN_FIELD_MAP[colIndex] ?? null;
}

// ─── 붙여넣기 파싱 ───

export interface PastedCell {
  rowIndex: number;
  colIndex: number;
  floorId: string;
  tradeGroup: string;
  fieldPath: string;
  value: number | null;
}

/**
 * 클립보드 텍스트를 파싱하여 업데이트할 셀 목록을 반환하는 순수 함수.
 */
export function parsePasteData(
  clipboardText: string,
  startRowIndex: number,
  startColIndex: number,
  rows: RowInfo[],
  buildingId: string,
  columnFieldPathFn: (colIndex: number) => string | null,
): PastedCell[] {
  const normalizedData = clipboardText.replace(/\r\n/g, '\n').replace(/\r/g, '\n');
  const validRows = normalizedData.split('\n')
    .map(row => row.trim().split('\t').map(cell => cell || ''))
    .filter(row => row.length > 0 && row.some(cell => cell.trim() !== ''));

  if (validRows.length === 0) return [];

  const result: PastedCell[] = [];

  validRows.forEach((pastedRow, rowOffset) => {
    const actualRowIndex = startRowIndex + rowOffset;
    if (actualRowIndex >= rows.length) return;

    const rowInfo = rows[actualRowIndex];
    if (!rowInfo || rowInfo.type === 'summary') return;

    const tradeGroup = rowInfo.tradeGroup || '아파트';
    const floorId = rowInfo.floor?.id || (rowInfo.type === 'group' ? createSpecialFloorIdInline(buildingId, tradeGroup) : '');
    if (!floorId) return;

    pastedRow.forEach((cellValue, colOffset) => {
      const actualColIndex = startColIndex + colOffset;
      const fieldPath = columnFieldPathFn(actualColIndex);
      if (!fieldPath) return;

      const trimmedValue = (cellValue || '').trim();
      if (!trimmedValue) return;

      const cleanedValue = trimmedValue.replace(/,/g, '').replace(/\s/g, '');
      const numValue = parseFloat(cleanedValue);

      result.push({
        rowIndex: actualRowIndex,
        colIndex: actualColIndex,
        floorId,
        tradeGroup,
        fieldPath,
        value: (!isNaN(numValue) && isFinite(numValue)) ? numValue : null,
      });
    });
  });

  return result;
}

/** Inline version to avoid circular dependency with floorIdUtils */
function createSpecialFloorIdInline(buildingId: string, tradeGroup: string): string {
  return `${buildingId}-special-${tradeGroup}`;
}

// ─── 키보드 삭제 파싱 ───

export interface DeleteCell {
  floorId: string;
  tradeGroup: string;
  fieldPath: string;
}

/**
 * 선택된 셀들에서 삭제할 셀 목록을 반환하는 순수 함수.
 */
export function parseDeleteCells(
  selectedCells: Set<string>,
  rows: RowInfo[],
  buildingId: string,
  columnFieldPathFn: (colIndex: number) => string | null,
): DeleteCell[] {
  const result: DeleteCell[] = [];

  selectedCells.forEach(cellKey => {
    const [rowIdx, colIdx] = cellKey.split('-').map(Number);
    if (rowIdx >= 0 && rowIdx < rows.length) {
      const rowInfo = rows[rowIdx];
      if (rowInfo && rowInfo.type !== 'summary') {
        const tradeGroup = rowInfo.tradeGroup || '아파트';
        const floorId = rowInfo.floor?.id || (rowInfo.type === 'group' ? createSpecialFloorIdInline(buildingId, tradeGroup) : '');
        if (floorId) {
          const fieldPath = columnFieldPathFn(colIdx);
          if (fieldPath) {
            result.push({ floorId, tradeGroup, fieldPath });
          }
        }
      }
    }
  });

  return result;
}
