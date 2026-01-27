// ============================================
// GanttTimeline 로컬 타입 정의
// ============================================

import type { Milestone, ConstructionTask, CalendarSettings } from '../../types';

/** 드래그 타입 */
export type DragType =
    | 'move'           // 전체 이동
    | 'resize-pre'     // 왼쪽 끝 - 앞간접 또는 순작업 조절
    | 'resize-post'    // 오른쪽 끝 - 뒤간접 또는 순작업 조절
    | 'resize-pre-net' // 앞간접-순작업 경계
    | 'resize-net-post' // 순작업-뒤간접 경계
    | 'move-net';      // 순작업만 이동

/** 드래그 상태 정보 */
export interface DragInfo {
    startDate: Date;
    endDate: Date;
    indirectWorkDaysPre: number;
    indirectWorkDaysPost: number;
    netWorkDays: number;
}

/** Bar 드래그 결과 콜백 파라미터 */
export interface BarDragResult {
    taskId: string;
    dragType: DragType;
    newStartDate: Date;
    newEndDate: Date;
    newIndirectWorkDaysPre: number;
    newIndirectWorkDaysPost: number;
    newNetWorkDays: number;
}

/** 마일스톤 레이아웃 (충돌 감지 결과) */
export interface MilestoneWithLayout {
    milestone: Milestone;
    x: number;
    labelLevel: number;
}

/** 바 드래그 상태 */
export interface BarDragState {
    taskId: string;
    dragType: DragType;
    startX: number;
    originalStartDate: Date;
    originalEndDate: Date;
    originalIndirectWorkDaysPre: number;
    originalNetWorkDays: number;
    originalIndirectWorkDaysPost: number;
    currentStartDate: Date;
    currentEndDate: Date;
    currentIndirectWorkDaysPre: number;
    currentNetWorkDays: number;
    currentIndirectWorkDaysPost: number;
    lastDeltaX: number;
}

/** 마일스톤 드래그 상태 */
export interface MilestoneDragState {
    milestoneId: string;
    startX: number;
    originalDate: Date;
    currentX: number;
}

/** 그룹 드래그 상태 (D-2: 완전 투과 방식) */
export interface GroupDragState {
    groupId: string;
    startX: number;
    originalStartDate: Date;
    originalEndDate: Date;
    affectedTasks: ConstructionTask[];
    currentDeltaDays: number;
    // 휴일 스냅 관련 필드 제거됨 - 완전 투과 방식
}

/** 태스크별 드래그 정보 (그룹/종속성 드래그 시 사용) */
export interface TaskDragInfo {
    originalStartDate: Date;
    originalEndDate: Date;
    indirectWorkDaysPre: number;
    netWorkDays: number;
    indirectWorkDaysPost: number;
    currentStartDate: Date;
    currentEndDate: Date;
}

/** 종속성 드래그 상태 */
export interface DependencyDragState {
    sourceTaskId: string;
    startX: number;
    originalStartDate: Date;
    connectedTaskIds: string[];
    connectedTasks: ConstructionTask[];
    currentDeltaDays: number;
    lastDeltaX: number;
    taskDeltaMap: Map<string, number>;  // 하위 호환성용 (deprecated)

    // 크리티컬 패스 유지를 위한 신규 필드 (useGroupDrag와 동일)
    taskDragInfoMap: Map<string, TaskDragInfo>;
    referenceTask: ConstructionTask | null;
    workingDaysOffsets: Map<string, number>;
    currentDeltaWorkingDays: number;
}

// ============================================
// 드래그 Hook Options 타입
// ============================================

/** 드래그 Hook 공통 옵션 */
export interface BaseDragOptions {
    pixelsPerDay: number;
    holidays?: Date[];
    calendarSettings?: CalendarSettings;
}

/** TaskBar 렌더링 모드 */
export type TaskBarRenderMode = 'full' | 'bar' | 'label';

/** TaskBar Props */
export interface TaskBarProps {
    task: ConstructionTask;
    y: number;
    minDate: Date;
    pixelsPerDay: number;
    isMasterView: boolean;
    /** 렌더링 모드: 'full' (기본), 'bar' (바만), 'label' (라벨만) */
    renderMode?: TaskBarRenderMode;
    allTasks?: ConstructionTask[];
    holidays?: Date[];
    calendarSettings?: CalendarSettings;
    isDraggable?: boolean;
    dragInfo?: DragInfo | null;
    onDragStart?: (
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
    onDoubleClick?: () => void;
    groupDragDeltaDays?: number;
    /** 그룹 드래그 시 스냅된 날짜 정보 (새 방식: deltaDays보다 우선) */
    groupDragInfo?: { startDate: Date; endDate: Date } | null;
    // 앵커 종속성 관련 Props
    dependencyDragDeltaDays?: number;
    /** 종속성 드래그 시 스냅된 날짜 정보 (새 방식: deltaDays보다 우선) */
    dependencyDragInfo?: { startDate: Date; endDate: Date } | null;
    onDependencyDragStart?: (
        e: React.MouseEvent,
        taskId: string,
        taskData: { startDate: Date; endDate: Date }
    ) => boolean | void;
    hasDependency?: boolean;
    onMouseEnter?: () => void;
    onMouseLeave?: () => void;
    /** 키보드 포커스 상태 (하이라이팅 효과) */
    isFocused?: boolean;
    /** Compact 모드용 바 높이 (Detail View에서만 사용) */
    barHeight?: number;
}

/** MilestoneMarker Props */
export interface MilestoneMarkerProps {
    milestone: Milestone;
    x: number;
    labelLevel?: number;
    isDragging?: boolean;
    dragX?: number;
    onMouseDown?: (e: React.MouseEvent, milestone: Milestone) => void;
    onDoubleClick?: (milestone: Milestone) => void;
    /** 렌더링 모드: 'header' (Milestone Lane), 'body' (Timeline Body) */
    variant?: 'header' | 'body';
    /** body variant에서 수직선 높이 */
    lineHeight?: number;
}

/** TimelineHeader Props */
export interface TimelineHeaderProps {
    minDate: Date;
    totalDays: number;
    pixelsPerDay: number;
    zoomLevel: 'DAY' | 'WEEK' | 'MONTH';
    holidays: Date[];
    calendarSettings: CalendarSettings;
}

/** TimelineGrid Props (WeekendGrid) */
export interface TimelineGridProps {
    minDate: Date;
    totalDays: number;
    chartHeight: number;
    pixelsPerDay: number;
    holidays: Date[];
    calendarSettings: CalendarSettings;
    zoomLevel: 'DAY' | 'WEEK' | 'MONTH';
}
