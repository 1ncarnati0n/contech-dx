'use client';

import { forwardRef, useCallback } from 'react';
import { differenceInDays } from 'date-fns';
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
    GroupDependency,
} from '../../types';
import { calculateGroupDateRange } from '../../utils/groupUtils';
import type { VirtualRow } from '../../hooks/useGanttVirtualization';

// Sub-components
import { TimelineHeader } from './TimelineHeader';
import { TimelineGrid } from './TimelineGrid';
import { MilestoneMarker } from './MilestoneMarker';
import { SvgDefs } from './SvgDefs';
import { TaskBar } from './TaskBar';
import { TimelineContextMenu } from './TimelineContextMenu';
import { GroupDependencyLines, GroupConnectionPreviewLine } from './GroupDependencyLines';

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
    // Group Dependencies
    groupDependencies?: GroupDependency[];
    onGroupDependencyCreate?: (dependency: GroupDependency) => void;
    onGroupDependencyDelete?: (depId: string) => void;
    onGroupCycleDetected?: (info: { sourceGroupId: string; targetGroupId: string }) => void;
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
            // Group Dependencies
            groupDependencies = [],
            onGroupDependencyCreate,
            onGroupDependencyDelete,
            onGroupCycleDetected,
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
            // Group Dependencies
            groupDependencies,
            onGroupDependencyCreate,
            onGroupDependencyDelete,
            onGroupCycleDetected,
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
            // Group Connection
            groupConnectingFrom,
            hoveredGroupEdge: _hoveredGroupEdge,
            selectedGroupDepId,
            hoveredGroupDepId,
            mousePosition,
            handleGroupEdgeClick,
            handleGroupEdgeHover,
            handleGroupDependencyClick,
            handleGroupDependencyHover,
            handleMouseMove,
            getGroupConnectionStatus,
        } = dragHandlers;

        const {
            selectTask,
            handleMilestoneDoubleClick: handleMilestoneDoubleClickHandler,
            handleContextMenu,
            handleContextMenuClose,
            handleSvgClick,
            setHoveredTaskId,
        } = eventHandlers;

        const { contextMenu } = contextMenuState;

        // 종속성 선 우클릭 핸들러
        const handleDependencyContextMenu = useCallback((depId: string, event: React.MouseEvent) => {
            // 종속성 선택
            handleGroupDependencyClick(depId);
            // 컨텍스트 메뉴 열기 (타입 단언으로 SVG 이벤트로 변환)
            handleContextMenu(event as React.MouseEvent<SVGSVGElement>);
        }, [handleGroupDependencyClick, handleContextMenu]);

        // ====================================
        // 프리뷰 라인을 위한 Source 앵커 좌표 계산
        // ====================================
        const getSourceAnchorCoords = useCallback((offsetY: number = 0) => {
            if (!groupConnectingFrom) return null;

            const sourceGroup = tasks.find(t => t.id === groupConnectingFrom.groupId);
            if (!sourceGroup) return null;

            const sourceIndex = tasks.findIndex(t => t.id === groupConnectingFrom.groupId);
            if (sourceIndex === -1) return null;

            // Group 바의 날짜 범위 계산 (상단에서 import한 함수 사용)
            const dateRange = calculateGroupDateRange(sourceGroup.id, allTasks || tasks);
            if (!dateRange) return null;

            const { startDate, totalDays } = dateRange;
            const startOffset = differenceInDays(startDate, minDate);
            const endX = (startOffset + totalDays) * pixelsPerDay;

            // Y 좌표 계산 (fullRowData 사용)
            const rowInfo = fullRowData.find(r => r.index === sourceIndex);
            const rowStart = rowInfo?.start ?? 0;
            const rowHeight = rowInfo?.size ?? 30;
            const bottomY = offsetY + rowStart + (rowHeight - SUMMARY_BAR_HEIGHT) / 2 + SUMMARY_BAR_HEIGHT;

            return { x: endX, y: bottomY };
        }, [groupConnectingFrom, tasks, allTasks, minDate, pixelsPerDay, fullRowData]);

        // SVG 마우스 이동 핸들러 (프리뷰 라인용)
        const handleSvgMouseMove = useCallback((e: React.MouseEvent<SVGSVGElement>, offsetY: number = 0) => {
            if (!groupConnectingFrom) {
                if (mousePosition) handleMouseMove(null);
                return;
            }

            const rect = e.currentTarget.getBoundingClientRect();
            const x = e.clientX - rect.left;
            const y = e.clientY - rect.top - offsetY;

            handleMouseMove({ x, y: y + offsetY });
        }, [groupConnectingFrom, mousePosition, handleMouseMove]);

        // SVG 마우스 리브 핸들러
        const handleSvgMouseLeave = useCallback(() => {
            if (groupConnectingFrom) {
                handleMouseMove(null);
            }
        }, [groupConnectingFrom, handleMouseMove]);

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
            const sourceAnchorContent = getSourceAnchorCoords(0);

            return (
                <div ref={ref} className="relative flex-1" style={{ backgroundColor: 'var(--gantt-bg-primary)' }}>
                    <svg
                        width={chartWidth}
                        height={taskAreaHeight}
                        className="block"
                        onContextMenu={handleContextMenu}
                        onClick={handleSvgClick}
                        onMouseMove={(e) => handleSvgMouseMove(e, 0)}
                        onMouseLeave={handleSvgMouseLeave}
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

                            const isBlock = task.type === 'BLOCK';
                            const isGroup = task.type === 'GROUP';
                            const isCP = task.type === 'CP';

                            let barHeightForTask: number;
                            if (isBlock || isCP) {
                                barHeightForTask = BAR_HEIGHT;
                            } else if (isGroup) {
                                barHeightForTask = SUMMARY_BAR_HEIGHT;
                            } else {
                                barHeightForTask = effectiveBarHeight;
                            }
                            const y = row.start + (row.size - barHeightForTask) / 2;

                            if (!isMasterView && (isBlock || isGroup)) {
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
                                        isDraggable={!!onGroupDrag}
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
                                        // Group Connection props (renderMode='content')
                                        connectingFrom={groupConnectingFrom}
                                        hasConnection={getGroupConnectionStatus(task.id)}
                                        onEdgeClick={onGroupDependencyCreate ? handleGroupEdgeClick : undefined}
                                        onEdgeHover={onGroupDependencyCreate ? handleGroupEdgeHover : undefined}
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
                                    onDragStart={handleBarMouseDown}
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

                        {/* Group Dependency Lines - content mode */}
                        {!isMasterView && groupDependencies.length > 0 && (
                            <GroupDependencyLines
                                tasks={tasks}
                                allTasks={allTasks || tasks}
                                dependencies={groupDependencies}
                                minDate={minDate}
                                pixelsPerDay={pixelsPerDay}
                                selectedDepId={selectedGroupDepId}
                                hoveredDepId={hoveredGroupDepId}
                                onDependencyClick={handleGroupDependencyClick}
                                onDependencyHover={handleGroupDependencyHover}
                                onDependencyContextMenu={onGroupDependencyDelete ? handleDependencyContextMenu : undefined}
                                offsetY={0}
                                rowData={fullRowData}
                                isCompact={isCompact}
                            />
                        )}

                        {/* Group Connection Preview Line - content mode */}
                        {!isMasterView && groupConnectingFrom && mousePosition && sourceAnchorContent && (
                            <GroupConnectionPreviewLine
                                sourceX={sourceAnchorContent.x}
                                sourceY={sourceAnchorContent.y}
                                targetX={mousePosition.x}
                                targetY={mousePosition.y}
                                isCompact={isCompact}
                            />
                        )}

                        {/* Task Labels */}
                        {rowData.map((row) => {
                            const task = tasks[row.index];
                            if (!task) return null;
                            // BLOCK, GROUP은 별도 바로 렌더링되므로 라벨 스킵
                            if (!isMasterView && (task.type === 'BLOCK' || task.type === 'GROUP')) return null;

                            const isBlock = task.type === 'BLOCK';
                            const isCP = task.type === 'CP';
                            const isGroup = task.type === 'GROUP';

                            let labelBarHeight: number;
                            if (isBlock || isCP) {
                                labelBarHeight = BAR_HEIGHT;
                            } else if (isGroup) {
                                labelBarHeight = SUMMARY_BAR_HEIGHT;
                            } else {
                                labelBarHeight = effectiveBarHeight;
                            }
                            const y = row.start + (row.size - labelBarHeight) / 2;
                            const useMasterStyle = isMasterView || (isUnifiedView && (isBlock || isCP));

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
                            selectedDependencyId={selectedGroupDepId}
                            onDeleteDependency={onGroupDependencyDelete}
                        />
                    )}
                </div>
            );
        }

        // ====================================
        // All 모드 (기존 전체 렌더링)
        // ====================================
        const sourceAnchorAll = getSourceAnchorCoords(MILESTONE_LANE_HEIGHT);

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
                        onMouseMove={(e) => handleSvgMouseMove(e, MILESTONE_LANE_HEIGHT)}
                        onMouseLeave={handleSvgMouseLeave}
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

                            const isBlock = task.type === 'BLOCK';
                            const isGroup = task.type === 'GROUP';
                            const isCP = task.type === 'CP';

                            let barHeightForTask: number;
                            if (isBlock || isCP) {
                                barHeightForTask = BAR_HEIGHT;
                            } else if (isGroup) {
                                barHeightForTask = SUMMARY_BAR_HEIGHT;
                            } else {
                                barHeightForTask = effectiveBarHeight;
                            }
                            const y = row.start + (row.size - barHeightForTask) / 2 + MILESTONE_LANE_HEIGHT;

                            if (!isMasterView && (isBlock || isGroup)) {
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
                                        isDraggable={!!onGroupDrag}
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
                                        // Group Connection props (renderMode='all')
                                        connectingFrom={groupConnectingFrom}
                                        hasConnection={getGroupConnectionStatus(task.id)}
                                        onEdgeClick={onGroupDependencyCreate ? handleGroupEdgeClick : undefined}
                                        onEdgeHover={onGroupDependencyCreate ? handleGroupEdgeHover : undefined}
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
                                    onDragStart={handleBarMouseDown}
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

                        {/* Group Dependency Lines */}
                        {!isMasterView && groupDependencies.length > 0 && (
                            <GroupDependencyLines
                                tasks={tasks}
                                allTasks={allTasks || tasks}
                                dependencies={groupDependencies}
                                minDate={minDate}
                                pixelsPerDay={pixelsPerDay}
                                selectedDepId={selectedGroupDepId}
                                hoveredDepId={hoveredGroupDepId}
                                onDependencyClick={handleGroupDependencyClick}
                                onDependencyHover={handleGroupDependencyHover}
                                onDependencyContextMenu={onGroupDependencyDelete ? handleDependencyContextMenu : undefined}
                                offsetY={MILESTONE_LANE_HEIGHT}
                                rowData={fullRowData}
                                isCompact={isCompact}
                            />
                        )}

                        {/* Group Connection Preview Line - all mode */}
                        {!isMasterView && groupConnectingFrom && mousePosition && sourceAnchorAll && (
                            <GroupConnectionPreviewLine
                                sourceX={sourceAnchorAll.x}
                                sourceY={sourceAnchorAll.y}
                                targetX={mousePosition.x}
                                targetY={mousePosition.y}
                                isCompact={isCompact}
                            />
                        )}

                        {/* Task Labels */}
                        {rowData.map((row) => {
                            const task = tasks[row.index];
                            if (!task) return null;
                            // BLOCK, GROUP은 별도 바로 렌더링되므로 라벨 스킵
                            if (!isMasterView && (task.type === 'BLOCK' || task.type === 'GROUP')) return null;

                            const isBlock = task.type === 'BLOCK';
                            const isCP = task.type === 'CP';
                            const isGroup = task.type === 'GROUP';

                            let labelBarHeight: number;
                            if (isBlock || isCP) {
                                labelBarHeight = BAR_HEIGHT;
                            } else if (isGroup) {
                                labelBarHeight = SUMMARY_BAR_HEIGHT;
                            } else {
                                labelBarHeight = effectiveBarHeight;
                            }
                            const y = row.start + (row.size - labelBarHeight) / 2 + MILESTONE_LANE_HEIGHT;
                            const useMasterStyle = isMasterView || (isUnifiedView && (isBlock || isCP));

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
                            selectedDependencyId={selectedGroupDepId}
                            onDeleteDependency={onGroupDependencyDelete}
                        />
                    )}
                </div>
            </div>
        );
    }
);

GanttTimeline.displayName = 'GanttTimeline';
