'use client';

import { useCallback, useMemo } from 'react';
import { Card, CardHeader, CardTitle, CardContent, Badge } from '@/shared/components/ui';
import type { Building } from '@/shared/types';
import { Building2 } from 'lucide-react';

import { StructureInfoSection, FloorHeightSection } from './sections';
import { useBuildingAutoCalculations } from '../service/useBuildingAutoCalculations';
import { useBuildingFormState } from '../service/useBuildingFormState';
import { useBuildingAutoSave } from '../service/useBuildingAutoSave';
import { useBuildingSave } from '../service/useBuildingSave';
import { StructureDiagramBuilder } from '../../structure-diagram/view/StructureDiagramBuilder';
import { buildingMetaToCores } from '../../structure-diagram/service/convertCoreStructure';
import type { CoreStructure } from '../../structure-diagram/types';

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
 * 1. 구조 정보 - 코어 타입, 구조형식
 * 2. 골구조도 - 코어/세대/층수/필로티 설정 + 실시간 미리보기 + 저장
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

  // 폼 상태 관리 (단일 formData 객체)
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

  // 수동 저장 (층정보 생성 / 구성 저장)
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

  // 골구조도 초기 데이터 (building.meta → CoreStructure[])
  const initialCores = useMemo(() => {
    if (!building?.meta) return undefined;
    return buildingMetaToCores(building.meta);
  }, [building?.id]); // eslint-disable-line react-hooks/exhaustive-deps

  // 코어별 단위세대 타입 배열
  const unitTypes = useMemo(() =>
    formData.unitTypePattern.map(p => p.type || ''),
    [formData.unitTypePattern],
  );

  // 골구조도 변경 → formData 동기화
  const handleCoresChange = useCallback((cores: CoreStructure[]) => {
    const coreCount = cores.length;

    // unitTypePattern 동기화 (기존 type 보존)
    const newPatterns = cores.map((core, i) => ({
      unitCount: core.unitsLeft + core.unitsRight,
      type: formData.unitTypePattern[i]?.type ?? '',
      coreNumber: core.id,
    }));
    updateField('unitTypePattern', newPatterns);

    // 코어 개수
    updateField('coreCount', coreCount);

    // 층수 배열
    updateField('coreGroundFloors', cores.map(c => c.groundFloors));
    updateField('coreBasementFloors', cores.map(c => c.basementFloors));
    updateField('corePhFloors', cores.map(c => c.rooftopFloors));

    // 대표 값 (코어1 기준)
    updateField('groundCount', cores[0]?.groundFloors ?? 0);
    updateField('basementCount', cores[0]?.basementFloors ?? 0);
    updateField('phCount', cores[0]?.rooftopFloors ?? 0);

    // 필로티
    updateField('corePilotisCounts', cores.map(c =>
      c.piloti ? c.piloti.excludeUnits.length : 0
    ));
    updateField('corePilotisHeights', cores.map(c =>
      c.piloti ? c.piloti.floor : 0
    ));
  }, [formData.unitTypePattern, updateField]);

  // 단위세대 타입 변경
  const handleUnitTypeChange = useCallback((coreId: number, type: string) => {
    const newPatterns = formData.unitTypePattern.map((p, i) =>
      i === coreId - 1 ? { ...p, type } : p
    );
    updateField('unitTypePattern', newPatterns);
  }, [formData.unitTypePattern, updateField]);

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

        {/* 섹션 2: 골구조도 (단위세대 구성 대체) */}
        <div className="space-y-4">
          <div className="flex items-center gap-2">
            <h3 className="text-lg font-semibold text-slate-900 dark:text-white">골구조도</h3>
            {formTotalUnitCount > 0 && <Badge variant="info">{formTotalUnitCount} 세대</Badge>}
          </div>
          <StructureDiagramBuilder
            initialCores={initialCores}
            onChange={handleCoresChange}
            unitTypes={unitTypes}
            onUnitTypeChange={handleUnitTypeChange}
            totalUnitCount={formTotalUnitCount}
            hasHighCeilingEquipmentRoom={formData.hasHighCeilingEquipmentRoom}
            onHasHighCeilingEquipmentRoomChange={(v) => updateField('hasHighCeilingEquipmentRoom', v)}
            onSaveConfig={handleSaveUnitType}
            onSaveGenerate={handleSave}
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
      </CardContent>
    </Card>
  );
}

BuildingBasicInfo.displayName = 'BuildingBasicInfo';
