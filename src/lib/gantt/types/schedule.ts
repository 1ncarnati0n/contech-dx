/**
 * Schedule Types for SVAR Gantt
 */

import type { Task } from "./task";
import type { Link } from "./link";

export type ViewType = "day" | "week" | "month";

export type SaveState = "idle" | "saving" | "saved" | "error";

/**
 * Scale configuration for timeline
 */
export interface ScaleConfig {
  unit: "year" | "month" | "week" | "day" | "hour";
  step: number;
  format: string;
}

/**
 * Complete schedule data
 */
export interface Schedule {
  tasks: Task[];
  links: Link[];
  scales?: ScaleConfig[];
}

/**
 * Schedule for database storage
 */
export interface ScheduleDTO {
  tasks: Array<Record<string, unknown>>;
  links: Array<Record<string, unknown>>;
  scales?: Array<Record<string, unknown>>;
}

