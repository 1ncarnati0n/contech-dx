/**
 * SVAR Gantt API Types
 */

import type { Task, TaskId } from "./task";
import type { Link } from "./link";
import type { ScaleConfig } from "./schedule";

/**
 * Gantt API Interface (from SVAR Gantt)
 */
export interface GanttApi {
  // Core methods
  exec: (action: string, payload?: unknown) => void;
  on: (event: string, handler: (payload: unknown) => void, options?: { tag?: symbol }) => void;
  detach: (tag: symbol) => void;
  
  // Data methods
  getTask: (id: TaskId) => Task | undefined;
  getState: () => GanttState;
  getStores: () => GanttStores;
  serialize: () => Task[];
  
  // UI methods
  setNext: (state: Partial<GanttState>) => void;
}

/**
 * Gantt State (reactive)
 */
export interface GanttState {
  tasks: TasksStore;
  links: Link[];
  scales: ScaleConfig[];
  selected?: TaskId[];
  activeTask?: TaskId;
  readonly?: boolean;
  // ... other state properties
}

/**
 * Tasks Store Interface
 */
export interface TasksStore {
  forEach?: (callback: (task: Task) => void) => void;
  getSummaryId?: (taskId: TaskId) => TaskId | undefined;
  getState?: () => { links: Link[] };
}

/**
 * Gantt Stores
 */
export interface GanttStores {
  data?: {
    getState?: () => { links: Link[] };
  };
}

/**
 * Event payload types
 */
export interface TaskEvent {
  id: TaskId;
  task?: Partial<Task>;
  inProgress?: boolean;
  source?: TaskId;
}

export interface LinkEvent {
  id: string | number;
  link?: Partial<Link>;
}

