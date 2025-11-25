/**
 * Task Calculation Utilities
 */

import { toDateOrUndefined } from "./dateUtils";
import type { Task, TaskId } from "../types";

const MS_PER_DAY = 24 * 60 * 60 * 1000;

/**
 * Calculate task duration from start and end dates
 */
export function calculateTaskDuration(task: Partial<Task>): number {
  if (!task || typeof task !== "object") {
    return 0;
  }

  // If duration is explicitly set and valid, use it
  if (typeof task.duration === "number" && Number.isFinite(task.duration) && task.duration > 0) {
    return task.duration;
  }

  // Calculate from dates
  const start = toDateOrUndefined(task.start);
  const end = toDateOrUndefined(task.end);

  if (!start || !end) {
    return 0;
  }

  const diff = (end.getTime() - start.getTime()) / MS_PER_DAY;
  if (!Number.isFinite(diff) || diff <= 0) {
    return 0;
  }

  return diff;
}

/**
 * Normalize number value (for progress, etc.)
 */
export function normalizeNumber(value: unknown): number | undefined {
  if (typeof value === "number" && Number.isFinite(value)) {
    return value;
  }

  if (typeof value === "string" && value.trim().length) {
    const num = Number(value);
    if (!Number.isNaN(num)) {
      return num;
    }
  }

  return undefined;
}

/**
 * Clamp value between min and max
 */
export function clamp(value: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, value));
}

/**
 * Calculate weighted average progress from child tasks
 */
export function calculateWeightedProgress(
  children: Array<{ duration: number; progress: number }>
): number {
  let totalProgress = 0;
  let totalDuration = 0;

  for (const child of children) {
    if (child.duration > 0) {
      const progress = clamp(child.progress || 0, 0, 100);
      totalDuration += child.duration;
      totalProgress += child.duration * progress;
    }
  }

  if (totalDuration === 0) {
    return 0;
  }

  const average = totalProgress / totalDuration;
  return Number.isFinite(average) ? Math.round(clamp(average, 0, 100)) : 0;
}

/**
 * Check if task is a summary task
 */
export function isSummaryTask(task: Partial<Task>): boolean {
  return task.type === "summary";
}

/**
 * Check if task is a milestone
 */
export function isMilestone(task: Partial<Task>): boolean {
  return task.type === "milestone";
}

/**
 * Get all child task IDs recursively
 */
export function getAllChildIds(task: Task): TaskId[] {
  const ids: TaskId[] = [];

  function collect(t: Task) {
    if (t.data && Array.isArray(t.data)) {
      for (const child of t.data) {
        ids.push(child.id);
        collect(child);
      }
    }
  }

  collect(task);
  return ids;
}

