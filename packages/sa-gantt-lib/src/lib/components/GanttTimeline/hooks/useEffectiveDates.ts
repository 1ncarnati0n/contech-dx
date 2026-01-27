'use client';

import { useMemo } from 'react';
import { addDays } from 'date-fns';
import type { DragInfo } from '../types';

// ============================================
// useEffectiveDates Hook
// ============================================
// 태스크 바의 효과적인 시작/종료 날짜 계산
// 드래그 우선순위: 개별 드래그 > 종속성 드래그 > 그룹 드래그 > 원본

interface UseEffectiveDatesOptions {
    /** 태스크 원본 시작일 */
    startDate: Date;
    /** 태스크 원본 종료일 */
    endDate: Date;
    /** 개별 드래그 정보 */
    dragInfo?: DragInfo | null;
    /** 그룹 드래그 델타 (일) */
    groupDragDeltaDays?: number;
    /** 그룹 드래그 정보 */
    groupDragInfo?: { startDate: Date; endDate: Date } | null;
    /** 종속성 드래그 델타 (일) */
    dependencyDragDeltaDays?: number;
    /** 종속성 드래그 정보 */
    dependencyDragInfo?: { startDate: Date; endDate: Date } | null;
}

interface UseEffectiveDatesReturn {
    /** 효과적인 시작일 */
    effectiveStartDate: Date;
    /** 효과적인 종료일 */
    effectiveEndDate: Date;
    /** 종속성 드래그 중 여부 */
    isDependencyDragging: boolean;
}

export const useEffectiveDates = ({
    startDate,
    endDate,
    dragInfo,
    groupDragDeltaDays = 0,
    groupDragInfo,
    dependencyDragDeltaDays = 0,
    dependencyDragInfo,
}: UseEffectiveDatesOptions): UseEffectiveDatesReturn => {
    const { effectiveStartDate, effectiveEndDate } = useMemo(() => {
        // 우선순위 1: 개별 드래그
        if (dragInfo) {
            return {
                effectiveStartDate: dragInfo.startDate,
                effectiveEndDate: dragInfo.endDate,
            };
        }

        // 우선순위 2: 종속성 드래그 정보
        if (dependencyDragInfo) {
            return {
                effectiveStartDate: dependencyDragInfo.startDate,
                effectiveEndDate: dependencyDragInfo.endDate,
            };
        }

        // 우선순위 3: 종속성 드래그 델타
        if (dependencyDragDeltaDays !== 0) {
            return {
                effectiveStartDate: addDays(startDate, dependencyDragDeltaDays),
                effectiveEndDate: addDays(endDate, dependencyDragDeltaDays),
            };
        }

        // 우선순위 4: 그룹 드래그 정보
        if (groupDragInfo) {
            return {
                effectiveStartDate: groupDragInfo.startDate,
                effectiveEndDate: groupDragInfo.endDate,
            };
        }

        // 우선순위 5: 그룹 드래그 델타
        if (groupDragDeltaDays !== 0) {
            return {
                effectiveStartDate: addDays(startDate, groupDragDeltaDays),
                effectiveEndDate: addDays(endDate, groupDragDeltaDays),
            };
        }

        // 기본: 원본 날짜
        return { effectiveStartDate: startDate, effectiveEndDate: endDate };
    }, [
        startDate,
        endDate,
        dragInfo,
        dependencyDragInfo,
        dependencyDragDeltaDays,
        groupDragInfo,
        groupDragDeltaDays,
    ]);

    const isDependencyDragging = dependencyDragDeltaDays !== 0 || !!dependencyDragInfo;

    return {
        effectiveStartDate,
        effectiveEndDate,
        isDependencyDragging,
    };
};
