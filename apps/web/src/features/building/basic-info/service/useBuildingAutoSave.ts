'use client';

import { useEffect, useRef, useState, useCallback } from 'react';
import type { Building } from '@/shared/types';
import type { BuildingFormData } from '../types';
import { updateBuilding, getBuildings } from '@/features/building/shared/repository/buildings';
import { buildBuildingMeta } from './buildBuildingMeta';
import { toast } from 'sonner';
import { logger } from '@/shared/utils/logger';

interface UseBuildingAutoSaveOptions {
  building: Building;
  formData: BuildingFormData;
  totalUnitCount: number;
  onUpdate: () => void;
}

/**
 * 빌딩 기본정보 자동 저장 훅
 *
 * - formData 변경 감지 (JSON 비교)
 * - 500ms 디바운스
 * - building 존재 확인 + retry
 * - isSaving 상태 관리
 */
export function useBuildingAutoSave({
  building,
  formData,
  totalUnitCount,
  onUpdate,
}: UseBuildingAutoSaveOptions) {
  const [isSaving, setIsSaving] = useState(false);

  const saveTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const isInitialMountRef = useRef(true);
  const buildingNotFoundRef = useRef(false);
  const prevFormDataRef = useRef<string>(JSON.stringify(formData));

  // building 전환 시 초기 마운트 플래그 리셋
  const prevBuildingIdRef = useRef(building?.id);
  useEffect(() => {
    if (prevBuildingIdRef.current !== building?.id) {
      prevBuildingIdRef.current = building?.id;
      isInitialMountRef.current = true;
      buildingNotFoundRef.current = false;
      prevFormDataRef.current = JSON.stringify(formData);
    }
  }, [building?.id, formData]);

  const performSave = useCallback(async () => {
    if (!building || !building.id || !building.projectId) {
      logger.error('Invalid building data:', building);
      buildingNotFoundRef.current = true;
      return;
    }

    setIsSaving(true);

    try {
      const meta = buildBuildingMeta(formData, totalUnitCount, {
        preserveExistingFloorCount: building.meta.floorCount,
      });

      let latestBuildings = await getBuildings(building.projectId);
      let latestBuilding = latestBuildings.find(b => b.id === building.id);

      if (!latestBuilding) {
        logger.warn('Building not found in store, attempting to reload...');
        try {
          await onUpdate();
          latestBuildings = await getBuildings(building.projectId);
          latestBuilding = latestBuildings.find(b => b.id === building.id);
        } catch (error) {
          logger.error('Failed to reload buildings:', error);
        }
      }

      if (!latestBuilding) {
        const wasNotFound = buildingNotFoundRef.current;
        buildingNotFoundRef.current = true;

        if (!wasNotFound) {
          logger.error('Building not found after reload, skipping save');
          toast.error('동 정보를 찾을 수 없어 저장하지 못했습니다. 페이지를 새로고침해주세요.');
        }
        return;
      }

      buildingNotFoundRef.current = false;

      await updateBuilding(latestBuilding.id, latestBuilding.projectId, {
        buildingName: formData.buildingName,
        meta,
      });
    } catch (error) {
      logger.error('Building save error:', error);
      toast.error('저장에 실패했습니다.', {
        description: error instanceof Error ? error.message : '알 수 없는 오류가 발생했습니다.',
      });
    } finally {
      setIsSaving(false);
    }
  }, [building, formData, totalUnitCount, onUpdate]);

  // formData 변경 감지 → 디바운스 자동 저장
  useEffect(() => {
    const currentSnapshot = JSON.stringify(formData);

    if (currentSnapshot === prevFormDataRef.current) {
      return;
    }

    prevFormDataRef.current = currentSnapshot;

    if (isInitialMountRef.current) {
      isInitialMountRef.current = false;
      return;
    }

    if (buildingNotFoundRef.current) {
      return;
    }

    if (saveTimeoutRef.current) {
      clearTimeout(saveTimeoutRef.current);
    }

    saveTimeoutRef.current = setTimeout(() => {
      performSave();
    }, 500);

    return () => {
      if (saveTimeoutRef.current) {
        clearTimeout(saveTimeoutRef.current);
      }
    };
  }, [formData, performSave]);

  // 컴포넌트 언마운트 시 타이머 정리
  useEffect(() => {
    return () => {
      if (saveTimeoutRef.current) {
        clearTimeout(saveTimeoutRef.current);
      }
    };
  }, []);

  return { isSaving };
}
