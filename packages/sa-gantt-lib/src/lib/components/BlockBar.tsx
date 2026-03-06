'use client';

import React, { useMemo } from 'react';
import { addDays, differenceInDays } from 'date-fns';
import { ConstructionTask, GANTT_COLORS } from '../types';
import { dateToX } from '../utils/dateUtils';
import { calculateGroupDateRange, collectDescendantTasks } from '../utils/groupUtils';

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
    isDraggable?: boolean;
    /** 그룹 드래그 정보 (스냅된 정밀한 날짜) - getTaskDragInfo에서 전달 */
    groupDragInfo?: { startDate: Date; endDate: Date } | null;
    onDragStart?: (
        e: React.MouseEvent,
        blockId: string,
        taskData: {
            startDate: Date;
            endDate: Date;
            affectedTaskIds: string[];
        }
    ) => void;
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
    isDraggable = false,
    groupDragInfo,
    onDragStart,
    onToggle,
    onClick,
    isFocused = false,
}) => {
    // 블록의 날짜 범위 계산 (하위 태스크 기준)
    const dateRange = useMemo(
        () => calculateGroupDateRange(block.id, allTasks),
        [block.id, allTasks]
    );

    // 하위 Task ID 목록 (드래그 시 영향받는 태스크들)
    const affectedTaskIds = useMemo(
        () => collectDescendantTasks(block.id, allTasks).map(t => t.id),
        [block.id, allTasks]
    );

    if (!dateRange) return null;

    const { startDate, endDate, totalDays } = dateRange;

    // 드래그 중이면 groupDragInfo 우선 사용 (정밀한 스냅된 날짜)
    // groupDragInfo가 없으면 currentDeltaDays로 fallback
    const adjustedStartDate = groupDragInfo?.startDate
        ?? (currentDeltaDays !== 0 ? addDays(startDate, currentDeltaDays) : startDate);

    // 드래그 정보가 있으면 너비도 드래그된 날짜 범위로 계산
    const adjustedTotalDays = groupDragInfo
        ? differenceInDays(groupDragInfo.endDate, groupDragInfo.startDate) + 1
        : totalDays;

    const startX = dateToX(adjustedStartDate, minDate, pixelsPerDay);
    const totalWidth = adjustedTotalDays * pixelsPerDay;

    // 바 Y 위치 (GanttTimeline에서 이미 중앙 정렬된 y 전달받음)
    const barY = 0;

    const handleMouseDown = (e: React.MouseEvent) => {
        if (!isDraggable || !onDragStart) return;
        e.preventDefault();
        e.stopPropagation();

        onDragStart(e, block.id, {
            startDate,
            endDate,
            affectedTaskIds,
        });
    };

    const handleDoubleClick = (e: React.MouseEvent) => {
        e.preventDefault();
        e.stopPropagation();
        onToggle?.(block.id);
    };

    return (
        <g
            transform={`translate(${startX}, ${y})`}
            className={isDraggable ? 'cursor-grab active:cursor-grabbing' : 'cursor-pointer'}
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

            {/* 히트 영역 (투명) - 클릭, 더블클릭 및 드래그 */}
            <rect
                x={-BLOCK_POINT_RADIUS}
                y={0}
                width={totalWidth + BLOCK_POINT_RADIUS * 2}
                height={barY + BLOCK_POINT_RADIUS * 2 + 4}
                fill="transparent"
                className={isDraggable ? 'cursor-grab active:cursor-grabbing' : 'cursor-pointer'}
                onClick={(e) => {
                    e.stopPropagation();
                    onClick?.(e, block.id);
                }}
                onMouseDown={handleMouseDown}
                onDoubleClick={handleDoubleClick}
            />
        </g>
    );
});

BlockBar.displayName = 'BlockBar';
