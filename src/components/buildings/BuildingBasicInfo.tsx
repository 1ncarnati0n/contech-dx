'use client';

import { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { Card, CardHeader, CardTitle, CardContent, Button, Input } from '@/components/ui';
import type { Building, CoreType, SlabType, UnitTypePattern } from '@/lib/types';
import { updateBuilding, getBuildings } from '@/lib/services/buildings';
import { toast } from 'sonner';
import { Save, Plus, Trash2 } from 'lucide-react';

interface Props {
  building: Building;
  onUpdate: () => void;
}


interface BuildingBasicInfoProps extends Props {
  isFirstBuilding?: boolean;
  onStartGeneration?: () => void;
  onGenerationProgress?: (progress: number, message: string) => void;
  onGenerationComplete?: () => void;
  onBeforeRegenerate?: () => Promise<void>; // 층 재생성 전 콜백
}

export function BuildingBasicInfo({ 
  building, 
  onUpdate, 
  isFirstBuilding = false, 
  onStartGeneration,
  onGenerationProgress,
  onGenerationComplete,
  onBeforeRegenerate
}: BuildingBasicInfoProps) {
  const [buildingName, setBuildingName] = useState(building.buildingName);
  const [totalUnits, setTotalUnits] = useState(building.meta.totalUnits);
  const [coreCount, setCoreCount] = useState(building.meta.coreCount || 0);
  
  // 코어 개수 변경 시 coreGroundFloors 배열 초기화
  useEffect(() => {
    if (coreCount > 1) {
      // 코어 개수가 2개 이상이면 배열을 확장
      const currentCoreGroundFloors = [...coreGroundFloors];
      if (currentCoreGroundFloors.length < coreCount) {
        // 부족한 코어만큼 현재 지상층 수로 채움
        while (currentCoreGroundFloors.length < coreCount) {
          currentCoreGroundFloors.push(groundCount || 0);
        }
        setCoreGroundFloors(currentCoreGroundFloors);
      } else if (currentCoreGroundFloors.length > coreCount) {
        // 코어 개수가 줄어들면 배열 자르기
        setCoreGroundFloors(currentCoreGroundFloors.slice(0, coreCount));
      }
    } else {
      // 코어 개수가 1개 이하면 배열 비우기
      if (coreGroundFloors.length > 0) {
        setCoreGroundFloors([]);
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [coreCount]);
  const [coreType, setCoreType] = useState<CoreType>(building.meta.coreType || '중복도(판상형)');
  const [slabType, setSlabType] = useState<SlabType>(building.meta.slabType || '벽식구조');
  const [basementCount, setBasementCount] = useState(building.meta.floorCount.basement);
  const [groundCount, setGroundCount] = useState(building.meta.floorCount.ground);
  const [coreGroundFloors, setCoreGroundFloors] = useState<number[]>(
    building.meta.floorCount.coreGroundFloors || []
  );
  const [phCount, setPhCount] = useState(building.meta.floorCount.ph);
  const [pilotisCount, setPilotisCount] = useState(building.meta.floorCount.pilotisCount || 0);
  const [unitTypePattern, setUnitTypePattern] = useState<UnitTypePattern[]>(
    building.meta.unitTypePattern || []
  );
  // PH층 층고를 배열로 관리 (기존 단일 값이면 배열로 변환)
  const initialPhHeights = Array.isArray(building.meta.heights.ph) 
    ? building.meta.heights.ph 
    : building.meta.floorCount.ph > 0 
      ? Array(building.meta.floorCount.ph).fill(building.meta.heights.ph || 2650)
      : [2650];
  
  const [heights, setHeights] = useState({
    ...building.meta.heights,
    floor4: building.meta.heights.floor4 || 2850,
    floor5: building.meta.heights.floor5 || 2850,
    ph: initialPhHeights,
  });
  const [standardFloorCycle, setStandardFloorCycle] = useState(building.meta.standardFloorCycle || 0);
  const [isSaving, setIsSaving] = useState(false);
  const saveTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const isInitialMountRef = useRef(true);
  const buildingNotFoundRef = useRef(false); // building이 없을 때 추적
  const prevValuesRef = useRef({
    buildingName: building.buildingName,
    totalUnits: building.meta.totalUnits,
    coreCount: building.meta.coreCount || 0,
    coreType: building.meta.coreType || '중복도(판상형)',
    slabType: building.meta.slabType || '벽식구조',
    basementCount: building.meta.floorCount.basement,
    groundCount: building.meta.floorCount.ground,
    coreGroundFloors: building.meta.floorCount.coreGroundFloors || [],
    phCount: building.meta.floorCount.ph,
    pilotisCount: building.meta.floorCount.pilotisCount || 0,
    unitTypePattern: building.meta.unitTypePattern || [],
    heights: building.meta.heights,
    standardFloorCycle: building.meta.standardFloorCycle || 0,
  });

  // 세대수 카운트 계산: (코어별 호수 * 코어별 층수) - 필로티 세대수
  const totalUnitCount = useMemo(() => {
    let total = 0;
    
    // 각 패턴을 순회하면서 계산 (인덱스 기반으로 코어1-1, 코어1-2 구분)
    unitTypePattern.forEach((pattern, index) => {
      const coreNum = pattern.coreNumber || 1;
      const unitCount = pattern.to - pattern.from + 1; // 호수 범위
      
      // 코어별 층수 가져오기
      let floorCount = groundCount; // 기본값
      
      if (coreNum === 1) {
        // 코어1인 경우: 인덱스 기반으로 층수 결정
        // 첫 번째 코어1 → coreGroundFloors[0]
        // 두 번째 코어1 (코어1-1) → coreGroundFloors[1]
        // 세 번째 코어1 (코어1-2) → coreGroundFloors[2]
        const core1Index = unitTypePattern
          .slice(0, index + 1)
          .filter(p => p.coreNumber === 1).length - 1; // 현재까지의 코어1 개수 - 1 (0-based)
        
        if (coreGroundFloors.length > core1Index) {
          floorCount = coreGroundFloors[core1Index] ?? groundCount;
        }
      } else if (coreNum === 2) {
        // 코어2인 경우: 코어1 개수 뒤에 위치
        const core1Count = unitTypePattern.filter(p => p.coreNumber === 1).length;
        const core2Index = core1Count; // 코어2는 코어1들 뒤에
        
        if (coreGroundFloors.length > core2Index) {
          floorCount = coreGroundFloors[core2Index] ?? groundCount;
        }
      }
      
      total += unitCount * floorCount;
    });
    
    // 필로티 세대수 제외
    return total - pilotisCount;
  }, [unitTypePattern, coreCount, coreGroundFloors, groundCount, pilotisCount]);

  useEffect(() => {
    setBuildingName(building.buildingName);
    setTotalUnits(building.meta.totalUnits);
    setCoreCount(building.meta.coreCount || 0);
    setCoreType(building.meta.coreType || '중복도(판상형)');
    setSlabType(building.meta.slabType || '벽식구조');
    setBasementCount(building.meta.floorCount.basement);
    setGroundCount(building.meta.floorCount.ground);
    setCoreGroundFloors(building.meta.floorCount.coreGroundFloors || []);
    setPhCount(building.meta.floorCount.ph);
    setPilotisCount(building.meta.floorCount.pilotisCount || 0);
    setUnitTypePattern(building.meta.unitTypePattern || []);
    setStandardFloorCycle(building.meta.standardFloorCycle || 0);
    // PH층 층고를 배열로 변환 (기존 단일 값이면 배열로, 이미 배열이면 그대로)
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
    // 이전 값 참조 업데이트
    prevValuesRef.current = {
      buildingName: building.buildingName,
      totalUnits: building.meta.totalUnits,
      coreCount: building.meta.coreCount || 0,
      coreType: building.meta.coreType || '중복도(판상형)',
      slabType: building.meta.slabType || '벽식구조',
      basementCount: building.meta.floorCount.basement,
      groundCount: building.meta.floorCount.ground,
      coreGroundFloors: building.meta.floorCount.coreGroundFloors || [],
      phCount: building.meta.floorCount.ph,
      pilotisCount: building.meta.floorCount.pilotisCount || 0,
      unitTypePattern: building.meta.unitTypePattern || [],
      heights: building.meta.heights,
      standardFloorCycle: building.meta.standardFloorCycle || 0,
    };
    isInitialMountRef.current = true;
    // building이 변경되면 buildingNotFoundRef 리셋
    buildingNotFoundRef.current = false;
  }, [building]);


  // 자동 저장 함수
  const autoSave = useCallback(async () => {
    // 초기 마운트 시에는 저장하지 않음
    if (isInitialMountRef.current) {
      isInitialMountRef.current = false;
      return;
    }

    // building이 없을 때는 저장 시도하지 않음
    if (buildingNotFoundRef.current) {
      return;
    }

    // building이 유효한지 확인
    if (!building || !building.id || !building.projectId) {
      console.error('Invalid building data:', building);
      buildingNotFoundRef.current = true;
      return;
    }

    // 기존 타이머 취소
    if (saveTimeoutRef.current) {
      clearTimeout(saveTimeoutRef.current);
    }

      // debounce: 500ms 후 저장
      saveTimeoutRef.current = setTimeout(async () => {
        setIsSaving(true);
        
        try {
          // 자동 저장에서는 층을 생성하지 않음 (floorCount 제외)
          // 층 생성은 "동 정보 저장" 버튼을 눌렀을 때만 수행
          const meta = {
            totalUnits,
            coreCount,
            coreType,
            slabType,
            unitTypePattern,
            // floorCount는 제외하여 층 생성 방지
            floorCount: building.meta.floorCount, // 기존 값 유지
            heights,
            standardFloorCycle,
          };
          
          // building이 여전히 유효한지 다시 확인
          if (!building.id || !building.projectId) {
            console.warn('Building ID or Project ID is missing, skipping save');
            setIsSaving(false);
            return;
          }
          
          // 저장 전에 building이 존재하는지 확인 (최신 상태로 다시 로드)
          let latestBuildings = await getBuildings(building.projectId);
          let latestBuilding = latestBuildings.find(b => b.id === building.id);
          
          // building이 없으면 목록을 다시 로드 시도
          if (!latestBuilding) {
            console.warn('Building not found in store, attempting to reload...', {
              buildingId: building.id,
              projectId: building.projectId,
              availableBuildings: latestBuildings.map(b => ({ id: b.id, name: b.buildingName }))
            });
            
            // onUpdate를 호출하여 building 목록을 다시 로드
            try {
              await onUpdate();
              // 다시 확인
              latestBuildings = await getBuildings(building.projectId);
              latestBuilding = latestBuildings.find(b => b.id === building.id);
            } catch (error) {
              console.error('Failed to reload buildings:', error);
            }
          }
          
          // 여전히 building이 없으면 저장 건너뛰기
          if (!latestBuilding) {
            // building이 없음을 표시하고, 한 번만 사용자에게 알림
            const wasNotFound = buildingNotFoundRef.current;
            buildingNotFoundRef.current = true;
            
            if (!wasNotFound) {
              console.error('Building not found after reload, skipping save:', {
                buildingId: building.id,
                projectId: building.projectId,
                buildingName: building.buildingName,
                availableBuildings: latestBuildings.map(b => ({ id: b.id, name: b.buildingName }))
              });
              toast.error('동 정보를 찾을 수 없어 저장하지 못했습니다. 페이지를 새로고침해주세요.');
            }
            
            setIsSaving(false);
            return;
          }
          
          // building을 찾았으면 플래그 리셋
          buildingNotFoundRef.current = false;
          
          await updateBuilding(latestBuilding.id, latestBuilding.projectId, {
            buildingName,
            meta,
          });
          
          // 자동 저장에서는 onUpdate를 호출하지 않음 (층 생성하지 않으므로)
        } catch (error) {
          console.error('Building save error:', error);
          toast.error('저장에 실패했습니다.', {
            description: error instanceof Error ? error.message : '알 수 없는 오류가 발생했습니다.',
          });
        } finally {
          setIsSaving(false);
        }
      }, 500);
  }, [
    building.id,
    building.projectId,
    building.meta,
    buildingName,
    totalUnits,
    coreCount,
    coreType,
    slabType,
    unitTypePattern,
    basementCount,
    groundCount,
    coreGroundFloors,
    phCount,
    pilotisCount,
    heights,
    standardFloorCycle,
    onUpdate,
    onStartGeneration,
    onGenerationProgress,
    onGenerationComplete,
  ]);

  // 값 변경 감지 및 자동 저장 (heights는 제외 - 수동 저장)
  useEffect(() => {
    const prev = prevValuesRef.current;
    const hasChanged = 
      buildingName !== prev.buildingName ||
      totalUnits !== prev.totalUnits ||
      coreCount !== prev.coreCount ||
      coreType !== prev.coreType ||
      slabType !== prev.slabType ||
      JSON.stringify(unitTypePattern) !== JSON.stringify(prev.unitTypePattern) ||
      basementCount !== prev.basementCount ||
      groundCount !== prev.groundCount ||
      JSON.stringify(coreGroundFloors) !== JSON.stringify(prev.coreGroundFloors) ||
      phCount !== prev.phCount ||
      pilotisCount !== prev.pilotisCount ||
      standardFloorCycle !== prev.standardFloorCycle;
      // heights는 수동 저장이므로 자동 저장에서 제외

    if (hasChanged) {
      prevValuesRef.current = {
        buildingName,
        totalUnits,
        coreCount,
        coreType,
        slabType,
        unitTypePattern,
        basementCount,
        groundCount,
        coreGroundFloors,
        phCount,
        pilotisCount,
        heights: prev.heights, // heights는 이전 값 유지 (수동 저장 전까지)
        standardFloorCycle: prev.standardFloorCycle, // standardFloorCycle도 이전 값 유지
      };
      autoSave();
    }
  }, [
    buildingName,
    totalUnits,
    coreCount,
    coreType,
    slabType,
    unitTypePattern,
    basementCount,
    groundCount,
    coreGroundFloors,
    phCount,
    pilotisCount,
    standardFloorCycle,
    autoSave,
  ]);

  // 동 정보 저장 함수 (층 생성 포함)
  const handleSaveBuildingInfo = async () => {
    setIsSaving(true);
    try {
      // building이 유효한지 확인
      if (!building || !building.id || !building.projectId) {
        toast.error('동 정보를 찾을 수 없습니다.');
        return;
      }

      // 층 생성 시작 알림
      if (onStartGeneration) {
        onStartGeneration();
      }

      // 저장 전에 building이 존재하는지 확인
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

      // 층수 변경 여부 확인
      const floorCountChanged = 
        basementCount !== latestBuilding.meta.floorCount.basement ||
        groundCount !== latestBuilding.meta.floorCount.ground ||
        phCount !== latestBuilding.meta.floorCount.ph ||
        pilotisCount !== latestBuilding.meta.floorCount.pilotisCount ||
        JSON.stringify(coreGroundFloors) !== JSON.stringify(latestBuilding.meta.floorCount.coreGroundFloors || []);
      
      // 층고 변경 여부 확인 (기준층 범위 변경 가능성 때문에)
      const heightsChanged = 
        JSON.stringify(heights) !== JSON.stringify(latestBuilding.meta.heights);
      
      // 층이 이미 생성되어 있고 층고가 변경되었으면 재생성 필요
      const shouldRegenerate = floorCountChanged || (heightsChanged && latestBuilding.floors && latestBuilding.floors.length > 0);

      // 층 재생성 전에 저장 완료 보장
      if (shouldRegenerate && onBeforeRegenerate) {
        if (onGenerationProgress) {
          onGenerationProgress(10, '물량 데이터 저장 중...');
        }
        try {
          await onBeforeRegenerate(); // 저장 완료 대기
        } catch (error) {
          console.error('물량 저장 실패:', error);
          toast.error('물량 데이터 저장에 실패했습니다. 층 재생성을 중단합니다.');
          return;
        }
      }

      const meta = {
        totalUnits,
        coreCount,
        coreType,
        slabType,
        unitTypePattern,
        floorCount: {
          basement: basementCount,
          ground: groundCount,
          ph: phCount,
          coreGroundFloors: coreGroundFloors.length > 0 ? coreGroundFloors : undefined,
          pilotisCount: pilotisCount > 0 ? pilotisCount : undefined,
        },
        heights,
        standardFloorCycle,
      };

      // 진행률: 데이터 저장 중 (30%)
      if (shouldRegenerate && onGenerationProgress) {
        onGenerationProgress(30, '데이터 저장 중...');
      }

      await new Promise(resolve => setTimeout(resolve, 100));

      // 층 생성을 강제하기 위해 forceRegenerateFloors 플래그 추가
      await updateBuilding(latestBuilding.id, latestBuilding.projectId, {
        buildingName,
        meta,
        forceRegenerateFloors: shouldRegenerate, // 층수 변경 또는 층고 변경 시 재생성
      } as any);

      // 진행률: 층 생성 중 (60%)
      if (shouldRegenerate && onGenerationProgress) {
        onGenerationProgress(60, '층 설정 생성 중...');
      }

      await new Promise(resolve => setTimeout(resolve, 150));

      // 진행률: 물량 입력표 준비 중 (90%)
      if (shouldRegenerate && onGenerationProgress) {
        onGenerationProgress(90, '물량 입력표 준비 중...');
      }

      await new Promise(resolve => setTimeout(resolve, 100));

      // prevValuesRef 업데이트
      prevValuesRef.current = {
        buildingName,
        totalUnits,
        coreCount,
        coreType,
        slabType,
        unitTypePattern,
        basementCount,
        groundCount,
        coreGroundFloors,
        phCount,
        pilotisCount,
        heights,
        standardFloorCycle,
      };

      // 층수 변경 또는 층고 변경 시 floors가 재생성되므로 onUpdate 호출하여 하위 컴포넌트 업데이트
      await onUpdate();

      // 진행률: 완료 (100%)
      if (shouldRegenerate && onGenerationComplete) {
        onGenerationComplete();
      }

      toast.success('동 정보가 저장되었습니다.');
    } catch (error) {
      console.error('동 정보 저장 오류:', error);
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

  // 단위세대 패턴 추가/삭제 함수
  const addUnitTypePattern = () => {
    // 기본값: 시작 호수와 끝 호수를 같은 값으로 설정
    const defaultFrom = 1;
    setUnitTypePattern([...unitTypePattern, { from: defaultFrom, to: defaultFrom, type: '', coreNumber: 1 }]);
  };

  const removeUnitTypePattern = (index: number) => {
    setUnitTypePattern(unitTypePattern.filter((_, i) => i !== index));
  };

  const updateUnitTypePattern = (index: number, field: keyof UnitTypePattern, value: number | string) => {
    const updated = [...unitTypePattern];
    updated[index] = { ...updated[index], [field]: value };
    
    // 시작 호수가 변경되면 끝 호수를 자동으로 시작 호수와 같은 값으로 설정
    if (field === 'from' && typeof value === 'number') {
      updated[index].to = value;
    }
    
    setUnitTypePattern(updated);
  };

  // 컴포넌트 언마운트 시 타이머 정리
  useEffect(() => {
    return () => {
      if (saveTimeoutRef.current) {
        clearTimeout(saveTimeoutRef.current);
      }
    };
  }, []);


  return (
    <Card>
      <CardHeader>
        <CardTitle>동 기본 정보</CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* 단위세대 정보 */}
        <div className="space-y-4">
          <h3 className="text-lg font-semibold text-slate-900 dark:text-white">단위세대 정보</h3>
          
          <div>
            <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
              총 호수
            </label>
            <Input
              type="number"
              min="0"
              value={totalUnits || ''}
              onChange={(e) => setTotalUnits(e.target.value === '' ? 0 : Number(e.target.value))}
              className="max-w-xs"
            />
          </div>

          {/* 단위세대 패턴 입력 */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <label className="block text-sm font-medium text-slate-700 dark:text-slate-300">
                단위세대 구성
              </label>
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={addUnitTypePattern}
                className="gap-1"
              >
                <Plus className="w-3 h-3" />
                추가
              </Button>
            </div>
            <div className="space-y-2">
              {unitTypePattern.map((pattern, index) => {
                // 코어1이 반복되는 경우 "-1", "-2" 등을 붙여서 표시
                const getCoreDisplayName = (coreNum: number, currentIndex: number) => {
                  if (coreNum === 1) {
                    // 같은 코어1이 이전에 몇 번 나왔는지 계산
                    const previousCore1Count = unitTypePattern
                      .slice(0, currentIndex)
                      .filter(p => p.coreNumber === 1).length;
                    if (previousCore1Count > 0) {
                      return `코어1-${previousCore1Count}`;
                    }
                    return '코어1';
                  }
                  return `코어${coreNum}`;
                };

                const currentCoreDisplayName = getCoreDisplayName(pattern.coreNumber || 1, index);
                
                return (
                <div key={index} className="flex items-center gap-2 p-3 border border-slate-200 dark:border-slate-700 rounded-lg">
                  <select
                    value={pattern.coreNumber || 1}
                    onChange={(e) => updateUnitTypePattern(index, 'coreNumber', Number(e.target.value))}
                    className="w-24 px-3 py-2 border border-slate-200 dark:border-slate-700 rounded-md bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-primary-500 text-sm"
                  >
                    <option value={1}>{currentCoreDisplayName}</option>
                    <option value={2}>코어2</option>
                  </select>
                  <Input
                    type="number"
                    placeholder="시작 호수"
                    value={pattern.from || ''}
                    onChange={(e) => updateUnitTypePattern(index, 'from', Number(e.target.value))}
                    className="w-24"
                  />
                  <span className="text-slate-500">~</span>
                  <Input
                    type="number"
                    placeholder="끝 호수"
                    value={pattern.to || ''}
                    onChange={(e) => updateUnitTypePattern(index, 'to', Number(e.target.value))}
                    className="w-24"
                  />
                  <span className="text-slate-500">호</span>
                  <Input
                    type="text"
                    placeholder="타입 (예: 59A)"
                    value={pattern.type || ''}
                    onChange={(e) => updateUnitTypePattern(index, 'type', e.target.value)}
                    className="w-32"
                  />
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={() => removeUnitTypePattern(index)}
                    className="text-red-500 hover:text-red-700"
                  >
                    <Trash2 className="w-4 h-4" />
                  </Button>
                </div>
              );
              })}
              {unitTypePattern.length === 0 && (
                <p className="text-sm text-slate-500 dark:text-slate-400 text-center py-4">
                  단위세대 패턴을 추가해주세요.
                </p>
              )}
            </div>
          </div>

        </div>

        {/* 구조 정보 */}
        <div className="space-y-4">
          <h3 className="text-lg font-semibold text-slate-900 dark:text-white">구조 정보</h3>
          
          <div className="grid grid-cols-3 gap-4">
            <div>
              <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
                코어 개수
              </label>
              <Input
                type="number"
                min="0"
                value={coreCount || ''}
                onChange={(e) => setCoreCount(e.target.value === '' ? 0 : Number(e.target.value))}
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
                코어 타입
              </label>
              <select
                value={coreType}
                onChange={(e) => setCoreType(e.target.value as CoreType)}
                className="w-full px-3 py-2 border border-slate-200 dark:border-slate-700 rounded-md bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-primary-500"
              >
                <option value="중복도(판상형)">중복도(판상형)</option>
                <option value="타워형">타워형</option>
                <option value="편복도">편복도</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
                구조형식
              </label>
              <select
                value={slabType}
                onChange={(e) => setSlabType(e.target.value as SlabType)}
                className="w-full px-3 py-2 border border-slate-200 dark:border-slate-700 rounded-md bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-primary-500"
              >
                <option value="벽식구조">벽식구조</option>
                <option value="RC구조">RC구조</option>
                <option value="벽식구조(내부기둥)">벽식구조(내부기둥)</option>
              </select>
            </div>
          </div>
        </div>

        {/* 층수 정보 */}
        <div className="space-y-4">
          <h3 className="text-lg font-semibold text-slate-900 dark:text-white">층수 정보</h3>
          

          <div className="space-y-4">
            <div className="grid grid-cols-3 gap-4">
              <div>
                <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
                  지하층 수
                </label>
                <Input
                  type="number"
                  min="0"
                  value={basementCount || ''}
                  onChange={(e) => setBasementCount(e.target.value === '' ? 0 : Number(e.target.value))}
                />
              </div>
              {/* 코어 개수에 따라 지상층 수 입력 방식 변경 */}
              {(() => {
                const core1Patterns = unitTypePattern.filter(p => p.coreNumber === 1);
                const core1Count = core1Patterns.length;
                const hasCore2 = unitTypePattern.some(p => p.coreNumber === 2);
                
                // 코어1이 하나 이상 있으면 코어1 입력창 표시, 없으면 일반 지상층 수
                if (core1Count > 0) {
                  return (
                    <div>
                      <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
                        코어1 지상층 수
                      </label>
                      <Input
                        type="number"
                        min="0"
                        value={coreGroundFloors[0] ?? groundCount ?? ''}
                        onChange={(e) => {
                          const newCoreGroundFloors = [...coreGroundFloors];
                          const newValue = e.target.value === '' ? 0 : Number(e.target.value);
                          newCoreGroundFloors[0] = newValue;
                          setCoreGroundFloors(newCoreGroundFloors);
                          // 전체 지상층 수는 첫 번째 코어 값으로 설정
                          setGroundCount(newValue);
                        }}
                      />
                    </div>
                  );
                } else {
                  return (
                    <div>
                      <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
                        지상층 수
                      </label>
                      <Input
                        type="number"
                        min="0"
                        value={groundCount || ''}
                        onChange={(e) => setGroundCount(e.target.value === '' ? 0 : Number(e.target.value))}
                      />
                    </div>
                  );
                }
              })()}
              <div>
                <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
                  옥탑층 수
                </label>
                <Input
                  type="number"
                  min="0"
                  value={phCount || ''}
                  onChange={(e) => {
                    const newPhCount = e.target.value === '' ? 0 : Number(e.target.value);
                    setPhCount(newPhCount);
                    
                    // PH층 수가 변경되면 heights.ph 배열도 업데이트
                    const currentPhHeights = Array.isArray(heights.ph) ? heights.ph : [heights.ph || 2650];
                    if (newPhCount > currentPhHeights.length) {
                      // PH층 수가 증가하면 기본값으로 채움
                      const newPhHeights = [...currentPhHeights, ...Array(newPhCount - currentPhHeights.length).fill(2650)];
                      setHeights({ ...heights, ph: newPhHeights });
                    } else if (newPhCount < currentPhHeights.length) {
                      // PH층 수가 감소하면 배열 자르기
                      const newPhHeights = currentPhHeights.slice(0, newPhCount);
                      setHeights({ ...heights, ph: newPhHeights });
                    }
                  }}
                />
              </div>
            </div>
            {/* 코어별 지상층 수 입력창 동적 생성 */}
            {(() => {
              // 단위세대 구성에서 코어1이 몇 번 나오는지 계산
              const core1Patterns = unitTypePattern.filter(p => p.coreNumber === 1);
              const core1Count = core1Patterns.length;
              const core2Patterns = unitTypePattern.filter(p => p.coreNumber === 2);
              const core2Count = core2Patterns.length > 0 ? 1 : 0; // 코어2가 하나라도 있으면 표시
              
              const core1InputRows = [];
              const core2InputRows = [];
              
              // 코어1 입력창들 생성
              if (core1Count > 0) {
                for (let i = 0; i < core1Count; i++) {
                  const coreIndex = i; // 코어1, 코어1-1, 코어1-2 등
                  const coreDisplayName = i === 0 ? '코어1' : `코어1-${i}`;
                  core1InputRows.push(
                    <div key={`core1-${i}`} className="grid grid-cols-3 gap-4">
                      {i === 0 ? null : <div></div>}
                      <div>
                        <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
                          {coreDisplayName} 지상층 수
                        </label>
                        <Input
                          type="number"
                          min="0"
                          value={coreGroundFloors[coreIndex] ?? groundCount ?? ''}
                          onChange={(e) => {
                            const newCoreGroundFloors = [...coreGroundFloors];
                            const newValue = e.target.value === '' ? 0 : Number(e.target.value);
                            // 배열 크기 확보
                            while (newCoreGroundFloors.length <= coreIndex) {
                              newCoreGroundFloors.push(groundCount ?? 0);
                            }
                            newCoreGroundFloors[coreIndex] = newValue;
                            setCoreGroundFloors(newCoreGroundFloors);
                            // 첫 번째 코어인 경우 전체 지상층 수도 업데이트
                            if (i === 0) {
                              setGroundCount(newValue);
                            }
                          }}
                        />
                      </div>
                      {i === 0 ? null : <div></div>}
                    </div>
                  );
                }
              }
              
              // 코어2 입력창 생성
              if (core2Count > 0) {
                const core2Index = core1Count; // 코어2는 코어1들 뒤에
                core2InputRows.push(
                  <div key="core2" className="grid grid-cols-3 gap-4">
                    <div></div>
                    <div>
                      <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
                        코어2 지상층 수
                      </label>
                      <Input
                        type="number"
                        min="0"
                        value={coreGroundFloors[core2Index] ?? groundCount ?? ''}
                        onChange={(e) => {
                          const newCoreGroundFloors = [...coreGroundFloors];
                          const newValue = e.target.value === '' ? 0 : Number(e.target.value);
                          // 배열 크기 확보
                          while (newCoreGroundFloors.length <= core2Index) {
                            newCoreGroundFloors.push(groundCount ?? 0);
                          }
                          newCoreGroundFloors[core2Index] = newValue;
                          setCoreGroundFloors(newCoreGroundFloors);
                        }}
                      />
                    </div>
                    <div></div>
                  </div>
                );
              }
              
              return (
                <>
                  {core1InputRows.slice(1)} {/* 코어1-1, 코어1-2 등 (첫 번째 코어1 제외) */}
                  {core2InputRows}
                </>
              );
            })()}
          </div>

          <div className="grid grid-cols-2 gap-4 pt-4 border-t border-slate-200 dark:border-slate-800">
            <div>
              <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
                필로티+ 부대시설 제외 세대수
              </label>
              <Input
                type="number"
                min="0"
                value={pilotisCount || ''}
                onChange={(e) => setPilotisCount(e.target.value === '' ? 0 : Number(e.target.value))}
                className="max-w-xs"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
                세대수 카운트
              </label>
              <Input
                type="number"
                value={totalUnitCount}
                disabled
                className="max-w-xs bg-slate-100 dark:bg-slate-800"
              />
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                단위세대 패턴에서 자동 계산됩니다.
              </p>
            </div>
          </div>

        </div>

        {/* 기준 층고 설정 */}
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-lg font-semibold text-slate-900 dark:text-white">기준 층고 설정</h3>
          </div>
          
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
                지하2층 층고 (mm)
              </label>
              <Input
                type="number"
                step="1"
                min="0"
                value={heights.basement2 || 3500}
                onChange={(e) => setHeights({ ...heights, basement2: Number(e.target.value) })}
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
                지하1층 층고 (mm)
              </label>
              <Input
                type="number"
                step="1"
                min="0"
                value={heights.basement1 || 5400}
                onChange={(e) => setHeights({ ...heights, basement1: Number(e.target.value) })}
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
                1층 층고 (mm)
              </label>
              <Input
                type="number"
                step="1"
                min="0"
                value={heights.floor1 || 3050}
                onChange={(e) => setHeights({ ...heights, floor1: Number(e.target.value) })}
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
                2층 층고 (mm)
              </label>
              <Input
                type="number"
                step="1"
                min="0"
                value={heights.floor2 || 2850}
                onChange={(e) => setHeights({ ...heights, floor2: Number(e.target.value) })}
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
                3층 층고 (mm)
              </label>
              <Input
                type="number"
                step="1"
                min="0"
                value={heights.floor3 || 2850}
                onChange={(e) => setHeights({ ...heights, floor3: Number(e.target.value) })}
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
                4층 층고 (mm)
              </label>
              <Input
                type="number"
                step="1"
                min="0"
                value={heights.floor4 || 2850}
                onChange={(e) => setHeights({ ...heights, floor4: Number(e.target.value) })}
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
                5층 층고 (mm)
              </label>
              <Input
                type="number"
                step="1"
                min="0"
                value={heights.floor5 || 2850}
                onChange={(e) => setHeights({ ...heights, floor5: Number(e.target.value) })}
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
                기준층 층고 (mm)
              </label>
              <Input
                type="number"
                step="1"
                min="0"
                value={heights.standard || 2850}
                onChange={(e) => setHeights({ ...heights, standard: Number(e.target.value) })}
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
                최상층 층고 (mm)
              </label>
              <Input
                type="number"
                step="1"
                min="0"
                value={heights.top || 3050}
                onChange={(e) => setHeights({ ...heights, top: Number(e.target.value) })}
              />
            </div>
            {/* 옥탑층 층고 - PH층 수에 따라 각각 입력 */}
            {phCount > 0 && (
              phCount === 1 ? (
                <div>
                  <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
                    옥탑층 층고 (mm)
                  </label>
                  <Input
                    type="number"
                    step="1"
                    min="0"
                    value={Array.isArray(heights.ph) ? heights.ph[0] || 2650 : heights.ph || 2650}
                    onChange={(e) => setHeights({ ...heights, ph: [Number(e.target.value)] })}
                  />
                </div>
              ) : (
                Array.from({ length: phCount }, (_, i) => (
                  <div key={i}>
                    <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
                      옥탑층{i + 1} 층고 (mm)
                    </label>
                    <Input
                      type="number"
                      step="1"
                      min="0"
                      value={Array.isArray(heights.ph) ? (heights.ph[i] || 2650) : (i === 0 ? (heights.ph || 2650) : 2650)}
                      onChange={(e) => {
                        const phArray = Array.isArray(heights.ph) ? [...heights.ph] : Array(phCount).fill(heights.ph || 2650);
                        phArray[i] = Number(e.target.value);
                        setHeights({ ...heights, ph: phArray });
                      }}
                    />
                  </div>
                ))
              )
            )}
          </div>
        </div>

        {/* 동 정보 저장 버튼 */}
        <div className="flex items-center justify-end gap-3 pt-4 border-t border-slate-200 dark:border-slate-800">
          <p className="text-sm text-slate-600 dark:text-slate-400">
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

