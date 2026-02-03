'use client';

import { Input } from '@/components/ui';

interface Heights {
  basement2: number;
  basement1: number;
  standard: number;
  floor1: number;
  floor2: number;
  floor3: number;
  floor4?: number;
  floor5?: number;
  top: number;
  ph: number | number[];
}

interface FloorHeightSectionProps {
  /** 층고 설정 값 */
  heights: Heights;
  /** 옥탑층 수 */
  phCount: number;
  /** 층고 변경 핸들러 */
  onHeightsChange: (heights: Heights) => void;
}

interface HeightField {
  key: keyof Omit<Heights, 'ph'>;
  label: string;
  defaultValue: number;
}

const HEIGHT_FIELDS: HeightField[] = [
  { key: 'basement2', label: 'B2층', defaultValue: 3500 },
  { key: 'basement1', label: 'B1층', defaultValue: 5400 },
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
 * 지하층, 지상층 1~5층, 기준층, 최상층, 옥탑층의 층고를 입력합니다.
 */
export function FloorHeightSection({
  heights,
  phCount,
  onHeightsChange,
}: FloorHeightSectionProps) {
  /**
   * 일반 층고 필드 변경 핸들러
   */
  const handleFieldChange = (key: keyof Omit<Heights, 'ph'>, value: number) => {
    onHeightsChange({ ...heights, [key]: value });
  };

  /**
   * 옥탑층 층고 변경 핸들러
   */
  const handlePhHeightChange = (index: number, value: number) => {
    const phArray = Array.isArray(heights.ph)
      ? [...heights.ph]
      : Array(phCount).fill(heights.ph || 2650);

    phArray[index] = value;
    onHeightsChange({ ...heights, ph: phArray });
  };

  /**
   * 단일 옥탑층 층고 변경 핸들러
   */
  const handleSinglePhHeightChange = (value: number) => {
    onHeightsChange({ ...heights, ph: [value] });
  };

  return (
    <div className="flex gap-3 overflow-x-auto pb-2">
      {/* 기본 층고 필드들 (B2 → B1 → 1층 → ... → 기준층 → 최상층 순서) */}
      {HEIGHT_FIELDS.map((field) => (
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

      {/* 옥탑층 층고 - 맨 뒤에 배치 */}
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
