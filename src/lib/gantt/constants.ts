/**
 * Gantt Constants
 */

import type { TaskType } from "./types";

/**
 * Event tags for detaching listeners
 */
export const SYNC_EVENT_TAG = Symbol("gantt-sync-listener");
export const UI_EVENT_TAG = Symbol("gantt-ui-handlers");
export const SUMMARY_EVENT_TAG = Symbol("gantt-summary-progress");

/**
 * Time constants
 */
export const MS_PER_DAY = 24 * 60 * 60 * 1000;
export const MS_PER_HOUR = 60 * 60 * 1000;
export const MS_PER_MINUTE = 60 * 1000;

/**
 * Task type definitions with labels
 */
export const TASK_TYPES: Array<{ id: TaskType; label: string }> = [
  { id: "task", label: "일반작업 종속" },
  { id: "summary", label: "요약작업" },
  { id: "milestone", label: "마일스톤" },
  { id: "urgent", label: "일반작업 비종속" },
  { id: "narrow", label: "간접작업" },
  { id: "progress", label: "기타작업" },
  { id: "round", label: "간접작업 종속" },
];

/**
 * View type configurations
 */
export const VIEW_TYPES = {
  day: { id: "day" as const, label: "일", cellWidth: 36 },
  week: { id: "week" as const, label: "주", cellWidth: 120 },
  month: { id: "month" as const, label: "월", cellWidth: 180 },
};

/**
 * Cell dimensions
 */
export const CELL_HEIGHT = 36;
export const CELL_WIDTH_MAP = {
  day: 36,
  week: 120,
  month: 180,
} as const;

/**
 * Column widths
 */
export const COLUMN_WIDTHS = {
  start: 100,
  end: 100,
  duration: 45,
} as const;

