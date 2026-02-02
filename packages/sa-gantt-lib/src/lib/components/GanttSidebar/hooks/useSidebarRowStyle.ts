'use client';

import { useMemo } from 'react';
import { GANTT_LAYOUT, GANTT_COLORS } from '../../../types';
import type { ConstructionTask, ViewMode } from '../../../types';

const { ROW_HEIGHT, GROUP_ROW_HEIGHT_COMPACT } = GANTT_LAYOUT;

export interface RowStyleOptions {
    task: ConstructionTask;
    viewMode: ViewMode;
    isDragging: boolean;
    isDragOver: boolean;
    dragOverPosition?: 'before' | 'after' | 'into' | null;
    isFocused: boolean;
    isSelected: boolean;
    isBlock: boolean;
    isCP: boolean;
    isGroup: boolean;
    isVirtualized: boolean;
    rowStart: number;
    rowHeight?: number;
}

export interface RowStyleResult {
    style: React.CSSProperties;
    effectiveRowHeight: number;
}

/**
 * SidebarRow 스타일 계산 훅
 *
 * 모든 뷰 모드에서 공통으로 사용되는 행 스타일을 계산합니다.
 */
export const useSidebarRowStyle = ({
    viewMode,
    isDragging,
    isDragOver,
    dragOverPosition,
    isFocused,
    isSelected,
    isBlock,
    isCP,
    isGroup,
    isVirtualized,
    rowStart,
    rowHeight,
}: RowStyleOptions): RowStyleResult => {
    // 행 높이 계산
    const effectiveRowHeight = useMemo(() => {
        const isCompact = (rowHeight ?? ROW_HEIGHT) < ROW_HEIGHT;

        if (viewMode === 'MASTER') {
            return ROW_HEIGHT;
        }

        // DETAIL/UNIFIED: Block, CP는 고정 높이, Group은 컴팩트 시 21px, Task는 rowHeight
        if (isBlock || isCP) {
            return ROW_HEIGHT;
        }
        if (isGroup) {
            return isCompact ? GROUP_ROW_HEIGHT_COMPACT : ROW_HEIGHT;
        }
        return rowHeight ?? ROW_HEIGHT;
    }, [viewMode, isBlock, isCP, isGroup, rowHeight]);

    // 행 스타일 계산
    const style = useMemo(() => {
        let backgroundColor = 'var(--gantt-bg-primary)';
        let borderColor = 'var(--gantt-border-light)';
        let boxShadow = 'none';

        if (isDragging) {
            backgroundColor = 'var(--gantt-bg-selected)';
        } else if (isDragOver) {
            if (dragOverPosition === 'into') {
                // 'into' 인디케이터: UNIFIED에서만 다른 스타일
                if (viewMode === 'UNIFIED') {
                    backgroundColor = 'rgba(59, 130, 246, 0.1)';
                    boxShadow = 'inset 0 0 0 2px var(--gantt-focus)';
                } else {
                    backgroundColor = 'var(--gantt-bg-selected)';
                    borderColor = 'var(--gantt-focus)';
                    boxShadow = 'inset 0 0 0 2px var(--gantt-focus)';
                }
            }
        } else if (isFocused) {
            backgroundColor = 'var(--gantt-bg-selected)';
            boxShadow = 'inset 0 0 0 2px var(--gantt-focus)';
        } else if (isSelected) {
            backgroundColor = 'var(--gantt-bg-selected)';
            boxShadow = 'inset 0 0 0 2px rgba(59, 130, 246, 0.3)';
        } else if (isBlock) {
            // BLOCK 행 (최상위 계층) - UNIFIED에서만 tertiary 사용
            backgroundColor = viewMode === 'UNIFIED'
                ? 'var(--gantt-bg-tertiary)'
                : 'var(--gantt-bg-secondary)';
        } else if (isCP || isGroup) {
            backgroundColor = 'var(--gantt-bg-secondary)';
        }

        const baseStyle: React.CSSProperties = {
            height: effectiveRowHeight,
            backgroundColor,
            borderBottom: `1px solid ${borderColor}`,
            boxShadow,
            opacity: isDragging ? 0.5 : 1,
        };

        // MASTER/DETAIL: before 위치에 borderTop 사용
        if (viewMode !== 'UNIFIED' && isDragOver && dragOverPosition === 'before') {
            baseStyle.borderTop = '2px solid var(--gantt-focus)';
        }

        // UNIFIED: position relative for drop indicator
        if (viewMode === 'UNIFIED') {
            baseStyle.position = 'relative';
        }

        // 가상화 스타일
        if (isVirtualized) {
            return {
                ...baseStyle,
                position: 'absolute' as const,
                top: 0,
                left: 0,
                width: '100%',
                transform: `translateY(${rowStart}px)`,
            };
        }

        return baseStyle;
    }, [
        viewMode,
        isDragging,
        isDragOver,
        dragOverPosition,
        isFocused,
        isSelected,
        isBlock,
        isCP,
        isGroup,
        isVirtualized,
        rowStart,
        effectiveRowHeight,
    ]);

    return { style, effectiveRowHeight };
};

/**
 * 배지 스타일 계산
 */
export const getBadgeStyle = (
    isBlock: boolean,
    isCP: boolean,
    isGroup: boolean
): React.CSSProperties | null => {
    if (isBlock) {
        return {
            backgroundColor: GANTT_COLORS.badgeBlock,
            color: GANTT_COLORS.badgeBlockText,
            border: `1.5px solid ${GANTT_COLORS.badgeBlockBorder}`,
        };
    }
    if (isCP) {
        return {
            backgroundColor: GANTT_COLORS.vermilion,
            color: 'white',
        };
    }
    if (isGroup) {
        return {
            backgroundColor: GANTT_COLORS.badgeGroup,
            color: 'white',
        };
    }
    return null;
};

/**
 * 배지 텍스트 결정
 */
export const getBadgeText = (isBlock: boolean, isCP: boolean, isGroup: boolean): string | null => {
    if (isBlock) return 'B';
    if (isCP) return 'CP';
    if (isGroup) return 'G';
    return null;
};
