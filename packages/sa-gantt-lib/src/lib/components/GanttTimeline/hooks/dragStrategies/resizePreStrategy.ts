// ============================================
// Resize-Pre 전략: 선간접/순작업 시작 조정
// ============================================

import { addDays } from 'date-fns';
import { isHoliday } from '../../../../utils/dateUtils';
import type { DragStrategy, DragOriginalState, DragContext, DragCalculationResult } from './types';

/**
 * 선간접/순작업 시작 조정 전략
 *
 * 두 가지 케이스:
 * 1. 선간접이 있으면: 선간접 일수 조정, 시작일 변경
 * 2. 선간접이 없으면: 순작업일 조정, 시작일 변경 (휴일 건너뛰기)
 *
 * 종료일은 항상 고정
 */
export const resizePreStrategy: DragStrategy = {
    calculate(state: DragOriginalState, context: DragContext): DragCalculationResult {
        const { deltaDays, holidays, calendarSettings } = context;

        let newStartDate = state.originalStartDate;
        let newPreDays = state.originalIndirectWorkDaysPre;
        let newNetDays = state.originalNetWorkDays;

        if (state.originalIndirectWorkDaysPre > 0) {
            // 케이스 1: 선간접 조정 (달력일 기준)
            newPreDays = Math.max(0, state.originalIndirectWorkDaysPre - deltaDays);

            // 순작업 시작일 위치는 고정, 선간접만큼 앞으로 시작일 이동
            const netWorkStartDate = addDays(
                state.originalStartDate,
                state.originalIndirectWorkDaysPre
            );
            newStartDate = addDays(netWorkStartDate, -newPreDays);
        } else {
            // 케이스 2: 순작업일 조정 (작업일 기준)
            // 왼쪽 드래그: deltaDays < 0 → 순작업일 증가
            // 오른쪽 드래그: deltaDays > 0 → 순작업일 감소
            newNetDays = Math.max(1, state.originalNetWorkDays - deltaDays);

            // 종료일로부터 역산하여 새 시작일 계산
            const postDays = state.originalIndirectWorkDaysPost;
            const netEndDate = postDays > 0
                ? addDays(state.originalEndDate, -postDays)
                : state.originalEndDate;

            // 순작업 종료일에서 newNetDays만큼 역산 (휴일 건너뛰기)
            let current = netEndDate;
            let workDaysCount = 1; // 종료일은 이미 1일

            while (workDaysCount < newNetDays) {
                current = addDays(current, -1);
                if (!isHoliday(current, holidays, calendarSettings)) {
                    workDaysCount++;
                }
            }

            // 시작일이 휴일이면 더 앞으로 이동
            while (isHoliday(current, holidays, calendarSettings)) {
                current = addDays(current, -1);
            }

            newStartDate = current;
        }

        return {
            currentStartDate: newStartDate,
            currentEndDate: state.originalEndDate, // 종료일 고정
            currentIndirectWorkDaysPre: newPreDays,
            currentNetWorkDays: newNetDays,
            currentIndirectWorkDaysPost: state.originalIndirectWorkDaysPost,
        };
    },
};
