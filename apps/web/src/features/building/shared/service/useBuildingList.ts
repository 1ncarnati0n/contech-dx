'use client';

import { useState, useEffect, useCallback } from 'react';
import type { Building, BuildingMeta, Floor, FloorTrade } from '@/shared/types';
import {
  createBuilding,
  getBuildings,
  deleteBuilding,
  updateBuilding,
  reorderBuildings,
  updateBuildingFloorsAndTrades,
} from '@/features/building/shared/repository/buildings';
import { isSpecialFloorId, parseSpecialFloorId, createSpecialFloorId } from '@/features/building/shared/service/floorIdUtils';
import { useRealtimeCacheSync } from '@/shared/hooks/useRealtimeCacheSync';
import { toast } from 'sonner';

const DEFAULT_META: BuildingMeta = {
  totalUnits: 0,
  unitTypePattern: [],
  coreCount: 0,
  coreType: '중복도(판상형)',
  slabType: '벽식구조',
  floorCount: {
    basement: 0,
    ground: 0,
    ph: 0,
    pilotisCount: 0,
  },
  heights: {
    basement2: 0,
    basement1: 0,
    standard: 0,
    floor1: 0,
    floor2: 0,
    floor3: 0,
    floor4: 0,
    floor5: 0,
    top: 0,
    ph: 0,
  },
};

// ============================================
// 헬퍼 함수
// ============================================

function getNextBuildingNumber(existingBuildings: Building[]): number {
  if (existingBuildings.length === 0) return 101;

  const numbers = existingBuildings
    .map(b => {
      const match = b.buildingName.match(/(\d+)동/);
      return match ? parseInt(match[1], 10) : 0;
    })
    .filter(n => n > 0)
    .sort((a, b) => b - a);

  return numbers.length > 0 ? numbers[0] + 1 : 101;
}

function copyFloors(sourceFloors: Floor[], newBuildingId: string, batchIndex: number): Floor[] {
  return sourceFloors.map((floor, floorIndex) => ({
    ...floor,
    id: `floor-${Date.now()}-${Math.random().toString(36).substr(2, 9)}-${batchIndex}-${floorIndex}`,
    buildingId: newBuildingId,
  }));
}

function copyFloorTrades(
  sourceFloorTrades: FloorTrade[],
  sourceFloors: Floor[],
  copiedFloors: Floor[],
  newBuildingId: string,
  batchIndex: number,
): FloorTrade[] {
  // 원본 floorId → 새 floorId 매핑
  const floorIdMap = new Map<string, string>();
  sourceFloors.forEach((originalFloor, idx) => {
    if (idx < copiedFloors.length) {
      floorIdMap.set(originalFloor.id, copiedFloors[idx].id);
    }
  });

  return sourceFloorTrades.map(trade => {
    if (isSpecialFloorId(trade.floorId)) {
      const parsed = parseSpecialFloorId(trade.floorId);
      return {
        ...trade,
        id: `trade-${Date.now()}-${batchIndex}-${Math.random().toString(36).substr(2, 9)}`,
        buildingId: newBuildingId,
        floorId: parsed ? createSpecialFloorId(newBuildingId, parsed.tradeGroup) : trade.floorId,
        trades: JSON.parse(JSON.stringify(trade.trades)),
      };
    }

    const newFloorId = floorIdMap.get(trade.floorId) || trade.floorId;
    return {
      ...trade,
      id: `trade-${Date.now()}-${batchIndex}-${Math.random().toString(36).substr(2, 9)}`,
      buildingId: newBuildingId,
      floorId: newFloorId,
      trades: JSON.parse(JSON.stringify(trade.trades)),
    };
  });
}

// ============================================
// 훅
// ============================================

interface UseBuildingListResult {
  buildings: Building[];
  activeBuildingIndex: number;
  isLoading: boolean;
  activeBuilding: Building | undefined;
  setActiveBuildingIndex: (index: number) => void;
  loadBuildings: () => Promise<void>;
  handleCreateBuildings: (count: number) => Promise<void>;
  handleDeleteBuilding: (buildingId: string, index: number) => Promise<void>;
  handleUpdateBuildingName: (buildingId: string, newName: string) => Promise<void>;
  handleReorder: (fromIndex: number, toIndex: number) => Promise<void>;
}

/**
 * 빌딩 목록 관리 훅
 *
 * - 데이터 로드 + 실시간 동기화
 * - 동 CRUD (생성/삭제/이름변경/순서변경)
 * - 103동 참조 복사 로직 포함
 */
export function useBuildingList(projectId: string): UseBuildingListResult {
  const [buildings, setBuildings] = useState<Building[]>([]);
  const [activeBuildingIndex, setActiveBuildingIndex] = useState(0);
  const [isLoading, setIsLoading] = useState(false);
  const [isInitialized, setIsInitialized] = useState(false);

  const loadBuildings = useCallback(async () => {
    try {
      setIsLoading(true);
      const data = await getBuildings(projectId);
      setBuildings(data);
      setIsInitialized(true);

      if (data.length > 0 && activeBuildingIndex >= data.length) {
        setActiveBuildingIndex(0);
      }
    } catch {
      toast.error('동 목록을 불러오는데 실패했습니다.');
    } finally {
      setIsLoading(false);
    }
  }, [projectId, activeBuildingIndex]);

  // 실시간 동기화
  const handleRealtimeChange = useCallback(() => {
    void loadBuildings();
  }, [loadBuildings]);

  useRealtimeCacheSync({
    table: 'buildings',
    filter: `project_id=eq.${projectId}`,
    onInvalidate: handleRealtimeChange,
  });

  useEffect(() => {
    if (!isInitialized) {
      loadBuildings();
    }
  }, [isInitialized, loadBuildings]);

  // 동 생성
  const handleCreateBuildings = useCallback(async (count: number) => {
    if (count <= 0) {
      toast.error('동 수를 입력해주세요.');
      return;
    }

    const existingCount = buildings.length;
    const additionalCount = Math.max(0, count - existingCount);

    if (additionalCount === 0) {
      toast.info(`이미 ${existingCount}개의 동이 존재합니다. 추가 생성할 동이 없습니다.`);
      return;
    }

    setIsLoading(true);
    try {
      const nextNumber = getNextBuildingNumber(buildings);
      const referenceBuilding = buildings.find(b => b.buildingName === '103동' || b.buildingNumber === 103);

      const defaultMeta: BuildingMeta = referenceBuilding
        ? JSON.parse(JSON.stringify(referenceBuilding.meta))
        : { ...DEFAULT_META };
      const referenceFloors: Floor[] = referenceBuilding
        ? JSON.parse(JSON.stringify(referenceBuilding.floors))
        : [];

      const newBuildings: Building[] = [];

      for (let i = 0; i < additionalCount; i++) {
        const buildingName = `${nextNumber + i}동`;
        const building = await createBuilding({
          projectId,
          buildingName,
          buildingNumber: buildings.length + i + 1,
          meta: { ...defaultMeta },
        });

        if (referenceBuilding && referenceFloors.length > 0) {
          const copiedFloors = copyFloors(referenceFloors, building.id, i);
          const copiedTrades = (referenceBuilding.floorTrades || [])
            .filter(trade => isSpecialFloorId(trade.floorId))
            .map(trade => {
              const parsed = parseSpecialFloorId(trade.floorId);
              return {
                ...trade,
                id: `trade-${Date.now()}-${i}-${Math.random().toString(36).substr(2, 9)}`,
                buildingId: building.id,
                floorId: parsed ? createSpecialFloorId(building.id, parsed.tradeGroup) : trade.floorId,
                trades: JSON.parse(JSON.stringify(trade.trades)),
              };
            });

          await updateBuildingFloorsAndTrades(building.id, projectId, copiedFloors, copiedTrades);
          building.floors = copiedFloors;
        }

        newBuildings.push(building);
      }

      const updatedBuildings = [...buildings, ...newBuildings];
      setBuildings(updatedBuildings);
      setActiveBuildingIndex(updatedBuildings.length - 1);
      toast.success(`${additionalCount}개의 동이 추가 생성되었습니다. (총 ${updatedBuildings.length}개)`);
    } catch {
      toast.error('동 생성에 실패했습니다.');
    } finally {
      setIsLoading(false);
    }
  }, [projectId, buildings]);

  // 동 삭제
  const handleDeleteBuilding = useCallback(async (buildingId: string, index: number) => {
    if (!window.confirm('정말 이 동을 삭제하시겠습니까?')) return;

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

  // 동 이름 변경
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

  // 동 순서 변경
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

  return {
    buildings,
    activeBuildingIndex,
    isLoading,
    activeBuilding: buildings[activeBuildingIndex],
    setActiveBuildingIndex,
    loadBuildings,
    handleCreateBuildings,
    handleDeleteBuilding,
    handleUpdateBuildingName,
    handleReorder,
  };
}

// ============================================
// 동 복사 훅 (별도 분리)
// ============================================

interface UseBuildingCopyResult {
  isCopying: boolean;
  copyCount: number;
  showCopyDialog: boolean;
  setCopyCount: (count: number) => void;
  setShowCopyDialog: (show: boolean) => void;
  handleCopyBuilding: (sourceBuilding: Building, count: number) => Promise<void>;
  resetCopyState: () => void;
}

export function useBuildingCopy(
  projectId: string,
  buildings: Building[],
  loadBuildings: () => Promise<void>,
  setActiveBuildingIndex: (index: number) => void,
): UseBuildingCopyResult {
  const [isCopying, setIsCopying] = useState(false);
  const [copyCount, setCopyCount] = useState(1);
  const [showCopyDialog, setShowCopyDialog] = useState(false);

  const resetCopyState = useCallback(() => {
    setShowCopyDialog(false);
    setCopyCount(1);
  }, []);

  const handleCopyBuilding = useCallback(async (sourceBuilding: Building, count: number) => {
    if (count <= 0) {
      toast.error('복사할 동 수를 입력해주세요.');
      return;
    }

    setIsCopying(true);
    try {
      const nextNumber = getNextBuildingNumber(buildings);
      const sourceMeta = JSON.parse(JSON.stringify(sourceBuilding.meta));

      for (let i = 0; i < count; i++) {
        const buildingName = `${nextNumber + i}동`;
        const newBuilding = await createBuilding({
          projectId,
          buildingName,
          buildingNumber: buildings.length + i + 1,
          meta: sourceMeta,
        });

        const copiedFloors = copyFloors(sourceBuilding.floors, newBuilding.id, i);
        const copiedTrades = copyFloorTrades(
          sourceBuilding.floorTrades,
          sourceBuilding.floors,
          copiedFloors,
          newBuilding.id,
          i,
        );

        await updateBuildingFloorsAndTrades(newBuilding.id, projectId, copiedFloors, copiedTrades);
      }

      await loadBuildings();

      const updatedBuildings = await getBuildings(projectId);
      const lastBuildingIndex = updatedBuildings.findIndex(b => b.buildingName === `${nextNumber + count - 1}동`);
      if (lastBuildingIndex !== -1) {
        setActiveBuildingIndex(lastBuildingIndex);
      }

      toast.success(`${count}개의 동이 복사되었습니다.`);
      resetCopyState();
    } catch {
      toast.error('동 복사에 실패했습니다.');
    } finally {
      setIsCopying(false);
    }
  }, [projectId, buildings, loadBuildings, setActiveBuildingIndex, resetCopyState]);

  return {
    isCopying,
    copyCount,
    showCopyDialog,
    setCopyCount,
    setShowCopyDialog,
    handleCopyBuilding,
    resetCopyState,
  };
}
