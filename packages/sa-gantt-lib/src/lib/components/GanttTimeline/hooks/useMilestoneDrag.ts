'use client';

import { useCallback } from 'react';
import { addDays } from 'date-fns';
import { dateToX } from '../../../utils/dateUtils';
import { calculateDeltaDays } from './dragUtils';
import { useDragState, updateDragState } from './useDragState';
import type { Milestone } from '../../../types';
import type { MilestoneDragState, BaseDragOptions } from '../types';

// ============================================
// Hook Options
// ============================================

interface UseMilestoneDragOptions extends BaseDragOptions {
    minDate: Date;
    milestones: Milestone[];
    onMilestoneUpdate?: (milestone: Milestone) => void;
}

// ============================================
// useMilestoneDrag Hook (리팩토링됨)
// ============================================

export const useMilestoneDrag = ({
    minDate,
    pixelsPerDay,
    milestones,
    onMilestoneUpdate,
}: UseMilestoneDragOptions) => {
    // ========================================
    // 공통 드래그 상태 관리 훅 사용
    // ========================================
    const { state: dragState, start } = useDragState<MilestoneDragState>({
        // 드래그 중 처리
        onMove: (e, state, setState) => {
            const deltaX = e.clientX - state.startX;
            const originalX = dateToX(state.originalDate, minDate, pixelsPerDay);
            const newX = Math.max(0, originalX + deltaX);

            updateDragState(setState, { currentX: newX });
        },
        // 드래그 완료 처리
        onEnd: (state) => {
            if (!onMilestoneUpdate) return;

            // currentX에서 deltaDays 계산
            const originalX = dateToX(state.originalDate, minDate, pixelsPerDay);
            const deltaX = state.currentX - originalX;
            const deltaDays = calculateDeltaDays(deltaX, pixelsPerDay);

            if (deltaDays !== 0) {
                const newDate = addDays(state.originalDate, deltaDays);
                const updatedMilestone = milestones.find(m => m.id === state.milestoneId);

                if (updatedMilestone) {
                    onMilestoneUpdate({
                        ...updatedMilestone,
                        date: newDate,
                    });
                }
            }
        },
        cursor: 'grabbing',
    });

    // ========================================
    // 드래그 시작
    // ========================================
    const handleMouseDown = useCallback((e: React.MouseEvent, milestone: Milestone) => {
        if (!onMilestoneUpdate) return;
        e.preventDefault();
        e.stopPropagation();

        const milestoneX = dateToX(milestone.date, minDate, pixelsPerDay);

        start({
            milestoneId: milestone.id,
            startX: e.clientX,
            originalDate: milestone.date,
            currentX: milestoneX,
        });
    }, [onMilestoneUpdate, minDate, pixelsPerDay, start]);

    // ========================================
    // 드래그 정보 조회
    // ========================================
    const getDragInfo = useCallback((milestoneId: string): number | undefined => {
        if (dragState?.milestoneId === milestoneId) {
            return dragState.currentX;
        }
        return undefined;
    }, [dragState]);

    const isDraggingMilestone = useCallback((milestoneId: string): boolean => {
        return dragState?.milestoneId === milestoneId;
    }, [dragState]);

    return {
        handleMilestoneMouseDown: handleMouseDown,
        getMilestoneDragX: getDragInfo,
        isMilestoneDragging: isDraggingMilestone,
    };
};
