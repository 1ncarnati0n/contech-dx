'use client';

import React, { useMemo } from 'react';
import { differenceInDays } from 'date-fns';
import { GANTT_LAYOUT, GANTT_COLORS, GANTT_ANCHOR, GANTT_DRAG, GANTT_STROKE, GANTT_STROKE_COMPACT, GANTT_ANCHOR_COMPACT } from '../../types';
import type { ConstructionTask, AnchorDependency, CalendarSettings } from '../../types';
import { workingDayToCalendarOffset } from './AnchorPoints';

/** 행 데이터 타입 (동적 높이 계산용) */
interface RowData {
    index: number;
    start: number;
    size: number;
    key: string | number;
}

interface DependencyLinesProps {
    tasks: ConstructionTask[];
    dependencies: AnchorDependency[];
    minDate: Date;
    pixelsPerDay: number;
    selectedDepId?: string | null;
    hoveredDepId?: string | null;
    onDependencyClick?: (depId: string) => void;
    onDependencyHover?: (depId: string | null) => void;
    holidays?: Date[];
    calendarSettings?: CalendarSettings;
    /** 드래그 중인 태스크의 델타 일수를 반환하는 함수 */
    getTaskDeltaDays?: (taskId: string) => number;
    /** Y축 오프셋 (기본값: MILESTONE_LANE_HEIGHT) */
    offsetY?: number;
    /** 행 데이터 (동적 높이 계산용) */
    rowData?: RowData[];
    /** Compact 모드 바 높이 */
    effectiveBarHeight?: number;
    /** Compact 모드 여부 */
    isCompact?: boolean;
}

interface DependencyPathInfo {
    id: string;
    path: string;
    sourceX: number;
    sourceY: number;
    targetX: number;
    targetY: number;
}

const { ROW_HEIGHT, BAR_HEIGHT } = GANTT_LAYOUT;

/**
 * 앵커 좌표 계산 (작업일 기준 dayIndex → 달력일 변환)
 * @param deltaDays 드래그 중인 경우 적용할 델타 일수 (기본값 0)
 * @param offsetY Y축 시작 오프셋
 * @param rowData 동적 행 높이 데이터 (Compact 모드 지원)
 * @param effectiveBarHeight Compact 모드 바 높이
 */
const getAnchorCoords = (
    task: ConstructionTask,
    workingDayIndex: number,
    rowIndex: number,
    minDate: Date,
    pixelsPerDay: number,
    holidays: Date[] = [],
    calendarSettings?: CalendarSettings,
    deltaDays: number = 0,
    offsetY: number = GANTT_LAYOUT.MILESTONE_LANE_HEIGHT,
    rowData?: RowData[],
    effectiveBarHeight: number = BAR_HEIGHT
): { x: number; y: number } => {
    const startOffset = differenceInDays(task.startDate, minDate) + deltaDays;
    const calendarOffset = workingDayToCalendarOffset(task, workingDayIndex, holidays, calendarSettings);
    const x = (startOffset + calendarOffset) * pixelsPerDay;

    // 동적 높이 계산 (Compact 모드 지원)
    // GROUP 행은 항상 기본 높이 사용
    // 안전한 조회: 배열 인덱스 대신 index 필드로 검색
    const isGroup = task.type === 'GROUP';
    const rowInfo = rowData?.find(r => r.index === rowIndex);
    const rowStart = rowInfo?.start ?? (rowIndex * ROW_HEIGHT);
    const rowHeight = isGroup ? ROW_HEIGHT : (rowInfo?.size ?? ROW_HEIGHT);
    const barHeight = isGroup ? BAR_HEIGHT : effectiveBarHeight;

    const y = offsetY + rowStart + (rowHeight - barHeight) / 2 + barHeight;

    return { x, y };
};

/**
 * 종속성 경로 생성 (수직 → 수평 → 수직 직각 경로)
 */
const createDependencyPath = (
    sourceX: number,
    sourceY: number,
    targetX: number,
    targetY: number
): string => {
    const startY = sourceY + GANTT_ANCHOR.RADIUS;
    const endY = targetY - GANTT_ANCHOR.RADIUS;
    const verticalDiff = targetY - sourceY;

    if (Math.abs(verticalDiff) < 5) {
        // 같은 행 - 수평선
        const endX = targetX - GANTT_ANCHOR.RADIUS;
        return `M ${sourceX} ${startY} L ${endX} ${sourceY}`;
    } else if (verticalDiff > 0) {
        // 아래로 가는 경우
        const midY = startY + (endY - startY) / 2;
        return `M ${sourceX} ${startY} V ${midY} H ${targetX} V ${endY}`;
    } else {
        // 위로 가는 경우
        const dropDown = GANTT_DRAG.DROP_DOWN_OFFSET;
        const midX = Math.min(sourceX, targetX) - GANTT_DRAG.PATH_OFFSET_X;
        return `M ${sourceX} ${startY} V ${startY + dropDown} H ${midX} V ${endY - dropDown} H ${targetX} V ${endY}`;
    }
};

/**
 * 종속성 선 렌더링 컴포넌트
 */
export const DependencyLines: React.FC<DependencyLinesProps> = ({
    tasks,
    dependencies,
    minDate,
    pixelsPerDay,
    selectedDepId,
    hoveredDepId,
    onDependencyClick,
    onDependencyHover,
    holidays,
    calendarSettings,
    getTaskDeltaDays,
    offsetY,
    rowData,
    effectiveBarHeight = BAR_HEIGHT,
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

    // 태스크 ID → 태스크 맵
    const taskMap = useMemo(() => {
        const map = new Map<string, ConstructionTask>();
        tasks.forEach((task) => {
            map.set(task.id, task);
        });
        return map;
    }, [tasks]);

    // 종속성 경로 계산
    const dependencyPaths = useMemo((): DependencyPathInfo[] => {
        return dependencies
            .map((dep) => {
                const sourceTask = taskMap.get(dep.sourceTaskId);
                const targetTask = taskMap.get(dep.targetTaskId);
                const sourceIndex = taskIndexMap.get(dep.sourceTaskId);
                const targetIndex = taskIndexMap.get(dep.targetTaskId);

                if (
                    !sourceTask ||
                    !targetTask ||
                    sourceIndex === undefined ||
                    targetIndex === undefined
                ) {
                    return null;
                }

                // 드래그 중인 태스크의 델타 일수 가져오기
                const sourceDelta = getTaskDeltaDays?.(dep.sourceTaskId) ?? 0;
                const targetDelta = getTaskDeltaDays?.(dep.targetTaskId) ?? 0;

                // dayIndex 기반 좌표 계산 (휴일 보정 + 드래그 델타 포함)
                const sourceCoords = getAnchorCoords(
                    sourceTask,
                    dep.sourceDayIndex,
                    sourceIndex,
                    minDate,
                    pixelsPerDay,
                    holidays,
                    calendarSettings,
                    sourceDelta,
                    offsetY,
                    rowData,
                    effectiveBarHeight
                );
                const targetCoords = getAnchorCoords(
                    targetTask,
                    dep.targetDayIndex,
                    targetIndex,
                    minDate,
                    pixelsPerDay,
                    holidays,
                    calendarSettings,
                    targetDelta,
                    offsetY,
                    rowData,
                    effectiveBarHeight
                );

                const path = createDependencyPath(
                    sourceCoords.x,
                    sourceCoords.y,
                    targetCoords.x,
                    targetCoords.y
                );

                return {
                    id: dep.id,
                    path,
                    sourceX: sourceCoords.x,
                    sourceY: sourceCoords.y,
                    targetX: targetCoords.x,
                    targetY: targetCoords.y,
                };
            })
            .filter((p): p is DependencyPathInfo => p !== null);
    }, [dependencies, taskMap, taskIndexMap, minDate, pixelsPerDay, holidays, calendarSettings, getTaskDeltaDays, offsetY, rowData, effectiveBarHeight]);

    // 드래그 중인 종속성인지 확인하는 헬퍼 함수
    const isDependencyDragging = (depId: string): boolean => {
        const dep = dependencies.find(d => d.id === depId);
        if (!dep || !getTaskDeltaDays) return false;
        const sourceDelta = getTaskDeltaDays(dep.sourceTaskId);
        const targetDelta = getTaskDeltaDays(dep.targetTaskId);
        return sourceDelta !== 0 || targetDelta !== 0;
    };

    return (
        <g className="dependency-lines">
            {dependencyPaths.map((pathInfo) => {
                const isSelected = selectedDepId === pathInfo.id;
                const isHovered = hoveredDepId === pathInfo.id;
                const isDragging = isDependencyDragging(pathInfo.id);

                // Compact 모드에 따른 마커 접미사
                const markerSuffix = isCompact ? '-compact' : '';

                let strokeColor: string = GANTT_COLORS.textPrimary; // 기본 색상
                let markerEnd = `url(#dependency-arrow${markerSuffix})`;
                let strokeWidth: number = STROKE.DEFAULT;
                let strokeDasharray: string | undefined = undefined;

                if (isDragging) {
                    // 드래그 중: 초록색 강조 + 두꺼운 선
                    strokeColor = GANTT_COLORS.success;
                    markerEnd = `url(#dependency-arrow-connecting${markerSuffix})`;
                    strokeWidth = STROKE.SELECTED;
                } else if (isSelected) {
                    strokeColor = GANTT_COLORS.focus; // 선택됨: 포커스 색상
                    markerEnd = `url(#dependency-arrow-selected${markerSuffix})`;
                    strokeWidth = STROKE.SELECTED;
                } else if (isHovered) {
                    strokeColor = GANTT_COLORS.textPrimary; // 호버: 진한 색상
                    markerEnd = `url(#dependency-arrow-hover${markerSuffix})`;
                    strokeWidth = STROKE.HOVER;
                }

                return (
                    <g key={`dep-${pathInfo.id}`}>
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
                        />
                        {/* 실제 종속성 선 */}
                        <path
                            d={pathInfo.path}
                            fill="none"
                            stroke={strokeColor}
                            strokeWidth={strokeWidth}
                            strokeDasharray={strokeDasharray}
                            markerEnd={markerEnd}
                            style={{
                                cursor: 'pointer',
                                transition: isDragging ? 'none' : 'stroke 0.15s, stroke-width 0.15s',
                            }}
                            onClick={() => onDependencyClick?.(pathInfo.id)}
                            onMouseEnter={() => onDependencyHover?.(pathInfo.id)}
                            onMouseLeave={() => onDependencyHover?.(null)}
                        />
                    </g>
                );
            })}
        </g>
    );
};

/**
 * 연결 중 프리뷰 선 컴포넌트
 */
interface ConnectionPreviewLineProps {
    sourceX: number;
    sourceY: number;
    targetX: number;
    targetY: number;
    /** Compact 모드 여부 */
    isCompact?: boolean;
}

export const ConnectionPreviewLine: React.FC<ConnectionPreviewLineProps> = ({
    sourceX,
    sourceY,
    targetX,
    targetY,
    isCompact = false,
}) => {
    const STROKE = isCompact ? GANTT_STROKE_COMPACT : GANTT_STROKE;
    const ANCHOR = isCompact ? GANTT_ANCHOR_COMPACT : GANTT_ANCHOR;
    const markerSuffix = isCompact ? '-compact' : '';

    return (
        <line
            x1={sourceX}
            y1={sourceY + ANCHOR.RADIUS}
            x2={targetX}
            y2={targetY + ANCHOR.RADIUS}
            stroke={GANTT_COLORS.success}
            strokeWidth={STROKE.HOVER}
            strokeDasharray={isCompact ? '3,2' : '5,3'}
            markerEnd={`url(#dependency-arrow-connecting${markerSuffix})`}
            style={{ pointerEvents: 'none' }}
        />
    );
};

/**
 * 태스크 바 내 앵커 연결선 컴포넌트
 * - 들어오는 종속성 끝점 → 나가는 종속성 시작점을 연결
 * - 바 하단을 따라 수평선으로 표시
 */
interface InBarConnectionLinesProps {
    tasks: ConstructionTask[];
    dependencies: AnchorDependency[];
    minDate: Date;
    pixelsPerDay: number;
    holidays?: Date[];
    calendarSettings?: CalendarSettings;
    /** 드래그 중인 태스크의 델타 일수를 반환하는 함수 */
    getTaskDeltaDays?: (taskId: string) => number;
    /** Y축 오프셋 (기본값: MILESTONE_LANE_HEIGHT) */
    offsetY?: number;
    /** 행 데이터 (동적 높이 계산용) */
    rowData?: RowData[];
    /** Compact 모드 바 높이 */
    effectiveBarHeight?: number;
    /** Compact 모드 여부 */
    isCompact?: boolean;
}

export const InBarConnectionLines: React.FC<InBarConnectionLinesProps> = ({
    tasks,
    dependencies,
    minDate,
    pixelsPerDay,
    holidays,
    calendarSettings,
    getTaskDeltaDays,
    offsetY,
    rowData,
    effectiveBarHeight = BAR_HEIGHT,
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

    // 태스크별 바 내 연결선 계산
    const inBarConnections = useMemo(() => {
        const connections: Array<{
            taskId: string;
            fromX: number;
            toX: number;
            y: number;
        }> = [];

        tasks.forEach((task) => {
            const rowIndex = taskIndexMap.get(task.id);
            if (rowIndex === undefined) return;

            // 드래그 중인 태스크의 델타 일수 가져오기
            const deltaDays = getTaskDeltaDays?.(task.id) ?? 0;

            // 이 태스크로 들어오는 종속성의 targetDayIndex 찾기
            const incomingAnchors = dependencies
                .filter((dep) => dep.targetTaskId === task.id)
                .map((dep) => dep.targetDayIndex);

            // 이 태스크에서 나가는 종속성의 sourceDayIndex 찾기
            const outgoingAnchors = dependencies
                .filter((dep) => dep.sourceTaskId === task.id)
                .map((dep) => dep.sourceDayIndex);

            // 연결이 필요한 쌍 찾기 (들어오는 앵커 → 나가는 앵커)
            incomingAnchors.forEach((inDay) => {
                outgoingAnchors.forEach((outDay) => {
                    if (inDay < outDay) {
                        const fromCoords = getAnchorCoords(
                            task,
                            inDay,
                            rowIndex,
                            minDate,
                            pixelsPerDay,
                            holidays,
                            calendarSettings,
                            deltaDays,
                            offsetY,
                            rowData,
                            effectiveBarHeight
                        );
                        const toCoords = getAnchorCoords(
                            task,
                            outDay,
                            rowIndex,
                            minDate,
                            pixelsPerDay,
                            holidays,
                            calendarSettings,
                            deltaDays,
                            offsetY,
                            rowData,
                            effectiveBarHeight
                        );

                        connections.push({
                            taskId: task.id,
                            fromX: fromCoords.x,
                            toX: toCoords.x,
                            y: fromCoords.y, // 같은 행이므로 Y는 동일
                        });
                    }
                });
            });
        });

        return connections;
    }, [tasks, dependencies, taskIndexMap, minDate, pixelsPerDay, holidays, calendarSettings, getTaskDeltaDays, offsetY, rowData, effectiveBarHeight]);

    if (inBarConnections.length === 0) return null;

    return (
        <g className="in-bar-connection-lines">
            {inBarConnections.map((conn, idx) => (
                <line
                    key={`in-bar-${conn.taskId}-${idx}`}
                    x1={conn.fromX}
                    y1={conn.y}
                    x2={conn.toX}
                    y2={conn.y}
                    stroke={GANTT_COLORS.textPrimary}
                    strokeWidth={STROKE.DEFAULT}
                    style={{ pointerEvents: 'none' }}
                />
            ))}
        </g>
    );
};
