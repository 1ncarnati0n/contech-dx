'use client';

import { memo } from 'react';
import type { ColumnConfig } from '../../types';
import { GANTT_LAYOUT } from '../../types';

const { MILESTONE_LANE_HEIGHT } = GANTT_LAYOUT;

// ============================================
// MilestoneLaneSpacer Component
// ============================================
// 마일스톤 레인 스페이서 (Header/Full 렌더 모드 공통)

interface MilestoneLaneSpacerProps {
    columns: ColumnConfig[];
    dragHandleWidth: number;
    totalWidth: number;
}

export const MilestoneLaneSpacer = memo(({
    columns,
    dragHandleWidth,
    totalWidth,
}: MilestoneLaneSpacerProps) => (
    <div
        className="flex items-center"
        style={{
            height: MILESTONE_LANE_HEIGHT,
            minWidth: totalWidth,
            backgroundColor: 'var(--gantt-bg-secondary)',
            borderBottom: '1px solid var(--gantt-border-light)',
        }}
    >
        {/* Drag Handle Spacer - 바디와 컬럼폭 동기화 */}
        {dragHandleWidth > 0 && (
            <div className="shrink-0" style={{ width: dragHandleWidth }} />
        )}
        {columns.map((col, idx) => (
            <div
                key={col.id}
                className="flex shrink-0 items-center justify-center text-xs"
                style={{
                    width: idx === 0 && dragHandleWidth > 0 ? col.width - dragHandleWidth : col.width,
                    color: 'var(--gantt-text-primary)',
                    borderRight: '1px solid var(--gantt-border-light)',
                }}
            >
                {idx === 0 && 'Milestone'}
            </div>
        ))}
    </div>
));

MilestoneLaneSpacer.displayName = 'MilestoneLaneSpacer';
