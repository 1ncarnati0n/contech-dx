// ============================================
// Renderer 공통 타입 정의
// ============================================

import type { ConstructionTask, ZoomLevel, CalendarSettings } from '../../../types';
import type { VirtualRow } from '../../../hooks/useGanttVirtualization';
import type { DragInfo, DragType, MilestoneWithLayout } from '../types';
import type { GroupConnectingState } from '../hooks/useGroupConnection';

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

    // Group/Block Handlers
    getGroupDragDeltaDays: (groupId: string) => number;
    handleGroupBarMouseDown: (
        e: React.MouseEvent,
        groupId: string,
        taskData: { startDate: Date; endDate: Date }
    ) => void;
    onGroupToggle?: (taskId: string) => void;

    // Selection
    selectTask: (taskId: string, options: { ctrlKey: boolean; shiftKey: boolean; visibleTasks: ConstructionTask[] }) => void;
    focusedTaskId?: string | null;

    // Callbacks
    onTaskDoubleClick?: (task: ConstructionTask) => void;
    onBarDrag?: boolean; // isDraggable flag
    onGroupDrag?: boolean;
    setHoveredTaskId: (taskId: string | null) => void;

    // Group Connection props
    /** 연결 중인 상태 (useGroupConnection에서 제공) */
    groupConnectingFrom?: GroupConnectingState | null;
    /** 연결 상태 확인 함수 */
    getGroupConnectionStatus: (groupId: string) => { start: boolean; end: boolean };
    /** 종속선 생성 가능 여부 */
    onGroupDependencyCreate?: boolean;
    /** Group 바 edge 클릭 핸들러 */
    handleGroupEdgeClick?: (groupId: string, edge: 'start' | 'end') => void;
    /** Group 바 edge 호버 핸들러 */
    handleGroupEdgeHover?: (groupId: string, edge: 'start' | 'end' | null) => void;

    /** Y축 오프셋 (마일스톤 레인 높이) */
    offsetY?: number;
}

/**
 * 태스크 라벨 렌더러 Props
 */
export interface TaskLabelsRendererProps {
    tasks: ConstructionTask[];
    rowData: VirtualRow[];
    allTasks: ConstructionTask[];
    minDate: Date;
    pixelsPerDay: number;
    effectiveBarHeight: number;
    isMasterView: boolean;
    isUnifiedView: boolean;
    holidays: Date[];
    calendarSettings: CalendarSettings;
    getDragInfo: (taskId: string) => DragInfo | null;
    getTaskGroupDragDeltaDays: (taskId: string) => number;
    getTaskDragInfo: (taskId: string) => { startDate: Date; endDate: Date } | null;
    focusedTaskId?: string | null;
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
