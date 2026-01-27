'use client';

import React, { useMemo } from 'react';
import { addDays, getDay, isSameDay } from 'date-fns';
import { isHoliday } from '../../utils/dateUtils';
import { GANTT_COLORS } from '../../types';
import type { TimelineGridProps } from './types';

/**
 * 주말/휴일 배경 그리드 컴포넌트
 */
export const TimelineGrid: React.FC<TimelineGridProps> = ({
    minDate,
    totalDays,
    chartHeight,
    pixelsPerDay,
    holidays,
    calendarSettings,
    zoomLevel,
}) => {
    const holidayRects = useMemo(() => {
        if (zoomLevel === 'MONTH') return []; // Too dense

        const rects: React.ReactNode[] = [];
        for (let i = 0; i < totalDays; i++) {
            const date = addDays(minDate, i);
            const dayOfWeek = getDay(date);
            const isSunday = dayOfWeek === 0;
            const isSaturday = dayOfWeek === 6;
            const isHol = isHoliday(date, holidays, calendarSettings);

            // 공휴일 리스트에 있는지 체크 (토요일+공휴일인 경우 공휴일 스타일 우선)
            const isInHolidayList = holidays.some((h) => isSameDay(h, date));

            if (isHol || isSaturday || isInHolidayList) {
                const x = i * pixelsPerDay;
                // CSS 변수 사용하여 테마에 따라 자동 전환
                let fillColor: string = GANTT_COLORS.holiday; // 기본 휴일
                if (isSunday) {
                    fillColor = GANTT_COLORS.sunday; // 일요일
                } else if (isInHolidayList) {
                    // 공휴일 리스트에 있으면 (토요일이어도) 공휴일 스타일 적용
                    fillColor = GANTT_COLORS.holiday;
                } else if (isSaturday) {
                    fillColor = GANTT_COLORS.weekend; // 토요일
                }

                rects.push(
                    <rect
                        key={`weekend-${i}`}
                        x={x}
                        y={0}
                        width={pixelsPerDay}
                        height={chartHeight}
                        fill={fillColor}
                        className="pointer-events-none"
                    />
                );
            }
        }
        return rects;
    }, [minDate, totalDays, chartHeight, pixelsPerDay, holidays, calendarSettings, zoomLevel]);

    return <g>{holidayRects}</g>;
};
