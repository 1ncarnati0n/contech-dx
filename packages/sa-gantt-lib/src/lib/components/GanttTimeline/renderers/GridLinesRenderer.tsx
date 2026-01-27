'use client';

import { memo } from 'react';
import { addDays, getDay } from 'date-fns';
import { GANTT_COLORS } from '../../../types';
import type { ZoomLevel } from '../../../types';
import type { VirtualRow } from '../../../hooks/useGanttVirtualization';

// ============================================
// Vertical Grid Lines Renderer
// ============================================

interface VerticalGridLinesProps {
    minDate: Date;
    totalDays: number;
    chartHeight: number;
    pixelsPerDay: number;
    zoomLevel: ZoomLevel;
}

/**
 * 수직 그리드 라인 렌더러
 *
 * - DAY 줌: 매일 선 표시, 일요일에 진한 선
 * - WEEK/MONTH 줌: 주 시작(일요일)에만 선 표시
 */
export const VerticalGridLines = memo<VerticalGridLinesProps>(({
    minDate,
    totalDays,
    chartHeight,
    pixelsPerDay,
    zoomLevel,
}) => {
    return (
        <>
            {Array.from({ length: totalDays }, (_, i) => {
                const date = addDays(minDate, i);
                const dayOfWeek = getDay(date);
                const rightX = (i + 1) * pixelsPerDay - 0.5;
                const leftX = i * pixelsPerDay - 0.5;

                if (zoomLevel === 'DAY') {
                    if (dayOfWeek === 0) {
                        // 일요일: 왼쪽 진한 선 + 오른쪽 일반 선
                        return (
                            <g key={`vline-${i}`}>
                                <line
                                    x1={leftX}
                                    y1={0}
                                    x2={leftX}
                                    y2={chartHeight}
                                    stroke={GANTT_COLORS.gridDark}
                                    strokeWidth={1}
                                />
                                <line
                                    x1={rightX}
                                    y1={0}
                                    x2={rightX}
                                    y2={chartHeight}
                                    stroke={GANTT_COLORS.grid}
                                    strokeWidth={1}
                                />
                            </g>
                        );
                    } else {
                        // 다른 요일: 오른쪽 일반 선만
                        return (
                            <line
                                key={`vline-${i}`}
                                x1={rightX}
                                y1={0}
                                x2={rightX}
                                y2={chartHeight}
                                stroke={GANTT_COLORS.grid}
                                strokeWidth={1}
                            />
                        );
                    }
                } else if (zoomLevel === 'WEEK' || zoomLevel === 'MONTH') {
                    // WEEK/MONTH: 일요일 왼쪽에만 선
                    if (dayOfWeek === 0) {
                        return (
                            <line
                                key={`vline-${i}`}
                                x1={leftX}
                                y1={0}
                                x2={leftX}
                                y2={chartHeight}
                                stroke={GANTT_COLORS.grid}
                                strokeWidth={1}
                            />
                        );
                    }
                }
                return null;
            })}
        </>
    );
});

VerticalGridLines.displayName = 'VerticalGridLines';

// ============================================
// Horizontal Grid Lines Renderer
// ============================================

interface HorizontalGridLinesProps {
    rowData: VirtualRow[];
    chartWidth: number;
    /** Y축 오프셋 (마일스톤 레인 높이) */
    offsetY?: number;
}

/**
 * 수평 그리드 라인 렌더러 (행 구분선)
 */
export const HorizontalGridLines = memo<HorizontalGridLinesProps>(({
    rowData,
    chartWidth,
    offsetY = 0,
}) => {
    return (
        <>
            {rowData.map((row) => (
                <line
                    key={`line-${row.key}`}
                    x1={0}
                    y1={row.start + row.size + offsetY}
                    x2={chartWidth}
                    y2={row.start + row.size + offsetY}
                    stroke={GANTT_COLORS.borderLight}
                    strokeWidth={1}
                />
            ))}
        </>
    );
});

HorizontalGridLines.displayName = 'HorizontalGridLines';

// ============================================
// Group Row Background Renderer
// ============================================

interface GroupRowBackgroundProps {
    tasks: { id: string; type: string }[];
    rowData: VirtualRow[];
    chartWidth: number;
    /** Y축 오프셋 (마일스톤 레인 높이) */
    offsetY?: number;
}

/**
 * GROUP 행 배경색 렌더러
 */
export const GroupRowBackground = memo<GroupRowBackgroundProps>(({
    tasks,
    rowData,
    chartWidth,
    offsetY = 0,
}) => {
    return (
        <>
            {rowData.map((row) => {
                const task = tasks[row.index];
                if (!task || task.type !== 'GROUP') return null;

                return (
                    <rect
                        key={`group-bg-${row.key}`}
                        x={0}
                        y={row.start + offsetY}
                        width={chartWidth}
                        height={row.size}
                        fill={GANTT_COLORS.bgSecondary}
                        fillOpacity={0.6}
                        className="pointer-events-none"
                    />
                );
            })}
        </>
    );
});

GroupRowBackground.displayName = 'GroupRowBackground';
