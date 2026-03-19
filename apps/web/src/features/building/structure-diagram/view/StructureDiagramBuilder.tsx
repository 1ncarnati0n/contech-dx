'use client';

import { useCallback } from 'react';
import { Button, Badge, Input } from '@/shared/components/ui';
import { Plus, Minus, Save, HelpCircle } from 'lucide-react';
import { useStructureDiagram } from '../service/useStructureDiagram';
import { CoreConfigPanel } from './CoreConfigPanel';
import { StructureGrid } from './StructureGrid';
import { StructureLegend } from './StructureLegend';
import type { CoreStructure } from '../types';

interface StructureDiagramBuilderProps {
  initialCores?: CoreStructure[];
  onChange?: (cores: CoreStructure[]) => void;
  /** 코어별 단위세대 타입 (예: ["59A", "84A"]) */
  unitTypes: string[];
  onUnitTypeChange: (coreId: number, type: string) => void;
  /** 총 세대수 */
  totalUnitCount: number;
  /** 3단 비계 */
  hasHighCeilingEquipmentRoom: boolean;
  onHasHighCeilingEquipmentRoomChange: (value: boolean) => void;
  /** 구성 저장 (층 재생성 없음) */
  onSaveConfig?: () => void;
  /** 층정보 생성 (층 재생성) */
  onSaveGenerate?: () => void;
  isSaving?: boolean;
}

const MAX_CORES = 4;

export function StructureDiagramBuilder({
  initialCores,
  onChange,
  unitTypes,
  onUnitTypeChange,
  totalUnitCount,
  hasHighCeilingEquipmentRoom,
  onHasHighCeilingEquipmentRoomChange,
  onSaveConfig,
  onSaveGenerate,
  isSaving = false,
}: StructureDiagramBuilderProps) {
  const {
    cores,
    gridData,
    setCoreCount,
    updateCore,
  } = useStructureDiagram({ initialCores, onChange });

  const handleUnitTypeChange = useCallback((coreId: number, type: string) => {
    onUnitTypeChange(coreId, type);
  }, [onUnitTypeChange]);

  return (
    <div className="space-y-6">
      {/* 코어 구성 */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <h4 className="text-sm font-semibold text-slate-700 dark:text-slate-300">
            코어 구성
          </h4>
          <div className="flex items-center gap-2">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => setCoreCount(cores.length - 1)}
              disabled={cores.length <= 1}
              className="w-8 h-8 p-0"
            >
              <Minus className="w-3 h-3" />
            </Button>
            <Badge variant="info" className="min-w-[60px] justify-center">
              {cores.length}개 코어
            </Badge>
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => setCoreCount(cores.length + 1)}
              disabled={cores.length >= MAX_CORES}
              className="w-8 h-8 p-0"
            >
              <Plus className="w-3 h-3" />
            </Button>
          </div>
        </div>

        {/* 코어별 설정 */}
        <div className="space-y-2">
          {cores.map((core, index) => (
            <CoreConfigPanel
              key={core.id}
              core={core}
              unitType={unitTypes[index] ?? ''}
              onUpdate={updateCore}
              onUnitTypeChange={handleUnitTypeChange}
            />
          ))}
        </div>
      </div>

      {/* 세대수 & 3단 비계 */}
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
                className="text-sm text-slate-700 dark:text-slate-300 cursor-pointer whitespace-nowrap"
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
        </div>
      </div>

      {/* 구성 저장 */}
      {onSaveConfig && (
        <div className="flex items-center justify-end gap-3 pt-4 border-t border-slate-200 dark:border-slate-800">
          <p className="text-sm text-slate-500 dark:text-slate-400">
            골구조도 구성을 저장합니다. (층 재생성 없음)
          </p>
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={onSaveConfig}
            disabled={isSaving || cores.length === 0}
            className="gap-2"
          >
            <Save className="w-4 h-4" />
            {isSaving ? '저장 중...' : '구성 저장'}
          </Button>
        </div>
      )}

      {/* 골구조도 미리보기 */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <h4 className="text-sm font-semibold text-slate-700 dark:text-slate-300">
            골구조도 미리보기
          </h4>
          <StructureLegend />
        </div>

        <div className="border border-slate-200 dark:border-slate-700 rounded-lg p-4 bg-white dark:bg-slate-900">
          <StructureGrid gridData={gridData} />
        </div>
      </div>

      {/* 층정보 생성 */}
      {onSaveGenerate && (
        <div className="flex items-center justify-end gap-3 pt-4 border-t border-slate-200 dark:border-slate-800">
          <p className="text-sm text-amber-600 dark:text-amber-400 flex items-center gap-1">
            <span className="inline-block w-1.5 h-1.5 bg-amber-500 rounded-full animate-pulse" />
            층정보 재생성시 물량 재입력이 필요합니다.
          </p>
          <Button
            variant="primary"
            size="sm"
            onClick={onSaveGenerate}
            disabled={isSaving}
            className="gap-2"
          >
            <Save className="w-4 h-4" />
            {isSaving ? '생성 중...' : '층정보 생성'}
          </Button>
        </div>
      )}
    </div>
  );
}
