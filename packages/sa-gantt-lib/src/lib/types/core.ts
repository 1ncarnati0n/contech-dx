// ============================================
// SA-Gantt-Lib: 핵심 타입 정의
// ============================================

// ============================================
// 기본 타입
// ============================================

/** 공정 레벨 (Level 1: 공구공정표, Level 2: 주공정표) */
export type WbsLevel = 1 | 2;

/** 뷰 모드 (줌 레벨) */
export type ZoomLevel = 'DAY' | 'WEEK' | 'MONTH';

/** 현재 활성화된 뷰 (Master: L1, Detail: L2, Unified: 통합) */
export type ViewMode = 'MASTER' | 'DETAIL' | 'UNIFIED';

/** @deprecated 기존 배치 타입 - 하위 호환성을 위해 유지 */
export type Placement = 'PRE' | 'POST';

/** 유연한 연결을 위한 앵커 포인트 */
export type AnchorPoint = 'START' | 'NET_WORK_START' | 'NET_WORK_END' | 'END';

/** 종속성 타입 */
export type DependencyType = 'FS' | 'SS' | 'FF' | 'SF';

/** 태스크 타입 */
export type TaskType = 'GROUP' | 'CP' | 'TASK';

/** 드래그 앤 드롭 위치 타입 */
export type DropPosition = 'before' | 'after' | 'into';

// ============================================
// 종속성 인터페이스
// ============================================

export interface Dependency {
    id: string;
    predecessorId: string;
    type: DependencyType;
    lag?: number;                     // 지연 일수 (음수 가능)
    sourceAnchor?: AnchorPoint;       // 출발 지점
    targetAnchor?: AnchorPoint;       // 도착 지점
}

/** 앵커 기반 종속성 (양방향 연결 이동 지원) */
export interface AnchorDependency {
    id: string;
    sourceTaskId: string;             // 출발 태스크 ID
    targetTaskId: string;             // 도착 태스크 ID
    sourceDayIndex: number;           // 출발 앵커 위치 (태스크 시작 기준 오프셋, 0.5 단위)
    targetDayIndex: number;           // 도착 앵커 위치 (태스크 시작 기준 오프셋, 0.5 단위)
    lag?: number;                     // 지연 일수 (음수 가능)
}

/** 앵커 종속성 드래그 결과 */
export interface AnchorDependencyDragResult {
    sourceTaskId: string;             // 드래그 시작한 태스크 ID
    deltaDays: number;                // 이동한 일수 (참고용 - 하위 호환성)
    affectedTaskIds: string[];        // 함께 이동한 연결된 태스크 ID 목록
    /** 각 태스크의 스냅된 새 날짜 정보 (신규: 휴일 스냅 적용됨) */
    taskUpdates?: Array<{
        taskId: string;
        newStartDate: Date;
        newEndDate: Date;
    }>;
}

// ============================================
// 태스크 데이터 인터페이스
// ============================================

/** Level 1 전용 데이터 (공구 공정표 - CP/Aggregate) */
export interface CPData {
    workDaysTotal: number;            // 작업일수 (Vermilion)
    nonWorkDaysTotal: number;         // 비작업일수 (Teal)
}

/** GROUP 전용 데이터 (진행도 관리) */
export interface GroupData {
    progress?: number;                // 진행도 (0-100), 수동 입력
}

/** Level 2 전용 데이터 (주공정표 - Task Detail) */
export interface TaskData {
    netWorkDays: number;              // 순작업일 (Red) - 휴일 제외, 가운데 위치
    indirectWorkDaysPre: number;      // 앞 간접작업일 (Blue) - 휴일 포함, 왼쪽 위치
    indirectWorkDaysPost: number;     // 뒤 간접작업일 (Blue) - 휴일 포함, 오른쪽 위치
    indirectWorkNamePre?: string;     // 앞 간접작업명 (선택)
    indirectWorkNamePost?: string;    // 뒤 간접작업명 (선택)

    // Task별 캘린더 설정 (Optional - 없으면 전역 설정 사용)
    workOnSaturdays?: boolean;        // 기본 true (토요일 작업), false면 휴무
    workOnSundays?: boolean;          // 기본 false (일요일 휴무), true면 작업
    workOnHolidays?: boolean;         // 기본 false (공휴일 휴무), true면 작업

    // 산출 근거 (Phase 2: 자동 계산용)
    quantity?: number;                // 수량
    unit?: string;                    // 단위 (㎥, 본, ton, ㎡ 등)
    dailyOutput?: number;             // 1일 작업량
    crew?: number;                    // 작업조 수
}

// ============================================
// 메인 태스크 인터페이스
// ============================================

export interface ConstructionTask {
    // 기본 식별
    id: string;
    parentId: string | null;          // null = 루트
    wbsLevel: WbsLevel;
    type: TaskType;
    name: string;

    // 스케줄링 결과
    startDate: Date;
    endDate: Date;

    // Level별 데이터 (Optional)
    cp?: CPData;                      // Level 1 전용
    task?: TaskData;                  // Level 2 전용
    group?: GroupData;                // GROUP 타입 전용

    // 종속성
    dependencies: Dependency[];

    // UI 상태 (선택적)
    isExpanded?: boolean;
}

// ============================================
// 마일스톤 인터페이스
// ============================================

/** 마일스톤 타입 (MASTER: Master View용, DETAIL: Detail View용) */
export type MilestoneType = 'MASTER' | 'DETAIL';

export interface Milestone {
    id: string;
    date: Date;
    name: string;
    description?: string;
    milestoneType?: MilestoneType;  // 기본값: 'MASTER'
}

// ============================================
// 유틸리티 타입
// ============================================

/** 날짜 범위 */
export interface DateRange {
    start: Date;
    end: Date;
}

/** 픽셀 좌표 */
export interface Point {
    x: number;
    y: number;
}

/** 사각형 영역 */
export interface Rect {
    x: number;
    y: number;
    width: number;
    height: number;
}

// ============================================
// Critical Path 인터페이스
// ============================================

/** Critical Path 일별 상태 */
export interface CriticalPathDay {
    date: Date;
    workDayValue: number;            // 해당일 작업일 값 (0~1, 소수점 가능)
    nonWorkDayValue: number;         // 해당일 비작업일 값 (0~1, 소수점 가능)
    hasNetWork: boolean;             // 순작업 존재 여부
    hasIndirectWork: boolean;        // 간접작업 존재 여부
    isHoliday: boolean;              // 휴일 여부
    contributingTaskIds: string[];   // 해당일에 기여하는 Task ID들
}

/** Group Summary 바 드래그 결과 */
export interface GroupDragResult {
    groupId: string;                  // 드래그한 그룹 ID
    deltaDays: number;                // 이동한 일수 (양수: 오른쪽, 음수: 왼쪽)
    affectedTaskIds: string[];        // 영향받은 하위 Task ID 목록
    /** 각 task의 새 날짜 정보 (하위 Task 업데이트용) */
    taskUpdates?: Array<{
        taskId: string;
        newStartDate: Date;
    }>;
}

/** Critical Path 요약 정보 */
export interface CriticalPathSummary {
    startDate: Date;
    endDate: Date;
    totalDays: number;               // 총 기간 (달력일)
    workDays: number;                // 작업일수 (날짜 카운트 - 정수)
    nonWorkDays: number;             // 비작업일수 (날짜 카운트 - 정수)
    netWorkDaysTotal: number;        // 순작업일 합계 (소수점 포함)
    indirectWorkDaysTotal: number;   // 간접작업일 합계 (소수점 포함)
    dailyBreakdown: CriticalPathDay[];  // 일별 상세 정보
}
