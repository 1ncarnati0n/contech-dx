'use client';

import { useMemo } from 'react';
import { Input } from '@/shared/components/ui';
import type { Heights } from '../../types';

interface FloorHeightSectionProps {
  heights: Heights;
  phCount: number;
  basementCount: number;
  onHeightsChange: (heights: Heights) => void;
}

interface HeightField {
  key: keyof Omit<Heights, 'ph'>;
  label: string;
  defaultValue: number;
}

const BASEMENT_FIELDS: { key: keyof Omit<Heights, 'ph'>; label: string; defaultValue: number }[] = [
  { key: 'basement4', label: 'B4층', defaultValue: 3500 },
  { key: 'basement3', label: 'B3층', defaultValue: 3500 },
  { key: 'basement2', label: 'B2층', defaultValue: 3500 },
  { key: 'basement1', label: 'B1층', defaultValue: 5400 },
];

const GROUND_FIELDS: HeightField[] = [
  { key: 'floor1', label: '1층', defaultValue: 3050 },
  { key: 'floor2', label: '2층', defaultValue: 2850 },
  { key: 'floor3', label: '3층', defaultValue: 2850 },
  { key: 'floor4', label: '4층', defaultValue: 2850 },
  { key: 'floor5', label: '5층', defaultValue: 2850 },
  { key: 'standard', label: '기준층', defaultValue: 2850 },
  { key: 'top', label: '최상층', defaultValue: 3050 },
];

/**
 * 층고 설정 섹션
 *
 * 지하층(basementCount에 따라 동적), 지상층, 기준층, 최상층, 옥탑층의 층고를 입력합니다.
 */
export function FloorHeightSection({
  heights,
  phCount,
  basementCount,
  onHeightsChange,
}: FloorHeightSectionProps) {
  // basementCount에 따라 지하층 필드 동적 생성 (B1부터 위로)
  const basementFields = useMemo(() => {
    const clamped = Math.max(0, Math.min(basementCount, BASEMENT_FIELDS.length));
    return BASEMENT_FIELDS.slice(BASEMENT_FIELDS.length - clamped);
  }, [basementCount]);

  const handleFieldChange = (key: keyof Omit<Heights, 'ph'>, value: number) => {
    onHeightsChange({ ...heights, [key]: value });
  };

  const handlePhHeightChange = (index: number, value: number) => {
    const phArray = Array.isArray(heights.ph)
      ? [...heights.ph]
      : Array(phCount).fill(heights.ph || 2650);

    phArray[index] = value;
    onHeightsChange({ ...heights, ph: phArray });
  };

  const handleSinglePhHeightChange = (value: number) => {
    onHeightsChange({ ...heights, ph: [value] });
  };

  return (
    <div className="flex gap-3 overflow-x-auto pb-2">
      {/* 지하층 (basementCount에 따라 동적) */}
      {basementFields.map((field) => (
        <div key={field.key} className="flex-shrink-0">
          <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">
            {field.label}
          </label>
          <Input
            type="number"
            step="1"
            min="0"
            className="w-20"
            value={(heights[field.key] as number) || field.defaultValue}
            onChange={(e) => handleFieldChange(field.key, Number(e.target.value))}
          />
        </div>
      ))}

      {/* 지상층 (1~5층, 기준층, 최상층) */}
      {GROUND_FIELDS.map((field) => (
        <div key={field.key} className="flex-shrink-0">
          <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">
            {field.label}
          </label>
          <Input
            type="number"
            step="1"
            min="0"
            className="w-20"
            value={(heights[field.key] as number) || field.defaultValue}
            onChange={(e) => handleFieldChange(field.key, Number(e.target.value))}
          />
        </div>
      ))}

      {/* 옥탑층 */}
      {phCount > 0 && (
        phCount === 1 ? (
          <div className="flex-shrink-0">
            <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">
              옥탑층
            </label>
            <Input
              type="number"
              step="1"
              min="0"
              className="w-20"
              value={Array.isArray(heights.ph) ? heights.ph[0] || 2650 : heights.ph || 2650}
              onChange={(e) => handleSinglePhHeightChange(Number(e.target.value))}
            />
          </div>
        ) : (
          Array.from({ length: phCount }, (_, i) => (
            <div key={`ph-${i}`} className="flex-shrink-0">
              <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">
                옥탑{i + 1}
              </label>
              <Input
                type="number"
                step="1"
                min="0"
                className="w-20"
                value={
                  Array.isArray(heights.ph)
                    ? (heights.ph[i] || 2650)
                    : (i === 0 ? (heights.ph || 2650) : 2650)
                }
                onChange={(e) => handlePhHeightChange(i, Number(e.target.value))}
              />
            </div>
          ))
        )
      )}
    </div>
  );
}

FloorHeightSection.displayName = 'FloorHeightSection';
