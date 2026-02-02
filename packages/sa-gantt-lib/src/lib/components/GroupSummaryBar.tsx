'use client';

import React, { useState, useMemo } from 'react';
import { addDays } from 'date-fns';
import { ConstructionTask, GANTT_LAYOUT, GANTT_COLORS, GANTT_SUMMARY } from '../types';
import { dateToX } from '../utils/dateUtils';
import { calculateGroupDateRange, collectDescendantTasks } from '../utils/groupUtils';

const { BAR_HEIGHT } = GANTT_LAYOUT;
const { BAR_HEIGHT: SUMMARY_BAR_HEIGHT } = GANTT_SUMMARY;

// 앵커 크기 상수 (통일)
const ANCHOR_SIZE = {
    DEFAULT: 4,
    ACTIVE: 5,  // 연결 중인 앵커만 약간 커짐
};

// 앵커 히트 영역 크기 (24x24px로 확대)
const ANCHOR_HIT_SIZE = 24;

/** 연결 포인트 상태 */
interface GroupConnectingFrom {
    groupId: string;
    edge: 'start' | 'end';
}

interface GroupSummaryBarProps {
    group: ConstructionTask;
    allTasks: ConstructionTask[];
    y: number;
    minDate: Date;
    pixelsPerDay: number;
    parentBarHeight?: number;
    isDraggable?: boolean;
    currentDeltaDays?: number;
    onDragStart?: (
        e: React.MouseEvent,
        groupId: string,
        taskData: {
            startDate: Date;
            endDate: Date;
            affectedTaskIds: string[];
        }
    ) => void;
    onToggle?: (groupId: string) => void;
    onClick?: (e: React.MouseEvent, groupId: string) => void;
    isFocused?: boolean;
    /** 컴팩트 모드 여부 */
    isCompact?: boolean;
    // === 종속선 연결 관련 props ===
    /** 연결 중인 시작점 정보 */
    connectingFrom?: GroupConnectingFrom | null;
    /** 종속성 연결 여부 (시작점/끝점 중 하나라도 연결되어 있으면) */
    hasConnection?: { start: boolean; end: boolean };
    /** Group 바 edge 클릭 핸들러 */
    onEdgeClick?: (groupId: string, edge: 'start' | 'end') => void;
    /** Group 바 edge 호버 핸들러 */
    onEdgeHover?: (groupId: string, edge: 'start' | 'end' | null) => void;
}

export const GroupSummaryBar: React.FC<GroupSummaryBarProps> = React.memo(({
    group,
    allTasks,
    y,
    minDate,
    pixelsPerDay,
    parentBarHeight,
    isDraggable = false,
    currentDeltaDays = 0,
    onDragStart,
    onToggle,
    onClick,
    isFocused = false,
    isCompact = false,
    // 종속선 연결 관련
    connectingFrom,
    hasConnection = { start: false, end: false },
    onEdgeClick,
    onEdgeHover,
}) => {
    const effectiveParentBarHeight = parentBarHeight ?? BAR_HEIGHT;

    // 양 끝점 호버 상태 (각 앵커 영역 호버 시에만 해당 앵커 표시)
    const [isHoveringStart, setIsHoveringStart] = useState(false);
    const [isHoveringEnd, setIsHoveringEnd] = useState(false);

    // 그룹의 날짜 범위 계산
    const dateRange = useMemo(
        () => calculateGroupDateRange(group.id, allTasks),
        [group.id, allTasks]
    );

    // 하위 Task ID 목록 (groupUtils의 collectDescendantTasks 재사용)
    const affectedTaskIds = useMemo(
        () => collectDescendantTasks(group.id, allTasks).map(t => t.id),
        [group.id, allTasks]
    );

    if (!dateRange) return null;

    const { startDate, endDate, totalDays } = dateRange;
    const progress = group.group?.progress ?? 0;

    // 드래그 중이면 deltaDays 적용
    const adjustedStartDate = currentDeltaDays !== 0
        ? addDays(startDate, currentDeltaDays)
        : startDate;

    const startX = dateToX(adjustedStartDate, minDate, pixelsPerDay);
    const totalWidth = totalDays * pixelsPerDay;
    const progressWidth = totalWidth * (progress / 100);

    // 바 Y 위치 (GanttTimeline에서 이미 중앙 정렬된 y 전달받음)
    const barY = 0;

    const handleMouseDown = (e: React.MouseEvent) => {
        if (!isDraggable || !onDragStart) return;
        e.preventDefault();
        e.stopPropagation();

        onDragStart(e, group.id, {
            startDate,
            endDate,
            affectedTaskIds,
        });
    };

    const handleDoubleClick = (e: React.MouseEvent) => {
        e.preventDefault();
        e.stopPropagation();
        onToggle?.(group.id);
    };

    return (
        <g
            transform={`translate(${startX}, ${y})`}
            className={isDraggable ? 'cursor-grab active:cursor-grabbing' : ''}
        >
            {/* Focus Highlight Effect */}
            {isFocused && (
                <rect
                    x={-3}
                    y={barY - 3}
                    width={totalWidth + 6}
                    height={SUMMARY_BAR_HEIGHT + 6}
                    fill="none"
                    stroke={GANTT_COLORS.focus}
                    strokeWidth={2}
                    rx={4}
                    ry={4}
                    className="animate-pulse"
                    style={{ filter: `drop-shadow(0 0 6px ${GANTT_COLORS.focus})` }}
                />
            )}

            {/* Summary 바 배경 (전체 기간) */}
            <rect
                x={0}
                y={barY}
                width={totalWidth}
                height={SUMMARY_BAR_HEIGHT}
                fill={GANTT_COLORS.summaryBar}
                rx={2}
                ry={2}
                opacity={0.4}
            />

            {/* 진행도 바 */}
            {progress > 0 && (
                <rect
                    x={0}
                    y={barY}
                    width={progressWidth}
                    height={SUMMARY_BAR_HEIGHT}
                    fill={GANTT_COLORS.summaryProgress}
                    rx={2}
                    ry={2}
                />
            )}

            {/* 그룹명 (컴팩트: 바 좌측, 기본: 바 위 중앙) */}
            <text
                x={isCompact ? -5 : totalWidth / 2}
                y={isCompact ? barY + SUMMARY_BAR_HEIGHT / 2 + 3 : barY - 3}
                textAnchor={isCompact ? 'end' : 'middle'}
                className="font-normal"
                fill={GANTT_COLORS.textSecondary}
                style={{ fontSize: '11px' }}
            >
                {group.name}
            </text>

            {/* 진행도 텍스트 (바 오른쪽) */}
            <text
                x={totalWidth + 8}
                y={barY + SUMMARY_BAR_HEIGHT / 2 + 3}
                fill={GANTT_COLORS.textMuted}
                style={{ fontSize: '9px' }}
            >
                {progress}%
            </text>

            {/* 히트 영역 (투명) - 클릭, 더블클릭 및 드래그 */}
            <rect
                x={0}
                y={0}
                width={totalWidth}
                height={effectiveParentBarHeight}
                fill="transparent"
                className={isDraggable ? 'cursor-grab active:cursor-grabbing' : 'cursor-pointer'}
                onClick={(e) => {
                    e.stopPropagation();
                    onClick?.(e, group.id);
                }}
                onMouseDown={handleMouseDown}
                onDoubleClick={handleDoubleClick}
            />

            {/* === 종속선 연결 포인트 === */}
            {onEdgeClick && (
                <>
                    {/* 시작점 (FS Target) - 왼쪽 끝, 바 하단 */}
                    {(() => {
                        const isConnecting = !!connectingFrom;
                        const isConnectingToThis = connectingFrom && connectingFrom.groupId !== group.id;
                        const isConnected = hasConnection.start;
                        // 시작점 호버 또는 연결 중이거나 이미 연결된 경우에만 앵커 표시
                        const showAnchor = isHoveringStart || isConnecting || isConnected;
                        const anchorY = barY + SUMMARY_BAR_HEIGHT;

                        return (
                            <g className="group-connection-start">
                                {/* 클릭 영역 (확대: 24x24px) */}
                                <rect
                                    x={-ANCHOR_HIT_SIZE / 2}
                                    y={anchorY - ANCHOR_HIT_SIZE / 2}
                                    width={ANCHOR_HIT_SIZE}
                                    height={ANCHOR_HIT_SIZE}
                                    fill="transparent"
                                    style={{ cursor: isConnectingToThis ? 'pointer' : 'default' }}
                                    onClick={(e) => {
                                        if (isConnectingToThis) {
                                            e.stopPropagation();
                                            onEdgeClick(group.id, 'start');
                                        }
                                    }}
                                    onMouseEnter={() => {
                                        setIsHoveringStart(true);
                                        onEdgeHover?.(group.id, 'start');
                                    }}
                                    onMouseLeave={() => {
                                        setIsHoveringStart(false);
                                        onEdgeHover?.(group.id, null);
                                    }}
                                />
                                {/* 앵커 원 - 크기 통일 */}
                                <circle
                                    cx={0}
                                    cy={anchorY}
                                    r={isConnectingToThis ? ANCHOR_SIZE.ACTIVE : ANCHOR_SIZE.DEFAULT}
                                    fill={isConnectingToThis
                                        ? GANTT_COLORS.success
                                        : isConnected
                                            ? GANTT_COLORS.textPrimary
                                            : GANTT_COLORS.summaryBar
                                    }
                                    stroke={isConnectingToThis
                                        ? GANTT_COLORS.success
                                        : isConnected
                                            ? GANTT_COLORS.textPrimary
                                            : GANTT_COLORS.textMuted
                                    }
                                    strokeWidth={isConnected || isConnectingToThis ? 1 : 0.5}
                                    opacity={showAnchor ? (isConnected || isConnectingToThis ? 1 : 0.6) : 0}
                                    style={{
                                        cursor: isConnectingToThis ? 'pointer' : 'default',
                                        transition: 'all 0.15s ease',
                                    }}
                                    pointerEvents={isConnectingToThis ? 'auto' : 'none'}
                                />
                            </g>
                        );
                    })()}

                    {/* 끝점 (FS Source) - 오른쪽 끝, 바 하단 */}
                    {(() => {
                        const isConnectingFromThis = connectingFrom?.groupId === group.id && connectingFrom.edge === 'end';
                        const canStartConnection = !connectingFrom;
                        const isConnected = hasConnection.end;
                        // 끝점 호버 또는 연결 중이거나 이미 연결된 경우에만 앵커 표시
                        const showAnchor = isHoveringEnd || isConnectingFromThis || isConnected;
                        const anchorY = barY + SUMMARY_BAR_HEIGHT;

                        return (
                            <g className="group-connection-end">
                                {/* 클릭 영역 (확대: 24x24px) */}
                                <rect
                                    x={totalWidth - ANCHOR_HIT_SIZE / 2}
                                    y={anchorY - ANCHOR_HIT_SIZE / 2}
                                    width={ANCHOR_HIT_SIZE}
                                    height={ANCHOR_HIT_SIZE}
                                    fill="transparent"
                                    style={{ cursor: canStartConnection || isConnectingFromThis ? 'pointer' : 'default' }}
                                    onClick={(e) => {
                                        if (canStartConnection || isConnectingFromThis) {
                                            e.stopPropagation();
                                            onEdgeClick(group.id, 'end');
                                        }
                                    }}
                                    onMouseEnter={() => {
                                        setIsHoveringEnd(true);
                                        onEdgeHover?.(group.id, 'end');
                                    }}
                                    onMouseLeave={() => {
                                        setIsHoveringEnd(false);
                                        onEdgeHover?.(group.id, null);
                                    }}
                                />
                                {/* 앵커 원 - 크기 통일 */}
                                <circle
                                    cx={totalWidth}
                                    cy={anchorY}
                                    r={isConnectingFromThis ? ANCHOR_SIZE.ACTIVE : ANCHOR_SIZE.DEFAULT}
                                    fill={isConnectingFromThis
                                        ? GANTT_COLORS.success
                                        : isConnected
                                            ? GANTT_COLORS.textPrimary
                                            : GANTT_COLORS.summaryBar
                                    }
                                    stroke={isConnectingFromThis
                                        ? GANTT_COLORS.success
                                        : isConnected
                                            ? GANTT_COLORS.textPrimary
                                            : GANTT_COLORS.textMuted
                                    }
                                    strokeWidth={isConnected || isConnectingFromThis ? 1 : 0.5}
                                    opacity={showAnchor ? (isConnected || isConnectingFromThis ? 1 : 0.6) : 0}
                                    style={{
                                        cursor: canStartConnection ? 'pointer' : 'default',
                                        transition: 'all 0.15s ease',
                                    }}
                                    pointerEvents="auto"
                                />
                            </g>
                        );
                    })()}
                </>
            )}
        </g>
    );
});
