'use client';

import { useState, useCallback, useRef, useEffect } from 'react';
import type { ViewMode } from '../../../types';
import { GANTT_LAYOUT } from '../../../types';

interface UseSidebarResizeOptions {
    sidebarWidth: number;
    setSidebarWidth: (width: number) => void;
    viewMode: ViewMode;
    sidebarTotalWidth: number | null;
}

export const useSidebarResize = ({
    sidebarWidth,
    setSidebarWidth,
    viewMode,
    sidebarTotalWidth,
}: UseSidebarResizeOptions) => {
    const [isResizing, setIsResizing] = useState(false);
    const isResizingRef = useRef(false);
    const mouseMoveListenerRef = useRef<((e: MouseEvent) => void) | null>(null);
    const mouseUpListenerRef = useRef<(() => void) | null>(null);

    // Cleanup on unmount
    useEffect(() => {
        return () => {
            if (mouseMoveListenerRef.current) {
                document.removeEventListener('mousemove', mouseMoveListenerRef.current);
            }
            if (mouseUpListenerRef.current) {
                document.removeEventListener('mouseup', mouseUpListenerRef.current);
            }
        };
    }, []);

    const handleResizeStart = useCallback((e: React.MouseEvent) => {
        if (e.detail >= 2) return;

        e.preventDefault();
        isResizingRef.current = true;
        setIsResizing(true);

        const startX = e.clientX;
        const startWidth = sidebarWidth;

        const handleMouseMove = (e: MouseEvent) => {
            if (!isResizingRef.current) return;
            const delta = e.clientX - startX;
            // 드래그 중에도 min/max 클램핑 적용
            const newWidth = Math.max(
                GANTT_LAYOUT.SIDEBAR_MIN_WIDTH,
                Math.min(startWidth + delta, GANTT_LAYOUT.SIDEBAR_MAX_WIDTH)
            );
            setSidebarWidth(newWidth);
        };

        const handleMouseUp = () => {
            isResizingRef.current = false;
            setIsResizing(false);
            document.removeEventListener('mousemove', handleMouseMove);
            document.removeEventListener('mouseup', handleMouseUp);
            mouseMoveListenerRef.current = null;
            mouseUpListenerRef.current = null;
        };

        mouseMoveListenerRef.current = handleMouseMove;
        mouseUpListenerRef.current = handleMouseUp;

        document.addEventListener('mousemove', handleMouseMove);
        document.addEventListener('mouseup', handleMouseUp);
    }, [sidebarWidth, setSidebarWidth]);

    const handleResizeDoubleClick = useCallback(() => {
        if (sidebarTotalWidth !== null) {
            setSidebarWidth(sidebarTotalWidth);
        } else {
            const defaultWidth = viewMode === 'MASTER'
                ? GANTT_LAYOUT.SIDEBAR_MASTER_WIDTH
                : GANTT_LAYOUT.SIDEBAR_DETAIL_WIDTH;
            setSidebarWidth(defaultWidth);
        }
    }, [sidebarTotalWidth, setSidebarWidth, viewMode]);

    return {
        isResizing,
        handleResizeStart,
        handleResizeDoubleClick,
    };
};
