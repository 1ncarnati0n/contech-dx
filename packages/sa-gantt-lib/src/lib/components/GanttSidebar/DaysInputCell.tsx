'use client';

import { GANTT_LAYOUT } from '../../types';
import type { DaysInputCellProps } from './types';

const { ROW_HEIGHT } = GANTT_LAYOUT;

const fieldConfig = {
    indirectWorkDaysPre: {
        localKey: 'pre',
        bgColor: 'var(--gantt-blue)',
        focusBorderColor: 'var(--gantt-blue)',
        title: '선 간접작업일 (바 드래그로도 조절 가능, 0.1 단위)',
    },
    netWorkDays: {
        localKey: 'net',
        bgColor: 'var(--gantt-red)',
        focusBorderColor: 'var(--gantt-red)',
        title: '순작업일 (0.1 단위)',
    },
    indirectWorkDaysPost: {
        localKey: 'post',
        bgColor: 'var(--gantt-blue)',
        focusBorderColor: 'var(--gantt-blue)',
        title: '후 간접작업일 (바 드래그로도 조절 가능, 0.1 단위)',
    },
};

export const DaysInputCell: React.FC<DaysInputCellProps> = ({
    task,
    field,
    editingDays,
    setEditingDays,
    onDurationChange,
    width,
    rowHeight,
}) => {
    const effectiveRowHeight = rowHeight ?? ROW_HEIGHT;
    const isCompact = effectiveRowHeight < ROW_HEIGHT;
    if (!task.task) {
        return (
            <div
                className="flex shrink-0 items-center justify-center px-1"
                style={{ width, borderRight: '1px solid var(--gantt-border-light)' }}
            >
                <span className="text-xs" style={{ color: 'var(--gantt-text-muted)' }}>-</span>
            </div>
        );
    }

    const config = fieldConfig[field];
    const value = task.task[field];
    const isEditing = editingDays?.taskId === task.id && editingDays?.field === config.localKey;

    return (
        <div
            className="flex shrink-0 items-center justify-center px-1"
            style={{ width, borderRight: '1px solid var(--gantt-border-light)' }}
        >
            <input
                type="text"
                inputMode="decimal"
                pattern="[0-9]*\.?[0-9]?"
                className={`w-full rounded text-center focus:outline-none focus:ring-1 ${
                    isCompact
                        ? 'max-w-[32px] px-0.5 py-0 text-[9px]'
                        : 'max-w-[45px] px-1 py-1 text-xs'
                }`}
                style={{
                    backgroundColor: `color-mix(in srgb, ${config.bgColor} 15%, var(--gantt-bg-primary))`,
                    color: 'var(--gantt-text-primary)',
                    border: `1px solid var(--gantt-border)`,
                    height: isCompact ? effectiveRowHeight - 2 : 'auto',
                    lineHeight: isCompact ? `${effectiveRowHeight - 4}px` : 'normal',
                }}
                value={isEditing ? editingDays.value : value}
                onFocus={() => setEditingDays({ taskId: task.id, field: config.localKey, value: String(value) })}
                onChange={(e) => {
                    const newValue = e.target.value.replace(/[^0-9.]/g, '');
                    setEditingDays({ taskId: task.id, field: config.localKey, value: newValue });
                }}
                onBlur={() => {
                    if (isEditing) {
                        const parsed = parseFloat(editingDays.value) || 0;
                        const val = Math.round(parsed * 10) / 10;
                        onDurationChange(task, field, val);
                        setEditingDays(null);
                    }
                }}
                onKeyDown={(e) => {
                    if (e.key === '-' || e.key === 'e' || e.key === '+') {
                        e.preventDefault();
                    }
                    if (e.key === 'Enter') {
                        (e.target as HTMLInputElement).blur();
                    }
                }}
                title={config.title}
            />
        </div>
    );
};
