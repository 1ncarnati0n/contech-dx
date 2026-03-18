'use client';

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/shared/components/ui/Dialog';
import { Sliders, RotateCcw } from 'lucide-react';
import { Button } from '@/shared/components/ui';
import type { ProcessCategory } from '@/shared/types';
import { Input } from '@/shared/components/ui/Input';
import { useUnifiedSettings } from '../service/useUnifiedSettings';

interface UnifiedSettingsModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  equipmentBaseValues: Record<string, number>;
  onEquipmentBaseChange: (category: ProcessCategory, value: number) => void;
}

/**
 * 기준값 설정 모달
 */
export function UnifiedSettingsModal({
  open,
  onOpenChange,
  equipmentBaseValues,
  onEquipmentBaseChange,
}: UnifiedSettingsModalProps) {
  const {
    groups,
    changedCount,
    handleValueChange,
    handleResetItem,
    handleResetAll,
    getCurrentValue,
    isItemChanged,
  } = useUnifiedSettings({ equipmentBaseValues, onEquipmentBaseChange });

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
          {groups.map((group) => (
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
                  const currentValue = getCurrentValue(item);
                  const changed = isItemChanged(item);

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
                              ${changed
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
                        {changed && (
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
