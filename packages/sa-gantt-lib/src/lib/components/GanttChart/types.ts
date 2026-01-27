import type { ConstructionTask, Milestone, GanttChartProps, ViewMode, ZoomLevel } from '../../types';

export type SaveStatus = 'idle' | 'saving' | 'saved';

export interface GanttHeaderProps {
    viewMode: ViewMode;
    zoomLevel: ZoomLevel;
    activeCPId: string | null;
    isAddingTask: boolean;
    isAddingCP: boolean;
    hasUnsavedChanges?: boolean;
    saveStatus?: SaveStatus;
    // Compact Mode (Detail View only)
    isCompactMode?: boolean;
    // Handlers
    onViewChange: (mode: ViewMode, cpId?: string) => void;
    onZoomChange: (level: ZoomLevel) => void;
    onToggleCompact?: () => void;
    onStartAddTask?: () => void;
    onStartAddCP?: () => void;
    onStartAddMilestone?: () => void;
    onScrollToFirst: () => void;
    onCollapseAll?: () => void;
    onExpandAll?: () => void;
    onSave?: () => void | Promise<void>;
    onReset?: () => void;
    onExport?: () => void;
    onExportExcel?: () => void;
    onImport?: (file: File) => void;
    // 로딩된 파일명
    loadedFileName?: string | null;
    // Enabled flags
    canCreateTask?: boolean;
    canCreateMilestone?: boolean;
}

export interface GanttResizerProps {
    isResizing: boolean;
    onResizeStart: (e: React.MouseEvent) => void;
    onResizeDoubleClick: () => void;
}

export interface GanttContentProps {
    visibleTasks: ConstructionTask[];
    allTasks: ConstructionTask[];
    milestones: Milestone[];
    viewMode: ViewMode;
    activeCPId: string | null;
    zoomLevel: ZoomLevel;
    sidebarWidth: number;
    expandedTaskIds: Set<string>;
    holidays: Date[];
    calendarSettings: GanttChartProps['calendarSettings'];
    virtualRows: { index: number; start: number; size: number; key: number }[];
    totalHeight: number;
    isAddingTask: boolean;
    isAddingCP: boolean;
    // Sidebar handlers
    onToggleTask: (taskId: string) => void;
    onTaskClick: (task: ConstructionTask) => void;
    onTaskUpdate?: (task: ConstructionTask) => void | Promise<void>;
    onTaskCreate?: (task: Partial<ConstructionTask>) => void | Promise<void>;
    onTaskReorder?: (taskId: string, newIndex: number) => void;
    onTaskGroup?: (taskIds: string[]) => void;
    onTaskUngroup?: (groupId: string) => void;
    onTaskDelete?: (taskId: string) => void;
    onTaskMove?: (taskId: string, targetId: string, position: 'before' | 'after' | 'into') => void;
    onCancelAddTask?: () => void;
    onCancelAddCP?: () => void;
    onTaskDoubleClick?: (task: ConstructionTask) => void;
    // Timeline handlers
    onBarDrag?: (result: import('./index').BarDragResult) => void;
    onGroupDrag?: (result: import('../../types').GroupDragResult) => void;
    onMilestoneUpdate?: (milestone: Milestone) => void;
    onMilestoneDoubleClick?: (milestone: Milestone) => void;
    // Sidebar state
    sidebarTotalWidth: number | null;
    setSidebarTotalWidth: (width: number | null) => void;
}
