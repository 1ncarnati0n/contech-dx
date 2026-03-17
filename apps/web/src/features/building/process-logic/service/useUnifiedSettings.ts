'use client';

import { useMemo, useCallback } from 'react';
import type { ProcessCategory } from '@/shared/types';

type EquipmentBaseLabel = '버림' | '기초' | '주동 지하층' | '1층' | '셋팅층' | '일반층' | '기준층' | '최상층' | '옥탑층';

export interface EquipmentBaseItem {
  label: EquipmentBaseLabel;
  defaultValue: number;
}

export interface EquipmentGroup {
  title: string;
  color: string;
  bgColor: string;
  textColor: string;
  items: EquipmentBaseItem[];
}

export const EQUIPMENT_GROUPS: EquipmentGroup[] = [
  {
    title: '지하',
    color: 'border-amber-300 dark:border-amber-700',
    bgColor: 'bg-amber-50 dark:bg-amber-900/20',
    textColor: 'text-amber-700 dark:text-amber-300',
    items: [
      { label: '버림', defaultValue: 650 },
      { label: '기초', defaultValue: 650 },
      { label: '주동 지하층', defaultValue: 500 },
    ],
  },
  {
    title: '지상',
    color: 'border-blue-300 dark:border-blue-700',
    bgColor: 'bg-blue-50 dark:bg-blue-900/20',
    textColor: 'text-blue-700 dark:text-blue-300',
    items: [
      { label: '1층', defaultValue: 400 },
      { label: '셋팅층', defaultValue: 400 },
      { label: '일반층', defaultValue: 200 },
      { label: '기준층', defaultValue: 320 },
    ],
  },
  {
    title: '옥상',
    color: 'border-emerald-300 dark:border-emerald-700',
    bgColor: 'bg-emerald-50 dark:bg-emerald-900/20',
    textColor: 'text-emerald-700 dark:text-emerald-300',
    items: [
      { label: '최상층', defaultValue: 230 },
      { label: '옥탑층', defaultValue: 230 },
    ],
  },
];

const ALL_ITEMS = EQUIPMENT_GROUPS.flatMap((g) => g.items);

const LABEL_TO_CATEGORY_MAP: Record<EquipmentBaseLabel, ProcessCategory> = {
  '버림': '버림',
  '기초': '기초',
  '주동 지하층': '주동 지하층',
  '1층': '셋팅층',
  '셋팅층': '셋팅층',
  '일반층': '일반층',
  '기준층': '기준층',
  '최상층': '최상층',
  '옥탑층': '옥탑층',
};

interface UseUnifiedSettingsOptions {
  equipmentBaseValues: Record<string, number>;
  onEquipmentBaseChange: (category: ProcessCategory, value: number) => void;
}

export function useUnifiedSettings({
  equipmentBaseValues,
  onEquipmentBaseChange,
}: UseUnifiedSettingsOptions) {
  const handleValueChange = useCallback((label: EquipmentBaseLabel, value: string) => {
    const numValue = parseInt(value, 10);
    if (!isNaN(numValue) && numValue > 0) {
      const category = LABEL_TO_CATEGORY_MAP[label];
      onEquipmentBaseChange(category, numValue);
    }
  }, [onEquipmentBaseChange]);

  const handleResetItem = useCallback((item: EquipmentBaseItem) => {
    const category = LABEL_TO_CATEGORY_MAP[item.label];
    onEquipmentBaseChange(category, item.defaultValue);
  }, [onEquipmentBaseChange]);

  const handleResetAll = useCallback(() => {
    for (const item of ALL_ITEMS) {
      const category = LABEL_TO_CATEGORY_MAP[item.label];
      onEquipmentBaseChange(category, item.defaultValue);
    }
  }, [onEquipmentBaseChange]);

  const changedCount = useMemo(() => {
    return ALL_ITEMS.filter((item) => {
      const current = equipmentBaseValues[item.label] ?? item.defaultValue;
      return current !== item.defaultValue;
    }).length;
  }, [equipmentBaseValues]);

  const getCurrentValue = useCallback((item: EquipmentBaseItem): number => {
    return equipmentBaseValues[item.label] ?? item.defaultValue;
  }, [equipmentBaseValues]);

  const isItemChanged = useCallback((item: EquipmentBaseItem): boolean => {
    return getCurrentValue(item) !== item.defaultValue;
  }, [getCurrentValue]);

  return {
    groups: EQUIPMENT_GROUPS,
    changedCount,
    handleValueChange,
    handleResetItem,
    handleResetAll,
    getCurrentValue,
    isItemChanged,
  };
}
