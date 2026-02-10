'use client';

import { useRef, useCallback, useMemo, useState, useEffect } from 'react';
import { KOREAN_HOLIDAYS_ALL } from '../../utils/dateUtils';
import { GanttSidebar } from '../GanttSidebar';
import { GanttTimeline, BarDragResult } from '../GanttTimeline';
import { MilestoneEditModal } from '../MilestoneEditModal';
import { TaskEditModal } from '../TaskEditModal';
import {
    useGanttViewState,
    useGanttViewActions,
    useGanttSidebar,
    useGanttExpansion,
    useGanttSelection,
    useGanttCompactMode,
} from '../../store/useGanttStore';
import { useGanttVirtualization } from '../../hooks/useGanttVirtualization';
import { useTaskFocus } from '../../hooks/useTaskFocus';
import { useKeyboardNavigation } from '../../hooks/useKeyboardNavigation';
import { calculateDateRange } from '../../utils/dateUtils';
import { GanttProvider } from '../../context/GanttContext';
import {
    GanttChartProps,
    ConstructionTask,
    CalendarSettings,
    ZOOM_CONFIG,
    getLayoutValues,
} from '../../types';

// Sub-components
import { GanttHeader } from './GanttHeader';

// Hooks
import {
    useGanttInit,
    useScrollToDate,
    useSidebarResize,
    useSidebarColumns,
    useExpandCollapse,
    useGanttHandlers,
    useVisibleTasks,
} from './hooks';

export type { BarDragResult };

const DEFAULT_CALENDAR_SETTINGS: CalendarSettings = {
    workOnSaturdays: true,
    workOnSundays: false,
    workOnHolidays: false,
};

export function GanttChart({
    tasks,
    milestones = [],
    holidays = KOREAN_HOLIDAYS_ALL,
    calendarSettings = DEFAULT_CALENDAR_SETTINGS,
    initialView = 'MASTER',
    initialZoomLevel = 'MONTH',
    initialExpandedIds,
    onTaskUpdate,
    onTaskCreate,
    onTaskDelete,
    onTaskReorder,
    onTaskGroup,
    onTaskUngroup,
    onTaskBlockify,
    onTaskMove,
    onGroupDrag,
    onViewChange,
    groupDependencies = [],
    onGroupDependencyCreate,
    onGroupDependencyDelete,
    onGroupCycleDetected,
    onMilestoneCreate,
    onMilestoneUpdate,
    onMilestoneDelete,
    onSave,
    onReset,
    hasUnsavedChanges,
    saveStatus,
    onExport,
    onExportExcel,
    onImport,
    loadedFileName,
    onError,
    className,
    style,
}: GanttChartProps) {
    // ========================================
    // Store State & Actions
    // ========================================
    const { viewMode, activeCPId, zoomLevel } = useGanttViewState();
    const { setViewMode, setZoomLevel } = useGanttViewActions();
    const { sidebarWidth, setSidebarWidth } = useGanttSidebar();
    const { expandedTaskIds, toggleTask, expandAll, collapseAll, setExpandedTaskIds } = useGanttExpansion();
    const { focusedTaskId } = useGanttSelection();
    const { isCompactMode, toggleCompactMode } = useGanttCompactMode();

    // Compact Mode Layout Values
    const layoutValues = useMemo(() =>
        getLayoutValues((viewMode === 'DETAIL' || viewMode === 'UNIFIED') && isCompactMode),
        [viewMode, isCompactMode]
    );

    // ========================================
    // Refs
    // ========================================
    const containerRef = useRef<HTMLDivElement>(null);
    const scrollRef = useRef<HTMLDivElement>(null);
    const headerTimelineRef = useRef<HTMLDivElement>(null);

    // ========================================
    // Local States
    // ========================================
    const [isAddingTask, setIsAddingTask] = useState(false);
    const [isAddingCP, setIsAddingCP] = useState(false);
    const [sidebarTotalWidth, setSidebarTotalWidth] = useState<number | null>(null);
    const [isViewSwitching, setIsViewSwitching] = useState(false);
    const viewSwitchRafRef = useRef<number | null>(null);
    const viewSwitchResetRafRef = useRef<number | null>(null);

    // ========================================
    // Sidebar Columns Hook
    // ========================================
    const {
        columns: sidebarColumns,
        dragHandleWidth: sidebarDragHandleWidth,
        resizingIndex: sidebarResizingIndex,
        handleColumnResizeStart: handleSidebarColumnResizeStart,
        handleColumnResizeDoubleClick: handleSidebarColumnResizeDoubleClick,
        handleOptimalColumnWidth,
    } = useSidebarColumns({
        viewMode,
        hasReorder: !!onTaskReorder,
    });

    // ========================================
    // Expand/Collapse Hook
    // ========================================
    const { expandNextLevel, collapseLastLevel } = useExpandCollapse({
        tasks,
        viewMode,
        activeCPId,
        expandedTaskIds,
        setExpandedTaskIds,
    });

    // ========================================
    // Handlers Hook
    // ========================================
    const {
        editingMilestone,
        isEditModalOpen,
        isNewMilestone,
        editingTask,
        isTaskEditModalOpen,
        handleViewChange,
        handleTaskClick,
        handleMilestoneDoubleClick,
        handleStartAddMilestone,
        handleContextMenuAddMilestone,
        handleCloseEditModal,
        handleMilestoneSave,
        handleMilestoneDelete,
        handleTaskDoubleClick,
        handleContextMenuAddTask,
        handleCloseTaskEditModal,
        handleTaskEditSave,
        handleTaskEditDelete,
        handleBarDrag,
        handleGroupDrag,
    } = useGanttHandlers({
        tasks,
        milestones,
        viewMode,
        activeCPId,
        holidays,
        calendarSettings,
        onTaskUpdate,
        onTaskCreate,
        onTaskDelete,
        onMilestoneCreate,
        onMilestoneUpdate,
        onMilestoneDelete,
        onGroupDrag,
        onViewChange,
        onError,
        setViewMode,
    });

    // ========================================
    // View Transition Loading
    // ========================================
    const runViewSwitchTransition = useCallback((action: () => void) => {
        if (typeof window === 'undefined') {
            action();
            return;
        }

        if (viewSwitchRafRef.current !== null) {
            window.cancelAnimationFrame(viewSwitchRafRef.current);
            viewSwitchRafRef.current = null;
        }
        if (viewSwitchResetRafRef.current !== null) {
            window.cancelAnimationFrame(viewSwitchResetRafRef.current);
            viewSwitchResetRafRef.current = null;
        }

        setIsViewSwitching(true);
        viewSwitchRafRef.current = window.requestAnimationFrame(() => {
            try {
                action();
            } finally {
                viewSwitchResetRafRef.current = window.requestAnimationFrame(() => {
                    setIsViewSwitching(false);
                    viewSwitchRafRef.current = null;
                    viewSwitchResetRafRef.current = null;
                });
            }
        });
    }, []);

    const handleViewChangeWithLoading = useCallback((mode: 'MASTER' | 'DETAIL' | 'UNIFIED', cpId?: string) => {
        const nextCPId = cpId ?? null;
        const isSameMode = mode === viewMode;
        const isSameTarget = mode !== 'DETAIL' || nextCPId === activeCPId;

        if (isSameMode && isSameTarget) {
            handleViewChange(mode, cpId);
            return;
        }

        runViewSwitchTransition(() => {
            handleViewChange(mode, cpId);
        });
    }, [activeCPId, handleViewChange, runViewSwitchTransition, viewMode]);

    const handleTaskClickWithLoading = useCallback((task: ConstructionTask) => {
        if (viewMode === 'MASTER' && task.type === 'CP') {
            handleViewChangeWithLoading('DETAIL', task.id);
            return;
        }
        handleTaskClick(task);
    }, [viewMode, handleTaskClick, handleViewChangeWithLoading]);

    useEffect(() => {
        return () => {
            if (viewSwitchRafRef.current !== null) {
                window.cancelAnimationFrame(viewSwitchRafRef.current);
            }
            if (viewSwitchResetRafRef.current !== null) {
                window.cancelAnimationFrame(viewSwitchResetRafRef.current);
            }
        };
    }, []);

    // ========================================
    // Scroll Sync Handler
    // ========================================
    const handleContentScroll = useCallback(() => {
        if (scrollRef.current && headerTimelineRef.current) {
            headerTimelineRef.current.scrollLeft = scrollRef.current.scrollLeft;
        }
    }, []);

    // ========================================
    // Initialize
    // ========================================
    useGanttInit({
        tasks,
        initialView,
        initialZoomLevel,
        initialExpandedIds,
        setViewMode,
        setZoomLevel,
        expandAll,
        collapseAll,
    });

    // ========================================
    // Visible Tasks Calculation (분리 훅)
    // ========================================
    const visibleTasks = useVisibleTasks({
        tasks,
        viewMode,
        activeCPId,
        expandedTaskIds,
    });

    // ========================================
    // Virtualization
    // ========================================
    const { virtualRows, totalHeight, virtualizer } = useGanttVirtualization({
        containerRef: scrollRef,
        count: visibleTasks.length,
        overscan: 30,
        rowHeight: layoutValues.rowHeight,
        tasks: visibleTasks,
        allTasks: tasks,
    });

    // ========================================
    // Date Range (for focus)
    // ========================================
    const { minDate } = useMemo(() =>
        calculateDateRange(tasks, milestones, 60),
        [tasks, milestones]
    );

    // ========================================
    // Task Focus Hook
    // ========================================
    const { focusTask } = useTaskFocus({
        scrollContainerRef: scrollRef,
        virtualizer,
        visibleTasks,
        allTasks: tasks,
        minDate,
        pixelsPerDay: ZOOM_CONFIG[zoomLevel].pixelsPerDay,
        sidebarWidth,
    });

    // ========================================
    // Sidebar Resize Hook
    // ========================================
    const { isResizing, handleResizeStart, handleResizeDoubleClick } = useSidebarResize({
        sidebarWidth,
        setSidebarWidth,
        viewMode,
        sidebarTotalWidth,
    });

    // ========================================
    // Scroll to Date Hook
    // ========================================
    const { scrollToFirstTask } = useScrollToDate({
        scrollRef,
        viewMode,
        activeCPId,
        zoomLevel,
        sidebarWidth,
        tasks,
        visibleTasks,
        milestones,
    });

    // ========================================
    // Keyboard Navigation Hook
    // ========================================
    useKeyboardNavigation({
        visibleTasks,
        viewMode,
        onViewChange: handleViewChangeWithLoading,
        focusTask,
        onTaskEdit: handleTaskDoubleClick,
    });

    const timelineConfig = useMemo(() => ({
        holidays,
        calendarSettings,
    }), [holidays, calendarSettings]);

    const zoomConfig = useMemo(() => ({
        level: zoomLevel,
        pixelsPerDay: ZOOM_CONFIG[zoomLevel].pixelsPerDay,
        setLevel: setZoomLevel,
    }), [zoomLevel, setZoomLevel]);

    const sidebarConfig = useMemo(() => ({
        width: sidebarWidth,
        totalWidth: sidebarTotalWidth,
        setWidth: setSidebarWidth,
        setTotalWidth: setSidebarTotalWidth,
    }), [sidebarWidth, sidebarTotalWidth, setSidebarWidth, setSidebarTotalWidth]);

    // ========================================
    // Shared Props for Sidebar
    // ========================================
    const sidebarSharedProps = useMemo(() => ({
        tasks: visibleTasks,
        allTasks: tasks,
        viewMode,
        expandedIds: expandedTaskIds,
        onToggle: toggleTask,
        onTaskClick: handleTaskClickWithLoading,
        onTaskUpdate,
        onTaskCreate,
        onTaskReorder,
        onTaskGroup,
        onTaskUngroup,
        onTaskBlockify,
        onTaskDelete,
        onTaskMove,
        activeCPId,
        holidays,
        calendarSettings,
        virtualRows,
        totalHeight,
        onTotalWidthChange: setSidebarTotalWidth,
        isAddingTask,
        onCancelAddTask: () => setIsAddingTask(false),
        isAddingCP,
        onCancelAddCP: () => setIsAddingCP(false),
        onTaskDoubleClick: handleTaskDoubleClick,
        rowHeight: layoutValues.rowHeight,
        externalColumns: sidebarColumns,
        externalColumnResizeStart: handleSidebarColumnResizeStart,
        externalColumnResizeDoubleClick: handleSidebarColumnResizeDoubleClick,
        externalDragHandleWidth: sidebarDragHandleWidth,
        externalResizingIndex: sidebarResizingIndex,
        onOptimalColumnWidth: handleOptimalColumnWidth,
    }), [
        visibleTasks, tasks, viewMode, expandedTaskIds, toggleTask, handleTaskClickWithLoading,
        onTaskUpdate, onTaskCreate, onTaskReorder, onTaskGroup, onTaskUngroup, onTaskBlockify,
        onTaskDelete, onTaskMove, activeCPId, holidays, calendarSettings,
        virtualRows, totalHeight, isAddingTask, isAddingCP, handleTaskDoubleClick,
        layoutValues.rowHeight, sidebarColumns, handleSidebarColumnResizeStart,
        handleSidebarColumnResizeDoubleClick, sidebarDragHandleWidth, sidebarResizingIndex,
        handleOptimalColumnWidth,
    ]);

    // ========================================
    // Shared Props for Timeline
    // ========================================
    const timelineSharedProps = useMemo(() => ({
        tasks: visibleTasks,
        allTasks: tasks,
        milestones,
        viewMode,
        zoomLevel,
        holidays,
        calendarSettings,
        onTaskUpdate,
        onBarDrag: handleBarDrag,
        onGroupDrag: handleGroupDrag,
        onMilestoneUpdate,
        onMilestoneDoubleClick: handleMilestoneDoubleClick,
        onTaskDoubleClick: handleTaskDoubleClick,
        virtualRows,
        totalHeight,
        onGroupToggle: toggleTask,
        activeCPId,
        groupDependencies,
        onGroupDependencyCreate,
        onGroupDependencyDelete,
        onGroupCycleDetected,
        rowHeight: layoutValues.rowHeight,
        barHeight: layoutValues.barHeight,
    }), [
        visibleTasks, tasks, milestones, viewMode, zoomLevel, holidays, calendarSettings,
        onTaskUpdate, handleBarDrag, handleGroupDrag, onMilestoneUpdate,
        handleMilestoneDoubleClick, handleTaskDoubleClick, virtualRows, totalHeight,
        toggleTask, activeCPId, groupDependencies, onGroupDependencyCreate,
        onGroupDependencyDelete, onGroupCycleDetected,
        layoutValues.rowHeight, layoutValues.barHeight,
    ]);

    // ========================================
    // Render
    // ========================================
    return (
        <GanttProvider
            viewMode={viewMode}
            activeCPId={activeCPId}
            holidays={holidays}
            calendarSettings={calendarSettings}
            timelineConfig={timelineConfig}
            zoomConfig={zoomConfig}
            sidebarConfig={sidebarConfig}
            onTaskUpdate={onTaskUpdate}
            onTaskCreate={onTaskCreate}
            onTaskDelete={onTaskDelete}
            onTaskReorder={onTaskReorder}
            onTaskGroup={onTaskGroup}
            onTaskUngroup={onTaskUngroup}
            onTaskMove={onTaskMove}
            onTaskDoubleClick={handleTaskDoubleClick}
        >
            <div
                ref={containerRef}
                className={`flex h-full w-full flex-col ${className || ''}`}
                style={{ backgroundColor: 'var(--gantt-bg-secondary)', ...style }}
            >
            <GanttHeader
                isAddingTask={isAddingTask}
                isAddingCP={isAddingCP}
                hasUnsavedChanges={hasUnsavedChanges}
                saveStatus={saveStatus}
                isCompactMode={(viewMode === 'DETAIL' || viewMode === 'UNIFIED') ? isCompactMode : false}
                onViewChange={handleViewChangeWithLoading}
                onToggleCompact={(viewMode === 'DETAIL' || viewMode === 'UNIFIED') ? toggleCompactMode : undefined}
                onStartAddTask={() => setIsAddingTask(true)}
                onStartAddCP={() => setIsAddingCP(true)}
                onStartAddMilestone={handleStartAddMilestone}
                onScrollToFirst={scrollToFirstTask}
                onCollapseAll={collapseLastLevel}
                onExpandAll={expandNextLevel}
                onSave={onSave}
                onReset={onReset}
                onExport={onExport}
                onExportExcel={onExportExcel}
                onImport={onImport}
                loadedFileName={loadedFileName}
                canCreateTask={!!onTaskCreate}
                canCreateMilestone={!!onMilestoneCreate}
            />

            {/* Main Content Area */}
            <div className="relative flex flex-1 flex-col overflow-hidden">
                {/* Unified Resizer */}
                <div
                    className="absolute z-30 cursor-col-resize transition-colors"
                    style={{
                        left: sidebarWidth,
                        top: 0,
                        bottom: 0,
                        width: 4,
                        backgroundColor: isResizing
                            ? 'var(--gantt-resizer-active)'
                            : 'var(--gantt-resizer)',
                    }}
                    onMouseDown={handleResizeStart}
                    onDoubleClick={handleResizeDoubleClick}
                    onMouseEnter={(e) => {
                        if (!isResizing) {
                            e.currentTarget.style.backgroundColor = 'var(--gantt-resizer-hover)';
                        }
                    }}
                    onMouseLeave={(e) => {
                        if (!isResizing) {
                            e.currentTarget.style.backgroundColor = 'var(--gantt-resizer)';
                        }
                    }}
                    title="드래그하여 너비 조절 / 더블클릭으로 초기화"
                />

                {/* Fixed Header Row */}
                <div
                    className="flex shrink-0 shadow-sm relative z-20"
                    style={{ backgroundColor: 'var(--gantt-bg-primary)' }}
                >
                    {/* Sidebar Header */}
                    <div
                        className="shrink-0 relative"
                        style={{ width: sidebarWidth + 4, overflow: 'hidden', willChange: 'width', backgroundColor: 'var(--gantt-bg-primary)' }}
                    >
                        <GanttSidebar {...sidebarSharedProps} renderMode="header" />
                    </div>

                    {/* Timeline Header */}
                    <div
                        ref={headerTimelineRef}
                        className="flex-1"
                        style={{ overflowX: 'hidden', overflowY: 'visible', backgroundColor: 'var(--gantt-bg-primary)' }}
                    >
                        <GanttTimeline
                            {...timelineSharedProps}
                            onContextMenuAddTask={
                                viewMode === 'DETAIL' && activeCPId && onTaskCreate
                                    ? handleContextMenuAddTask
                                    : undefined
                            }
                            onContextMenuAddMilestone={
                                onMilestoneCreate ? handleContextMenuAddMilestone : undefined
                            }
                            focusedTaskId={focusedTaskId}
                            renderMode="header"
                        />
                    </div>
                </div>

                {/* Scrollable Content Row */}
                <div ref={scrollRef} className="relative flex flex-1 overflow-auto" onScroll={handleContentScroll}>
                    <div
                        className="sticky left-0 z-10 flex shrink-0"
                        style={{ width: sidebarWidth + 4, willChange: 'width', alignSelf: 'flex-start' }}
                    >
                        <div
                            className="flex shrink-0 flex-col"
                            style={{ width: sidebarWidth, clipPath: 'inset(0)', backgroundColor: 'var(--gantt-bg-primary)' }}
                        >
                            <GanttSidebar {...sidebarSharedProps} renderMode="content" />

                            {/* Bottom padding sync */}
                            <div
                                style={{
                                    height: viewMode === 'MASTER' ? 90 : 70,
                                    backgroundColor: 'var(--gantt-bg-secondary)',
                                    borderTop: '2px solid var(--gantt-border)',
                                }}
                            />
                        </div>
                    </div>

                    <div
                        className="relative flex flex-1 flex-col"
                        style={{ backgroundColor: 'var(--gantt-bg-primary)' }}
                    >
                        <GanttTimeline
                            {...timelineSharedProps}
                            onContextMenuAddTask={
                                viewMode === 'DETAIL' && activeCPId && onTaskCreate
                                    ? handleContextMenuAddTask
                                    : undefined
                            }
                            onContextMenuAddMilestone={
                                onMilestoneCreate ? handleContextMenuAddMilestone : undefined
                            }
                            focusedTaskId={focusedTaskId}
                            renderMode="content"
                        />
                    </div>

                    {isResizing && (
                        <div className="fixed inset-0 z-50 cursor-col-resize" />
                    )}
                </div>

                {isViewSwitching && (
                    <div
                        className="absolute inset-0 z-[70] flex items-center justify-center"
                        style={{
                            backgroundColor: 'rgba(17, 24, 39, 0.18)',
                            backdropFilter: 'blur(1px)',
                        }}
                    >
                        <div
                            className="flex items-center gap-2 rounded-lg px-3 py-2 shadow-sm"
                            style={{
                                backgroundColor: 'var(--gantt-bg-primary)',
                                border: '1px solid var(--gantt-border)',
                                color: 'var(--gantt-text-secondary)',
                            }}
                        >
                            <span
                                className="h-4 w-4 animate-spin rounded-full border-2 border-solid border-transparent"
                                style={{
                                    borderTopColor: 'var(--gantt-focus)',
                                    borderRightColor: 'var(--gantt-focus)',
                                }}
                            />
                            <span className="text-xs font-medium">뷰 전환 중...</span>
                        </div>
                    </div>
                )}
            </div>

            <MilestoneEditModal
                milestone={editingMilestone}
                isOpen={isEditModalOpen}
                isNew={isNewMilestone}
                onClose={handleCloseEditModal}
                onSave={handleMilestoneSave}
                onDelete={handleMilestoneDelete}
            />

            <TaskEditModal
                task={editingTask}
                isOpen={isTaskEditModalOpen}
                onClose={handleCloseTaskEditModal}
                onSave={handleTaskEditSave}
                onDelete={onTaskDelete ? handleTaskEditDelete : undefined}
            />
            </div>
        </GanttProvider>
    );
}
