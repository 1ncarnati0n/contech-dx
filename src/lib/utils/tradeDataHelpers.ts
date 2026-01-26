/**
 * TradeData 타입 안전 접근 헬퍼 함수
 *
 * TradeData의 동적 카테고리/서브필드 접근을 타입 안전하게 처리합니다.
 */

import type { TradeData, TradeFieldData } from '@/lib/types';

/**
 * TradeData에서 카테고리 데이터 가져오기
 */
export function getTradeCategory(
  trades: TradeData,
  category: string
): TradeFieldData | undefined {
  return trades[category];
}

/**
 * TradeData에서 서브필드 값 가져오기
 */
export function getTradeValue(
  trades: TradeData,
  category: string,
  subField: string
): number | undefined {
  const categoryData = trades[category];
  if (!categoryData) return undefined;
  return (categoryData as Record<string, number | undefined>)[subField];
}

/**
 * TradeData에 카테고리 데이터 설정
 */
export function setTradeCategory(
  trades: TradeData,
  category: string,
  data: TradeFieldData
): void {
  (trades as Record<string, TradeFieldData | undefined>)[category] = data;
}

/**
 * TradeData에서 카테고리 삭제
 */
export function deleteTradeCategory(
  trades: TradeData,
  category: string
): void {
  delete (trades as Record<string, TradeFieldData | undefined>)[category];
}

/**
 * TradeData의 서브필드 값 설정
 */
export function setTradeValue(
  trades: TradeData,
  category: string,
  subField: string,
  value: number
): void {
  if (!trades[category]) {
    (trades as Record<string, TradeFieldData | undefined>)[category] = {};
  }
  const categoryData = trades[category] as Record<string, number | undefined>;
  categoryData[subField] = value;
}

/**
 * TradeData의 서브필드 삭제
 */
export function deleteTradeValue(
  trades: TradeData,
  category: string,
  subField: string
): void {
  const categoryData = trades[category];
  if (categoryData) {
    delete (categoryData as Record<string, number | undefined>)[subField];
  }
}

/**
 * 도트 표기법 필드 파싱 (예: "gangForm.areaM2" -> ["gangForm", "areaM2"])
 */
export function parseTradeField(field: string): { category: string; subField?: string } {
  const parts = field.split('.');
  if (parts.length === 2) {
    return { category: parts[0], subField: parts[1] };
  }
  return { category: field };
}

/**
 * TradeData에서 도트 표기법으로 값 가져오기
 */
export function getTradeValueByPath(
  trades: TradeData,
  path: string
): number | undefined {
  const { category, subField } = parseTradeField(path);
  if (subField) {
    return getTradeValue(trades, category, subField);
  }
  // 카테고리만 있는 경우 (최상위 필드 접근)
  const value = trades[category];
  return typeof value === 'number' ? value : undefined;
}

/**
 * TradeData에 도트 표기법으로 값 설정
 */
export function setTradeValueByPath(
  trades: TradeData,
  path: string,
  value: number | null
): void {
  const { category, subField } = parseTradeField(path);

  if (value === null) {
    // null이면 삭제
    if (subField) {
      deleteTradeValue(trades, category, subField);
    } else {
      deleteTradeCategory(trades, category);
    }
  } else {
    // 값 설정
    if (subField) {
      setTradeValue(trades, category, subField, value);
    } else {
      (trades as Record<string, number | undefined>)[category] = value;
    }
  }
}

/**
 * TradeData 타입 가드
 */
export function isTradeFieldData(value: unknown): value is TradeFieldData {
  return typeof value === 'object' && value !== null;
}
