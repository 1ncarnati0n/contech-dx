'use client';

import React, { useCallback, useMemo } from 'react';
import { ChevronRight, ChevronDown, GripVertical } from 'lucide-react';
import { GANTT_COLORS } from '../../types';
import { useSidebarRowStyle, getBadgeStyle, getBadgeText } from './hooks/useSidebarRowStyle';
import type { SidebarRowMasterProps } from './types';

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
    isBlock,
}) => {
    // 공통 스타일 훅 사용
    const { style: rowStyle } = useSidebarRowStyle({
        task,
        viewMode: 'MASTER',
        isDragging,
        isDragOver,
        dragOverPosition,
        isFocused,
        isSelected,
        isBlock: isBlock ?? false,
        isCP: task.type === 'CP',
        isGroup,
        isVirtualized,
        rowStart,
    });

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

    // 배지 스타일 (공통 함수 사용)
    const badgeStyle = useMemo(() => {
        return getBadgeStyle(isBlock ?? false, task.type === 'CP', isGroup);
    }, [isBlock, task.type, isGroup]);

    const badgeText = getBadgeText(isBlock ?? false, task.type === 'CP', isGroup);

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
                if ((isBlock || isGroup) && canExpand) {
                    onToggle(task.id);
                } else if (!isBlock && !isGroup) {
                    onTaskClick(task);
                }
            }}
            title={(isBlock || isGroup) && canExpand ? '더블클릭하여 접기/펼치기' : (!isBlock && !isGroup) ? '더블클릭하여 상세 공정표 보기' : undefined}
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
                    paddingLeft: indent,
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

                {/* Block/CP 뱃지 */}
                {badgeStyle && badgeText && (
                    <span
                        className="mr-1.5 shrink-0 rounded px-1 text-[10px] font-medium"
                        style={badgeStyle}
                    >
                        {badgeText}
                    </span>
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
                            cursor: (isBlock || isGroup) ? 'text' : 'default',
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
                {(isBlock || isGroup) ? '-' : cpSummary ? `${cpSummary.totalDays}일` : '-'}
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
                {(isBlock || isGroup) ? '-' : cpSummary ? `${formatNum(cpSummary.workDays)}일` : '-'}
            </div>

            {/* Non-Work Days */}
            <div
                className="flex shrink-0 items-center justify-center text-xs"
                style={{ width: columns[3].width, color: GANTT_COLORS.teal }}
            >
                {(isBlock || isGroup) ? '-' : cpSummary ? `${formatNum(cpSummary.nonWorkDays)}일` : '-'}
            </div>
        </div>
    );
});
