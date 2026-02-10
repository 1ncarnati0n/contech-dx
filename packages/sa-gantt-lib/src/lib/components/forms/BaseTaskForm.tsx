'use client';

import React, { useRef, useEffect, useCallback, useState, useMemo } from 'react';
import { addDays, format, parse, isValid } from 'date-fns';
import { Check, X } from 'lucide-react';
import { GANTT_LAYOUT } from '../../types';
import type { ConstructionTask } from '../../types';
import type { FormConfig, FormState, BaseTaskFormProps } from './types';

const { ROW_HEIGHT } = GANTT_LAYOUT;

interface BaseTaskFormInternalProps extends BaseTaskFormProps {
    config: FormConfig;
}

/**
 * 통합 Task/CP 생성 폼 컴포넌트
 *
 * 설정 기반으로 다양한 뷰 모드(MASTER, DETAIL, UNIFIED)와
 * 폼 타입(CP, TASK)을 지원합니다.
 */
export const BaseTaskForm: React.FC<BaseTaskFormInternalProps> = ({
    config,
    columns,
    tasks,
    allTasks,
    selectedTaskIds,
    focusedTaskId,
    activeCPId,
    onTaskCreate,
    onCancel,
    isVirtualized = false,
    virtualRowIndex,
    dragHandleWidth = 0,
}) => {
    const [formState, setFormState] = useState<FormState>(() =>
        config.getInitialState(tasks, activeCPId)
    );
    const [isSubmitting, setIsSubmitting] = useState(false);
    const nameInputRef = useRef<HTMLInputElement>(null);

    const insertionSortOrder = useMemo(() => {
        const sourceTasks = allTasks ?? tasks;
        if (sourceTasks.length === 0) return 0;

        const selectedIds = selectedTaskIds ? Array.from(selectedTaskIds) : [];
        const selectedId = (focusedTaskId && selectedTaskIds?.has(focusedTaskId))
            ? focusedTaskId
            : (selectedIds.length > 0 ? selectedIds[selectedIds.length - 1] : null);

        if (!selectedId) return sourceTasks.length;

        const selectedVisibleIndex = tasks.findIndex(t => t.id === selectedId);
        if (selectedVisibleIndex === -1) {
            const selectedAllIndex = sourceTasks.findIndex(t => t.id === selectedId);
            return selectedAllIndex >= 0 ? selectedAllIndex + 1 : sourceTasks.length;
        }

        const nextVisibleTask = tasks[selectedVisibleIndex + 1];
        if (!nextVisibleTask) return sourceTasks.length;

        const nextAllIndex = sourceTasks.findIndex(t => t.id === nextVisibleTask.id);
        return nextAllIndex >= 0 ? nextAllIndex : sourceTasks.length;
    }, [allTasks, tasks, selectedTaskIds, focusedTaskId]);

    // 마운트 시 초기화 및 포커스
    useEffect(() => {
        setFormState(config.getInitialState(tasks, activeCPId));
        setTimeout(() => {
            nameInputRef.current?.focus();
        }, 0);
    }, [config, tasks, activeCPId]);

    // Unified TASK의 종료일 계산
    const calculatedEndDate = useMemo(() => {
        if (config.viewMode !== 'UNIFIED' || config.formType !== 'TASK') return null;

        const startDateStr = formState.startDate as string;
        const duration = formState.duration as number;

        if (!startDateStr) return '-';

        const start = parse(startDateStr, 'yyyy-MM-dd', new Date());
        if (!isValid(start)) return '-';

        const end = addDays(start, Math.max(duration - 1, 0));
        return format(end, 'yyyy-MM-dd');
    }, [config.viewMode, config.formType, formState.startDate, formState.duration]);

    const handleCancel = useCallback(() => {
        setFormState(config.getInitialState(tasks, activeCPId));
        onCancel();
    }, [config, tasks, activeCPId, onCancel]);

    const handleSave = useCallback(async () => {
        if (isSubmitting) return;

        const name = (formState.name as string)?.trim();
        if (!name || !onTaskCreate) return;

        // TASK 타입은 activeCPId 필요
        if (config.formType === 'TASK' && !activeCPId) return;

        // Unified TASK 날짜 유효성 검사
        if (config.viewMode === 'UNIFIED' && config.formType === 'TASK') {
            const startDateStr = formState.startDate as string;
            const start = parse(startDateStr, 'yyyy-MM-dd', new Date());
            if (!isValid(start)) {
                alert('유효한 시작일을 입력해주세요.');
                return;
            }
        }

        setIsSubmitting(true);
        try {
            const newTask = config.createTask(formState, tasks, activeCPId);
            if (!newTask) {
                throw new Error('Task 생성 실패');
            }

            const taskWithSortOrder = {
                ...newTask,
                sortOrder: insertionSortOrder,
            } as Partial<ConstructionTask>;

            await onTaskCreate(taskWithSortOrder);
            setFormState(config.getInitialState(tasks, activeCPId));
            onCancel();
        } catch (error) {
            console.error(`Failed to create ${config.formType}:`, error);
            alert(`${config.formType === 'CP' ? 'CP' : '태스크'} 생성 중 오류가 발생했습니다.`);
        } finally {
            setIsSubmitting(false);
        }
    }, [isSubmitting, formState, onTaskCreate, config, tasks, activeCPId, onCancel, insertionSortOrder]);

    const handleKeyDown = useCallback((e: React.KeyboardEvent) => {
        if (e.key === 'Enter') {
            e.preventDefault();
            handleSave();
        } else if (e.key === 'Escape') {
            e.preventDefault();
            handleCancel();
        }
    }, [handleSave, handleCancel]);

    const handleFieldChange = useCallback((key: string, value: string | number) => {
        setFormState(prev => ({ ...prev, [key]: value }));
    }, []);

    // 가상화 스타일
    const transformStyle = isVirtualized && virtualRowIndex !== undefined
        ? {
            position: 'absolute' as const,
            top: 0,
            left: 0,
            width: '100%',
            transform: `translateY(${tasks.length * ROW_HEIGHT}px)`,
        }
        : {};

    // TASK 폼인데 activeCPId가 없는 경우 (Unified View)
    if (config.formType === 'TASK' && !activeCPId && config.viewMode === 'UNIFIED') {
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

    // 필드 렌더링 헬퍼
    const renderField = (field: typeof config.fields[0]) => {
        const value = formState[field.stateKey];

        // Display 필드 (읽기 전용)
        if (field.type === 'display' || field.readOnly) {
            let displayValue: string;

            if (field.id === 'endDate' && config.viewMode === 'UNIFIED' && config.formType === 'TASK') {
                displayValue = calculatedEndDate || '-';
            } else {
                displayValue = String(value || '-');
            }

            return (
                <div
                    key={field.id}
                    className={`flex shrink-0 items-center justify-center text-xs text-gray-600 ${field.columnIndex < columns.length - 1 ? `border-r ${config.theme.borderColor.replace('border-', 'border-')}/30` : ''
                        }`}
                    style={{ width: columns[field.columnIndex]?.width || 80 }}
                >
                    {displayValue}
                </div>
            );
        }

        // Number 필드
        if (field.type === 'number') {
            return (
                <div
                    key={field.id}
                    className={`flex shrink-0 items-center justify-center px-1 ${field.columnIndex < columns.length - 1 ? `border-r ${config.theme.borderColor}/30` : ''
                        }`}
                    style={{ width: columns[field.columnIndex]?.width || 60 }}
                >
                    <input
                        type="text"
                        inputMode="numeric"
                        pattern="[0-9]*"
                        className={`w-full max-w-[50px] rounded border ${config.theme.borderColor} bg-white px-1 py-1 text-center text-xs ${field.colorClass || 'text-gray-800'} focus:outline-none focus:ring-1`}
                        value={value as number}
                        onChange={(e) => {
                            const val = e.target.value.replace(/[^0-9]/g, '');
                            handleFieldChange(field.stateKey, parseInt(val) || 0);
                        }}
                        onKeyDown={handleKeyDown}
                        title={field.title}
                    />
                </div>
            );
        }

        // Date 필드
        if (field.type === 'date') {
            return (
                <div
                    key={field.id}
                    className={`flex shrink-0 items-center justify-center px-1 ${field.columnIndex < columns.length - 1 ? `border-r ${config.theme.borderColor}/30` : ''
                        }`}
                    style={{ width: columns[field.columnIndex]?.width || 100 }}
                >
                    <input
                        type="date"
                        className={`w-full rounded border ${config.theme.borderColor} bg-white px-1 py-0.5 text-center text-xs text-gray-800 focus:outline-none focus:ring-1`}
                        value={value as string}
                        onChange={(e) => handleFieldChange(field.stateKey, e.target.value)}
                        onKeyDown={handleKeyDown}
                        title={field.title}
                    />
                </div>
            );
        }

        return null;
    };

    // Name 필드 제외한 나머지 필드
    const otherFields = config.fields.filter(f => f.id !== 'name');

    // Name 컬럼 너비 계산
    const nameColumnWidth = dragHandleWidth > 0
        ? columns[0].width - dragHandleWidth
        : columns[0].width;

    // Unified TASK의 indent
    const taskIndent = config.formType === 'TASK' && config.viewMode === 'UNIFIED'
        ? 32 + 8 // depth 2 indent + base padding
        : 0;

    return (
        <div
            className={`box-border flex items-center border-b-2 ${config.theme.borderColor} ${config.theme.bgColor} transition-colors`}
            style={{
                height: ROW_HEIGHT,
                ...transformStyle,
            }}
        >
            {/* Drag Handle Spacer */}
            {dragHandleWidth > 0 && (
                <div style={{ width: dragHandleWidth }} className="shrink-0" />
            )}

            {/* Name Input (첫 번째 컬럼) */}
            <div
                className={`flex shrink-0 items-center overflow-hidden border-r ${config.theme.borderColor}/30 px-2`}
                style={{
                    width: nameColumnWidth,
                    paddingLeft: taskIndent > 0 ? taskIndent : undefined,
                }}
            >
                {/* 확장 버튼 공간 (Master CP) */}
                {config.viewMode === 'MASTER' && config.formType === 'CP' && (
                    <div className="w-6 shrink-0" />
                )}

                {/* Badge (Unified CP) */}
                {config.badge && (
                    <span className={`mr-1.5 shrink-0 rounded ${config.badge.bgColor} px-1 text-[10px] font-medium text-white`}>
                        {config.badge.text}
                    </span>
                )}

                {/* Task 점 표시 (Unified TASK) */}
                {config.formType === 'TASK' && config.viewMode === 'UNIFIED' && (
                    <span
                        className="mr-1.5 shrink-0 rounded-full bg-red-500"
                        style={{ width: 4, height: 4 }}
                    />
                )}

                <input
                    ref={nameInputRef}
                    type="text"
                    placeholder={config.namePlaceholder}
                    className={`w-full rounded border ${config.theme.borderColor} bg-white px-2 py-1 text-sm text-gray-800 placeholder-gray-400 focus:outline-none focus:ring-1`}
                    value={(formState.name as string) || ''}
                    onChange={(e) => handleFieldChange('name', e.target.value)}
                    onKeyDown={handleKeyDown}
                />
            </div>

            {/* Other Fields */}
            {otherFields.map(renderField)}

            {/* Actions: 저장/취소 버튼 */}
            <div className="flex shrink-0 items-center justify-center gap-1 px-2">
                <button
                    onClick={handleSave}
                    disabled={!(formState.name as string)?.trim() || isSubmitting}
                    className={`flex items-center justify-center rounded bg-${config.theme.accentColor === 'vermilion' ? 'vermilion' : 'blue-500'} p-1.5 text-white hover:bg-${config.theme.accentColor === 'vermilion' ? 'vermilion/80' : 'blue-600'} disabled:bg-gray-300 disabled:cursor-not-allowed transition-colors`}
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
