'use client';

import React, { useRef, useEffect, useCallback, useState } from 'react';
import { addDays, format, parse, isValid } from 'date-fns';
import { Check, X } from 'lucide-react';
import { ConstructionTask, GANTT_LAYOUT } from '../types';
import { generateId } from '../utils/uuid';

const { ROW_HEIGHT } = GANTT_LAYOUT;

interface NewCPFormUnified {
    name: string;
    duration: number;
    startDate: string;
}

const getInitialForm = (): NewCPFormUnified => ({
    name: '',
    duration: 30,
    startDate: format(new Date(), 'yyyy-MM-dd'),
});

interface GanttSidebarNewCPFormUnifiedProps {
    columns: Array<{ id: string; label: string; width: number; minWidth: number }>;
    tasks: ConstructionTask[];
    onTaskCreate?: (task: Partial<ConstructionTask>) => void | Promise<void>;
    onCancel: () => void;
    isVirtualized?: boolean;
    virtualRowIndex?: number;
    dragHandleWidth?: number;
}

/**
 * 새 CP 추가 폼 컴포넌트 (UNIFIED View용)
 *
 * Unified View의 컬럼 구조(작업명, 기간, 시작일, 종료일)에 맞춘 입력 폼입니다.
 */
export const GanttSidebarNewCPFormUnified: React.FC<GanttSidebarNewCPFormUnifiedProps> = ({
    columns,
    tasks,
    onTaskCreate,
    onCancel,
    isVirtualized = false,
    virtualRowIndex,
    dragHandleWidth = 0,
}) => {
    const [form, setForm] = useState<NewCPFormUnified>(getInitialForm);
    const nameInputRef = useRef<HTMLInputElement>(null);

    // 마운트 시 초기화 및 포커스
    useEffect(() => {
        // 마지막 CP 종료일 기준으로 시작일 설정
        const cpTasks = tasks.filter(t => t.type === 'CP' && !t.parentId);
        const lastCP = cpTasks[cpTasks.length - 1];
        const startDate = lastCP ? addDays(lastCP.endDate, 1) : new Date();

        setForm({
            name: '',
            duration: 30,
            startDate: format(startDate, 'yyyy-MM-dd'),
        });

        setTimeout(() => {
            nameInputRef.current?.focus();
        }, 0);
    }, [tasks]);

    // 종료일 계산
    const endDate = React.useMemo(() => {
        const start = parse(form.startDate, 'yyyy-MM-dd', new Date());
        if (!isValid(start)) return '-';
        const end = addDays(start, Math.max(form.duration - 1, 0));
        return format(end, 'yyyy-MM-dd');
    }, [form.startDate, form.duration]);

    const handleCancel = useCallback(() => {
        setForm(getInitialForm());
        onCancel();
    }, [onCancel]);

    const handleSave = useCallback(async () => {
        if (!form.name.trim() || !onTaskCreate) return;

        try {
            const startDate = parse(form.startDate, 'yyyy-MM-dd', new Date());
            if (!isValid(startDate)) {
                alert('유효한 시작일을 입력해주세요.');
                return;
            }

            const calculatedEndDate = addDays(startDate, Math.max(form.duration - 1, 0));

            // CP의 작업일/비작업일 기본 비율 (약 3:1)
            const workDays = Math.ceil(form.duration * 0.75);
            const nonWorkDays = form.duration - workDays;

            const newCP: Partial<ConstructionTask> = {
                id: generateId(),
                parentId: null,
                wbsLevel: 1,
                type: 'CP',
                name: form.name.trim(),
                startDate,
                endDate: calculatedEndDate,
                cp: {
                    workDaysTotal: workDays,
                    nonWorkDaysTotal: nonWorkDays,
                },
                dependencies: [],
            };

            await onTaskCreate(newCP);
            setForm(getInitialForm());
            onCancel();
        } catch (error) {
            console.error('Failed to create CP:', error);
            alert('CP 생성 중 오류가 발생했습니다.');
        }
    }, [form, onTaskCreate, onCancel]);

    const handleKeyDown = useCallback((e: React.KeyboardEvent) => {
        if (e.key === 'Enter') {
            e.preventDefault();
            handleSave();
        } else if (e.key === 'Escape') {
            e.preventDefault();
            handleCancel();
        }
    }, [handleSave, handleCancel]);

    const transformStyle = isVirtualized && virtualRowIndex !== undefined
        ? {
            position: 'absolute' as const,
            top: 0,
            left: 0,
            width: '100%',
            transform: `translateY(${tasks.length * ROW_HEIGHT}px)`,
        }
        : {};

    return (
        <div
            className="box-border flex items-center border-b-2 border-vermilion/50 bg-vermilion/10 transition-colors"
            style={{
                height: ROW_HEIGHT,
                ...transformStyle,
            }}
        >
            {/* Drag Handle Spacer */}
            {dragHandleWidth > 0 && (
                <div style={{ width: dragHandleWidth }} className="shrink-0" />
            )}

            {/* CP Name Input (작업명) */}
            <div
                className="flex shrink-0 items-center overflow-hidden border-r border-vermilion/30 px-2"
                style={{ width: dragHandleWidth > 0 ? columns[0].width - dragHandleWidth : columns[0].width }}
            >
                {/* CP 배지 */}
                <span className="mr-1.5 shrink-0 rounded bg-vermilion px-1 text-[10px] font-medium text-white">
                    CP
                </span>
                <input
                    ref={nameInputRef}
                    type="text"
                    placeholder="CP명..."
                    className="w-full rounded border border-vermilion/50 bg-white px-2 py-1 text-sm text-gray-800 placeholder-gray-400 focus:border-vermilion focus:outline-none focus:ring-1 focus:ring-vermilion"
                    value={form.name}
                    onChange={(e) => setForm(prev => ({ ...prev, name: e.target.value }))}
                    onKeyDown={handleKeyDown}
                />
            </div>

            {/* Duration Input (기간) */}
            <div
                className="flex shrink-0 items-center justify-center border-r border-vermilion/30 px-1"
                style={{ width: columns[1].width }}
            >
                <input
                    type="text"
                    inputMode="numeric"
                    pattern="[0-9]*"
                    className="w-full max-w-[50px] rounded border border-vermilion/50 bg-white px-1 py-1 text-center text-xs text-gray-800 focus:border-vermilion focus:outline-none focus:ring-1 focus:ring-vermilion"
                    value={form.duration}
                    onChange={(e) => {
                        const value = e.target.value.replace(/[^0-9]/g, '');
                        const val = parseInt(value) || 1;
                        setForm(prev => ({ ...prev, duration: val }));
                    }}
                    onKeyDown={handleKeyDown}
                    title="기간 (일)"
                />
            </div>

            {/* Start Date Input (시작일) */}
            <div
                className="flex shrink-0 items-center justify-center border-r border-vermilion/30 px-1"
                style={{ width: columns[2].width }}
            >
                <input
                    type="date"
                    className="w-full rounded border border-vermilion/50 bg-white px-1 py-0.5 text-center text-xs text-gray-800 focus:border-vermilion focus:outline-none focus:ring-1 focus:ring-vermilion"
                    value={form.startDate}
                    onChange={(e) => setForm(prev => ({ ...prev, startDate: e.target.value }))}
                    onKeyDown={handleKeyDown}
                    title="시작일"
                />
            </div>

            {/* End Date Display (종료일 - 자동계산) */}
            <div
                className="flex shrink-0 items-center justify-center text-xs text-gray-600"
                style={{ width: columns[3].width }}
            >
                {endDate}
            </div>

            {/* Actions: 저장/취소 버튼 */}
            <div className="flex shrink-0 items-center justify-center gap-1 px-2">
                <button
                    onClick={handleSave}
                    disabled={!form.name.trim()}
                    className="flex items-center justify-center rounded bg-vermilion p-1.5 text-white hover:bg-vermilion/80 disabled:bg-gray-300 disabled:cursor-not-allowed transition-colors"
                    title="저장 (Enter)"
                >
                    <Check size={14} />
                </button>
                <button
                    onClick={handleCancel}
                    className="flex items-center justify-center rounded bg-gray-400 p-1.5 text-white hover:bg-gray-500 transition-colors"
                    title="취소 (Esc)"
                >
                    <X size={14} />
                </button>
            </div>
        </div>
    );
};
