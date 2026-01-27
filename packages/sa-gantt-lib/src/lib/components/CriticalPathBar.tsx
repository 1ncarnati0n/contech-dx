'use client';

import React, { useMemo, useState } from 'react';
import { format } from 'date-fns';
import {
    ConstructionTask,
    CalendarSettings,
    CriticalPathSummary,
    CriticalPathDay,
    GANTT_COLORS,
} from '../types';
import { calculateCriticalPath } from '../utils/criticalPathUtils';
import { dateToX } from '../utils/dateUtils';

// ============================================
// Constants
// ============================================

const BAR_HEIGHT = 9;  // Critical Path 바 높이
const CRITICAL_PATH_ROW_HEIGHT = 20;  // Critical Path 행 높이 (50% 축소)
const BAR_GAP = 1;                    // 바 사이 간격

// ============================================
// Sub Components
// ============================================

interface DayBlockProps {
    day: CriticalPathDay;
    x: number;
    width: number;
    barY: number;
    onHover: (day: CriticalPathDay | null, x: number) => void;
}

/**
 * 날짜별 블록 - 소수점 비율로 Vermilion(작업일)과 Teal(비작업일) 표시
 */
const DayBlock: React.FC<DayBlockProps> = ({ day, x, width, barY, onHover }) => {
    const effectiveWidth = Math.max(width - BAR_GAP, 1);
    const workWidth = effectiveWidth * day.workDayValue;
    const nonWorkWidth = effectiveWidth * day.nonWorkDayValue;

    return (
        <g
            className="cursor-pointer"
            onMouseEnter={() => onHover(day, x)}
            onMouseLeave={() => onHover(null, x)}
        >
            {/* 작업일 부분 (Vermilion) */}
            {workWidth > 0 && (
                <rect
                    x={x + BAR_GAP / 2}
                    y={barY}
                    width={workWidth}
                    height={BAR_HEIGHT}
                    fill={GANTT_COLORS.vermilion}
                    className="transition-opacity hover:opacity-80"
                />
            )}

            {/* 비작업일 부분 (Teal) */}
            {nonWorkWidth > 0 && (
                <rect
                    x={x + BAR_GAP / 2 + workWidth}
                    y={barY}
                    width={nonWorkWidth}
                    height={BAR_HEIGHT}
                    fill={GANTT_COLORS.teal}
                    className="transition-opacity hover:opacity-80"
                />
            )}
        </g>
    );
};

interface TooltipProps {
    day: CriticalPathDay;
    x: number;
    containerWidth: number;
}

const Tooltip: React.FC<TooltipProps> = ({ day, x, containerWidth }) => {
    const tooltipWidth = 200;
    const adjustedX = Math.min(Math.max(x, 10), containerWidth - tooltipWidth - 10);

    const formatValue = (v: number) => {
        if (v === 0) return '0';
        if (v === 1) return '1';
        return v.toFixed(1);
    };

    return (
        <div
            className="pointer-events-none absolute z-50 rounded px-3 py-2 text-xs shadow-lg"
            style={{
                left: adjustedX,
                top: CRITICAL_PATH_ROW_HEIGHT + 4,
                minWidth: tooltipWidth,
                backgroundColor: 'var(--gantt-tooltip-bg)',
                color: 'var(--gantt-tooltip-text)',
            }}
        >
            <div className="font-semibold">{format(day.date, 'yyyy-MM-dd (EEE)')}</div>
            <div className="mt-1 space-y-0.5">
                <div className="flex items-center gap-2">
                    <span
                        className="inline-block h-2 w-2 rounded-full"
                        style={{ backgroundColor: GANTT_COLORS.vermilion }}
                    />
                    <span>작업일: {formatValue(day.workDayValue)}일</span>
                </div>
                <div className="flex items-center gap-2">
                    <span
                        className="inline-block h-2 w-2 rounded-full"
                        style={{ backgroundColor: GANTT_COLORS.teal }}
                    />
                    <span>비작업일: {formatValue(day.nonWorkDayValue)}일</span>
                </div>
                {day.hasNetWork && (
                    <div className="text-green-300">순작업 진행</div>
                )}
                {day.hasIndirectWork && !day.hasNetWork && (
                    <div className="text-blue-300">간접작업 (비작업일)</div>
                )}
                {day.isHoliday && (
                    <div className="text-red-300">휴일</div>
                )}
            </div>
        </div>
    );
};

// ============================================
// Main Component
// ============================================

interface CriticalPathBarProps {
    tasks: ConstructionTask[];
    holidays: Date[];
    calendarSettings: CalendarSettings;
    minDate: Date;
    pixelsPerDay: number;
    totalWidth: number;
    activeCPId?: string | null;
}

export const CriticalPathBar: React.FC<CriticalPathBarProps> = ({
    tasks,
    holidays,
    calendarSettings,
    minDate,
    pixelsPerDay,
    totalWidth,
    activeCPId,
}) => {
    const [hoveredDay, setHoveredDay] = useState<CriticalPathDay | null>(null);
    const [tooltipX, setTooltipX] = useState(0);

    // activeCPId의 자손인지 확인하는 헬퍼 함수
    const isDescendantOf = (task: ConstructionTask, ancestorId: string): boolean => {
        let currentParentId = task.parentId;
        while (currentParentId) {
            if (currentParentId === ancestorId) return true;
            const parent = tasks.find(t => t.id === currentParentId);
            if (!parent) break;
            currentParentId = parent.parentId;
        }
        return false;
    };

    // Critical Path 계산 (activeCPId가 있으면 해당 CP의 하위 Task만 필터링)
    const summary: CriticalPathSummary = useMemo(() => {
        const targetTasks = activeCPId
            ? tasks.filter(t => isDescendantOf(t, activeCPId))
            : tasks;
        return calculateCriticalPath(targetTasks, holidays, calendarSettings);
    }, [tasks, activeCPId, holidays, calendarSettings]);

    // 호버 핸들러
    const handleDayHover = (day: CriticalPathDay | null, x: number) => {
        setHoveredDay(day);
        setTooltipX(x);
    };

    if (summary.totalDays === 0) {
        return null;
    }

    const barY = (CRITICAL_PATH_ROW_HEIGHT - BAR_HEIGHT) / 2;

    // 바 시작 위치
    const barStartX = dateToX(summary.startDate, minDate, pixelsPerDay);

    return (
        <div
            style={{
                minWidth: totalWidth,
                height: CRITICAL_PATH_ROW_HEIGHT,
                backgroundColor: 'var(--gantt-bg-secondary)',
                borderTop: '2px solid var(--gantt-border)',
            }}
        >
            <svg
                width={totalWidth}
                height={CRITICAL_PATH_ROW_HEIGHT}
                className="block"
            >
                {/* 날짜별 블록 렌더링 */}
                {summary.dailyBreakdown.map((day, index) => {
                    const x = dateToX(day.date, minDate, pixelsPerDay);
                    return (
                        <DayBlock
                            key={index}
                            day={day}
                            x={x}
                            width={pixelsPerDay}
                            barY={barY}
                            onHover={handleDayHover}
                        />
                    );
                })}

                {/* 라벨 - 바 왼쪽에 표시 */}
                <text
                    x={barStartX - 8}
                    y={CRITICAL_PATH_ROW_HEIGHT / 2 + 3}
                    textAnchor="end"
                    className="pointer-events-none select-none text-[9px] font-bold"
                    style={{ fill: 'var(--gantt-text-secondary)' }}
                >
                    Critical Path
                </text>

                {/* 요약 정보 (색상 범례 통합) - 바 오른쪽에 표시 */}
                {(() => {
                    const formatNum = (n: number) => Number.isInteger(n) ? n.toString() : n.toFixed(1);
                    const baseX = barStartX + summary.totalDays * pixelsPerDay + 8;
                    const y = CRITICAL_PATH_ROW_HEIGHT / 2;
                    return (
                        <g
                            className="pointer-events-none select-none text-[9px]"
                            style={{ fill: 'var(--gantt-text-muted)' }}
                        >
                            <text x={baseX} y={y + 3}>총일: {summary.totalDays}일 |</text>
                            <rect x={baseX + 72} y={y - 3} width={6} height={6} fill={GANTT_COLORS.vermilion} rx={1} />
                            <text x={baseX + 82} y={y + 3}>작업일: {formatNum(summary.workDays)}일 |</text>
                            <rect x={baseX + 152} y={y - 3} width={6} height={6} fill={GANTT_COLORS.teal} rx={1} />
                            <text x={baseX + 162} y={y + 3}>비작업일: {formatNum(summary.nonWorkDays)}일</text>
                        </g>
                    );
                })()}
            </svg>

            {/* Tooltip */}
            {hoveredDay && (
                <Tooltip day={hoveredDay} x={tooltipX} containerWidth={totalWidth} />
            )}
        </div>
    );
};

export default CriticalPathBar;
