'use client';

import { useState, useCallback, useMemo } from 'react';

// ============================================
// useHoverZone Hook
// ============================================
// 태스크 바의 호버 존 감지 로직을 캡슐화
// 마우스 위치에 따라 리사이즈/이동 영역을 결정
//
// Phase 2 시각적 피드백 강화:
// - grab → grabbing 커서 전환
// - 호버 시 미세한 scale, shadow 효과를 위한 정보 제공

/** 호버 존 타입 (바 내부만 감지) */
export type HoverZone = 'resize-left' | 'resize-right' | 'move' | null;

/** 호버 정보 */
export interface HoverInfo {
    zone: HoverZone;
    showLeftHandle: boolean;
    showRightHandle: boolean;
    /** 호버 시 적용할 transform scale (미세한 확대 효과) */
    hoverScale: number;
    /** 호버 시 적용할 drop-shadow 강도 */
    hoverShadowIntensity: number;
}

/** 호버 존 감지 상수 */
const HOVER_EDGE_WIDTH = 8;       // 끝단 클릭 영역 (px)
const HOVER_PROXIMITY_WIDTH = 30; // 끝단 근접 감지 영역 (px)

/** 호버 시 scale 효과 */
const HOVER_SCALE = 1.02;
/** 호버 시 shadow 강도 */
const HOVER_SHADOW_INTENSITY = 0.3;

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
        return {
            zone: null,
            showLeftHandle: false,
            showRightHandle: false,
            hoverScale: 1,
            hoverShadowIntensity: 0,
        };
    }

    // 끝단 근접 여부 계산 (핸들 표시용)
    const showLeftHandle = localX < HOVER_PROXIMITY_WIDTH;
    const showRightHandle = localX > barWidth - HOVER_PROXIMITY_WIDTH;

    // 좌우 끝단 클릭 영역 체크 (리사이즈)
    if (localX < HOVER_EDGE_WIDTH) {
        return {
            zone: 'resize-left',
            showLeftHandle: true,
            showRightHandle,
            hoverScale: HOVER_SCALE,
            hoverShadowIntensity: HOVER_SHADOW_INTENSITY,
        };
    }
    if (localX > barWidth - HOVER_EDGE_WIDTH) {
        return {
            zone: 'resize-right',
            showLeftHandle,
            showRightHandle: true,
            hoverScale: HOVER_SCALE,
            hoverShadowIntensity: HOVER_SHADOW_INTENSITY,
        };
    }

    // 바 중앙 = 이동
    return {
        zone: 'move',
        showLeftHandle,
        showRightHandle,
        hoverScale: HOVER_SCALE,
        hoverShadowIntensity: HOVER_SHADOW_INTENSITY,
    };
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
    /** 호버 시 적용할 스타일 객체 */
    hoverStyle: React.CSSProperties;
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

    // 드래그 중일 때는 grabbing 커서, 아니면 호버 존에 따른 커서
    const cursor = isDragging ? 'grabbing' : getHoverCursor(hoverInfo);

    // 호버 시 적용할 스타일 (미세한 scale, shadow 효과)
    const hoverStyle = useMemo((): React.CSSProperties => {
        if (!hoverInfo || isDragging) {
            return {
                transform: 'scale(1)',
                filter: 'none',
                transition: 'transform 0.15s ease, filter 0.15s ease',
            };
        }

        return {
            transform: `scale(${hoverInfo.hoverScale})`,
            filter: hoverInfo.hoverShadowIntensity > 0
                ? `drop-shadow(0 2px 4px rgba(0, 0, 0, ${hoverInfo.hoverShadowIntensity}))`
                : 'none',
            transition: 'transform 0.15s ease, filter 0.15s ease',
        };
    }, [hoverInfo, isDragging]);

    return {
        hoverInfo,
        cursor,
        handleMouseMove,
        handleMouseLeave,
        hoverStyle,
    };
};
