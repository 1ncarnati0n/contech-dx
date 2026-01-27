import { create } from 'zustand';
import { useShallow } from 'zustand/react/shallow';
import type { ConstructionTask } from '../types';
import {
    GanttStore,
    ViewMode,
    ZoomLevel,
    GANTT_LAYOUT,
    TaskSelectOptions,
} from '../types';

/**
 * 간트 차트 UI 상태 관리 Store
 * 
 * 이 Store는 UI 상태만 관리합니다.
 * 실제 데이터(tasks, milestones 등)는 Props로 전달받습니다.
 * 
 * Next.js + Supabase 환경에서는:
 * - 데이터: React Query / SWR로 관리
 * - UI 상태: 이 Store로 관리
 */
export const useGanttStore = create<GanttStore>((set, get) => ({
    // ====================================
    // Initial State
    // ====================================

    // View State
    viewMode: 'MASTER',
    activeCPId: null,
    zoomLevel: 'MONTH',  // Master View 기본: 월

    // UI Interaction State - Selection
    selectedTaskIds: new Set<string>(),
    focusedTaskId: null,
    lastClickedIndex: null,

    // UI Interaction State - Hover & Expand
    hoveredTaskId: null,
    expandedTaskIds: new Set<string>(),

    // Sidebar
    sidebarWidth: GANTT_LAYOUT.SIDEBAR_WIDTH,

    // Drag State
    isDragging: false,
    dragType: null,
    dragTaskId: null,

    // Compact Mode (Detail View 전용)
    isCompactMode: false,

    // ====================================
    // View Actions
    // ====================================

    setViewMode: (mode: ViewMode, cpId?: string | null) => {
        // 뷰 모드에 따른 사이드바 너비 및 줌 레벨 자동 조정
        let newWidth: number;
        let newZoomLevel: ZoomLevel;

        switch (mode) {
            case 'MASTER':
                newWidth = GANTT_LAYOUT.SIDEBAR_MASTER_WIDTH;
                newZoomLevel = 'MONTH';
                break;
            case 'DETAIL':
                newWidth = GANTT_LAYOUT.SIDEBAR_DETAIL_WIDTH;
                newZoomLevel = 'DAY';
                break;
            case 'UNIFIED':
                newWidth = GANTT_LAYOUT.SIDEBAR_UNIFIED_WIDTH;
                newZoomLevel = 'WEEK';  // 통합 뷰는 중간 줌 레벨
                break;
        }

        set({
            viewMode: mode,
            activeCPId: cpId ?? null,
            zoomLevel: newZoomLevel,
            sidebarWidth: newWidth,
        });
    },

    setZoomLevel: (level: ZoomLevel) => {
        set({ zoomLevel: level });
    },

    // ====================================
    // Task Selection Actions
    // ====================================

    selectTask: (taskId: string, options?: TaskSelectOptions) => {
        const { selectedTaskIds, lastClickedIndex } = get();
        const { ctrlKey, shiftKey, visibleTasks } = options ?? {};

        if (ctrlKey) {
            // Ctrl/Cmd + 클릭: 토글 선택
            const newSet = new Set(selectedTaskIds);
            if (newSet.has(taskId)) {
                newSet.delete(taskId);
            } else {
                newSet.add(taskId);
            }
            const rowIndex = visibleTasks?.findIndex(t => t.id === taskId) ?? null;
            set({
                selectedTaskIds: newSet,
                focusedTaskId: taskId,
                lastClickedIndex: rowIndex,
            });
        } else if (shiftKey && lastClickedIndex !== null && visibleTasks) {
            // Shift + 클릭: 범위 선택
            const currentIndex = visibleTasks.findIndex(t => t.id === taskId);
            if (currentIndex !== -1) {
                const start = Math.min(lastClickedIndex, currentIndex);
                const end = Math.max(lastClickedIndex, currentIndex);
                const newSet = new Set(selectedTaskIds);
                for (let i = start; i <= end; i++) {
                    if (visibleTasks[i]) {
                        newSet.add(visibleTasks[i].id);
                    }
                }
                set({
                    selectedTaskIds: newSet,
                    focusedTaskId: taskId,
                });
            }
        } else {
            // 단순 클릭: 단일 선택
            const rowIndex = visibleTasks?.findIndex(t => t.id === taskId) ?? null;
            set({
                selectedTaskIds: new Set([taskId]),
                focusedTaskId: taskId,
                lastClickedIndex: rowIndex,
            });
        }
    },

    selectMultipleTasks: (taskIds: string[]) => {
        set({
            selectedTaskIds: new Set(taskIds),
            focusedTaskId: taskIds.length > 0 ? taskIds[0] : null,
        });
    },

    clearSelection: () => {
        set({
            selectedTaskIds: new Set(),
            focusedTaskId: null,
            lastClickedIndex: null,
        });
    },

    setFocusedTask: (taskId: string | null) => {
        set({ focusedTaskId: taskId });
    },

    moveFocus: (direction: 'up' | 'down', visibleTasks: ConstructionTask[]) => {
        const { focusedTaskId, selectedTaskIds } = get();

        // 현재 포커스된 Task의 인덱스 찾기
        let currentIndex = -1;
        if (focusedTaskId) {
            currentIndex = visibleTasks.findIndex(t => t.id === focusedTaskId);
        } else if (selectedTaskIds.size > 0) {
            // 선택된 것 중 첫 번째
            const firstSelectedId = Array.from(selectedTaskIds)[0];
            currentIndex = visibleTasks.findIndex(t => t.id === firstSelectedId);
        }

        let newIndex: number;
        if (currentIndex === -1) {
            // 아무것도 선택되지 않은 경우 첫 번째로
            newIndex = 0;
        } else if (direction === 'up') {
            newIndex = Math.max(0, currentIndex - 1);
        } else {
            newIndex = Math.min(visibleTasks.length - 1, currentIndex + 1);
        }

        const newTask = visibleTasks[newIndex];
        if (newTask) {
            set({
                focusedTaskId: newTask.id,
                selectedTaskIds: new Set([newTask.id]),
                lastClickedIndex: newIndex,
            });
        }
    },

    // ====================================
    // Task Hover Actions
    // ====================================

    hoverTask: (taskId: string | null) => {
        set({ hoveredTaskId: taskId });
    },

    toggleTask: (taskId: string) => {
        const { expandedTaskIds } = get();
        const newExpanded = new Set(expandedTaskIds);

        if (newExpanded.has(taskId)) {
            newExpanded.delete(taskId);
        } else {
            newExpanded.add(taskId);
        }

        set({ expandedTaskIds: newExpanded });
    },

    expandAll: (taskIds: string[]) => {
        const { expandedTaskIds } = get();
        const newExpanded = new Set([...expandedTaskIds, ...taskIds]);
        set({ expandedTaskIds: newExpanded });
    },

    collapseAll: () => {
        set({ expandedTaskIds: new Set() });
    },

    setExpandedTaskIds: (ids: Set<string>) => {
        set({ expandedTaskIds: ids });
    },

    // ====================================
    // Sidebar Actions
    // ====================================

    setSidebarWidth: (width: number) => {
        const clampedWidth = Math.max(
            GANTT_LAYOUT.SIDEBAR_MIN_WIDTH,
            Math.min(width, GANTT_LAYOUT.SIDEBAR_MAX_WIDTH)
        );
        set({ sidebarWidth: clampedWidth });
    },

    // ====================================
    // Drag Actions
    // ====================================

    startDrag: (type, taskId) => {
        set({
            isDragging: true,
            dragType: type,
            dragTaskId: taskId,
        });
    },

    endDrag: () => {
        set({
            isDragging: false,
            dragType: null,
            dragTaskId: null,
        });
    },

    // ====================================
    // Compact Mode Actions
    // ====================================

    toggleCompactMode: () => {
        set((state) => ({ isCompactMode: !state.isCompactMode }));
    },

    setCompactMode: (isCompact: boolean) => {
        set({ isCompactMode: isCompact });
    },
}));

// ====================================
// Selector Hooks (성능 최적화)
// Zustand의 shallow 비교를 사용하여 불필요한 리렌더링 방지
// ====================================

/** 뷰 상태만 구독 */
export const useGanttViewState = () =>
    useGanttStore(
        useShallow((state) => ({
            viewMode: state.viewMode,
            activeCPId: state.activeCPId,
            zoomLevel: state.zoomLevel,
        }))
    );

/** 뷰 액션만 구독 */
export const useGanttViewActions = () =>
    useGanttStore(
        useShallow((state) => ({
            setViewMode: state.setViewMode,
            setZoomLevel: state.setZoomLevel,
        }))
    );

/** 선택 상태만 구독 */
export const useGanttSelection = () =>
    useGanttStore(
        useShallow((state) => ({
            selectedTaskIds: state.selectedTaskIds,
            focusedTaskId: state.focusedTaskId,
            lastClickedIndex: state.lastClickedIndex,
            selectTask: state.selectTask,
            selectMultipleTasks: state.selectMultipleTasks,
            clearSelection: state.clearSelection,
            setFocusedTask: state.setFocusedTask,
            moveFocus: state.moveFocus,
        }))
    );

/** 호버 상태만 구독 */
export const useGanttHover = () =>
    useGanttStore(
        useShallow((state) => ({
            hoveredTaskId: state.hoveredTaskId,
            hoverTask: state.hoverTask,
        }))
    );

/** 확장 상태만 구독 */
export const useGanttExpansion = () =>
    useGanttStore(
        useShallow((state) => ({
            expandedTaskIds: state.expandedTaskIds,
            toggleTask: state.toggleTask,
            expandAll: state.expandAll,
            collapseAll: state.collapseAll,
            setExpandedTaskIds: state.setExpandedTaskIds,
        }))
    );

/** 사이드바 상태만 구독 */
export const useGanttSidebar = () =>
    useGanttStore(
        useShallow((state) => ({
            sidebarWidth: state.sidebarWidth,
            setSidebarWidth: state.setSidebarWidth,
        }))
    );

/** 드래그 상태만 구독 */
export const useGanttDrag = () =>
    useGanttStore(
        useShallow((state) => ({
            isDragging: state.isDragging,
            dragType: state.dragType,
            dragTaskId: state.dragTaskId,
            startDrag: state.startDrag,
            endDrag: state.endDrag,
        }))
    );

/** Compact 모드 상태만 구독 */
export const useGanttCompactMode = () =>
    useGanttStore(
        useShallow((state) => ({
            isCompactMode: state.isCompactMode,
            toggleCompactMode: state.toggleCompactMode,
            setCompactMode: state.setCompactMode,
        }))
    );
