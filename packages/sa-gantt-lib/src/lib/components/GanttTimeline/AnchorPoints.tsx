'use client';

import React, { useMemo } from 'react';
import { differenceInDays, addDays } from 'date-fns';
import { GANTT_LAYOUT, GANTT_COLORS, GANTT_ANCHOR, GANTT_ANCHOR_COMPACT } from '../../types';
import type { ConstructionTask, AnchorDependency, CalendarSettings } from '../../types';
import { getTaskCalendarSettings, getHolidayOffsetsInDateRange } from '../../utils/dateUtils';

/** 앵커 위치 정보 (dayIndex 기반) */
export interface AnchorPosition {
    taskId: string;
    dayIndex: number;         // 작업일 기준 오프셋 (휴일 제외 카운트)
    x: number;
    y: number;
}

/**
 * 순작업 구간 내 휴일의 달력 오프셋 Set 반환
 * (Pre 시작 기준으로 변환된 값)
 */
const getHolidayDayOffsets = (
    task: ConstructionTask,
    holidays: Date[] = [],
    calendarSettings?: CalendarSettings
): Set<number> => {
    if (!task.task || !calendarSettings || !holidays.length) {
        return new Set();
    }

    const { indirectWorkDaysPre, indirectWorkDaysPost } = task.task;
    const taskSettings = getTaskCalendarSettings(task.task, calendarSettings);

    const netStartDate = addDays(task.startDate, indirectWorkDaysPre);
    const netEndDate = indirectWorkDaysPost > 0
        ? addDays(task.endDate, -indirectWorkDaysPost)
        : task.endDate;

    const holidayOffsets = getHolidayOffsetsInDateRange(
        netStartDate, netEndDate, holidays, taskSettings
    );

    // Pre 시작 기준으로 오프셋 변환
    return new Set(holidayOffsets.map(h => indirectWorkDaysPre + h.offset));
};

/**
 * 순작업 기준 dayIndex → 달력일 오프셋 변환
 *
 * dayIndex 규칙 (순작업 시작일 = 0 기준):
 * - 앞 간접작업 영역: -indirectWorkDaysPre ~ -1
 * - 순작업 영역: 0 ~ netWorkDays - 1
 * - 뒤 간접작업 영역: netWorkDays ~ ...
 *
 * 반환값은 task.startDate 기준 달력일 오프셋
 */
export const workingDayToCalendarOffset = (
    task: ConstructionTask,
    netBasedDayIndex: number,
    holidays: Date[] = [],
    calendarSettings?: CalendarSettings
): number => {
    // 0.5일 처리: 정수 부분과 소수 부분 분리
    const intPart = Math.floor(netBasedDayIndex);
    const fractionalPart = netBasedDayIndex - intPart;

    if (!task.task || !calendarSettings) {
        // task.task가 없으면 순작업만 있는 것으로 처리
        // dayIndex가 그대로 달력 오프셋
        return netBasedDayIndex;
    }

    const { indirectWorkDaysPre } = task.task;
    const holidayDayOffsets = getHolidayDayOffsets(task, holidays, calendarSettings);

    // 앞 간접작업 영역 (음수 dayIndex)
    if (intPart < 0) {
        // 음수 인덱스는 앞 간접작업 영역
        // dayIndex = -3이면, 앞 간접작업의 (indirectWorkDaysPre - 3)번째 날
        // 달력 오프셋: indirectWorkDaysPre + dayIndex = indirectWorkDaysPre + (-3)
        const calendarOffset = indirectWorkDaysPre + intPart;

        // 음수 calendarOffset은 유효하지 않음 (태스크 시작일 이전)
        // 데이터 오류 감지를 위한 경고 로그
        if (calendarOffset < 0) {
            console.warn(
                `[workingDayToCalendarOffset] Invalid dayIndex ${netBasedDayIndex} ` +
                `for task ${task.id} with indirectWorkDaysPre=${indirectWorkDaysPre}. ` +
                `Clamping to 0.`
            );
        }
        return Math.max(0, calendarOffset) + fractionalPart;
    }

    // 순작업 영역 이상 (dayIndex >= 0)
    // 달력 오프셋: indirectWorkDaysPre + 휴일 보정된 순작업 오프셋

    if (holidayDayOffsets.size === 0) {
        // 휴일 없으면 단순 계산
        return indirectWorkDaysPre + netBasedDayIndex;
    }

    // 휴일이 있으면 순작업 영역 내에서 휴일 건너뛰기
    let calendarOffset = indirectWorkDaysPre;
    let workingDaysCount = 0;

    while (workingDaysCount < intPart) {
        if (!holidayDayOffsets.has(calendarOffset)) {
            workingDaysCount++;
        }
        calendarOffset++;
    }

    // 현재 위치가 휴일이면 다음 작업일로 이동
    while (holidayDayOffsets.has(calendarOffset)) {
        calendarOffset++;
    }

    return calendarOffset + fractionalPart;
};

interface AnchorPointsProps {
    task: ConstructionTask;
    rowIndex: number;
    minDate: Date;
    pixelsPerDay: number;
    connectingFrom?: { taskId: string; dayIndex: number } | null;
    dependencies: AnchorDependency[];
    onAnchorClick?: (taskId: string, dayIndex: number) => void;
    onAnchorHover?: (taskId: string, dayIndex: number | null) => void;
    holidays?: Date[];
    calendarSettings?: CalendarSettings;
    /** 종속성 드래그 중 델타 (일 단위) - 앵커 실시간 동기화용 */
    dependencyDragDeltaDays?: number;
    /** Y축 오프셋 (기본값: MILESTONE_LANE_HEIGHT) */
    offsetY?: number;
    /** 행 시작 Y 위치 (동적 높이 계산용) */
    rowStart?: number;
    /** 실제 행 높이 (동적 높이 계산용) */
    rowHeight?: number;
    /** Compact 모드 바 높이 */
    effectiveBarHeight?: number;
    /** Compact 모드 여부 */
    isCompact?: boolean;
    /** 호버 활성화 상태 (바 하단 호버 시 앵커 표시 강화) */
    isHoverActive?: boolean;
}

/**
 * 태스크 바 하단에 표시되는 앵커 포인트
 * - 모든 Day 경계에 앵커 배치 (0.5일 단위)
 * - N일 태스크 → (N * 2) + 1개 앵커
 */
export const AnchorPoints: React.FC<AnchorPointsProps> = ({
    task,
    rowIndex,
    minDate,
    pixelsPerDay,
    connectingFrom,
    dependencies,
    onAnchorClick,
    onAnchorHover,
    holidays,
    calendarSettings,
    dependencyDragDeltaDays = 0,
    offsetY = GANTT_LAYOUT.MILESTONE_LANE_HEIGHT,
    rowStart,
    rowHeight,
    effectiveBarHeight,
    isCompact = false,
    isHoverActive = false,
}) => {
    // Compact 모드에 따른 앵커 상수 선택
    const ANCHOR = isCompact ? GANTT_ANCHOR_COMPACT : GANTT_ANCHOR;
    // 앵커 위치 계산 (작업일 기준, 휴일 위치 건너뛰기)
    const anchors = useMemo((): AnchorPosition[] => {
        const startOffset = differenceInDays(task.startDate, minDate);

        // Y 좌표: 바 하단에 위치 (동적 높이 지원)
        const { ROW_HEIGHT, BAR_HEIGHT } = GANTT_LAYOUT;
        const actualRowStart = rowStart ?? (rowIndex * ROW_HEIGHT);
        const actualRowHeight = rowHeight ?? ROW_HEIGHT;
        const actualBarHeight = effectiveBarHeight ?? BAR_HEIGHT;
        const y = offsetY + actualRowStart + (actualRowHeight - actualBarHeight) / 2 + actualBarHeight;

        const result: AnchorPosition[] = [];

        if (task.task) {
            const { netWorkDays, indirectWorkDaysPre, indirectWorkDaysPost } = task.task;

            // 휴일 오프셋 계산 (순작업 구간만)
            const holidayDayOffsets = getHolidayDayOffsets(task, holidays, calendarSettings);
            const holidayCount = holidayDayOffsets.size;

            // 총 달력일 수 (휴일 포함)
            const totalCalendarDays = indirectWorkDaysPre + netWorkDays + holidayCount + indirectWorkDaysPost;
            const totalCalendarDaysInt = Math.floor(totalCalendarDays);

            // ============================================
            // 순작업 기준 dayIndex로 앵커 생성
            // - 앞 간접작업: -indirectWorkDaysPre ~ -1
            // - 순작업: 0 ~ netWorkDays (휴일 제외)
            // - 뒤 간접작업: netWorkDays + holidayCount ~ ...
            // ============================================

            // 1. 앞 간접작업 영역 앵커 (음수 dayIndex)
            // 첫날(태스크 시작점)은 제외하고, 나머지가 한 칸씩 앞으로 이동
            // i=1부터 시작 → dayIndex는 -2, -1, ... (첫 번째 dayIndex 제외)
            for (let i = 1; i < indirectWorkDaysPre; i++) {
                const calendarOffset = i - 1;  // 한 칸 앞으로 이동
                const netBasedDayIndex = i - indirectWorkDaysPre;
                result.push({
                    taskId: task.id,
                    dayIndex: netBasedDayIndex,
                    x: (startOffset + calendarOffset) * pixelsPerDay,
                    y,
                });
            }

            // 2. 순작업 영역 앵커 (0 ~ netWorkDays, 휴일 건너뛰기)
            // 순작업 앵커는 바의 실제 위치에 맞춰야 함
            let netWorkingDayIndex = 0;
            for (let calendarOffset = indirectWorkDaysPre; calendarOffset <= indirectWorkDaysPre + netWorkDays + holidayCount; calendarOffset++) {
                // 휴일이면 건너뛰기
                if (holidayDayOffsets.has(calendarOffset)) {
                    continue;
                }

                // 순작업 영역의 끝을 초과하면 종료
                if (netWorkingDayIndex > netWorkDays) {
                    break;
                }

                result.push({
                    taskId: task.id,
                    dayIndex: netWorkingDayIndex,
                    x: (startOffset + calendarOffset) * pixelsPerDay,
                    y,
                });
                netWorkingDayIndex++;
            }

            // 3. 뒤 간접작업 영역 앵커
            // 첫 앵커(순작업 마지막과 겹침)는 제거, 나머지 유지 (태스크 끝점 포함)
            const postStartCalendar = indirectWorkDaysPre + netWorkDays + holidayCount;
            for (let i = 1; i <= indirectWorkDaysPost; i++) {
                const calendarOffset = postStartCalendar + i;
                // 순작업 기준 dayIndex: netWorkDays + i
                const netBasedDayIndex = netWorkDays + i;
                result.push({
                    taskId: task.id,
                    dayIndex: netBasedDayIndex,
                    x: (startOffset + calendarOffset) * pixelsPerDay,
                    y,
                });
            }

            // 0.5일로 끝나는 경우 마지막 앵커 추가
            const fractionalPart = totalCalendarDays - totalCalendarDaysInt;
            if (fractionalPart >= 0.5) {
                const lastDayIndex = netWorkDays + indirectWorkDaysPost + 1;
                result.push({
                    taskId: task.id,
                    dayIndex: lastDayIndex,
                    x: (startOffset + totalCalendarDays) * pixelsPerDay,
                    y,
                });
            }
        } else {
            // task.task 없는 경우 (Level 1): 기존 방식
            const totalDays = differenceInDays(task.endDate, task.startDate) + 1;

            for (let dayIndex = 0; dayIndex <= Math.floor(totalDays); dayIndex++) {
                result.push({
                    taskId: task.id,
                    dayIndex,
                    x: (startOffset + dayIndex) * pixelsPerDay,
                    y,
                });
            }

            // 0.5일로 끝나는 경우 마지막 앵커 추가
            const fractionalPart = totalDays - Math.floor(totalDays);
            if (fractionalPart >= 0.5) {
                result.push({
                    taskId: task.id,
                    dayIndex: totalDays,
                    x: (startOffset + totalDays) * pixelsPerDay,
                    y,
                });
            }
        }

        // 종속성 드래그 중 앵커 위치 실시간 동기화
        if (dependencyDragDeltaDays !== 0) {
            const dragOffset = dependencyDragDeltaDays * pixelsPerDay;
            result.forEach(anchor => {
                anchor.x += dragOffset;
            });
        }

        return result;
    }, [task, rowIndex, minDate, pixelsPerDay, holidays, calendarSettings, dependencyDragDeltaDays, offsetY, rowStart, rowHeight, effectiveBarHeight]);

    // 이 태스크의 특정 dayIndex에 종속성이 연결되어 있는지 확인
    const isAnchorConnected = (dayIndex: number): boolean => {
        return dependencies.some(
            (dep) =>
                (dep.sourceTaskId === task.id && dep.sourceDayIndex === dayIndex) ||
                (dep.targetTaskId === task.id && dep.targetDayIndex === dayIndex)
        );
    };

    // 종속성 선 경로상에 있는 앵커인지 확인 (중간 앵커 비활성화)
    // 동일 task 내에서 종속성의 source와 target dayIndex 사이의 앵커들
    const connectedAnchorRanges = useMemo(() => {
        const ranges: { from: number; to: number }[] = [];

        dependencies.forEach(dep => {
            // 이 task 내에서 시작하고 끝나는 종속성 (In-bar connection)
            if (dep.sourceTaskId === task.id && dep.targetTaskId === task.id) {
                const minDay = Math.min(dep.sourceDayIndex, dep.targetDayIndex);
                const maxDay = Math.max(dep.sourceDayIndex, dep.targetDayIndex);
                ranges.push({ from: minDay, to: maxDay });
            }

            // 들어오는 종속성의 target과 나가는 종속성의 source 사이
            // (task를 통과하는 종속성 체인)
        });

        // InBarConnectionLines에서 그리는 범위도 추가
        // 들어오는 종속성(target)과 나가는 종속성(source) 사이의 연결선
        const incomingAnchors = dependencies
            .filter(dep => dep.targetTaskId === task.id)
            .map(dep => dep.targetDayIndex);
        const outgoingAnchors = dependencies
            .filter(dep => dep.sourceTaskId === task.id)
            .map(dep => dep.sourceDayIndex);

        // 연결이 필요한 쌍 찾기 (들어오는 앵커 -> 나가는 앵커)
        incomingAnchors.forEach(inDay => {
            outgoingAnchors.forEach(outDay => {
                if (inDay !== outDay) {
                    const minDay = Math.min(inDay, outDay);
                    const maxDay = Math.max(inDay, outDay);
                    ranges.push({ from: minDay, to: maxDay });
                }
            });
        });

        return ranges;
    }, [dependencies, task.id]);

    // 앵커가 종속성 경로상에 있는지 확인 (중간 지점)
    const isInDependencyPath = (dayIndex: number): boolean => {
        return connectedAnchorRanges.some(
            range => dayIndex > range.from && dayIndex < range.to
        );
    };

    // 현재 연결 시작점인지 확인
    const isConnectingFromThis = (dayIndex: number): boolean => {
        return connectingFrom?.taskId === task.id && connectingFrom?.dayIndex === dayIndex;
    };

    return (
        <g className="anchor-points">
            {anchors.map((anchorPos) => {
                const isConnectingStart = isConnectingFromThis(anchorPos.dayIndex);
                const isConnected = isAnchorConnected(anchorPos.dayIndex);
                const isPathBlocked = isInDependencyPath(anchorPos.dayIndex);
                // 연결된 앵커 또는 경로상의 앵커는 비활성화
                const isDisabled = isConnected || isPathBlocked;
                // 연결된 앵커 또는 연결 시작점(초록 점)만 표시
                const isVisible = isConnected || isConnectingStart;
                // 호버 활성화 시 숨겨진 앵커도 희미하게 표시
                const getAnchorOpacity = () => {
                    if (isVisible) return 1;
                    if (isHoverActive && !isPathBlocked) return 0.4;
                    return 0;
                };

                return (
                    <g key={`anchor-${task.id}-${anchorPos.dayIndex}`}>
                        {/* 클릭 영역 - 바 밑변 아래로만 확장 (위로 침범 방지) */}
                        <rect
                            x={anchorPos.x - GANTT_ANCHOR.HIT_AREA}
                            y={anchorPos.y}
                            width={GANTT_ANCHOR.HIT_AREA * 2}
                            height={GANTT_ANCHOR.HIT_AREA}
                            fill="transparent"
                            style={{ cursor: isDisabled ? 'default' : 'pointer' }}
                            onClick={isDisabled ? undefined : () => onAnchorClick?.(task.id, anchorPos.dayIndex)}
                            onMouseEnter={isDisabled ? undefined : () => onAnchorHover?.(task.id, anchorPos.dayIndex)}
                            onMouseLeave={isDisabled ? undefined : () => onAnchorHover?.(task.id, null)}
                            pointerEvents={isDisabled ? 'none' : 'auto'}
                        />
                        {/* 앵커 원 (조건부 표시) */}
                        <circle
                            cx={anchorPos.x}
                            cy={anchorPos.y}
                            r={isConnectingStart
                                ? ANCHOR.RADIUS_ACTIVE
                                : isConnected
                                    ? ANCHOR.RADIUS_CONNECTED
                                    : ANCHOR.RADIUS
                            }
                            fill={
                                isConnectingStart
                                    ? GANTT_COLORS.success // 연결 시작점: 초록
                                    : isConnected
                                        ? GANTT_COLORS.textPrimary // 연결됨: 검은/흰 점
                                        : isPathBlocked
                                            ? GANTT_COLORS.dependency // 경로상: 회색
                                            : GANTT_COLORS.anchorFill
                            }
                            stroke={
                                isConnectingStart
                                    ? GANTT_COLORS.success
                                    : isDisabled
                                        ? 'none' // 비활성화: 아웃라인 없음
                                        : GANTT_COLORS.anchorStroke
                            }
                            strokeWidth={isDisabled ? 0 : ANCHOR.STROKE_WIDTH}
                            opacity={getAnchorOpacity()}
                            style={{
                                cursor: isDisabled ? 'default' : 'pointer',
                                transition: 'all 0.15s ease',
                                pointerEvents: isDisabled ? 'none' : 'auto',
                            }}
                            onClick={isDisabled ? undefined : () => onAnchorClick?.(task.id, anchorPos.dayIndex)}
                            onMouseEnter={isDisabled ? undefined : () => onAnchorHover?.(task.id, anchorPos.dayIndex)}
                            onMouseLeave={isDisabled ? undefined : () => onAnchorHover?.(task.id, null)}
                        />
                    </g>
                );
            })}
        </g>
    );
};

/**
 * 앵커 위치 계산 유틸리티 함수
 * 외부에서 종속성 선 그리기에 사용
 * dayIndex는 작업일 기준, 렌더링 시 달력일로 변환
 */
export const getAnchorPosition = (
    task: ConstructionTask,
    workingDayIndex: number,
    rowIndex: number,
    minDate: Date,
    pixelsPerDay: number,
    holidays: Date[] = [],
    calendarSettings?: CalendarSettings,
    offsetY: number = GANTT_LAYOUT.MILESTONE_LANE_HEIGHT,
    rowStart?: number,
    rowHeight?: number,
    effectiveBarHeight?: number
): AnchorPosition => {
    const startOffset = differenceInDays(task.startDate, minDate);
    const calendarOffset = workingDayToCalendarOffset(task, workingDayIndex, holidays, calendarSettings);
    const x = (startOffset + calendarOffset) * pixelsPerDay;

    // Y 좌표: 동적 높이 지원
    const { ROW_HEIGHT, BAR_HEIGHT } = GANTT_LAYOUT;
    const actualRowStart = rowStart ?? (rowIndex * ROW_HEIGHT);
    const actualRowHeight = rowHeight ?? ROW_HEIGHT;
    const actualBarHeight = effectiveBarHeight ?? BAR_HEIGHT;
    const y = offsetY + actualRowStart + (actualRowHeight - actualBarHeight) / 2 + actualBarHeight;

    return {
        taskId: task.id,
        dayIndex: workingDayIndex,
        x,
        y,
    };
};
