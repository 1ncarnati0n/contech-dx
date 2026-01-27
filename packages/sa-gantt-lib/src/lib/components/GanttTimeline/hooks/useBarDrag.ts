'use client';

import { useCallback, useRef, useEffect } from 'react';
import { addDays } from 'date-fns';
import { isHoliday, snapToWorkingDay, addWorkingDays } from '../../../utils/dateUtils';
import {
    calculateDragDirection,
    calculateDeltaDays,
    getDragCursor,
} from './dragUtils';
import { calculateDragResult } from './dragStrategies';
import { useDragState } from './useDragState';
import type { CalendarSettings } from '../../../types';
import type { DragType, DragInfo, BarDragResult, BarDragState, BaseDragOptions } from '../types';

// ============================================
// Hook Options
// ============================================

interface UseBarDragOptions extends BaseDragOptions {
    holidays: Date[];
    calendarSettings: CalendarSettings;
    onBarDrag?: (result: BarDragResult) => void;
}

// ============================================
// useBarDrag Hook (전략 패턴 적용)
// ============================================

export const useBarDrag = ({
    pixelsPerDay,
    holidays,
    calendarSettings,
    onBarDrag,
}: UseBarDragOptions) => {
    // 커서 cleanup ref (동적 커서 처리를 위해)
    const cleanupRef = useRef<(() => void) | null>(null);

    // ========================================
    // 공통 드래그 상태 관리 훅 사용
    // ========================================
    const { state: dragState, start, isDragging } = useDragState<BarDragState>({
        // 드래그 중 처리
        onMove: (e, state, setState) => {
            if (!onBarDrag) return;

            const deltaX = e.clientX - state.startX;
            const deltaDays = calculateDeltaDays(deltaX, pixelsPerDay);
            const direction = calculateDragDirection(deltaX);

            // 전략 패턴으로 드래그 결과 계산
            const result = calculateDragResult(
                state.dragType,
                {
                    originalStartDate: state.originalStartDate,
                    originalEndDate: state.originalEndDate,
                    originalIndirectWorkDaysPre: state.originalIndirectWorkDaysPre,
                    originalNetWorkDays: state.originalNetWorkDays,
                    originalIndirectWorkDaysPost: state.originalIndirectWorkDaysPost,
                },
                { deltaDays, direction, holidays, calendarSettings }
            );

            setState(prev => prev ? {
                ...prev,
                currentStartDate: result.currentStartDate,
                currentEndDate: result.currentEndDate,
                currentIndirectWorkDaysPre: result.currentIndirectWorkDaysPre,
                currentNetWorkDays: result.currentNetWorkDays,
                currentIndirectWorkDaysPost: result.currentIndirectWorkDaysPost,
                lastDeltaX: deltaX,
            } : null);
        },
        // 드래그 완료 처리
        onEnd: (state) => {
            if (!onBarDrag) return;

            const direction = calculateDragDirection(state.lastDeltaX);
            let finalStartDate = state.currentStartDate;
            let finalEndDate = state.currentEndDate;

            // 'move' 타입일 때 최종 휴일 회피 + 종료일 재계산
            if (state.dragType === 'move' && isHoliday(finalStartDate, holidays, calendarSettings)) {
                const snappedStart = snapToWorkingDay(finalStartDate, direction, holidays, calendarSettings);
                finalStartDate = snappedStart;

                // 종료일 재계산: 선간접 + 순작업(휴일건너뛰기) + 후간접
                let currentDate = snappedStart;
                if (state.currentIndirectWorkDaysPre > 0) {
                    currentDate = addDays(currentDate, state.currentIndirectWorkDaysPre);
                }
                const netEndDate = addWorkingDays(currentDate, state.currentNetWorkDays, holidays, calendarSettings);
                if (state.currentIndirectWorkDaysPost > 0) {
                    finalEndDate = addDays(netEndDate, state.currentIndirectWorkDaysPost);
                } else {
                    finalEndDate = netEndDate;
                }
            }

            const hasDateChange =
                finalStartDate.getTime() !== state.originalStartDate.getTime() ||
                finalEndDate.getTime() !== state.originalEndDate.getTime();
            const hasDaysChange =
                state.currentIndirectWorkDaysPre !== state.originalIndirectWorkDaysPre ||
                state.currentNetWorkDays !== state.originalNetWorkDays ||
                state.currentIndirectWorkDaysPost !== state.originalIndirectWorkDaysPost;

            if (hasDateChange || hasDaysChange) {
                onBarDrag({
                    taskId: state.taskId,
                    dragType: state.dragType,
                    newStartDate: finalStartDate,
                    newEndDate: finalEndDate,
                    newIndirectWorkDaysPre: state.currentIndirectWorkDaysPre,
                    newIndirectWorkDaysPost: state.currentIndirectWorkDaysPost,
                    newNetWorkDays: state.currentNetWorkDays,
                });
            }
        },
        // 기본 커서 (동적 커서는 별도 처리)
        cursor: 'grabbing',
    });

    // ========================================
    // 동적 커서 처리 (dragType에 따라)
    // ========================================
    useEffect(() => {
        if (dragState) {
            const cursor = getDragCursor(dragState.dragType);
            document.body.style.cursor = cursor;
        } else {
            // dragState가 null이면 커서 초기화
            document.body.style.cursor = '';
        }

        return () => {
            // cleanup: 항상 커서 초기화
            document.body.style.cursor = '';
            if (cleanupRef.current) {
                cleanupRef.current();
                cleanupRef.current = null;
            }
        };
    }, [dragState]);

    // ========================================
    // 드래그 시작
    // ========================================
    const handleMouseDown = useCallback((
        e: React.MouseEvent,
        taskId: string,
        dragType: DragType,
        taskData: {
            startDate: Date;
            endDate: Date;
            indirectWorkDaysPre: number;
            netWorkDays: number;
            indirectWorkDaysPost: number;
        }
    ) => {
        if (!onBarDrag) return;
        e.preventDefault();
        e.stopPropagation();

        start({
            taskId,
            dragType,
            startX: e.clientX,
            originalStartDate: taskData.startDate,
            originalEndDate: taskData.endDate,
            originalIndirectWorkDaysPre: taskData.indirectWorkDaysPre,
            originalNetWorkDays: taskData.netWorkDays,
            originalIndirectWorkDaysPost: taskData.indirectWorkDaysPost,
            currentStartDate: taskData.startDate,
            currentEndDate: taskData.endDate,
            currentIndirectWorkDaysPre: taskData.indirectWorkDaysPre,
            currentNetWorkDays: taskData.netWorkDays,
            currentIndirectWorkDaysPost: taskData.indirectWorkDaysPost,
            lastDeltaX: 0,
        });
    }, [onBarDrag, start]);

    // ========================================
    // 드래그 정보 조회
    // ========================================
    const getDragInfo = useCallback((taskId: string): DragInfo | null => {
        if (dragState && dragState.taskId === taskId) {
            return {
                startDate: dragState.currentStartDate,
                endDate: dragState.currentEndDate,
                indirectWorkDaysPre: dragState.currentIndirectWorkDaysPre,
                indirectWorkDaysPost: dragState.currentIndirectWorkDaysPost,
                netWorkDays: dragState.currentNetWorkDays,
            };
        }
        return null;
    }, [dragState]);

    return {
        isDragging,
        handleBarMouseDown: handleMouseDown,
        getDragInfo,
    };
};
