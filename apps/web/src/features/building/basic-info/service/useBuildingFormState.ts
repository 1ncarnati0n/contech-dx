'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import type { Building } from '@/shared/types';
import type { BuildingFormData, Heights } from '../types';
import { logger } from '@/shared/utils/logger';

function extractFormData(building: Building): BuildingFormData {
  const meta = building.meta;
  const phHeights = Array.isArray(meta?.heights?.ph)
    ? meta.heights.ph
    : (meta?.floorCount?.ph || 0) > 0
      ? Array(meta?.floorCount?.ph || 0).fill(meta?.heights?.ph || 2650)
      : [2650];

  return {
    buildingName: building.buildingName || '',
    coreCount: meta?.coreCount || 0,
    coreType: meta?.coreType || '중복도(판상형)',
    slabType: meta?.slabType || '벽식구조',
    basementCount: meta?.floorCount?.basement || 0,
    groundCount: meta?.floorCount?.ground || 0,
    phCount: meta?.floorCount?.ph || 0,
    coreGroundFloors: meta?.floorCount?.coreGroundFloors || [],
    coreUnitGroundFloors: meta?.floorCount?.coreUnitGroundFloors || [],
    coreBasementFloors: meta?.floorCount?.coreBasementFloors || [],
    corePhFloors: meta?.floorCount?.corePhFloors || [],
    pilotisCount: meta?.floorCount?.pilotisCount || 0,
    corePilotisCounts: meta?.floorCount?.corePilotisCounts || [],
    corePilotisHeights: meta?.floorCount?.corePilotisHeights || [],
    hasHighCeilingEquipmentRoom: meta?.floorCount?.hasHighCeilingEquipmentRoom || false,
    scaffoldingColumns: meta?.floorCount?.scaffoldingColumns || [],
    unitTypePattern: meta?.unitTypePattern || [],
    heights: {
      basement4: meta?.heights?.basement4 || 3500,
      basement3: meta?.heights?.basement3 || 3500,
      basement2: meta?.heights?.basement2 || 3500,
      basement1: meta?.heights?.basement1 || 5400,
      standard: meta?.heights?.standard || 2850,
      floor1: meta?.heights?.floor1 || 3050,
      floor2: meta?.heights?.floor2 || 2850,
      floor3: meta?.heights?.floor3 || 2850,
      floor4: meta?.heights?.floor4 || 2850,
      floor5: meta?.heights?.floor5 || 2850,
      top: meta?.heights?.top || 3050,
      ph: phHeights,
    },
    standardFloorCycle: meta?.standardFloorCycle || 0,
  };
}

interface UseBuildingFormStateResult {
  formData: BuildingFormData;
  updateField: <K extends keyof BuildingFormData>(field: K, value: BuildingFormData[K]) => void;
  updateHeights: (heights: Heights) => void;
  requestServerSync: () => void;
}

/**
 * 빌딩 기본정보 폼 상태 관리 훅
 *
 * - building prop에서 초기값 추출
 * - building 변경 시 상태 자동 동기화
 * - coreCount ↔ coreGroundFloors 배열 자동 동기화
 */
export function useBuildingFormState(
  building: Building,
  calculatedCoreCount?: number,
): UseBuildingFormStateResult {
  const [formData, setFormData] = useState<BuildingFormData>(() => extractFormData(building));
  const buildingIdRef = useRef(building?.id);

  // building 전환 시에만 formData 전체 동기화
  // 같은 빌딩 내에서는 formData가 source of truth (사용자 수정 보존)
  // 수동 저장 후에는 syncFromServerRef를 통해 명시적으로 동기화
  const syncFromServerRef = useRef(false);

  useEffect(() => {
    if (!building || !building.meta) return;

    const isBuildingSwitch = buildingIdRef.current !== building.id;
    buildingIdRef.current = building.id;

    if (isBuildingSwitch || syncFromServerRef.current) {
      syncFromServerRef.current = false;
      try {
        setFormData(extractFormData(building));
      } catch (error) {
        logger.error('Error syncing building data:', error);
      }
    }
  }, [building]);

  // 코어 개수 변경 시 coreGroundFloors 배열 자동 동기화
  useEffect(() => {
    setFormData(prev => {
      const { coreCount, coreGroundFloors, groundCount } = prev;

      if (coreCount > 1) {
        if (coreGroundFloors.length < coreCount) {
          const extended = [...coreGroundFloors];
          while (extended.length < coreCount) {
            extended.push(groundCount || 0);
          }
          return { ...prev, coreGroundFloors: extended };
        } else if (coreGroundFloors.length > coreCount) {
          return { ...prev, coreGroundFloors: coreGroundFloors.slice(0, coreCount) };
        }
      } else {
        if (coreGroundFloors.length > 0) {
          return { ...prev, coreGroundFloors: [] };
        }
      }
      return prev;
    });
  }, [formData.coreCount]);

  // 빌딩 전환 시에만 코어 개수를 calculatedCoreCount로 동기화
  // (골구조도 빌더에서는 handleCoresChange가 coreCount를 명시적으로 설정하므로
  //  매 렌더마다 override하면 사용자의 코어 추가/삭제가 되돌려짐)
  const prevCalculatedCoreCountRef = useRef(calculatedCoreCount);
  useEffect(() => {
    if (
      calculatedCoreCount !== undefined &&
      calculatedCoreCount !== prevCalculatedCoreCountRef.current
    ) {
      prevCalculatedCoreCountRef.current = calculatedCoreCount;
      if (formData.unitTypePattern.length > 0 && calculatedCoreCount !== formData.coreCount) {
        setFormData(prev => ({ ...prev, coreCount: calculatedCoreCount }));
      }
    }
  }, [calculatedCoreCount]); // eslint-disable-line react-hooks/exhaustive-deps

  const updateField = useCallback(<K extends keyof BuildingFormData>(
    field: K,
    value: BuildingFormData[K],
  ) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  }, []);

  const updateHeights = useCallback((heights: Heights) => {
    setFormData(prev => ({ ...prev, heights }));
  }, []);

  /** 다음 building prop 변경 시 서버 데이터로 동기화하도록 예약 */
  const requestServerSync = useCallback(() => {
    syncFromServerRef.current = true;
  }, []);

  return { formData, updateField, updateHeights, requestServerSync };
}
