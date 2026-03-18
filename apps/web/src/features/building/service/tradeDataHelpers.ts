/**
 * TradeData 타입 안전 접근 헬퍼 함수
 *
 * TradeData의 동적 카테고리/서브필드 접근을 타입 안전하게 처리합니다.
 */

import type { TradeData, TradeFieldData } from '@/shared/types';
import { logger } from '@/shared/utils/logger';

export type { TradeData, TradeFieldData };

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
 * TradeFieldData의 알려진 키 목록
 */
const KNOWN_TRADE_FIELD_KEYS = [
  'areaM2',
  'productivity',
  'productivityM2',
  'productivityM3',
  'workers',
  'cost',
  'ton',
  'volumeM3',
  'wall',
  'beamSlab',
] as const;

/**
 * TradeData 타입 가드
 * 객체가 TradeFieldData의 알려진 키 중 하나라도 포함하는지 확인
 */
export function isTradeFieldData(value: unknown): value is TradeFieldData {
  // 기본 타입 체크
  if (typeof value !== 'object' || value === null || Array.isArray(value)) {
    return false;
  }

  const obj = value as Record<string, unknown>;
  const keys = Object.keys(obj);

  // 빈 객체도 유효 (빈 TradeFieldData는 허용)
  if (keys.length === 0) {
    return true;
  }

  // 알려진 키 중 하나라도 포함하는지 확인
  const hasKnownKey = keys.some((key) =>
    KNOWN_TRADE_FIELD_KEYS.includes(key as (typeof KNOWN_TRADE_FIELD_KEYS)[number])
  );

  // 포함된 알려진 키의 값이 number 또는 undefined인지 확인
  if (hasKnownKey) {
    for (const key of KNOWN_TRADE_FIELD_KEYS) {
      const val = obj[key];
      if (val !== undefined && typeof val !== 'number') {
        return false;
      }
    }
    return true;
  }

  return false;
}

/**
 * 값이 TradeData인지 확인하는 타입 가드
 */
export function isTradeData(value: unknown): value is TradeData {
  if (typeof value !== 'object' || value === null || Array.isArray(value)) {
    return false;
  }

  const obj = value as Record<string, unknown>;

  // 모든 값이 TradeFieldData이거나 undefined인지 확인
  return Object.values(obj).every(
    (val) => val === undefined || isTradeFieldData(val)
  );
}

/**
 * 물량 조회에 사용되는 유효한 subField 값들
 */
export const QUANTITY_SUBFIELDS = ['areaM2', 'ton', 'volumeM3'] as const;
export type QuantitySubField = typeof QUANTITY_SUBFIELDS[number];

/**
 * subField가 유효한 물량 필드인지 검증
 */
export function isValidQuantitySubField(field: string): field is QuantitySubField {
  return QUANTITY_SUBFIELDS.includes(field as QuantitySubField);
}

/**
 * TradeFieldData에서 안전하게 물량 값 가져오기
 *
 * @param tradeData - 공종 필드 데이터
 * @param subField - 조회할 필드명 (areaM2, ton, volumeM3)
 * @returns 물량 값 (실패 시 0 반환)
 */
export function getQuantityValue(
  tradeData: TradeFieldData | undefined,
  subField: string
): number {
  if (!tradeData) return 0;

  if (!isValidQuantitySubField(subField)) {
    if (process.env.NODE_ENV === 'development') {
      logger.warn(
        `[getQuantityValue] Invalid subField: "${subField}". ` +
        `Valid fields: ${QUANTITY_SUBFIELDS.join(', ')}`
      );
    }
    return 0;
  }

  const value = (tradeData as Record<string, number | undefined>)[subField];
  return typeof value === 'number' ? value : 0;
}
