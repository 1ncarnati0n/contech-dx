'use client';

import React from 'react';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Button } from '@/components/ui/Button';
import type { ProcessLogicPreset } from '@/lib/types';

interface PresetSelectorProps {
  presets: ProcessLogicPreset[];
  activePresetId: string | null;
  onPresetChange: (presetId: string) => void;
  onManageClick: () => void;
  disabled?: boolean;
}

/**
 * 프리셋 선택 컴포넌트
 *
 * 드롭다운으로 프리셋을 선택하고, "프리셋 관리" 버튼을 제공합니다.
 */
export function PresetSelector({
  presets,
  activePresetId,
  onPresetChange,
  onManageClick,
  disabled = false,
}: PresetSelectorProps) {
  return (
    <div className="flex items-center gap-3">
      <label className="text-sm font-medium text-gray-700">프리셋:</label>

      <Select
        value={activePresetId || ''}
        onValueChange={onPresetChange}
        disabled={disabled}
      >
        <SelectTrigger className="w-60">
          <SelectValue placeholder="프리셋 선택" />
        </SelectTrigger>
        <SelectContent>
          {presets.length === 0 && (
            <div className="px-2 py-1.5 text-sm text-gray-500">
              저장된 프리셋이 없습니다
            </div>
          )}
          {presets.map((preset) => (
            <SelectItem key={preset.id} value={preset.id}>
              <div className="flex items-center gap-2">
                <span>{preset.name}</span>
                {preset.isDefault && (
                  <span className="text-xs text-gray-500">(기본)</span>
                )}
                {!preset.projectId && (
                  <span className="text-xs text-blue-600">(공통)</span>
                )}
              </div>
            </SelectItem>
          ))}
        </SelectContent>
      </Select>

      <Button
        variant="outline"
        onClick={onManageClick}
        disabled={disabled}
        className="whitespace-nowrap"
      >
        프리셋 관리
      </Button>
    </div>
  );
}
