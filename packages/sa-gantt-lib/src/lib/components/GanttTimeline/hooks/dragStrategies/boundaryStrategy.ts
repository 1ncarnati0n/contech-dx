// ============================================
// Boundary 전략: 선간접-순작업 / 순작업-후간접 경계 조정
// ============================================

import type { DragStrategy, DragOriginalState, DragContext, DragCalculationResult } from './types';

/**
 * 선간접-순작업 경계 조정 전략 (resize-pre-net)
 *
 * 핵심 원리:
 * - 경계선을 이동하면 선간접 증가 = 순작업 감소 (또는 반대)
 * - 전체 바 길이 유지 (시작일/종료일 불변)
 * - 순작업은 최소 1일 유지
 */
export const resizePreNetStrategy: DragStrategy = {
    calculate(state: DragOriginalState, context: DragContext): DragCalculationResult {
        const { deltaDays } = context;

        // 제약 조건
        // - 선간접 최대 증가량 = 순작업일 - 1 (순작업 최소 1일 유지)
        // - 선간접 최대 감소량 = 원래 선간접 일수
        const maxPreIncrease = state.originalNetWorkDays - 1;
        const maxPreDecrease = state.originalIndirectWorkDaysPre;

        const constrainedDelta = Math.max(
            -maxPreDecrease,
            Math.min(maxPreIncrease, deltaDays)
        );

        return {
            currentStartDate: state.originalStartDate,
            currentEndDate: state.originalEndDate,
            currentIndirectWorkDaysPre: state.originalIndirectWorkDaysPre + constrainedDelta,
            currentNetWorkDays: state.originalNetWorkDays - constrainedDelta,
            currentIndirectWorkDaysPost: state.originalIndirectWorkDaysPost,
        };
    },
};

/**
 * 순작업-후간접 경계 조정 전략 (resize-net-post)
 *
 * 핵심 원리:
 * - 경계선을 이동하면 순작업 증가 = 후간접 감소 (또는 반대)
 * - 전체 바 길이 유지 (시작일/종료일 불변)
 * - 순작업은 최소 1일 유지
 */
export const resizeNetPostStrategy: DragStrategy = {
    calculate(state: DragOriginalState, context: DragContext): DragCalculationResult {
        const { deltaDays } = context;

        // 제약 조건
        // - 순작업 최대 증가량 = 원래 후간접 일수
        // - 순작업 최대 감소량 = 순작업일 - 1 (최소 1일 유지)
        const maxNetIncrease = state.originalIndirectWorkDaysPost;
        const maxNetDecrease = state.originalNetWorkDays - 1;

        const constrainedDelta = Math.max(
            -maxNetDecrease,
            Math.min(maxNetIncrease, deltaDays)
        );

        return {
            currentStartDate: state.originalStartDate,
            currentEndDate: state.originalEndDate,
            currentIndirectWorkDaysPre: state.originalIndirectWorkDaysPre,
            currentNetWorkDays: state.originalNetWorkDays + constrainedDelta,
            currentIndirectWorkDaysPost: state.originalIndirectWorkDaysPost - constrainedDelta,
        };
    },
};
