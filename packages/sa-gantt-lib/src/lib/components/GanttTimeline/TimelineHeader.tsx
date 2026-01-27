'use client';

import React, { useMemo } from 'react';
import { format, addDays, getDay, getYear, isSameMonth, isSameWeek, getWeekOfMonth, isSameDay } from 'date-fns';
import { GANTT_LAYOUT } from '../../types';
import { isHoliday } from '../../utils/dateUtils';
import type { TimelineHeaderProps } from './types';

const { HEADER_HEIGHT } = GANTT_LAYOUT;

export const TimelineHeader: React.FC<TimelineHeaderProps> = ({
    minDate,
    totalDays,
    pixelsPerDay,
    zoomLevel,
    holidays,
    calendarSettings,
}) => {
    const headerDays = Array.from({ length: totalDays }, (_, i) => addDays(minDate, i));
    const totalWidth = totalDays * pixelsPerDay;

    // Top Row: Year
    const yearGroups = useMemo(() => {
        const groups: { label: string; days: number }[] = [];
        let currentYear = getYear(headerDays[0]);
        let count = 0;

        headerDays.forEach(date => {
            if (getYear(date) !== currentYear) {
                groups.push({ label: `${currentYear}년`, days: count });
                currentYear = getYear(date);
                count = 1;
            } else {
                count++;
            }
        });
        groups.push({ label: `${currentYear}년`, days: count });

        return groups;
    }, [headerDays]);

    // Middle Row: Month
    const monthGroups = useMemo(() => {
        const groups: { label: string; days: number }[] = [];
        let currentMonth = headerDays[0];
        let count = 0;

        headerDays.forEach(date => {
            if (!isSameMonth(date, currentMonth)) {
                groups.push({ label: format(currentMonth, 'M월'), days: count });
                currentMonth = date;
                count = 1;
            } else {
                count++;
            }
        });
        groups.push({ label: format(currentMonth, 'M월'), days: count });

        return groups;
    }, [headerDays]);

    // Bottom Row: Week or Day (MONTH 줌 레벨에서는 주 표기 없음)
    const bottomRow = useMemo(() => {
        if (zoomLevel === 'MONTH') {
            return null;
        } else if (zoomLevel === 'DAY') {
            return (
                <div
                    className="flex h-[32px] items-center"
                    style={{ minWidth: totalWidth, backgroundColor: 'var(--gantt-bg-primary)' }}
                >
                    {headerDays.map((date, index) => {
                        const day = getDay(date);
                        const isHol = isHoliday(date, holidays, calendarSettings);
                        const isSunday = day === 0;
                        const isSaturday = day === 6;

                        let textColor = 'var(--gantt-text-secondary)';
                        let bgColor = 'transparent';

                        // 공휴일 리스트에 있는지 체크 (토요일+공휴일인 경우 공휴일 스타일 우선)
                        const isInHolidayList = holidays.some((h) => isSameDay(h, date));

                        if (isSunday) {
                            textColor = 'var(--gantt-sunday-text)';
                            bgColor = 'var(--gantt-sunday-bg)';
                        } else if (isInHolidayList) {
                            // 공휴일 리스트에 있으면 (토요일이어도) 공휴일 스타일 적용
                            textColor = 'var(--gantt-holiday-text)';
                            bgColor = 'var(--gantt-holiday-bg)';
                        } else if (isSaturday) {
                            textColor = 'var(--gantt-weekend-text)';
                            bgColor = 'var(--gantt-weekend-bg)';
                        } else if (isHol) {
                            textColor = 'var(--gantt-holiday-text)';
                            bgColor = 'var(--gantt-holiday-bg)';
                        }

                        return (
                            <div
                                key={index}
                                className="flex h-full shrink-0 flex-col items-center justify-center font-medium"
                                style={{
                                    width: pixelsPerDay,
                                    minWidth: pixelsPerDay,
                                    backgroundColor: bgColor,
                                    borderRight: '1px solid var(--gantt-border)',
                                }}
                            >
                                <span className="text-[10px] leading-none" style={{ color: textColor }}>
                                    {format(date, 'd')}
                                </span>
                                <span className="mt-0.5 text-[9px] font-bold leading-none" style={{ color: textColor }}>
                                    {['일', '월', '화', '수', '목', '금', '토'][day]}
                                </span>
                            </div>
                        );
                    })}
                </div>
            );
        } else {
            // WEEK View
            const groups: { label: string; days: number }[] = [];
            let currentWeek = headerDays[0];
            let count = 0;

            headerDays.forEach(date => {
                if (!isSameWeek(date, currentWeek, { weekStartsOn: 0 })) {
                    groups.push({ label: `${getWeekOfMonth(currentWeek, { weekStartsOn: 0 })}주`, days: count });
                    currentWeek = date;
                    count = 1;
                } else {
                    count++;
                }
            });
            groups.push({ label: `${getWeekOfMonth(currentWeek, { weekStartsOn: 0 })}주`, days: count });

            return (
                <div
                    className="flex h-[32px] items-center"
                    style={{ minWidth: totalWidth, backgroundColor: 'var(--gantt-bg-primary)' }}
                >
                    {groups.map((g, i) => (
                        <div
                            key={i}
                            className="flex h-full shrink-0 items-center justify-center text-xs font-medium"
                            style={{
                                width: g.days * pixelsPerDay,
                                color: 'var(--gantt-text-secondary)',
                                borderRight: '1px solid var(--gantt-border)',
                            }}
                        >
                            {g.label}
                        </div>
                    ))}
                </div>
            );
        }
    }, [headerDays, zoomLevel, pixelsPerDay, holidays, calendarSettings, totalWidth]);

    const isMonthView = zoomLevel === 'MONTH';

    return (
        <div
            className="sticky top-0 z-5 flex shrink-0 flex-col"
            style={{
                height: HEADER_HEIGHT,
                minWidth: totalWidth,
                backgroundColor: 'var(--gantt-bg-primary)',
                borderBottom: '1px solid var(--gantt-border)',
            }}
        >
            {isMonthView ? (
                <>
                    {/* MONTH View: Year Row (2줄 높이 = 48px) */}
                    <div
                        className="flex h-[48px] items-center text-sm font-bold"
                        style={{
                            minWidth: totalWidth,
                            backgroundColor: 'var(--gantt-bg-tertiary)',
                            borderBottom: '1px solid var(--gantt-border)',
                            color: 'var(--gantt-text-primary)',
                        }}
                    >
                        {yearGroups.map((g, i) => (
                            <div
                                key={i}
                                className="flex h-full shrink-0 items-center justify-center"
                                style={{
                                    width: g.days * pixelsPerDay,
                                    borderRight: i < yearGroups.length - 1 ? '2px solid var(--gantt-grid-dark)' : 'none',
                                }}
                            >
                                {g.label}
                            </div>
                        ))}
                    </div>

                    {/* MONTH View: Month Row (1줄 높이 = 32px) */}
                    <div
                        className="flex h-[32px] items-center text-xs font-medium"
                        style={{
                            minWidth: totalWidth,
                            backgroundColor: 'var(--gantt-bg-secondary)',
                            color: 'var(--gantt-text-secondary)',
                        }}
                    >
                        {monthGroups.map((g, i) => (
                            <div
                                key={i}
                                className="flex h-full shrink-0 items-center justify-center"
                                style={{
                                    width: g.days * pixelsPerDay,
                                    borderRight: '1px solid var(--gantt-border-light)',
                                }}
                            >
                                {g.label}
                            </div>
                        ))}
                    </div>
                </>
            ) : (
                <>
                    {/* WEEK/DAY View: Year Row */}
                    <div
                        className="flex h-[24px] items-center text-xs font-bold"
                        style={{
                            minWidth: totalWidth,
                            backgroundColor: 'var(--gantt-bg-tertiary)',
                            borderBottom: '1px solid var(--gantt-border)',
                            color: 'var(--gantt-text-primary)',
                        }}
                    >
                        {yearGroups.map((g, i) => (
                            <div
                                key={i}
                                className="flex shrink-0 items-center pl-2"
                                style={{
                                    width: g.days * pixelsPerDay,
                                    borderRight: i < yearGroups.length - 1 ? '2px solid var(--gantt-grid-dark)' : 'none',
                                }}
                            >
                                {g.label}
                            </div>
                        ))}
                    </div>

                    {/* WEEK/DAY View: Month Row */}
                    <div
                        className="flex h-[24px] items-center text-xs font-medium"
                        style={{
                            minWidth: totalWidth,
                            backgroundColor: 'var(--gantt-bg-secondary)',
                            borderBottom: '1px solid var(--gantt-border-light)',
                            color: 'var(--gantt-text-secondary)',
                        }}
                    >
                        {monthGroups.map((g, i) => (
                            <div
                                key={i}
                                className="flex shrink-0 items-center justify-center"
                                style={{
                                    width: g.days * pixelsPerDay,
                                    borderRight: '1px solid var(--gantt-border)',
                                }}
                            >
                                {g.label}
                            </div>
                        ))}
                    </div>

                    {/* WEEK/DAY View: Day/Week Row */}
                    {bottomRow}
                </>
            )}
        </div>
    );
};
