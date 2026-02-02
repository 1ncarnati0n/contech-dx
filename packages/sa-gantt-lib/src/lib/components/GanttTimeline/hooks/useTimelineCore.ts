'use client';

import { useMemo, useCallback, useState } from 'react';
import {
    ConstructionTask,
    Milestone,
    ViewMode,
    ZoomLevel,
    CalendarSettings,
    GANTT_LAYOUT,
    ZOOM_CONFIG,
    GroupDependency,
    GroupDragResult,
} from '../../../types';
import { calculateDateRange, xToDate } from '../../../utils/dateUtils';
import { calculateMilestoneLabels } from '../MilestoneMarker';
import type { VirtualRow } from '../../../hooks/useGanttVirtualization';

// Hooks
import { useBarDrag } from './useBarDrag';
import { useMilestoneDrag } from './useMilestoneDrag';
import { useGroupDrag } from './useGroupDrag';
import { useGroupConnection, type GroupConnectingState, type MousePosition } from './useGroupConnection';
import { useGanttSelection } from '../../../store/useGanttStore';

// Types
import type { BarDragResult, DragInfo, DragType, MilestoneWithLayout } from '../types';

const { ROW_HEIGHT, GROUP_ROW_HEIGHT_COMPACT, MILESTONE_LANE_HEIGHT, BAR_HEIGHT, BOTTOM_PADDING } = GANTT_LAYOUT;

// ============================================
// Hook Props Interface
// ============================================

export interface UseTimelineCoreProps {
    tasks: ConstructionTask[];
    allTasks?: ConstructionTask[];
    milestones: Milestone[];
    viewMode: ViewMode;
    zoomLevel: ZoomLevel;
    holidays: Date[];
    calendarSettings: CalendarSettings;
    virtualRows?: VirtualRow[];
    totalHeight?: number;
    rowHeight?: number;
    barHeight?: number;
    focusedTaskId?: string | null;
    // Callbacks
    onBarDrag?: (result: BarDragResult) => void;
    onGroupDrag?: (result: GroupDragResult) => void;
    onMilestoneUpdate?: (milestone: Milestone) => void;
    onMilestoneDoubleClick?: (milestone: Milestone) => void;
    onTaskDoubleClick?: (task: ConstructionTask) => void;
    onContextMenuAddTask?: (date: Date) => void;
    onContextMenuAddMilestone?: (date: Date) => void;
    // Group Dependencies
    groupDependencies?: GroupDependency[];
    onGroupDependencyCreate?: (dependency: GroupDependency) => void;
    onGroupDependencyDelete?: (depId: string) => void;
    onGroupCycleDetected?: (info: { sourceGroupId: string; targetGroupId: string }) => void;
}

// ============================================
// Hook Return Interface
// ============================================

export interface TimelineCoreValues {
    // 계산된 값
    pixelsPerDay: number;
    isMasterView: boolean;
    isUnifiedView: boolean;
    isVirtualized: boolean;
    isCompact: boolean;
    effectiveRowHeight: number;
    effectiveBarHeight: number;
    minDate: Date;
    totalDays: number;
    chartWidth: number;
    chartHeight: number;
    taskAreaHeight: number;
    dynamicTotalHeight: number;

    // Maps & Data
    taskMap: Map<string, ConstructionTask>;
    rowData: VirtualRow[];
    fullRowData: VirtualRow[];
    filteredMilestones: Milestone[];
    milestoneLayouts: MilestoneWithLayout[];

    // 유틸 함수
    getRowHeight: (task: ConstructionTask) => number;
    isBlockTask: (task: ConstructionTask) => boolean;
}

export interface TimelineDragHandlers {
    // Bar Drag
    handleBarMouseDown: (
        e: React.MouseEvent,
        taskId: string,
        dragType: DragType,
        taskData: {
            startDate: Date;
            endDate: Date;
            indirectWorkDaysPre: number;
            netWorkDays: number;
            indirectWorkDaysPost: number;
        }
    ) => void;
    getDragInfo: (taskId: string) => DragInfo | null;

    // Milestone Drag
    handleMilestoneMouseDown: (e: React.MouseEvent, milestone: Milestone) => void;
    getMilestoneDragX: (milestoneId: string) => number | undefined;
    isMilestoneDragging: (milestoneId: string) => boolean;

    // Group Drag
    handleGroupBarMouseDown: (
        e: React.MouseEvent,
        groupId: string,
        taskData: { startDate: Date; endDate: Date }
    ) => void;
    getGroupDragDeltaDays: (groupId: string) => number;
    getTaskGroupDragDeltaDays: (taskId: string) => number;
    getTaskDragInfo: (taskId: string) => { startDate: Date; endDate: Date } | null;

    // Group Connection
    groupConnectingFrom: GroupConnectingState | null;
    hoveredGroupEdge: { groupId: string; edge: 'start' | 'end' } | null;
    selectedGroupDepId: string | null;
    hoveredGroupDepId: string | null;
    mousePosition: MousePosition | null;
    handleGroupEdgeClick: (groupId: string, edge: 'start' | 'end') => void;
    handleGroupEdgeHover: (groupId: string, edge: 'start' | 'end' | null) => void;
    handleGroupDependencyClick: (depId: string) => void;
    handleGroupDependencyHover: (depId: string | null) => void;
    handleMouseMove: (position: MousePosition | null) => void;
    clearGroupSelection: () => void;
    getGroupConnectionStatus: (groupId: string) => { start: boolean; end: boolean };
}

export interface TimelineEventHandlers {
    selectTask: ReturnType<typeof useGanttSelection>['selectTask'];
    clearTaskSelection: ReturnType<typeof useGanttSelection>['clearSelection'];
    handleMilestoneDoubleClick: (milestone: Milestone) => void;
    handleContextMenu: (e: React.MouseEvent<SVGSVGElement>) => void;
    handleContextMenuClose: () => void;
    handleSvgClick: (e: React.MouseEvent<SVGSVGElement>) => void;
    setHoveredTaskId: (taskId: string | null) => void;
}

export interface TimelineContextMenuState {
    contextMenu: { x: number; y: number; clickedDate: Date } | null;
}

export interface UseTimelineCoreReturn {
    values: TimelineCoreValues;
    dragHandlers: TimelineDragHandlers;
    eventHandlers: TimelineEventHandlers;
    contextMenuState: TimelineContextMenuState;
}

// ============================================
// useTimelineCore Hook
// ============================================

export const useTimelineCore = (props: UseTimelineCoreProps): UseTimelineCoreReturn => {
    const {
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
        onBarDrag,
        onGroupDrag,
        onMilestoneUpdate,
        onMilestoneDoubleClick,
        onContextMenuAddTask,
        onContextMenuAddMilestone,
        // Group Dependencies
        groupDependencies = [],
        onGroupDependencyCreate,
        onGroupDependencyDelete,
        onGroupCycleDetected,
    } = props;

    // ========================================
    // 기본 계산값
    // ========================================
    const pixelsPerDay = ZOOM_CONFIG[zoomLevel].pixelsPerDay;
    const isMasterView = viewMode === 'MASTER';
    const isUnifiedView = viewMode === 'UNIFIED';
    const isVirtualized = !!(virtualRows && virtualRows.length > 0);

    // Compact Mode Layout Values
    const effectiveRowHeight = rowHeight ?? ROW_HEIGHT;
    const effectiveBarHeight = barHeight ?? BAR_HEIGHT;
    const isCompact = effectiveBarHeight < BAR_HEIGHT;

    // ========================================
    // taskMap: O(1) 조회용 Map
    // ========================================
    const taskMap = useMemo(() =>
        new Map((allTasks || tasks).map(t => [t.id, t])),
        [allTasks, tasks]
    );

    // ========================================
    // 행 높이 계산 함수
    // ========================================
    const getRowHeight = useCallback((task: ConstructionTask) => {
        // BLOCK: 항상 30px
        if (task.type === 'BLOCK') {
            return ROW_HEIGHT;
        }
        // CP: 항상 30px
        if (task.type === 'CP') {
            return ROW_HEIGHT;
        }
        // GROUP (CP 하위): 컴팩트 모드에서 30% 감소
        if (task.type === 'GROUP') {
            return isCompact ? GROUP_ROW_HEIGHT_COMPACT : ROW_HEIGHT;
        }
        return effectiveRowHeight;
    }, [effectiveRowHeight, isCompact]);

    // ========================================
    // Block 판별 함수 (타입 기반으로 단순화)
    // ========================================
    const isBlockTask = useCallback((task: ConstructionTask): boolean => {
        return task.type === 'BLOCK';
    }, []);

    // ========================================
    // Selection Hook
    // ========================================
    const { selectTask, clearSelection: clearTaskSelection } = useGanttSelection();

    // ========================================
    // Context Menu State
    // ========================================
    const [contextMenu, setContextMenu] = useState<{
        x: number;
        y: number;
        clickedDate: Date;
    } | null>(null);

    // ========================================
    // Date Range Calculation
    // ========================================
    const { minDate, totalDays } = useMemo(() => {
        return calculateDateRange(allTasks || tasks, milestones, 60);
    }, [allTasks, tasks, milestones]);

    // ========================================
    // Milestone Filtering & Layout
    // ========================================
    const filteredMilestones = useMemo(() => {
        if (isMasterView) {
            return milestones.filter(m => !m.milestoneType || m.milestoneType === 'MASTER');
        }
        return milestones;
    }, [milestones, isMasterView]);

    const milestoneLayouts = useMemo(() => {
        return calculateMilestoneLabels(filteredMilestones, minDate, pixelsPerDay);
    }, [filteredMilestones, minDate, pixelsPerDay]);

    // ========================================
    // Chart Dimensions
    // ========================================
    const chartWidth = totalDays * pixelsPerDay;

    const { rowData, fullRowData, dynamicTotalHeight } = useMemo(() => {
        // fullRowData: 종속선 계산용 전체 행 데이터 (가상화 여부 무관)
        let cumulativeStart = 0;
        const fullData = tasks.map((task, i) => {
            const size = getRowHeight(task);
            const row = { index: i, start: cumulativeStart, size, key: i };
            cumulativeStart += size;
            return row;
        });

        const dynamicHeight = fullData.length === 0
            ? BOTTOM_PADDING
            : fullData[fullData.length - 1].start + fullData[fullData.length - 1].size + BOTTOM_PADDING;

        // rowData: 가상화 시 virtualRows 사용, 아니면 fullData
        const rowDataResult = isVirtualized ? virtualRows! : fullData;

        return { rowData: rowDataResult, fullRowData: fullData, dynamicTotalHeight: dynamicHeight };
    }, [tasks, getRowHeight, isVirtualized, virtualRows]);

    const taskAreaHeight = isVirtualized
        ? (virtualTotalHeight || dynamicTotalHeight)
        : dynamicTotalHeight;

    const chartHeight = Math.max(taskAreaHeight + MILESTONE_LANE_HEIGHT + 100, 500);

    // ========================================
    // Drag Hooks
    // ========================================
    const {
        handleBarMouseDown,
        getDragInfo,
    } = useBarDrag({
        pixelsPerDay,
        holidays,
        calendarSettings,
        onBarDrag,
    });

    const {
        handleMilestoneMouseDown,
        getMilestoneDragX,
        isMilestoneDragging,
    } = useMilestoneDrag({
        minDate,
        pixelsPerDay,
        milestones,
        onMilestoneUpdate,
    });

    const {
        handleGroupBarMouseDown,
        getGroupDragDeltaDays,
        getTaskGroupDragDeltaDays,
        getTaskDragInfo,
    } = useGroupDrag({
        pixelsPerDay,
        allTasks: allTasks || tasks,
        holidays,
        calendarSettings,
        onGroupDrag,
    });

    // Group Connection Hook
    const {
        connectingFrom: groupConnectingFrom,
        hoveredGroupEdge,
        selectedDepId: selectedGroupDepId,
        hoveredDepId: hoveredGroupDepId,
        mousePosition,
        handleGroupEdgeClick,
        handleGroupEdgeHover,
        handleDependencyClick: handleGroupDependencyClick,
        handleDependencyHover: handleGroupDependencyHover,
        handleMouseMove,
        clearSelection: clearGroupSelection,
    } = useGroupConnection({
        dependencies: groupDependencies,
        tasks: allTasks || tasks,
        onDependencyCreate: onGroupDependencyCreate,
        onDependencyDelete: onGroupDependencyDelete,
        onCycleDetected: onGroupCycleDetected,
    });

    // Group 연결 상태 조회 (시작점/끝점에 연결이 있는지)
    const getGroupConnectionStatus = useCallback((groupId: string): { start: boolean; end: boolean } => {
        const isTargetOfAny = groupDependencies.some(dep => dep.targetGroupId === groupId);
        const isSourceOfAny = groupDependencies.some(dep => dep.sourceGroupId === groupId);
        return { start: isTargetOfAny, end: isSourceOfAny };
    }, [groupDependencies]);

    // ========================================
    // Event Handlers
    // ========================================
    const [_hoveredTaskId, setHoveredTaskId] = useState<string | null>(null);

    const handleMilestoneDoubleClickHandler = useCallback((milestone: Milestone) => {
        if (onMilestoneDoubleClick) {
            onMilestoneDoubleClick(milestone);
        }
    }, [onMilestoneDoubleClick]);

    const handleContextMenu = useCallback((e: React.MouseEvent<SVGSVGElement>) => {
        // 컨텍스트 메뉴를 열 이유가 하나라도 있어야 함
        // - Task/Milestone 추가 메뉴
        // - 종속성 삭제 메뉴 (선택된 종속성이 있을 때)
        if (!onContextMenuAddTask && !onContextMenuAddMilestone && !onGroupDependencyDelete) return;

        e.preventDefault();
        const svg = e.currentTarget;
        const rect = svg.getBoundingClientRect();
        const svgX = e.clientX - rect.left;
        const clickedDate = xToDate(svgX, minDate, pixelsPerDay);

        setContextMenu({
            x: e.clientX,
            y: e.clientY,
            clickedDate,
        });
    }, [minDate, pixelsPerDay, onContextMenuAddTask, onContextMenuAddMilestone, onGroupDependencyDelete]);

    const handleContextMenuClose = useCallback(() => {
        setContextMenu(null);
    }, []);

    const handleSvgClick = useCallback((e: React.MouseEvent<SVGSVGElement>) => {
        if (e.target === e.currentTarget) {
            clearGroupSelection();
            clearTaskSelection();
        }
    }, [clearGroupSelection, clearTaskSelection]);

    // ========================================
    // Return Value
    // ========================================
    return {
        values: {
            pixelsPerDay,
            isMasterView,
            isUnifiedView,
            isVirtualized,
            isCompact,
            effectiveRowHeight,
            effectiveBarHeight,
            minDate,
            totalDays,
            chartWidth,
            chartHeight,
            taskAreaHeight,
            dynamicTotalHeight,
            taskMap,
            rowData,
            fullRowData,
            filteredMilestones,
            milestoneLayouts,
            getRowHeight,
            isBlockTask,
        },
        dragHandlers: {
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
            hoveredGroupEdge,
            selectedGroupDepId,
            hoveredGroupDepId,
            mousePosition,
            handleGroupEdgeClick,
            handleGroupEdgeHover,
            handleGroupDependencyClick,
            handleGroupDependencyHover,
            handleMouseMove,
            clearGroupSelection,
            getGroupConnectionStatus,
        },
        eventHandlers: {
            selectTask,
            clearTaskSelection,
            handleMilestoneDoubleClick: handleMilestoneDoubleClickHandler,
            handleContextMenu,
            handleContextMenuClose,
            handleSvgClick,
            setHoveredTaskId,
        },
        contextMenuState: {
            contextMenu,
        },
    };
};
