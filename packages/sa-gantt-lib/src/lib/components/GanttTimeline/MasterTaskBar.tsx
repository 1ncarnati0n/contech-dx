'use client';

import React, { useMemo } from 'react';
import { addDays } from 'date-fns';
import { GANTT_COLORS } from '../../types';
import { dateToX } from '../../utils/dateUtils';
import { calculateCriticalPath } from '../../utils/criticalPathUtils';
import { collectDescendantTasks } from '../../utils/groupUtils';
import type { ConstructionTask, CalendarSettings, CriticalPathDay } from '../../types';

const CP_BAR_HEIGHT = 6; // CP 바 높이
const BAR_GAP = 0.3;

/**
 * 날짜별 블록 - 소수점 비율로 Vermilion(작업일)과 Teal(비작업일) 표시
 */
interface DayBlockProps {
    day: CriticalPathDay;
    x: number;
    width: number;
    barHeight: number;
    barY: number;
}

const DayBlock: React.FC<DayBlockProps> = ({ day, x, width, barHeight, barY }) => {
    const effectiveWidth = Math.max(width - BAR_GAP, 1);
    const workWidth = effectiveWidth * day.workDayValue;
    const nonWorkWidth = effectiveWidth * day.nonWorkDayValue;

    return (
        <g>
            {/* 작업일 부분 (Vermilion) */}
            {workWidth > 0 && (
                <rect
                    x={x + BAR_GAP / 2}
                    y={barY}
                    width={workWidth}
                    height={barHeight}
                    fill={GANTT_COLORS.vermilion}
                    className="drop-shadow-sm opacity-90 transition-opacity hover:opacity-100"
                />
            )}
            {/* 비작업일 부분 (Teal) */}
            {nonWorkWidth > 0 && (
                <rect
                    x={x + BAR_GAP / 2 + workWidth}
                    y={barY}
                    width={nonWorkWidth}
                    height={barHeight}
                    fill={GANTT_COLORS.teal}
                    className="drop-shadow-sm opacity-90 transition-opacity hover:opacity-100"
                />
            )}
        </g>
    );
};

/**
 * MasterTaskBar Props (Level 1 전용)
 */
export interface MasterTaskBarProps {
    task: ConstructionTask;
    y: number;
    minDate: Date;
    pixelsPerDay: number;
    renderMode?: 'full' | 'bar' | 'label';
    allTasks?: ConstructionTask[];
    holidays?: Date[];
    calendarSettings?: CalendarSettings;
    /** 드래그 상태 (날짜 변경 시) */
    dragInfo?: { startDate: Date; endDate: Date } | null;
    /** 그룹 드래그 델타 (일수) */
    groupDragDeltaDays?: number;
    /** 그룹 드래그 스냅 날짜 */
    groupDragInfo?: { startDate: Date; endDate: Date } | null;
    /** 키보드 포커스 상태 */
    isFocused?: boolean;
}

/**
 * Master View 전용 태스크 바 컴포넌트 (Level 1: CP 바)
 * 
 * 공구 공정표에서 CP(Critical Path) 바를 렌더링합니다.
 * 작업일(주황)과 비작업일(청록)을 시각적으로 구분하여 표시합니다.
 */
export const MasterTaskBar: React.FC<MasterTaskBarProps> = React.memo(({
    task,
    y,
    minDate,
    pixelsPerDay,
    renderMode = 'full',
    allTasks = [],
    holidays = [],
    calendarSettings,
    dragInfo,
    groupDragDeltaDays = 0,
    groupDragInfo,
    isFocused = false,
}) => {
    const showBar = renderMode === 'full' || renderMode === 'bar';
    const showLabel = renderMode === 'full' || renderMode === 'label';

    // GROUP 타입은 렌더링하지 않음
    if (task.type === 'GROUP') return null;

    // effectiveDates 계산 (드래그 우선순위 적용)
    const { effectiveStartDate } = useMemo(() => {
        if (dragInfo) {
            return { effectiveStartDate: dragInfo.startDate };
        }
        if (groupDragInfo) {
            return { effectiveStartDate: groupDragInfo.startDate };
        }
        if (groupDragDeltaDays !== 0) {
            return { effectiveStartDate: addDays(task.startDate, groupDragDeltaDays) };
        }
        return { effectiveStartDate: task.startDate };
    }, [task.startDate, dragInfo, groupDragInfo, groupDragDeltaDays]);

    const startX = dateToX(effectiveStartDate, minDate, pixelsPerDay);

    // CP Summary 계산
    const childTasks = collectDescendantTasks(task.id, allTasks, { wbsLevel: 2 });
    const cpSummary = calculateCriticalPath(
        childTasks,
        holidays,
        calendarSettings || { workOnSaturdays: true, workOnSundays: false, workOnHolidays: false }
    );

    const workDays = cpSummary.workDays;
    const nonWorkDays = cpSummary.nonWorkDays;
    const totalDays = cpSummary.totalDays;

    if (totalDays === 0) return null;

    const workWidth = workDays * pixelsPerDay;
    const nonWorkWidth = nonWorkDays * pixelsPerDay;
    const totalWidth = workWidth + nonWorkWidth;

    // 바 Y 위치 (GanttTimeline에서 이미 중앙 정렬된 y 전달받음)
    const barY = 0;

    return (
        <g transform={`translate(${startX}, ${y})`} className="group cursor-pointer">
            {/* Focus Highlight Effect */}
            {isFocused && showBar && (
                <rect
                    x={-3}
                    y={barY - 3}
                    width={totalWidth + 6}
                    height={CP_BAR_HEIGHT + 6}
                    fill="none"
                    stroke={GANTT_COLORS.focus}
                    strokeWidth={2}
                    rx={4}
                    ry={4}
                    className="animate-pulse"
                    style={{ filter: `drop-shadow(0 0 6px ${GANTT_COLORS.focus})` }}
                />
            )}

            {/* Label (바 위에 중앙 정렬) */}
            {showLabel && (
                <text
                    x={totalWidth / 2}
                    y={barY - 3}
                    textAnchor="middle"
                    className="pointer-events-none select-none font-normal"
                    fill={GANTT_COLORS.textSecondary}
                    style={{ fontSize: '11px' }}
                >
                    {task.name}
                </text>
            )}

            {/* 날짜별 블록 렌더링 (CriticalPath 방식) */}
            {showBar && cpSummary.dailyBreakdown.map((day, index) => {
                const x = dateToX(day.date, minDate, pixelsPerDay) - startX;
                return (
                    <DayBlock
                        key={index}
                        day={day}
                        x={x}
                        width={pixelsPerDay}
                        barHeight={CP_BAR_HEIGHT}
                        barY={barY}
                    />
                );
            })}
        </g>
    );
});

MasterTaskBar.displayName = 'MasterTaskBar';
