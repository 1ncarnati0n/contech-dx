// ============================================
// SA-Gantt-Lib: 컴포넌트 Props 타입 정의
// ============================================

import type {
    ConstructionTask,
    Milestone,
    Dependency,
    ViewMode,
    ZoomLevel,
    DropPosition,
    GroupDragResult,
    AnchorDependency,
    AnchorDependencyDragResult,
} from './core';
import type { CalendarSettings } from './calendar';
import type { GanttErrorContext } from './ui';

// ============================================
// 컴포넌트 Props 인터페이스
// ============================================

/** 메인 GanttChart Props */
export interface GanttChartProps {
    // 필수 데이터
    tasks: ConstructionTask[];

    // 선택적 데이터
    milestones?: Milestone[];
    holidays?: Date[];
    calendarSettings?: CalendarSettings;

    // 초기 상태
    initialView?: ViewMode;
    initialZoomLevel?: ZoomLevel;
    initialExpandedIds?: string[];

    // 이벤트 핸들러 (외부 데이터 소스 연동용)
    onTaskUpdate?: (task: ConstructionTask) => void | Promise<void>;
    onTaskCreate?: (task: Partial<ConstructionTask>) => void | Promise<void>;
    onTaskDelete?: (taskId: string) => void | Promise<void>;
    onTaskReorder?: (taskId: string, newIndex: number) => void | Promise<void>;
    onDependencyCreate?: (taskId: string, dependency: Dependency) => void | Promise<void>;
    onDependencyDelete?: (taskId: string, dependencyId: string) => void | Promise<void>;
    onViewChange?: (view: ViewMode, activeCPId?: string) => void;
    onTaskGroup?: (taskIds: string[]) => void | Promise<void>;
    onTaskUngroup?: (groupId: string) => void | Promise<void>;
    onTaskMove?: (taskId: string, targetId: string, position: DropPosition) => void | Promise<void>;
    onGroupDrag?: (result: GroupDragResult) => void | Promise<void>;

    // 앵커 종속성 이벤트 핸들러
    anchorDependencies?: AnchorDependency[];
    onAnchorDependencyCreate?: (dependency: AnchorDependency) => void | Promise<void>;
    onAnchorDependencyDelete?: (depId: string) => void | Promise<void>;
    onAnchorDependencyDrag?: (result: AnchorDependencyDragResult) => void | Promise<void>;
    /** 순환 종속성 감지 시 호출되는 콜백 */
    onCycleDetected?: (info: { sourceTaskId: string; targetTaskId: string }) => void;

    // 마일스톤 이벤트 핸들러
    onMilestoneCreate?: (milestone: Partial<Milestone>) => void | Promise<void>;
    onMilestoneUpdate?: (milestone: Milestone) => void | Promise<void>;
    onMilestoneDelete?: (milestoneId: string) => void | Promise<void>;

    // 저장/초기화 (외부에서 제어)
    onSave?: () => void;
    onReset?: () => void;
    hasUnsavedChanges?: boolean;
    saveStatus?: 'idle' | 'saving' | 'saved';

    // 내보내기/가져오기 (mock.json 동기화용)
    onExport?: () => void;
    onExportExcel?: () => void;
    onImport?: (file: File) => void | Promise<void>;

    // 로딩된 파일명 표시
    loadedFileName?: string | null;

    // 에러 핸들링
    /** 에러 발생 시 호출되는 콜백 (사용자 알림용) */
    onError?: (error: Error, context: GanttErrorContext) => void;

    // 스타일링
    className?: string;
    style?: React.CSSProperties;
}

/** Sidebar Props */
export interface GanttSidebarProps {
    tasks: ConstructionTask[];
    viewMode: ViewMode;
    expandedIds: Set<string>;
    onToggle: (taskId: string) => void;
    onTaskClick: (task: ConstructionTask) => void;
}

/** Timeline Props */
export interface GanttTimelineProps {
    tasks: ConstructionTask[];
    milestones: Milestone[];
    viewMode: ViewMode;
    zoomLevel: ZoomLevel;
    holidays: Date[];
    calendarSettings: CalendarSettings;
    onTaskUpdate?: (task: ConstructionTask) => void;
}
