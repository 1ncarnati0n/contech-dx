// ============================================
// 휴일 스냅 유틸리티
// ============================================

import { addDays, differenceInDays } from 'date-fns';
import { isHoliday, snapToWorkingDay } from '../../../../../utils/dateUtils';
import type { CalendarSettings } from '../../../../../types';

/**
 * 휴일 스냅 계산
 * @returns adjustedDeltaDays: 휴일 회피 후 조정된 일수, skippedDays: 스킵된 휴일 수
 */
export const calculateHolidaySnap = (
    originalDate: Date,
    deltaDays: number,
    dragDirection: 'left' | 'right',
    holidays: Date[],
    calendarSettings: CalendarSettings
): { adjustedDeltaDays: number; skippedDays: number } => {
    const tentativeDate = addDays(originalDate, deltaDays);

    if (isHoliday(tentativeDate, holidays, calendarSettings)) {
        const snappedDate = snapToWorkingDay(tentativeDate, dragDirection, holidays, calendarSettings);
        const adjustedDeltaDays = differenceInDays(snappedDate, originalDate);
        const skippedDays = Math.abs(adjustedDeltaDays - deltaDays);
        return { adjustedDeltaDays, skippedDays };
    }

    return { adjustedDeltaDays: deltaDays, skippedDays: 0 };
};

/**
 * 드래그 완료 시 최종 휴일 스냅 적용
 * 현재 useGroupDrag, useDependencyDrag, useBarDrag에서 중복되던 로직을 통합
 *
 * @param date 검사할 날짜
 * @param direction 드래그 방향 ('left' | 'right')
 * @param holidays 휴일 목록
 * @param calendarSettings 캘린더 설정
 * @returns adjustedDate: 조정된 날짜, adjustment: 조정된 일수
 */
export const applyFinalHolidaySnap = (
    date: Date,
    direction: 'left' | 'right',
    holidays: Date[],
    calendarSettings: CalendarSettings
): { adjustedDate: Date; adjustment: number } => {
    if (!isHoliday(date, holidays, calendarSettings)) {
        return { adjustedDate: date, adjustment: 0 };
    }

    const snappedDate = snapToWorkingDay(date, direction, holidays, calendarSettings);
    const adjustment = differenceInDays(snappedDate, date);

    return { adjustedDate: snappedDate, adjustment };
};

/**
 * 그룹 드래그 중 미리보기용 스냅 deltaDays 계산
 *
 * @param referenceStartDate - 기준 Task의 원래 시작일
 * @param deltaDays - 원래 이동할 달력일 수
 * @param direction - 드래그 방향
 * @param holidays - 공휴일 목록
 * @param calendarSettings - 캘린더 설정
 * @returns 스냅 적용된 deltaDays
 */
export const calculateGroupSnapDeltaDays = (
    referenceStartDate: Date,
    deltaDays: number,
    direction: 'left' | 'right',
    holidays: Date[],
    calendarSettings: CalendarSettings
): number => {
    const tentativeDate = addDays(referenceStartDate, deltaDays);

    if (!isHoliday(tentativeDate, holidays, calendarSettings)) {
        return deltaDays;
    }

    const snappedDate = snapToWorkingDay(tentativeDate, direction, holidays, calendarSettings);
    return differenceInDays(snappedDate, referenceStartDate);
};
