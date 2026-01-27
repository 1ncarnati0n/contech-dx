// ============================================
// Move 전략: 전체 바 이동
// ============================================

import { addDays } from 'date-fns';
import { isHoliday, snapToWorkingDay, addWorkingDays } from '../../../../utils/dateUtils';
import type { DragStrategy, DragOriginalState, DragContext, DragCalculationResult } from './types';

/**
 * 전체 바 이동 전략
 *
 * 핵심 원리:
 * 1. 새 시작일 계산 (델타만큼 이동)
 * 2. 시작일이 휴일이면 드래그 방향으로 스냅
 * 3. 종료일 재계산: 선간접(달력일) + 순작업(작업일, 휴일건너뛰기) + 후간접(달력일)
 */
export const moveStrategy: DragStrategy = {
    calculate(state: DragOriginalState, context: DragContext): DragCalculationResult {
        const { deltaDays, direction, holidays, calendarSettings } = context;

        // 1. 새 시작일 계산 (델타만큼 이동)
        const tentativeStart = addDays(state.originalStartDate, deltaDays);

        // 2. 시작일이 휴일이면 드래그 방향으로 스냅
        const snappedStart = isHoliday(tentativeStart, holidays, calendarSettings)
            ? snapToWorkingDay(tentativeStart, direction, holidays, calendarSettings)
            : tentativeStart;

        // 3. 종료일 재계산
        let currentDate = snappedStart;

        // 3-1. 선간접 (달력일 기준)
        if (state.originalIndirectWorkDaysPre > 0) {
            currentDate = addDays(currentDate, state.originalIndirectWorkDaysPre);
        }

        // 3-2. 순작업 (작업일 기준, 휴일 건너뛰기)
        const netEndDate = addWorkingDays(
            currentDate,
            state.originalNetWorkDays,
            holidays,
            calendarSettings
        );
        currentDate = addDays(netEndDate, 1); // 순작업 종료일 다음날

        // 3-3. 후간접 (달력일 기준)
        let finalEndDate: Date;
        if (state.originalIndirectWorkDaysPost > 0) {
            finalEndDate = addDays(currentDate, state.originalIndirectWorkDaysPost - 1);
        } else {
            finalEndDate = netEndDate; // 후간접 없으면 순작업 종료일이 전체 종료일
        }

        return {
            currentStartDate: snappedStart,
            currentEndDate: finalEndDate,
            currentIndirectWorkDaysPre: state.originalIndirectWorkDaysPre,
            currentNetWorkDays: state.originalNetWorkDays,
            currentIndirectWorkDaysPost: state.originalIndirectWorkDaysPost,
        };
    },
};
