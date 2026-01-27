// ============================================
// SA-Gantt-Lib: 상수 정의
// ============================================

import type { ZoomLevel } from './core';

// ============================================
// 색상 상수 (CSS 변수 참조)
// ============================================

/**
 * 간트 차트 색상 - CSS 변수 참조
 * SVG fill/stroke 속성에서 직접 사용 가능
 * 테마 변경 시 자동으로 색상이 전환됨
 */
export const GANTT_COLORS = {
    // Level 1 Colors (공구 공정표)
    vermilion: 'var(--gantt-vermilion)',     // 작업일수 (Work Days)
    teal: 'var(--gantt-teal)',               // 비작업일수 (Non-Work Days)

    // Level 2 Colors (주공정표)
    red: 'var(--gantt-red)',                 // 순작업일 (Net Work)
    blue: 'var(--gantt-blue)',               // 간접작업일 (Indirect Work)

    // Milestone Colors
    milestone: 'var(--gantt-milestone)',              // Master 마일스톤
    milestoneDetail: 'var(--gantt-milestone-detail)', // Detail 마일스톤
    milestoneDetailHover: 'var(--gantt-milestone-detail-hover)',

    // UI Element Colors
    dependency: 'var(--gantt-dependency)',   // 연결선
    grid: 'var(--gantt-grid)',               // 그리드 라인
    gridDark: 'var(--gantt-grid-dark)',      // 그리드 라인 (진한)
    focus: 'var(--gantt-focus)',             // 포커스 색상
    success: 'var(--gantt-success)',         // 성공/확인 색상

    // Background Colors
    bgPrimary: 'var(--gantt-bg-primary)',
    bgSecondary: 'var(--gantt-bg-secondary)',
    bgHover: 'var(--gantt-bg-hover)',
    bgSelected: 'var(--gantt-bg-selected)',

    // Text Colors
    textPrimary: 'var(--gantt-text-primary)',
    textSecondary: 'var(--gantt-text-secondary)',
    textMuted: 'var(--gantt-text-muted)',
    textInverse: 'var(--gantt-text-inverse)',

    // Border Colors
    border: 'var(--gantt-border)',
    borderLight: 'var(--gantt-border-light)',
    borderFocus: 'var(--gantt-border-focus)',

    // Weekend/Holiday Background
    weekend: 'var(--gantt-weekend-bg)',
    holiday: 'var(--gantt-holiday-bg)',
    sunday: 'var(--gantt-sunday-bg)',

    // Summary Bar
    summaryBar: 'var(--gantt-summary-bar)',
    summaryProgress: 'var(--gantt-summary-progress)',

    // Anchor Points
    anchorFill: 'var(--gantt-anchor-fill)',
    anchorStroke: 'var(--gantt-anchor-stroke)',
    anchorHover: 'var(--gantt-anchor-hover)',

    // Tooltip
    tooltipBg: 'var(--gantt-tooltip-bg)',
    tooltipText: 'var(--gantt-tooltip-text)',

    // Drag Preview
    dragPreview: 'var(--gantt-drag-preview)',

    // Badge Colors (Block/Group 구분용)
    badgeBlock: '#e5e7eb',          // Block 배지 배경 (light gray)
    badgeBlockText: '#1f2937',      // Block 배지 텍스트 (dark gray)
    badgeBlockBorder: '#374151',    // Block 배지 테두리
    badgeGroup: '#b0b3b8',          // Group 배지 배경 (medium gray)
} as const;

/**
 * GANTT_COLORS 객체의 키 타입
 * IDE 자동완성 및 타입 검증에 활용
 * 
 * @example
 * const colorKey: GanttColorKey = 'vermilion';
 * const cssValue = GANTT_COLORS[colorKey];
 */
export type GanttColorKey = keyof typeof GANTT_COLORS;

/**
 * 타입 안전한 색상 접근 헬퍼
 * 
 * @param key - GANTT_COLORS의 키
 * @returns CSS 변수 문자열 (예: 'var(--gantt-vermilion)')
 * 
 * @example
 * // SVG fill 속성에서 사용
 * <rect fill={getGanttColor('vermilion')} />
 * 
 * // 동적 색상 선택
 * const barColor = getGanttColor(isWorkDay ? 'vermilion' : 'teal');
 */
export function getGanttColor(key: GanttColorKey): string {
    return GANTT_COLORS[key];
}

/**
 * 정적 색상값 (SSR/폴백용)
 * CSS 변수가 아닌 실제 색상값이 필요한 경우 사용
 */
export const GANTT_COLORS_STATIC = {
    // Level 1 Colors (공구 공정표)
    vermilion: '#E34234',
    teal: '#008080',

    // Level 2 Colors (주공정표)
    red: '#FF5252',
    blue: '#448AFF',

    // Common Colors
    milestone: '#4B5563',
    milestoneDetail: '#F59E0B',
    dependency: '#9CA3AF',
    grid: '#E5E7EB',
    focus: '#3B82F6',
} as const;

// ============================================
// 레이아웃 상수
// ============================================

export const GANTT_LAYOUT = {
    ROW_HEIGHT: 30,
    ROW_HEIGHT_COMPACT: 12,
    /** 그룹행 컴팩트 높이 (30% 감소: 30px → 21px) */
    GROUP_ROW_HEIGHT_COMPACT: 21,
    HEADER_HEIGHT: 80,
    MILESTONE_LANE_HEIGHT: 40,
    BAR_HEIGHT: 9,
    BAR_HEIGHT_COMPACT: 4,
    SIDEBAR_WIDTH: 500,
    SIDEBAR_MIN_WIDTH: 300,
    SIDEBAR_MAX_WIDTH: 800,
    SIDEBAR_MASTER_WIDTH: 500,
    SIDEBAR_DETAIL_WIDTH: 600,
    SIDEBAR_UNIFIED_WIDTH: 450,
    /** 뷰 전환 후 스크롤 대기 시간 (ms) */
    SCROLL_DELAY_MS: 100,
    /** SVG 하단 여백 (스크롤 시 종속선 계산용) */
    BOTTOM_PADDING: 100,
} as const;

/**
 * Compact 모드에 따른 레이아웃 값 반환
 * @param isCompact - Compact 모드 여부
 */
export function getLayoutValues(isCompact: boolean): { rowHeight: number; barHeight: number } {
    return {
        rowHeight: isCompact ? GANTT_LAYOUT.ROW_HEIGHT_COMPACT : GANTT_LAYOUT.ROW_HEIGHT,
        barHeight: isCompact ? GANTT_LAYOUT.BAR_HEIGHT_COMPACT : GANTT_LAYOUT.BAR_HEIGHT,
    };
}

// ============================================
// 사이드바 컬럼 설정
// ============================================

/** 컬럼 설정 인터페이스 */
export interface ColumnConfig {
    id: string;
    label: string;
    width: number;
    minWidth: number;
}

/** Master View 기본 컬럼 (총 470px) */
export const DEFAULT_MASTER_COLUMNS: ColumnConfig[] = [
    { id: 'name', label: 'CP명', width: 200, minWidth: 100 },
    { id: 'total', label: '총 공기', width: 90, minWidth: 60 },
    { id: 'workDays', label: '작업일수', width: 90, minWidth: 60 },
    { id: 'nonWorkDays', label: '비작업일수', width: 90, minWidth: 60 },
];

/** Detail View 기본 컬럼 (총 565px) */
export const DEFAULT_DETAIL_COLUMNS: ColumnConfig[] = [
    { id: 'name', label: '단위공정명', width: 180, minWidth: 80 },
    { id: 'indirectPre', label: '선간접', width: 65, minWidth: 45 },
    { id: 'netWork', label: '순작업', width: 65, minWidth: 45 },
    { id: 'indirectPost', label: '후간접', width: 65, minWidth: 45 },
    { id: 'startDate', label: '시작일', width: 95, minWidth: 75 },
    { id: 'endDate', label: '종료일', width: 95, minWidth: 75 },
];

/** Unified View 기본 컬럼 (총 450px) - CP/Task 공통 */
export const DEFAULT_UNIFIED_COLUMNS: ColumnConfig[] = [
    { id: 'name', label: '작업명', width: 220, minWidth: 120 },
    { id: 'duration', label: '기간', width: 70, minWidth: 50 },
    { id: 'startDate', label: '시작일', width: 80, minWidth: 70 },
    { id: 'endDate', label: '종료일', width: 80, minWidth: 70 },
];

// ============================================
// 줌 레벨별 설정
// ============================================

export const ZOOM_CONFIG: Record<ZoomLevel, { pixelsPerDay: number; label: string }> = {
    DAY: { pixelsPerDay: 30, label: '일' },
    WEEK: { pixelsPerDay: 10, label: '주' },
    MONTH: { pixelsPerDay: 2, label: '월' },
};

// ============================================
// 앵커 포인트 상수
// ============================================

/**
 * 앵커 포인트 관련 상수
 * AnchorPoints.tsx, DependencyLines.tsx에서 공통 사용
 */
export const GANTT_ANCHOR = {
    /** 기본 앵커 반지름 */
    RADIUS: 1.5,
    /** 활성화된 앵커 반지름 (연결 시작점) */
    RADIUS_ACTIVE: 2.5,
    /** 연결된 앵커 반지름 */
    RADIUS_CONNECTED: 2,
    /** 클릭 영역 반지름 (터치 친화적) */
    HIT_AREA: 10,
    /** 앵커 스트로크 너비 */
    STROKE_WIDTH: 1.5,
} as const;

// ============================================
// 드래그 핸들 상수
// ============================================

/**
 * 드래그 핸들 및 경로 관련 상수
 * TaskBar.tsx, DependencyLines.tsx에서 공통 사용
 */
export const GANTT_DRAG = {
    /** 양쪽 끝 드래그 핸들 너비 */
    HANDLE_WIDTH: 8,
    /** 내부 경계 드래그 핸들 너비 */
    BOUNDARY_HANDLE_WIDTH: 6,
    /** 종속성 경로 - 위로 갈 때 드롭다운 오프셋 */
    DROP_DOWN_OFFSET: 10,
    /** 종속성 경로 - 측면 X 오프셋 */
    PATH_OFFSET_X: 15,
} as const;

// ============================================
// 그룹 요약 바 상수
// ============================================

/**
 * 그룹 요약 바 관련 상수
 * GroupSummaryBar.tsx에서 사용
 */
export const GANTT_SUMMARY = {
    /** 요약 바 높이 */
    BAR_HEIGHT: 8,
    /** 수직 오프셋 (바를 아래로 배치) */
    VERTICAL_OFFSET: 4,
} as const;

// ============================================
// 스트로크 너비 상수
// ============================================

/**
 * SVG 스트로크 너비 상수
 * 종속성 선, 앵커 등에서 상태별 스트로크 너비
 */
export const GANTT_STROKE = {
    /** 기본 스트로크 너비 */
    DEFAULT: 1.5,
    /** 호버 상태 스트로크 너비 */
    HOVER: 2,
    /** 선택 상태 스트로크 너비 */
    SELECTED: 2.5,
} as const;

// ============================================
// Compact 모드 전용 상수
// ============================================

/**
 * Compact 모드 앵커 포인트 상수
 * 일반 모드 대비 약 50% 축소
 */
export const GANTT_ANCHOR_COMPACT = {
    /** 기본 앵커 반지름 */
    RADIUS: 1,
    /** 활성화된 앵커 반지름 (연결 시작점) */
    RADIUS_ACTIVE: 1.5,
    /** 연결된 앵커 반지름 */
    RADIUS_CONNECTED: 1.25,
    /** 앵커 스트로크 너비 */
    STROKE_WIDTH: 0.75,
} as const;

/**
 * Compact 모드 스트로크 너비 상수
 * 일반 모드 대비 약 50% 축소
 */
export const GANTT_STROKE_COMPACT = {
    /** 기본 스트로크 너비 */
    DEFAULT: 0.75,
    /** 호버 상태 스트로크 너비 */
    HOVER: 1,
    /** 선택 상태 스트로크 너비 */
    SELECTED: 1.25,
} as const;

/**
 * Compact 모드 마커(화살표) 상수
 * 일반 모드(5x5) 대비 축소
 */
export const GANTT_MARKER_COMPACT = {
    /** 마커 너비 */
    WIDTH: 3,
    /** 마커 높이 */
    HEIGHT: 3,
    /** 참조점 X (화살표 끝점) */
    REF_X: 2.5,
    /** 참조점 Y (중앙) */
    REF_Y: 1.5,
    /** 화살표 스트로크 너비 */
    STROKE_WIDTH: 0.75,
} as const;
