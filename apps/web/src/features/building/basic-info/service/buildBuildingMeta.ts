import type { BuildingMeta } from '@/shared/types';
import type { BuildingFormData } from '../types';

interface BuildMetaOptions {
  /** autoSave 시에는 기존 floorCount를 유지하고 일부만 덮어쓴다 */
  preserveExistingFloorCount?: BuildingMeta['floorCount'];
}

/**
 * BuildingFormData에서 BuildingMeta를 구성하는 순수 함수
 *
 * 3곳(autoSave, handleSaveBuildingInfo, handleSaveUnitTypePattern)에서
 * 반복되던 meta 구성 로직을 통합.
 */
export function buildBuildingMeta(
  formData: BuildingFormData,
  totalUnitCount: number,
  options?: BuildMetaOptions,
): Omit<BuildingMeta, 'pumpCarCount'> {
  const {
    coreCount,
    coreType,
    slabType,
    unitTypePattern,
    basementCount,
    groundCount,
    phCount,
    coreGroundFloors,
    coreUnitGroundFloors,
    coreBasementFloors,
    corePhFloors,
    pilotisCount,
    corePilotisCounts,
    corePilotisHeights,
    corePilotisExcludeUnits,
    hasHighCeilingEquipmentRoom,
    scaffoldingColumns,
    heights,
    standardFloorCycle,
  } = formData;

  const baseFloorCount = options?.preserveExistingFloorCount
    ? { ...options.preserveExistingFloorCount }
    : {
        basement: basementCount,
        ground: groundCount,
        ph: phCount,
      };

  const floorCount = {
    ...baseFloorCount,
    coreGroundFloors: coreGroundFloors.length > 0 ? coreGroundFloors : undefined,
    coreUnitGroundFloors: coreUnitGroundFloors.length > 0 ? coreUnitGroundFloors : undefined,
    coreBasementFloors: coreBasementFloors.length > 0 ? coreBasementFloors : undefined,
    corePhFloors: corePhFloors.length > 0 ? corePhFloors : undefined,
    pilotisCount: pilotisCount > 0 ? pilotisCount : undefined,
    corePilotisCounts: corePilotisCounts.length > 0 ? corePilotisCounts : undefined,
    corePilotisHeights: corePilotisHeights.length > 0 ? corePilotisHeights : undefined,
    corePilotisExcludeUnits: corePilotisExcludeUnits.some(u => u.length > 0) ? corePilotisExcludeUnits : undefined,
    hasHighCeilingEquipmentRoom,
    scaffoldingColumns: scaffoldingColumns.some(cols => cols.length > 0) ? scaffoldingColumns : undefined,
  };

  return {
    totalUnits: totalUnitCount,
    coreCount,
    coreType,
    slabType,
    unitTypePattern,
    floorCount,
    heights,
    standardFloorCycle,
  };
}
