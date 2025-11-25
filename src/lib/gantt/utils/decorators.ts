/**
 * Task Decorator Utilities
 * Add visual properties (colors, etc.) to tasks
 */

import { toDateOrUndefined } from "./dateUtils";
import type { Task } from "../types";

/**
 * Task type color palette
 */
const TYPE_COLORS: Record<string, { bar: string; progress: string }> = {
  urgent: { bar: "#f49a82", progress: "#f45e36" },
  narrow: { bar: "#676a81", progress: "#1a2630" },
  progress: { bar: "#00bcd4", progress: "#00bcd4" },
  round: { bar: "#10b981", progress: "#6ee7b7" },
};

/**
 * Decorate task with visual properties and proper date objects
 */
export function decorateTask(task: Partial<Task>): Task {
  const decorated: Partial<Task> = { ...task };

  // Convert dates to Date objects
  const start = toDateOrUndefined(decorated.start);
  if (start) {
    decorated.start = new Date(start);
  }

  const end = toDateOrUndefined(decorated.end);
  if (end) {
    decorated.end = new Date(end);
  }

  const baseStart = toDateOrUndefined(decorated.base_start);
  if (baseStart) {
    decorated.base_start = new Date(baseStart);
  }

  const baseEnd = toDateOrUndefined(decorated.base_end);
  if (baseEnd) {
    decorated.base_end = new Date(baseEnd);
  }

  // Milestones don't have end dates or duration
  if (decorated.type === "milestone") {
    decorated.duration = 0;
    delete decorated.end;
  }

  // Apply type-specific colors
  const typeKey = typeof decorated.type === "string" ? decorated.type : "";
  const palette = TYPE_COLORS[typeKey];
  if (palette) {
    decorated.color = palette.bar;
    decorated.progressColor = palette.progress;
  }

  return decorated as Task;
}

/**
 * Decorate multiple tasks
 */
export function decorateTasks(tasks: Array<Partial<Task>>): Task[] {
  return tasks.map((task) => decorateTask(task));
}

