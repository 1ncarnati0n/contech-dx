'use client';

import React, { useMemo } from 'react';
import { differenceInDays } from 'date-fns';
import { GANTT_COLORS, GANTT_STROKE, GANTT_STROKE_COMPACT } from '../../types';
import type { ConstructionTask, GroupDependency } from '../../types';
import { calculateGroupDateRange } from '../../utils/groupUtils';

/** 행 데이터 타입 (동적 높이 계산용) */
interface RowData {
    index: number;
    start: number;
    size: number;
    key: string | number;
}

interface GroupDependencyLinesProps {
    tasks: ConstructionTask[];
    allTasks: ConstructionTask[];
    dependencies: GroupDependency[];
    minDate: Date;
    pixelsPerDay: number;
    selectedDepId?: string | null;
    hoveredDepId?: string | null;
    onDependencyClick?: (depId: string) => void;
    onDependencyHover?: (depId: string | null) => void;
    /** 종속성 선 우클릭 시 호출 */
    onDependencyContextMenu?: (depId: string, event: React.MouseEvent) => void;
    /** Y축 오프셋 (기본값: 0) */
    offsetY?: number;
    /** 행 데이터 (동적 높이 계산용) */
    rowData?: RowData[];
    /** Compact 모드 여부 */
    isCompact?: boolean;
    /** 드래그 정보 조회 함수 (실시간 종속선 동기화용) */
    getTaskDragInfo?: (taskId: string) => { startDate: Date; endDate: Date } | null;
}

/** 경로 끝점의 화살표 방향 */
type ArrowDirection = 'up' | 'down' | 'right';

interface DependencyPathInfo {
    id: string;
    path: string;
    sourceX: number;
    sourceY: number;
    targetX: number;
    targetY: number;
    /** 경로 끝점의 화살표 방향 */
    endDirection: ArrowDirection;
}

/**
 * Group 바의 좌표 계산
 * @param dragInfo - 드래그 중인 경우 스냅된 날짜 정보
 * @returns { startX, endX, centerY } - Group 바의 시작X, 끝X, 중앙Y
 */
const getGroupBarCoords = (
    group: ConstructionTask,
    rowIndex: number,
    allTasks: ConstructionTask[],
    minDate: Date,
    pixelsPerDay: number,
    offsetY: number = 0,
    rowData?: RowData[],
    dragInfo?: { startDate: Date; endDate: Date } | null
): { startX: number; endX: number; centerY: number } | null => {
    // 드래그 정보가 있으면 드래그된 날짜 사용, 없으면 원본 계산
    let startDate: Date;
    let totalDays: number;

    if (dragInfo) {
        startDate = dragInfo.startDate;
        totalDays = differenceInDays(dragInfo.endDate, dragInfo.startDate) + 1;
    } else {
        const dateRange = calculateGroupDateRange(group.id, allTasks);
        if (!dateRange) return null;
        startDate = dateRange.startDate;
        totalDays = dateRange.totalDays;
    }

    const startOffset = differenceInDays(startDate, minDate);
    const startX = startOffset * pixelsPerDay;
    const endX = (startOffset + totalDays) * pixelsPerDay;

    // 방어 로직: 유효하지 않은 좌표면 null 반환
    if (isNaN(startX) || isNaN(endX) || totalDays <= 0) {
        console.warn(`[GroupDependencyLines] Invalid coords for group ${group.id}:`, {
            startX,
            endX,
            totalDays,
            startDate: startDate?.toISOString(),
        });
        return null;
    }

    // Y 좌표 계산 (Group Summary Bar 중앙)
    const rowInfo = rowData?.find(r => r.index === rowIndex);
    const rowStart = rowInfo?.start ?? 0;
    const rowHeight = rowInfo?.size ?? 30;
    const centerY = offsetY + rowStart + rowHeight / 2;

    return { startX, endX, centerY };
};

/** createFSPath 반환 타입 */
interface FSPathResult {
    path: string;
    endDirection: ArrowDirection;
}

/**
 * FS 종속성 경로 생성 (선행 끝 → 후행 시작)
 * L자형 경로: 수평 → 수직 (한 번만 꺾임)
 * @returns { path, endDirection } - 경로와 끝점 화살표 방향
 */
const createFSPath = (
    sourceX: number,
    sourceY: number,
    targetX: number,
    targetY: number
): FSPathResult => {
    // 끝점 방향 결정 (마지막 세그먼트가 어느 방향으로 진입하는지)
    let endDirection: ArrowDirection;

    if (Math.abs(targetY - sourceY) < 5) {
        // 같은 행 - 수평 직선
        endDirection = 'right';
        return {
            path: `M ${sourceX} ${sourceY} H ${targetX}`,
            endDirection
        };
    }

    // L자형: 수평 → 수직
    if (targetY < sourceY) {
        endDirection = 'up';
    } else {
        endDirection = 'down';
    }

    return {
        path: `M ${sourceX} ${sourceY} H ${targetX} V ${targetY}`,
        endDirection
    };
};

/**
 * Group 종속성 선 렌더링 컴포넌트
 */
export const GroupDependencyLines: React.FC<GroupDependencyLinesProps> = ({
    tasks,
    allTasks,
    dependencies,
    minDate,
    pixelsPerDay,
    selectedDepId,
    hoveredDepId,
    onDependencyClick,
    onDependencyHover,
    onDependencyContextMenu,
    offsetY = 0,
    rowData,
    isCompact = false,
    getTaskDragInfo,
}) => {
    // Compact 모드에 따른 스트로크 상수 선택
    const STROKE = isCompact ? GANTT_STROKE_COMPACT : GANTT_STROKE;

    // 태스크 ID → 인덱스 맵
    const taskIndexMap = useMemo(() => {
        const map = new Map<string, number>();
        tasks.forEach((task, index) => {
            map.set(task.id, index);
        });
        return map;
    }, [tasks]);

    // 종속성 경로 계산
    const dependencyPaths = useMemo((): DependencyPathInfo[] => {
        return dependencies
            .map((dep) => {
                const sourceGroup = tasks.find(t => t.id === dep.sourceGroupId);
                const targetGroup = tasks.find(t => t.id === dep.targetGroupId);
                const sourceIndex = taskIndexMap.get(dep.sourceGroupId);
                const targetIndex = taskIndexMap.get(dep.targetGroupId);

                if (
                    !sourceGroup ||
                    !targetGroup ||
                    sourceIndex === undefined ||
                    targetIndex === undefined
                ) {
                    return null;
                }

                // 드래그 정보 조회 (실시간 동기화용)
                const sourceDragInfo = getTaskDragInfo?.(sourceGroup.id);
                const targetDragInfo = getTaskDragInfo?.(targetGroup.id);

                // Group 바 좌표 계산 (드래그 정보 전달)
                const sourceCoords = getGroupBarCoords(
                    sourceGroup,
                    sourceIndex,
                    allTasks,
                    minDate,
                    pixelsPerDay,
                    offsetY,
                    rowData,
                    sourceDragInfo
                );
                const targetCoords = getGroupBarCoords(
                    targetGroup,
                    targetIndex,
                    allTasks,
                    minDate,
                    pixelsPerDay,
                    offsetY,
                    rowData,
                    targetDragInfo
                );

                if (!sourceCoords || !targetCoords) return null;

                // FS: 선행 끝점(endX) → 후행 시작점(startX), 바 중앙 기준
                const { path, endDirection } = createFSPath(
                    sourceCoords.endX,
                    sourceCoords.centerY,
                    targetCoords.startX,
                    targetCoords.centerY
                );

                return {
                    id: dep.id,
                    path,
                    sourceX: sourceCoords.endX,
                    sourceY: sourceCoords.centerY,
                    targetX: targetCoords.startX,
                    targetY: targetCoords.centerY,
                    endDirection,
                };
            })
            .filter((p): p is DependencyPathInfo => p !== null);
    }, [dependencies, tasks, allTasks, taskIndexMap, minDate, pixelsPerDay, offsetY, rowData, getTaskDragInfo]);

    return (
        <g className="group-dependency-lines">
            {dependencyPaths.map((pathInfo) => {
                const isSelected = selectedDepId === pathInfo.id;
                const isHovered = hoveredDepId === pathInfo.id;

                // Compact 모드에 따른 마커 접미사
                const compactSuffix = isCompact ? '-compact' : '';

                // 방향에 따른 마커 접두사 결정
                const getDirectionMarker = (state: 'default' | 'selected' | 'hover') => {
                    const { endDirection } = pathInfo;

                    if (endDirection === 'up') {
                        if (state === 'selected') return `url(#dependency-arrow-up-selected${compactSuffix})`;
                        if (state === 'hover') return `url(#dependency-arrow-up-hover${compactSuffix})`;
                        return `url(#dependency-arrow-up${compactSuffix})`;
                    } else if (endDirection === 'down') {
                        if (state === 'selected') return `url(#dependency-arrow-down-selected${compactSuffix})`;
                        if (state === 'hover') return `url(#dependency-arrow-down-hover${compactSuffix})`;
                        return `url(#dependency-arrow-down${compactSuffix})`;
                    } else {
                        // 기본 우향 (orient="auto" 사용)
                        if (state === 'selected') return `url(#dependency-arrow-selected${compactSuffix})`;
                        if (state === 'hover') return `url(#dependency-arrow-hover${compactSuffix})`;
                        return `url(#dependency-arrow${compactSuffix})`;
                    }
                };

                let strokeColor: string = GANTT_COLORS.textPrimary;
                let markerEnd = getDirectionMarker('default');
                let strokeWidth: number = STROKE.DEFAULT;

                if (isSelected) {
                    strokeColor = GANTT_COLORS.focus;
                    markerEnd = getDirectionMarker('selected');
                    strokeWidth = STROKE.SELECTED;
                } else if (isHovered) {
                    strokeColor = GANTT_COLORS.textPrimary;
                    markerEnd = getDirectionMarker('hover');
                    strokeWidth = STROKE.HOVER;
                }

                return (
                    <g key={`group-dep-${pathInfo.id}`}>
                        {/* 클릭 영역 (넓은 투명 영역) */}
                        <path
                            d={pathInfo.path}
                            fill="none"
                            stroke="transparent"
                            strokeWidth={12}
                            style={{ cursor: 'pointer' }}
                            onClick={() => onDependencyClick?.(pathInfo.id)}
                            onMouseEnter={() => onDependencyHover?.(pathInfo.id)}
                            onMouseLeave={() => onDependencyHover?.(null)}
                            onContextMenu={(e) => {
                                e.preventDefault();
                                e.stopPropagation();
                                onDependencyContextMenu?.(pathInfo.id, e);
                            }}
                        />
                        {/* 실제 종속성 선 */}
                        <path
                            d={pathInfo.path}
                            fill="none"
                            stroke={strokeColor}
                            strokeWidth={strokeWidth}
                            markerEnd={markerEnd}
                            style={{
                                cursor: 'pointer',
                                                            }}
                            onClick={() => onDependencyClick?.(pathInfo.id)}
                            onMouseEnter={() => onDependencyHover?.(pathInfo.id)}
                            onMouseLeave={() => onDependencyHover?.(null)}
                            onContextMenu={(e) => {
                                e.preventDefault();
                                e.stopPropagation();
                                onDependencyContextMenu?.(pathInfo.id, e);
                            }}
                        />
                    </g>
                );
            })}
        </g>
    );
};

/**
 * Group 연결 중 프리뷰 선 컴포넌트
 */
interface GroupConnectionPreviewLineProps {
    sourceX: number;
    sourceY: number;
    targetX: number;
    targetY: number;
    isCompact?: boolean;
}

export const GroupConnectionPreviewLine: React.FC<GroupConnectionPreviewLineProps> = ({
    sourceX,
    sourceY,
    targetX,
    targetY,
    isCompact = false,
}) => {
    const STROKE = isCompact ? GANTT_STROKE_COMPACT : GANTT_STROKE;
    const markerSuffix = isCompact ? '-compact' : '';

    // 실제 종속성 선과 동일한 직각 경로 사용
    const { path } = createFSPath(sourceX, sourceY, targetX, targetY);

    return (
        <path
            d={path}
            fill="none"
            stroke={GANTT_COLORS.success}
            strokeWidth={STROKE.HOVER}
            strokeDasharray={isCompact ? '3,2' : '5,3'}
            markerEnd={`url(#dependency-arrow-connecting${markerSuffix})`}
            style={{ pointerEvents: 'none' }}
        />
    );
};
