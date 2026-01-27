// ============================================
// 드래그 전략 팩토리
// ============================================

import type { DragType } from '../../types';
import type { DragStrategy, DragOriginalState, DragContext, DragCalculationResult } from './types';

// 전략 구현체 import
import { moveStrategy } from './moveStrategy';
import { moveNetStrategy } from './moveNetStrategy';
import { resizePreStrategy } from './resizePreStrategy';
import { resizePostStrategy } from './resizePostStrategy';
import { resizePreNetStrategy, resizeNetPostStrategy } from './boundaryStrategy';

// 타입 재export
export type { DragStrategy, DragOriginalState, DragContext, DragCalculationResult } from './types';

/**
 * DragType에 해당하는 전략 반환
 */
const strategyMap: Record<DragType, DragStrategy> = {
    move: moveStrategy,
    'move-net': moveNetStrategy,
    'resize-pre': resizePreStrategy,
    'resize-post': resizePostStrategy,
    'resize-pre-net': resizePreNetStrategy,
    'resize-net-post': resizeNetPostStrategy,
};

/**
 * DragType에 해당하는 전략 가져오기
 */
export const getDragStrategy = (dragType: DragType): DragStrategy => {
    const strategy = strategyMap[dragType];
    if (!strategy) {
        throw new Error(`Unknown drag type: ${dragType}`);
    }
    return strategy;
};

/**
 * 드래그 결과 계산 (팩토리 함수)
 *
 * 기존 calculateDragResult 함수를 대체
 * switch문 없이 전략 패턴으로 처리
 */
export const calculateDragResult = (
    dragType: DragType,
    state: DragOriginalState,
    context: DragContext
): DragCalculationResult => {
    const strategy = getDragStrategy(dragType);
    return strategy.calculate(state, context);
};

// 개별 전략도 export (테스트용)
export { moveStrategy } from './moveStrategy';
export { moveNetStrategy } from './moveNetStrategy';
export { resizePreStrategy } from './resizePreStrategy';
export { resizePostStrategy } from './resizePostStrategy';
export { resizePreNetStrategy, resizeNetPostStrategy } from './boundaryStrategy';
