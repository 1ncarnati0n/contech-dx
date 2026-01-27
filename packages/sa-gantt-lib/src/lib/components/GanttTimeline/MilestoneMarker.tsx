'use client';

import React from 'react';
import { GANTT_LAYOUT, GANTT_COLORS, Milestone } from '../../types';
import { dateToX } from '../../utils/dateUtils';
import type { MilestoneMarkerProps, MilestoneWithLayout } from './types';

const { MILESTONE_LANE_HEIGHT } = GANTT_LAYOUT;

/**
 * 마일스톤 충돌 감지 및 레벨 할당
 * - 레벨 0: 마커 왼쪽 (기본)
 * - 레벨 1: 마커 오른쪽 (왼쪽 충돌 시)
 * - 레벨 -1: 마커 아래 (왼쪽/오른쪽 모두 충돌 시)
 */
export const calculateMilestoneLabels = (
    milestones: Milestone[],
    minDate: Date,
    pixelsPerDay: number
): MilestoneWithLayout[] => {
    if (milestones.length === 0) return [];

    const LABEL_PADDING = 25;
    const CHAR_WIDTH = 14;    // 12 → 14 (한글 너비 반영)
    const MIN_GAP = 12;       // 8 → 12 (여유 간격 확보)

    const milestonesWithX = milestones.map(m => ({
        milestone: m,
        x: dateToX(m.date, minDate, pixelsPerDay),
        labelLevel: 0,
        labelWidth: m.name.length * CHAR_WIDTH + LABEL_PADDING,
    })).sort((a, b) => a.x - b.x);

    const result: MilestoneWithLayout[] = [];
    // 모든 라벨 범위를 통합 관리 (왼쪽/오른쪽 구분 없이)
    const occupiedRanges: Array<{ start: number; end: number }> = [];

    // 범위 충돌 검사 함수
    const hasCollision = (start: number, end: number): boolean => {
        return occupiedRanges.some(
            range => !(end < range.start - MIN_GAP || start > range.end + MIN_GAP)
        );
    };

    for (const item of milestonesWithX) {
        const labelWidth = item.labelWidth;

        // 왼쪽 배치 범위 계산
        const leftLabelStart = item.x - labelWidth;
        const leftLabelEnd = item.x - MIN_GAP;

        // 왼쪽 배치 시도
        if (!hasCollision(leftLabelStart, leftLabelEnd)) {
            occupiedRanges.push({ start: leftLabelStart, end: leftLabelEnd });
            result.push({
                milestone: item.milestone,
                x: item.x,
                labelLevel: 0,
            });
        } else {
            // 오른쪽 배치 범위 계산
            const rightLabelStart = item.x + MIN_GAP;
            const rightLabelEnd = item.x + labelWidth;

            // 오른쪽 배치 시도 (모든 기존 라벨과 충돌 검사)
            if (!hasCollision(rightLabelStart, rightLabelEnd)) {
                occupiedRanges.push({ start: rightLabelStart, end: rightLabelEnd });
                result.push({
                    milestone: item.milestone,
                    x: item.x,
                    labelLevel: 1,
                });
            } else {
                // 양쪽 모두 충돌 시 아래 배치
                result.push({
                    milestone: item.milestone,
                    x: item.x,
                    labelLevel: -1,
                });
            }
        }
    }

    return result;
};

/**
 * 마일스톤 마커 컴포넌트
 */
export const MilestoneMarker: React.FC<MilestoneMarkerProps> = ({
    milestone,
    x,
    labelLevel = 0,
    isDragging = false,
    dragX,
    onMouseDown,
    onDoubleClick,
    variant = 'header',
    lineHeight,
}) => {
    // milestoneType에 따른 스타일 결정
    const isDetail = milestone.milestoneType === 'DETAIL';
    const size = isDetail ? 8 : 11;  // DETAIL은 작은 마커
    const currentX = isDragging && dragX !== undefined ? dragX : x;

    const markerColor = isDetail ? GANTT_COLORS.milestoneDetail : GANTT_COLORS.milestone;
    const dragColor = isDetail ? GANTT_COLORS.milestoneDetailHover : GANTT_COLORS.focus;

    let textX: number;
    let textY: number;
    let textAnchor: 'start' | 'middle' | 'end';

    if (labelLevel === 0) {
        textX = -8;
        textY = 4;
        textAnchor = 'end';
    } else if (labelLevel === 1) {
        textX = 8;
        textY = 4;
        textAnchor = 'start';
    } else {
        // 충돌 시 마커 위에 배치 (Lane 내부 유지)
        textX = 0;
        textY = -12;
        textAnchor = 'middle';
    }

    const handleMouseDown = (e: React.MouseEvent) => {
        if (onMouseDown) {
            e.preventDefault();
            e.stopPropagation();
            onMouseDown(e, milestone);
        }
    };

    const handleDoubleClick = (e: React.MouseEvent) => {
        if (onDoubleClick) {
            e.preventDefault();
            e.stopPropagation();
            onDoubleClick(milestone);
        }
    };

    // ====================================
    // Body Variant: Timeline Body용 렌더링
    // ====================================
    if (variant === 'body') {
        const markerY = 12;  // 상단에서 약간 아래 위치
        const actualLineHeight = lineHeight || 1000;

        // Body용 라벨 위치 계산
        let bodyTextX: number;
        let bodyTextAnchor: 'start' | 'middle' | 'end';

        if (labelLevel === 0) {
            bodyTextX = -8;
            bodyTextAnchor = 'end';
        } else if (labelLevel === 1) {
            bodyTextX = 8;
            bodyTextAnchor = 'start';
        } else {
            bodyTextX = 0;
            bodyTextAnchor = 'middle';
        }

        return (
            <g
                transform={`translate(${currentX}, 0)`}
                className="pointer-events-none"
            >
                {/* 전체 높이 수직선 */}
                <line
                    x1={0}
                    y1={0}
                    x2={0}
                    y2={actualLineHeight}
                    stroke={markerColor}
                    strokeWidth={1.2}
                    strokeDasharray="4, 5"
                    className="opacity-90"
                />

                {/* 삼각형 마커 (상단) */}
                <path
                    d={`M ${-size / 2} ${markerY - size / 2} L ${size / 2} ${markerY - size / 2} L 0 ${markerY + size / 2} Z`}
                    fill={markerColor}
                    className="drop-shadow-sm"
                />

                {/* 라벨 (마커 옆) */}
                <text
                    x={bodyTextX}
                    y={markerY + 4}
                    textAnchor={bodyTextAnchor}
                    className={`select-none text-[10px] ${isDetail ? 'font-medium' : 'font-bold'}`}
                    fill={isDetail ? GANTT_COLORS.milestoneDetail : GANTT_COLORS.textSecondary}
                >
                    {milestone.name}
                </text>
            </g>
        );
    }

    // ====================================
    // Header Variant: Milestone Lane용 렌더링 (기존 로직)
    // ====================================
    // 마커가 Lane 하단에 접하도록 위치 조정
    const y = MILESTONE_LANE_HEIGHT - size / 2 - 2;

    return (
        <g
            transform={`translate(${currentX}, ${y})`}
            className={`group ${onMouseDown ? 'cursor-ew-resize' : 'cursor-pointer'} ${isDragging ? 'cursor-ew-resize' : ''}`}
            onMouseDown={handleMouseDown}
            onDoubleClick={handleDoubleClick}
        >
            {/* 대시선은 Content SVG에서 직접 렌더링됨 (index.tsx) */}

            {/* Triangle Symbol */}
            <path
                d={`M ${-size / 2} ${-size / 2} L ${size / 2} ${-size / 2} L 0 ${size / 2} Z`}
                fill={isDragging ? dragColor : markerColor}
                className="drop-shadow-sm transition-transform duration-150 group-hover:scale-[1.3]"
                style={{
                    transformOrigin: 'center',
                    transformBox: 'fill-box',
                    transform: isDragging ? 'scale(1.3)' : undefined,
                }}
            />

            {/* Hit area */}
            <circle
                cx={0}
                cy={0}
                r={size}
                fill="transparent"
                className="cursor-ew-resize"
            />

            {/* Label */}
            <text
                x={textX}
                y={textY}
                textAnchor={textAnchor}
                className={`select-none text-[11px] transition-colors ${isDetail ? 'font-medium' : 'font-bold'}`}
                fill={isDragging
                    ? (isDetail ? GANTT_COLORS.milestoneDetailHover : GANTT_COLORS.focus)
                    : (isDetail ? GANTT_COLORS.milestoneDetail : GANTT_COLORS.textSecondary)
                }
            >
                {milestone.name}
            </text>
        </g>
    );
};
