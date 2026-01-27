'use client';

import React, { useState, useRef, useEffect, useMemo, useCallback } from 'react';
import { format } from 'date-fns';
import { ZOOM_CONFIG } from '../../types';
import type { GanttHeaderProps } from './types';

// ============================================
// 버튼 스타일 상수 (통일성 부여)
// ============================================
const BTN_BASE = 'flex items-center gap-1 rounded px-2.5 py-1 text-xs font-medium transition-colors';
const BTN_SECONDARY_STYLE = {
    backgroundColor: 'var(--gantt-bg-tertiary)',
    color: 'var(--gantt-text-secondary)',
};
const BTN_HOVER_HANDLERS = {
    onMouseEnter: (e: React.MouseEvent<HTMLButtonElement | HTMLLabelElement>) => {
        e.currentTarget.style.backgroundColor = 'var(--gantt-bg-hover)';
    },
    onMouseLeave: (e: React.MouseEvent<HTMLButtonElement | HTMLLabelElement>) => {
        e.currentTarget.style.backgroundColor = 'var(--gantt-bg-tertiary)';
    },
};
const BTN_GROUP_CONTAINER = 'flex rounded-md p-0.5';
const BTN_GROUP_ITEM = 'rounded px-2.5 py-1 text-xs font-medium transition-colors';
// 액션 버튼 (오른쪽 영역 - 저장, 초기화, 내보내기 등)
const BTN_ACTION = 'flex items-center gap-1.5 rounded px-3 py-1.5 text-xs font-medium transition-colors';
const BTN_ACTION_HOVER = {
    onMouseEnter: (e: React.MouseEvent<HTMLButtonElement | HTMLLabelElement>) => {
        e.currentTarget.style.filter = 'brightness(1.1)';
    },
    onMouseLeave: (e: React.MouseEvent<HTMLButtonElement | HTMLLabelElement>) => {
        e.currentTarget.style.filter = 'brightness(1)';
    },
};

export const GanttHeader: React.FC<GanttHeaderProps> = ({
    viewMode,
    zoomLevel,
    isAddingTask,
    isAddingCP,
    hasUnsavedChanges,
    saveStatus,
    isCompactMode,
    onViewChange,
    onZoomChange,
    onToggleCompact,
    onStartAddTask,
    onStartAddCP,
    onStartAddMilestone,
    onScrollToFirst,
    onCollapseAll,
    onExpandAll,
    onSave,
    onReset,
    onExport,
    onExportExcel,
    onImport,
    loadedFileName,
    canCreateTask,
    canCreateMilestone,
}) => {
    const [isAddDropdownOpen, setIsAddDropdownOpen] = useState(false);
    const addDropdownRef = useRef<HTMLDivElement>(null);

    // 외부 클릭 시 드롭다운 닫기
    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (addDropdownRef.current && !addDropdownRef.current.contains(event.target as Node)) {
                setIsAddDropdownOpen(false);
            }
        };

        if (isAddDropdownOpen) {
            document.addEventListener('mousedown', handleClickOutside);
        }

        return () => {
            document.removeEventListener('mousedown', handleClickOutside);
        };
    }, [isAddDropdownOpen]);

    // 드롭다운 닫기 핸들러 (useCallback으로 안정적인 참조 유지)
    const closeDropdown = useCallback(() => setIsAddDropdownOpen(false), []);

    // 추가 메뉴 항목 생성 (useMemo로 메모이제이션)
    const addMenuItems = useMemo(() => {
        const items: { label: string; onClick: () => void; color: string }[] = [];

        if (viewMode === 'MASTER' || viewMode === 'UNIFIED') {
            if (canCreateTask && onStartAddCP && !isAddingCP) {
                items.push({
                    label: 'CP 추가',
                    onClick: () => {
                        onStartAddCP();
                        closeDropdown();
                    },
                    color: 'var(--gantt-focus)',
                });
            }
        }

        if (viewMode === 'DETAIL' || viewMode === 'UNIFIED') {
            if (canCreateTask && onStartAddTask && !isAddingTask) {
                items.push({
                    label: 'Task 추가',
                    onClick: () => {
                        onStartAddTask();
                        closeDropdown();
                    },
                    color: 'var(--gantt-focus)',
                });
            }
        }

        if (viewMode === 'MASTER' || viewMode === 'UNIFIED') {
            if (canCreateMilestone && onStartAddMilestone) {
                items.push({
                    label: '마일스톤 추가',
                    onClick: () => {
                        onStartAddMilestone();
                        closeDropdown();
                    },
                    color: 'var(--gantt-milestone-detail)',
                });
            }
        }

        return items;
    }, [viewMode, canCreateTask, canCreateMilestone, isAddingCP, isAddingTask,
        onStartAddCP, onStartAddTask, onStartAddMilestone, closeDropdown]);

    return (
        <header
            className="flex h-[60px] shrink-0 items-center justify-between px-4 shadow-sm"
            style={{
                backgroundColor: 'var(--gantt-bg-primary)',
                borderBottom: '1px solid var(--gantt-border)',
            }}
        >
            {/* 왼쪽: 네비게이션 + 추가 드롭다운 */}
            <div className="flex items-center gap-3 shrink-0">
                {/* DETAIL View: 상위 공정표로 버튼 */}
                {viewMode === 'DETAIL' && (
                    <button
                        onClick={() => onViewChange('MASTER')}
                        className={BTN_BASE}
                        style={BTN_SECONDARY_STYLE}
                        {...BTN_HOVER_HANDLERS}
                    >
                        ← 상위 공정표로
                    </button>
                )}

                {/* 추가 드롭다운 */}
                {addMenuItems.length > 0 && (
                    <div className="relative" ref={addDropdownRef}>
                        <button
                            onClick={() => setIsAddDropdownOpen(!isAddDropdownOpen)}
                            className={BTN_BASE}
                            style={{
                                backgroundColor: 'var(--gantt-focus)',
                                color: 'var(--gantt-text-inverse)',
                            }}
                        >
                            <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                                <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" />
                            </svg>
                            추가
                            <svg className={`h-3 w-3 transition-transform ${isAddDropdownOpen ? 'rotate-180' : ''}`} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                                <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
                            </svg>
                        </button>

                        {/* 드롭다운 메뉴 */}
                        {isAddDropdownOpen && (
                            <div
                                className="absolute left-0 top-full mt-1 min-w-[140px] rounded-md py-1 shadow-lg z-50"
                                style={{
                                    backgroundColor: 'var(--gantt-bg-primary)',
                                    border: '1px solid var(--gantt-border)',
                                }}
                            >
                                {addMenuItems.map((item, index) => (
                                    <button
                                        key={index}
                                        onClick={item.onClick}
                                        className="flex w-full items-center gap-2 px-3 py-2 text-xs font-medium transition-colors text-left"
                                        style={{ color: 'var(--gantt-text-secondary)' }}
                                        onMouseEnter={(e) => {
                                            e.currentTarget.style.backgroundColor = 'var(--gantt-bg-hover)';
                                        }}
                                        onMouseLeave={(e) => {
                                            e.currentTarget.style.backgroundColor = 'transparent';
                                        }}
                                    >
                                        <span
                                            className="h-2 w-2 rounded-full"
                                            style={{ backgroundColor: item.color }}
                                        />
                                        {item.label}
                                    </button>
                                ))}
                            </div>
                        )}
                    </div>
                )}

                {/* 추가 중 상태 표시 */}
                {isAddingCP && (
                    <span className="text-xs italic" style={{ color: 'var(--gantt-text-muted)' }}>
                        CP 추가 중... (Enter 저장 / Esc 취소)
                    </span>
                )}
            </div>

            {/* 중앙: 통합뷰 + 펼치기/접기 + Focusing 버튼 + 줌 컨트롤 + 기준일 */}
            <div className="flex items-center gap-4">
                {/* 뷰 전환 버튼 (Master ↔ Unified) */}
                {viewMode === 'MASTER' && (
                    <button
                        onClick={() => onViewChange('UNIFIED')}
                        className={BTN_BASE}
                        style={BTN_SECONDARY_STYLE}
                        {...BTN_HOVER_HANDLERS}
                        title="CP와 Task를 계층형으로 통합하여 표시"
                    >
                        <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                            <path strokeLinecap="round" strokeLinejoin="round" d="M4 6h16M4 10h16M4 14h16M4 18h16" />
                        </svg>
                        통합 뷰
                    </button>
                )}
                {viewMode === 'UNIFIED' && (
                    <button
                        onClick={() => onViewChange('MASTER')}
                        className={BTN_BASE}
                        style={BTN_SECONDARY_STYLE}
                        {...BTN_HOVER_HANDLERS}
                        title="마스터 뷰로 전환"
                    >
                        <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                            <path strokeLinecap="round" strokeLinejoin="round" d="M4 6h16M4 12h16M4 18h16" />
                        </svg>
                        마스터 뷰
                    </button>
                )}

                {(onCollapseAll || onExpandAll) && (
                    <div
                        className={BTN_GROUP_CONTAINER}
                        style={{ backgroundColor: 'var(--gantt-bg-tertiary)' }}
                    >
                        {onExpandAll && (
                            <button
                                onClick={onExpandAll}
                                className={`${BTN_GROUP_ITEM} flex items-center gap-1`}
                                style={{ color: 'var(--gantt-text-secondary)' }}
                                onMouseEnter={(e) => {
                                    e.currentTarget.style.backgroundColor = 'var(--gantt-bg-hover)';
                                }}
                                onMouseLeave={(e) => {
                                    e.currentTarget.style.backgroundColor = 'transparent';
                                }}
                                title="모든 그룹 펼치기"
                            >
                                <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                                    <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
                                </svg>
                                펼치기
                            </button>
                        )}
                        {onCollapseAll && (
                            <button
                                onClick={onCollapseAll}
                                className={`${BTN_GROUP_ITEM} flex items-center gap-1`}
                                style={{ color: 'var(--gantt-text-secondary)' }}
                                onMouseEnter={(e) => {
                                    e.currentTarget.style.backgroundColor = 'var(--gantt-bg-hover)';
                                }}
                                onMouseLeave={(e) => {
                                    e.currentTarget.style.backgroundColor = 'transparent';
                                }}
                                title="모든 그룹 접기"
                            >
                                <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                                    <path strokeLinecap="round" strokeLinejoin="round" d="M5 15l7-7 7 7" />
                                </svg>
                                접기
                            </button>
                        )}
                    </div>
                )}

                <button
                    onClick={onScrollToFirst}
                    className={BTN_BASE}
                    style={BTN_SECONDARY_STYLE}
                    {...BTN_HOVER_HANDLERS}
                    title={viewMode === 'MASTER' ? '진행 중인 CP로 스크롤' : viewMode === 'UNIFIED' ? '진행 중인 CP/Task로 스크롤' : '진행 중인 작업으로 스크롤'}
                >
                    Focusing
                </button>

                {/* Compact 토글 버튼 (Detail/Unified View) */}
                {(viewMode === 'DETAIL' || viewMode === 'UNIFIED') && onToggleCompact && (
                    <div
                        className={BTN_GROUP_CONTAINER}
                        style={{ backgroundColor: 'var(--gantt-bg-tertiary)' }}
                    >
                        <button
                            onClick={() => isCompactMode && onToggleCompact()}
                            className={BTN_GROUP_ITEM}
                            style={{
                                backgroundColor: !isCompactMode ? 'var(--gantt-bg-primary)' : 'transparent',
                                color: !isCompactMode ? 'var(--gantt-text-primary)' : 'var(--gantt-text-muted)',
                                boxShadow: !isCompactMode ? '0 1px 2px rgba(0,0,0,0.1)' : 'none',
                            }}
                        >
                            Normal
                        </button>
                        <button
                            onClick={() => !isCompactMode && onToggleCompact()}
                            className={BTN_GROUP_ITEM}
                            style={{
                                backgroundColor: isCompactMode ? 'var(--gantt-bg-primary)' : 'transparent',
                                color: isCompactMode ? 'var(--gantt-text-primary)' : 'var(--gantt-text-muted)',
                                boxShadow: isCompactMode ? '0 1px 2px rgba(0,0,0,0.1)' : 'none',
                            }}
                        >
                            Compact
                        </button>
                    </div>
                )}

                <div
                    className={BTN_GROUP_CONTAINER}
                    style={{ backgroundColor: 'var(--gantt-bg-tertiary)' }}
                >
                    {(viewMode === 'MASTER'
                        ? (['WEEK', 'MONTH'] as const)
                        : viewMode === 'UNIFIED'
                        ? (['DAY', 'WEEK', 'MONTH'] as const)
                        : (['DAY', 'WEEK'] as const)
                    ).map((level) => (
                        <button
                            key={level}
                            onClick={() => onZoomChange(level)}
                            className={BTN_GROUP_ITEM}
                            style={{
                                backgroundColor: zoomLevel === level ? 'var(--gantt-bg-primary)' : 'transparent',
                                color: zoomLevel === level ? 'var(--gantt-text-primary)' : 'var(--gantt-text-muted)',
                                boxShadow: zoomLevel === level ? '0 1px 2px rgba(0,0,0,0.1)' : 'none',
                            }}
                        >
                            {ZOOM_CONFIG[level].label}
                        </button>
                    ))}
                </div>

                <div className="text-sm" style={{ color: 'var(--gantt-text-muted)' }}>
                    기준일: {format(new Date(), 'yyyy-MM-dd')}
                </div>

                {/* 로딩된 파일명 표시 */}
                {loadedFileName && (
                    <div
                        className="flex items-center gap-1.5 rounded-md px-2 py-1"
                        style={{ backgroundColor: 'var(--gantt-bg-tertiary)' }}
                        title={`로딩된 파일: ${loadedFileName}`}
                    >
                        <svg
                            className="h-3.5 w-3.5"
                            fill="none"
                            viewBox="0 0 24 24"
                            stroke="currentColor"
                            strokeWidth={2}
                            style={{ color: 'var(--gantt-text-muted)' }}
                        >
                            <path strokeLinecap="round" strokeLinejoin="round" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                        </svg>
                        <span
                            className="max-w-[150px] truncate text-xs font-medium"
                            style={{ color: 'var(--gantt-text-secondary)' }}
                        >
                            {loadedFileName}
                        </span>
                    </div>
                )}
            </div>

            {/* 오른쪽: 저장/초기화 버튼 */}
            <div className="flex items-center gap-2">
                {onSave && (
                    <button
                        onClick={onSave}
                        disabled={!hasUnsavedChanges || saveStatus === 'saving'}
                        className={BTN_ACTION}
                        style={{
                            backgroundColor: hasUnsavedChanges ? 'var(--gantt-focus)' : 'var(--gantt-bg-tertiary)',
                            color: hasUnsavedChanges ? 'var(--gantt-text-inverse)' : 'var(--gantt-text-muted)',
                            cursor: hasUnsavedChanges ? 'pointer' : 'not-allowed',
                        }}
                    >
                        {saveStatus === 'saving' ? (
                            <>
                                <svg className="h-4 w-4 animate-spin" viewBox="0 0 24 24" fill="none">
                                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                                </svg>
                                저장 중...
                            </>
                        ) : (
                            <>
                                <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                                    <path strokeLinecap="round" strokeLinejoin="round" d="M8 7H5a2 2 0 00-2 2v9a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-3m-1 4l-3 3m0 0l-3-3m3 3V4" />
                                </svg>
                                저장
                            </>
                        )}
                    </button>
                )}

                {onReset && (
                    <button
                        onClick={onReset}
                        className={BTN_ACTION}
                        style={BTN_SECONDARY_STYLE}
                        {...BTN_HOVER_HANDLERS}
                    >
                        <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                            <path strokeLinecap="round" strokeLinejoin="round" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                        </svg>
                        초기화
                    </button>
                )}

                {(onExport || onImport || onExportExcel) && (
                    <div
                        className="h-6 w-px"
                        style={{ backgroundColor: 'var(--gantt-border)' }}
                    />
                )}

                {onImport && (
                    <label
                        className={`${BTN_ACTION} cursor-pointer`}
                        style={{
                            backgroundColor: 'var(--gantt-milestone-detail)',
                            color: 'var(--gantt-text-inverse)',
                        }}
                        {...BTN_ACTION_HOVER}
                    >
                        <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                            <path strokeLinecap="round" strokeLinejoin="round" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" />
                        </svg>
                        가져오기
                        <input
                            type="file"
                            accept=".json"
                            className="hidden"
                            onChange={(e) => {
                                const file = e.target.files?.[0];
                                if (file && onImport) {
                                    onImport(file);
                                    e.target.value = '';
                                }
                            }}
                        />
                    </label>
                )}

                {onExport && (
                    <button
                        onClick={onExport}
                        className={BTN_ACTION}
                        style={{
                            backgroundColor: 'var(--gantt-success)',
                            color: 'var(--gantt-text-inverse)',
                        }}
                        {...BTN_ACTION_HOVER}
                        title="현재 데이터를 JSON 파일로 내보내기"
                    >
                        <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                            <path strokeLinecap="round" strokeLinejoin="round" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                        </svg>
                        JSON
                    </button>
                )}

                {onExportExcel && (
                    <button
                        onClick={onExportExcel}
                        className={BTN_ACTION}
                        style={{
                            backgroundColor: 'var(--gantt-excel)',
                            color: 'var(--gantt-text-inverse)',
                        }}
                        {...BTN_ACTION_HOVER}
                        title="현재 데이터를 Excel 파일로 내보내기 (간트 차트 형태)"
                    >
                        <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                            <path strokeLinecap="round" strokeLinejoin="round" d="M9 17V7m0 10a2 2 0 01-2 2H5a2 2 0 01-2-2V7a2 2 0 012-2h2a2 2 0 012 2m0 10a2 2 0 002 2h2a2 2 0 002-2M9 7a2 2 0 012-2h2a2 2 0 012 2m0 10V7m0 10a2 2 0 002 2h2a2 2 0 002-2V7a2 2 0 00-2-2h-2a2 2 0 00-2 2" />
                        </svg>
                        Excel
                    </button>
                )}
            </div>
        </header>
    );
};
