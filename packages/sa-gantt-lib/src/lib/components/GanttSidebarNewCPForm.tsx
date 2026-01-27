'use client';

import React, { useRef, useEffect, useCallback } from 'react';
import { addDays } from 'date-fns';
import { Check, X } from 'lucide-react';
import { ConstructionTask, GANTT_LAYOUT } from '../types';

const { ROW_HEIGHT } = GANTT_LAYOUT;

interface NewCPForm {
    name: string;
    workDaysTotal: number;
    nonWorkDaysTotal: number;
}

const INITIAL_NEW_CP_FORM: NewCPForm = {
    name: '',
    workDaysTotal: 30,
    nonWorkDaysTotal: 10,
};

interface GanttSidebarNewCPFormProps {
    columns: Array<{ id: string; label: string; width: number; minWidth: number }>;
    tasks: ConstructionTask[];
    onTaskCreate?: (task: Partial<ConstructionTask>) => void | Promise<void>;
    onCancel: () => void;
    isVirtualized?: boolean;
    virtualRowIndex?: number;
    dragHandleWidth?: number;
}

/**
 * 새 CP 추가 폼 컴포넌트
 * 
 * Master View (Level 1)에서 새 CP를 추가할 때 사용되는 입력 폼입니다.
 */
export const GanttSidebarNewCPForm: React.FC<GanttSidebarNewCPFormProps> = ({
    columns,
    tasks,
    onTaskCreate,
    onCancel,
    isVirtualized = false,
    virtualRowIndex,
    dragHandleWidth = 0,
}) => {
    const [newCPForm, setNewCPForm] = React.useState<NewCPForm>(INITIAL_NEW_CP_FORM);
    const newCPNameInputRef = useRef<HTMLInputElement>(null);

    // 마운트 시 input에 포커스
    useEffect(() => {
        setNewCPForm(INITIAL_NEW_CP_FORM);
        setTimeout(() => {
            newCPNameInputRef.current?.focus();
        }, 0);
    }, []);

    const handleCancel = useCallback(() => {
        setNewCPForm(INITIAL_NEW_CP_FORM);
        onCancel();
    }, [onCancel]);

    const handleSave = useCallback(async () => {
        if (!newCPForm.name.trim() || !onTaskCreate) return;

        try {
            // 마지막 CP의 종료일을 기준으로 시작일 계산
            const cpTasks = tasks.filter(t => t.type === 'CP' && !t.parentId);
            const lastCP = cpTasks[cpTasks.length - 1];
            const startDate = lastCP ? addDays(lastCP.endDate, 1) : new Date();
            const totalDays = newCPForm.workDaysTotal + newCPForm.nonWorkDaysTotal;
            const endDate = addDays(startDate, Math.max(totalDays - 1, 0));

            const newCP: Partial<ConstructionTask> = {
                id: `cp-${Date.now()}`,
                parentId: null,
                wbsLevel: 1,
                type: 'CP',
                name: newCPForm.name.trim(),
                startDate,
                endDate,
                cp: {
                    workDaysTotal: newCPForm.workDaysTotal,
                    nonWorkDaysTotal: newCPForm.nonWorkDaysTotal,
                },
                dependencies: [],
            };

            await onTaskCreate(newCP);
            setNewCPForm(INITIAL_NEW_CP_FORM);
            onCancel();
        } catch (error) {
            console.error('Failed to create CP:', error);
            alert('CP 생성 중 오류가 발생했습니다.');
        }
    }, [newCPForm, onTaskCreate, tasks, onCancel]);

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

            {/* CP Name Input */}
            <div
                className="flex shrink-0 items-center overflow-hidden border-r border-blue-200 px-2"
                style={{ width: dragHandleWidth > 0 ? columns[0].width - dragHandleWidth : columns[0].width }}
            >
                <div className="w-6 shrink-0" /> {/* 확장 버튼 공간 */}
                <input
                    ref={newCPNameInputRef}
                    type="text"
                    placeholder="CP명..."
                    className="w-full rounded border border-blue-300 bg-white px-2 py-1 text-sm text-gray-800 placeholder-gray-400 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                    value={newCPForm.name}
                    onChange={(e) => setNewCPForm(prev => ({ ...prev, name: e.target.value }))}
                    onKeyDown={handleKeyDown}
                />
            </div>

            {/* Total Duration (총 공기) - 자동 계산 표시 */}
            <div
                className="flex shrink-0 items-center justify-center border-r border-blue-200 text-xs text-gray-600"
                style={{ width: columns[1].width }}
            >
                {newCPForm.workDaysTotal + newCPForm.nonWorkDaysTotal}일
            </div>

            {/* Work Days Input (작업일수) */}
            <div
                className="flex shrink-0 items-center justify-center border-r border-blue-200 px-1"
                style={{ width: columns[2].width }}
            >
                <input
                    type="text"
                    inputMode="numeric"
                    pattern="[0-9]*"
                    className="w-full max-w-[50px] rounded border border-blue-300 bg-white px-1 py-1 text-center text-xs text-vermilion focus:border-vermilion focus:outline-none focus:ring-1 focus:ring-vermilion"
                    value={newCPForm.workDaysTotal}
                    onChange={(e) => {
                        const value = e.target.value.replace(/[^0-9]/g, '');
                        const val = parseInt(value) || 0;
                        setNewCPForm(prev => ({ ...prev, workDaysTotal: val }));
                    }}
                    onKeyDown={handleKeyDown}
                    title="작업일수"
                />
            </div>

            {/* Non-Work Days Input (비작업일수) */}
            <div
                className="flex shrink-0 items-center justify-center px-1"
                style={{ width: columns[3].width }}
            >
                <input
                    type="text"
                    inputMode="numeric"
                    pattern="[0-9]*"
                    className="w-full max-w-[50px] rounded border border-blue-300 bg-white px-1 py-1 text-center text-xs text-teal focus:border-teal focus:outline-none focus:ring-1 focus:ring-teal"
                    value={newCPForm.nonWorkDaysTotal}
                    onChange={(e) => {
                        const value = e.target.value.replace(/[^0-9]/g, '');
                        const val = parseInt(value) || 0;
                        setNewCPForm(prev => ({ ...prev, nonWorkDaysTotal: val }));
                    }}
                    onKeyDown={handleKeyDown}
                    title="비작업일수"
                />
            </div>

            {/* Actions: 저장/취소 버튼 (컬럼 뒤에 추가) */}
            <div className="flex shrink-0 items-center justify-center gap-1 px-2">
                <button
                    onClick={handleSave}
                    disabled={!newCPForm.name.trim()}
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

