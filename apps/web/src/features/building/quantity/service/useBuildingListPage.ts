'use client';

import { useState, useEffect, useCallback } from 'react';
import type { Building } from '@/shared/types';
import { getBuildings, deleteBuilding, updateBuilding, reorderBuildings } from '@/features/building/shared/repository/buildings';
import { toast } from 'sonner';

/**
 * QuantityInputPage / DetailedQuantityInputPage 공통 동 관리 훅.
 *
 * 동 목록 로드, 순서 변경, 이름 수정, 삭제, 탭 활성화,
 * visibility change 시 데이터 새로고침을 처리합니다.
 */
export function useBuildingListPage(projectId: string) {
  const [buildings, setBuildings] = useState<Building[]>([]);
  const [activeBuildingIndex, setActiveBuildingIndex] = useState(0);
  const [isInitialized, setIsInitialized] = useState(false);

  const loadBuildings = useCallback(async () => {
    try {
      const data = await getBuildings(projectId);
      setBuildings(data);
      setIsInitialized(true);

      if (data.length > 0 && activeBuildingIndex >= data.length) {
        setActiveBuildingIndex(0);
      }
    } catch {
      toast.error('동 목록을 불러오는데 실패했습니다.');
    }
  }, [projectId, activeBuildingIndex]);

  // 초기 로드
  useEffect(() => {
    if (!isInitialized) {
      queueMicrotask(() => {
        void loadBuildings();
      });
    }
  }, [isInitialized, loadBuildings]);

  // visibility change 감지
  useEffect(() => {
    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible' && isInitialized) {
        loadBuildings();
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);
    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, [isInitialized, loadBuildings]);

  const handleReorder = useCallback(async (fromIndex: number, toIndex: number) => {
    try {
      await reorderBuildings(projectId, fromIndex, toIndex);
      await loadBuildings();

      if (activeBuildingIndex === fromIndex) {
        setActiveBuildingIndex(toIndex);
      } else if (activeBuildingIndex === toIndex) {
        setActiveBuildingIndex(fromIndex);
      } else if (activeBuildingIndex > fromIndex && activeBuildingIndex <= toIndex) {
        setActiveBuildingIndex(activeBuildingIndex - 1);
      } else if (activeBuildingIndex < fromIndex && activeBuildingIndex >= toIndex) {
        setActiveBuildingIndex(activeBuildingIndex + 1);
      }
    } catch {
      toast.error('동 순서 변경에 실패했습니다.');
    }
  }, [projectId, loadBuildings, activeBuildingIndex]);

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
    if (!window.confirm('정말 이 동을 삭제하시겠습니까?')) {
      return;
    }

    try {
      await deleteBuilding(buildingId, projectId);
      const updatedBuildings = buildings.filter(b => b.id !== buildingId);
      setBuildings(updatedBuildings);

      if (index === activeBuildingIndex) {
        setActiveBuildingIndex(Math.min(activeBuildingIndex, updatedBuildings.length - 1));
      } else if (index < activeBuildingIndex) {
        setActiveBuildingIndex(activeBuildingIndex - 1);
      }

      toast.success('동이 삭제되었습니다.');
    } catch {
      toast.error('동 삭제에 실패했습니다.');
    }
  }, [projectId, buildings, activeBuildingIndex]);

  const activeBuilding = buildings[activeBuildingIndex];

  return {
    buildings,
    activeBuildingIndex,
    setActiveBuildingIndex,
    activeBuilding,
    loadBuildings,
    handleReorder,
    handleUpdateBuildingName,
    handleDeleteBuilding,
  };
}
