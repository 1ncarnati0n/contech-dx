'use client';

import React from 'react';
import { GANTT_COLORS } from '../../../types';
import type { MilestoneDashLinesProps } from './types';

/**
 * MilestoneDashLinesRenderer
 *
 * 마일스톤 점선 렌더링을 담당하는 통합 컴포넌트입니다.
 * MASTER/DETAIL 마일스톤 타입에 따라 다른 색상을 적용합니다.
 */
export const MilestoneDashLinesRenderer: React.FC<MilestoneDashLinesProps> = React.memo(({
    milestoneLayouts,
    startY,
    endY,
}) => {
    return (
        <>
            {milestoneLayouts.map((layout) => {
                const isDetail = layout.milestone.milestoneType === 'DETAIL';
                const lineColor = isDetail ? GANTT_COLORS.milestoneDetail : GANTT_COLORS.milestone;

                return (
                    <line
                        key={`ms-line-${layout.milestone.id}`}
                        x1={layout.x}
                        y1={startY}
                        x2={layout.x}
                        y2={endY}
                        stroke={lineColor}
                        strokeWidth={1.2}
                        strokeDasharray="4, 5"
                        className="opacity-90 pointer-events-none"
                    />
                );
            })}
        </>
    );
});

MilestoneDashLinesRenderer.displayName = 'MilestoneDashLinesRenderer';
