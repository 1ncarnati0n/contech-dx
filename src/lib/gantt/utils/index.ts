/**
 * Gantt Utils - Public API
 */

// Date utilities
export {
  toIsoDate,
  toDateOrUndefined,
  calculateDaysBetween,
  addDays,
  formatDisplayDate,
} from "./dateUtils";

// Task calculations
export {
  calculateTaskDuration,
  normalizeNumber,
  clamp,
  calculateWeightedProgress,
  isSummaryTask,
  isMilestone,
  getAllChildIds,
} from "./taskCalculations";

// Serializers
export { serializeTask, serializeLink, serializeSchedule } from "./serializers";

// Decorators
export { decorateTask, decorateTasks } from "./decorators";

