// ============================================
// SA-Gantt-Lib: 타입 재export
// ============================================

// Core types
export type {
    WbsLevel,
    ZoomLevel,
    ViewMode,
    Placement,
    AnchorPoint,
    DependencyType,
    TaskType,
    DropPosition,
    Dependency,
    AnchorDependency,
    AnchorDependencyDragResult,
    CPData,
    GroupData,
    TaskData,
    ConstructionTask,
    Milestone,
    MilestoneType,
    DateRange,
    Point,
    Rect,
    CriticalPathDay,
    GroupDragResult,
    CriticalPathSummary,
} from './core';

// Calendar types
export type {
    CalendarSettings,
    Holiday,
    TaskDates,
} from './calendar';

// UI types
export type {
    GanttUIState,
    GanttUIActions,
    GanttStore,
    GanttErrorContext,
    TaskSelectOptions,
} from './ui';

// Props types
export type {
    GanttChartProps,
    GanttSidebarProps,
    GanttTimelineProps,
} from './props';

// Constants (values, not types)
export {
    GANTT_COLORS,
    GANTT_COLORS_STATIC,
    GANTT_LAYOUT,
    DEFAULT_MASTER_COLUMNS,
    DEFAULT_DETAIL_COLUMNS,
    DEFAULT_UNIFIED_COLUMNS,
    ZOOM_CONFIG,
    // Phase 1 신규 상수
    GANTT_ANCHOR,
    GANTT_DRAG,
    GANTT_SUMMARY,
    GANTT_STROKE,
    // Compact 모드 전용 상수
    GANTT_ANCHOR_COMPACT,
    GANTT_STROKE_COMPACT,
    GANTT_MARKER_COMPACT,
    // Compact mode helper
    getLayoutValues,
} from './constants';

// Column config type
export type { ColumnConfig, GanttColorKey } from './constants';

// Color helper function
export { getGanttColor } from './constants';
