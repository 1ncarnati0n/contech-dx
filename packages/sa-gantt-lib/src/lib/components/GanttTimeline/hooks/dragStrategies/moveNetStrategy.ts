// ============================================
// Move-Net 전략: 순작업 위치 이동 (간접작업 조정)
// ============================================

import type { DragStrategy, DragOriginalState, DragContext, DragCalculationResult } from './types';

/**
 * 순작업 위치 이동 전략
 *
 * 핵심 원리:
 * - 순작업 바를 좌우로 이동하면 선간접/후간접이 반대로 조정됨
 * - 전체 바 길이는 유지 (시작일/종료일 불변)
 * - 선간접 최대 증가량 = 원래 후간접 일수
 * - 선간접 최대 감소량 = 원래 선간접 일수
 */
export const moveNetStrategy: DragStrategy = {
    calculate(state: DragOriginalState, context: DragContext): DragCalculationResult {
        const { deltaDays } = context;

        // 제약 조건: 선간접 조정 가능 범위
        const maxPreIncrease = state.originalIndirectWorkDaysPost;
        const maxPreDecrease = state.originalIndirectWorkDaysPre;

        // deltaDays를 제약 범위 내로 클램핑
        const constrainedDelta = Math.max(
            -maxPreDecrease,
            Math.min(maxPreIncrease, deltaDays)
        );

        // 선간접 증가 = 후간접 감소 (또는 반대)
        const newPreDays = state.originalIndirectWorkDaysPre + constrainedDelta;
        const newPostDays = state.originalIndirectWorkDaysPost - constrainedDelta;

        return {
            currentStartDate: state.originalStartDate,
            currentEndDate: state.originalEndDate,
            currentIndirectWorkDaysPre: newPreDays,
            currentNetWorkDays: state.originalNetWorkDays,
            currentIndirectWorkDaysPost: newPostDays,
        };
    },
};
