'use client';

import React, { useCallback, useMemo } from 'react';
import { format, differenceInDays } from 'date-fns';
import { ChevronRight, ChevronDown, GripVertical } from 'lucide-react';
import { GANTT_LAYOUT, GANTT_COLORS } from '../../types';
import type { SidebarRowUnifiedProps } from './types';

const { ROW_HEIGHT, GROUP_ROW_HEIGHT_COMPACT } = GANTT_LAYOUT;

/**
 * Unified View 전용 사이드바 행 컴포넌트
 *
 * CP(Level 1)와 Task(Level 2)를 계층형 트리 구조로 표시합니다.
 * - 작업명 (계층적 들여쓰기 + CP/T 배지)
 * - 기간 (일수)
 * - 시작일
 * - 종료일
 */
export const SidebarRowUnified: React.FC<SidebarRowUnifiedProps> = React.memo(({
    task,
    rowIndex,
    isVirtualized,
    rowStart,
    isDragging,
    isDragOver,
    dragOverPosition,
    isSelected,
    isFocused,
    isExpanded,
    canExpand,
    indent,
    isGroup,
    isCP,
    isBlock,
    onDragStart,
    onDragOver,
    onDragLeave,
    onDrop,
    onDragEnd,
    onRowClick,
    onContextMenu,
    onToggle,
    editingTaskId,
    editingName,
    setEditingName,
    editInputRef,
    onStartEdit,
    onSaveEdit,
    onEditKeyDown,
    columns,
    dragHandleWidth,
    onTaskReorder,
    onTaskMove,
    onTaskUpdate,
    onTaskClick,
    rowHeight,
    onTaskDoubleClick,
}) => {
    // Block, CP는 고정 높이 30px, Group은 컴팩트 시 21px, Task는 rowHeight 적용
    const isCompact = (rowHeight ?? ROW_HEIGHT) < ROW_HEIGHT;
    const effectiveRowHeight = (isBlock || isCP)
        ? ROW_HEIGHT
        : isGroup
            ? (isCompact ? GROUP_ROW_HEIGHT_COMPACT : ROW_HEIGHT)
            : (rowHeight ?? ROW_HEIGHT);
    // 기간 계산
    const duration = useMemo(() => {
        return differenceInDays(task.endDate, task.startDate) + 1;
    }, [task.startDate, task.endDate]);

    // 행 스타일 계산 (메모이제이션)
    const rowStyle = useMemo(() => {
        let backgroundColor = 'var(--gantt-bg-primary)';
        let borderColor = 'var(--gantt-border-light)';
        let boxShadow = 'none';

        if (isDragging) {
            backgroundColor = 'var(--gantt-bg-selected)';
        } else if (isDragOver) {
            if (dragOverPosition === 'into') {
                backgroundColor = 'var(--gantt-bg-selected)';
                borderColor = 'var(--gantt-focus)';
                boxShadow = 'inset 0 0 0 2px var(--gantt-focus)';
            }
        } else if (isFocused) {
            backgroundColor = 'var(--gantt-bg-selected)';
            boxShadow = 'inset 0 0 0 2px var(--gantt-focus)';
        } else if (isSelected) {
            backgroundColor = 'var(--gantt-bg-selected)';
            boxShadow = 'inset 0 0 0 2px rgba(59, 130, 246, 0.3)';
        } else if (isBlock) {
            // 블록 행 강조 (최상위 계층)
            backgroundColor = 'var(--gantt-bg-tertiary)';
        } else if (isCP) {
            // CP 행 강조
            backgroundColor = 'var(--gantt-bg-secondary)';
        } else if (isGroup) {
            backgroundColor = 'var(--gantt-bg-secondary)';
        }

        return {
            height: effectiveRowHeight,
            backgroundColor,
            borderBottom: `1px solid ${borderColor}`,
            borderTop: isDragOver && dragOverPosition === 'before' ? '2px solid var(--gantt-focus)' : 'none',
            boxShadow,
            opacity: isDragging ? 0.5 : 1,
            ...(isVirtualized ? {
                position: 'absolute' as const,
                top: 0,
                left: 0,
                width: '100%',
                transform: `translateY(${rowStart}px)`,
            } : {}),
        };
    }, [isDragging, isDragOver, dragOverPosition, isFocused, isSelected, isBlock, isCP, isGroup, isVirtualized, rowStart, effectiveRowHeight]);

    // 토글 핸들러 메모이제이션
    const handleToggle = useCallback((e: React.MouseEvent) => {
        e.stopPropagation();
        onToggle(task.id);
    }, [onToggle, task.id]);

    // 편집 시작 핸들러 메모이제이션
    const handleStartEdit = useCallback((e: React.MouseEvent) => {
        if (onTaskUpdate) {
            e.stopPropagation();
            onStartEdit(task);
        }
    }, [onTaskUpdate, onStartEdit, task]);

    // 타입 배지 색상 (GANTT_COLORS 상수 사용)
    const badgeStyle = useMemo(() => {
        if (isBlock) {
            return {
                backgroundColor: GANTT_COLORS.badgeBlock,
                color: GANTT_COLORS.badgeBlockText,
                border: `1.5px solid ${GANTT_COLORS.badgeBlockBorder}`,
            };
        } else if (isCP) {
            return {
                backgroundColor: GANTT_COLORS.vermilion,
                color: 'white',
            };
        } else if (isGroup) {
            return {
                backgroundColor: GANTT_COLORS.badgeGroup,
                color: 'white',
            };
        } else {
            return {
                backgroundColor: GANTT_COLORS.red,
                color: 'white',
            };
        }
    }, [isBlock, isCP, isGroup]);

    return (
        <div
            draggable={!!(onTaskReorder || onTaskMove)}
            onDragStart={(e) => onDragStart(e, task.id)}
            onDragOver={(e) => onDragOver(e, task.id, isGroup || isCP)}
            onDragLeave={onDragLeave}
            onDrop={(e) => onDrop(e, task.id)}
            onDragEnd={onDragEnd}
            onClick={(e) => onRowClick(e, task, rowIndex)}
            onContextMenu={(e) => onContextMenu(e, task)}
            className="box-border flex items-center transition-all duration-150"
            style={rowStyle}
            onDoubleClick={() => {
                if (canExpand) {
                    onToggle(task.id);
                } else if (onTaskDoubleClick) {
                    onTaskDoubleClick(task);
                } else if (onTaskClick) {
                    onTaskClick(task);
                }
            }}
            title={canExpand ? '더블클릭하여 접기/펼치기' : undefined}
        >
            {/* Drag Handle */}
            {onTaskReorder && (
                <div
                    className="flex shrink-0 items-center justify-center cursor-grab active:cursor-grabbing"
                    style={{ width: dragHandleWidth, color: 'var(--gantt-text-muted)' }}
                >
                    <GripVertical size={14} />
                </div>
            )}

            {/* 작업명 (계층적 들여쓰기) */}
            <div
                className="flex shrink-0 items-center overflow-hidden px-2"
                style={{
                    width: onTaskReorder ? columns[0].width - dragHandleWidth : columns[0].width,
                    paddingLeft: indent + 8,
                    borderRight: '1px solid var(--gantt-border-light)',
                }}
            >
                {/* 접기/펼치기 아이콘 (A11y 개선: aria-label, aria-expanded 추가) */}
                {canExpand ? (
                    <button
                        onClick={handleToggle}
                        className="mr-1 shrink-0 rounded p-1"
                        style={{ color: 'var(--gantt-text-muted)' }}
                        aria-label={isExpanded ? '접기' : '펼치기'}
                        aria-expanded={isExpanded}
                    >
                        {isExpanded ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
                    </button>
                ) : (
                    <div className="w-6 shrink-0" />
                )}

                {/* Block/CP/GROUP/Task 구분 배지 */}
                {(isBlock || isCP || isGroup) ? (
                    <span
                        className="mr-1.5 shrink-0 rounded px-1 text-[10px] font-medium"
                        style={badgeStyle}
                    >
                        {isBlock ? 'B' : isCP ? 'CP' : 'G'}
                    </span>
                ) : (
                    /* Task는 작은 점으로 표시 */
                    <span
                        className="mr-1.5 shrink-0 rounded-full"
                        style={{
                            width: 4,
                            height: 4,
                            backgroundColor: GANTT_COLORS.red,
                        }}
                    />
                )}

                {/* 이름 */}
                {editingTaskId === task.id ? (
                    <input
                        ref={editInputRef}
                        type="text"
                        value={editingName}
                        onChange={(e) => setEditingName(e.target.value)}
                        onKeyDown={onEditKeyDown}
                        onBlur={onSaveEdit}
                        onClick={(e) => e.stopPropagation()}
                        className="w-full rounded px-1 py-0.5 text-xs font-normal focus:outline-none focus:ring-1"
                        style={{
                            backgroundColor: 'var(--gantt-bg-primary)',
                            color: 'var(--gantt-text-secondary)',
                            border: '1px solid var(--gantt-focus)',
                        }}
                    />
                ) : (
                    <span
                        className="truncate text-xs"
                        style={{
                            fontWeight: 500,
                            color: 'var(--gantt-text-primary)',
                        }}
                        onDoubleClick={handleStartEdit}
                        title={onTaskUpdate ? '더블클릭하여 이름 편집' : undefined}
                    >
                        {task.name}
                    </span>
                )}
            </div>

            {/* 기간 */}
            <div
                className="flex shrink-0 items-center justify-center text-xs"
                style={{
                    width: columns[1].width,
                    color: 'var(--gantt-text-muted)',
                    borderRight: '1px solid var(--gantt-border-light)',
                }}
            >
                {(isGroup || isBlock) ? '-' : `${duration}일`}
            </div>

            {/* 시작일 */}
            <div
                className="flex shrink-0 items-center justify-center text-xs"
                style={{
                    width: columns[2].width,
                    color: 'var(--gantt-text-secondary)',
                    borderRight: '1px solid var(--gantt-border-light)',
                }}
            >
                {(isGroup || isBlock) ? '-' : format(task.startDate, 'yyyy-MM-dd')}
            </div>

            {/* 종료일 */}
            <div
                className="flex shrink-0 items-center justify-center text-xs"
                style={{ width: columns[3].width, color: 'var(--gantt-text-muted)' }}
            >
                {(isGroup || isBlock) ? '-' : format(task.endDate, 'yyyy-MM-dd')}
            </div>
        </div>
    );
});

SidebarRowUnified.displayName = 'SidebarRowUnified';
