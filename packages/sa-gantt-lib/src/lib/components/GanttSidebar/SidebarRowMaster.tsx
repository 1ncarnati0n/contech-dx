'use client';

import React, { useCallback, useMemo } from 'react';
import { ChevronRight, ChevronDown, GripVertical } from 'lucide-react';
import { GANTT_LAYOUT, GANTT_COLORS } from '../../types';
import type { SidebarRowMasterProps } from './types';

const { ROW_HEIGHT } = GANTT_LAYOUT;

/** 숫자 포맷팅 - 정수면 그대로, 소수면 1자리까지 표시 */
const formatNum = (n: number): string => Number.isInteger(n) ? n.toString() : n.toFixed(1);

export const SidebarRowMaster: React.FC<SidebarRowMasterProps> = React.memo(({
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
    cpSummary,
    onTaskClick,
}) => {
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
        } else if (isGroup) {
            backgroundColor = 'var(--gantt-bg-secondary)';
        }

        return {
            height: ROW_HEIGHT,
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
    }, [isDragging, isDragOver, dragOverPosition, isFocused, isSelected, isGroup, isVirtualized, rowStart]);

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

    // 배지 스타일 (GANTT_COLORS 상수 사용)
    const badgeStyle = useMemo(() => {
        if (isGroup) {
            // Block 배지
            return {
                backgroundColor: GANTT_COLORS.badgeBlock,
                color: GANTT_COLORS.badgeBlockText,
                border: `1.5px solid ${GANTT_COLORS.badgeBlockBorder}`,
            };
        } else {
            // CP 배지
            return {
                backgroundColor: GANTT_COLORS.vermilion,
                color: 'white',
            };
        }
    }, [isGroup]);

    return (
        <div
            draggable={!!(onTaskReorder || onTaskMove)}
            onDragStart={(e) => onDragStart(e, task.id)}
            onDragOver={(e) => onDragOver(e, task.id, isGroup)}
            onDragLeave={onDragLeave}
            onDrop={(e) => onDrop(e, task.id)}
            onDragEnd={onDragEnd}
            onClick={(e) => onRowClick(e, task, rowIndex)}
            onContextMenu={(e) => onContextMenu(e, task)}
            className="box-border flex items-center transition-all duration-150"
            style={rowStyle}
            onDoubleClick={() => {
                if (isGroup && canExpand) {
                    onToggle(task.id);
                } else if (!isGroup) {
                    onTaskClick(task);
                }
            }}
            title={isGroup && canExpand ? '더블클릭하여 접기/펼치기' : !isGroup ? '더블클릭하여 상세 공정표 보기' : undefined}
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

            {/* CP Name */}
            <div
                className="flex shrink-0 items-center overflow-hidden px-2"
                style={{
                    width: onTaskReorder ? columns[0].width - dragHandleWidth : columns[0].width,
                    paddingLeft: indent + 8,
                    borderRight: '1px solid var(--gantt-border-light)',
                }}
            >
                {canExpand ? (
                    <button
                        onClick={handleToggle}
                        className="mr-1 shrink-0 rounded p-1"
                        style={{ color: 'var(--gantt-text-muted)' }}
                    >
                        {isExpanded ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
                    </button>
                ) : (
                    <div className="w-6 shrink-0" />
                )}

                {/* Block/CP 뱃지 (GANTT_COLORS 상수 사용) */}
                <span
                    className="mr-1.5 shrink-0 rounded px-1 text-[10px] font-medium"
                    style={badgeStyle}
                >
                    {isGroup ? 'B' : 'CP'}
                </span>

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
                            cursor: isGroup ? 'text' : 'default',
                        }}
                        onDoubleClick={handleStartEdit}
                        title={onTaskUpdate ? '더블클릭하여 이름 편집' : undefined}
                    >
                        {task.name}
                    </span>
                )}
            </div>

            {/* Total Duration */}
            <div
                className="flex shrink-0 items-center justify-center text-xs"
                style={{
                    width: columns[1].width,
                    color: 'var(--gantt-text-muted)',
                    borderRight: '1px solid var(--gantt-border-light)',
                }}
            >
                {isGroup ? '-' : cpSummary ? `${cpSummary.totalDays}일` : '-'}
            </div>

            {/* Work Days */}
            <div
                className="flex shrink-0 items-center justify-center text-xs"
                style={{
                    width: columns[2].width,
                    color: GANTT_COLORS.vermilion,
                    borderRight: '1px solid var(--gantt-border-light)',
                }}
            >
                {isGroup ? '-' : cpSummary ? `${formatNum(cpSummary.workDays)}일` : '-'}
            </div>

            {/* Non-Work Days */}
            <div
                className="flex shrink-0 items-center justify-center text-xs"
                style={{ width: columns[3].width, color: GANTT_COLORS.teal }}
            >
                {isGroup ? '-' : cpSummary ? `${formatNum(cpSummary.nonWorkDays)}일` : '-'}
            </div>
        </div>
    );
});
