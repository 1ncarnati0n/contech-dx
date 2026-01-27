// ============================================
// Renderer 공통 타입 정의
// ============================================

import type { ConstructionTask, ZoomLevel, CalendarSettings, AnchorDependency } from '../../../types';
import type { VirtualRow } from '../../../hooks/useGanttVirtualization';
import type { DragInfo, DragType, MilestoneWithLayout } from '../types';

/**
 * 그리드 라인 렌더러 Props
 */
export interface GridLinesRendererProps {
    minDate: Date;
    totalDays: number;
    chartHeight: number;
    pixelsPerDay: number;
    zoomLevel: ZoomLevel;
    /** 마일스톤 레인 높이 오프셋 (all 모드에서 사용) */
    offsetY?: number;
}

/**
 * 수평선 렌더러 Props
 */
export interface HorizontalLinesRendererProps {
    rowData: VirtualRow[];
    chartWidth: number;
    offsetY?: number;
}

/**
 * 태스크 영역 렌더러 Props
 */
export interface TaskAreaRendererProps {
    // 데이터
    tasks: ConstructionTask[];
    allTasks: ConstructionTask[];
    rowData: VirtualRow[];
    fullRowData: VirtualRow[];
    anchorDependencies: AnchorDependency[];

    // 계산값
    minDate: Date;
    pixelsPerDay: number;
    chartWidth: number;
    effectiveBarHeight: number;
    isCompact: boolean;
    isMasterView: boolean;
    isUnifiedView: boolean;

    // 유틸 함수
    isBlockTask: (task: ConstructionTask) => boolean;

    // 캘린더 설정
    holidays: Date[];
    calendarSettings: CalendarSettings;

    // Drag Handlers
    getDragInfo: (taskId: string) => DragInfo | null;
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
    getTaskGroupDragDeltaDays: (taskId: string) => number;
    getTaskDragInfo: (taskId: string) => { startDate: Date; endDate: Date } | null;
    getDependencyDragDeltaDays: (taskId: string) => number;
    getDependencyDragInfo: (taskId: string) => { startDate: Date; endDate: Date } | null;
    getCombinedTaskDeltaDays: (taskId: string) => number;

    // Group/Block Handlers
    getGroupDragDeltaDays: (groupId: string) => number;
    handleGroupBarMouseDown: (
        e: React.MouseEvent,
        groupId: string,
        taskData: { startDate: Date; endDate: Date }
    ) => void;
    onGroupToggle?: (taskId: string) => void;

    // Dependency Drag
    handleDependencyBarMouseDown: (
        e: React.MouseEvent,
        taskId: string,
        taskData: { startDate: Date; endDate: Date }
    ) => boolean | void;
    taskHasDependency: (taskId: string) => boolean;
    isDependencyDragging: boolean;
    getConnectedTaskIds: () => string[];

    // Anchor Connection
    connectingFrom: { taskId: string; dayIndex: number } | null;
    hoveredAnchor: { taskId: string; dayIndex: number } | null;
    selectedDepId: string | null;
    hoveredDepId: string | null;
    handleAnchorClick: (taskId: string, dayIndex: number) => void;
    handleAnchorHover: (taskId: string, dayIndex: number | null) => void;
    handleDependencyClick: (depId: string) => void;
    handleDependencyHover: (depId: string | null) => void;

    // Selection
    selectTask: (taskId: string, options: { ctrlKey: boolean; shiftKey: boolean; visibleTasks: ConstructionTask[] }) => void;
    focusedTaskId?: string | null;

    // Callbacks
    onTaskDoubleClick?: (task: ConstructionTask) => void;
    onBarDrag?: boolean; // isDraggable flag
    onGroupDrag?: boolean;
    setHoveredTaskId: (taskId: string | null) => void;

    /** Y축 오프셋 (마일스톤 레인 높이) */
    offsetY?: number;
}

/**
 * 마일스톤 대시선 렌더러 Props
 */
export interface MilestoneDashLinesProps {
    milestoneLayouts: MilestoneWithLayout[];
    startY: number;
    endY: number;
}

/**
 * 연결 프리뷰 렌더러 Props
 */
export interface ConnectionPreviewRendererProps {
    tasks: ConstructionTask[];
    fullRowData: VirtualRow[];
    connectingFrom: { taskId: string; dayIndex: number } | null;
    hoveredAnchor: { taskId: string; dayIndex: number } | null;
    minDate: Date;
    pixelsPerDay: number;
    holidays: Date[];
    calendarSettings: CalendarSettings;
    effectiveBarHeight: number;
    isCompact: boolean;
    offsetY: number;
}
