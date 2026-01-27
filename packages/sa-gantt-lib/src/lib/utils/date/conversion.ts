// ============================================
// SA-Gantt-Lib: 픽셀/날짜 변환 유틸리티
// ============================================

import { addDays, differenceInDays } from 'date-fns';
import type { ZoomLevel, ConstructionTask } from '../../types';
import { ZOOM_CONFIG } from '../../types';

// ============================================
// 픽셀/날짜 변환
// ============================================

/**
 * 날짜를 X 좌표로 변환
 */
export const dateToX = (
    date: Date,
    baseDate: Date,
    pixelsPerDay: number
): number => {
    const diffDays = differenceInDays(date, baseDate);
    return diffDays * pixelsPerDay;
};

/**
 * X 좌표를 날짜로 변환
 */
export const xToDate = (
    x: number,
    baseDate: Date,
    pixelsPerDay: number
): Date => {
    const days = Math.round(x / pixelsPerDay);
    return addDays(baseDate, days);
};

/**
 * 날짜 범위의 픽셀 너비 계산
 */
export const getDateRangeWidth = (
    startDate: Date,
    endDate: Date,
    pixelsPerDay: number
): number => {
    const days = differenceInDays(endDate, startDate) + 1;
    return days * pixelsPerDay;
};

/**
 * 줌 레벨에 따른 픽셀/일 값 반환
 */
export const getPixelsPerDay = (zoomLevel: ZoomLevel): number => {
    return ZOOM_CONFIG[zoomLevel].pixelsPerDay;
};

// ============================================
// 날짜 범위 계산
// ============================================

/**
 * 태스크 배열에서 날짜 범위 계산 (여유 포함)
 */
export const calculateDateRange = (
    tasks: ConstructionTask[],
    milestones: { date: Date }[] = [],
    buffer: number = 5
): { minDate: Date; maxDate: Date; totalDays: number } => {
    const allDates = [
        ...tasks.flatMap((t) => [t.startDate, t.endDate].filter(Boolean)),
        ...milestones.map((m) => m.date),
    ];

    if (allDates.length === 0) {
        const today = new Date();
        return {
            minDate: today,
            maxDate: addDays(today, 30),
            totalDays: 30,
        };
    }

    const minDate = new Date(Math.min(...allDates.map((d) => d.getTime())));
    const maxDate = new Date(Math.max(...allDates.map((d) => d.getTime())));

    const effectiveMin = addDays(minDate, -buffer);
    const effectiveMax = addDays(maxDate, buffer);
    const totalDays = differenceInDays(effectiveMax, effectiveMin);

    return {
        minDate: effectiveMin,
        maxDate: effectiveMax,
        totalDays,
    };
};
