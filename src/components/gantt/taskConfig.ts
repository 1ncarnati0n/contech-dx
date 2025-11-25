import type { ViewType } from "./types";

export const TASK_TYPES = [
  { id: "task", label: "일반작업 종속" },
  { id: "summary", label: "요약작업" },
  { id: "milestone", label: "마일스톤" },
  { id: "urgent", label: "일반작업 비종속" },
  { id: "narrow", label: "간접작업" },
  { id: "progress", label: "기타작업" },
  { id: "round", label: "간접작업 종속" },
];

export const CELL_WIDTH_MAP: Record<ViewType, number> = {
  day: 36,
  week: 120,
  month: 180,
};

export const CELL_HEIGHT = 36;

