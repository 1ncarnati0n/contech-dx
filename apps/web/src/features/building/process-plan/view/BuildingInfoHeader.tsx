/**
 * Building Info Header Component
 *
 * Displays building unit information and pump car count input.
 */

import { memo } from 'react';
import type { Building } from '@/shared/types';
import { Input } from '@/shared/components/ui/Input';
import { usePumpCarUpdate } from '../service/usePumpCarUpdate';

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
  const { handleChange, handleBlur } = usePumpCarUpdate({ building, projectId, onUpdate });

  return (
    <div className="px-4 py-3 bg-zinc-50 dark:bg-zinc-900 border-b-2 border-zinc-200 dark:border-zinc-800">
      <div className="flex gap-6 text-sm items-center">
        <div className="font-semibold text-zinc-900 dark:text-white">
          호수:{' '}
          <span className="font-normal">
            {buildingInfo.coreUnits && buildingInfo.coreUnits.length > 0
              ? buildingInfo.coreUnits.map((cu) => `코어${cu.coreNumber} ${cu.units}호`).join(', ')
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
            onChange={(e) => handleChange(e.target.value)}
            onBlur={(e) => handleBlur(e.target.value)}
            className="w-20 h-8 text-sm [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:appearance-none [-moz-appearance:textfield]"
            placeholder="0"
          />
        </div>
      </div>
    </div>
  );
});
