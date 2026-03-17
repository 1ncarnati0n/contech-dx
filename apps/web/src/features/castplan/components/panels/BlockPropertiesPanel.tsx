'use client';

import { Card, CardHeader, CardTitle, CardContent, Input } from '@/components/ui';
import { Settings } from 'lucide-react';
import type { CastBlock } from '@/lib/types';

interface BlockPropertiesPanelProps {
  block: CastBlock;
  onUpdate: (updates: Partial<CastBlock>) => void;
}

// 콘크리트 강도 옵션
const CONCRETE_GRADES = [
  '21-15-25',
  '24-15-25',
  '24-18-25',
  '25-24-15',
  '27-18-25',
  '30-18-25',
  '35-18-25',
];

// 블록 색상 옵션
const BLOCK_COLORS = [
  '#3B82F6', // Blue
  '#22C55E', // Green
  '#F59E0B', // Amber
  '#EF4444', // Red
  '#8B5CF6', // Purple
  '#06B6D4', // Cyan
  '#EC4899', // Pink
  '#F97316', // Orange
];

export function BlockPropertiesPanel({ block, onUpdate }: BlockPropertiesPanelProps) {
  return (
    <Card className="border-primary-200 dark:border-primary-800">
      <CardHeader className="pb-2 bg-primary-50 dark:bg-primary-900/20">
        <CardTitle className="text-sm flex items-center gap-2 text-primary-700 dark:text-primary-300">
          <Settings className="w-4 h-4" />
          블록 속성: {block.name}
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3 pt-3">
        {/* 블록명 */}
        <div className="space-y-1">
          <label className="text-xs font-medium text-slate-600 dark:text-slate-400">
            블록명
          </label>
          <Input
            type="text"
            value={block.name}
            onChange={(e) => onUpdate({ name: e.target.value })}
            className="h-8 text-sm"
          />
        </div>

        {/* 두께 */}
        <div className="space-y-1">
          <label className="text-xs font-medium text-slate-600 dark:text-slate-400">
            두께 (m)
          </label>
          <Input
            type="number"
            step="0.1"
            min="0.1"
            value={block.thickness}
            onChange={(e) => onUpdate({ thickness: parseFloat(e.target.value) || 0.1 })}
            className="h-8 text-sm"
          />
        </div>

        {/* 콘크리트 강도 */}
        <div className="space-y-1">
          <label className="text-xs font-medium text-slate-600 dark:text-slate-400">
            콘크리트 강도
          </label>
          <select
            value={block.concreteGrade}
            onChange={(e) => onUpdate({ concreteGrade: e.target.value })}
            className="w-full h-8 text-sm border border-slate-200 dark:border-slate-700 rounded-md bg-white dark:bg-slate-800 px-2"
          >
            {CONCRETE_GRADES.map((grade) => (
              <option key={grade} value={grade}>
                {grade}
              </option>
            ))}
          </select>
        </div>

        {/* 할증률 */}
        <div className="space-y-1">
          <label className="text-xs font-medium text-slate-600 dark:text-slate-400">
            할증률 (%)
          </label>
          <Input
            type="number"
            step="1"
            min="0"
            max="20"
            value={block.surchargeRate}
            onChange={(e) => onUpdate({ surchargeRate: parseFloat(e.target.value) || 0 })}
            className="h-8 text-sm"
          />
        </div>

        {/* 타설 순서 */}
        <div className="space-y-1">
          <label className="text-xs font-medium text-slate-600 dark:text-slate-400">
            타설 순서
          </label>
          <Input
            type="number"
            step="1"
            min="0"
            value={block.sequence}
            onChange={(e) => onUpdate({ sequence: parseInt(e.target.value) || 0 })}
            className="h-8 text-sm"
          />
        </div>

        {/* 타설 예정일 */}
        <div className="space-y-1">
          <label className="text-xs font-medium text-slate-600 dark:text-slate-400">
            타설 예정일
          </label>
          <Input
            type="date"
            value={block.scheduledDate || ''}
            onChange={(e) => onUpdate({ scheduledDate: e.target.value || undefined })}
            className="h-8 text-sm"
          />
        </div>

        {/* 색상 */}
        <div className="space-y-1">
          <label className="text-xs font-medium text-slate-600 dark:text-slate-400">
            색상
          </label>
          <div className="flex gap-1 flex-wrap">
            {BLOCK_COLORS.map((color) => (
              <button
                key={color}
                className={`w-6 h-6 rounded border-2 ${
                  block.color === color
                    ? 'border-white ring-2 ring-primary-500'
                    : 'border-transparent'
                }`}
                style={{ backgroundColor: color }}
                onClick={() => onUpdate({ color })}
              />
            ))}
          </div>
        </div>

        {/* 계산된 값 (읽기 전용) */}
        <div className="pt-2 border-t border-slate-200 dark:border-slate-700 space-y-2">
          <div className="flex justify-between text-sm">
            <span className="text-slate-600 dark:text-slate-400">면적</span>
            <span className="font-medium">
              {(block.area || 0).toLocaleString('ko-KR', { maximumFractionDigits: 2 })} ㎡
            </span>
          </div>
          <div className="flex justify-between text-sm">
            <span className="text-slate-600 dark:text-slate-400">순물량</span>
            <span className="font-medium">
              {(block.volume || 0).toLocaleString('ko-KR', { maximumFractionDigits: 2 })} ㎥
            </span>
          </div>
          <div className="flex justify-between text-sm">
            <span className="text-slate-600 dark:text-slate-400">발주량</span>
            <span className="font-semibold text-primary-600 dark:text-primary-400">
              {(block.orderVolume || 0).toLocaleString('ko-KR', { maximumFractionDigits: 2 })} ㎥
            </span>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
