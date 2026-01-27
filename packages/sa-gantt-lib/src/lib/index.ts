/**
 * SA-Gantt-Lib
 * 건설 공정표 전문 간트 차트 라이브러리
 * 
 * @example
 * ```tsx
 * import { GanttChart, ConstructionTask, Milestone } from 'sa-gantt-lib';
 * 
 * const tasks: ConstructionTask[] = [...];
 * const milestones: Milestone[] = [...];
 * 
 * function App() {
 *   return (
 *     <GanttChart
 *       tasks={tasks}
 *       milestones={milestones}
 *       onTaskUpdate={(task) => console.log('Updated:', task)}
 *     />
 *   );
 * }
 * ```
 */

// ============================================
// Styles
// ============================================
import './style.css';

// ============================================
// Components
// ============================================
export { GanttChart } from './components/GanttChart';
export { GanttSidebar } from './components/GanttSidebar';
export { GanttTimeline } from './components/GanttTimeline';
export { TaskEditModal } from './components/TaskEditModal';
export { CriticalPathBar } from './components/CriticalPathBar';
export { WorkDaysRatioBar } from './components/WorkDaysRatioBar';
export { GroupSummaryBar } from './components/GroupSummaryBar';
export { BlockBar } from './components/BlockBar';
export { GanttErrorBoundary } from './components/GanttErrorBoundary';
export type { BarDragResult } from './components/GanttTimeline';

// ============================================
// Store (UI State Management)
// ============================================
export {
    useGanttStore,
    useGanttViewState,
    useGanttViewActions,
    useGanttSelection,
    useGanttExpansion,
    useGanttSidebar,
    useGanttDrag,
} from './store/useGanttStore';

// ============================================
// Context
// ============================================
export {
    GanttProvider,
    useGanttContext,
    useGanttContextOptional,
} from './context/GanttContext';
export type { GanttContextValue } from './context/GanttContext';

// ============================================
// Theme System
// ============================================
export {
    ThemeProvider,
    useTheme,
    useThemeSafe,
} from './context/ThemeContext';
export type { Theme, ResolvedTheme } from './context/ThemeContext';

export {
    ThemeToggle,
    ThemeToggleGroup,
} from './components/ThemeToggle';

// ============================================
// Hooks
// ============================================
export { useGanttVirtualization } from './hooks/useGanttVirtualization';
export type { VirtualRow, UseGanttVirtualizationOptions } from './hooks/useGanttVirtualization';

export { useHistory } from './hooks/useHistory';

export { useColumnResizer } from './hooks/useColumnResizer';

// ============================================
// Types
// ============================================
export type {
    // Core Types
    ConstructionTask,
    Milestone,
    Dependency,

    // Data Types
    CPData,
    TaskData,
    GroupData,
    TaskDates,
    GroupDragResult,

    // Enum Types
    WbsLevel,
    ZoomLevel,
    ViewMode,
    Placement,
    AnchorPoint,
    DependencyType,
    TaskType,
    DropPosition,

    // Settings
    CalendarSettings,
    Holiday,

    // Props
    GanttChartProps,
    GanttSidebarProps,
    GanttTimelineProps,

    // Store
    GanttUIState,
    GanttUIActions,
    GanttStore,

    // Utility Types
    DateRange,
    Point,
    Rect,

    // Critical Path Types
    CriticalPathDay,
    CriticalPathSummary,

    // Anchor Dependency Types
    AnchorDependency,
    AnchorDependencyDragResult,

    // Error Types
    GanttErrorContext,
} from './types';

// ============================================
// Constants
// ============================================
export {
    GANTT_COLORS,
    GANTT_COLORS_STATIC,
    GANTT_LAYOUT,
    ZOOM_CONFIG,
    DEFAULT_MASTER_COLUMNS,
    DEFAULT_DETAIL_COLUMNS,
    // Phase 1 신규 상수
    GANTT_ANCHOR,
    GANTT_DRAG,
    GANTT_SUMMARY,
    GANTT_STROKE,
    // Phase 5 타입 헬퍼
    getGanttColor,
} from './types';

export type { ColumnConfig, GanttColorKey } from './types';

// ============================================
// Utilities
// ============================================

// Class Name Utility
export { cn } from './utils/cn';

export {
    // Holiday/Weekend
    isHoliday,
    isWeekend,

    // Working Days Calculation
    addWorkingDays,
    subtractWorkingDays,
    addCalendarDays,

    // Dual Calendar (Construction-specific)
    calculateDualCalendarDates,
    getAnchorDate,

    // Pixel/Date Conversion
    dateToX,
    xToDate,
    getDateRangeWidth,
    getPixelsPerDay,

    // Date Range
    calculateDateRange,

    // Korean Holidays Data (2025~2027)
    KOREAN_HOLIDAYS_2025,
    KOREAN_HOLIDAYS_2026,
    KOREAN_HOLIDAYS_2027,
    KOREAN_HOLIDAYS_ALL,
    getKoreanHolidaysByYear,
    getKoreanHolidaysForYears,
} from './utils/dateUtils';

// Critical Path Utilities
export {
    calculateCriticalPath,
    formatCriticalPathSummary,
} from './utils/criticalPathUtils';

// Comparison Utilities
export {
    shallowEqualTasks,
    shallowEqualMilestones,
    shallowEqual,
    shallowEqualHistoryState,
} from './utils/comparisonUtils';

// Group Utilities
export {
    collectDescendantTasks,
    calculateGroupDateRange,
    buildChildrenMap,
} from './utils/groupUtils';

// Type Guards
export {
    isTaskWithDetails,
    isTaskWithCP,
    isGroupTask,
    isCPTask,
    isRegularTask,
    isValidDate,
    isValidMilestone,
    isValidDependency,
    isLevel1Task,
    isLevel2Task,
    isRootTask,
    isNonEmptyArray,
} from './utils/typeGuards';

// ============================================
// Services (Data Abstraction Layer)
// ============================================
export type { DataService, GanttData, DataServiceOptions } from './services';

export {
    LocalStorageService,
    createLocalStorageService,
    // Serializers
    isValidTaskData,
    isValidMilestoneData,
    isValidAnchorDependencyData,
    serializeGanttDataForExport,
    parseImportedData,
    parseMockTasks,
    parseMockMilestones,
    // Excel Export
    exportToExcel,
} from './services';

export type { ExcelExportData } from './services';
