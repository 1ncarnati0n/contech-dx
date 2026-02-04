/**
 * 공정계획 세부공정 컴포넌트 모듈
 *
 * 세부공정 상세 패널, 개별 항목 카드, 산식 표시 컴포넌트를 제공합니다.
 *
 * 🎯 Stage 2 Task 4: Component Separation (추가)
 * - BuildingInfoHeader: 건물 정보 헤더 (호수, 펌프카 대수)
 * - ProcessTableHeader: 테이블 헤더 (컬럼명)
 */

export { ProcessDetailPanel } from './ProcessDetailPanel';
export { ProcessItemCard } from './ProcessItemCard';
export { FormulaDisplay } from './FormulaDisplay';
export type { FormulaStep, CalculationResult } from './FormulaDisplay';
export { useProcessCalculation } from './hooks/useProcessCalculation';

// Stage 2 Task 4: New components
export { BuildingInfoHeader } from './BuildingInfoHeader';
export { ProcessTableHeader } from './ProcessTableHeader';
