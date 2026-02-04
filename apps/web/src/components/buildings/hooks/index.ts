/**
 * Custom Hooks for Building Process Plan Management
 *
 * 🎯 Stage 2 Performance Optimization
 * These hooks extract state management logic from BuildingProcessPlanPage
 * to improve code organization, reusability, and testability.
 *
 * 📦 Exports:
 * - useProcessPlans: Manages process plans with localStorage persistence
 * - useExpandedModules: Manages module expansion/collapse state
 * - useBuildingAutoCalculations: Auto-calculates core count and unit count
 *
 * 💡 Benefits:
 * - Separation of concerns (state logic vs UI logic)
 * - Easier to test (hooks can be tested independently)
 * - Reusable across BuildingProcessPlanPage and BasementProcessPlanPage
 * - Reduces main component file size by ~200 lines
 */

export { useProcessPlans } from './useProcessPlans';
export { useExpandedModules } from './useExpandedModules';
export { useBuildingAutoCalculations } from './useBuildingAutoCalculations';
