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
export { useProcessPlanState } from '../process-plan/service/useProcessPlanState';
export type { ProcessPlanConfig, UseProcessPlanStateReturn } from '../process-plan/service/useProcessPlanState';
export { useBuildingOperations } from '../basic-info/service/useBuildingOperations';
export { useProcessTypeChange } from '../process-plan/service/useProcessTypeChange';
export type { ProcessTypeChangeConfig } from '../process-plan/service/useProcessTypeChange';

// TradeTable hooks
export { useTradeTableState } from '../quantity/service/useTradeTableState';
export { useCellSelection } from '../quantity/service/useCellSelection';
export { useTradeOperations } from '../quantity/service/useTradeOperations';

// Legacy hooks
export { useProcessPlans } from '../process-plan/service/useProcessPlans';
export { useExpandedModules } from '../process-plan/service/useExpandedModules';
export { useBuildingAutoCalculations } from '../basic-info/service/useBuildingAutoCalculations';
