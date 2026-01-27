'use client';

import { useMemo, useCallback } from 'react';
import type {
    ConstructionTask,
    ViewMode,
    CalendarSettings,
    CriticalPathSummary,
} from '../../../types';
import { calculateCriticalPath } from '../../../utils/criticalPathUtils';
import { collectDescendantTasks } from '../../../utils/groupUtils';

const { ROW_HEIGHT, ROW_HEIGHT_COMPACT, GROUP_ROW_HEIGHT_COMPACT } = {
    ROW_HEIGHT: 30,
    ROW_HEIGHT_COMPACT: 12,
    GROUP_ROW_HEIGHT_COMPACT: 21,
};

// ============================================
// useSidebarData Hook
// ============================================
// 사이드바의 데이터 계산 로직을 캡슐화
// - O(1) 조회용 Map 구조
// - 동적 행 높이 계산
// - Critical Path 요약
// - 행 데이터 및 총 높이 계산

interface VirtualRow {
    index: number;
    start: number;
    size: number;
    key: string | number;
}

interface UseSidebarDataOptions {
    tasks: ConstructionTask[];
    allTasks: ConstructionTask[];
    viewMode: ViewMode;
    activeCPId: string | null | undefined;
    holidays: Date[];
    calendarSettings: CalendarSettings;
    effectiveRowHeight: number;
    virtualRows?: VirtualRow[];
}

interface UseSidebarDataReturn {
    /** Task ID → Task 매핑 (O(1) 조회) */
    taskMap: Map<string, ConstructionTask>;
    /** Parent ID → 자식 수 매핑 (canExpand 판단용) */
    childrenCountMap: Map<string, number>;
    /** CP ID → Critical Path 요약 (MASTER View용) */
    cpSummaryMap: Map<string, CriticalPathSummary>;
    /** 동적 행 높이 계산 함수 */
    getRowHeight: (task: ConstructionTask) => number;
    /** 행 데이터 (가상화/비가상화 통합) */
    rowData: VirtualRow[];
    /** 동적 총 높이 */
    dynamicTotalHeight: number;
    /** Active CP 이름 */
    activeCPName: string | undefined;
    /** Active CP의 상위 그룹 이름 */
    activeGroupName: string | undefined;
    /** 가상화 사용 여부 */
    isVirtualized: boolean;
    /** 컴팩트 모드 여부 */
    isCompact: boolean;
}

export const useSidebarData = ({
    tasks,
    allTasks,
    viewMode,
    activeCPId,
    holidays,
    calendarSettings,
    effectiveRowHeight,
    virtualRows,
}: UseSidebarDataOptions): UseSidebarDataReturn => {
    const isVirtualized = !!(virtualRows && virtualRows.length > 0);
    const isCompact = effectiveRowHeight === ROW_HEIGHT_COMPACT;

    // ========================================
    // Task ID → Task 매핑 (O(1) 조회용)
    // ========================================
    const taskMap = useMemo(() =>
        new Map(allTasks.map(t => [t.id, t])),
        [allTasks]
    );

    // ========================================
    // 동적 행 높이 계산 함수
    // ========================================
    const getRowHeight = useCallback((task: ConstructionTask): number => {
        // CP: 항상 30px
        if (task.type === 'CP') {
            return ROW_HEIGHT;
        }
        // Block/Group 판별
        if (task.type === 'GROUP') {
            const parent = task.parentId ? taskMap.get(task.parentId) : null;
            const isBlock = !parent || parent.type !== 'CP';
            // Block: 항상 30px
            if (isBlock) return ROW_HEIGHT;
            // Group (CP 하위): 컴팩트 모드에서 30% 감소
            return isCompact ? GROUP_ROW_HEIGHT_COMPACT : ROW_HEIGHT;
        }
        return effectiveRowHeight;
    }, [effectiveRowHeight, taskMap, isCompact]);

    // ========================================
    // Parent ID → 자식 수 매핑 (canExpand 판단용)
    // ========================================
    const childrenCountMap = useMemo(() => {
        const map = new Map<string, number>();
        allTasks.forEach(t => {
            if (t.parentId) {
                map.set(t.parentId, (map.get(t.parentId) || 0) + 1);
            }
        });
        return map;
    }, [allTasks]);

    // ========================================
    // CP별 Critical Path 요약 계산 (MASTER View용)
    // ========================================
    const cpSummaryMap = useMemo(() => {
        const map = new Map<string, CriticalPathSummary>();
        if (viewMode !== 'MASTER') return map;

        allTasks.forEach(task => {
            if (task.type === 'CP') {
                const childTasks = collectDescendantTasks(task.id, allTasks, { wbsLevel: 2 });
                const summary = calculateCriticalPath(
                    childTasks,
                    holidays,
                    calendarSettings
                );
                map.set(task.id, summary);
            }
        });

        return map;
    }, [viewMode, allTasks, holidays, calendarSettings]);

    // ========================================
    // 행 데이터 (비가상화 시 동적 높이 누적 계산)
    // ========================================
    const rowData = useMemo((): VirtualRow[] => {
        if (isVirtualized) {
            return virtualRows!;
        }
        // 비가상화: 각 행의 높이를 누적 계산
        let cumulativeStart = 0;
        return tasks.map((task, i) => {
            const size = getRowHeight(task);
            const row = { index: i, start: cumulativeStart, size, key: i };
            cumulativeStart += size;
            return row;
        });
    }, [isVirtualized, virtualRows, tasks, getRowHeight]);

    // ========================================
    // 동적 높이 기반 총 높이 계산
    // ========================================
    const dynamicTotalHeight = useMemo(() => {
        if (rowData.length === 0) return 100;
        const lastRow = rowData[rowData.length - 1];
        return lastRow.start + lastRow.size + 100;
    }, [rowData]);

    // ========================================
    // Active CP와 상위 그룹 정보 계산
    // ========================================
    const { activeGroupName, activeCPName } = useMemo(() => {
        if (!activeCPId) return { activeGroupName: undefined, activeCPName: undefined };

        const activeCP = allTasks.find(t => t.id === activeCPId);
        if (!activeCP) return { activeGroupName: undefined, activeCPName: undefined };

        const cpName = activeCP.name;

        // CP의 parentId로 상위 GROUP 찾기
        if (!activeCP.parentId) {
            return { activeGroupName: undefined, activeCPName: cpName };
        }

        const parentGroup = allTasks.find(t => t.id === activeCP.parentId);

        return {
            activeGroupName: parentGroup?.name,
            activeCPName: cpName,
        };
    }, [activeCPId, allTasks]);

    return {
        taskMap,
        childrenCountMap,
        cpSummaryMap,
        getRowHeight,
        rowData,
        dynamicTotalHeight,
        activeCPName,
        activeGroupName,
        isVirtualized,
        isCompact,
    };
};
