'use client';

import { useCallback } from 'react';
import { toast } from 'sonner';
import type { Building } from '@/shared/types';
import { updateBuilding } from '@/features/building/shared/repository/buildings';

interface UsePumpCarUpdateOptions {
  building: Building;
  projectId: string;
  onUpdate: () => Promise<void>;
}

export function usePumpCarUpdate({ building, projectId, onUpdate }: UsePumpCarUpdateOptions) {
  const savePumpCarCount = useCallback(async (value: number | null) => {
    try {
      await updateBuilding(building.id, projectId, {
        meta: {
          ...building.meta,
          pumpCarCount: value,
        },
      });
      await onUpdate();
    } catch {
      toast.error('펌프카 대수 저장에 실패했습니다.');
    }
  }, [building.id, building.meta, projectId, onUpdate]);

  const handleChange = useCallback(async (rawValue: string) => {
    const value = rawValue === '' ? null : parseInt(rawValue, 10);
    await savePumpCarCount(value);
  }, [savePumpCarCount]);

  const handleBlur = useCallback(async (rawValue: string) => {
    const value = rawValue === '' ? null : Math.max(0, parseInt(rawValue, 10) || 0);
    await savePumpCarCount(value);
  }, [savePumpCarCount]);

  return { handleChange, handleBlur };
}
