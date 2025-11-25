/**
 * Re-export types from lib/gantt/types
 * This file is kept for backward compatibility
 */

export type {
  ViewType,
  SaveState,
  Task,
  Link,
  Schedule,
  TaskId,
  LinkId,
} from "@/lib/gantt/types";

// Legacy type alias
export type { Schedule as ScheduleData } from "@/lib/gantt/types";

