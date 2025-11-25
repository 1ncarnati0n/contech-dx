/**
 * Gantt Hooks - Public API
 */

// Main orchestrator hook
export { useGanttSchedule, type UseGanttScheduleResult } from "./useGanttSchedule";

// Individual hooks (for advanced usage)
export { useGanttData } from "./useGanttData";
export { useGanttEvents } from "./useGanttEvents";
export { useSummaryProgress } from "./useSummaryProgress";

