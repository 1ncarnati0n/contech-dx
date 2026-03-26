import { useState, useEffect, useCallback } from 'react';
import type { Building, BuildingProcessPlan, ProcessCategory } from '@/shared/types';
import { logger } from '@/shared/utils/logger';
import { getProcessPlan } from '@/features/building/shared/repository/SupabaseBuildingDataService';

const DEFAULT_PROCESS_TYPES = {
  '버림': '표준공정' as const,
  '기초': '표준공정' as const,
  '주동 지하층': '표준공정' as const,
  '셋팅층': '표준공정' as const,
  '기준층': '표준공정' as const,
  '옥탑층': '표준공정' as const,
};

/**
 * 공정계획 상태 관리 커스텀 훅
 *
 * DB(building_process_plans)에서 공정계획을 로드하고 상태를 관리합니다.
 *
 * @param projectId - Project ID for plan association
 * @param buildings - Array of buildings to manage plans for
 * @returns Object with processPlans Map and updatePlan function
 */
export function useProcessPlans(projectId: string, buildings: Building[]) {
  const [processPlans, setProcessPlans] = useState<Map<string, BuildingProcessPlan>>(new Map());

  // Load plans from DB on mount or when buildings change
  useEffect(() => {
    let cancelled = false;

    async function loadPlans() {
      const plans = new Map<string, BuildingProcessPlan>();

      await Promise.all(buildings.map(async (building) => {
        try {
          const plan = await getProcessPlan(building.id);
          if (plan) {
            plans.set(building.id, plan);
            return;
          }
        } catch (error) {
          logger.error(`Failed to load process plan for building ${building.id}:`, error);
        }

        // Generate default plan for buildings without a saved plan
        const defaultProcesses: BuildingProcessPlan['processes'] = {};
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
      }));

      if (!cancelled) {
        setProcessPlans(plans);
      }
    }

    if (buildings.length > 0) {
      loadPlans();
    }

    return () => { cancelled = true; };
  }, [projectId, buildings]);

  const updatePlan = useCallback((buildingId: string, updatedPlan: BuildingProcessPlan) => {
    setProcessPlans(prev => {
      const newPlans = new Map(prev);
      newPlans.set(buildingId, updatedPlan);
      return newPlans;
    });
  }, []);

  return { processPlans, updatePlan };
}
