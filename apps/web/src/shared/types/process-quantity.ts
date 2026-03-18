/**
 * 공정모듈 물량참조 의미론적 타입 정의
 *
 * Excel 셀 주소('D6', 'B14*0.45') 대신 의미론적 참조를 사용하여
 * 공정모듈이 "어떤 공종의 어떤 필드를" 참조하는지 명확히 함.
 */

/**
 * 공종 필드 키 타입
 */
export type TradeFieldKey = 'gangForm' | 'alForm' | 'formwork' | 'euroForm' | 'stripClean' | 'rebar' | 'concrete';

/**
 * 공종 서브필드 키 타입
 */
export type TradeSubFieldKey = 'areaM2' | 'ton' | 'volumeM3';

/**
 * 물량 소스 타입
 * - category: tradeGroup으로 필터링 (버림, 기초 등)
 * - floor: 특정 층의 물량을 직접 참조
 * - combined: 여러 층의 물량을 합산 (B1+B2 통합)
 */
export type QuantitySourceType = 'category' | 'floor' | 'combined';

/**
 * 의미론적 물량 참조
 *
 * 공정 항목이 어떤 물량을 참조하는지를 Excel 셀 주소 대신
 * 도메인 용어로 표현합니다.
 *
 * @example
 * // 기존: quantityReference: 'D6'
 * // 신규:
 * {
 *   tradeField: 'formwork',
 *   subField: 'areaM2',
 *   ratio: 1,
 *   sourceType: 'category',
 *   tradeGroup: '버림'
 * }
 *
 * @example
 * // 기존: quantityReference: 'B14*0.45'
 * // 신규:
 * {
 *   tradeField: 'gangForm',
 *   subField: 'areaM2',
 *   ratio: 0.45,
 *   sourceType: 'floor'
 * }
 */
export interface SemanticQuantityReference {
  /** 참조할 공종 필드 */
  tradeField: TradeFieldKey;
  /** 참조할 서브필드 */
  subField: TradeSubFieldKey;
  /** 비율 (1.0 = 100%, 0.45 = 45%) */
  ratio: number;
  /** 물량 소스 타입 */
  sourceType: QuantitySourceType;
  /** sourceType='category'일 때 사용할 tradeGroup (버림, 기초 등) */
  tradeGroup?: string;
  /** sourceType='combined'일 때 합산할 층 목록 */
  combineFloors?: string[];
}

/**
 * Excel 컬럼 → 공종 필드 매핑 (중앙화)
 *
 * 기존 4개 파일에 중복되어 있던 매핑을 단일 소스로 통합:
 * - quantity-reference.ts (lines 284-292, 332-361)
 * - process-days-calculator.ts (lines 307-314)
 * - BuildingProcessPlanPage.tsx (inline ternary chains)
 * - BasementProcessPlanPage.tsx (lines 54-63)
 */
export const TRADE_FIELD_MAP: Record<string, { tradeField: TradeFieldKey; subField: TradeSubFieldKey }> = {
  B: { tradeField: 'gangForm', subField: 'areaM2' },
  C: { tradeField: 'alForm', subField: 'areaM2' },
  D: { tradeField: 'formwork', subField: 'areaM2' },
  E: { tradeField: 'stripClean', subField: 'areaM2' },
  F: { tradeField: 'rebar', subField: 'ton' },
  G: { tradeField: 'concrete', subField: 'volumeM3' },
  U: { tradeField: 'euroForm', subField: 'areaM2' },
};

/**
 * 공종 필드 → Excel 컬럼 역매핑
 * UI 표시 등에서 trade field를 column letter로 변환할 때 사용
 */
export const TRADE_FIELD_TO_COLUMN: Record<TradeFieldKey, string> = {
  gangForm: 'B',
  alForm: 'C',
  formwork: 'D',
  stripClean: 'E',
  rebar: 'F',
  concrete: 'G',
  euroForm: 'U',
};
