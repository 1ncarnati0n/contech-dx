'use client';

import React, { useMemo } from 'react';
import {
    ConstructionTask,
    CalendarSettings,
    GANTT_COLORS,
} from '../types';
import { calculateCriticalPath } from '../utils/criticalPathUtils';
import { dateToX } from '../utils/dateUtils';

// ============================================
// Constants
// ============================================

const BAR_HEIGHT = 9;         // Critical Path 바와 동일한 높이
const RATIO_ROW_HEIGHT = 20;  // Critical Path 행과 동일한 높이

// ============================================
// Main Component
// ============================================

interface WorkDaysRatioBarProps {
    tasks: ConstructionTask[];
    holidays: Date[];
    calendarSettings: CalendarSettings;
    minDate: Date;
    pixelsPerDay: number;
    totalWidth: number;
}

/**
 * 작업일/비작업일 비율 바 컴포넌트 (Master View 전용)
 *
 * 전체 프로젝트 기간 동안 작업일과 비작업일의 비율을 시각적으로 표시합니다.
 * CriticalPathBar와 동일한 길이/스타일로 표시됩니다.
 */
export const WorkDaysRatioBar: React.FC<WorkDaysRatioBarProps> = ({
    tasks,
    holidays,
    calendarSettings,
    minDate,
    pixelsPerDay,
    totalWidth,
}) => {
    // Critical Path 계산 (전체 태스크 대상)
    const summary = useMemo(() => {
        return calculateCriticalPath(tasks, holidays, calendarSettings);
    }, [tasks, holidays, calendarSettings]);

    // 비율 계산
    const ratios = useMemo(() => {
        if (summary.totalDays === 0) {
            return { workRatio: 0, nonWorkRatio: 0 };
        }
        const workRatio = (summary.workDays / summary.totalDays) * 100;
        const nonWorkRatio = (summary.nonWorkDays / summary.totalDays) * 100;
        return { workRatio, nonWorkRatio };
    }, [summary]);

    // 숫자 포맷팅 (정수면 그대로, 소수면 1자리까지)
    const formatNum = (n: number) => Number.isInteger(n) ? n.toString() : n.toFixed(1);

    if (summary.totalDays === 0) {
        return null;
    }

    const barY = (RATIO_ROW_HEIGHT - BAR_HEIGHT) / 2;

    // CriticalPathBar와 동일한 위치/길이 계산
    const barStartX = dateToX(summary.startDate, minDate, pixelsPerDay);
    const barWidth = summary.totalDays * pixelsPerDay;
    const workWidth = barWidth * (ratios.workRatio / 100);
    const nonWorkWidth = barWidth * (ratios.nonWorkRatio / 100);

    return (
        <div
            style={{
                minWidth: totalWidth,
                height: RATIO_ROW_HEIGHT,
                backgroundColor: 'var(--gantt-bg-tertiary)',
                borderTop: '1px solid var(--gantt-border-light)',
            }}
        >
            <svg
                width={totalWidth}
                height={RATIO_ROW_HEIGHT}
                className="block"
            >
                {/* 작업일 비율 바 (Vermilion) */}
                <rect
                    x={barStartX}
                    y={barY}
                    width={workWidth}
                    height={BAR_HEIGHT}
                    fill={GANTT_COLORS.vermilion}
                    rx={1}
                />

                {/* 비작업일 비율 바 (Teal) */}
                <rect
                    x={barStartX + workWidth}
                    y={barY}
                    width={nonWorkWidth}
                    height={BAR_HEIGHT}
                    fill={GANTT_COLORS.teal}
                    rx={1}
                />

                {/* 왼쪽 라벨 - CriticalPathBar와 동일한 위치 */}
                <text
                    x={barStartX - 8}
                    y={RATIO_ROW_HEIGHT / 2 + 3}
                    textAnchor="end"
                    className="pointer-events-none select-none text-[9px] font-bold"
                    style={{ fill: 'var(--gantt-text-secondary)' }}
                >
                    Work Ratio
                </text>

                {/* 바 위 퍼센트 표시 (작업일) - 충분한 공간이 있을 때만 */}
                {workWidth >= 40 && (
                    <text
                        x={barStartX + workWidth / 2}
                        y={RATIO_ROW_HEIGHT / 2 + 3}
                        textAnchor="middle"
                        className="pointer-events-none select-none text-[8px] font-semibold"
                        style={{ fill: 'white' }}
                    >
                        {ratios.workRatio.toFixed(1)}%
                    </text>
                )}

                {/* 바 위 퍼센트 표시 (비작업일) - 충분한 공간이 있을 때만 */}
                {nonWorkWidth >= 40 && (
                    <text
                        x={barStartX + workWidth + nonWorkWidth / 2}
                        y={RATIO_ROW_HEIGHT / 2 + 3}
                        textAnchor="middle"
                        className="pointer-events-none select-none text-[8px] font-semibold"
                        style={{ fill: 'white' }}
                    >
                        {ratios.nonWorkRatio.toFixed(1)}%
                    </text>
                )}

                {/* 오른쪽 요약 정보 - CriticalPathBar와 동일한 스타일 */}
                <g
                    className="pointer-events-none select-none text-[9px]"
                    style={{ fill: 'var(--gantt-text-muted)' }}
                >
                    <rect
                        x={barStartX + barWidth + 8}
                        y={RATIO_ROW_HEIGHT / 2 - 3}
                        width={6}
                        height={6}
                        fill={GANTT_COLORS.vermilion}
                        rx={1}
                    />
                    <text x={barStartX + barWidth + 18} y={RATIO_ROW_HEIGHT / 2 + 3}>
                        작업일: {formatNum(summary.workDays)}일 ({ratios.workRatio.toFixed(1)}%) |
                    </text>
                    <rect
                        x={barStartX + barWidth + 138}
                        y={RATIO_ROW_HEIGHT / 2 - 3}
                        width={6}
                        height={6}
                        fill={GANTT_COLORS.teal}
                        rx={1}
                    />
                    <text x={barStartX + barWidth + 148} y={RATIO_ROW_HEIGHT / 2 + 3}>
                        비작업일: {formatNum(summary.nonWorkDays)}일 ({ratios.nonWorkRatio.toFixed(1)}%)
                    </text>
                </g>
            </svg>
        </div>
    );
};

export default WorkDaysRatioBar;
