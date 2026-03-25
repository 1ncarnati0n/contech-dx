'use client';

import { useState, useCallback } from 'react';
import type { Building } from '@/shared/types';
import type { BuildingFormData } from '../types';
import { updateBuilding, getBuildings } from '@/features/building/shared/repository/buildings';
import { buildBuildingMeta } from './buildBuildingMeta';
import { toast } from 'sonner';
import { logger } from '@/shared/utils/logger';

interface UseBuildingSaveOptions {
  building: Building;
  formData: BuildingFormData;
  totalUnitCount: number;
  onUpdate: () => void;
  onStartGeneration?: () => void;
  onGenerationProgress?: (progress: number, message: string) => void;
  onGenerationComplete?: () => void;
  onBeforeRegenerate?: () => Promise<void>;
}

async function findLatestBuilding(building: Building, onUpdate: () => void) {
  let latestBuildings = await getBuildings(building.projectId);
  let latestBuilding = latestBuildings.find(b => b.id === building.id);

  if (!latestBuilding) {
    await onUpdate();
    latestBuildings = await getBuildings(building.projectId);
    latestBuilding = latestBuildings.find(b => b.id === building.id);
  }

  return latestBuilding;
}

/**
 * 빌딩 저장 핸들러 훅
 *
 * - handleSave: 층 재생성 포함 저장 (층정보 생성 버튼)
 * - handleSaveUnitType: 단위세대 구성만 저장 (재생성 없음)
 */
export function useBuildingSave({
  building,
  formData,
  totalUnitCount,
  onUpdate,
  onStartGeneration,
  onGenerationProgress,
  onGenerationComplete,
  onBeforeRegenerate,
}: UseBuildingSaveOptions) {
  const [isSaving, setIsSaving] = useState(false);

  const handleSave = useCallback(async () => {
    setIsSaving(true);
    try {
      if (!building?.id || !building?.projectId) {
        toast.error('동 정보를 찾을 수 없습니다.');
        return;
      }

      const latestBuilding = await findLatestBuilding(building, onUpdate);
      if (!latestBuilding) {
        toast.error('동 정보를 찾을 수 없어 저장하지 못했습니다.');
        return;
      }

      // "층정보 생성" 버튼은 항상 재생성 수행
      const shouldRegenerate = true;

      onStartGeneration?.();

      // 재생성 전 물량 데이터 저장
      if (onBeforeRegenerate) {
        onGenerationProgress?.(10, '물량 데이터 저장 중...');
        try {
          await onBeforeRegenerate(); 
        } catch (error) {
          logger.error('물량 저장 실패:', error);
          toast.error('물량 데이터 저장에 실패했습니다. 층 재생성을 중단합니다.');
          return;
        }
      }

      const meta = buildBuildingMeta(formData, totalUnitCount);

      if (shouldRegenerate) {
        onGenerationProgress?.(30, '데이터 저장 중...');
      }

      await new Promise(resolve => setTimeout(resolve, 100));

      await updateBuilding(latestBuilding.id, latestBuilding.projectId, {
        buildingName: formData.buildingName,
        meta,
        forceRegenerateFloors: shouldRegenerate,
      });

      if (shouldRegenerate) {
        onGenerationProgress?.(60, '층 설정 생성 중...');
        await new Promise(resolve => setTimeout(resolve, 150));
        onGenerationProgress?.(90, '물량 입력표 준비 중...');
        await new Promise(resolve => setTimeout(resolve, 100));
      }

      await onUpdate();

      if (shouldRegenerate) {
        onGenerationComplete?.();
      }

      toast.success('동 정보가 저장되었습니다.');
    } catch (error) {
      logger.error('동 정보 저장 오류:', error);
      toast.error('저장에 실패했습니다.', {
        description: error instanceof Error ? error.message : '알 수 없는 오류가 발생했습니다.',
      });
      onGenerationProgress?.(0, '');
    } finally {
      setIsSaving(false);
    }
  }, [building, formData, totalUnitCount, onUpdate, onStartGeneration, onGenerationProgress, onGenerationComplete, onBeforeRegenerate]);

  const handleSaveUnitType = useCallback(async () => {
    setIsSaving(true);
    try {
      if (!building?.id || !building?.projectId) {
        toast.error('동 정보를 찾을 수 없습니다.');
        return;
      }

      const latestBuilding = await findLatestBuilding(building, onUpdate);
      if (!latestBuilding) {
        toast.error('동 정보를 찾을 수 없어 저장하지 못했습니다.');
        return;
      }

      const meta = {
        ...latestBuilding.meta,
        ...buildBuildingMeta(formData, totalUnitCount),
      };

      await updateBuilding(latestBuilding.id, latestBuilding.projectId, {
        buildingName: formData.buildingName,
        meta,
      });

      await onUpdate();
      toast.success('단위세대 구성이 저장되었습니다.');
    } catch (error) {
      logger.error('단위세대 구성 저장 오류:', error);
      toast.error('저장에 실패했습니다.', {
        description: error instanceof Error ? error.message : '알 수 없는 오류가 발생했습니다.',
      });
    } finally {
      setIsSaving(false);
    }
  }, [building, formData, totalUnitCount, onUpdate]);

  return { handleSave, handleSaveUnitType, isSaving };
}
