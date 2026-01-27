// ============================================
// Resize-Post 전략: 후간접/순작업 종료 조정
// ============================================

import { addDays } from 'date-fns';
import { addWorkingDays } from '../../../../utils/dateUtils';
import type { DragStrategy, DragOriginalState, DragContext, DragCalculationResult } from './types';

/**
 * 후간접/순작업 종료 조정 전략
 *
 * 두 가지 케이스:
 * 1. 후간접이 있으면: 후간접 일수 조정, 종료일 변경
 * 2. 후간접이 없으면: 순작업일 조정, 종료일 변경 (휴일 건너뛰기)
 *
 * 시작일은 항상 고정
 */
export const resizePostStrategy: DragStrategy = {
    calculate(state: DragOriginalState, context: DragContext): DragCalculationResult {
        const { deltaDays, holidays, calendarSettings } = context;

        let newEndDate = state.originalEndDate;
        let newPostDays = state.originalIndirectWorkDaysPost;
        let newNetDays = state.originalNetWorkDays;

        if (state.originalIndirectWorkDaysPost > 0) {
            // 케이스 1: 후간접 조정 (달력일 기준)
            newPostDays = Math.max(0, state.originalIndirectWorkDaysPost + deltaDays);

            // 순작업 종료일 위치는 고정, 후간접만큼 뒤로 종료일 이동
            const netWorkEndDate = addDays(
                state.originalEndDate,
                -state.originalIndirectWorkDaysPost
            );
            newEndDate = addDays(netWorkEndDate, newPostDays);
        } else {
            // 케이스 2: 순작업일 조정 (작업일 기준, 휴일 건너뛰기)
            newNetDays = Math.max(1, state.originalNetWorkDays + deltaDays);

            // 순작업 시작일 계산
            const netStartDate = addDays(
                state.originalStartDate,
                state.originalIndirectWorkDaysPre
            );

            // addWorkingDays로 종료일 계산 (휴일 건너뛰기)
            newEndDate = addWorkingDays(netStartDate, newNetDays, holidays, calendarSettings);
        }

        return {
            currentStartDate: state.originalStartDate, // 시작일 고정
            currentEndDate: newEndDate,
            currentIndirectWorkDaysPre: state.originalIndirectWorkDaysPre,
            currentNetWorkDays: newNetDays,
            currentIndirectWorkDaysPost: newPostDays,
        };
    },
};
