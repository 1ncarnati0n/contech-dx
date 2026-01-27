'use client';

import { useState, useRef, useCallback } from 'react';
import type { ColumnConfig } from '../types';

/**
 * 컬럼 리사이저 훅
 * 
 * 사이드바 컬럼의 너비를 조절하는 기능을 제공합니다.
 */
export function useColumnResizer(
    baseColumns: ColumnConfig[],
    initialWidths?: number[]
) {
    const [columnWidths, setColumnWidths] = useState<number[]>(
        initialWidths || baseColumns.map(col => col.width)
    );
    const [resizingIndex, setResizingIndex] = useState<number | null>(null);
    const isResizingRef = useRef(false);

    const handleResizeStart = useCallback((e: React.MouseEvent, columnIndex: number) => {
        // 더블클릭 방지
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
    }, [columnWidths, baseColumns]);

    const columns = baseColumns.map((col, idx) => ({
        ...col,
        width: columnWidths[idx] ?? col.width,
    }));

    return {
        columns,
        resizingIndex,
        handleResizeStart,
        setColumnWidths,
    };
}

