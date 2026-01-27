'use client';

import { useMemo, useCallback, useState, useRef } from 'react';
import {
    ViewMode,
    ColumnConfig,
    DEFAULT_MASTER_COLUMNS,
    DEFAULT_DETAIL_COLUMNS,
    DEFAULT_UNIFIED_COLUMNS,
} from '../../../types';

// ============================================
// useSidebarColumns Hook
// ============================================
// 사이드바 컬럼 상태 및 리사이즈 로직을 캡슐화

interface UseSidebarColumnsOptions {
    viewMode: ViewMode;
    hasReorder: boolean;
}

interface UseSidebarColumnsReturn {
    /** 현재 뷰모드에 맞는 컬럼 설정 (너비 포함) */
    columns: ColumnConfig[];
    /** 드래그 핸들 너비 (reorder 가능 여부에 따라) */
    dragHandleWidth: number;
    /** 현재 리사이징 중인 컬럼 인덱스 */
    resizingIndex: number | null;
    /** 컬럼 리사이즈 시작 핸들러 */
    handleColumnResizeStart: (e: React.MouseEvent, columnIndex: number) => void;
    /** 컬럼 리사이즈 더블클릭 핸들러 */
    handleColumnResizeDoubleClick: (e: React.MouseEvent, columnIndex: number) => void;
    /** 최적 컬럼 너비 설정 콜백 */
    handleOptimalColumnWidth: (columnIndex: number, width: number) => void;
}

export const useSidebarColumns = ({
    viewMode,
    hasReorder,
}: UseSidebarColumnsOptions): UseSidebarColumnsReturn => {
    // ========================================
    // 컬럼 너비 상태 (뷰모드별 분리)
    // ========================================
    const [masterColumnWidths, setMasterColumnWidths] = useState<number[]>(
        DEFAULT_MASTER_COLUMNS.map(col => col.width)
    );
    const [detailColumnWidths, setDetailColumnWidths] = useState<number[]>(
        DEFAULT_DETAIL_COLUMNS.map(col => col.width)
    );
    const [unifiedColumnWidths, setUnifiedColumnWidths] = useState<number[]>(
        DEFAULT_UNIFIED_COLUMNS.map(col => col.width)
    );

    const [resizingIndex, setResizingIndex] = useState<number | null>(null);
    const isResizingRef = useRef(false);

    // ========================================
    // 뷰모드별 컬럼 설정 선택
    // ========================================
    const baseColumns = useMemo((): ColumnConfig[] => {
        switch (viewMode) {
            case 'MASTER': return DEFAULT_MASTER_COLUMNS;
            case 'DETAIL': return DEFAULT_DETAIL_COLUMNS;
            case 'UNIFIED': return DEFAULT_UNIFIED_COLUMNS;
        }
    }, [viewMode]);

    const columnWidths = useMemo(() => {
        switch (viewMode) {
            case 'MASTER': return masterColumnWidths;
            case 'DETAIL': return detailColumnWidths;
            case 'UNIFIED': return unifiedColumnWidths;
        }
    }, [viewMode, masterColumnWidths, detailColumnWidths, unifiedColumnWidths]);

    const setColumnWidths = useMemo(() => {
        switch (viewMode) {
            case 'MASTER': return setMasterColumnWidths;
            case 'DETAIL': return setDetailColumnWidths;
            case 'UNIFIED': return setUnifiedColumnWidths;
        }
    }, [viewMode]);

    // 최종 컬럼 설정 (너비 적용)
    const columns = useMemo(() =>
        baseColumns.map((col, idx) => ({
            ...col,
            width: columnWidths[idx] ?? col.width,
        })),
        [baseColumns, columnWidths]
    );

    const dragHandleWidth = hasReorder ? 24 : 0;

    // ========================================
    // 컬럼 리사이즈 핸들러
    // ========================================
    const handleColumnResizeStart = useCallback((e: React.MouseEvent, columnIndex: number) => {
        // 더블클릭 무시
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

    // 더블클릭 시 리사이징 상태만 초기화
    const handleColumnResizeDoubleClick = useCallback((e: React.MouseEvent, _columnIndex: number) => {
        e.preventDefault();
        e.stopPropagation();

        isResizingRef.current = false;
        setResizingIndex(null);
    }, []);

    // 최적 컬럼 너비 설정 콜백 (GanttSidebar에서 계산된 값 수신)
    const handleOptimalColumnWidth = useCallback((columnIndex: number, width: number) => {
        setColumnWidths(prev => {
            const updated = [...prev];
            updated[columnIndex] = width;
            return updated;
        });
    }, [setColumnWidths]);

    return {
        columns,
        dragHandleWidth,
        resizingIndex,
        handleColumnResizeStart,
        handleColumnResizeDoubleClick,
        handleOptimalColumnWidth,
    };
};
