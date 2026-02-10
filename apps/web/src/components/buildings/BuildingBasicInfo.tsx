'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import { Card, CardHeader, CardTitle, CardContent, Button, Badge } from '@/components/ui';
import type { Building, CoreType, SlabType, UnitTypePattern } from '@/lib/types';
import { updateBuilding, getBuildings } from '@/lib/services/buildings';
import { toast } from 'sonner';
import { Save, Building2 } from 'lucide-react';
import { logger } from '@/lib/utils/logger';

// 섹션 컴포넌트 import
import { StructureInfoSection, UnitTypePatternSection, FloorHeightSection } from './sections';
import { useBuildingAutoCalculations } from './hooks';

interface Props {
  building: Building;
  onUpdate: () => void;
}

interface BuildingBasicInfoProps extends Props {
  isFirstBuilding?: boolean;
  onStartGeneration?: () => void;
  onGenerationProgress?: (progress: number, message: string) => void;
  onGenerationComplete?: () => void;
  onBeforeRegenerate?: () => Promise<void>;
}

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

/**
 * 빌딩 기본정보 컴포넌트
 *
 * CollapsibleSection을 사용하여 3개 섹션으로 구분:
 * 1. 구조 정보 - 코어 개수/타입, 구조형식
 * 2. 단위세대 구성 - 패턴 추가/삭제, 층수 설정, 필로티 설정
 * 3. 층고 설정 - 지하/지상/옥탑층 층고 입력
 */
export function BuildingBasicInfo({
  building,
  onUpdate,
  isFirstBuilding = false,
  onStartGeneration,
  onGenerationProgress,
  onGenerationComplete,
  onBeforeRegenerate,
}: BuildingBasicInfoProps) {
  void isFirstBuilding;
  // ============================================
  // State 관리
  // ============================================
  const [buildingName, setBuildingName] = useState(building?.buildingName || '');
  const [coreCount, setCoreCount] = useState(building?.meta?.coreCount || 0);
  const [coreType, setCoreType] = useState<CoreType>(building?.meta?.coreType || '중복도(판상형)');
  const [slabType, setSlabType] = useState<SlabType>(building?.meta?.slabType || '벽식구조');
  const [basementCount, setBasementCount] = useState(building?.meta?.floorCount?.basement || 0);
  const [groundCount, setGroundCount] = useState(building?.meta?.floorCount?.ground || 0);
  const [phCount, setPhCount] = useState(building?.meta?.floorCount?.ph || 0);
  const [coreGroundFloors, setCoreGroundFloors] = useState<number[]>(
    building?.meta?.floorCount?.coreGroundFloors || []
  );
  const [coreBasementFloors, setCoreBasementFloors] = useState<number[]>(
    building?.meta?.floorCount?.coreBasementFloors || []
  );
  const [corePhFloors, setCorePhFloors] = useState<number[]>(
    building?.meta?.floorCount?.corePhFloors || []
  );
  const [pilotisCount, setPilotisCount] = useState(building?.meta?.floorCount?.pilotisCount || 0);
  const [corePilotisCounts, setCorePilotisCounts] = useState<number[]>(
    building?.meta?.floorCount?.corePilotisCounts || []
  );
  const [corePilotisHeights, setCorePilotisHeights] = useState<number[]>(
    building?.meta?.floorCount?.corePilotisHeights || []
  );
  const [hasHighCeilingEquipmentRoom, setHasHighCeilingEquipmentRoom] = useState(
    building?.meta?.floorCount?.hasHighCeilingEquipmentRoom || false
  );
  const [unitTypePattern, setUnitTypePattern] = useState<UnitTypePattern[]>(
    building?.meta?.unitTypePattern || []
  );

  // 층고 상태
  const initialPhHeights = Array.isArray(building?.meta?.heights?.ph)
    ? building?.meta?.heights?.ph
    : (building?.meta?.floorCount?.ph || 0) > 0
      ? Array(building?.meta?.floorCount?.ph || 0).fill(building?.meta?.heights?.ph || 2650)
      : [2650];

  const [heights, setHeights] = useState<Heights>({
    basement2: building?.meta?.heights?.basement2 || 3500,
    basement1: building?.meta?.heights?.basement1 || 5400,
    standard: building?.meta?.heights?.standard || 2850,
    floor1: building?.meta?.heights?.floor1 || 3050,
    floor2: building?.meta?.heights?.floor2 || 2850,
    floor3: building?.meta?.heights?.floor3 || 2850,
    floor4: building?.meta?.heights?.floor4 || 2850,
    floor5: building?.meta?.heights?.floor5 || 2850,
    top: building?.meta?.heights?.top || 3050,
    ph: initialPhHeights,
  });

  const [standardFloorCycle, setStandardFloorCycle] = useState(
    building?.meta?.standardFloorCycle || 0
  );
  const [isSaving, setIsSaving] = useState(false);

  // Refs
  const saveTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const isInitialMountRef = useRef(true);
  const buildingNotFoundRef = useRef(false);
  const prevValuesRef = useRef({
    buildingName: building?.buildingName || '',
    coreType: building?.meta?.coreType || '중복도(판상형)',
    slabType: building?.meta?.slabType || '벽식구조',
    unitTypePattern: building?.meta?.unitTypePattern || [],
    basementCount: building?.meta?.floorCount?.basement || 0,
    groundCount: building?.meta?.floorCount?.ground || 0,
    coreGroundFloors: building?.meta?.floorCount?.coreGroundFloors || [],
    coreBasementFloors: building?.meta?.floorCount?.coreBasementFloors || [],
    corePhFloors: building?.meta?.floorCount?.corePhFloors || [],
    phCount: building?.meta?.floorCount?.ph || 0,
    pilotisCount: building?.meta?.floorCount?.pilotisCount || 0,
    corePilotisCounts: building?.meta?.floorCount?.corePilotisCounts || [],
    corePilotisHeights: building?.meta?.floorCount?.corePilotisHeights || [],
    hasHighCeilingEquipmentRoom: building?.meta?.floorCount?.hasHighCeilingEquipmentRoom || false,
    heights: building?.meta?.heights || {},
    standardFloorCycle: building?.meta?.standardFloorCycle || 0,
  });

  // ============================================
  // 자동 계산 훅 사용
  // ============================================
  const { calculatedCoreCount, totalUnitCount } = useBuildingAutoCalculations({
    unitTypePattern,
    groundCount,
    coreGroundFloors,
    pilotisCount,
    corePilotisCounts,
    corePilotisHeights,
  });

  // ============================================
  // Effects
  // ============================================

  // 코어 개수 변경 시 coreGroundFloors 배열 초기화
  useEffect(() => {
    if (coreCount > 1) {
      const currentCoreGroundFloors = [...coreGroundFloors];
      if (currentCoreGroundFloors.length < coreCount) {
        while (currentCoreGroundFloors.length < coreCount) {
          currentCoreGroundFloors.push(groundCount || 0);
        }
        setCoreGroundFloors(currentCoreGroundFloors);
      } else if (currentCoreGroundFloors.length > coreCount) {
        setCoreGroundFloors(currentCoreGroundFloors.slice(0, coreCount));
      }
    } else {
      if (coreGroundFloors.length > 0) {
        setCoreGroundFloors([]);
      }
    }
  }, [coreCount, coreGroundFloors, groundCount]);

  // 단위세대 구성 변경 시 코어개수 자동 업데이트
  useEffect(() => {
    if (unitTypePattern.length > 0 && calculatedCoreCount !== coreCount) {
      setCoreCount(calculatedCoreCount);
    }
  }, [calculatedCoreCount, coreCount, unitTypePattern.length]);

  // building prop 변경 시 상태 동기화
  useEffect(() => {
    if (!building || !building.meta) {
      return;
    }
    try {
      setBuildingName(building.buildingName);
      setCoreCount(building.meta.coreCount || 0);
      setCoreType(building.meta.coreType || '중복도(판상형)');
      setSlabType(building.meta.slabType || '벽식구조');
      setBasementCount(building.meta.floorCount.basement);
      setGroundCount(building.meta.floorCount.ground);
      setCoreGroundFloors(building.meta.floorCount.coreGroundFloors || []);
      setCoreBasementFloors(building.meta.floorCount.coreBasementFloors || []);
      setCorePhFloors(building.meta.floorCount.corePhFloors || []);
      setPhCount(building.meta.floorCount.ph);
      setPilotisCount(building.meta.floorCount.pilotisCount || 0);
      setCorePilotisCounts(building.meta.floorCount.corePilotisCounts || []);
      setCorePilotisHeights(building.meta.floorCount.corePilotisHeights || []);
      setHasHighCeilingEquipmentRoom(building.meta.floorCount.hasHighCeilingEquipmentRoom || false);
      setUnitTypePattern(building.meta.unitTypePattern || []);
      setStandardFloorCycle(building.meta.standardFloorCycle || 0);

      const phHeights = Array.isArray(building.meta.heights.ph)
        ? building.meta.heights.ph
        : building.meta.floorCount.ph > 0
          ? Array(building.meta.floorCount.ph).fill(building.meta.heights.ph || 2650)
          : [2650];

      setHeights({
        basement2: building.meta.heights.basement2 || 3500,
        basement1: building.meta.heights.basement1 || 5400,
        standard: building.meta.heights.standard || 2850,
        floor1: building.meta.heights.floor1 || 3050,
        floor2: building.meta.heights.floor2 || 2850,
        floor3: building.meta.heights.floor3 || 2850,
        floor4: building.meta.heights.floor4 || 2850,
        floor5: building.meta.heights.floor5 || 2850,
        top: building.meta.heights.top || 3050,
        ph: phHeights,
      });

      // prevValuesRef 업데이트
      prevValuesRef.current = {
        buildingName: building.buildingName,
        coreType: building.meta.coreType || '중복도(판상형)',
        slabType: building.meta.slabType || '벽식구조',
        unitTypePattern: building.meta.unitTypePattern || [],
        basementCount: building.meta.floorCount.basement,
        groundCount: building.meta.floorCount.ground,
        coreGroundFloors: building.meta.floorCount.coreGroundFloors || [],
        coreBasementFloors: building.meta.floorCount.coreBasementFloors || [],
        corePhFloors: building.meta.floorCount.corePhFloors || [],
        phCount: building.meta.floorCount.ph,
        pilotisCount: building.meta.floorCount.pilotisCount || 0,
        corePilotisCounts: building.meta.floorCount.corePilotisCounts || [],
        corePilotisHeights: building.meta.floorCount.corePilotisHeights || [],
        hasHighCeilingEquipmentRoom: building.meta.floorCount.hasHighCeilingEquipmentRoom || false,
        heights: building.meta.heights,
        standardFloorCycle: building.meta.standardFloorCycle || 0,
      };
      isInitialMountRef.current = true;
      buildingNotFoundRef.current = false;
    } catch (error) {
      logger.error('Error syncing building data:', error);
    }
  }, [building]);

  // 컴포넌트 언마운트 시 타이머 정리
  useEffect(() => {
    return () => {
      if (saveTimeoutRef.current) {
        clearTimeout(saveTimeoutRef.current);
      }
    };
  }, []);

  // ============================================
  // 자동 저장 함수
  // ============================================
  const autoSave = useCallback(async () => {
    if (isInitialMountRef.current) {
      isInitialMountRef.current = false;
      return;
    }

    if (buildingNotFoundRef.current) {
      return;
    }

    if (!building || !building.id || !building.projectId) {
      logger.error('Invalid building data:', building);
      buildingNotFoundRef.current = true;
      return;
    }

    if (saveTimeoutRef.current) {
      clearTimeout(saveTimeoutRef.current);
    }

    saveTimeoutRef.current = setTimeout(async () => {
      setIsSaving(true);

      try {
        const meta = {
          totalUnits: totalUnitCount,
          coreCount,
          coreType,
          slabType,
          unitTypePattern,
          floorCount: {
            ...building.meta.floorCount,
            corePilotisCounts: corePilotisCounts.length > 0 ? corePilotisCounts : undefined,
            corePilotisHeights: corePilotisHeights.length > 0 ? corePilotisHeights : undefined,
            hasHighCeilingEquipmentRoom,
          },
          heights,
          standardFloorCycle,
        };

        if (!building.id || !building.projectId) {
          logger.warn('Building ID or Project ID is missing, skipping save');
          setIsSaving(false);
          return;
        }

        let latestBuildings = await getBuildings(building.projectId);
        let latestBuilding = latestBuildings.find(b => b.id === building.id);

        if (!latestBuilding) {
          logger.warn('Building not found in store, attempting to reload...');
          try {
            await onUpdate();
            latestBuildings = await getBuildings(building.projectId);
            latestBuilding = latestBuildings.find(b => b.id === building.id);
          } catch (error) {
            logger.error('Failed to reload buildings:', error);
          }
        }

        if (!latestBuilding) {
          const wasNotFound = buildingNotFoundRef.current;
          buildingNotFoundRef.current = true;

          if (!wasNotFound) {
            logger.error('Building not found after reload, skipping save');
            toast.error('동 정보를 찾을 수 없어 저장하지 못했습니다. 페이지를 새로고침해주세요.');
          }

          setIsSaving(false);
          return;
        }

        buildingNotFoundRef.current = false;

        await updateBuilding(latestBuilding.id, latestBuilding.projectId, {
          buildingName,
          meta,
        });
      } catch (error) {
        logger.error('Building save error:', error);
        toast.error('저장에 실패했습니다.', {
          description: error instanceof Error ? error.message : '알 수 없는 오류가 발생했습니다.',
        });
      } finally {
        setIsSaving(false);
      }
    }, 500);
  }, [
    building,
    buildingName,
    totalUnitCount,
    coreCount,
    coreType,
    slabType,
    unitTypePattern,
    corePilotisCounts,
    corePilotisHeights,
    hasHighCeilingEquipmentRoom,
    heights,
    standardFloorCycle,
    onUpdate,
  ]);

  // 값 변경 감지 및 자동 저장
  useEffect(() => {
    const prev = prevValuesRef.current;
    const hasChanged =
      buildingName !== prev.buildingName ||
      coreType !== prev.coreType ||
      slabType !== prev.slabType ||
      JSON.stringify(unitTypePattern) !== JSON.stringify(prev.unitTypePattern) ||
      basementCount !== prev.basementCount ||
      groundCount !== prev.groundCount ||
      JSON.stringify(coreGroundFloors) !== JSON.stringify(prev.coreGroundFloors) ||
      JSON.stringify(coreBasementFloors) !== JSON.stringify(prev.coreBasementFloors) ||
      JSON.stringify(corePhFloors) !== JSON.stringify(prev.corePhFloors) ||
      phCount !== prev.phCount ||
      pilotisCount !== prev.pilotisCount ||
      JSON.stringify(corePilotisCounts) !== JSON.stringify(prev.corePilotisCounts) ||
      JSON.stringify(corePilotisHeights) !== JSON.stringify(prev.corePilotisHeights) ||
      hasHighCeilingEquipmentRoom !== prev.hasHighCeilingEquipmentRoom ||
      standardFloorCycle !== prev.standardFloorCycle;

    if (hasChanged) {
      prevValuesRef.current = {
        buildingName,
        coreType,
        slabType,
        unitTypePattern,
        basementCount,
        groundCount,
        coreGroundFloors,
        coreBasementFloors,
        corePhFloors,
        phCount,
        pilotisCount,
        corePilotisCounts,
        corePilotisHeights,
        hasHighCeilingEquipmentRoom,
        heights: prev.heights,
        standardFloorCycle: prev.standardFloorCycle,
      };
      autoSave();
    }
  }, [
    buildingName,
    coreType,
    slabType,
    unitTypePattern,
    basementCount,
    groundCount,
    coreGroundFloors,
    coreBasementFloors,
    corePhFloors,
    phCount,
    pilotisCount,
    corePilotisCounts,
    corePilotisHeights,
    hasHighCeilingEquipmentRoom,
    standardFloorCycle,
    autoSave,
  ]);

  // ============================================
  // 동 정보 저장 핸들러 (층 생성 포함)
  // ============================================
  const handleSaveBuildingInfo = async () => {
    setIsSaving(true);
    try {
      if (!building || !building.id || !building.projectId) {
        toast.error('동 정보를 찾을 수 없습니다.');
        return;
      }

      if (onStartGeneration) {
        onStartGeneration();
      }

      let latestBuildings = await getBuildings(building.projectId);
      let latestBuilding = latestBuildings.find(b => b.id === building.id);

      if (!latestBuilding) {
        await onUpdate();
        latestBuildings = await getBuildings(building.projectId);
        latestBuilding = latestBuildings.find(b => b.id === building.id);
      }

      if (!latestBuilding) {
        toast.error('동 정보를 찾을 수 없어 저장하지 못했습니다.');
        return;
      }

      const floorCountChanged =
        basementCount !== latestBuilding.meta.floorCount.basement ||
        groundCount !== latestBuilding.meta.floorCount.ground ||
        phCount !== latestBuilding.meta.floorCount.ph ||
        pilotisCount !== latestBuilding.meta.floorCount.pilotisCount ||
        JSON.stringify(corePilotisCounts) !== JSON.stringify(latestBuilding.meta.floorCount.corePilotisCounts || []) ||
        JSON.stringify(coreGroundFloors) !== JSON.stringify(latestBuilding.meta.floorCount.coreGroundFloors || []) ||
        JSON.stringify(coreBasementFloors) !== JSON.stringify(latestBuilding.meta.floorCount.coreBasementFloors || []) ||
        JSON.stringify(corePhFloors) !== JSON.stringify(latestBuilding.meta.floorCount.corePhFloors || []);

      const heightsChanged =
        JSON.stringify(heights) !== JSON.stringify(latestBuilding.meta.heights);

      const shouldRegenerate = floorCountChanged || (heightsChanged && latestBuilding.floors && latestBuilding.floors.length > 0);

      if (shouldRegenerate && onBeforeRegenerate) {
        if (onGenerationProgress) {
          onGenerationProgress(10, '물량 데이터 저장 중...');
        }
        try {
          await onBeforeRegenerate();
        } catch (error) {
          logger.error('물량 저장 실패:', error);
          toast.error('물량 데이터 저장에 실패했습니다. 층 재생성을 중단합니다.');
          return;
        }
      }

      const meta = {
        totalUnits: totalUnitCount,
        coreCount,
        coreType,
        slabType,
        unitTypePattern,
        floorCount: {
          basement: basementCount,
          ground: groundCount,
          ph: phCount,
          coreGroundFloors: coreGroundFloors.length > 0 ? coreGroundFloors : undefined,
          coreBasementFloors: coreBasementFloors.length > 0 ? coreBasementFloors : undefined,
          corePhFloors: corePhFloors.length > 0 ? corePhFloors : undefined,
          pilotisCount: pilotisCount > 0 ? pilotisCount : undefined,
          corePilotisCounts: corePilotisCounts.length > 0 ? corePilotisCounts : undefined,
          corePilotisHeights: corePilotisHeights.length > 0 ? corePilotisHeights : undefined,
          hasHighCeilingEquipmentRoom,
        },
        heights,
        standardFloorCycle,
      };

      if (shouldRegenerate && onGenerationProgress) {
        onGenerationProgress(30, '데이터 저장 중...');
      }

      await new Promise(resolve => setTimeout(resolve, 100));

      await updateBuilding(latestBuilding.id, latestBuilding.projectId, {
        buildingName,
        meta,
        forceRegenerateFloors: shouldRegenerate,
      });

      if (shouldRegenerate && onGenerationProgress) {
        onGenerationProgress(60, '층 설정 생성 중...');
      }

      await new Promise(resolve => setTimeout(resolve, 150));

      if (shouldRegenerate && onGenerationProgress) {
        onGenerationProgress(90, '물량 입력표 준비 중...');
      }

      await new Promise(resolve => setTimeout(resolve, 100));

      prevValuesRef.current = {
        buildingName,
        coreType,
        slabType,
        unitTypePattern,
        basementCount,
        groundCount,
        coreGroundFloors,
        coreBasementFloors,
        corePhFloors,
        phCount,
        pilotisCount,
        corePilotisCounts,
        corePilotisHeights,
        hasHighCeilingEquipmentRoom,
        heights,
        standardFloorCycle,
      };

      await onUpdate();

      if (shouldRegenerate && onGenerationComplete) {
        onGenerationComplete();
      }

      toast.success('동 정보가 저장되었습니다.');
    } catch (error) {
      logger.error('동 정보 저장 오류:', error);
      toast.error('저장에 실패했습니다.', {
        description: error instanceof Error ? error.message : '알 수 없는 오류가 발생했습니다.',
      });
      if (onGenerationProgress) {
        onGenerationProgress(0, '');
      }
    } finally {
      setIsSaving(false);
    }
  };

  // ============================================
  // 단위세대 구성만 저장하는 핸들러 (층 재생성 없음)
  // ============================================
  const handleSaveUnitTypePattern = async () => {
    setIsSaving(true);
    try {
      if (!building || !building.id || !building.projectId) {
        toast.error('동 정보를 찾을 수 없습니다.');
        return;
      }

      let latestBuildings = await getBuildings(building.projectId);
      let latestBuilding = latestBuildings.find(b => b.id === building.id);

      if (!latestBuilding) {
        await onUpdate();
        latestBuildings = await getBuildings(building.projectId);
        latestBuilding = latestBuildings.find(b => b.id === building.id);
      }

      if (!latestBuilding) {
        toast.error('동 정보를 찾을 수 없어 저장하지 못했습니다.');
        return;
      }

      const meta = {
        ...latestBuilding.meta,
        totalUnits: totalUnitCount,
        coreCount,
        coreType,
        slabType,
        unitTypePattern,
        floorCount: {
          ...latestBuilding.meta.floorCount,
          basement: basementCount,
          ground: groundCount,
          ph: phCount,
          coreGroundFloors: coreGroundFloors.length > 0 ? coreGroundFloors : undefined,
          coreBasementFloors: coreBasementFloors.length > 0 ? coreBasementFloors : undefined,
          corePhFloors: corePhFloors.length > 0 ? corePhFloors : undefined,
          pilotisCount: pilotisCount > 0 ? pilotisCount : undefined,
          corePilotisCounts: corePilotisCounts.length > 0 ? corePilotisCounts : undefined,
          corePilotisHeights: corePilotisHeights.length > 0 ? corePilotisHeights : undefined,
          hasHighCeilingEquipmentRoom,
        },
        heights,
        standardFloorCycle,
      };

      await updateBuilding(latestBuilding.id, latestBuilding.projectId, {
        buildingName,
        meta,
      });

      // prevValuesRef 업데이트
      prevValuesRef.current = {
        buildingName,
        coreType,
        slabType,
        unitTypePattern,
        basementCount,
        groundCount,
        coreGroundFloors,
        coreBasementFloors,
        corePhFloors,
        phCount,
        pilotisCount,
        corePilotisCounts,
        corePilotisHeights,
        hasHighCeilingEquipmentRoom,
        heights,
        standardFloorCycle,
      };

      await onUpdate();
      toast.success('단위세대 구성이 저장되었습니다.');
    } catch (error) {
      logger.error('단위세대 구성 저장 오류:', error);
      toast.error('저장에 실패했습니다.', {
        description: error instanceof Error ? error.message : '알 수 없는 오류가 발생했습니다.',
      });
    } finally {
      setIsSaving(false);
    }
  };

  // ============================================
  // 렌더링
  // ============================================
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
            {coreCount > 0 && <Badge variant="info">{coreCount}개 코어</Badge>}
          </div>
          <StructureInfoSection
            coreCount={coreCount}
            coreType={coreType}
            slabType={slabType}
            onCoreTypeChange={setCoreType}
            onSlabTypeChange={setSlabType}
          />
        </div>

        {/* 섹션 2: 단위세대 구성 */}
        <div className="space-y-4">
          <div className="flex items-center gap-2">
            <h3 className="text-lg font-semibold text-slate-900 dark:text-white">단위세대 구성</h3>
            {totalUnitCount > 0 && <Badge variant="info">{totalUnitCount} 세대</Badge>}
          </div>
          <UnitTypePatternSection
            unitTypePattern={unitTypePattern}
            basementCount={basementCount}
            groundCount={groundCount}
            phCount={phCount}
            coreBasementFloors={coreBasementFloors}
            coreGroundFloors={coreGroundFloors}
            corePhFloors={corePhFloors}
            corePilotisCounts={corePilotisCounts}
            corePilotisHeights={corePilotisHeights}
            hasHighCeilingEquipmentRoom={hasHighCeilingEquipmentRoom}
            totalUnitCount={totalUnitCount}
            heights={heights}
            onUnitTypePatternChange={setUnitTypePattern}
            onBasementCountChange={setBasementCount}
            onGroundCountChange={setGroundCount}
            onPhCountChange={setPhCount}
            onCoreBasementFloorsChange={setCoreBasementFloors}
            onCoreGroundFloorsChange={setCoreGroundFloors}
            onCorePhFloorsChange={setCorePhFloors}
            onCorePilotisCountsChange={setCorePilotisCounts}
            onCorePilotisHeightsChange={setCorePilotisHeights}
            onHasHighCeilingEquipmentRoomChange={setHasHighCeilingEquipmentRoom}
            onHeightsChange={setHeights}
            onSave={handleSaveUnitTypePattern}
            isSaving={isSaving}
          />
        </div>

        {/* 섹션 3: 층고 설정 */}
        <div className="space-y-4">
          <h3 className="text-lg font-semibold text-slate-900 dark:text-white">기준 층고 설정</h3>
          <FloorHeightSection
            heights={heights}
            phCount={phCount}
            onHeightsChange={setHeights}
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
            onClick={handleSaveBuildingInfo}
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
