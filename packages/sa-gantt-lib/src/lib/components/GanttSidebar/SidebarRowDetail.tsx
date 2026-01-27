'use client';

import React, { useCallback, useMemo } from 'react';
import { format } from 'date-fns';
import { ChevronRight, ChevronDown, GripVertical } from 'lucide-react';
import { GANTT_LAYOUT, GANTT_COLORS } from '../../types';
import { DaysInputCell } from './DaysInputCell';
import type { SidebarRowDetailProps } from './types';

const { ROW_HEIGHT, GROUP_ROW_HEIGHT_COMPACT } = GANTT_LAYOUT;

export const SidebarRowDetail: React.FC<SidebarRowDetailProps> = React.memo(({
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
    onTaskDoubleClick,
    editingDays,
    setEditingDays,
    onDurationChange,
    rowHeight,
}) => {
    // Group은 컴팩트 모드에서 21px, Task는 rowHeight 적용 (통합뷰와 동일한 로직)
    const isCompact = (rowHeight ?? ROW_HEIGHT) < ROW_HEIGHT;
    const effectiveRowHeight = isGroup
        ? (isCompact ? GROUP_ROW_HEIGHT_COMPACT : ROW_HEIGHT)
        : (rowHeight ?? ROW_HEIGHT);

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
    }, [isDragging, isDragOver, dragOverPosition, isFocused, isSelected, isGroup, isVirtualized, rowStart, effectiveRowHeight]);

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
            return {
                backgroundColor: GANTT_COLORS.badgeGroup,
                color: 'white',
            };
        }
        return null;
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
            onDoubleClick={() => {
                if (isGroup && canExpand) {
                    onToggle(task.id);
                } else if (!isGroup && task.type === 'TASK' && onTaskDoubleClick) {
                    onTaskDoubleClick(task);
                }
            }}
            onContextMenu={(e) => onContextMenu(e, task)}
            className="box-border flex items-center transition-colors"
            style={rowStyle}
            title={isGroup && canExpand ? '더블클릭하여 접기/펼치기' : !isGroup && task.type === 'TASK' ? '더블클릭하여 공정 설정' : undefined}
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

            {/* Task Name */}
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
                        aria-label={isExpanded ? '접기' : '펼치기'}
                        aria-expanded={isExpanded}
                    >
                        {isExpanded ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
                    </button>
                ) : (
                    <div className="w-6 shrink-0" />
                )}

                {/* Group/Task 뱃지 (GANTT_COLORS 상수 사용) */}
                {isGroup && badgeStyle ? (
                    <span
                        className="mr-1.5 shrink-0 rounded px-1 text-[10px] font-medium"
                        style={badgeStyle}
                    >
                        G
                    </span>
                ) : (
                    <span
                        className="mr-1.5 shrink-0 rounded-full"
                        style={{
                            width: 4,
                            height: 4,
                            backgroundColor: GANTT_COLORS.red,
                        }}
                    />
                )}

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

            {/* Pre Indirect Work Days */}
            <DaysInputCell
                task={task}
                field="indirectWorkDaysPre"
                editingDays={editingDays}
                setEditingDays={setEditingDays}
                onDurationChange={onDurationChange}
                width={columns[1].width}
                rowHeight={rowHeight}
            />

            {/* Net Work Days */}
            <DaysInputCell
                task={task}
                field="netWorkDays"
                editingDays={editingDays}
                setEditingDays={setEditingDays}
                onDurationChange={onDurationChange}
                width={columns[2].width}
                rowHeight={rowHeight}
            />

            {/* Post Indirect Work Days */}
            <DaysInputCell
                task={task}
                field="indirectWorkDaysPost"
                editingDays={editingDays}
                setEditingDays={setEditingDays}
                onDurationChange={onDurationChange}
                width={columns[3].width}
                rowHeight={rowHeight}
            />

            {/* Start Date */}
            <div
                className="flex shrink-0 items-center justify-center text-xs cursor-pointer"
                style={{
                    width: columns[4].width,
                    color: isGroup ? 'var(--gantt-text-muted)' : 'var(--gantt-text-secondary)',
                    borderRight: '1px solid var(--gantt-border-light)',
                }}
                onDoubleClick={(e) => {
                    if (!isGroup && onTaskDoubleClick) {
                        e.stopPropagation();
                        onTaskDoubleClick(task);
                    }
                }}
                title={isGroup ? undefined : '더블클릭하여 시작일 편집'}
            >
                {isGroup ? '-' : format(task.startDate, 'yyyy-MM-dd')}
            </div>

            {/* End Date */}
            <div
                className="flex shrink-0 items-center justify-center text-xs"
                style={{ width: columns[5].width, color: 'var(--gantt-text-muted)' }}
            >
                {isGroup ? '-' : format(task.endDate, 'yyyy-MM-dd')}
            </div>
        </div>
    );
});
