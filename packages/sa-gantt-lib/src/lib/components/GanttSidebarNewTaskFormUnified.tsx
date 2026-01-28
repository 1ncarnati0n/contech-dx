'use client';

import React, { useRef, useEffect, useCallback, useState, useMemo } from 'react';
import { addDays, format, parse, isValid } from 'date-fns';
import { Check, X } from 'lucide-react';
import { ConstructionTask, GANTT_LAYOUT } from '../types';
import { generateId } from '../utils/uuid';

const { ROW_HEIGHT } = GANTT_LAYOUT;

interface NewTaskFormUnified {
    name: string;
    duration: number;
    startDate: string;
}

const getInitialForm = (): NewTaskFormUnified => ({
    name: '',
    duration: 1,
    startDate: format(new Date(), 'yyyy-MM-dd'),
});

interface GanttSidebarNewTaskFormUnifiedProps {
    columns: Array<{ id: string; label: string; width: number; minWidth: number }>;
    tasks: ConstructionTask[];
    activeCPId: string | null | undefined;
    onTaskCreate?: (task: Partial<ConstructionTask>) => void | Promise<void>;
    onCancel: () => void;
    isVirtualized?: boolean;
    virtualRowIndex?: number;
    dragHandleWidth?: number;
}

/**
 * 새 Task 추가 폼 컴포넌트 (UNIFIED View용)
 *
 * Unified View의 컬럼 구조(작업명, 기간, 시작일, 종료일)에 맞춘 입력 폼입니다.
 * 선택된 CP 아래에 새 Task를 생성합니다.
 */
export const GanttSidebarNewTaskFormUnified: React.FC<GanttSidebarNewTaskFormUnifiedProps> = ({
    columns,
    tasks,
    activeCPId,
    onTaskCreate,
    onCancel,
    isVirtualized = false,
    virtualRowIndex,
    dragHandleWidth = 0,
}) => {
    const [form, setForm] = useState<NewTaskFormUnified>(getInitialForm);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const nameInputRef = useRef<HTMLInputElement>(null);

    // 선택된 CP 찾기
    const activeCP = useMemo(() => {
        return tasks.find(t => t.id === activeCPId);
    }, [tasks, activeCPId]);

    // 마운트 시 초기화 및 포커스
    useEffect(() => {
        // 마지막 task의 종료일 또는 CP 시작일 기준으로 시작일 설정
        const tasksUnderCP = tasks.filter(t => t.parentId === activeCPId && t.type === 'TASK');
        const lastTask = tasksUnderCP[tasksUnderCP.length - 1];
        const startDate = lastTask
            ? addDays(lastTask.endDate, 1)
            : activeCP
                ? activeCP.startDate
                : new Date();

        setForm({
            name: '',
            duration: 1,
            startDate: format(startDate, 'yyyy-MM-dd'),
        });

        setTimeout(() => {
            nameInputRef.current?.focus();
        }, 0);
    }, [tasks, activeCPId, activeCP]);

    // 종료일 계산
    const endDate = useMemo(() => {
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
        if (isSubmitting) return;
        if (!form.name.trim() || !onTaskCreate || !activeCPId) return;

        setIsSubmitting(true);
        try {
            const startDate = parse(form.startDate, 'yyyy-MM-dd', new Date());
            if (!isValid(startDate)) {
                alert('유효한 시작일을 입력해주세요.');
                setIsSubmitting(false);
                return;
            }

            const calculatedEndDate = addDays(startDate, Math.max(form.duration - 1, 0));

            const newTask: Partial<ConstructionTask> = {
                id: generateId(),
                parentId: activeCPId,
                wbsLevel: 2,
                type: 'TASK',
                name: form.name.trim(),
                startDate,
                endDate: calculatedEndDate,
                task: {
                    netWorkDays: form.duration,
                    indirectWorkDaysPre: 0,
                    indirectWorkDaysPost: 0,
                },
                dependencies: [],
            };

            await onTaskCreate(newTask);
            setForm(getInitialForm());
            onCancel();
        } catch (error) {
            console.error('Failed to create task:', error);
            alert('태스크 생성 중 오류가 발생했습니다.');
        } finally {
            setIsSubmitting(false);
        }
    }, [isSubmitting, form, onTaskCreate, activeCPId, onCancel]);

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

    // activeCPId가 없으면 폼을 렌더링하지 않음
    if (!activeCPId) {
        return (
            <div
                className="box-border flex items-center justify-center border-b-2 border-yellow-300 bg-yellow-50 text-xs text-yellow-700"
                style={{
                    height: ROW_HEIGHT,
                    ...transformStyle,
                }}
            >
                Task를 추가하려면 먼저 CP를 선택하세요
                <button
                    onClick={handleCancel}
                    className="ml-2 rounded bg-gray-400 p-1 text-white hover:bg-gray-500"
                    title="취소 (Esc)"
                >
                    <X size={12} />
                </button>
            </div>
        );
    }

    return (
        <div
            className="box-border flex items-center border-b-2 border-blue-300 bg-blue-50 transition-colors"
            style={{
                height: ROW_HEIGHT,
                ...transformStyle,
            }}
        >
            {/* Drag Handle Spacer */}
            {dragHandleWidth > 0 && (
                <div style={{ width: dragHandleWidth }} className="shrink-0" />
            )}

            {/* Task Name Input (작업명) */}
            <div
                className="flex shrink-0 items-center overflow-hidden border-r border-blue-200 px-2"
                style={{
                    width: dragHandleWidth > 0 ? columns[0].width - dragHandleWidth : columns[0].width,
                    paddingLeft: 32 + 8, // depth 2 indent (32px) + base padding (8px)
                }}
            >
                {/* Task 점 표시 */}
                <span
                    className="mr-1.5 shrink-0 rounded-full bg-red-500"
                    style={{ width: 4, height: 4 }}
                />
                <input
                    ref={nameInputRef}
                    type="text"
                    placeholder="공정명..."
                    className="w-full rounded border border-blue-300 bg-white px-2 py-1 text-sm text-gray-800 placeholder-gray-400 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                    value={form.name}
                    onChange={(e) => setForm(prev => ({ ...prev, name: e.target.value }))}
                    onKeyDown={handleKeyDown}
                />
            </div>

            {/* Duration Input (기간) */}
            <div
                className="flex shrink-0 items-center justify-center border-r border-blue-200 px-1"
                style={{ width: columns[1].width }}
            >
                <input
                    type="text"
                    inputMode="numeric"
                    pattern="[0-9]*"
                    className="w-full max-w-[50px] rounded border border-blue-300 bg-white px-1 py-1 text-center text-xs text-gray-800 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
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
                className="flex shrink-0 items-center justify-center border-r border-blue-200 px-1"
                style={{ width: columns[2].width }}
            >
                <input
                    type="date"
                    className="w-full rounded border border-blue-300 bg-white px-1 py-0.5 text-center text-xs text-gray-800 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
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
                    disabled={!form.name.trim() || isSubmitting}
                    className="flex items-center justify-center rounded bg-blue-500 p-1.5 text-white hover:bg-blue-600 disabled:bg-gray-300 disabled:cursor-not-allowed transition-colors"
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
