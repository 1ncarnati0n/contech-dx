'use client';

import { forwardRef } from 'react';
import {
    ConstructionTask,
    Milestone,
    ViewMode,
    ZoomLevel,
    CalendarSettings,
    GANTT_LAYOUT,
    GANTT_COLORS,
    GANTT_SUMMARY,
    GroupDragResult,
    AnchorDependency,
    AnchorDependencyDragResult,
} from '../../types';
import type { VirtualRow } from '../../hooks/useGanttVirtualization';

// Sub-components
import { TimelineHeader } from './TimelineHeader';
import { TimelineGrid } from './TimelineGrid';
import { MilestoneMarker } from './MilestoneMarker';
import { SvgDefs } from './SvgDefs';
import { TaskBar } from './TaskBar';
import { TimelineContextMenu } from './TimelineContextMenu';
import { DependencyLines, ConnectionPreviewLine, InBarConnectionLines } from './DependencyLines';
import { AnchorPoints, getAnchorPosition } from './AnchorPoints';

// Core Hook
import { useTimelineCore } from './hooks/useTimelineCore';

// Renderers
import { VerticalGridLines, HorizontalGridLines, GroupRowBackground } from './renderers/GridLinesRenderer';

// External components
import { CriticalPathBar } from '../CriticalPathBar';
import { WorkDaysRatioBar } from '../WorkDaysRatioBar';
import { GroupSummaryBar } from '../GroupSummaryBar';
import { BlockBar } from '../BlockBar';

// Types
import type { BarDragResult } from './types';

const { MILESTONE_LANE_HEIGHT, BAR_HEIGHT } = GANTT_LAYOUT;
const { BAR_HEIGHT: SUMMARY_BAR_HEIGHT } = GANTT_SUMMARY;

export type { BarDragResult };

interface GanttTimelineProps {
    tasks: ConstructionTask[];
    allTasks?: ConstructionTask[];
    milestones: Milestone[];
    viewMode: ViewMode;
    zoomLevel: ZoomLevel;
    holidays: Date[];
    calendarSettings: CalendarSettings;
    onTaskUpdate?: (task: ConstructionTask) => void;
    onBarDrag?: (result: BarDragResult) => void;
    onGroupDrag?: (result: GroupDragResult) => void;
    onMilestoneUpdate?: (milestone: Milestone) => void;
    onMilestoneDoubleClick?: (milestone: Milestone) => void;
    onTaskDoubleClick?: (task: ConstructionTask) => void;
    virtualRows?: VirtualRow[];
    totalHeight?: number;
    showCriticalPath?: boolean;
    onGroupToggle?: (taskId: string) => void;
    activeCPId?: string | null;
    onContextMenuAddTask?: (date: Date) => void;
    onContextMenuAddMilestone?: (date: Date) => void;
    anchorDependencies?: AnchorDependency[];
    onAnchorDependencyCreate?: (dependency: AnchorDependency) => void;
    onAnchorDependencyDelete?: (depId: string) => void;
    onAnchorDependencyDrag?: (result: AnchorDependencyDragResult) => void;
    onCycleDetected?: (info: { sourceTaskId: string; targetTaskId: string }) => void;
    focusedTaskId?: string | null;
    renderMode?: 'header' | 'content' | 'all';
    rowHeight?: number;
    barHeight?: number;
}

export const GanttTimeline = forwardRef<HTMLDivElement, GanttTimelineProps>(
    (props, ref) => {
        const {
            tasks,
            allTasks,
            milestones,
            viewMode,
            zoomLevel,
            holidays,
            calendarSettings,
            onBarDrag,
            onGroupDrag,
            onMilestoneUpdate,
            onMilestoneDoubleClick,
            onTaskDoubleClick,
            virtualRows,
            totalHeight: virtualTotalHeight,
            showCriticalPath = true,
            onGroupToggle,
            activeCPId,
            onContextMenuAddTask,
            onContextMenuAddMilestone,
            anchorDependencies = [],
            onAnchorDependencyCreate,
            onAnchorDependencyDelete,
            onAnchorDependencyDrag,
            onCycleDetected,
            focusedTaskId,
            renderMode = 'all',
            rowHeight,
            barHeight,
        } = props;

        // ========================================
        // Core Hook - 모든 계산/상태 로직 캡슐화
        // ========================================
        const { values, dragHandlers, eventHandlers, contextMenuState } = useTimelineCore({
            tasks,
            allTasks,
            milestones,
            viewMode,
            zoomLevel,
            holidays,
            calendarSettings,
            virtualRows,
            totalHeight: virtualTotalHeight,
            rowHeight,
            barHeight,
            focusedTaskId,
            onBarDrag,
            onGroupDrag,
            onMilestoneUpdate,
            onMilestoneDoubleClick,
            onTaskDoubleClick,
            onContextMenuAddTask,
            onContextMenuAddMilestone,
            anchorDependencies,
            onAnchorDependencyCreate,
            onAnchorDependencyDelete,
            onAnchorDependencyDrag,
            onCycleDetected,
        });

        // 값 구조 분해
        const {
            pixelsPerDay,
            isMasterView,
            isUnifiedView,
            isCompact,
            effectiveBarHeight,
            minDate,
            totalDays,
            chartWidth,
            chartHeight,
            taskAreaHeight,
            rowData,
            fullRowData,
            milestoneLayouts,
            isBlockTask,
        } = values;

        const {
            handleBarMouseDown,
            getDragInfo,
            handleMilestoneMouseDown,
            getMilestoneDragX,
            isMilestoneDragging,
            handleGroupBarMouseDown,
            getGroupDragDeltaDays,
            getTaskGroupDragDeltaDays,
            getTaskDragInfo,
            handleDependencyBarMouseDown,
            isDependencyDragging,
            taskHasDependency,
            getDependencyDragDeltaDays,
            getDependencyDragInfo,
            getConnectedTaskIds,
            getCombinedTaskDeltaDays,
            connectingFrom,
            hoveredAnchor,
            selectedDepId,
            hoveredDepId,
            handleAnchorClick,
            handleAnchorHover,
            handleDependencyClick,
            handleDependencyHover,
        } = dragHandlers;

        const {
            selectTask,
            handleMilestoneDoubleClick: handleMilestoneDoubleClickHandler,
            handleContextMenu,
            handleContextMenuClose,
            handleSvgClick,
            handleDepDelete,
            setHoveredTaskId,
        } = eventHandlers;

        const { contextMenu } = contextMenuState;

        // ====================================
        // Header Only 모드 (TimelineHeader + Milestone Lane)
        // ====================================
        if (renderMode === 'header') {
            return (
                <div className="flex flex-col shrink-0" style={{ backgroundColor: 'var(--gantt-bg-primary)' }}>
                    <TimelineHeader
                        minDate={minDate}
                        totalDays={totalDays}
                        pixelsPerDay={pixelsPerDay}
                        zoomLevel={zoomLevel}
                        holidays={holidays}
                        calendarSettings={calendarSettings}
                    />

                    <svg
                        width={chartWidth}
                        height={MILESTONE_LANE_HEIGHT}
                        className="block"
                        style={{
                            backgroundColor: 'var(--gantt-bg-primary)',
                            overflow: 'visible',
                            borderBottom: '1px solid var(--gantt-border-light)'
                        }}
                    >
                        <SvgDefs />
                        <TimelineGrid
                            minDate={minDate}
                            totalDays={totalDays}
                            chartHeight={MILESTONE_LANE_HEIGHT}
                            pixelsPerDay={pixelsPerDay}
                            holidays={holidays}
                            calendarSettings={calendarSettings}
                            zoomLevel={zoomLevel}
                        />
                        <rect x={0} y={0} width={chartWidth} height={MILESTONE_LANE_HEIGHT} fill="transparent" />

                        <VerticalGridLines
                            minDate={minDate}
                            totalDays={totalDays}
                            chartHeight={taskAreaHeight + MILESTONE_LANE_HEIGHT}
                            pixelsPerDay={pixelsPerDay}
                            zoomLevel={zoomLevel}
                        />

                        {milestoneLayouts.map((layout) => {
                            const isDragging = isMilestoneDragging(layout.milestone.id);
                            return (
                                <MilestoneMarker
                                    key={layout.milestone.id}
                                    milestone={layout.milestone}
                                    x={layout.x}
                                    labelLevel={layout.labelLevel}
                                    isDragging={isDragging}
                                    dragX={getMilestoneDragX(layout.milestone.id)}
                                    onMouseDown={onMilestoneUpdate ? handleMilestoneMouseDown : undefined}
                                    onDoubleClick={onMilestoneDoubleClick ? handleMilestoneDoubleClickHandler : undefined}
                                    lineHeight={taskAreaHeight + MILESTONE_LANE_HEIGHT}
                                />
                            );
                        })}
                    </svg>
                </div>
            );
        }

        // ====================================
        // Content Only 모드 (Task Area만)
        // ====================================
        if (renderMode === 'content') {
            return (
                <div ref={ref} className="relative flex-1" style={{ backgroundColor: 'var(--gantt-bg-primary)' }}>
                    <svg
                        width={chartWidth}
                        height={taskAreaHeight}
                        className="block"
                        onContextMenu={handleContextMenu}
                        onClick={handleSvgClick}
                    >
                        <SvgDefs />
                        <TimelineGrid
                            minDate={minDate}
                            totalDays={totalDays}
                            chartHeight={taskAreaHeight}
                            pixelsPerDay={pixelsPerDay}
                            holidays={holidays}
                            calendarSettings={calendarSettings}
                            zoomLevel={zoomLevel}
                        />

                        <GroupRowBackground tasks={tasks} rowData={rowData} chartWidth={chartWidth} />
                        <VerticalGridLines
                            minDate={minDate}
                            totalDays={totalDays}
                            chartHeight={taskAreaHeight}
                            pixelsPerDay={pixelsPerDay}
                            zoomLevel={zoomLevel}
                        />
                        <HorizontalGridLines rowData={rowData} chartWidth={chartWidth} />

                        {/* Task Bars */}
                        {rowData.map((row) => {
                            const task = tasks[row.index];
                            if (!task) return null;

                            const isGroup = task.type === 'GROUP';
                            const isCP = task.type === 'CP';

                            let barHeightForTask: number;
                            if (isCP) {
                                barHeightForTask = BAR_HEIGHT;
                            } else if (isGroup) {
                                const isBlock = isBlockTask(task);
                                barHeightForTask = isBlock ? BAR_HEIGHT : SUMMARY_BAR_HEIGHT;
                            } else {
                                barHeightForTask = effectiveBarHeight;
                            }
                            const y = row.start + (row.size - barHeightForTask) / 2;

                            if (!isMasterView && isGroup) {
                                const isBlock = isBlockTask(task);
                                if (isBlock) {
                                    return (
                                        <BlockBar
                                            key={`block-${row.key}`}
                                            block={task}
                                            allTasks={allTasks || tasks}
                                            y={y}
                                            minDate={minDate}
                                            pixelsPerDay={pixelsPerDay}
                                            currentDeltaDays={getGroupDragDeltaDays(task.id)}
                                            onToggle={onGroupToggle}
                                            onClick={(e, blockId) => {
                                                selectTask(blockId, {
                                                    ctrlKey: e.ctrlKey || e.metaKey,
                                                    shiftKey: e.shiftKey,
                                                    visibleTasks: tasks,
                                                });
                                            }}
                                            isFocused={focusedTaskId === task.id}
                                        />
                                    );
                                }
                                return (
                                    <GroupSummaryBar
                                        key={`group-${row.key}`}
                                        group={task}
                                        allTasks={allTasks || tasks}
                                        y={y}
                                        minDate={minDate}
                                        pixelsPerDay={pixelsPerDay}
                                        isDraggable={!isUnifiedView && !!onGroupDrag}
                                        currentDeltaDays={getGroupDragDeltaDays(task.id)}
                                        onDragStart={handleGroupBarMouseDown}
                                        onToggle={onGroupToggle}
                                        onClick={(e, groupId) => {
                                            selectTask(groupId, {
                                                ctrlKey: e.ctrlKey || e.metaKey,
                                                shiftKey: e.shiftKey,
                                                visibleTasks: tasks,
                                            });
                                        }}
                                        isFocused={focusedTaskId === task.id}
                                        parentBarHeight={BAR_HEIGHT}
                                        isCompact={isCompact}
                                    />
                                );
                            }

                            const useMasterStyle = isMasterView || (isUnifiedView && isCP);

                            return (
                                <TaskBar
                                    key={row.key}
                                    task={task}
                                    y={y}
                                    minDate={minDate}
                                    pixelsPerDay={pixelsPerDay}
                                    isMasterView={useMasterStyle}
                                    renderMode="bar"
                                    allTasks={allTasks || tasks}
                                    holidays={holidays}
                                    calendarSettings={calendarSettings}
                                    isDraggable={!isMasterView && !useMasterStyle && !!onBarDrag}
                                    dragInfo={getDragInfo(task.id)}
                                    groupDragDeltaDays={getTaskGroupDragDeltaDays(task.id)}
                                    groupDragInfo={getTaskDragInfo(task.id)}
                                    dependencyDragDeltaDays={getDependencyDragDeltaDays(task.id)}
                                    dependencyDragInfo={getDependencyDragInfo(task.id)}
                                    onDragStart={handleBarMouseDown}
                                    onDependencyDragStart={handleDependencyBarMouseDown}
                                    hasDependency={taskHasDependency(task.id)}
                                    isFocused={focusedTaskId === task.id}
                                    onDoubleClick={!isMasterView && task.type === 'TASK' && onTaskDoubleClick
                                        ? () => onTaskDoubleClick(task)
                                        : undefined}
                                    onMouseEnter={() => setHoveredTaskId(task.id)}
                                    onMouseLeave={() => setHoveredTaskId(null)}
                                    barHeight={effectiveBarHeight}
                                />
                            );
                        })}

                        {/* Dependency Lines */}
                        {!isMasterView && anchorDependencies.length > 0 && (
                            <DependencyLines
                                tasks={tasks}
                                dependencies={anchorDependencies}
                                minDate={minDate}
                                pixelsPerDay={pixelsPerDay}
                                selectedDepId={selectedDepId}
                                hoveredDepId={hoveredDepId}
                                onDependencyClick={handleDependencyClick}
                                onDependencyHover={handleDependencyHover}
                                holidays={holidays}
                                calendarSettings={calendarSettings}
                                getTaskDeltaDays={getCombinedTaskDeltaDays}
                                offsetY={0}
                                rowData={fullRowData}
                                effectiveBarHeight={effectiveBarHeight}
                                isCompact={isCompact}
                            />
                        )}

                        {/* In-Bar Connection Lines */}
                        {!isMasterView && anchorDependencies.length > 0 && (
                            <InBarConnectionLines
                                tasks={tasks}
                                dependencies={anchorDependencies}
                                minDate={minDate}
                                pixelsPerDay={pixelsPerDay}
                                holidays={holidays}
                                calendarSettings={calendarSettings}
                                getTaskDeltaDays={getCombinedTaskDeltaDays}
                                offsetY={0}
                                rowData={fullRowData}
                                effectiveBarHeight={effectiveBarHeight}
                                isCompact={isCompact}
                            />
                        )}

                        {/* Anchor Points */}
                        {!isMasterView && rowData.map((row) => {
                            const task = tasks[row.index];
                            if (!task || task.type !== 'TASK') return null;

                            return (
                                <AnchorPoints
                                    key={`anchor-${row.key}`}
                                    task={task}
                                    rowIndex={row.index}
                                    minDate={minDate}
                                    pixelsPerDay={pixelsPerDay}
                                    connectingFrom={connectingFrom}
                                    dependencies={anchorDependencies}
                                    onAnchorClick={handleAnchorClick}
                                    onAnchorHover={handleAnchorHover}
                                    holidays={holidays}
                                    calendarSettings={calendarSettings}
                                    dependencyDragDeltaDays={getCombinedTaskDeltaDays(task.id)}
                                    offsetY={0}
                                    rowStart={row.start}
                                    rowHeight={row.size}
                                    effectiveBarHeight={effectiveBarHeight}
                                    isCompact={isCompact}
                                    isHoverActive={false}
                                />
                            );
                        })}

                        {/* Task Labels */}
                        {rowData.map((row) => {
                            const task = tasks[row.index];
                            if (!task) return null;
                            if (!isMasterView && task.type === 'GROUP') return null;

                            const isCP = task.type === 'CP';
                            const isGroup = task.type === 'GROUP';

                            let labelBarHeight: number;
                            if (isCP) {
                                labelBarHeight = BAR_HEIGHT;
                            } else if (isGroup) {
                                const isBlock = isBlockTask(task);
                                labelBarHeight = isBlock ? BAR_HEIGHT : SUMMARY_BAR_HEIGHT;
                            } else {
                                labelBarHeight = effectiveBarHeight;
                            }
                            const y = row.start + (row.size - labelBarHeight) / 2;
                            const useMasterStyle = isMasterView || (isUnifiedView && isCP);

                            return (
                                <TaskBar
                                    key={`label-${row.key}`}
                                    task={task}
                                    y={y}
                                    minDate={minDate}
                                    pixelsPerDay={pixelsPerDay}
                                    isMasterView={useMasterStyle}
                                    renderMode="label"
                                    allTasks={allTasks || tasks}
                                    holidays={holidays}
                                    calendarSettings={calendarSettings}
                                    dragInfo={getDragInfo(task.id)}
                                    groupDragDeltaDays={getTaskGroupDragDeltaDays(task.id)}
                                    groupDragInfo={getTaskDragInfo(task.id)}
                                    dependencyDragDeltaDays={getDependencyDragDeltaDays(task.id)}
                                    dependencyDragInfo={getDependencyDragInfo(task.id)}
                                    isFocused={focusedTaskId === task.id}
                                    barHeight={effectiveBarHeight}
                                />
                            );
                        })}

                        {/* Milestone Dashed Lines */}
                        {milestoneLayouts.map((layout) => {
                            const isDetail = layout.milestone.milestoneType === 'DETAIL';
                            const lineColor = isDetail ? GANTT_COLORS.milestoneDetail : GANTT_COLORS.milestone;
                            return (
                                <line
                                    key={`ms-line-${layout.milestone.id}`}
                                    x1={layout.x}
                                    y1={0}
                                    x2={layout.x}
                                    y2={taskAreaHeight}
                                    stroke={lineColor}
                                    strokeWidth={1.2}
                                    strokeDasharray="4, 5"
                                    className="opacity-90 pointer-events-none"
                                />
                            );
                        })}

                        {/* Connection Preview Line */}
                        {!isMasterView && connectingFrom && hoveredAnchor && connectingFrom.taskId !== hoveredAnchor.taskId && (() => {
                            const sourceTask = tasks.find(t => t.id === connectingFrom.taskId);
                            const targetTask = tasks.find(t => t.id === hoveredAnchor.taskId);
                            const sourceIndex = tasks.findIndex(t => t.id === connectingFrom.taskId);
                            const targetIndex = tasks.findIndex(t => t.id === hoveredAnchor.taskId);

                            if (!sourceTask || !targetTask || sourceIndex < 0 || targetIndex < 0) return null;

                            const sourceRow = fullRowData.find(r => r.index === sourceIndex);
                            const targetRow = fullRowData.find(r => r.index === targetIndex);

                            const sourcePos = getAnchorPosition(
                                sourceTask, connectingFrom.dayIndex, sourceIndex,
                                minDate, pixelsPerDay, holidays, calendarSettings, 0,
                                sourceRow?.start, sourceRow?.size, effectiveBarHeight
                            );
                            const targetPos = getAnchorPosition(
                                targetTask, hoveredAnchor.dayIndex, targetIndex,
                                minDate, pixelsPerDay, holidays, calendarSettings, 0,
                                targetRow?.start, targetRow?.size, effectiveBarHeight
                            );

                            return (
                                <ConnectionPreviewLine
                                    sourceX={sourcePos.x}
                                    sourceY={sourcePos.y}
                                    targetX={targetPos.x}
                                    targetY={targetPos.y}
                                    isCompact={isCompact}
                                />
                            );
                        })()}

                        {/* Dependency Drag Indicator */}
                        {isDependencyDragging && (() => {
                            const connectedIds = getConnectedTaskIds();
                            if (connectedIds.length <= 1) return null;

                            return (
                                <g className="dependency-drag-indicator">
                                    <rect x={10} y={10} width={180} height={28} rx={6} fill={GANTT_COLORS.success} fillOpacity={0.9} />
                                    <text x={100} y={28} textAnchor="middle" fill="white" fontSize={12} fontWeight={600}>
                                        🔗 연결된 {connectedIds.length}개 태스크 이동 중
                                    </text>
                                </g>
                            );
                        })()}
                    </svg>

                    {showCriticalPath && (
                        <CriticalPathBar
                            tasks={allTasks || tasks}
                            holidays={holidays}
                            calendarSettings={calendarSettings}
                            minDate={minDate}
                            pixelsPerDay={pixelsPerDay}
                            totalWidth={chartWidth}
                            activeCPId={activeCPId}
                        />
                    )}

                    {isMasterView && showCriticalPath && (
                        <WorkDaysRatioBar
                            tasks={allTasks || tasks}
                            holidays={holidays}
                            calendarSettings={calendarSettings}
                            minDate={minDate}
                            pixelsPerDay={pixelsPerDay}
                            totalWidth={chartWidth}
                        />
                    )}

                    {contextMenu && onContextMenuAddMilestone && (
                        <TimelineContextMenu
                            x={contextMenu.x}
                            y={contextMenu.y}
                            clickedDate={contextMenu.clickedDate}
                            viewMode={viewMode}
                            onAddTask={onContextMenuAddTask}
                            onAddMilestone={onContextMenuAddMilestone}
                            onClose={handleContextMenuClose}
                            selectedDependencyId={selectedDepId}
                            onDeleteDependency={onAnchorDependencyDelete ? handleDepDelete : undefined}
                        />
                    )}
                </div>
            );
        }

        // ====================================
        // All 모드 (기존 전체 렌더링)
        // ====================================
        return (
            <div className="flex h-full w-full flex-col overflow-hidden" style={{ backgroundColor: 'var(--gantt-bg-primary)' }}>
                <div ref={ref} className="relative flex-1">
                    <TimelineHeader
                        minDate={minDate}
                        totalDays={totalDays}
                        pixelsPerDay={pixelsPerDay}
                        zoomLevel={zoomLevel}
                        holidays={holidays}
                        calendarSettings={calendarSettings}
                    />

                    <svg
                        width={chartWidth}
                        height={chartHeight}
                        className="block"
                        style={{ backgroundColor: 'var(--gantt-bg-primary)' }}
                        onContextMenu={handleContextMenu}
                        onClick={handleSvgClick}
                    >
                        <SvgDefs />
                        <TimelineGrid
                            minDate={minDate}
                            totalDays={totalDays}
                            chartHeight={chartHeight}
                            pixelsPerDay={pixelsPerDay}
                            holidays={holidays}
                            calendarSettings={calendarSettings}
                            zoomLevel={zoomLevel}
                        />

                        <GroupRowBackground tasks={tasks} rowData={rowData} chartWidth={chartWidth} offsetY={MILESTONE_LANE_HEIGHT} />
                        <VerticalGridLines
                            minDate={minDate}
                            totalDays={totalDays}
                            chartHeight={chartHeight}
                            pixelsPerDay={pixelsPerDay}
                            zoomLevel={zoomLevel}
                        />
                        <HorizontalGridLines rowData={rowData} chartWidth={chartWidth} offsetY={MILESTONE_LANE_HEIGHT} />

                        {/* Milestone Lane */}
                        <rect x={0} y={0} width={chartWidth} height={MILESTONE_LANE_HEIGHT} fill="transparent" />
                        {milestoneLayouts.map((layout) => {
                            const isDragging = isMilestoneDragging(layout.milestone.id);
                            return (
                                <MilestoneMarker
                                    key={layout.milestone.id}
                                    milestone={layout.milestone}
                                    x={layout.x}
                                    labelLevel={layout.labelLevel}
                                    isDragging={isDragging}
                                    dragX={getMilestoneDragX(layout.milestone.id)}
                                    onMouseDown={onMilestoneUpdate ? handleMilestoneMouseDown : undefined}
                                    onDoubleClick={onMilestoneDoubleClick ? handleMilestoneDoubleClickHandler : undefined}
                                />
                            );
                        })}
                        <line x1={0} y1={MILESTONE_LANE_HEIGHT} x2={chartWidth} y2={MILESTONE_LANE_HEIGHT} stroke={GANTT_COLORS.grid} strokeWidth={1} />

                        {/* Task Bars */}
                        {rowData.map((row) => {
                            const task = tasks[row.index];
                            if (!task) return null;

                            const isGroup = task.type === 'GROUP';
                            const isCP = task.type === 'CP';

                            let barHeightForTask: number;
                            if (isCP) {
                                barHeightForTask = BAR_HEIGHT;
                            } else if (isGroup) {
                                const isBlock = isBlockTask(task);
                                barHeightForTask = isBlock ? BAR_HEIGHT : SUMMARY_BAR_HEIGHT;
                            } else {
                                barHeightForTask = effectiveBarHeight;
                            }
                            const y = row.start + (row.size - barHeightForTask) / 2 + MILESTONE_LANE_HEIGHT;

                            if (!isMasterView && isGroup) {
                                const isBlock = isBlockTask(task);
                                if (isBlock) {
                                    return (
                                        <BlockBar
                                            key={`block-${row.key}`}
                                            block={task}
                                            allTasks={allTasks || tasks}
                                            y={y}
                                            minDate={minDate}
                                            pixelsPerDay={pixelsPerDay}
                                            currentDeltaDays={getGroupDragDeltaDays(task.id)}
                                            onToggle={onGroupToggle}
                                            onClick={(e, blockId) => {
                                                selectTask(blockId, {
                                                    ctrlKey: e.ctrlKey || e.metaKey,
                                                    shiftKey: e.shiftKey,
                                                    visibleTasks: tasks,
                                                });
                                            }}
                                            isFocused={focusedTaskId === task.id}
                                        />
                                    );
                                }
                                return (
                                    <GroupSummaryBar
                                        key={`group-${row.key}`}
                                        group={task}
                                        allTasks={allTasks || tasks}
                                        y={y}
                                        minDate={minDate}
                                        pixelsPerDay={pixelsPerDay}
                                        isDraggable={!isUnifiedView && !!onGroupDrag}
                                        currentDeltaDays={getGroupDragDeltaDays(task.id)}
                                        onDragStart={handleGroupBarMouseDown}
                                        onToggle={onGroupToggle}
                                        onClick={(e, groupId) => {
                                            selectTask(groupId, {
                                                ctrlKey: e.ctrlKey || e.metaKey,
                                                shiftKey: e.shiftKey,
                                                visibleTasks: tasks,
                                            });
                                        }}
                                        isFocused={focusedTaskId === task.id}
                                        parentBarHeight={BAR_HEIGHT}
                                        isCompact={isCompact}
                                    />
                                );
                            }

                            const useMasterStyle = isMasterView || (isUnifiedView && isCP);

                            return (
                                <TaskBar
                                    key={row.key}
                                    task={task}
                                    y={y}
                                    minDate={minDate}
                                    pixelsPerDay={pixelsPerDay}
                                    isMasterView={useMasterStyle}
                                    renderMode="bar"
                                    allTasks={allTasks || tasks}
                                    holidays={holidays}
                                    calendarSettings={calendarSettings}
                                    isDraggable={!isMasterView && !useMasterStyle && !!onBarDrag}
                                    dragInfo={getDragInfo(task.id)}
                                    groupDragDeltaDays={getTaskGroupDragDeltaDays(task.id)}
                                    groupDragInfo={getTaskDragInfo(task.id)}
                                    dependencyDragDeltaDays={getDependencyDragDeltaDays(task.id)}
                                    dependencyDragInfo={getDependencyDragInfo(task.id)}
                                    onDragStart={handleBarMouseDown}
                                    onDependencyDragStart={handleDependencyBarMouseDown}
                                    hasDependency={taskHasDependency(task.id)}
                                    isFocused={focusedTaskId === task.id}
                                    onDoubleClick={!isMasterView && task.type === 'TASK' && onTaskDoubleClick
                                        ? () => onTaskDoubleClick(task)
                                        : undefined}
                                    onMouseEnter={() => setHoveredTaskId(task.id)}
                                    onMouseLeave={() => setHoveredTaskId(null)}
                                    barHeight={effectiveBarHeight}
                                />
                            );
                        })}

                        {/* Dependency Lines */}
                        {!isMasterView && anchorDependencies.length > 0 && (
                            <DependencyLines
                                tasks={tasks}
                                dependencies={anchorDependencies}
                                minDate={minDate}
                                pixelsPerDay={pixelsPerDay}
                                selectedDepId={selectedDepId}
                                hoveredDepId={hoveredDepId}
                                onDependencyClick={handleDependencyClick}
                                onDependencyHover={handleDependencyHover}
                                holidays={holidays}
                                calendarSettings={calendarSettings}
                                getTaskDeltaDays={getCombinedTaskDeltaDays}
                                offsetY={MILESTONE_LANE_HEIGHT}
                                rowData={fullRowData}
                                effectiveBarHeight={effectiveBarHeight}
                                isCompact={isCompact}
                            />
                        )}

                        {/* In-Bar Connection Lines */}
                        {!isMasterView && anchorDependencies.length > 0 && (
                            <InBarConnectionLines
                                tasks={tasks}
                                dependencies={anchorDependencies}
                                minDate={minDate}
                                pixelsPerDay={pixelsPerDay}
                                holidays={holidays}
                                calendarSettings={calendarSettings}
                                getTaskDeltaDays={getCombinedTaskDeltaDays}
                                offsetY={MILESTONE_LANE_HEIGHT}
                                rowData={fullRowData}
                                effectiveBarHeight={effectiveBarHeight}
                                isCompact={isCompact}
                            />
                        )}

                        {/* Anchor Points */}
                        {!isMasterView && rowData.map((row) => {
                            const task = tasks[row.index];
                            if (!task || task.type !== 'TASK') return null;

                            return (
                                <AnchorPoints
                                    key={`anchor-${row.key}`}
                                    task={task}
                                    rowIndex={row.index}
                                    minDate={minDate}
                                    pixelsPerDay={pixelsPerDay}
                                    connectingFrom={connectingFrom}
                                    dependencies={anchorDependencies}
                                    onAnchorClick={handleAnchorClick}
                                    onAnchorHover={handleAnchorHover}
                                    holidays={holidays}
                                    calendarSettings={calendarSettings}
                                    dependencyDragDeltaDays={getCombinedTaskDeltaDays(task.id)}
                                    offsetY={MILESTONE_LANE_HEIGHT}
                                    rowStart={row.start}
                                    rowHeight={row.size}
                                    effectiveBarHeight={effectiveBarHeight}
                                    isCompact={isCompact}
                                    isHoverActive={false}
                                />
                            );
                        })}

                        {/* Task Labels */}
                        {rowData.map((row) => {
                            const task = tasks[row.index];
                            if (!task) return null;
                            if (!isMasterView && task.type === 'GROUP') return null;

                            const isCP = task.type === 'CP';
                            const isGroup = task.type === 'GROUP';

                            let labelBarHeight: number;
                            if (isCP) {
                                labelBarHeight = BAR_HEIGHT;
                            } else if (isGroup) {
                                const isBlock = isBlockTask(task);
                                labelBarHeight = isBlock ? BAR_HEIGHT : SUMMARY_BAR_HEIGHT;
                            } else {
                                labelBarHeight = effectiveBarHeight;
                            }
                            const y = row.start + (row.size - labelBarHeight) / 2 + MILESTONE_LANE_HEIGHT;
                            const useMasterStyle = isMasterView || (isUnifiedView && isCP);

                            return (
                                <TaskBar
                                    key={`label-${row.key}`}
                                    task={task}
                                    y={y}
                                    minDate={minDate}
                                    pixelsPerDay={pixelsPerDay}
                                    isMasterView={useMasterStyle}
                                    renderMode="label"
                                    allTasks={allTasks || tasks}
                                    holidays={holidays}
                                    calendarSettings={calendarSettings}
                                    dragInfo={getDragInfo(task.id)}
                                    groupDragDeltaDays={getTaskGroupDragDeltaDays(task.id)}
                                    groupDragInfo={getTaskDragInfo(task.id)}
                                    dependencyDragDeltaDays={getDependencyDragDeltaDays(task.id)}
                                    dependencyDragInfo={getDependencyDragInfo(task.id)}
                                    isFocused={focusedTaskId === task.id}
                                    barHeight={effectiveBarHeight}
                                />
                            );
                        })}

                        {/* Milestone Dashed Lines */}
                        {milestoneLayouts.map((layout) => {
                            const isDetail = layout.milestone.milestoneType === 'DETAIL';
                            const lineColor = isDetail ? GANTT_COLORS.milestoneDetail : GANTT_COLORS.milestone;
                            return (
                                <line
                                    key={`ms-line-${layout.milestone.id}`}
                                    x1={layout.x}
                                    y1={MILESTONE_LANE_HEIGHT}
                                    x2={layout.x}
                                    y2={chartHeight}
                                    stroke={lineColor}
                                    strokeWidth={1.2}
                                    strokeDasharray="4, 5"
                                    className="opacity-90 pointer-events-none"
                                />
                            );
                        })}

                        {/* Connection Preview Line */}
                        {!isMasterView && connectingFrom && hoveredAnchor && connectingFrom.taskId !== hoveredAnchor.taskId && (() => {
                            const sourceTask = tasks.find(t => t.id === connectingFrom.taskId);
                            const targetTask = tasks.find(t => t.id === hoveredAnchor.taskId);
                            const sourceIndex = tasks.findIndex(t => t.id === connectingFrom.taskId);
                            const targetIndex = tasks.findIndex(t => t.id === hoveredAnchor.taskId);

                            if (!sourceTask || !targetTask || sourceIndex < 0 || targetIndex < 0) return null;

                            const sourceRow = fullRowData.find(r => r.index === sourceIndex);
                            const targetRow = fullRowData.find(r => r.index === targetIndex);

                            const sourcePos = getAnchorPosition(
                                sourceTask, connectingFrom.dayIndex, sourceIndex,
                                minDate, pixelsPerDay, holidays, calendarSettings, MILESTONE_LANE_HEIGHT,
                                sourceRow?.start, sourceRow?.size, effectiveBarHeight
                            );
                            const targetPos = getAnchorPosition(
                                targetTask, hoveredAnchor.dayIndex, targetIndex,
                                minDate, pixelsPerDay, holidays, calendarSettings, MILESTONE_LANE_HEIGHT,
                                targetRow?.start, targetRow?.size, effectiveBarHeight
                            );

                            return (
                                <ConnectionPreviewLine
                                    sourceX={sourcePos.x}
                                    sourceY={sourcePos.y}
                                    targetX={targetPos.x}
                                    targetY={targetPos.y}
                                    isCompact={isCompact}
                                />
                            );
                        })()}

                        {/* Dependency Drag Indicator */}
                        {isDependencyDragging && (() => {
                            const connectedIds = getConnectedTaskIds();
                            if (connectedIds.length <= 1) return null;

                            return (
                                <g className="dependency-drag-indicator">
                                    <rect x={10} y={10} width={180} height={28} rx={6} fill={GANTT_COLORS.success} fillOpacity={0.9} />
                                    <text x={100} y={28} textAnchor="middle" fill="white" fontSize={12} fontWeight={600}>
                                        🔗 연결된 {connectedIds.length}개 태스크 이동 중
                                    </text>
                                </g>
                            );
                        })()}
                    </svg>

                    {showCriticalPath && (
                        <CriticalPathBar
                            tasks={allTasks || tasks}
                            holidays={holidays}
                            calendarSettings={calendarSettings}
                            minDate={minDate}
                            pixelsPerDay={pixelsPerDay}
                            totalWidth={chartWidth}
                            activeCPId={activeCPId}
                        />
                    )}

                    {isMasterView && showCriticalPath && (
                        <WorkDaysRatioBar
                            tasks={allTasks || tasks}
                            holidays={holidays}
                            calendarSettings={calendarSettings}
                            minDate={minDate}
                            pixelsPerDay={pixelsPerDay}
                            totalWidth={chartWidth}
                        />
                    )}

                    {contextMenu && onContextMenuAddMilestone && (
                        <TimelineContextMenu
                            x={contextMenu.x}
                            y={contextMenu.y}
                            clickedDate={contextMenu.clickedDate}
                            viewMode={viewMode}
                            onAddTask={onContextMenuAddTask}
                            onAddMilestone={onContextMenuAddMilestone}
                            onClose={handleContextMenuClose}
                            selectedDependencyId={selectedDepId}
                            onDeleteDependency={onAnchorDependencyDelete ? handleDepDelete : undefined}
                        />
                    )}
                </div>
            </div>
        );
    }
);

GanttTimeline.displayName = 'GanttTimeline';
