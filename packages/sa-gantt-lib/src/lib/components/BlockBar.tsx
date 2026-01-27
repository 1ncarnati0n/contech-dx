'use client';

import React, { useMemo } from 'react';
import { addDays } from 'date-fns';
import { ConstructionTask, GANTT_COLORS } from '../types';
import { dateToX } from '../utils/dateUtils';
import { calculateGroupDateRange } from '../utils/groupUtils';

// 블록 바 상수
const BLOCK_POINT_RADIUS = 4;       // 양 끝 포인트 반지름
const BLOCK_LINE_Y = 3;             // 실선 Y 위치 (포인트 중심)

interface BlockBarProps {
    block: ConstructionTask;
    allTasks: ConstructionTask[];
    y: number;
    minDate: Date;
    pixelsPerDay: number;
    currentDeltaDays?: number;
    onToggle?: (blockId: string) => void;
    onClick?: (e: React.MouseEvent, blockId: string) => void;
    isFocused?: boolean;
}

/**
 * Block 행 전용 바 컴포넌트
 *
 * 양 끝에 포인트(원)가 있고 대시선으로 연결된 스타일
 * 라벨은 바 위 중앙에 표시
 */
export const BlockBar: React.FC<BlockBarProps> = React.memo(({
    block,
    allTasks,
    y,
    minDate,
    pixelsPerDay,
    currentDeltaDays = 0,
    onToggle,
    onClick,
    isFocused = false,
}) => {
    // 블록의 날짜 범위 계산 (하위 태스크 기준)
    const dateRange = useMemo(
        () => calculateGroupDateRange(block.id, allTasks),
        [block.id, allTasks]
    );

    if (!dateRange) return null;

    const { startDate, totalDays } = dateRange;

    // 드래그 중이면 deltaDays 적용
    const adjustedStartDate = currentDeltaDays !== 0
        ? addDays(startDate, currentDeltaDays)
        : startDate;

    const startX = dateToX(adjustedStartDate, minDate, pixelsPerDay);
    const totalWidth = totalDays * pixelsPerDay;

    // 바 Y 위치 (GanttTimeline에서 이미 중앙 정렬된 y 전달받음)
    const barY = 0;

    const handleDoubleClick = (e: React.MouseEvent) => {
        e.preventDefault();
        e.stopPropagation();
        onToggle?.(block.id);
    };

    return (
        <g
            transform={`translate(${startX}, ${y})`}
            className="cursor-pointer"
        >
            {/* Focus Highlight Effect */}
            {isFocused && (
                <rect
                    x={-BLOCK_POINT_RADIUS - 3}
                    y={barY - 3}
                    width={totalWidth + BLOCK_POINT_RADIUS * 2 + 6}
                    height={BLOCK_POINT_RADIUS * 2 + 6}
                    fill="none"
                    stroke={GANTT_COLORS.focus}
                    strokeWidth={2}
                    rx={4}
                    ry={4}
                    className="animate-pulse"
                    style={{ filter: `drop-shadow(0 0 6px ${GANTT_COLORS.focus})` }}
                />
            )}

            {/* 라벨 (바 위 중앙) */}
            <text
                x={totalWidth / 2}
                y={barY - 5}
                textAnchor="middle"
                className="pointer-events-none select-none font-normal"
                fill={GANTT_COLORS.textPrimary}
                style={{ fontSize: '11px' }}
            >
                {block.name}
            </text>

            {/* 실선 (두 포인트 사이) */}
            <line
                x1={BLOCK_POINT_RADIUS}
                y1={barY + BLOCK_LINE_Y}
                x2={totalWidth - BLOCK_POINT_RADIUS}
                y2={barY + BLOCK_LINE_Y}
                stroke={GANTT_COLORS.textMuted}
                strokeWidth={2}
                strokeLinecap="round"
            />

            {/* 시작점 포인트 */}
            <circle
                cx={0}
                cy={barY + BLOCK_LINE_Y}
                r={BLOCK_POINT_RADIUS}
                fill={GANTT_COLORS.textMuted}
                stroke={GANTT_COLORS.bgPrimary}
                strokeWidth={1.5}
            />

            {/* 끝점 포인트 */}
            <circle
                cx={totalWidth}
                cy={barY + BLOCK_LINE_Y}
                r={BLOCK_POINT_RADIUS}
                fill={GANTT_COLORS.textMuted}
                stroke={GANTT_COLORS.bgPrimary}
                strokeWidth={1.5}
            />

            {/* 히트 영역 (투명) - 클릭 및 더블클릭 */}
            <rect
                x={-BLOCK_POINT_RADIUS}
                y={0}
                width={totalWidth + BLOCK_POINT_RADIUS * 2}
                height={barY + BLOCK_POINT_RADIUS * 2 + 4}
                fill="transparent"
                className="cursor-pointer"
                onClick={(e) => {
                    e.stopPropagation();
                    onClick?.(e, block.id);
                }}
                onDoubleClick={handleDoubleClick}
            />
        </g>
    );
});

BlockBar.displayName = 'BlockBar';
