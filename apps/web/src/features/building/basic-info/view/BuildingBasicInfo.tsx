'use client';

import { Card, CardHeader, CardTitle, CardContent, Button, Badge } from '@/shared/components/ui';
import type { Building } from '@/shared/types';
import { Save, Building2 } from 'lucide-react';

import { StructureInfoSection, UnitTypePatternSection, FloorHeightSection } from './sections';
import { useBuildingAutoCalculations } from '../service/useBuildingAutoCalculations';
import { useBuildingFormState } from '../service/useBuildingFormState';
import { useBuildingAutoSave } from '../service/useBuildingAutoSave';
import { useBuildingSave } from '../service/useBuildingSave';

interface BuildingBasicInfoProps {
  building: Building;
  onUpdate: () => void;
  isFirstBuilding?: boolean;
  onStartGeneration?: () => void;
  onGenerationProgress?: (progress: number, message: string) => void;
  onGenerationComplete?: () => void;
  onBeforeRegenerate?: () => Promise<void>;
}

/**
 * 빌딩 기본정보 컴포넌트
 *
 * 3개 섹션으로 구분:
 * 1. 구조 정보 - 코어 개수/타입, 구조형식
 * 2. 단위세대 구성 - 패턴 추가/삭제, 층수 설정, 필로티 설정
 * 3. 층고 설정 - 지하/지상/옥탑층 층고 입력
 */
export function BuildingBasicInfo({
  building,
  onUpdate,
  onStartGeneration,
  onGenerationProgress,
  onGenerationComplete,
  onBeforeRegenerate,
}: BuildingBasicInfoProps) {
  // 자동 계산은 building prop 기반으로 먼저 계산 (초기 calculatedCoreCount 확보)
  const { calculatedCoreCount: initialCoreCount } = useBuildingAutoCalculations({
    unitTypePattern: building?.meta?.unitTypePattern || [],
    groundCount: building?.meta?.floorCount?.ground || 0,
    coreGroundFloors: building?.meta?.floorCount?.coreGroundFloors || [],
    pilotisCount: building?.meta?.floorCount?.pilotisCount || 0,
    corePilotisCounts: building?.meta?.floorCount?.corePilotisCounts || [],
    corePilotisHeights: building?.meta?.floorCount?.corePilotisHeights || [],
  });

  // 폼 상태 관리 (18개 useState → 단일 formData 객체)
  const { formData, updateField, updateHeights } = useBuildingFormState(building, initialCoreCount);

  // formData 기반 자동 계산 (폼 변경 반영)
  const { totalUnitCount: formTotalUnitCount } = useBuildingAutoCalculations({
    unitTypePattern: formData.unitTypePattern,
    groundCount: formData.groundCount,
    coreGroundFloors: formData.coreGroundFloors,
    pilotisCount: formData.pilotisCount,
    corePilotisCounts: formData.corePilotisCounts,
    corePilotisHeights: formData.corePilotisHeights,
  });

  // 자동 저장 (디바운스 500ms)
  const { isSaving: isAutoSaving } = useBuildingAutoSave({
    building,
    formData,
    totalUnitCount: formTotalUnitCount,
    onUpdate,
  });

  // 수동 저장 (층정보 생성 / 단위세대 저장)
  const { handleSave, handleSaveUnitType, isSaving: isManualSaving } = useBuildingSave({
    building,
    formData,
    totalUnitCount: formTotalUnitCount,
    onUpdate,
    onStartGeneration,
    onGenerationProgress,
    onGenerationComplete,
    onBeforeRegenerate,
  });

  const isSaving = isAutoSaving || isManualSaving;

  if (!building || !building.meta) {
    return <div className="p-4 text-red-500">Building data is missing</div>;
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Building2 className="w-5 h-5" />
          동 기본 정보
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* 섹션 1: 구조 정보 */}
        <div className="space-y-4">
          <div className="flex items-center gap-2">
            <h3 className="text-lg font-semibold text-slate-900 dark:text-white">구조 정보</h3>
            {formData.coreCount > 0 && <Badge variant="info">{formData.coreCount}개 코어</Badge>}
          </div>
          <StructureInfoSection
            coreCount={formData.coreCount}
            coreType={formData.coreType}
            slabType={formData.slabType}
            onCoreTypeChange={(v) => updateField('coreType', v)}
            onSlabTypeChange={(v) => updateField('slabType', v)}
          />
        </div>

        {/* 섹션 2: 단위세대 구성 */}
        <div className="space-y-4">
          <div className="flex items-center gap-2">
            <h3 className="text-lg font-semibold text-slate-900 dark:text-white">단위세대 구성</h3>
            {formTotalUnitCount > 0 && <Badge variant="info">{formTotalUnitCount} 세대</Badge>}
          </div>
          <UnitTypePatternSection
            unitTypePattern={formData.unitTypePattern}
            basementCount={formData.basementCount}
            groundCount={formData.groundCount}
            phCount={formData.phCount}
            coreBasementFloors={formData.coreBasementFloors}
            coreGroundFloors={formData.coreGroundFloors}
            corePhFloors={formData.corePhFloors}
            corePilotisCounts={formData.corePilotisCounts}
            corePilotisHeights={formData.corePilotisHeights}
            hasHighCeilingEquipmentRoom={formData.hasHighCeilingEquipmentRoom}
            totalUnitCount={formTotalUnitCount}
            heights={formData.heights}
            onUnitTypePatternChange={(v) => updateField('unitTypePattern', v)}
            onBasementCountChange={(v) => updateField('basementCount', v)}
            onGroundCountChange={(v) => updateField('groundCount', v)}
            onPhCountChange={(v) => updateField('phCount', v)}
            onCoreBasementFloorsChange={(v) => updateField('coreBasementFloors', v)}
            onCoreGroundFloorsChange={(v) => updateField('coreGroundFloors', v)}
            onCorePhFloorsChange={(v) => updateField('corePhFloors', v)}
            onCorePilotisCountsChange={(v) => updateField('corePilotisCounts', v)}
            onCorePilotisHeightsChange={(v) => updateField('corePilotisHeights', v)}
            onHasHighCeilingEquipmentRoomChange={(v) => updateField('hasHighCeilingEquipmentRoom', v)}
            onHeightsChange={updateHeights}
            onSave={handleSaveUnitType}
            isSaving={isSaving}
          />
        </div>

        {/* 섹션 3: 층고 설정 */}
        <div className="space-y-4">
          <h3 className="text-lg font-semibold text-slate-900 dark:text-white">기준 층고 설정</h3>
          <FloorHeightSection
            heights={formData.heights}
            phCount={formData.phCount}
            onHeightsChange={updateHeights}
          />
        </div>

        {/* 저장 버튼 */}
        <div className="flex items-center justify-end gap-3 pt-4 border-t border-slate-200 dark:border-slate-800">
          <p className="text-sm text-amber-600 dark:text-amber-400 flex items-center gap-1">
            <span className="inline-block w-1.5 h-1.5 bg-amber-500 rounded-full animate-pulse" />
            층정보 재생성시 물량 재입력이 필요합니다.
          </p>
          <Button
            variant="primary"
            size="sm"
            onClick={handleSave}
            disabled={isSaving}
            className="gap-2"
          >
            <Save className="w-4 h-4" />
            {isSaving ? '생성 중...' : '층정보 생성'}
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}

BuildingBasicInfo.displayName = 'BuildingBasicInfo';
