'use client';

import { Button, Input, Badge } from '@/shared/components/ui';
import { Plus, Trash2, HelpCircle, Save } from 'lucide-react';
import type { UnitTypePattern } from '@/shared/types';
import type { Heights } from '../../types';

interface UnitTypePatternSectionProps {
  /** 단위세대 패턴 목록 */
  unitTypePattern: UnitTypePattern[];
  /** 기본 지하층 수 */
  basementCount: number;
  /** 기본 지상층 수 */
  groundCount: number;
  /** 기본 옥탑층 수 */
  phCount: number;
  /** 코어별 지하층 수 배열 */
  coreBasementFloors: number[];
  /** 코어별 지상층 수 배열 */
  coreGroundFloors: number[];
  /** 코어별 옥탑층 수 배열 */
  corePhFloors: number[];
  /** 코어별 필로티 부대시설 제외 세대수 배열 */
  corePilotisCounts: number[];
  /** 코어별 필로티 층수 배열 */
  corePilotisHeights: number[];
  /** 3단 비계 여부 */
  hasHighCeilingEquipmentRoom: boolean;
  /** 계산된 총 세대수 */
  totalUnitCount: number;
  /** 현재 층고 설정 */
  heights: Heights;

  // 변경 핸들러들
  onUnitTypePatternChange: (patterns: UnitTypePattern[]) => void;
  onBasementCountChange: (value: number) => void;
  onGroundCountChange: (value: number) => void;
  onPhCountChange: (value: number) => void;
  onCoreBasementFloorsChange: (values: number[]) => void;
  onCoreGroundFloorsChange: (values: number[]) => void;
  onCorePhFloorsChange: (values: number[]) => void;
  onCorePilotisCountsChange: (values: number[]) => void;
  onCorePilotisHeightsChange: (values: number[]) => void;
  onHasHighCeilingEquipmentRoomChange: (value: boolean) => void;
  onHeightsChange: (heights: Heights) => void;
  /** 저장 버튼 클릭 핸들러 (옵션) */
  onSave?: () => void;
  /** 저장 중 상태 (옵션) */
  isSaving?: boolean;
}

/**
 * 단위세대 구성 섹션
 *
 * 단위세대 패턴 추가/삭제, 코어별 층수 설정, 필로티 설정, 3단 비계 체크박스를 관리합니다.
 */
export function UnitTypePatternSection({
  unitTypePattern,
  basementCount,
  groundCount,
  phCount,
  coreBasementFloors,
  coreGroundFloors,
  corePhFloors,
  corePilotisCounts,
  corePilotisHeights,
  hasHighCeilingEquipmentRoom,
  totalUnitCount,
  heights,
  onUnitTypePatternChange,
  onBasementCountChange,
  onGroundCountChange,
  onPhCountChange,
  onCoreBasementFloorsChange,
  onCoreGroundFloorsChange,
  onCorePhFloorsChange,
  onCorePilotisCountsChange,
  onCorePilotisHeightsChange,
  onHasHighCeilingEquipmentRoomChange,
  onHeightsChange,
  onSave,
  isSaving = false,
}: UnitTypePatternSectionProps) {
  const MAX_CORES = 4;

  /**
   * 새 단위세대 패턴 추가 (코어 추가, 최대 4개)
   */
  const handleAddPattern = () => {
    if (unitTypePattern.length >= MAX_CORES) return;
    onUnitTypePatternChange([
      ...unitTypePattern,
      { unitCount: 1, type: '', coreNumber: unitTypePattern.length + 1 },
    ]);
  };

  /**
   * 단위세대 패턴 삭제 (코어 번호 재정렬)
   */
  const handleRemovePattern = (index: number) => {
    const filtered = unitTypePattern.filter((_, i) => i !== index);
    const renumbered = filtered.map((p, i) => ({ ...p, coreNumber: i + 1 }));
    onUnitTypePatternChange(renumbered);
  };

  /**
   * 단위세대 패턴 필드 업데이트
   */
  const handleUpdatePattern = (
    index: number,
    field: keyof UnitTypePattern,
    value: number | string
  ) => {
    const updated = [...unitTypePattern];
    updated[index] = { ...updated[index], [field]: value };
    onUnitTypePatternChange(updated);
  };

  return (
    <div className="space-y-4">
      {/* 헤더: 단위세대 구성 + 추가 버튼 */}
      <div className="flex items-center justify-between">
        <label className="block text-sm font-medium text-slate-700 dark:text-slate-300">
          단위세대 구성
        </label>
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={handleAddPattern}
          disabled={unitTypePattern.length >= MAX_CORES}
          className="gap-1"
        >
          <Plus className="w-3 h-3" />
          코어 추가 {unitTypePattern.length}/{MAX_CORES}
        </Button>
      </div>

      {/* 패턴 목록 */}
      <div className="space-y-2">
        {unitTypePattern.map((pattern, index) => {
          const coreIndex = index;
          const pilotisIndex = index;
          // 현재 코어의 층수 값들
          const currentBasementFloors = coreBasementFloors.length > coreIndex
            ? coreBasementFloors[coreIndex] ?? basementCount ?? 0
            : basementCount ?? 0;
          const currentGroundFloors = coreGroundFloors.length > coreIndex
            ? coreGroundFloors[coreIndex] ?? groundCount ?? 0
            : groundCount ?? 0;
          const currentPhFloors = corePhFloors.length > coreIndex
            ? corePhFloors[coreIndex] ?? phCount ?? 0
            : phCount ?? 0;
          const currentPilotisCount = corePilotisCounts.length > pilotisIndex
            ? corePilotisCounts[pilotisIndex] ?? 0
            : 0;
          const currentPilotisHeight = corePilotisHeights.length > pilotisIndex
            ? corePilotisHeights[pilotisIndex] ?? 0
            : 0;

          return (
            <div
              key={index}
              className="p-3 border border-slate-200 dark:border-slate-700 rounded-lg bg-slate-50/50 dark:bg-slate-800/50"
            >
              <div className="flex items-start gap-3">
                {/* 코어 번호 뱃지 */}
                <Badge variant="default" className="mt-2 whitespace-nowrap">
                  코어{index + 1}
                </Badge>

                {/* ━━━ 그룹 1: 호수 & 타입 정보 ━━━ */}
                <div className="flex items-center gap-2 px-3 py-2 bg-blue-50/50 dark:bg-blue-900/20 rounded-md border border-blue-100 dark:border-blue-800/30">
                  <span className="text-xs font-medium text-blue-600 dark:text-blue-400 whitespace-nowrap">호수</span>
                  <select
                    value={pattern.unitCount || 1}
                    onChange={(e) => handleUpdatePattern(index, 'unitCount', Number(e.target.value))}
                    className="w-16 px-2 py-1.5 border border-slate-200 dark:border-slate-700 rounded-md bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-primary-500 text-sm"
                  >
                    <option value={1}>1</option>
                    <option value={2}>2</option>
                    <option value={3}>3</option>
                  </select>
                  <span className="text-slate-500 text-sm">호</span>

                  <div className="w-px h-6 bg-blue-200 dark:bg-blue-700 mx-1" />

                  <span className="text-xs font-medium text-blue-600 dark:text-blue-400 whitespace-nowrap">타입</span>
                  <Input
                    type="text"
                    placeholder="59A"
                    value={pattern.type || ''}
                    onChange={(e) => handleUpdatePattern(index, 'type', e.target.value)}
                    className="w-[55px]"
                    style={{ width: '55px', minWidth: '55px', maxWidth: '55px' }}
                  />
                </div>

                {/* ━━━ 그룹 2: 층수 정보 ━━━ */}
                <div className="flex items-center gap-2 px-3 py-2 bg-green-50/50 dark:bg-green-900/20 rounded-md border border-green-100 dark:border-green-800/30">
                  <span className="text-xs font-medium text-green-600 dark:text-green-400 whitespace-nowrap">층수</span>

                  {/* 지하층 */}
                  <div className="flex flex-col items-center gap-0.5">
                    <Input
                      type="number"
                      placeholder="B"
                      min="0"
                      value={currentBasementFloors || ''}
                      onChange={(e) => {
                        const newValue = e.target.value === '' ? 0 : Number(e.target.value);
                        const newFloors = [...coreBasementFloors];
                        while (newFloors.length <= coreIndex) {
                          newFloors.push(basementCount ?? 0);
                        }
                        newFloors[coreIndex] = newValue;
                        onCoreBasementFloorsChange(newFloors);
                        if (coreIndex === 0) {
                          onBasementCountChange(newValue);
                        }
                      }}
                      className="w-14 text-xs text-center"
                      title="지하층 수"
                    />
                    <span className="text-[10px] text-green-600 dark:text-green-400">지하</span>
                  </div>

                  {/* 지상층 */}
                  <div className="flex flex-col items-center gap-0.5">
                    <Input
                      type="number"
                      placeholder="F"
                      min="0"
                      value={currentGroundFloors || ''}
                      onChange={(e) => {
                        const newValue = e.target.value === '' ? 0 : Number(e.target.value);
                        const newFloors = [...coreGroundFloors];
                        while (newFloors.length <= coreIndex) {
                          newFloors.push(groundCount ?? 0);
                        }
                        newFloors[coreIndex] = newValue;
                        onCoreGroundFloorsChange(newFloors);
                        if (coreIndex === 0) {
                          onGroundCountChange(newValue);
                        }
                      }}
                      className="w-14 text-xs text-center"
                      title="지상층 수"
                    />
                    <span className="text-[10px] text-green-600 dark:text-green-400">지상</span>
                  </div>

                  {/* 옥탑층 */}
                  <div className="flex flex-col items-center gap-0.5">
                    <Input
                      type="number"
                      placeholder="PH"
                      min="0"
                      value={currentPhFloors || ''}
                      onChange={(e) => {
                        const newValue = e.target.value === '' ? 0 : Number(e.target.value);
                        const newFloors = [...corePhFloors];
                        while (newFloors.length <= coreIndex) {
                          newFloors.push(phCount ?? 0);
                        }
                        newFloors[coreIndex] = newValue;
                        onCorePhFloorsChange(newFloors);
                        if (coreIndex === 0) {
                          onPhCountChange(newValue);
                          // PH층 수가 변경되면 heights.ph 배열도 업데이트
                          const currentPhHeights = Array.isArray(heights.ph)
                            ? heights.ph
                            : [heights.ph || 2650];
                          if (newValue > currentPhHeights.length) {
                            const newPhHeights = [
                              ...currentPhHeights,
                              ...Array(newValue - currentPhHeights.length).fill(2650),
                            ];
                            onHeightsChange({ ...heights, ph: newPhHeights });
                          } else if (newValue < currentPhHeights.length) {
                            const newPhHeights = currentPhHeights.slice(0, newValue);
                            onHeightsChange({ ...heights, ph: newPhHeights });
                          }
                        }
                      }}
                      className="w-14 text-xs text-center"
                      title="옥탑층 수"
                    />
                    <span className="text-[10px] text-green-600 dark:text-green-400">옥탑</span>
                  </div>
                </div>

                {/* ━━━ 그룹 3: 필로티 정보 ━━━ */}
                <div className="flex items-center gap-2 px-3 py-2 bg-amber-50/50 dark:bg-amber-900/20 rounded-md border border-amber-100 dark:border-amber-800/30">
                  <span className="text-xs font-medium text-amber-600 dark:text-amber-400 whitespace-nowrap">필로티</span>

                  {/* 필로티 부대시설 제외 세대수 */}
                  <div className="flex flex-col items-center gap-0.5">
                    <Input
                      type="number"
                      placeholder="0"
                      min="0"
                      value={currentPilotisCount || ''}
                      onChange={(e) => {
                        const newValue = e.target.value === '' ? 0 : Number(e.target.value);
                        const newCounts = [...corePilotisCounts];
                        while (newCounts.length <= pilotisIndex) {
                          newCounts.push(0);
                        }
                        newCounts[pilotisIndex] = newValue;
                        onCorePilotisCountsChange(newCounts);
                      }}
                      className="w-16 text-xs text-center"
                      title="필로티 부대시설 제외 세대수"
                    />
                    <span className="text-[10px] text-amber-600 dark:text-amber-400">제외세대</span>
                  </div>

                  {/* 필로티 층수 */}
                  <div className="flex flex-col items-center gap-0.5">
                    <Input
                      type="number"
                      placeholder="0"
                      min="0"
                      value={currentPilotisHeight || ''}
                      onChange={(e) => {
                        const newValue = e.target.value === '' ? 0 : Number(e.target.value);
                        const newHeights = [...corePilotisHeights];
                        while (newHeights.length <= pilotisIndex) {
                          newHeights.push(0);
                        }
                        newHeights[pilotisIndex] = newValue;
                        onCorePilotisHeightsChange(newHeights);
                      }}
                      className="w-16 text-xs text-center"
                      title="필로티 층수"
                    />
                    <span className="text-[10px] text-amber-600 dark:text-amber-400">층수</span>
                  </div>
                </div>

                {/* 삭제 버튼 */}
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={() => handleRemovePattern(index)}
                  className="text-red-500 hover:text-red-700 hover:bg-red-50 dark:hover:bg-red-900/20 ml-auto"
                >
                  <Trash2 className="w-4 h-4" />
                </Button>
              </div>
            </div>
          );
        })}

        {/* 빈 상태 메시지 */}
        {unitTypePattern.length === 0 && (
          <p className="text-sm text-slate-500 dark:text-slate-400 text-center py-4">
            코어를 추가해주세요. (최대 {MAX_CORES}개)
          </p>
        )}
      </div>

      {/* 세대수 카운트 및 3단 비계 체크박스 */}
      <div className="grid grid-cols-2 gap-4 pt-4 border-t border-slate-200 dark:border-slate-800">
        <div>
          <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
            세대수 카운트
          </label>
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-2">
              <Input
                type="number"
                value={totalUnitCount}
                disabled
                className="w-[100px] text-center bg-slate-100 dark:bg-slate-800"
              />
              <Badge variant="info" className="whitespace-nowrap">
                {totalUnitCount} 세대
              </Badge>
            </div>

            <div className="flex items-center gap-2">
              <input
                type="checkbox"
                id="hasHighCeilingEquipmentRoom"
                checked={hasHighCeilingEquipmentRoom}
                onChange={(e) => onHasHighCeilingEquipmentRoomChange(e.target.checked)}
                className="w-4 h-4 text-primary-600 bg-white border-slate-300 rounded focus:ring-primary-500 focus:ring-2 dark:bg-slate-800 dark:border-slate-600"
              />
              <label
                htmlFor="hasHighCeilingEquipmentRoom"
                className="text-sm text-slate-700 dark:text-slate-300 cursor-pointer"
                style={{ width: 'auto', minWidth: '350px', whiteSpace: 'nowrap' }}
              >
                3단 가시설 적용 (동하부 혹은 측면 펌프실, 전기실 등)
              </label>
              <button
                type="button"
                className="text-slate-400 hover:text-slate-600"
                title="고천장 장비실이 있는 경우 3단 비계를 적용합니다"
              >
                <HelpCircle className="w-4 h-4" />
              </button>
            </div>
          </div>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
            단위세대 패턴에서 자동 계산됩니다.
          </p>
        </div>
      </div>

      {/* 저장 버튼 */}
      {onSave && (
        <div className="flex items-center justify-end gap-3 pt-4 border-t border-slate-200 dark:border-slate-800">
          <p className="text-sm text-slate-500 dark:text-slate-400">
            단위세대 구성을 저장합니다. (층 재생성 없음)
          </p>
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={onSave}
            disabled={isSaving || unitTypePattern.length === 0}
            className="gap-2"
          >
            <Save className="w-4 h-4" />
            {isSaving ? '저장 중...' : '구성 저장'}
          </Button>
        </div>
      )}
    </div>
  );
}

UnitTypePatternSection.displayName = 'UnitTypePatternSection';
