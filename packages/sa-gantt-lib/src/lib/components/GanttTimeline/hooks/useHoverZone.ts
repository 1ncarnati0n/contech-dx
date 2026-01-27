'use client';

import { useState, useCallback } from 'react';

// ============================================
// useHoverZone Hook
// ============================================
// 태스크 바의 호버 존 감지 로직을 캡슐화
// 마우스 위치에 따라 리사이즈/이동 영역을 결정

/** 호버 존 타입 (바 내부만 감지) */
export type HoverZone = 'resize-left' | 'resize-right' | 'move' | null;

/** 호버 정보 */
export interface HoverInfo {
    zone: HoverZone;
    showLeftHandle: boolean;
    showRightHandle: boolean;
}

/** 호버 존 감지 상수 */
const HOVER_EDGE_WIDTH = 8;       // 끝단 클릭 영역 (px)
const HOVER_PROXIMITY_WIDTH = 30; // 끝단 근접 감지 영역 (px)

/**
 * 마우스 위치에 따른 호버 존 결정 (바 내부만)
 */
const getHoverZone = (
    localX: number,
    localY: number,
    barWidth: number,
    barHeight: number
): HoverInfo => {
    // 바 외부면 null
    if (localY < 0 || localY > barHeight) {
        return { zone: null, showLeftHandle: false, showRightHandle: false };
    }

    // 끝단 근접 여부 계산 (핸들 표시용)
    const showLeftHandle = localX < HOVER_PROXIMITY_WIDTH;
    const showRightHandle = localX > barWidth - HOVER_PROXIMITY_WIDTH;

    // 좌우 끝단 클릭 영역 체크 (리사이즈)
    if (localX < HOVER_EDGE_WIDTH) {
        return { zone: 'resize-left', showLeftHandle: true, showRightHandle };
    }
    if (localX > barWidth - HOVER_EDGE_WIDTH) {
        return { zone: 'resize-right', showLeftHandle, showRightHandle: true };
    }

    // 바 중앙 = 이동
    return { zone: 'move', showLeftHandle, showRightHandle };
};

/**
 * 호버 존에 따른 커서 스타일 결정
 */
export const getHoverCursor = (hoverInfo: HoverInfo | null): string => {
    if (!hoverInfo) return 'default';
    switch (hoverInfo.zone) {
        case 'resize-left':
        case 'resize-right':
            return 'ew-resize';
        case 'move':
            return 'grab';
        default:
            return 'default';
    }
};

interface UseHoverZoneOptions {
    barWidth: number;
    barHeight: number;
    isDragging: boolean;
    onMouseLeave?: () => void;
}

interface UseHoverZoneReturn {
    /** 현재 호버 정보 */
    hoverInfo: HoverInfo | null;
    /** 호버 존에 따른 커서 스타일 */
    cursor: string;
    /** 마우스 이동 핸들러 (SVGGElement용) */
    handleMouseMove: (e: React.MouseEvent<SVGGElement>) => void;
    /** 마우스 떠남 핸들러 */
    handleMouseLeave: () => void;
}

export const useHoverZone = ({
    barWidth,
    barHeight,
    isDragging,
    onMouseLeave,
}: UseHoverZoneOptions): UseHoverZoneReturn => {
    const [hoverInfo, setHoverInfo] = useState<HoverInfo | null>(null);

    const handleMouseMove = useCallback((e: React.MouseEvent<SVGGElement>) => {
        if (isDragging) return; // 드래그 중에는 호버 업데이트 안함

        const svgGroup = e.currentTarget;
        const rect = svgGroup.getBoundingClientRect();
        const localX = e.clientX - rect.left;
        const localY = e.clientY - rect.top;

        const newHoverInfo = getHoverZone(localX, localY, barWidth, barHeight);
        setHoverInfo(newHoverInfo);
    }, [barWidth, barHeight, isDragging]);

    const handleMouseLeave = useCallback(() => {
        setHoverInfo(null);
        onMouseLeave?.();
    }, [onMouseLeave]);

    const cursor = getHoverCursor(hoverInfo);

    return {
        hoverInfo,
        cursor,
        handleMouseMove,
        handleMouseLeave,
    };
};
