import type { FloorCategory } from './types';

// ============================================
// 제한값
// ============================================

/** 최대 코어 수 */
export const MAX_CORES = 4;

/** 코어당 최대 세대수 (좌+우 합산) */
export const MAX_TOTAL_UNITS = 3;

/** 최대 지하층 수 */
export const MAX_BASEMENT_FLOORS = 10;

/** 최대 지상층 수 */
export const MAX_GROUND_FLOORS = 60;

/** 최대 옥탑층 수 */
export const MAX_ROOFTOP_FLOORS = 5;

/** 셋팅층 오프셋 (필로티 층 + 이 값 = 셋팅층) */
export const SETTING_FLOOR_OFFSET = 1;

// ============================================
// 그리드 레이아웃
// ============================================

/** 층 라벨 열 너비 (px) */
export const GRID_LABEL_COL_WIDTH = 60;

/** 셀 최소 너비 (px) */
export const GRID_CELL_MIN_WIDTH = 40;

// ============================================
// 셀 라벨
// ============================================

export const CELL_LABELS = {
  FOUNDATION: '기초',
  PILOTI: '필로티',
  SCAFFOLDING: '3단',
  ROOFTOP: (n: number) => `옥탑${n}`,
  CORE: (id: number) => `코어${id}`,
  FLOOR: (n: number) => `${n}F`,
  BASEMENT: (n: number) => `B${n}`,
  PH: (n: number) => `PH${n}`,
} as const;

// ============================================
// 카테고리별 스타일 (셀 + 범례 공용)
// ============================================

interface CategoryStyleConfig {
  /** 셀 전체 스타일 (배경 + 테두리 + 텍스트) */
  cell: string;
  /** 범례용 스타일 (배경 + 테두리만) */
  legend: string;
  /** 범례 라벨 */
  label: string;
}

export const CATEGORY_STYLES: Record<FloorCategory, CategoryStyleConfig> = {
  setting: {
    cell: 'bg-blue-100 dark:bg-blue-900/40 border-blue-300 dark:border-blue-700 text-blue-800 dark:text-blue-200',
    legend: 'bg-blue-100 dark:bg-blue-900/40 border-blue-300 dark:border-blue-700',
    label: '셋팅층',
  },
  standard: {
    cell: 'bg-yellow-100 dark:bg-yellow-900/40 border-yellow-300 dark:border-yellow-700 text-yellow-800 dark:text-yellow-200',
    legend: 'bg-yellow-100 dark:bg-yellow-900/40 border-yellow-300 dark:border-yellow-700',
    label: '일반층',
  },
  basis: {
    cell: 'bg-yellow-50 dark:bg-yellow-900/20 border-yellow-200 dark:border-yellow-800 text-yellow-700 dark:text-yellow-300',
    legend: 'bg-yellow-50 dark:bg-yellow-900/20 border-yellow-200 dark:border-yellow-800',
    label: '기준층',
  },
  top: {
    cell: 'bg-green-100 dark:bg-green-900/40 border-green-300 dark:border-green-700 text-green-800 dark:text-green-200',
    legend: 'bg-green-100 dark:bg-green-900/40 border-green-300 dark:border-green-700',
    label: '최상층',
  },
  rooftop: {
    cell: 'bg-purple-100 dark:bg-purple-900/40 border-purple-300 dark:border-purple-700 text-purple-800 dark:text-purple-200',
    legend: 'bg-purple-100 dark:bg-purple-900/40 border-purple-300 dark:border-purple-700',
    label: '옥탑',
  },
  basement: {
    cell: 'bg-slate-200 dark:bg-slate-700 border-slate-300 dark:border-slate-600 text-slate-600 dark:text-slate-300',
    legend: 'bg-slate-200 dark:bg-slate-700 border-slate-300 dark:border-slate-600',
    label: '지하층',
  },
  foundation: {
    cell: 'bg-slate-400 dark:bg-slate-600 border-slate-500 dark:border-slate-500 text-white',
    legend: 'bg-slate-400 dark:bg-slate-600 border-slate-500 dark:border-slate-500',
    label: '기초',
  },
  piloti: {
    cell: 'bg-teal-100 dark:bg-teal-900/40 border-teal-300 dark:border-teal-700 text-teal-800 dark:text-teal-200',
    legend: 'bg-teal-100 dark:bg-teal-900/40 border-teal-300 dark:border-teal-700',
    label: '필로티',
  },
  scaffolding: {
    cell: 'bg-rose-100 dark:bg-rose-900/40 border-rose-300 dark:border-rose-700 text-rose-800 dark:text-rose-200',
    legend: 'bg-rose-100 dark:bg-rose-900/40 border-rose-300 dark:border-rose-700',
    label: '3단 가시설',
  },
};

/** 범례 표시 순서 */
export const LEGEND_ORDER: FloorCategory[] = [
  'setting', 'standard', 'basis', 'top', 'rooftop',
  'basement', 'foundation', 'piloti', 'scaffolding',
];

// ============================================
// 공용 토글 버튼 스타일
// ============================================

export const TOGGLE_BUTTON_BASE = 'w-6 h-6 text-[10px] rounded border transition-colors';

export const TOGGLE_STYLES = {
  amber: {
    active: 'bg-amber-500 text-white border-amber-600',
    inactive: 'bg-white dark:bg-slate-800 text-slate-500 border-slate-300 dark:border-slate-600 hover:border-amber-400',
  },
  rose: {
    active: 'bg-rose-500 text-white border-rose-600',
    inactive: 'bg-white dark:bg-slate-800 text-slate-500 border-slate-300 dark:border-slate-600 hover:border-rose-400',
  },
} as const;

// ============================================
// 섹션 컨테이너 스타일
// ============================================

export const SECTION_STYLES = {
  blue: 'bg-blue-50/50 dark:bg-blue-900/20 rounded-md border border-blue-100 dark:border-blue-800/30',
  green: 'bg-green-50/50 dark:bg-green-900/20 rounded-md border border-green-100 dark:border-green-800/30',
  amber: 'bg-amber-50/50 dark:bg-amber-900/20 rounded-md border border-amber-100 dark:border-amber-800/30',
  rose: 'bg-rose-50/50 dark:bg-rose-900/20 rounded-md border border-rose-100 dark:border-rose-800/30',
} as const;

export const SECTION_LABEL_STYLES = {
  blue: 'text-xs font-medium text-blue-600 dark:text-blue-400 whitespace-nowrap',
  green: 'text-xs font-medium text-green-600 dark:text-green-400 whitespace-nowrap',
  amber: 'text-xs font-medium text-amber-600 dark:text-amber-400 whitespace-nowrap',
  rose: 'text-xs font-medium text-rose-600 dark:text-rose-400 whitespace-nowrap',
} as const;

export const SECTION_SUB_LABEL_STYLES = {
  blue: 'text-[10px] text-blue-600 dark:text-blue-400',
  green: 'text-[10px] text-green-600 dark:text-green-400',
  amber: 'text-[10px] text-amber-600 dark:text-amber-400',
  rose: 'text-[10px] text-rose-600 dark:text-rose-400',
} as const;

// ============================================
// 공통 Input 스타일
// ============================================

export const INPUT_STYLES = {
  number: 'w-14 text-xs text-center',
  type: 'w-15 text-xs text-center',
} as const;
