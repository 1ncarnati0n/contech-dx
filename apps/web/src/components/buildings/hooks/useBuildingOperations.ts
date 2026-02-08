'use client';

import { useCallback } from 'react';
import type { Building, BuildingProcessPlan } from '@/lib/types';
import { getBuildings, deleteBuilding, updateBuilding, reorderBuildings } from '@/lib/services/buildings';
import { toast } from 'sonner';

interface UseBuildingOperationsOptions {
  projectId: string;
  setBuildings: React.Dispatch<React.SetStateAction<Building[]>>;
  setProcessPlans: React.Dispatch<React.SetStateAction<Map<string, BuildingProcessPlan>>>;
  setIsLoading: React.Dispatch<React.SetStateAction<boolean>>;
  setActiveBuildingIndex: React.Dispatch<React.SetStateAction<number>>;
  initializePlans: (data: Building[], prevPlans: Map<string, BuildingProcessPlan>) => Map<string, BuildingProcessPlan>;
}

/**
 * Shared building CRUD operations hook.
 *
 * Extracts loadBuildings, handleDeleteBuilding, handleReorder, handleUpdateBuildingName
 * which are identical between BasementProcessPlanPage and BuildingProcessPlanPage.
 */
export function useBuildingOperations({
  projectId,
  setBuildings,
  setProcessPlans,
  setIsLoading,
  setActiveBuildingIndex,
  initializePlans,
}: UseBuildingOperationsOptions) {

  const loadBuildings = useCallback(async () => {
    try {
      setIsLoading(true);
      const data = await getBuildings(projectId);
      setBuildings(data);

      setActiveBuildingIndex(prev => {
        if (data.length > 0 && prev >= data.length) {
          return 0;
        }
        return prev;
      });

      setProcessPlans(prevPlans => initializePlans(data, prevPlans));
    } catch {
      toast.error('동 목록을 불러오는데 실패했습니다.');
    } finally {
      setIsLoading(false);
    }
  }, [projectId, setBuildings, setProcessPlans, setIsLoading, setActiveBuildingIndex, initializePlans]);

  const handleUpdateBuildingName = useCallback(async (buildingId: string, newName: string) => {
    try {
      await updateBuilding(buildingId, projectId, { buildingName: newName });
      await loadBuildings();
      toast.success('동 이름이 변경되었습니다.');
    } catch (error) {
      toast.error('동 이름 변경에 실패했습니다.');
      throw error;
    }
  }, [projectId, loadBuildings]);

  const handleDeleteBuilding = useCallback(async (buildingId: string, index: number) => {
    try {
      await deleteBuilding(buildingId, projectId);

      setProcessPlans(prevPlans => {
        const newPlans = new Map(prevPlans);
        newPlans.delete(buildingId);
        return newPlans;
      });

      await loadBuildings();

      setActiveBuildingIndex(prev => {
        if (index === prev) {
          return 0;
        } else if (index < prev) {
          return prev - 1;
        }
        return prev;
      });

      toast.success('동이 삭제되었습니다.');
    } catch {
      toast.error('동 삭제에 실패했습니다.');
    }
  }, [projectId, loadBuildings, setProcessPlans, setActiveBuildingIndex]);

  const handleReorder = useCallback(async (fromIndex: number, toIndex: number) => {
    try {
      await reorderBuildings(projectId, fromIndex, toIndex);

      setActiveBuildingIndex(prev => {
        if (prev === fromIndex) {
          return toIndex;
        } else if (prev === toIndex) {
          return fromIndex;
        } else if (prev > fromIndex && prev <= toIndex) {
          return prev - 1;
        } else if (prev < fromIndex && prev >= toIndex) {
          return prev + 1;
        }
        return prev;
      });

      await loadBuildings();
    } catch {
      toast.error('동 순서 변경에 실패했습니다.');
    }
  }, [projectId, loadBuildings, setActiveBuildingIndex]);

  return {
    loadBuildings,
    handleUpdateBuildingName,
    handleDeleteBuilding,
    handleReorder,
  };
}
