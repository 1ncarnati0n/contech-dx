'use client';

import React, { useMemo } from 'react';
import { differenceInDays } from 'date-fns';
import { GANTT_COLORS, GANTT_STROKE, GANTT_STROKE_COMPACT, GANTT_SUMMARY } from '../../types';
import type { ConstructionTask, GroupDependency } from '../../types';
import { calculateGroupDateRange } from '../../utils/groupUtils';

const { BAR_HEIGHT: SUMMARY_BAR_HEIGHT } = GANTT_SUMMARY;

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
 * @returns { startX, endX, bottomY } - Group 바의 시작X, 끝X, 하단Y
 */
const getGroupBarCoords = (
    group: ConstructionTask,
    rowIndex: number,
    allTasks: ConstructionTask[],
    minDate: Date,
    pixelsPerDay: number,
    offsetY: number = 0,
    rowData?: RowData[]
): { startX: number; endX: number; bottomY: number } | null => {
    const dateRange = calculateGroupDateRange(group.id, allTasks);
    if (!dateRange) return null;

    const { startDate, totalDays } = dateRange;
    const startOffset = differenceInDays(startDate, minDate);
    const startX = startOffset * pixelsPerDay;
    const endX = (startOffset + totalDays) * pixelsPerDay;

    // Y 좌표 계산 (Group Summary Bar 하단)
    const rowInfo = rowData?.find(r => r.index === rowIndex);
    const rowStart = rowInfo?.start ?? 0;
    const rowHeight = rowInfo?.size ?? 30;
    const bottomY = offsetY + rowStart + (rowHeight - SUMMARY_BAR_HEIGHT) / 2 + SUMMARY_BAR_HEIGHT;

    return { startX, endX, bottomY };
};

/** createFSPath 반환 타입 */
interface FSPathResult {
    path: string;
    endDirection: ArrowDirection;
}

/**
 * FS 종속성 경로 생성 (선행 끝 → 후행 시작)
 * 직각 경로: 수직(아래로) → 수평 → 수직(위로/아래로)
 * 바 하단에서 시작하여 아래로 내려갔다가 수평 연결 후 타겟에 연결
 * @returns { path, endDirection } - 경로와 끝점 화살표 방향
 */
const createFSPath = (
    sourceX: number,
    sourceY: number,
    targetX: number,
    targetY: number
): FSPathResult => {
    const VERTICAL_GAP = 12; // 바 하단에서 선까지 수직 간격
    const EXTRA_DROP = 15; // 바 아래로 추가로 내려가는 거리

    // Y 차이에 따른 경로 결정
    const verticalDiff = targetY - sourceY;

    // 끝점 방향 결정 (마지막 세그먼트가 어느 방향으로 진입하는지)
    let endDirection: ArrowDirection;

    if (Math.abs(verticalDiff) < 5) {
        // 같은 행 - 단순 경로 (아래로 내려갔다가 수평 후 다시 올라옴)
        const midY = sourceY + VERTICAL_GAP + EXTRA_DROP;
        // 마지막 세그먼트가 위로 올라가므로 화살표는 위로 향해야 함
        endDirection = 'up';
        return {
            path: `M ${sourceX} ${sourceY} V ${midY} H ${targetX} V ${targetY}`,
            endDirection
        };
    }

    // 일반 FS 경로: 아래로 → 수평으로 → 위로/아래로
    // 두 바 중 더 아래쪽 바의 Y + 간격 위치를 중간 경유점으로 사용
    const midY = Math.max(sourceY, targetY) + VERTICAL_GAP + EXTRA_DROP;

    // 마지막 세그먼트 방향 결정
    if (targetY < midY) {
        // 타겟이 midY보다 위에 있으면 → 위로 올라감 → 화살표 위로
        endDirection = 'up';
    } else if (targetY > midY) {
        // 타겟이 midY보다 아래에 있으면 → 아래로 내려감 → 화살표 아래로
        endDirection = 'down';
    } else {
        // 같은 높이 → 수평으로 진입 → 기본 우향 화살표
        endDirection = 'right';
    }

    return {
        path: `M ${sourceX} ${sourceY} V ${midY} H ${targetX} V ${targetY}`,
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

                // Group 바 좌표 계산
                const sourceCoords = getGroupBarCoords(
                    sourceGroup,
                    sourceIndex,
                    allTasks,
                    minDate,
                    pixelsPerDay,
                    offsetY,
                    rowData
                );
                const targetCoords = getGroupBarCoords(
                    targetGroup,
                    targetIndex,
                    allTasks,
                    minDate,
                    pixelsPerDay,
                    offsetY,
                    rowData
                );

                if (!sourceCoords || !targetCoords) return null;

                // FS: 선행 끝점(endX) → 후행 시작점(startX), 바 하단 기준
                const { path, endDirection } = createFSPath(
                    sourceCoords.endX,
                    sourceCoords.bottomY,
                    targetCoords.startX,
                    targetCoords.bottomY
                );

                return {
                    id: dep.id,
                    path,
                    sourceX: sourceCoords.endX,
                    sourceY: sourceCoords.bottomY,
                    targetX: targetCoords.startX,
                    targetY: targetCoords.bottomY,
                    endDirection,
                };
            })
            .filter((p): p is DependencyPathInfo => p !== null);
    }, [dependencies, tasks, allTasks, taskIndexMap, minDate, pixelsPerDay, offsetY, rowData]);

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
                                transition: 'stroke 0.15s, stroke-width 0.15s',
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

    return (
        <line
            x1={sourceX}
            y1={sourceY}
            x2={targetX}
            y2={targetY}
            stroke={GANTT_COLORS.success}
            strokeWidth={STROKE.HOVER}
            strokeDasharray={isCompact ? '3,2' : '5,3'}
            markerEnd={`url(#dependency-arrow-connecting${markerSuffix})`}
            style={{ pointerEvents: 'none' }}
        />
    );
};
