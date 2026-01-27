'use client';

import React, { useState, useEffect, useRef, useMemo } from 'react';
import { X, Trash2 } from 'lucide-react';
import { format } from 'date-fns';
import { ConstructionTask, TaskData } from '../types';
import { DeleteConfirmModal, WorkDayCheckbox, CompactInputRow } from './ui';

// ============================================
// 공통 스타일 상수 (다크모드 지원)
// ============================================
const INPUT_BASE = "w-full rounded-md border px-3 py-2 text-sm";
const FOCUS_GREEN = "focus:border-green-500 focus:outline-none focus:ring-2 focus:ring-green-500/20";

const inputStyle: React.CSSProperties = {
    backgroundColor: 'var(--gantt-bg-primary)',
    borderColor: 'var(--gantt-border)',
    color: 'var(--gantt-text-secondary)',
};

const sectionCardStyle: React.CSSProperties = {
    backgroundColor: 'var(--gantt-bg-secondary)',
    borderRadius: '0.5rem',
    padding: '1rem',
};

const sectionTitleStyle: React.CSSProperties = {
    fontSize: '0.75rem',
    fontWeight: 600,
    color: 'var(--gantt-text-muted)',
    textTransform: 'uppercase',
    letterSpacing: '0.05em',
    marginBottom: '0.75rem',
};

// ============================================
// TaskEditModal Props
// ============================================
export interface TaskEditModalProps {
    task: ConstructionTask | null;
    isOpen: boolean;
    onClose: () => void;
    onSave: (task: ConstructionTask) => void | Promise<void>;
    onDelete?: (taskId: string) => void | Promise<void>;
}

/**
 * Task 편집 모달
 * 
 * Task의 간접작업일/작업명과 순작업일을 편집할 수 있는 모달 컴포넌트입니다.
 */
export const TaskEditModal: React.FC<TaskEditModalProps> = ({
    task,
    isOpen,
    onClose,
    onSave,
    onDelete,
}) => {
    // 일수 상태 (문자열로 관리하여 소수점 입력 허용)
    const [indirectWorkDaysPreStr, setIndirectWorkDaysPreStr] = useState('0');
    const [netWorkDaysStr, setNetWorkDaysStr] = useState('1');
    const [indirectWorkDaysPostStr, setIndirectWorkDaysPostStr] = useState('0');

    // 작업명 상태
    const [indirectWorkNamePre, setIndirectWorkNamePre] = useState('');
    const [indirectWorkNamePost, setIndirectWorkNamePost] = useState('');

    // 작업일 설정 상태
    const [saturdayOff, setSaturdayOff] = useState(false);
    const [sundayWork, setSundayWork] = useState(false);
    const [holidayWork, setHolidayWork] = useState(false);

    const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
    const [isSaving, setIsSaving] = useState(false);

    // 시작일 상태
    const [startDateStr, setStartDateStr] = useState('');

    const preInputRef = useRef<HTMLInputElement>(null);

    // 문자열을 숫자로 파싱 (0.5 단위로 반올림)
    const parseToNumber = (str: string): number => {
        const parsed = parseFloat(str) || 0;
        return Math.round(parsed * 2) / 2;
    };

    // 숫자 값 계산용
    const indirectWorkDaysPre = parseToNumber(indirectWorkDaysPreStr);
    const netWorkDays = parseToNumber(netWorkDaysStr);
    const indirectWorkDaysPost = parseToNumber(indirectWorkDaysPostStr);

    // Task 데이터로 폼 초기화
    useEffect(() => {
        if (task && task.task && isOpen) {
            setIndirectWorkDaysPreStr(String(task.task.indirectWorkDaysPre));
            setNetWorkDaysStr(String(task.task.netWorkDays));
            setIndirectWorkDaysPostStr(String(task.task.indirectWorkDaysPost));
            setIndirectWorkNamePre(task.task.indirectWorkNamePre || '');
            setIndirectWorkNamePost(task.task.indirectWorkNamePost || '');

            setSaturdayOff(task.task.workOnSaturdays === false);
            setSundayWork(task.task.workOnSundays === true);
            setHolidayWork(task.task.workOnHolidays === true);

            setStartDateStr(format(task.startDate, 'yyyy-MM-dd'));
            setShowDeleteConfirm(false);

            setTimeout(() => {
                preInputRef.current?.focus();
            }, 100);
        }
    }, [task?.id, isOpen]);

    // ESC 키로 닫기
    useEffect(() => {
        const handleKeyDown = (e: KeyboardEvent) => {
            if (e.key === 'Escape' && isOpen) {
                if (showDeleteConfirm) {
                    setShowDeleteConfirm(false);
                } else {
                    onClose();
                }
            }
        };

        document.addEventListener('keydown', handleKeyDown);
        return () => document.removeEventListener('keydown', handleKeyDown);
    }, [isOpen, showDeleteConfirm, onClose]);

    // 변경 감지
    const hasChanges = useMemo(() => {
        if (!task || !task.task || !isOpen) return false;

        const currentPre = parseToNumber(indirectWorkDaysPreStr);
        const currentNet = parseToNumber(netWorkDaysStr);
        const currentPost = parseToNumber(indirectWorkDaysPostStr);

        return (
            currentPre !== task.task.indirectWorkDaysPre ||
            currentNet !== task.task.netWorkDays ||
            currentPost !== task.task.indirectWorkDaysPost ||
            indirectWorkNamePre !== (task.task.indirectWorkNamePre || '') ||
            indirectWorkNamePost !== (task.task.indirectWorkNamePost || '') ||
            (saturdayOff !== (task.task.workOnSaturdays === false)) ||
            (sundayWork !== (task.task.workOnSundays === true)) ||
            (holidayWork !== (task.task.workOnHolidays === true)) ||
            startDateStr !== format(task.startDate, 'yyyy-MM-dd')
        );
    }, [task, isOpen, indirectWorkDaysPreStr, netWorkDaysStr, indirectWorkDaysPostStr,
        indirectWorkNamePre, indirectWorkNamePost, saturdayOff, sundayWork, holidayWork, startDateStr]);

    const handleSave = async () => {
        if (!task || !task.task || isSaving) return;

        const newStartDate = startDateStr ? new Date(startDateStr + 'T00:00:00') : task.startDate;

        const updatedTaskData: TaskData = {
            ...task.task,
            indirectWorkDaysPre,
            netWorkDays,
            indirectWorkDaysPost,
            indirectWorkNamePre: indirectWorkNamePre.trim() || undefined,
            indirectWorkNamePost: indirectWorkNamePost.trim() || undefined,
            workOnSaturdays: saturdayOff ? false : undefined,
            workOnSundays: sundayWork ? true : undefined,
            workOnHolidays: holidayWork ? true : undefined,
        };

        const updatedTask: ConstructionTask = {
            ...task,
            startDate: newStartDate,
            task: updatedTaskData,
        };

        setIsSaving(true);
        try {
            await onSave(updatedTask);
        } catch (error) {
            console.error('[TaskEditModal] Save failed:', error);
        } finally {
            setIsSaving(false);
        }
    };

    const handleDeleteConfirm = async () => {
        if (!task || !onDelete || isSaving) return;

        setIsSaving(true);
        try {
            await onDelete(task.id);
            setShowDeleteConfirm(false);
            onClose();
        } catch (error) {
            console.error('[TaskEditModal] Delete failed:', error);
            setShowDeleteConfirm(false);
        } finally {
            setIsSaving(false);
        }
    };

    const handleKeyDown = (e: React.KeyboardEvent) => {
        if (e.key === 'Enter' && !e.shiftKey) {
            e.preventDefault();
            handleSave();
        }
    };

    const handleNumberChange = (
        setter: React.Dispatch<React.SetStateAction<string>>,
        value: string
    ) => {
        const cleaned = value.replace(/[^0-9.]/g, '');
        const parts = cleaned.split('.');
        const sanitized = parts.length > 2
            ? parts[0] + '.' + parts.slice(1).join('')
            : cleaned;
        setter(sanitized);
    };

    const [closeHovered, setCloseHovered] = React.useState(false);

    if (!isOpen || !task || !task.task) return null;

    const totalDays = indirectWorkDaysPre + netWorkDays + indirectWorkDaysPost;

    return (
        <>
            {/* Backdrop */}
            <div
                className="fixed inset-0 z-50 bg-black/50 transition-opacity"
                onClick={onClose}
            />

            {/* Modal */}
            <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
                <div
                    className="w-full max-w-lg rounded-xl shadow-2xl"
                    style={{
                        backgroundColor: 'var(--gantt-bg-primary)',
                        border: '1px solid var(--gantt-border)',
                    }}
                    onClick={(e) => e.stopPropagation()}
                >
                    {/* Header */}
                    <div
                        className="flex items-center justify-between px-5 py-4"
                        style={{ borderBottom: '1px solid var(--gantt-border-light)' }}
                    >
                        <div>
                            <h2
                                className="text-base font-bold"
                                style={{ color: 'var(--gantt-text-primary)' }}
                            >
                                공정 설정
                            </h2>
                            <p
                                className="text-sm mt-0.5"
                                style={{ color: 'var(--gantt-text-muted)' }}
                            >
                                {task.name}
                            </p>
                        </div>
                        <button
                            onClick={onClose}
                            className="rounded-lg p-2 transition-colors"
                            style={{
                                color: 'var(--gantt-text-muted)',
                                backgroundColor: closeHovered ? 'var(--gantt-bg-hover)' : 'transparent',
                            }}
                            onMouseEnter={() => setCloseHovered(true)}
                            onMouseLeave={() => setCloseHovered(false)}
                        >
                            <X size={20} />
                        </button>
                    </div>

                    {/* Body */}
                    <div className="p-5 space-y-5">
                        {/* 시작일 섹션 */}
                        <div style={sectionCardStyle}>
                            <h3 style={sectionTitleStyle}>📅 시작일</h3>
                            <div className="flex items-center gap-3">
                                <input
                                    type="date"
                                    value={startDateStr}
                                    onChange={(e) => setStartDateStr(e.target.value)}
                                    onKeyDown={handleKeyDown}
                                    className={`${INPUT_BASE} ${FOCUS_GREEN} w-44`}
                                    style={inputStyle}
                                />
                                <span
                                    className="text-xs"
                                    style={{ color: 'var(--gantt-text-muted)' }}
                                >
                                    → 종료일 자동 계산
                                </span>
                            </div>
                        </div>

                        {/* 작업 기간 설정 섹션 */}
                        <div style={sectionCardStyle}>
                            <h3 style={sectionTitleStyle}>⏱️ 작업 기간</h3>
                            <div className="space-y-3">
                                <CompactInputRow
                                    label="앞 간접"
                                    daysValue={indirectWorkDaysPreStr}
                                    nameValue={indirectWorkNamePre}
                                    onDaysChange={setIndirectWorkDaysPreStr}
                                    onNameChange={setIndirectWorkNamePre}
                                    onKeyDown={handleKeyDown}
                                    onNumberChange={handleNumberChange}
                                    daysInputRef={preInputRef}
                                    color="blue"
                                />
                                <CompactInputRow
                                    label="순작업"
                                    daysValue={netWorkDaysStr}
                                    onDaysChange={setNetWorkDaysStr}
                                    onKeyDown={handleKeyDown}
                                    onNumberChange={handleNumberChange}
                                    color="red"
                                    showNameInput={false}
                                />
                                <CompactInputRow
                                    label="뒤 간접"
                                    daysValue={indirectWorkDaysPostStr}
                                    nameValue={indirectWorkNamePost}
                                    onDaysChange={setIndirectWorkDaysPostStr}
                                    onNameChange={setIndirectWorkNamePost}
                                    onKeyDown={handleKeyDown}
                                    onNumberChange={handleNumberChange}
                                    color="blue"
                                />
                            </div>
                        </div>

                        {/* 작업일 설정 섹션 */}
                        <div style={sectionCardStyle}>
                            <h3 style={sectionTitleStyle}>📆 작업일 설정</h3>
                            <div className="flex flex-wrap gap-1 -mx-1">
                                <WorkDayCheckbox
                                    label="토요일 휴무"
                                    checked={saturdayOff}
                                    onChange={setSaturdayOff}
                                />
                                <WorkDayCheckbox
                                    label="일요일 작업"
                                    checked={sundayWork}
                                    onChange={setSundayWork}
                                />
                                <WorkDayCheckbox
                                    label="공휴일 작업"
                                    checked={holidayWork}
                                    onChange={setHolidayWork}
                                />
                            </div>
                        </div>

                        {/* 총 일수 표시 */}
                        <div
                            className="flex items-center justify-between rounded-lg px-4 py-3"
                            style={{
                                backgroundColor: 'var(--gantt-bg-tertiary)',
                                border: '1px solid var(--gantt-border)',
                            }}
                        >
                            <div
                                className="flex items-center gap-2 text-sm"
                                style={{ color: 'var(--gantt-text-secondary)' }}
                            >
                                <span className="font-medium text-blue-600">{indirectWorkDaysPre}</span>
                                <span style={{ color: 'var(--gantt-text-muted)' }}>+</span>
                                <span className="font-medium text-red-600">{netWorkDays}</span>
                                <span style={{ color: 'var(--gantt-text-muted)' }}>+</span>
                                <span className="font-medium text-blue-600">{indirectWorkDaysPost}</span>
                            </div>
                            <div className="flex items-center gap-2">
                                <span
                                    className="text-sm"
                                    style={{ color: 'var(--gantt-text-muted)' }}
                                >
                                    =
                                </span>
                                <span
                                    className="text-lg font-bold"
                                    style={{ color: 'var(--gantt-text-primary)' }}
                                >
                                    {totalDays}일
                                </span>
                            </div>
                        </div>
                    </div>

                    {/* Footer */}
                    <div
                        className="flex justify-between items-center px-5 py-4 rounded-b-xl"
                        style={{
                            borderTop: '1px solid var(--gantt-border-light)',
                            backgroundColor: 'var(--gantt-bg-secondary)',
                        }}
                    >
                        {/* 삭제 버튼 */}
                        <div>
                            {onDelete && (
                                <button
                                    onClick={() => setShowDeleteConfirm(true)}
                                    className="flex items-center gap-1.5 rounded-lg px-3 py-2 text-sm font-medium text-red-600 hover:bg-red-50 transition-colors"
                                >
                                    <Trash2 size={16} />
                                    삭제
                                </button>
                            )}
                        </div>

                        {/* 저장/닫기 버튼 */}
                        <button
                            onClick={hasChanges ? handleSave : onClose}
                            className={`rounded-lg px-5 py-2.5 text-sm font-semibold transition-all shadow-sm ${hasChanges
                                ? 'bg-blue-600 text-white hover:bg-blue-700 shadow-blue-200'
                                : 'bg-gray-600 text-white hover:bg-gray-700'
                                }`}
                        >
                            {hasChanges ? '저장' : '닫기'}
                        </button>
                    </div>
                </div>
            </div>

            {/* 삭제 확인 모달 */}
            {showDeleteConfirm && (
                <DeleteConfirmModal
                    itemName={task.name}
                    title="공정 삭제"
                    onConfirm={handleDeleteConfirm}
                    onCancel={() => setShowDeleteConfirm(false)}
                />
            )}
        </>
    );
};
