'use client';

import { forwardRef, useState, useCallback, useEffect, memo } from 'react';
import { addDays } from 'date-fns';
import {
    ConstructionTask,
    GANTT_LAYOUT,
} from '../../types';
import { GanttSidebarContextMenu } from '../GanttSidebarContextMenu';
import { GanttSidebarNewTaskForm } from '../GanttSidebarNewTaskForm';
import { GanttSidebarNewCPForm } from '../GanttSidebarNewCPForm';

// Sub-components
import { SidebarHeader } from './SidebarHeader';
import { SidebarRowMaster } from './SidebarRowMaster';
import { SidebarRowDetail } from './SidebarRowDetail';
import { SidebarRowUnified } from './SidebarRowUnified';
import { MilestoneLaneSpacer } from './MilestoneLaneSpacer';

// Hooks
import {
    useSidebarColumns,
    useSidebarDragDrop,
    useMultiSelect,
    useClipboard,
    useInlineEdit,
    useSidebarData,
} from './hooks';

// Types
import type { GanttSidebarProps } from './types';

const { ROW_HEIGHT } = GANTT_LAYOUT;

const DEFAULT_CALENDAR_SETTINGS = {
    workOnSaturdays: true,
    workOnSundays: false,
    workOnHolidays: false,
};

export const GanttSidebar = memo(forwardRef<HTMLDivElement, GanttSidebarProps>(
    ({
        tasks,
        allTasks,
        viewMode,
        expandedIds,
        onToggle,
        onTaskClick,
        onTaskUpdate,
        onTaskCreate,
        onTaskReorder,
        activeCPId,
        holidays = [],
        calendarSettings,
        virtualRows,
        totalHeight,
        onTotalWidthChange,
        onTaskGroup,
        onTaskUngroup,
        onTaskDelete,
        onTaskMove,
        isAddingTask = false,
        onCancelAddTask,
        isAddingCP = false,
        onCancelAddCP,
        onTaskDoubleClick,
        renderMode = 'all',
        rowHeight,
        // 외부 컬럼 상태 (두 인스턴스 간 공유용)
        externalColumns,
        externalColumnResizeStart,
        externalColumnResizeDoubleClick,
        externalDragHandleWidth,
        externalResizingIndex,
        onOptimalColumnWidth,
    }, ref) => {
        const effectiveRowHeight = rowHeight ?? ROW_HEIGHT;
        const effectiveCalendarSettings = calendarSettings ?? DEFAULT_CALENDAR_SETTINGS;

        // ====================================
        // Data Hook - O(1) Maps, Row Data, Heights
        // ====================================
        const {
            taskMap,
            childrenCountMap,
            cpSummaryMap,
            rowData,
            dynamicTotalHeight,
            activeCPName,
            activeGroupName,
            isVirtualized,
        } = useSidebarData({
            tasks,
            allTasks,
            viewMode,
            activeCPId,
            holidays,
            calendarSettings: effectiveCalendarSettings,
            effectiveRowHeight,
            virtualRows,
        });

        // ====================================
        // Column Hook
        // ====================================
        const internalColumnsHook = useSidebarColumns({
            viewMode,
            tasks,
            allTasks,
            activeCPId,
            cpSummaryMap,
            onTotalWidthChange: externalColumns ? undefined : onTotalWidthChange,
            onTaskReorder,
        });

        // 외부 값이 제공되면 우선 사용 (State Lifting 패턴)
        const columns = externalColumns ?? internalColumnsHook.columns;
        const dragHandleWidth = externalDragHandleWidth ?? internalColumnsHook.dragHandleWidth;
        const resizingIndex = externalResizingIndex ?? internalColumnsHook.resizingIndex;
        const handleColumnResizeStart = externalColumnResizeStart ?? internalColumnsHook.handleColumnResizeStart;

        // 더블클릭 핸들러: 최적 너비 계산 후 콜백 호출
        const handleColumnResizeDoubleClick = useCallback((e: React.MouseEvent, columnIndex: number) => {
            const optimalWidth = internalColumnsHook.calculateOptimalWidth(columnIndex);

            if (onOptimalColumnWidth) {
                onOptimalColumnWidth(columnIndex, optimalWidth);
            }

            if (externalColumnResizeDoubleClick) {
                externalColumnResizeDoubleClick(e, columnIndex);
            } else {
                internalColumnsHook.handleColumnResizeDoubleClick(e, columnIndex);
            }
        }, [internalColumnsHook, onOptimalColumnWidth, externalColumnResizeDoubleClick]);

        // totalWidth는 사용 중인 columns에서 계산
        const totalWidth = columns.reduce((sum, col) => sum + col.width, 0) + dragHandleWidth;

        // depth 함수들은 항상 내부 훅에서 사용
        const { getGroupDepth, getMasterGroupDepth, getUnifiedDepth } = internalColumnsHook;

        // 외부 columns 사용 시 totalWidth 변경 알림
        useEffect(() => {
            if (externalColumns && onTotalWidthChange) {
                onTotalWidthChange(totalWidth);
            }
        }, [externalColumns, totalWidth, onTotalWidthChange]);

        // ====================================
        // Drag & Drop Hook
        // ====================================
        const {
            draggedTaskId,
            dragOverTaskId,
            dragOverPosition,
            handleDragStart,
            handleDragOver,
            handleDragLeave,
            handleDrop,
            handleDragEnd,
        } = useSidebarDragDrop({ tasks, onTaskReorder, onTaskMove });

        // ====================================
        // Selection Hook
        // ====================================
        const {
            selectedTaskIds,
            focusedTaskId,
            handleRowClick,
            clearSelection,
            selectTask,
        } = useMultiSelect({ tasks, draggedTaskId });

        // ====================================
        // Clipboard Hook
        // ====================================
        useClipboard({
            selectedTaskIds,
            allTasks,
            viewMode,
            activeCPId,
            onTaskCreate,
        });

        // ====================================
        // Inline Edit Hook
        // ====================================
        const {
            editingTaskId,
            editingName,
            setEditingName,
            editInputRef,
            handleStartEdit,
            handleStartRename,
            handleSaveEdit,
            handleEditKeyDown,
        } = useInlineEdit({ tasks, onTaskUpdate });

        // ====================================
        // Local State
        // ====================================
        const [contextMenu, setContextMenu] = useState<{ x: number; y: number; taskId: string } | null>(null);
        const [editingDays, setEditingDays] = useState<{ taskId: string; field: string; value: string } | null>(null);

        // ====================================
        // Context Menu Handler
        // ====================================
        const handleContextMenu = useCallback((e: React.MouseEvent, task: ConstructionTask) => {
            e.preventDefault();
            if (!selectedTaskIds.has(task.id)) {
                selectTask(task.id);
            }
            setContextMenu({
                x: e.clientX,
                y: e.clientY,
                taskId: task.id,
            });
        }, [selectedTaskIds, selectTask]);

        // 외부 클릭 시 컨텍스트 메뉴 닫기
        useEffect(() => {
            const handleClickOutside = () => setContextMenu(null);
            if (contextMenu) {
                document.addEventListener('click', handleClickOutside);
                return () => document.removeEventListener('click', handleClickOutside);
            }
        }, [contextMenu]);

        // 키보드 단축키 (ESC)
        useEffect(() => {
            const handleKeyDown = (e: KeyboardEvent) => {
                if (e.key === 'Escape') {
                    clearSelection();
                    setContextMenu(null);
                }
            };
            document.addEventListener('keydown', handleKeyDown);
            return () => document.removeEventListener('keydown', handleKeyDown);
        }, [clearSelection]);

        // ====================================
        // Duration Change Handler
        // ====================================
        const handleDurationChange = useCallback((
            task: ConstructionTask,
            field: 'indirectWorkDaysPre' | 'netWorkDays' | 'indirectWorkDaysPost',
            value: number
        ) => {
            if (!task.task || !onTaskUpdate) return;

            const oldPreDays = task.task.indirectWorkDaysPre;
            const oldPostDays = task.task.indirectWorkDaysPost;

            const netWorkStartDate = addDays(task.startDate, oldPreDays);
            const netWorkEndDate = addDays(task.endDate, -oldPostDays);

            let newStartDate = task.startDate;
            let newEndDate = task.endDate;

            if (field === 'indirectWorkDaysPre') {
                newStartDate = addDays(netWorkStartDate, -value);
            } else if (field === 'indirectWorkDaysPost') {
                newEndDate = addDays(netWorkEndDate, value);
            }

            const updatedTask: ConstructionTask = {
                ...task,
                startDate: newStartDate,
                endDate: newEndDate,
                task: { ...task.task, [field]: value },
            };
            onTaskUpdate(updatedTask);
        }, [onTaskUpdate]);

        // ====================================
        // Shared Props for Row Components
        // ====================================
        const sharedRowProps = {
            isVirtualized,
            draggedTaskId,
            dragOverTaskId,
            dragOverPosition,
            selectedTaskIds,
            focusedTaskId,
            expandedIds,
            editingTaskId,
            editingName,
            setEditingName,
            editInputRef,
            columns,
            dragHandleWidth,
            onDragStart: handleDragStart,
            onDragOver: handleDragOver,
            onDragLeave: handleDragLeave,
            onDrop: handleDrop,
            onDragEnd: handleDragEnd,
            onRowClick: handleRowClick,
            onContextMenu: handleContextMenu,
            onToggle,
            onStartEdit: handleStartEdit,
            onSaveEdit: handleSaveEdit,
            onEditKeyDown: handleEditKeyDown,
            onTaskReorder,
            onTaskMove,
            onTaskUpdate,
        };

        // ====================================
        // Context Menu Component
        // ====================================
        const contextMenuElement = contextMenu && (
            <GanttSidebarContextMenu
                x={contextMenu.x}
                y={contextMenu.y}
                taskId={contextMenu.taskId}
                selectedTaskIds={selectedTaskIds}
                tasks={tasks}
                onTaskGroup={onTaskGroup}
                onTaskUngroup={onTaskUngroup}
                onTaskDelete={onTaskDelete}
                onStartRename={handleStartRename}
                onClose={() => setContextMenu(null)}
                onDeselect={clearSelection}
            />
        );

        // ====================================
        // Render Row Content by ViewMode
        // ====================================
        const renderRowContent = () => {
            if (viewMode === 'MASTER') {
                return (
                    <>
                        {rowData.map((row) => {
                            const task = tasks[row.index];
                            if (!task) return null;

                            const isGroup = task.type === 'GROUP';
                            const canExpand = isGroup && (childrenCountMap.get(task.id) || 0) > 0;
                            const cpSummary = task.type === 'CP' ? cpSummaryMap.get(task.id) || null : null;

                            return (
                                <SidebarRowMaster
                                    key={row.key}
                                    task={task}
                                    rowIndex={row.index}
                                    rowStart={row.start}
                                    isDragging={draggedTaskId === task.id}
                                    isDragOver={dragOverTaskId === task.id}
                                    isSelected={selectedTaskIds.has(task.id)}
                                    isFocused={focusedTaskId === task.id}
                                    isExpanded={expandedIds.has(task.id)}
                                    canExpand={canExpand}
                                    indent={getMasterGroupDepth(task) * 12}
                                    isGroup={isGroup}
                                    cpSummary={cpSummary}
                                    onTaskClick={onTaskClick}
                                    {...sharedRowProps}
                                />
                            );
                        })}
                        {isAddingCP && (
                            <GanttSidebarNewCPForm
                                columns={columns}
                                tasks={tasks}
                                onTaskCreate={onTaskCreate}
                                onCancel={onCancelAddCP || (() => { })}
                                isVirtualized={isVirtualized}
                                virtualRowIndex={tasks.length}
                                dragHandleWidth={dragHandleWidth}
                            />
                        )}
                    </>
                );
            }

            if (viewMode === 'UNIFIED') {
                return rowData.map((row) => {
                    const task = tasks[row.index];
                    if (!task) return null;

                    const isCP = task.type === 'CP';
                    const isGroup = task.type === 'GROUP';
                    const parentTask = task.parentId ? taskMap.get(task.parentId) : null;
                    const isBlock = isGroup && (!parentTask || parentTask.type !== 'CP');
                    const canExpand = (isCP || isGroup) && (childrenCountMap.get(task.id) || 0) > 0;

                    return (
                        <SidebarRowUnified
                            key={row.key}
                            task={task}
                            rowIndex={row.index}
                            rowStart={row.start}
                            isDragging={draggedTaskId === task.id}
                            isDragOver={dragOverTaskId === task.id}
                            isSelected={selectedTaskIds.has(task.id)}
                            isFocused={focusedTaskId === task.id}
                            isExpanded={expandedIds.has(task.id)}
                            canExpand={canExpand}
                            indent={getUnifiedDepth(task) * 16}
                            isGroup={isGroup && !isBlock}
                            isCP={isCP}
                            isBlock={isBlock}
                            rowHeight={row.size}
                            onTaskClick={onTaskClick}
                            onTaskDoubleClick={onTaskDoubleClick}
                            {...sharedRowProps}
                        />
                    );
                });
            }

            // DETAIL View
            return (
                <>
                    {rowData.map((row) => {
                        const task = tasks[row.index];
                        if (!task) return null;

                        const isGroup = task.type === 'GROUP';
                        const canExpand = isGroup && (childrenCountMap.get(task.id) || 0) > 0;

                        return (
                            <SidebarRowDetail
                                key={row.key}
                                task={task}
                                rowIndex={row.index}
                                rowStart={row.start}
                                isDragging={draggedTaskId === task.id}
                                isDragOver={dragOverTaskId === task.id}
                                isSelected={selectedTaskIds.has(task.id)}
                                isFocused={focusedTaskId === task.id}
                                isExpanded={expandedIds.has(task.id)}
                                canExpand={canExpand}
                                indent={getGroupDepth(task) * 12}
                                isGroup={isGroup}
                                rowHeight={row.size}
                                editingDays={editingDays}
                                setEditingDays={setEditingDays}
                                onDurationChange={handleDurationChange}
                                onTaskDoubleClick={onTaskDoubleClick}
                                {...sharedRowProps}
                            />
                        );
                    })}
                    {isAddingTask && activeCPId && (
                        <GanttSidebarNewTaskForm
                            columns={columns}
                            tasks={tasks}
                            activeCPId={activeCPId}
                            onTaskCreate={onTaskCreate}
                            onCancel={onCancelAddTask || (() => { })}
                            isVirtualized={isVirtualized}
                            virtualRowIndex={tasks.length}
                        />
                    )}
                </>
            );
        };

        // ====================================
        // Header Only Mode (스크롤 외부용)
        // ====================================
        if (renderMode === 'header') {
            return (
                <div
                    className="flex flex-col select-none shrink-0"
                    style={{ backgroundColor: 'var(--gantt-bg-primary)' }}
                >
                    <SidebarHeader
                        viewMode={viewMode}
                        activeGroupName={activeGroupName}
                        activeCPName={activeCPName}
                        columns={columns}
                        resizingIndex={resizingIndex}
                        selectedTaskIds={selectedTaskIds}
                        tasks={tasks}
                        onColumnResizeStart={handleColumnResizeStart}
                        onColumnResizeDoubleClick={handleColumnResizeDoubleClick}
                        onTaskGroup={onTaskGroup}
                        onTaskUngroup={onTaskUngroup}
                        onClearSelection={clearSelection}
                        dragHandleWidth={dragHandleWidth}
                    />

                    <MilestoneLaneSpacer
                        columns={columns}
                        dragHandleWidth={dragHandleWidth}
                        totalWidth={totalWidth}
                    />

                    {resizingIndex !== null && (
                        <div className="fixed inset-0 z-50 cursor-col-resize" />
                    )}
                </div>
            );
        }

        // ====================================
        // Content Only Mode (스크롤 내부용)
        // ====================================
        if (renderMode === 'content') {
            return (
                <div
                    ref={ref}
                    className="relative select-none"
                    style={{ backgroundColor: 'var(--gantt-bg-primary)' }}
                    onClick={clearSelection}
                >
                    <div
                        style={{
                            minWidth: totalWidth,
                            height: isVirtualized ? totalHeight : dynamicTotalHeight,
                            position: 'relative',
                        }}
                        onClick={clearSelection}
                    >
                        {renderRowContent()}
                    </div>

                    {contextMenuElement}
                </div>
            );
        }

        // ====================================
        // Full Mode (기존 방식, 하위 호환용)
        // ====================================
        return (
            <div
                className="flex h-full flex-col select-none"
                style={{ backgroundColor: 'var(--gantt-bg-primary)' }}
            >
                <SidebarHeader
                    viewMode={viewMode}
                    activeGroupName={activeGroupName}
                    activeCPName={activeCPName}
                    columns={columns}
                    resizingIndex={resizingIndex}
                    selectedTaskIds={selectedTaskIds}
                    tasks={tasks}
                    onColumnResizeStart={handleColumnResizeStart}
                    onColumnResizeDoubleClick={handleColumnResizeDoubleClick}
                    onTaskGroup={onTaskGroup}
                    onTaskUngroup={onTaskUngroup}
                    onClearSelection={clearSelection}
                    dragHandleWidth={dragHandleWidth}
                />

                {resizingIndex !== null && (
                    <div className="fixed inset-0 z-50 cursor-col-resize" />
                )}

                <div
                    ref={ref}
                    className="relative flex-1"
                    onClick={clearSelection}
                >
                    <MilestoneLaneSpacer
                        columns={columns}
                        dragHandleWidth={dragHandleWidth}
                        totalWidth={totalWidth}
                    />

                    <div
                        style={{
                            minWidth: totalWidth,
                            height: isVirtualized ? totalHeight : dynamicTotalHeight,
                            position: 'relative',
                        }}
                        onClick={clearSelection}
                    >
                        {renderRowContent()}
                    </div>
                </div>

                {contextMenuElement}
            </div>
        );
    }
));

GanttSidebar.displayName = 'GanttSidebar';
