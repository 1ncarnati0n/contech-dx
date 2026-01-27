// ============================================
// SA-Gantt-Lib: UI 상태 타입 정의
// ============================================

import type { ViewMode, ZoomLevel, ConstructionTask } from './core';

// ============================================
// Selection Options (선택 동작 옵션)
// ============================================

export interface TaskSelectOptions {
    /** Ctrl/Cmd 키 누름 상태 */
    ctrlKey?: boolean;
    /** Shift 키 누름 상태 */
    shiftKey?: boolean;
    /** 현재 보이는 Task 목록 (Shift 범위 선택용) */
    visibleTasks?: ConstructionTask[];
}

// ============================================
// Store State 인터페이스 (UI 상태만)
// ============================================

export interface GanttUIState {
    // View State
    viewMode: ViewMode;
    activeCPId: string | null;        // Detail 뷰에서 선택된 CP ID
    zoomLevel: ZoomLevel;

    // UI Interaction State - Selection
    selectedTaskIds: Set<string>;         // 다중 선택된 Task ID들
    focusedTaskId: string | null;         // 키보드 포커스된 Task ID
    lastClickedIndex: number | null;      // Shift 클릭 범위 선택용

    // UI Interaction State - Hover & Expand
    hoveredTaskId: string | null;
    expandedTaskIds: Set<string>;

    // Sidebar
    sidebarWidth: number;

    // Drag State
    isDragging: boolean;
    dragType: 'MOVE' | 'RESIZE_PRE' | 'RESIZE_POST' | 'RESIZE_NET' | 'LINK' | null;
    dragTaskId: string | null;

    // Compact Mode (Detail View 전용)
    isCompactMode: boolean;
}

export interface GanttUIActions {
    // View Actions
    setViewMode: (mode: ViewMode, cpId?: string | null) => void;
    setZoomLevel: (level: ZoomLevel) => void;

    // Task Selection Actions
    selectTask: (taskId: string, options?: TaskSelectOptions) => void;
    selectMultipleTasks: (taskIds: string[]) => void;
    clearSelection: () => void;
    setFocusedTask: (taskId: string | null) => void;
    moveFocus: (direction: 'up' | 'down', visibleTasks: ConstructionTask[]) => void;

    // Task Hover & Expand Actions
    hoverTask: (taskId: string | null) => void;
    toggleTask: (taskId: string) => void;
    expandAll: (taskIds: string[]) => void;
    collapseAll: () => void;
    setExpandedTaskIds: (ids: Set<string>) => void;

    // Sidebar Actions
    setSidebarWidth: (width: number) => void;

    // Drag Actions
    startDrag: (type: GanttUIState['dragType'], taskId: string) => void;
    endDrag: () => void;

    // Compact Mode Actions
    toggleCompactMode: () => void;
    setCompactMode: (isCompact: boolean) => void;
}

export type GanttStore = GanttUIState & GanttUIActions;

// ============================================
// 에러 컨텍스트
// ============================================

/** 에러 발생 컨텍스트 정보 */
export interface GanttErrorContext {
    /** 에러가 발생한 작업 유형 */
    action: 'task_update' | 'task_create' | 'task_delete' | 'task_reorder' | 'task_move' | 'task_group' | 'task_ungroup' | 'dependency_create' | 'dependency_delete' | 'milestone_create' | 'milestone_update' | 'milestone_delete' | 'bar_drag' | 'unknown';
    /** 관련된 Task ID (있는 경우) */
    taskId?: string;
    /** 관련된 Milestone ID (있는 경우) */
    milestoneId?: string;
    /** 추가 정보 */
    details?: Record<string, unknown>;
}
