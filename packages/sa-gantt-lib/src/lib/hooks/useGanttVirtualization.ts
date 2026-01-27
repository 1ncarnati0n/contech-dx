import { useVirtualizer, Virtualizer } from '@tanstack/react-virtual';
import { RefObject, useMemo, useCallback, useEffect } from 'react';
import { GANTT_LAYOUT, ConstructionTask } from '../types';

const { ROW_HEIGHT, ROW_HEIGHT_COMPACT, GROUP_ROW_HEIGHT_COMPACT } = GANTT_LAYOUT;

export interface UseGanttVirtualizationOptions {
    /** 스크롤 컨테이너 ref */
    containerRef: RefObject<HTMLDivElement | null>;
    /** 총 행 개수 */
    count: number;
    /** 행 높이 (기본값: GANTT_LAYOUT.ROW_HEIGHT) */
    rowHeight?: number;
    /** 오버스캔 (화면 밖에 미리 렌더링할 행 수, 기본값: 5) */
    overscan?: number;
    /** 마지막 행 아래 여백 (기본값: 50px) */
    paddingEnd?: number;
    /** 태스크 배열 (동적 행 높이 계산용) */
    tasks?: ConstructionTask[];
    /** 전체 태스크 배열 (Block 판별용, 없으면 tasks 사용) */
    allTasks?: ConstructionTask[];
}

export interface VirtualRow {
    index: number;
    start: number;
    size: number;
    key: string | number;
}

/**
 * 간트 차트용 가상화 훅
 * 
 * 대규모 공정표에서 성능 최적화를 위해 화면에 보이는 행만 렌더링합니다.
 * 
 * @example
 * ```tsx
 * const containerRef = useRef<HTMLDivElement>(null);
 * const virtualizer = useGanttVirtualization({
 *     containerRef,
 *     count: tasks.length,
 * });
 * 
 * // 가상화된 행만 렌더링
 * {virtualizer.virtualRows.map((virtualRow) => {
 *     const task = tasks[virtualRow.index];
 *     return (
 *         <div
 *             key={virtualRow.key}
 *             style={{
 *                 position: 'absolute',
 *                 top: 0,
 *                 left: 0,
 *                 width: '100%',
 *                 height: virtualRow.size,
 *                 transform: `translateY(${virtualRow.start}px)`,
 *             }}
 *         >
 *             {task.name}
 *         </div>
 *     );
 * })}
 * ```
 */
export function useGanttVirtualization({
    containerRef,
    count,
    rowHeight = ROW_HEIGHT,
    overscan = 5,
    paddingEnd = 50,
    tasks,
    allTasks,
}: UseGanttVirtualizationOptions) {
    // Task ID → Task 매핑 (Block 판별용)
    // allTasks가 있으면 전체 태스크로 부모 조회 가능 (Detail View에서 CP 부모 참조)
    const taskMap = useMemo(() => {
        const source = allTasks || tasks;
        if (!source) return new Map<string, ConstructionTask>();
        return new Map(source.map(t => [t.id, t]));
    }, [allTasks, tasks]);

    // 동적 행 높이 계산 함수
    // CP/Block: 항상 30px, Group(CP 하위): 컴팩트 모드에서 21px, TASK: 컴팩트 모드에서 12px
    const isCompact = rowHeight === ROW_HEIGHT_COMPACT;
    const getItemSize = useCallback((index: number) => {
        if (!tasks || !tasks[index]) {
            return rowHeight;
        }
        const task = tasks[index];

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
        return rowHeight;
    }, [tasks, rowHeight, taskMap, isCompact]);

    const rowVirtualizer = useVirtualizer({
        count,
        getScrollElement: () => containerRef.current,
        estimateSize: getItemSize,
        overscan,
        paddingEnd,
    });

    // rowHeight 변경 시 virtualizer 캐시 무효화 (Compact 모드 전환 대응)
    useEffect(() => {
        rowVirtualizer.measure();
    }, [rowHeight, rowVirtualizer]);

    const virtualItems = rowVirtualizer.getVirtualItems();
    
    const virtualRows = useMemo(() => {
        return virtualItems.map((item) => ({
            index: item.index,
            start: item.start,
            size: item.size,
            key: item.index, // index는 항상 number이므로 타입 안전
        }));
    }, [virtualItems]);

    return {
        /** 가상화된 행 목록 */
        virtualRows,
        /** 전체 높이 (스크롤 영역) */
        totalHeight: rowVirtualizer.getTotalSize(),
        /** 원본 virtualizer 인스턴스 */
        virtualizer: rowVirtualizer as Virtualizer<HTMLDivElement, Element>,
    };
}
