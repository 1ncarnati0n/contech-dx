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

  // 코어별 세대 타입 배열 (2차원)
  const coreUnitTypes = useMemo(() =>
    formData.unitTypePattern.map(p => {
      if (p.unitTypes && p.unitTypes.length > 0) return p.unitTypes;
      return p.type ? [p.type] : [''];
    }),
    [formData.unitTypePattern],
  );

  // 골구조도 변경 → formData 동기화
  const handleCoresChange = useCallback((cores: CoreStructure[]) => {
    const coreCount = cores.length;

    // unitTypePattern 동기화 (기존 unitTypes 보존, 세대수에 맞춤)
    const newPatterns = cores.map((core, i) => {
      const existing = formData.unitTypePattern[i];
      const prevTypes = existing?.unitTypes && existing.unitTypes.length > 0
        ? existing.unitTypes
        : existing?.type ? [existing.type] : [''];
      const totalUnits = core.unitsLeft + core.unitsRight;
      const unitTypes = Array.from({ length: totalUnits }, (_, j) => prevTypes[j] ?? '');
      return {
        unitCount: totalUnits,
        type: unitTypes[0] ?? '',
        unitTypes,
        coreNumber: core.id,
      };
    });
    updateField('unitTypePattern', newPatterns);

    // 코어 개수
    updateField('coreCount', coreCount);

    // 층수 배열
    updateField('coreGroundFloors', cores.map(c => c.groundFloors));
    updateField('coreBasementFloors', cores.map(c => c.basementFloors));
    updateField('corePhFloors', cores.map(c => c.rooftopFloors));

    // 대표 값 (가장 높은 코어 기준)
    updateField('groundCount', Math.max(...cores.map(c => c.groundFloors), 0));
    updateField('basementCount', Math.max(...cores.map(c => c.basementFloors), 0));
    updateField('phCount', Math.max(...cores.map(c => c.rooftopFloors), 0));

    // 필로티
    updateField('corePilotisCounts', cores.map(c =>
      c.piloti ? c.piloti.excludeUnits.length : 0
    ));
    updateField('corePilotisHeights', cores.map(c =>
      c.piloti ? c.piloti.floor : 0
    ));

    // 3단 가시설
    updateField('scaffoldingColumns', cores.map(c =>
      c.scaffolding?.columns ?? []
    ));
  }, [formData.unitTypePattern, updateField]);

  // 세대별 타입 변경
  const handleCoreUnitTypesChange = useCallback((coreId: number, types: string[]) => {
    const newPatterns = formData.unitTypePattern.map((p, i) =>
      i === coreId - 1
        ? { ...p, type: types[0] ?? '', unitTypes: types }
        : p
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
            coreUnitTypes={coreUnitTypes}
            onCoreUnitTypesChange={handleCoreUnitTypesChange}
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
            basementCount={formData.basementCount}
            onHeightsChange={updateHeights}
          />
        </div>
      </CardContent>
    </Card>
  );
}

BuildingBasicInfo.displayName = 'BuildingBasicInfo';
