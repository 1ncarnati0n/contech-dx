/**
 * Task Types for SVAR Gantt
 */

export type TaskType = "task" | "summary" | "milestone" | "urgent" | "narrow" | "progress" | "round";

export type TaskId = string | number;

/**
 * Core Task Interface
 */
export interface Task {
  id: TaskId;
  text: string;
  type: TaskType;
  start: Date | string;
  end?: Date | string;
  duration?: number;
  progress?: number;
  parent?: TaskId;
  position?: number;
  open?: boolean;
  lazy?: boolean;
  
  // Custom fields
  category?: string;
  workType?: string;
  assigned?: TaskId;
  
  // Baseline (계획 일정)
  base_start?: Date | string;
  base_end?: Date | string;
  
  // UI styling
  color?: string;
  progressColor?: string;
  
  // Nested tasks (for summary)
  data?: Task[];
}

/**
 * Task for database storage (serialized)
 */
export interface TaskDTO {
  id: TaskId;
  gantt_chart_id: string;
  text: string;
  type: TaskType;
  start_date: string; // ISO date string
  end_date?: string;
  progress: number;
  parent_id?: TaskId;
  position: number;
  open: boolean;
  assigned_to?: string;
  category?: string;
  work_type?: string;
  created_at?: string;
  updated_at?: string;
}

/**
 * Task with metadata (from SVAR Gantt API)
 */
export interface TaskWithMeta extends Task {
  $level?: number;
  $index?: number;
  $parent?: Task;
}

