/**
 * 레거시 물량 참조 → SemanticQuantityReference 변환 유틸리티
 *
 * 기존 Excel 셀 주소 형식의 참조를 의미론적 참조로 파싱합니다.
 * 점진적 마이그레이션 기간 동안 사용됩니다.
 */

import type { ProcessCategory } from '@/lib/types';
import type { SemanticQuantityReference } from '@/lib/types/process-quantity';
import { TRADE_FIELD_MAP } from '@/lib/types/process-quantity';

/**
 * Excel 행 번호 → tradeGroup 매핑
 * 행 6=버림, 행 7=기초, 행 8=B2, 행 9=B1
 */
const ROW_TO_CATEGORY: Record<number, string> = {
  6: '버림',
  7: '기초',
};

/**
 * 레거시 참조 문자열을 SemanticQuantityReference로 변환
 *
 * 지원하는 패턴:
 * - 'D6'           → category 참조 (버림 formwork)
 * - 'F7*0.45'      → category 참조 with ratio
 * - 'B14*0.45'     → floor 참조 (기준층 gangForm 45%)
 * - 'F_B1B2_COMBINED' → combined 참조 (B1+B2 합산)
 * - 'E14+E16'      → 복합 참조 (미지원 - null 반환)
 *
 * @param reference - 레거시 참조 문자열
 * @param category - 공정 구분 (sourceType 결정에 사용)
 * @returns SemanticQuantityReference 또는 null (파싱 불가 시)
 */
export function parseLegacyReference(
  reference: string | undefined,
  category: ProcessCategory
): SemanticQuantityReference | null {
  if (!reference) return null;

  // 1. Combined B1+B2 references: 'F_B1B2_COMBINED'
  const combinedMatch = reference.match(/^([A-Z])_B1B2_COMBINED$/);
  if (combinedMatch) {
    const [, col] = combinedMatch;
    const mapping = TRADE_FIELD_MAP[col];
    if (!mapping) return null;
    return {
      tradeField: mapping.tradeField,
      subField: mapping.subField,
      ratio: 1,
      sourceType: 'combined',
      combineFloors: ['B1', 'B2'],
    };
  }

  // 2. Composite references (E14+E16): 현재 미지원 - null 반환
  // 이 패턴은 기존 getQuantityByReference에서 재귀적으로 처리되므로
  // SemanticQuantityReference로 단일 변환이 어려움
  if (reference.includes('+')) {
    return null;
  }

  // 3. Standard cell references: 'D6', 'F7*0.45', 'B14*0.45'
  const match = reference.match(/^([A-Z])(\d+)(?:\*([\d.]+))?$/);
  if (!match) return null;

  const [, col, row, ratioStr] = match;
  const rowNum = parseInt(row, 10);
  const ratio = ratioStr ? parseFloat(ratioStr) : 1;

  const mapping = TRADE_FIELD_MAP[col];
  if (!mapping) return null;

  // sourceType 결정: category 파라미터와 행 번호 모두 참조
  const sourceType = determineSourceType(category, rowNum);

  const ref: SemanticQuantityReference = {
    tradeField: mapping.tradeField,
    subField: mapping.subField,
    ratio,
    sourceType,
  };

  // category sourceType인 경우 tradeGroup 추가
  if (sourceType === 'category') {
    const tradeGroup = ROW_TO_CATEGORY[rowNum];
    if (tradeGroup) {
      ref.tradeGroup = tradeGroup;
    }
  }

  return ref;
}

/**
 * 카테고리와 행 번호로 sourceType 결정
 *
 * - 버림(row 6), 기초(row 7) → 'category' (tradeGroup으로 합산 조회)
 * - 지하층(층고6.5m이상) → 'combined' (이미 _B1B2_COMBINED 패턴으로 처리됨)
 * - 나머지 → 'floor' (층별 직접 조회)
 */
function determineSourceType(
  category: ProcessCategory,
  rowNum: number
): 'category' | 'floor' | 'combined' {
  // 버림/기초는 tradeGroup 기반 합산
  if (rowNum === 6 || rowNum === 7) {
    return 'category';
  }

  // 나머지는 층별 직접 참조
  return 'floor';
}
