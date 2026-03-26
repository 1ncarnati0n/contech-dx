'use client';

import { useState, useEffect, useCallback } from 'react';
import type { Building, BuildingProcessPlan, ProcessCategory, ProcessType } from '@/shared/types';
import { toast } from 'sonner';
import { logger } from '@/shared/utils/logger';
import { getProcessPlan, saveProcessPlan } from '@/features/building/shared/repository/SupabaseBuildingDataService';

export interface ProcessPlanConfig {
  processCategories: ProcessCategory[];
  defaultProcessTypes: Partial<Record<ProcessCategory, ProcessType>>;
}

export interface UseProcessPlanStateReturn {
  buildings: Building[];
  setBuildings: React.Dispatch<React.SetStateAction<Building[]>>;
  processPlans: Map<string, BuildingProcessPlan>;
  setProcessPlans: React.Dispatch<React.SetStateAction<Map<string, BuildingProcessPlan>>>;
  isLoading: boolean;
  setIsLoading: React.Dispatch<React.SetStateAction<boolean>>;
  expandedModules: Map<string, Set<string>>;
  dirtyBuildings: Set<string>;
  isSaving: boolean;
  activeBuildingIndex: number;
  setActiveBuildingIndex: React.Dispatch<React.SetStateAction<number>>;
  updateProcessPlan: (buildingId: string, updatedPlan: BuildingProcessPlan) => void;
  updateExpandedModules: (buildingId: string, newExpanded: Set<string>) => void;
  markDirty: (buildingId: string) => void;
  /** @deprecated Use savePlan instead */
  saveToLocalStorage: (buildingId: string) => void;
  savePlan: (buildingId: string) => void;
  discardChanges: (buildingId: string) => void;
  initializePlans: (data: Building[], prevPlans: Map<string, BuildingProcessPlan>) => Promise<Map<string, BuildingProcessPlan>>;
}

/**
 * Shared state management hook for ProcessPlan pages.
 *
 * Extracts the common state (buildings, processPlans, expandedModules, dirtyBuildings)
 * and shared operations (save, discard, markDirty) that are identical between
 * BasementProcessPlanPage and BuildingProcessPlanPage.
 *
 * @param projectId - The project ID
 * @param config - Process categories and default types that differ per page
 */
export function useProcessPlanState(
  projectId: string,
  config: ProcessPlanConfig,
): UseProcessPlanStateReturn {
  const { processCategories, defaultProcessTypes } = config;

  const [buildings, setBuildings] = useState<Building[]>([]);
  const [processPlans, setProcessPlans] = useState<Map<string, BuildingProcessPlan>>(new Map());
  const [isLoading, setIsLoading] = useState(false);
  const [expandedModules, setExpandedModules] = useState<Map<string, Set<string>>>(new Map());
  const [dirtyBuildings, setDirtyBuildings] = useState<Set<string>>(new Set());
  const [isSaving, setIsSaving] = useState(false);
  const [activeBuildingIndex, setActiveBuildingIndex] = useState(0);

  const updateProcessPlan = useCallback((buildingId: string, updatedPlan: BuildingProcessPlan) => {
    setProcessPlans(prev => {
      const newPlans = new Map(prev);
      newPlans.set(buildingId, updatedPlan);
      return newPlans;
    });
  }, []);

  const updateExpandedModules = useCallback((buildingId: string, newExpanded: Set<string>) => {
    setExpandedModules(prev => {
      const newMap = new Map(prev);
      newMap.set(buildingId, newExpanded);
      return newMap;
    });
  }, []);

  const markDirty = useCallback((buildingId: string) => {
    setDirtyBuildings(prev => {
      const next = new Set(prev);
      next.add(buildingId);
      return next;
    });
  }, []);

  const savePlan = useCallback(async (buildingId: string) => {
    const currentPlan = processPlans.get(buildingId);
    if (!currentPlan) return;

    setIsSaving(true);
    try {
      await saveProcessPlan(currentPlan);
      setDirtyBuildings(prev => {
        const next = new Set(prev);
        next.delete(buildingId);
        return next;
      });
      toast.success('공정계획이 저장되었습니다.');
    } catch (error) {
      logger.error('Failed to save process plan:', error);
      toast.error('저장에 실패했습니다.');
    } finally {
      setIsSaving(false);
    }
  }, [processPlans]);

  // saveToLocalStorage는 savePlan의 별칭 (기존 호출부 호환)
  const saveToLocalStorage = savePlan;

  const discardChanges = useCallback(async (buildingId: string) => {
    try {
      const restoredPlan = await getProcessPlan(buildingId);
      if (restoredPlan) {
        updateProcessPlan(buildingId, restoredPlan);
      }
      setDirtyBuildings(prev => {
        const next = new Set(prev);
        next.delete(buildingId);
        return next;
      });
    } catch {
      toast.error('복원에 실패했습니다.');
    }
  }, [updateProcessPlan]);

  // Page unload warning
  useEffect(() => {
    const handleBeforeUnload = (e: BeforeUnloadEvent) => {
      if (dirtyBuildings.size > 0) {
        e.preventDefault();
        e.returnValue = '저장하지 않은 변경사항이 있습니다.';
      }
    };
    window.addEventListener('beforeunload', handleBeforeUnload);
    return () => window.removeEventListener('beforeunload', handleBeforeUnload);
  }, [dirtyBuildings]);

  /**
   * Initialize process plans for a list of buildings.
   * Loads from DB if available, otherwise creates defaults.
   */
  const initializePlans = useCallback(async (
    data: Building[],
    prevPlans: Map<string, BuildingProcessPlan>,
  ): Promise<Map<string, BuildingProcessPlan>> => {
    const plans = new Map<string, BuildingProcessPlan>();

    await Promise.all(data.map(async (building) => {
      let existingPlan = prevPlans.get(building.id);

      if (!existingPlan) {
        try {
          existingPlan = await getProcessPlan(building.id) ?? undefined;
        } catch (error) {
          logger.error('Failed to load process plan from DB:', error);
        }
      }

      if (!existingPlan) {
        const defaultProcesses: BuildingProcessPlan['processes'] = {};
        processCategories.forEach(category => {
          defaultProcesses[category] = {
            days: 0,
            processType: defaultProcessTypes[category] || '표준공정',
          };
        });

        plans.set(building.id, {
          id: `plan-${building.id}`,
          buildingId: building.id,
          projectId,
          processes: defaultProcesses,
          totalDays: 0,
        });
      } else {
        plans.set(building.id, existingPlan);
      }
    }));

    return plans;
  }, [projectId, processCategories, defaultProcessTypes]);

  return {
    buildings,
    setBuildings,
    processPlans,
    setProcessPlans,
    isLoading,
    setIsLoading,
    expandedModules,
    dirtyBuildings,
    isSaving,
    activeBuildingIndex,
    setActiveBuildingIndex,
    updateProcessPlan,
    updateExpandedModules,
    markDirty,
    saveToLocalStorage,
    savePlan,
    discardChanges,
    initializePlans,
  };
}
