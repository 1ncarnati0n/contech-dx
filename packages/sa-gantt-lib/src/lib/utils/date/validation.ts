// ============================================
// SA-Gantt-Lib: 날짜 검증 유틸리티
// ============================================

import type { ConstructionTask } from '../../types';

/**
 * 유효한 Date 객체인지 확인
 *
 * @param date - 검사할 값
 * @returns Date 객체이고 유효한 날짜인 경우 true
 *
 * @example
 * isValidDate(new Date())         // true
 * isValidDate(new Date('invalid')) // false (Invalid Date)
 * isValidDate('2025-01-01')       // false (문자열)
 * isValidDate(null)               // false
 */
export const isValidDate = (date: unknown): date is Date => {
    return date instanceof Date && !isNaN(date.getTime());
};

/**
 * 날짜 범위의 유효성 검증
 * 시작일이 종료일보다 이전이거나 같아야 함
 *
 * @param startDate - 시작일
 * @param endDate - 종료일
 * @returns 유효한 범위인 경우 true
 *
 * @example
 * isValidDateRange(new Date('2025-01-01'), new Date('2025-01-31')) // true
 * isValidDateRange(new Date('2025-01-31'), new Date('2025-01-01')) // false
 */
export const isValidDateRange = (startDate: Date, endDate: Date): boolean => {
    return isValidDate(startDate) && isValidDate(endDate) && startDate <= endDate;
};

/**
 * Task의 날짜 유효성 검증
 *
 * @param task - 검사할 ConstructionTask
 * @returns Task의 시작일/종료일이 유효한 경우 true
 *
 * @example
 * const task = { startDate: new Date('2025-01-01'), endDate: new Date('2025-01-10'), ... };
 * validateTaskDates(task) // true
 */
export const validateTaskDates = (task: ConstructionTask): boolean => {
    return isValidDateRange(task.startDate, task.endDate);
};

/**
 * 날짜 문자열을 Date 객체로 안전하게 변환
 * 변환 실패 시 null 반환
 *
 * @param dateString - ISO 형식 날짜 문자열 (e.g., '2025-01-15')
 * @returns 유효한 Date 객체 또는 null
 *
 * @example
 * parseDateSafe('2025-01-15')   // Date object
 * parseDateSafe('invalid')      // null
 * parseDateSafe('')             // null
 */
export const parseDateSafe = (dateString: string): Date | null => {
    if (!dateString || typeof dateString !== 'string') {
        return null;
    }

    // ISO 형식으로 파싱 (시간대 문제 방지를 위해 T00:00:00 추가)
    const date = new Date(dateString.includes('T') ? dateString : `${dateString}T00:00:00`);

    return isValidDate(date) ? date : null;
};

/**
 * 두 날짜가 같은 날인지 확인 (시간 무시)
 *
 * @param date1 - 첫 번째 날짜
 * @param date2 - 두 번째 날짜
 * @returns 같은 날이면 true
 *
 * @example
 * isSameDay(new Date('2025-01-15T10:00:00'), new Date('2025-01-15T23:59:59')) // true
 */
export const isSameDay = (date1: Date, date2: Date): boolean => {
    if (!isValidDate(date1) || !isValidDate(date2)) {
        return false;
    }

    return (
        date1.getFullYear() === date2.getFullYear() &&
        date1.getMonth() === date2.getMonth() &&
        date1.getDate() === date2.getDate()
    );
};
