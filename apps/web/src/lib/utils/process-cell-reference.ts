/**
 * 공정계획 테이블용 셀 참조 라벨 유틸리티
 * 물량입력 페이지의 엑셀 셀 주소(예: "D6", "F13", "G26")를 표시하기 위한 매핑
 *
 * 열(Column) 매핑:
 *   B=갱폼, C=알폼, D=형틀합계(갱폼+알폼+유로폼), U=유로폼, E=해체/정리, F=철근, G=콘크리트
 *
 * 행(Row) 매핑 (quantity-reference.ts와 동일한 규칙):
 *   버림=6, 기초=7, B2=8, B1=9, 1F=11, 2F=12, ..., NF=N+10
 *   옥탑층: max(maxFloorNumber+10, 25) + N (동별 최대 지상층에 따라 동적 계산)
 */

import type { ProcessCategory } from '@/lib/types';

/** 형틀 서브컬럼 타입 */
export type FormworkColumnType = 'formworkTotal' | 'gangForm' | 'alForm' | 'euroForm';

/** 전체 컬럼 타입 */
export type ColumnType = FormworkColumnType | 'stripClean' | 'rebar' | 'concrete';

/**
 * 공정계획 행의 카테고리/층 정보로부터 물량입력 셀 주소를 반환
 *
 * @param category - 공정 구분 (버림, 기초, 주동 지하층, 셋팅층, 기준층, 옥탑층)
 * @param floorLabel - 층 라벨 (B2, B1, 1F, 2F, 옥탑1 등)
 * @param columnType - 물량 유형 (formworkTotal, gangForm, alForm, euroForm, rebar, concrete)
 * @param maxFloorNumber - 해당 동의 최대 지상층 번호 (옥탑 제외). 옥탑층 행 번호 계산에 사용
 * @returns 셀 주소 문자열 (예: "D6", "B8", "U26", "F13", "G26") 또는 null
 */
export function getCellReferenceForRow(
  category: ProcessCategory,
  floorLabel: string | undefined,
  columnType: ColumnType,
  maxFloorNumber?: number
): string | null {
  const rowNum = getRowNumber(category, floorLabel, maxFloorNumber);
  if (rowNum === null) return null;

  const colLabel = getColumnLabel(columnType);
  return `${colLabel}${rowNum}`;
}

function getColumnLabel(columnType: ColumnType): string {
  switch (columnType) {
    case 'formworkTotal':
      return 'D';
    case 'gangForm':
      return 'B';
    case 'alForm':
      return 'C';
    case 'euroForm':
      return 'U';
    case 'stripClean':
      return 'E';
    case 'rebar':
      return 'F';
    case 'concrete':
      return 'G';
  }
}

function getRowNumber(
  category: ProcessCategory,
  floorLabel: string | undefined,
  maxFloorNumber?: number
): number | null {
  // 버림, 기초: 고정 행
  if (category === '버림') return 6;
  if (category === '기초') return 7;

  // 주동 지하층: B2=8, B1=9
  if (category === '주동 지하층') {
    if (!floorLabel) return null;
    if (floorLabel === 'B2') return 8;
    if (floorLabel === 'B1') return 9;
    return null;
  }

  // 셋팅층/일반층: NF → N+10
  if (category === '셋팅층' || category === '일반층') {
    return floorLabelToRow(floorLabel);
  }

  // 기준층/최상층: NF → N+10
  if (category === '기준층' || category === '최상층') {
    return floorLabelToRow(floorLabel);
  }

  // 옥탑층: 동적 시작 행 = max(maxFloorNumber + 10, 25) + N
  // 101동(15F): PH1=26, PH2=27 (기존과 동일)
  // 102동(25F): PH1=36, PH2=37 (16F~25F 행과 충돌 방지)
  if (category === '옥탑층') {
    if (!floorLabel) return null;
    const phStartRow = maxFloorNumber
      ? Math.max(maxFloorNumber + 10, 25)
      : 25;
    // "옥탑1", "옥탑2", "옥탑3" 등
    const match = floorLabel.match(/옥탑(\d+)/);
    if (match) {
      const n = parseInt(match[1], 10);
      if (n >= 1 && n <= 3) return phStartRow + n;
    }
    // "PH1", "PH2", "PH3"
    const phMatch = floorLabel.match(/PH(\d+)/i);
    if (phMatch) {
      const n = parseInt(phMatch[1], 10);
      if (n >= 1 && n <= 3) return phStartRow + n;
    }
    return null;
  }

  // 지하주차장 등 특수 행은 참조 없음
  return null;
}

/** "NF" → N+10 (1F→11, 2F→12, ..., 15F→25, 16F→26, ..., 25F→35) */
function floorLabelToRow(floorLabel: string | undefined): number | null {
  if (!floorLabel) return null;
  const match = floorLabel.match(/(\d+)F/);
  if (!match) return null;
  const n = parseInt(match[1], 10);
  const row = n + 10;
  if (row < 11) return null;
  return row;
}
