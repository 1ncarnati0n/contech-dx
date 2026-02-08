'use client';

import { useCallback } from 'react';
import type { Building, BuildingProcessPlan, ProcessCategory, ProcessType } from '@/lib/types';
import { getProcessModule } from '@/lib/data/process-modules';
import { calculateModuleWorkDays } from '@/lib/utils/process-days-calculator';

export interface ProcessTypeChangeConfig {
  /** Categories that support floor-level process type overrides */
  floorLevelCategories: ProcessCategory[];
  defaultProcessTypes: Partial<Record<ProcessCategory, ProcessType>>;
  /**
   * Called to calculate total days for a given set of processes.
   * This is page-specific because basement/building pages have different calculation logic.
   */
  calculateTotalDays: (processes: BuildingProcessPlan['processes'], building: Building) => number;
}

interface ProcessTypeChangeDeps {
  buildings: Building[];
  processPlans: Map<string, BuildingProcessPlan>;
  expandedModules: Map<string, Set<string>>;
  updateProcessPlan: (buildingId: string, updatedPlan: BuildingProcessPlan) => void;
  updateExpandedModules: (buildingId: string, newExpanded: Set<string>) => void;
  markDirty: (buildingId: string) => void;
}

/**
 * Shared hook for handling process type changes.
 *
 * Both BasementProcessPlanPage and BuildingProcessPlanPage handle
 * process type changes with the same structure — the only difference
 * is which categories support floor-level overrides and a minor
 * floor label normalization step in the basement page.
 */
export function useProcessTypeChange(
  config: ProcessTypeChangeConfig,
  deps: ProcessTypeChangeDeps,
) {
  const { floorLevelCategories, defaultProcessTypes, calculateTotalDays } = config;
  const { buildings, processPlans, expandedModules, updateProcessPlan, updateExpandedModules, markDirty } = deps;

  const handleProcessTypeChange = useCallback((
    buildingId: string,
    category: ProcessCategory,
    processType: ProcessType,
    floorLabel?: string,
  ) => {
    const plan = processPlans.get(buildingId);
    if (!plan) return;

    const building = buildings.find(b => b.id === buildingId);
    if (!building) return;

    if (floorLevelCategories.includes(category) && floorLabel) {
      // Normalize floor labels for basement special rows
      let targetFloorLabel = floorLabel;
      const parkingMatch = floorLabel.match(/^(B\d+)\s+주차장/);
      const consolidatedMatch = floorLabel.match(/^B1\+B2\s+통합/);
      if (parkingMatch) {
        targetFloorLabel = parkingMatch[1];
      } else if (consolidatedMatch) {
        targetFloorLabel = floorLabel;
      }

      const updatedPlan: BuildingProcessPlan = {
        ...plan,
        processes: {
          ...plan.processes,
          [category]: {
            ...plan.processes[category],
            processType: plan.processes[category]?.processType || defaultProcessTypes[category] || '표준공정',
            days: plan.processes[category]?.days || 0,
            floors: {
              ...plan.processes[category]?.floors,
              [targetFloorLabel]: { processType },
            },
          },
        },
      };

      updatedPlan.totalDays = calculateTotalDays(updatedPlan.processes, building);
      updateProcessPlan(buildingId, updatedPlan);
      markDirty(buildingId);
    } else {
      // Category-wide process type change
      const module = getProcessModule(category, processType);
      const sumDays = module ? calculateModuleWorkDays(building, module, category) : 0;

      const updatedPlan: BuildingProcessPlan = {
        ...plan,
        processes: {
          ...plan.processes,
          [category]: {
            ...plan.processes[category],
            processType,
            days: Math.floor(sumDays),
          },
        },
      };

      updatedPlan.totalDays = calculateTotalDays(updatedPlan.processes, building);
      updateProcessPlan(buildingId, updatedPlan);
      markDirty(buildingId);
    }

    // Auto-expand the changed module
    const expanded = expandedModules.get(buildingId) || new Set<string>();
    const newExpanded = new Set(expanded);
    newExpanded.add(category);
    updateExpandedModules(buildingId, newExpanded);
  }, [
    buildings, processPlans, expandedModules,
    floorLevelCategories, defaultProcessTypes, calculateTotalDays,
    updateProcessPlan, updateExpandedModules, markDirty,
  ]);

  const getProcessTypeForFloor = useCallback((
    plan: BuildingProcessPlan | undefined,
    category: ProcessCategory,
    floorLabel: string,
  ): ProcessType => {
    if (!plan) return defaultProcessTypes[category] || '표준공정';

    const categoryProcess = plan.processes[category];
    if (!categoryProcess) return defaultProcessTypes[category] || '표준공정';

    if (floorLevelCategories.includes(category) && categoryProcess.floors) {
      if (categoryProcess.floors[floorLabel]) {
        return categoryProcess.floors[floorLabel].processType;
      }
    }

    return categoryProcess.processType || defaultProcessTypes[category] || '표준공정';
  }, [floorLevelCategories, defaultProcessTypes]);

  return {
    handleProcessTypeChange,
    getProcessTypeForFloor,
  };
}
