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
    coreBasementFloors: meta?.floorCount?.coreBasementFloors || [],
    corePhFloors: meta?.floorCount?.corePhFloors || [],
    pilotisCount: meta?.floorCount?.pilotisCount || 0,
    corePilotisCounts: meta?.floorCount?.corePilotisCounts || [],
    corePilotisHeights: meta?.floorCount?.corePilotisHeights || [],
    hasHighCeilingEquipmentRoom: meta?.floorCount?.hasHighCeilingEquipmentRoom || false,
    unitTypePattern: meta?.unitTypePattern || [],
    heights: {
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

  // building prop 변경 시 상태 동기화
  useEffect(() => {
    if (!building || !building.meta) return;

    // 같은 빌딩의 업데이트인지, 다른 빌딩으로 전환인지 구분
    const isBuildingSwitch = buildingIdRef.current !== building.id;
    buildingIdRef.current = building.id;

    try {
      if (isBuildingSwitch) {
        // 다른 빌딩으로 전환: 전체 동기화
        setFormData(extractFormData(building));
      } else {
        // 같은 빌딩 업데이트: 전체 동기화 (서버 데이터 반영)
        setFormData(extractFormData(building));
      }
    } catch (error) {
      logger.error('Error syncing building data:', error);
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

  // 단위세대 패턴 변경 시 코어 개수 자동 업데이트
  useEffect(() => {
    if (
      calculatedCoreCount !== undefined &&
      formData.unitTypePattern.length > 0 &&
      calculatedCoreCount !== formData.coreCount
    ) {
      setFormData(prev => ({ ...prev, coreCount: calculatedCoreCount }));
    }
  }, [calculatedCoreCount, formData.coreCount, formData.unitTypePattern.length]);

  const updateField = useCallback(<K extends keyof BuildingFormData>(
    field: K,
    value: BuildingFormData[K],
  ) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  }, []);

  const updateHeights = useCallback((heights: Heights) => {
    setFormData(prev => ({ ...prev, heights }));
  }, []);

  return { formData, updateField, updateHeights };
}
