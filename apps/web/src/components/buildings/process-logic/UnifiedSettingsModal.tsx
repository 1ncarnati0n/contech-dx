'use client';

import React from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/Dialog';
import { Sliders, RotateCcw } from 'lucide-react';
import { Button } from '@/components/ui';
import type { ProcessCategory } from '@/lib/types';
import { Input } from '@/components/ui/Input';

interface UnifiedSettingsModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  equipmentBaseValues: Record<string, number>;
  onEquipmentBaseChange: (category: ProcessCategory, value: number) => void;
}

type EquipmentBaseLabel = '버림' | '기초' | '주동 지하층' | '1층' | '셋팅층' | '일반층' | '기준층' | '최상층' | 'PH층';

interface EquipmentBaseItem {
  label: EquipmentBaseLabel;
  defaultValue: number;
}

interface EquipmentGroup {
  title: string;
  color: string;         // border accent
  bgColor: string;       // header bg
  textColor: string;     // header text
  items: EquipmentBaseItem[];
}

const EQUIPMENT_GROUPS: EquipmentGroup[] = [
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
      { label: 'PH층', defaultValue: 230 },
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
  'PH층': 'PH층',
};

/**
 * 기준값 설정 모달
 */
export function UnifiedSettingsModal({
  open,
  onOpenChange,
  equipmentBaseValues,
  onEquipmentBaseChange,
}: UnifiedSettingsModalProps) {
  const handleValueChange = (label: EquipmentBaseLabel, value: string) => {
    const numValue = parseInt(value, 10);
    if (!isNaN(numValue) && numValue > 0) {
      const category = LABEL_TO_CATEGORY_MAP[label];
      onEquipmentBaseChange(category, numValue);
    }
  };

  const handleResetItem = (item: EquipmentBaseItem) => {
    const category = LABEL_TO_CATEGORY_MAP[item.label];
    onEquipmentBaseChange(category, item.defaultValue);
  };

  const handleResetAll = () => {
    for (const item of ALL_ITEMS) {
      const category = LABEL_TO_CATEGORY_MAP[item.label];
      onEquipmentBaseChange(category, item.defaultValue);
    }
  };

  // 변경된 항목 수
  const changedCount = ALL_ITEMS.filter((item) => {
    const current = equipmentBaseValues[item.label] ?? item.defaultValue;
    return current !== item.defaultValue;
  }).length;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-hidden flex flex-col">
        <DialogHeader>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-blue-50 dark:bg-blue-900/20 rounded-lg">
                <Sliders className="w-5 h-5 text-blue-600 dark:text-blue-400" />
              </div>
              <div>
                <DialogTitle>기준값 설정</DialogTitle>
                <DialogDescription>
                  장비 1대당 1일 타설 가능량 (㎥)
                </DialogDescription>
              </div>
            </div>
            {changedCount > 0 && (
              <Button
                variant="ghost"
                size="sm"
                onClick={handleResetAll}
                className="text-xs text-zinc-500 hover:text-zinc-700 dark:hover:text-zinc-300"
              >
                <RotateCcw className="w-3.5 h-3.5 mr-1" />
                전체 초기화
              </Button>
            )}
          </div>
        </DialogHeader>

        <div className="flex-1 overflow-y-auto mt-4 space-y-4">
          {EQUIPMENT_GROUPS.map((group) => (
            <div
              key={group.title}
              className={`rounded-lg border ${group.color} overflow-hidden`}
            >
              {/* 그룹 헤더 */}
              <div className={`px-4 py-2 ${group.bgColor} flex items-center gap-2`}>
                <span className={`text-sm font-semibold ${group.textColor}`}>
                  {group.title}
                </span>
                <span className="text-xs text-zinc-400 dark:text-zinc-500">
                  {group.items.length}개 부위
                </span>
              </div>

              {/* 항목 리스트 */}
              <div className="divide-y divide-zinc-100 dark:divide-zinc-800">
                {group.items.map((item) => {
                  const currentValue = equipmentBaseValues[item.label] ?? item.defaultValue;
                  const isChanged = currentValue !== item.defaultValue;

                  return (
                    <div
                      key={item.label}
                      className="flex items-center justify-between px-4 py-3 bg-white dark:bg-zinc-900"
                    >
                      {/* 라벨 + 기본값 */}
                      <div className="flex items-center gap-3 min-w-0">
                        <span className="text-sm font-medium text-zinc-800 dark:text-zinc-200 w-24 shrink-0">
                          {item.label}
                        </span>
                        <span className="text-xs text-zinc-400 dark:text-zinc-500">
                          기본 {item.defaultValue}
                        </span>
                      </div>

                      {/* 입력 + 리셋 */}
                      <div className="flex items-center gap-2">
                        <div className="relative">
                          <Input
                            type="number"
                            value={currentValue}
                            onChange={(e) => handleValueChange(item.label, e.target.value)}
                            className={`w-24 px-3 py-1.5 text-right pr-8 text-sm rounded-md border transition-colors
                              ${isChanged
                                ? 'border-blue-400 dark:border-blue-600 bg-blue-50/50 dark:bg-blue-900/10 text-blue-700 dark:text-blue-300 font-semibold'
                                : 'border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-800 text-zinc-700 dark:text-zinc-300'
                              }
                              focus:ring-2 focus:ring-blue-500 focus:border-transparent`}
                            min="1"
                          />
                          <span className="absolute right-2.5 top-1/2 -translate-y-1/2 text-xs text-zinc-400 pointer-events-none">
                            ㎥
                          </span>
                        </div>
                        {isChanged && (
                          <button
                            onClick={() => handleResetItem(item)}
                            className="p-1 rounded hover:bg-zinc-100 dark:hover:bg-zinc-800 text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-300 transition-colors"
                            title="기본값으로 복원"
                          >
                            <RotateCcw className="w-3.5 h-3.5" />
                          </button>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          ))}

          {/* 안내 */}
          <p className="text-xs text-zinc-400 dark:text-zinc-500 text-center py-1">
            변경된 값은 모달을 닫아도 유지되며, 저장 시 영구 반영됩니다
          </p>
        </div>
      </DialogContent>
    </Dialog>
  );
}
