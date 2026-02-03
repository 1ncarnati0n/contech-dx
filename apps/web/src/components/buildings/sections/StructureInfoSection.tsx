'use client';

import { Input } from '@/components/ui';
import type { CoreType, SlabType } from '@/lib/types';

interface StructureInfoSectionProps {
  /** 계산된 코어 개수 (읽기 전용) */
  coreCount: number;
  /** 코어 타입 */
  coreType: CoreType;
  /** 구조형식 */
  slabType: SlabType;
  /** 코어 타입 변경 핸들러 */
  onCoreTypeChange: (value: CoreType) => void;
  /** 구조형식 변경 핸들러 */
  onSlabTypeChange: (value: SlabType) => void;
}

const CORE_TYPE_OPTIONS: { value: CoreType; label: string }[] = [
  { value: '중복도(판상형)', label: '중복도(판상형)' },
  { value: '타워형', label: '타워형' },
  { value: '편복도', label: '편복도' },
];

const SLAB_TYPE_OPTIONS: { value: SlabType; label: string }[] = [
  { value: '벽식구조', label: '벽식구조' },
  { value: 'RC구조', label: 'RC구조' },
  { value: '벽식구조(내부기둥)', label: '벽식구조(내부기둥)' },
];

/**
 * 구조 정보 섹션
 *
 * 코어 개수(자동 계산), 코어 타입, 구조형식을 표시/입력합니다.
 */
export function StructureInfoSection({
  coreCount,
  coreType,
  slabType,
  onCoreTypeChange,
  onSlabTypeChange,
}: StructureInfoSectionProps) {
  return (
    <div className="grid grid-cols-3 gap-4">
      {/* 코어 개수 (읽기 전용) */}
      <div>
        <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
          코어 개수
        </label>
        <Input
          type="number"
          min="0"
          value={coreCount || ''}
          readOnly
          className="bg-slate-50 dark:bg-slate-900 cursor-not-allowed"
          title="단위세대 구성 입력에서 자동으로 계산됩니다"
        />
        <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
          단위세대 구성에서 자동 계산 (-1, -2, -3 접미사 코어 제외)
        </p>
      </div>

      {/* 코어 타입 */}
      <div>
        <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
          코어 타입
        </label>
        <select
          value={coreType}
          onChange={(e) => onCoreTypeChange(e.target.value as CoreType)}
          className="w-full px-3 py-2 border border-slate-200 dark:border-slate-700 rounded-md bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-primary-500"
        >
          {CORE_TYPE_OPTIONS.map((option) => (
            <option key={option.value} value={option.value}>
              {option.label}
            </option>
          ))}
        </select>
      </div>

      {/* 구조형식 */}
      <div>
        <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
          구조형식
        </label>
        <select
          value={slabType}
          onChange={(e) => onSlabTypeChange(e.target.value as SlabType)}
          className="w-full px-3 py-2 border border-slate-200 dark:border-slate-700 rounded-md bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-primary-500"
        >
          {SLAB_TYPE_OPTIONS.map((option) => (
            <option key={option.value} value={option.value}>
              {option.label}
            </option>
          ))}
        </select>
      </div>
    </div>
  );
}

StructureInfoSection.displayName = 'StructureInfoSection';
