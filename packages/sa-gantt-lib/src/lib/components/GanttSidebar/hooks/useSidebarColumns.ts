'use client';

import { useState, useCallback, useRef, useEffect, useMemo } from 'react';
import type { ConstructionTask, ViewMode, CriticalPathSummary, ColumnConfig } from '../../../types';
import { DEFAULT_MASTER_COLUMNS, DEFAULT_DETAIL_COLUMNS, DEFAULT_UNIFIED_COLUMNS } from '../../../types';

// View mode별 기본 컬럼 설정 맵
const DEFAULT_COLUMNS_BY_VIEW: Record<ViewMode, readonly ColumnConfig[]> = {
    MASTER: DEFAULT_MASTER_COLUMNS,
    DETAIL: DEFAULT_DETAIL_COLUMNS,
    UNIFIED: DEFAULT_UNIFIED_COLUMNS,
} as const;

// View mode별 컬럼 너비 상태 타입
type ColumnWidthsByView = Record<ViewMode, number[]>;

interface UseSidebarColumnsOptions {
    viewMode: ViewMode;
    tasks: ConstructionTask[];
    allTasks: ConstructionTask[];
    activeCPId?: string | null;
    cpSummaryMap: Map<string, CriticalPathSummary>;
    onTotalWidthChange?: (width: number) => void;
    onTaskReorder?: (taskId: string, newIndex: number) => void;
}

export const useSidebarColumns = ({
    viewMode,
    tasks,
    allTasks,
    activeCPId,
    cpSummaryMap,
    onTotalWidthChange,
    onTaskReorder,
}: UseSidebarColumnsOptions) => {
    // 3개 별도 useState → 단일 객체로 통합
    const [columnWidthsByView, setColumnWidthsByView] = useState<ColumnWidthsByView>(() => ({
        MASTER: DEFAULT_MASTER_COLUMNS.map(col => col.width),
        DETAIL: DEFAULT_DETAIL_COLUMNS.map(col => col.width),
        UNIFIED: DEFAULT_UNIFIED_COLUMNS.map(col => col.width),
    }));
    const [resizingIndex, setResizingIndex] = useState<number | null>(null);
    const isResizingRef = useRef(false);

    // 뷰 모드에 따른 컬럼 선택 (맵 기반으로 단순화)
    const baseColumns = useMemo((): readonly ColumnConfig[] => {
        return DEFAULT_COLUMNS_BY_VIEW[viewMode];
    }, [viewMode]);

    // 현재 뷰 모드의 컬럼 너비
    const columnWidths = columnWidthsByView[viewMode];

    // 특정 뷰 모드의 컬럼 너비 업데이트 헬퍼
    const setColumnWidths = useCallback((updater: (prev: number[]) => number[]) => {
        setColumnWidthsByView(prev => ({
            ...prev,
            [viewMode]: updater(prev[viewMode]),
        }));
    }, [viewMode]);

    const columns = useMemo(() =>
        baseColumns.map((col, idx) => ({
            ...col,
            width: columnWidths[idx] ?? col.width,
        })),
        [baseColumns, columnWidths]
    );

    const dragHandleWidth = onTaskReorder ? 24 : 0;
    const totalWidth = columns.reduce((sum, col) => sum + col.width, 0) + dragHandleWidth;

    useEffect(() => {
        if (onTotalWidthChange) {
            onTotalWidthChange(totalWidth);
        }
    }, [totalWidth, onTotalWidthChange]);

    // 텍스트 너비 측정
    const measureTextWidth = useCallback((text: string, fontSize: number = 12, fontWeight: string = 'normal') => {
        const canvas = document.createElement('canvas');
        const context = canvas.getContext('2d');
        if (!context) return 0;
        context.font = `${fontWeight} ${fontSize}px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif`;
        return context.measureText(text).width;
    }, []);

    // 그룹 깊이 계산 (Detail View용)
    const getGroupDepth = useCallback((task: ConstructionTask): number => {
        if (!activeCPId || task.parentId === activeCPId) return 0;

        let depth = 0;
        let currentParentId = task.parentId;

        while (currentParentId && currentParentId !== activeCPId) {
            const parent = allTasks.find(t => t.id === currentParentId);
            if (parent?.type === 'GROUP') depth++;
            currentParentId = parent?.parentId || null;
        }
        return depth;
    }, [activeCPId, allTasks]);

    // 그룹 깊이 계산 (Master View용)
    // BLOCK과 GROUP 모두 계층 구조에 포함하여 indent 계산
    const getMasterGroupDepth = useCallback((task: ConstructionTask): number => {
        if (!task.parentId) return 0;

        let depth = 0;
        let currentParentId: string | null | undefined = task.parentId;

        while (currentParentId) {
            const parent = allTasks.find(t => t.id === currentParentId);
            // BLOCK과 GROUP 모두 depth에 포함
            if (parent?.type === 'BLOCK' || parent?.type === 'GROUP') depth++;
            currentParentId = parent?.parentId;
        }
        return depth;
    }, [allTasks]);

    // 그룹 깊이 계산 (Unified View용)
    // BLOCK depth 0, CP depth 1, CP 하위 항목 depth 2+
    const getUnifiedDepth = useCallback((task: ConstructionTask): number => {
        // BLOCK: 최상위 (depth 0)
        if (task.type === 'BLOCK') return 0;

        // CP: BLOCK 아래 (depth 1)
        if (task.type === 'CP') return 1;

        // GROUP: CP 하위 (depth 2부터 시작, 중첩 시 +1)
        if (task.type === 'GROUP') {
            let depth = 2;
            let currentParentId = task.parentId;

            while (currentParentId) {
                const parent = allTasks.find(t => t.id === currentParentId);
                if (!parent) break;
                // CP에 도달하면 중단
                if (parent.type === 'CP') break;
                // GROUP을 만나면 depth 추가
                if (parent.type === 'GROUP') {
                    depth++;
                }
                currentParentId = parent.parentId;
            }

            return depth;
        }

        // TASK: CP 직속이면 depth 2, GROUP 안에 있으면 +1씩 추가
        let depth = 2; // CP 아래이므로 최소 depth 2
        let currentParentId = task.parentId;

        while (currentParentId) {
            const parent = allTasks.find(t => t.id === currentParentId);
            if (!parent) break;
            // CP에 도달하면 중단
            if (parent.type === 'CP') break;
            // GROUP을 만나면 depth 추가
            if (parent.type === 'GROUP') {
                depth++;
            }
            currentParentId = parent.parentId;
        }

        return depth;
    }, [allTasks]);

    // 컬럼 내용에 맞게 최적 너비 계산
    const calculateOptimalWidth = useCallback((columnIndex: number) => {
        const minWidth = baseColumns[columnIndex].minWidth;
        const isNameColumn = columnIndex === 0;
        const basePadding = isNameColumn ? 72 : (viewMode === 'DETAIL' ? 14 : 20);

        const headerText = baseColumns[columnIndex].label;
        let maxWidth = measureTextWidth(headerText, 12, '500') + 16;

        tasks.forEach(task => {
            let cellText = '';
            let extraPadding = 0;

            if (viewMode === 'MASTER') {
                if (isNameColumn) {
                    const depth = getMasterGroupDepth(task);
                    extraPadding = depth * 12;
                }

                const cpSummary = task.type === 'CP' ? cpSummaryMap.get(task.id) : null;
                const formatNum = (n: number) => Number.isInteger(n) ? n.toString() : n.toFixed(1);
                const isGroup = task.type === 'GROUP';

                switch (columnIndex) {
                    case 0:
                        cellText = task.name;
                        break;
                    case 1:
                        cellText = isGroup ? '-' : cpSummary ? `${cpSummary.totalDays}일` : '-';
                        break;
                    case 2:
                        cellText = isGroup ? '-' : cpSummary ? `${formatNum(cpSummary.workDays)}일` : '-';
                        break;
                    case 3:
                        cellText = isGroup ? '-' : cpSummary ? `${formatNum(cpSummary.nonWorkDays)}일` : '-';
                        break;
                }
            } else if (viewMode === 'DETAIL') {
                if (isNameColumn) {
                    const depth = getGroupDepth(task);
                    extraPadding = depth * 12;
                }

                switch (columnIndex) {
                    case 0:
                        cellText = task.name;
                        break;
                    case 1:
                        cellText = task.task ? String(task.task.indirectWorkDaysPre) : '-';
                        break;
                    case 2:
                        cellText = task.task ? String(task.task.netWorkDays) : '-';
                        break;
                    case 3:
                        cellText = task.task ? String(task.task.indirectWorkDaysPost) : '-';
                        break;
                    case 4:
                        cellText = 'yyyy-MM-dd';
                        break;
                    case 5:
                        cellText = 'yyyy-MM-dd';
                        break;
                }
            } else {
                // UNIFIED View
                if (isNameColumn) {
                    const depth = getUnifiedDepth(task);
                    extraPadding = depth * 16; // UNIFIED는 16px 들여쓰기
                }

                const isGroup = task.type === 'GROUP';
                switch (columnIndex) {
                    case 0:
                        cellText = task.name;
                        break;
                    case 1:
                        // 기간
                        cellText = isGroup ? '-' : '999일';
                        break;
                    case 2:
                    case 3:
                        // 시작일/종료일
                        cellText = isGroup ? '-' : 'yyyy-MM-dd';
                        break;
                }
            }

            const fontWeight = isNameColumn ? '500' : 'normal';
            const fontSize = isNameColumn ? 14 : 12;
            const textWidth = measureTextWidth(cellText, fontSize, fontWeight) + basePadding + extraPadding;
            maxWidth = Math.max(maxWidth, textWidth);
        });

        return Math.max(minWidth, Math.ceil(maxWidth));
    }, [tasks, viewMode, baseColumns, measureTextWidth, getMasterGroupDepth, getGroupDepth, getUnifiedDepth, cpSummaryMap]);

    // 컬럼 리사이즈 핸들러
    const handleColumnResizeStart = useCallback((e: React.MouseEvent, columnIndex: number) => {
        if (e.detail >= 2) return;

        e.preventDefault();
        e.stopPropagation();
        isResizingRef.current = true;
        setResizingIndex(columnIndex);

        const startX = e.clientX;
        const startWidth = columnWidths[columnIndex];
        const minWidth = baseColumns[columnIndex].minWidth;

        const handleMouseMove = (e: MouseEvent) => {
            if (!isResizingRef.current) return;
            const delta = e.clientX - startX;
            const newWidth = Math.max(minWidth, startWidth + delta);

            setColumnWidths(prev => {
                const updated = [...prev];
                updated[columnIndex] = newWidth;
                return updated;
            });
        };

        const handleMouseUp = () => {
            isResizingRef.current = false;
            setResizingIndex(null);
            document.removeEventListener('mousemove', handleMouseMove);
            document.removeEventListener('mouseup', handleMouseUp);
        };

        document.addEventListener('mousemove', handleMouseMove);
        document.addEventListener('mouseup', handleMouseUp);
    }, [columnWidths, baseColumns, setColumnWidths]);

    // 더블클릭으로 컬럼 너비 자동 최적화
    const handleColumnResizeDoubleClick = useCallback((e: React.MouseEvent, columnIndex: number) => {
        e.preventDefault();
        e.stopPropagation();

        isResizingRef.current = false;
        setResizingIndex(null);

        const optimalWidth = calculateOptimalWidth(columnIndex);
        setColumnWidths(prev => {
            const updated = [...prev];
            updated[columnIndex] = optimalWidth;
            return updated;
        });
    }, [calculateOptimalWidth, setColumnWidths]);

    // 초기 로드 및 뷰 변경 시 컬럼 너비 자동 최적화
    const lastOptimizedKey = useRef({ master: '', detail: '', unified: '' });

    useEffect(() => {
        if (tasks.length === 0) return;

        const optimizeColumns = () => {
            const newWidths = baseColumns.map((_, idx) => calculateOptimalWidth(idx));

            // 현재 뷰 모드의 컬럼 너비만 업데이트
            setColumnWidthsByView(prev => ({
                ...prev,
                [viewMode]: newWidths,
            }));

            // 최적화 키 업데이트
            const keyMap: Record<ViewMode, string> = {
                MASTER: `${allTasks.length}-${tasks.length}-${cpSummaryMap.size}`,
                DETAIL: `${activeCPId}-${tasks.length}`,
                UNIFIED: `${allTasks.length}-${tasks.length}`,
            };
            lastOptimizedKey.current[viewMode.toLowerCase() as 'master' | 'detail' | 'unified'] = keyMap[viewMode];
        };

        if (viewMode === 'MASTER') {
            const currentKey = `${allTasks.length}-${tasks.length}-${cpSummaryMap.size}`;
            if (lastOptimizedKey.current.master !== currentKey) {
                optimizeColumns();
            }
        } else if (viewMode === 'DETAIL') {
            const currentKey = `${activeCPId}-${tasks.length}`;
            if (lastOptimizedKey.current.detail !== currentKey) {
                optimizeColumns();
            }
        } else if (viewMode === 'UNIFIED') {
            const currentKey = `${allTasks.length}-${tasks.length}`;
            if (lastOptimizedKey.current.unified !== currentKey) {
                optimizeColumns();
            }
        }
    }, [tasks, allTasks.length, viewMode, activeCPId, calculateOptimalWidth, cpSummaryMap.size, baseColumns]);

    return {
        columns,
        totalWidth,
        dragHandleWidth,
        resizingIndex,
        handleColumnResizeStart,
        handleColumnResizeDoubleClick,
        getGroupDepth,
        getMasterGroupDepth,
        getUnifiedDepth,
        calculateOptimalWidth,
    };
};
