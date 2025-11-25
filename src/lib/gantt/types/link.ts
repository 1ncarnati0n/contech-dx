/**
 * Link Types for SVAR Gantt
 */

import type { TaskId } from "./task";

export type LinkType = "e2s" | "s2s" | "e2e" | "s2e";

export type LinkId = string | number;

/**
 * Link Interface (Dependency between tasks)
 */
export interface Link {
  id: LinkId;
  source: TaskId;
  target: TaskId;
  type: LinkType;
}

/**
 * Link for database storage
 */
export interface LinkDTO {
  id: LinkId;
  gantt_chart_id: string;
  source_task_id: TaskId;
  target_task_id: TaskId;
  type: LinkType;
  created_at?: string;
}

