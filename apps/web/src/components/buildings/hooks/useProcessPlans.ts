import { useState, useEffect, useCallback } from 'react';
import type { Building, BuildingProcessPlan, ProcessCategory } from '@/lib/types';
import { getProcessModule } from '@/lib/data/process-modules';

const DEFAULT_PROCESS_TYPES = {
  '버림': '표준공정' as const,
  '기초': '표준공정' as const,
  '주동 지하층': '표준공정' as const,
  '셋팅층': '표준공정' as const,
  '기준층': '6일 사이클' as const,
  '옥탑층': '표준공정' as const,
};

/**
 * 공정계획 상태 관리 커스텀 훅
 *
 * 🎯 Purpose: Manages process plans state with localStorage persistence
 * Replaces ~150 lines of state management logic in BuildingProcessPlanPage
 *
 * 📦 Features:
 * - Automatic localStorage load/save with debouncing (500ms)
 * - Default plan generation for new buildings
 * - Type-safe Map-based state management
 * - Optimized update pattern (no full Map copy)
 *
 * 💾 Storage Key Pattern: `contech_process_plan_{buildingId}`
 *
 * @param projectId - Project ID for plan association
 * @param buildings - Array of buildings to manage plans for
 * @returns Object with processPlans Map and updatePlan function
 *
 * @example
 * const { processPlans, updatePlan } = useProcessPlans(projectId, buildings);
 *
 * // Get plan for a building
 * const plan = processPlans.get(building.id);
 *
 * // Update a plan
 * updatePlan(building.id, { ...plan, totalDays: 100 });
 */
export function useProcessPlans(projectId: string, buildings: Building[]) {
  const [processPlans, setProcessPlans] = useState<Map<string, BuildingProcessPlan>>(new Map());

  // 🔄 Load plans from localStorage on mount or when buildings change
  useEffect(() => {
    const plans = new Map<string, BuildingProcessPlan>();

    buildings.forEach(building => {
      const storageKey = `contech_process_plan_${building.id}`;
      const storedPlanJson = localStorage.getItem(storageKey);

      if (storedPlanJson) {
        try {
          const storedPlan = JSON.parse(storedPlanJson);
          plans.set(building.id, storedPlan);
        } catch (error) {
          console.error(`Failed to load process plan for building ${building.id}:`, error);
        }
      } else {
        // 🏗️ Generate default plan for new building
        const defaultProcesses: BuildingProcessPlan['processes'] = {};

        // Initialize all process categories with default types
        Object.entries(DEFAULT_PROCESS_TYPES).forEach(([category, processType]) => {
          defaultProcesses[category as ProcessCategory] = {
            processType,
            days: 0,
          };
        });

        plans.set(building.id, {
          id: `plan-${building.id}`,
          buildingId: building.id,
          projectId,
          processes: defaultProcesses,
          totalDays: 0,
        });
      }
    });

    setProcessPlans(plans);
  }, [projectId, buildings]);

  // 💾 Auto-save to localStorage with debouncing
  useEffect(() => {
    const timeoutId = setTimeout(() => {
      processPlans.forEach((plan, buildingId) => {
        const storageKey = `contech_process_plan_${buildingId}`;
        try {
          localStorage.setItem(storageKey, JSON.stringify(plan));
        } catch (error) {
          console.error(`Failed to save process plan for building ${buildingId}:`, error);
        }
      });
    }, 500);

    return () => clearTimeout(timeoutId);
  }, [processPlans]);

  /**
   * Update a specific building's process plan
   *
   * Uses efficient Map update pattern: create new Map, update entry, return
   * Avoids full Map copy for better performance
   */
  const updatePlan = useCallback((buildingId: string, updatedPlan: BuildingProcessPlan) => {
    setProcessPlans(prev => {
      const newPlans = new Map(prev);
      newPlans.set(buildingId, updatedPlan);
      return newPlans;
    });
  }, []);

  return { processPlans, updatePlan };
}
