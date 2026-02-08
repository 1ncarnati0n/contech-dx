/**
 * Custom Hooks for Building Process Plan & Trade Table Management
 *
 * ProcessPlan hooks (shared between BasementProcessPlanPage & BuildingProcessPlanPage):
 * - useProcessPlanState: Shared state + markDirty + save/discard + beforeunload
 * - useBuildingOperations: loadBuildings + handleDelete + handleReorder + handleRename
 * - useProcessTypeChange: handleProcessTypeChange (categories parameterized)
 *
 * TradeTable hooks (shared between FloorTradeTable & DetailedFloorTradeTable):
 * - useTradeTableState: Shared state + building sync effect
 * - useCellSelection: Drag selection + paste + Delete key handling
 * - useTradeOperations: getTrade + updateTrade + save/discard
 *
 * Legacy hooks (kept for reference, may be removed):
 * - useProcessPlans: Replaced by useProcessPlanState
 * - useExpandedModules: Merged into useProcessPlanState
 * - useBuildingAutoCalculations: Auto-calculates core count and unit count
 */

// ProcessPlan hooks
export { useProcessPlanState } from './useProcessPlanState';
export type { ProcessPlanConfig, UseProcessPlanStateReturn } from './useProcessPlanState';
export { useBuildingOperations } from './useBuildingOperations';
export { useProcessTypeChange } from './useProcessTypeChange';
export type { ProcessTypeChangeConfig } from './useProcessTypeChange';

// TradeTable hooks
export { useTradeTableState } from './useTradeTableState';
export { useCellSelection } from './useCellSelection';
export { useTradeOperations } from './useTradeOperations';

// Legacy hooks
export { useProcessPlans } from './useProcessPlans';
export { useExpandedModules } from './useExpandedModules';
export { useBuildingAutoCalculations } from './useBuildingAutoCalculations';
