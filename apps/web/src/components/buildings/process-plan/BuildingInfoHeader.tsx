/**
 * Building Info Header Component
 *
 * 🎯 Stage 2 Task 4: Component Separation
 * Extracted from BuildingProcessPlanPage (lines 1474-1529)
 *
 * 📦 Features:
 * - Displays building unit information (호수)
 * - Pump car count input with auto-save
 * - React.memo for performance optimization
 *
 * 💡 Usage:
 * <BuildingInfoHeader
 *   building={activeBuilding}
 *   buildingInfo={getBuildingInfo(building)}
 *   projectId={projectId}
 *   onUpdate={loadBuildings}
 * />
 */

import { memo } from 'react';
import type { Building } from '@/lib/types';
import { Input } from '@/components/ui/Input';
import { updateBuilding } from '@/lib/services/buildings';
import { toast } from 'sonner';

interface BuildingInfo {
  coreUnits?: Array<{ coreNumber: number; units: number }>;
  totalUnits: number;
}

interface BuildingInfoHeaderProps {
  building: Building;
  buildingInfo: BuildingInfo;
  projectId: string;
  onUpdate: () => Promise<void>;
}

export const BuildingInfoHeader = memo(function BuildingInfoHeader({
  building,
  buildingInfo,
  projectId,
  onUpdate,
}: BuildingInfoHeaderProps) {
  const handlePumpCarUpdate = async (value: number | null) => {
    try {
      await updateBuilding(building.id, projectId, {
        meta: {
          ...building.meta,
          pumpCarCount: value,
        },
      });
      await onUpdate();
    } catch (error) {
      toast.error('펌프카 대수 저장에 실패했습니다.');
    }
  };

  const handleChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value === '' ? null : parseInt(e.target.value, 10);
    await handlePumpCarUpdate(value);
  };

  const handleBlur = async (e: React.FocusEvent<HTMLInputElement>) => {
    const value = e.target.value === '' ? null : Math.max(0, parseInt(e.target.value, 10) || 0);
    await handlePumpCarUpdate(value);
  };

  return (
    <div className="px-4 py-3 bg-zinc-50 dark:bg-zinc-900 border-b-2 border-zinc-200 dark:border-zinc-800">
      <div className="flex gap-6 text-sm items-center">
        <div className="font-semibold text-zinc-900 dark:text-white">
          호수:{' '}
          <span className="font-normal">
            {buildingInfo.coreUnits && buildingInfo.coreUnits.length > 0
              ? buildingInfo.coreUnits.map((cu, idx) => `코어${cu.coreNumber} ${cu.units}호`).join(', ')
              : buildingInfo.totalUnits}
          </span>
        </div>
        <div className="font-semibold text-zinc-900 dark:text-white flex items-center gap-2">
          펌프카 최대 투입대수:
          <Input
            type="number"
            min="0"
            step="1"
            value={building.meta?.pumpCarCount ?? ''}
            onChange={handleChange}
            onBlur={handleBlur}
            className="w-20 h-8 text-sm [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:appearance-none [-moz-appearance:textfield]"
            placeholder="0"
          />
        </div>
      </div>
    </div>
  );
});
