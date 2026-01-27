'use client';

import React, { useMemo } from 'react';
import { GANTT_COLORS } from '../../types';

// ============================================
// MultiSelectOverlay 컴포넌트
// ============================================
// 다중 선택된 Task들의 시각적 피드백 제공
// - 선택된 Task들 테두리 강조
// - "N개 선택됨" 배지 표시

export interface SelectedTaskInfo {
    id: string;
    x: number;
    y: number;
    width: number;
    height: number;
}

export interface MultiSelectOverlayProps {
    /** 선택된 Task들의 위치 정보 */
    selectedTasks: SelectedTaskInfo[];
    /** 다중 드래그 진행 중 여부 */
    isDragging?: boolean;
    /** 배지 표시 여부 */
    showBadge?: boolean;
    /** 선택 강조 색상 */
    highlightColor?: string;
}

/**
 * 다중 선택된 Task들의 시각적 오버레이
 */
export const MultiSelectOverlay: React.FC<MultiSelectOverlayProps> = React.memo(({
    selectedTasks,
    isDragging = false,
    showBadge = true,
    highlightColor = GANTT_COLORS.focus,
}) => {
    // 2개 이상 선택된 경우에만 표시
    if (selectedTasks.length < 2) return null;

    // 바운딩 박스 계산 (배지 위치용)
    const boundingBox = useMemo(() => {
        if (selectedTasks.length === 0) return null;

        let minX = Infinity;
        let minY = Infinity;
        let maxX = -Infinity;
        let maxY = -Infinity;

        for (const task of selectedTasks) {
            minX = Math.min(minX, task.x);
            minY = Math.min(minY, task.y);
            maxX = Math.max(maxX, task.x + task.width);
            maxY = Math.max(maxY, task.y + task.height);
        }

        return { minX, minY, maxX, maxY };
    }, [selectedTasks]);

    if (!boundingBox) return null;

    return (
        <g className="pointer-events-none">
            {/* 각 선택된 Task에 테두리 강조 */}
            {selectedTasks.map(task => (
                <rect
                    key={task.id}
                    x={task.x - 2}
                    y={task.y - 2}
                    width={task.width + 4}
                    height={task.height + 4}
                    fill="none"
                    stroke={highlightColor}
                    strokeWidth={isDragging ? 2 : 1.5}
                    strokeDasharray={isDragging ? 'none' : '4,2'}
                    rx={3}
                    ry={3}
                    opacity={isDragging ? 0.9 : 0.7}
                    style={{
                        filter: isDragging
                            ? `drop-shadow(0 0 4px ${highlightColor})`
                            : 'none',
                    }}
                />
            ))}

            {/* 선택 영역 연결 (드래그 중일 때) */}
            {isDragging && (
                <rect
                    x={boundingBox.minX - 6}
                    y={boundingBox.minY - 6}
                    width={boundingBox.maxX - boundingBox.minX + 12}
                    height={boundingBox.maxY - boundingBox.minY + 12}
                    fill="none"
                    stroke={highlightColor}
                    strokeWidth={1}
                    strokeDasharray="6,4"
                    rx={4}
                    ry={4}
                    opacity={0.4}
                />
            )}

            {/* "N개 선택됨" 배지 */}
            {showBadge && (
                <g transform={`translate(${boundingBox.minX - 8}, ${boundingBox.minY - 14})`}>
                    <rect
                        x={0}
                        y={0}
                        width={60}
                        height={20}
                        fill={highlightColor}
                        rx={10}
                        ry={10}
                        opacity={0.95}
                    />
                    <text
                        x={30}
                        y={14}
                        textAnchor="middle"
                        fill="white"
                        fontSize={11}
                        fontWeight="bold"
                    >
                        {selectedTasks.length}개 선택
                    </text>
                </g>
            )}
        </g>
    );
});

MultiSelectOverlay.displayName = 'MultiSelectOverlay';

// ============================================
// 다중 선택 드래그 진행 중 오버레이
// ============================================

export interface MultiDragProgressOverlayProps {
    /** 드래그 중인 Task들의 정보 */
    tasks: Array<{
        id: string;
        originalX: number;
        currentX: number;
        y: number;
        width: number;
        height: number;
    }>;
    /** 이동된 일수 */
    deltaDays: number;
}

/**
 * 다중 선택 드래그 진행 중 오버레이
 */
export const MultiDragProgressOverlay: React.FC<MultiDragProgressOverlayProps> = React.memo(({
    tasks,
    deltaDays,
}) => {
    if (tasks.length === 0) return null;

    // 바운딩 박스 계산
    const boundingBox = useMemo(() => {
        let minX = Infinity;
        let minY = Infinity;

        for (const task of tasks) {
            minX = Math.min(minX, task.currentX);
            minY = Math.min(minY, task.y);
        }

        return { minX, minY };
    }, [tasks]);

    const direction = deltaDays >= 0 ? '+' : '';

    return (
        <g className="pointer-events-none">
            {/* 각 Task의 원본 위치 (점선) */}
            {tasks.map(task => (
                <React.Fragment key={task.id}>
                    {/* 원본 위치 */}
                    <rect
                        x={task.originalX}
                        y={task.y}
                        width={task.width}
                        height={task.height}
                        fill="none"
                        stroke={GANTT_COLORS.textMuted}
                        strokeWidth={1}
                        strokeDasharray="4,4"
                        rx={2}
                        ry={2}
                        opacity={0.5}
                    />
                    {/* 현재 위치 */}
                    <rect
                        x={task.currentX}
                        y={task.y}
                        width={task.width}
                        height={task.height}
                        fill={GANTT_COLORS.focus}
                        rx={2}
                        ry={2}
                        opacity={0.25}
                    />
                    <rect
                        x={task.currentX}
                        y={task.y}
                        width={task.width}
                        height={task.height}
                        fill="none"
                        stroke={GANTT_COLORS.focus}
                        strokeWidth={2}
                        rx={2}
                        ry={2}
                        opacity={0.8}
                    />
                </React.Fragment>
            ))}

            {/* 이동 일수 배지 */}
            {deltaDays !== 0 && (
                <g transform={`translate(${boundingBox.minX - 8}, ${boundingBox.minY - 28})`}>
                    <rect
                        x={0}
                        y={0}
                        width={70}
                        height={22}
                        fill={GANTT_COLORS.focus}
                        rx={11}
                        ry={11}
                        opacity={0.95}
                    />
                    <text
                        x={35}
                        y={15}
                        textAnchor="middle"
                        fill="white"
                        fontSize={11}
                        fontWeight="bold"
                    >
                        {direction}{deltaDays}일 이동
                    </text>
                </g>
            )}
        </g>
    );
});

MultiDragProgressOverlay.displayName = 'MultiDragProgressOverlay';
