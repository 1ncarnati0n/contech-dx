import type { ProcessItem } from '@/features/building/data/process-modules';
import type { ProcessPlanRow } from '../types';

export function getBuildingRowCategoryLabel(row: ProcessPlanRow): string {
  if (row.category === '버림' || row.category === '기초') return row.category;
  if (row.category === '주동 지하층') return '주동 지하층';
  if (row.category === '옥탑층') return '옥탑층';
  if (row.category === '기준층') return '기준층';
  if (row.category === '최상층') return '최상층';
  if (row.floorClass === '셋팅층') return '셋팅층';
  if (row.floorClass === '일반층') return '일반층';
  return row.floorClass || '';
}

export function getBuildingRowFloorNumberLabel(row: ProcessPlanRow): string {
  if (row.category === '버림' || row.category === '기초') return '';
  if (row.category === '기준층' && row.floorLabel) return row.floorLabel;
  if (row.category === '최상층' && row.floorLabel) return row.floorLabel;
  return row.floorLabel || '';
}

export function getBasementRowCategoryLabel(row: ProcessPlanRow): string {
  if (row.category === '지하층(층고6.5m이상)') {
    return '지하층(6.5m이상)';
  }
  return row.category;
}

export function getBasementRowFloorNumberLabel(row: ProcessPlanRow): string {
  if (row.category === '버림' || row.category === '기초' || row.category === '지하층(층고6.5m이상)') {
    return '';
  }
  if (!row.floorLabel) return '';
  return row.floorLabel.match(/^(B\d+)/)?.[1] || row.floorLabel;
}

function matchRooftopLabel(itemFloorLabel: string | undefined, rowFloorLabel: string | undefined): boolean {
  if (!itemFloorLabel) return true;
  if (!rowFloorLabel) return true;
  const itemMatch = itemFloorLabel.match(/옥탑(\d+)/);
  const rowMatch = rowFloorLabel.match(/옥탑(\d+)/);
  if (itemMatch && rowMatch) {
    return itemMatch[1] === rowMatch[1];
  }
  return itemFloorLabel === rowFloorLabel;
}

export function isProcessItemMatchedToBuildingRow(
  item: ProcessItem,
  row: ProcessPlanRow,
  firstStandardFloorLabel?: string
): boolean {
  if (row.category === '주동 지하층') {
    return item.floorLabel === row.floorLabel;
  }

  if (row.category === '옥탑층' && row.floor?.floorClass === 'PH층') {
    return !item.floorLabel || item.floorLabel === row.floorLabel;
  }

  if (row.category === '옥탑층') {
    return matchRooftopLabel(item.floorLabel, row.floorLabel);
  }

  if (row.category === '기준층') {
    const targetFloorLabel = firstStandardFloorLabel || row.floorLabel;
    return item.floorLabel === targetFloorLabel || !item.floorLabel;
  }

  if (row.category === '최상층') {
    return item.floorLabel === row.floorLabel || !item.floorLabel;
  }

  if (row.category === '일반층' || row.category === '셋팅층') {
    return item.floorLabel === row.floorLabel || !item.floorLabel;
  }

  return true;
}
