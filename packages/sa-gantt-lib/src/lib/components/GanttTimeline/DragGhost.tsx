'use client';

import React from 'react';
import { GANTT_COLORS } from '../../types';

// 휴일 경고 색상 (GANTT_COLORS에 없으므로 상수 정의)
const HOLIDAY_WARNING_COLOR = '#f59e0b';

// ============================================
// DragGhost 컴포넌트
// ============================================
// 드래그 시 시각적 피드백을 제공하는 유령(ghost) 바
// - 원본 위치: 점선 테두리
// - 현재 드래그 위치: 반투명 바

export interface DragGhostProps {
    /** 원본 위치 X 좌표 */
    originalX: number;
    /** 현재 드래그 위치 X 좌표 */
    currentX: number;
    /** Y 좌표 (원본과 동일) */
    y: number;
    /** 바 너비 */
    width: number;
    /** 바 높이 */
    height: number;
    /** 원본 고스트 표시 여부 */
    showOriginal?: boolean;
    /** 현재 위치 고스트 표시 여부 */
    showCurrent?: boolean;
    /** 원본 고스트 색상 */
    originalColor?: string;
    /** 현재 위치 고스트 색상 */
    currentColor?: string;
    /** 현재 위치가 휴일인지 여부 (경고 표시용) */
    isOnHoliday?: boolean;
}

/**
 * 드래그 시 원본 위치와 현재 위치를 시각적으로 표시하는 고스트 바
 */
export const DragGhost: React.FC<DragGhostProps> = React.memo(({
    originalX,
    currentX,
    y,
    width,
    height,
    showOriginal = true,
    showCurrent = true,
    originalColor = GANTT_COLORS.textMuted,
    currentColor = GANTT_COLORS.focus,
    isOnHoliday = false,
}) => {
    // 드래그 거리 계산 (시각적 표시용)
    const deltaX = currentX - originalX;
    const isMoving = Math.abs(deltaX) > 1;

    if (!isMoving) return null;

    return (
        <g className="pointer-events-none">
            {/* 원본 위치 고스트: 점선 테두리 */}
            {showOriginal && (
                <rect
                    x={originalX}
                    y={y}
                    width={width}
                    height={height}
                    fill="none"
                    stroke={originalColor}
                    strokeWidth={1.5}
                    strokeDasharray="4,4"
                    rx={2}
                    ry={2}
                    opacity={0.6}
                />
            )}

            {/* 현재 드래그 위치 고스트: 반투명 바 */}
            {showCurrent && (
                <>
                    <rect
                        x={currentX}
                        y={y}
                        width={width}
                        height={height}
                        fill={isOnHoliday ? HOLIDAY_WARNING_COLOR : currentColor}
                        rx={2}
                        ry={2}
                        opacity={isOnHoliday ? 0.4 : 0.3}
                    />
                    {/* 현재 위치 테두리 */}
                    <rect
                        x={currentX}
                        y={y}
                        width={width}
                        height={height}
                        fill="none"
                        stroke={isOnHoliday ? HOLIDAY_WARNING_COLOR : currentColor}
                        strokeWidth={2}
                        rx={2}
                        ry={2}
                        opacity={0.8}
                    />
                </>
            )}

            {/* 이동 연결선 (원본 → 현재) */}
            {showOriginal && showCurrent && (
                <line
                    x1={originalX + width / 2}
                    y1={y + height / 2}
                    x2={currentX + width / 2}
                    y2={y + height / 2}
                    stroke={currentColor}
                    strokeWidth={1}
                    strokeDasharray="2,2"
                    opacity={0.4}
                />
            )}

            {/* 휴일 경고 아이콘 */}
            {isOnHoliday && showCurrent && (
                <g transform={`translate(${currentX + width / 2}, ${y - 10})`}>
                    <circle
                        r={8}
                        fill={HOLIDAY_WARNING_COLOR}
                        opacity={0.9}
                    />
                    <text
                        textAnchor="middle"
                        dominantBaseline="central"
                        fill="white"
                        fontSize={10}
                        fontWeight="bold"
                    >
                        !
                    </text>
                </g>
            )}
        </g>
    );
});

DragGhost.displayName = 'DragGhost';

// ============================================
// 다중 선택 드래그용 고스트 오버레이
// ============================================

export interface MultiDragGhostProps {
    /** 드래그 중인 Task들의 정보 */
    tasks: Array<{
        id: string;
        originalX: number;
        currentX: number;
        y: number;
        width: number;
        height: number;
        isOnHoliday?: boolean;
    }>;
    /** 선택된 Task 수 표시 여부 */
    showCount?: boolean;
}

/**
 * 다중 선택 드래그 시 여러 Task의 고스트를 표시
 */
export const MultiDragGhost: React.FC<MultiDragGhostProps> = React.memo(({
    tasks,
    showCount = true,
}) => {
    if (tasks.length === 0) return null;

    // 바운딩 박스 계산 (배지 위치용)
    const minX = Math.min(...tasks.map(t => t.currentX));
    const minY = Math.min(...tasks.map(t => t.y));

    return (
        <g className="pointer-events-none">
            {/* 각 Task의 고스트 */}
            {tasks.map(task => (
                <DragGhost
                    key={task.id}
                    originalX={task.originalX}
                    currentX={task.currentX}
                    y={task.y}
                    width={task.width}
                    height={task.height}
                    isOnHoliday={task.isOnHoliday}
                />
            ))}

            {/* 선택된 Task 수 배지 */}
            {showCount && tasks.length > 1 && (
                <g transform={`translate(${minX - 10}, ${minY - 10})`}>
                    <circle
                        r={12}
                        fill={GANTT_COLORS.focus}
                        opacity={0.9}
                    />
                    <text
                        textAnchor="middle"
                        dominantBaseline="central"
                        fill="white"
                        fontSize={11}
                        fontWeight="bold"
                    >
                        {tasks.length}
                    </text>
                </g>
            )}
        </g>
    );
});

MultiDragGhost.displayName = 'MultiDragGhost';
