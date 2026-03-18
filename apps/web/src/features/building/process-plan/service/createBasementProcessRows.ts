import type { Building, ProcessCategory } from '@/shared/types';
import type { ProcessPlanRow } from '../types';

export function createBasementProcessRows(activeBuilding: Building | null): ProcessPlanRow[] {
  if (!activeBuilding) return [];

  const rows: ProcessPlanRow[] = [];
  let rowIndex = 0;
  const floors = activeBuilding.floors;
  const basementFloors = floors
    .filter((f) => f.levelType === '지하')
    .sort((a, b) => (b.floorNumber || 0) - (a.floorNumber || 0));

  const addedLabels = new Set<string>();
  basementFloors.forEach((floor) => {
    const cleanLabel = floor.floorLabel.replace(/코어\d+-/, '');
    if (addedLabels.has(cleanLabel)) return;
    addedLabels.add(cleanLabel);

    rows.push({
      category: '지하주차장' as ProcessCategory,
      rowIndex: rowIndex++,
      isSpecialRow: true,
      floorLabel: `${cleanLabel} 주차장`,
    });

    rows.push({
      category: '주동 지하층',
      floorLabel: cleanLabel,
      floor,
      floorClass: floor.floorClass,
      rowIndex: rowIndex++,
    });

    if (cleanLabel === 'B1' && activeBuilding.meta?.floorCount?.hasHighCeilingEquipmentRoom) {
      const hasB2 = basementFloors.some((f) => f.floorLabel === 'B2' || f.floorLabel.includes('B2'));
      if (hasB2) {
        rows.push({
          category: '지하층(층고6.5m이상)' as ProcessCategory,
          rowIndex: rowIndex++,
          isSpecialRow: true,
          floorLabel: 'B1 6.5m이상',
          isFirstHighCeiling: true,
        });
        rows.push({
          category: '지하층(층고6.5m이상)' as ProcessCategory,
          rowIndex: rowIndex++,
          isSpecialRow: true,
          floorLabel: 'B2 6.5m이상',
          isSecondHighCeiling: true,
        });
      }
    }
  });

  rows.push({ category: '기초', rowIndex: rowIndex++ });
  rows.push({ category: '버림', rowIndex: rowIndex++ });

  return rows;
}
