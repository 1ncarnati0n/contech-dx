/**
 * Task/Link Serialization Utilities
 */

import { toIsoDate } from "./dateUtils";
import { normalizeNumber } from "./taskCalculations";
import type { Task, Link } from "../types";

/**
 * Serialize task for API/storage (convert to plain object with string dates)
 */
export function serializeTask(taskInput: Partial<Task>): Record<string, unknown> {
  const serialized: Record<string, unknown> = {};

  if (taskInput.id !== undefined) serialized.id = taskInput.id;
  if (taskInput.text !== undefined) serialized.text = taskInput.text;
  if (taskInput.type !== undefined) serialized.type = taskInput.type;

  // Serialize start date
  const startDate = toIsoDate(taskInput.start);
  if (startDate) serialized.start = startDate;

  // Serialize end date (skip for milestones)
  if (taskInput.type === "milestone") {
    // Milestones only have start date
  } else {
    const endDate = toIsoDate(taskInput.end);
    if (endDate) {
      serialized.end = endDate;
    }
  }

  // Serialize baseline dates
  const baseStart = toIsoDate(taskInput.base_start);
  if (baseStart) serialized.base_start = baseStart;

  const baseEnd = toIsoDate(taskInput.base_end);
  if (baseEnd) serialized.base_end = baseEnd;

  // Normalize progress
  const normalizedProgress = normalizeNumber(taskInput.progress);
  if (typeof normalizedProgress !== "undefined") {
    serialized.progress = normalizedProgress;
  }

  // Copy other fields
  if (taskInput.parent !== undefined) serialized.parent = taskInput.parent;
  if (taskInput.lazy !== undefined) serialized.lazy = taskInput.lazy;
  if (taskInput.category !== undefined) serialized.category = taskInput.category;
  if (taskInput.workType !== undefined) serialized.workType = taskInput.workType;
  if (taskInput.open !== undefined) serialized.open = taskInput.open;

  return serialized;
}

/**
 * Serialize link for API/storage
 */
export function serializeLink(linkInput: Partial<Link>): Record<string, unknown> {
  const serialized: Record<string, unknown> = {};

  if (linkInput.id !== undefined) serialized.id = linkInput.id;
  if (linkInput.source !== undefined) serialized.source = linkInput.source;
  if (linkInput.target !== undefined) serialized.target = linkInput.target;
  if (linkInput.type !== undefined) serialized.type = linkInput.type;

  return serialized;
}

/**
 * Serialize complete schedule for API/storage
 */
export function serializeSchedule(
  tasks: Array<Partial<Task>>,
  links: Array<Partial<Link>>,
  scales?: Array<Record<string, unknown>>
): Record<string, unknown> {
  return {
    tasks: tasks.map((task) => serializeTask(task)),
    links: links.map((link) => serializeLink(link)),
    scales: scales?.map((scale) => ({
      unit: scale.unit,
      step: scale.step,
      format: scale.format,
    })),
  };
}

