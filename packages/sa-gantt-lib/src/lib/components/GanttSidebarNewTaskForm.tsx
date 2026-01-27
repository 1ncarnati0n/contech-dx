'use client';

import React, { useRef, useEffect, useCallback } from 'react';
import { addDays } from 'date-fns';
import { Check, X } from 'lucide-react';
import { ConstructionTask, GANTT_LAYOUT } from '../types';

const { ROW_HEIGHT } = GANTT_LAYOUT;

interface NewTaskForm {
    name: string;
    indirectWorkDaysPre: number;
    netWorkDays: number;
    indirectWorkDaysPost: number;
}

const INITIAL_NEW_TASK_FORM: NewTaskForm = {
    name: '',
    indirectWorkDaysPre: 0,
    netWorkDays: 1,
    indirectWorkDaysPost: 0,
};

interface GanttSidebarNewTaskFormProps {
    columns: Array<{ id: string; label: string; width: number; minWidth: number }>;
    tasks: ConstructionTask[];
    activeCPId: string | null;
    onTaskCreate?: (task: Partial<ConstructionTask>) => void | Promise<void>;
    onCancel: () => void;
    isVirtualized?: boolean;
    virtualRowIndex?: number;
}

/**
 * 새 Task 추가 폼 컴포넌트
 * 
 * Detail View에서 새 공정을 추가할 때 사용되는 입력 폼입니다.
 */
export const GanttSidebarNewTaskForm: React.FC<GanttSidebarNewTaskFormProps> = ({
    columns,
    tasks,
    activeCPId,
    onTaskCreate,
    onCancel,
    isVirtualized = false,
    virtualRowIndex,
}) => {
    const [newTaskForm, setNewTaskForm] = React.useState<NewTaskForm>(INITIAL_NEW_TASK_FORM);
    const newTaskNameInputRef = useRef<HTMLInputElement>(null);

    // isAddingTask가 true가 되면 input에 포커스
    useEffect(() => {
        setNewTaskForm(INITIAL_NEW_TASK_FORM);
        setTimeout(() => {
            newTaskNameInputRef.current?.focus();
        }, 0);
    }, []);

    const handleCancel = useCallback(() => {
        setNewTaskForm(INITIAL_NEW_TASK_FORM);
        onCancel();
    }, [onCancel]);

    const handleSave = useCallback(async () => {
        if (!newTaskForm.name.trim() || !onTaskCreate || !activeCPId) return;

        try {
            // 마지막 task의 종료일을 기준으로 시작일 계산
            const lastTask = tasks[tasks.length - 1];
            const startDate = lastTask ? addDays(lastTask.endDate, 1) : new Date();
            const totalDays = newTaskForm.indirectWorkDaysPre + newTaskForm.netWorkDays + newTaskForm.indirectWorkDaysPost;
            const endDate = addDays(startDate, Math.max(totalDays - 1, 0));

            const newTask: Partial<ConstructionTask> = {
                id: `task-${Date.now()}`,
                parentId: activeCPId,
                wbsLevel: 2,
                type: 'TASK',
                name: newTaskForm.name.trim(),
                startDate,
                endDate,
                task: {
                    netWorkDays: newTaskForm.netWorkDays,
                    indirectWorkDaysPre: newTaskForm.indirectWorkDaysPre,
                    indirectWorkDaysPost: newTaskForm.indirectWorkDaysPost,
                },
                dependencies: [],
            };

            await onTaskCreate(newTask);
            setNewTaskForm(INITIAL_NEW_TASK_FORM);
            onCancel();
        } catch (error) {
            console.error('Failed to create task:', error);
            alert('태스크 생성 중 오류가 발생했습니다.');
        }
    }, [newTaskForm, onTaskCreate, activeCPId, tasks, onCancel]);

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
            {/* Task Name Input */}
            <div
                className="flex shrink-0 items-center overflow-hidden border-r border-blue-200 px-2"
                style={{ width: columns[0].width }}
            >
                <input
                    ref={newTaskNameInputRef}
                    type="text"
                    placeholder="공정명..."
                    className="w-full rounded border border-blue-300 bg-white px-2 py-1 text-sm text-gray-800 placeholder-gray-400 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                    value={newTaskForm.name}
                    onChange={(e) => setNewTaskForm(prev => ({ ...prev, name: e.target.value }))}
                    onKeyDown={handleKeyDown}
                />
            </div>

            {/* Pre Indirect Work Days Input (선간접) */}
            <div
                className="flex shrink-0 items-center justify-center border-r border-blue-200 px-1"
                style={{ width: columns[1].width }}
            >
                <input
                    type="text"
                    inputMode="numeric"
                    pattern="[0-9]*"
                    className="w-full max-w-[40px] rounded border border-blue-300 bg-white px-1 py-1 text-center text-xs text-gray-800 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                    value={newTaskForm.indirectWorkDaysPre}
                    onChange={(e) => {
                        const value = e.target.value.replace(/[^0-9]/g, '');
                        const val = parseInt(value) || 0;
                        setNewTaskForm(prev => ({ ...prev, indirectWorkDaysPre: val }));
                    }}
                    onKeyDown={handleKeyDown}
                    title="선 간접작업일"
                />
            </div>

            {/* Net Work Days Input (순작업) */}
            <div
                className="flex shrink-0 items-center justify-center border-r border-blue-200 px-1"
                style={{ width: columns[2].width }}
            >
                <input
                    type="text"
                    inputMode="numeric"
                    pattern="[0-9]*"
                    className="w-full max-w-[40px] rounded border border-blue-300 bg-white px-1 py-1 text-center text-xs text-gray-800 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                    value={newTaskForm.netWorkDays}
                    onChange={(e) => {
                        const value = e.target.value.replace(/[^0-9]/g, '');
                        const val = parseInt(value) || 0;
                        setNewTaskForm(prev => ({ ...prev, netWorkDays: val }));
                    }}
                    onKeyDown={handleKeyDown}
                    title="순작업일"
                />
            </div>

            {/* Post Indirect Work Days Input (후간접) */}
            <div
                className="flex shrink-0 items-center justify-center border-r border-blue-200 px-1"
                style={{ width: columns[3].width }}
            >
                <input
                    type="text"
                    inputMode="numeric"
                    pattern="[0-9]*"
                    className="w-full max-w-[40px] rounded border border-blue-300 bg-white px-1 py-1 text-center text-xs text-gray-800 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                    value={newTaskForm.indirectWorkDaysPost}
                    onChange={(e) => {
                        const value = e.target.value.replace(/[^0-9]/g, '');
                        const val = parseInt(value) || 0;
                        setNewTaskForm(prev => ({ ...prev, indirectWorkDaysPost: val }));
                    }}
                    onKeyDown={handleKeyDown}
                    title="후 간접작업일"
                />
            </div>

            {/* Actions: 저장/취소 버튼 */}
            <div
                className="flex shrink-0 items-center justify-center gap-1 px-2"
                style={{ width: columns[4].width + columns[5].width }}
            >
                <button
                    onClick={handleSave}
                    disabled={!newTaskForm.name.trim()}
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

