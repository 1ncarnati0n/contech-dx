'use client';

import { useEffect, useMemo, useCallback, useState } from 'react';
import type { Building, BuildingProcessPlan, ProcessCategory, ProcessType, Floor } from '@/shared/types';
import type { TradeFieldKey, TradeSubFieldKey } from '@/shared/types/process-quantity';
import { getBuildings, deleteBuilding, updateBuilding, reorderBuildings } from '@/features/building/shared/repository/buildings';
import { toast } from 'sonner';
import { getProcessModule } from '@/features/building/data/process-modules';
import { resolveProcessQuantity } from './process-quantity-resolver';
import { parseLegacyReference } from './quantity-reference-migration';
import { calculateModuleWorkDays, calculateModuleWorkDaysForFloor, calculateModuleIndirectDaysForFloor, calculateModuleIndirectDays } from './process-days-calculator';
import { useSyncTabContext } from '@/shared/hooks/useSyncTabContext';
import { calculateItemDirectWorkDays } from './process-calculation';
import { createBuildingProcessRows } from './createBuildingProcessRows';
import {
  isProcessItemMatchedToBuildingRow,
} from './processRowHelpers';
import { useProcessPlanState } from './useProcessPlanState';

// ─── Constants ───────────────────────────────────────────────────────────────

// 공정 구분 목록 (지상층만 - 지하층, 기초, 버림은 별도 탭에서 관리)
export const PROCESS_CATEGORIES: ProcessCategory[] = ['일반층', '셋팅층', '기준층', '옥탑층'];

// 공정 타입 옵션 (구분별로 다름)
export const PROCESS_TYPE_OPTIONS: Record<ProcessCategory, ProcessType[]> = {
  '버림': ['표준공정'],
  '기초': ['표준공정'],
  '주동 지하층': ['표준공정'],
  '지하층(층고6.5m이상)': ['표준공정'],
  '셋팅층': ['표준공정'],
  '기준층': ['표준공정'],
  '최상층': ['표준공정'],
  '옥탑층': ['표준공정'],
  '지하주차장': ['표준공정'],
  '일반층': ['표준공정'],
};

// 기본 공정 타입
export const DEFAULT_PROCESS_TYPES: Record<ProcessCategory, ProcessType> = {
  '버림': '표준공정',
  '기초': '표준공정',
  '주동 지하층': '표준공정',
  '지하층(층고6.5m이상)': '표준공정',
  '셋팅층': '표준공정',
  '기준층': '표준공정',
  '최상층': '표준공정',
  '옥탑층': '표준공정',
  '지하주차장': '표준공정',
  '일반층': '표준공정',
};

// ─── Pure helper functions (exported for View usage) ─────────────────────────

/**
 * 동별 주요정보 계산 (Building.meta에서 가져오기)
 */
export function getBuildingInfo(building: Building) {
  const meta = building.meta;

  // 호수 계산: 코어정보에서 호수를 더하고 제외세대수를 뺀 값
  let calculatedUnits = 0;
  const coreUnits: Array<{ coreNumber: number; units: number }> = [];

  if (meta.unitTypePattern && meta.unitTypePattern.length > 0) {
    // 각 코어별로 호수 계산
    const coreUnitsMap = new Map<number, number>();

    meta.unitTypePattern.forEach(pattern => {
      const coreNum = pattern.coreNumber || 1;
      // 신규 방식: unitCount 사용, 기존 데이터 호환: from/to 사용
      const units = pattern.unitCount ?? (pattern.to && pattern.from ? pattern.to - pattern.from + 1 : 0);

      if (!coreUnitsMap.has(coreNum)) {
        coreUnitsMap.set(coreNum, 0);
      }
      coreUnitsMap.set(coreNum, coreUnitsMap.get(coreNum)! + units);
      calculatedUnits += units;
    });

    // 코어별 호수 배열 생성
    Array.from(coreUnitsMap.entries())
      .sort((a, b) => a[0] - b[0])
      .forEach(([coreNum, units]) => {
        coreUnits.push({ coreNumber: coreNum, units });
      });

    // 제외세대수 빼기 (corePilotisCounts)
    if (meta.floorCount.corePilotisCounts && meta.floorCount.corePilotisCounts.length > 0) {
      const excludedUnits = meta.floorCount.corePilotisCounts.reduce((sum, count) => sum + (count || 0), 0);
      calculatedUnits -= excludedUnits;
    } else if (meta.floorCount.pilotisCount) {
      calculatedUnits -= meta.floorCount.pilotisCount;
    }
  } else {
    // unitTypePattern이 없으면 기존 totalUnits 사용
    calculatedUnits = meta.totalUnits;
  }

  // 코어 개수
  const coreCount = meta.coreCount;

  // 필로티 세대수
  const pilotisCount = meta.floorCount.pilotisCount || 0;

  // 지상층수 계산
  const groundFloors = meta.floorCount.coreGroundFloors
    ? meta.floorCount.coreGroundFloors.reduce((sum, count) => sum + (count || 0), 0)
    : meta.floorCount.ground || 0;

  // 단위세대 구성 문자열 생성 (신규 방식: unitCount 사용)
  const unitComposition = meta.unitTypePattern
    .map(pattern => {
      const coreNum = pattern.coreNumber || 1;
      const unitCount = pattern.unitCount ?? (pattern.to && pattern.from ? pattern.to - pattern.from + 1 : 0);
      const typeLabel = pattern.unitTypes && pattern.unitTypes.length > 0
        ? pattern.unitTypes.filter(Boolean).join('+')
        : pattern.type;
      return `코어${coreNum} ${unitCount}호 ${typeLabel}`;
    })
    .join(', ');

  return {
    totalUnits: calculatedUnits,
    coreCount,
    pilotisCount,
    groundFloors,
    unitComposition,
    coreUnits, // 각 코어별 호수 배열
  };
}

/**
 * Resolves quantity for a building row.
 * Pure function replacement for the per-row `resolveQty` closure in the View.
 */
export function resolveBuildingQty(
  building: Building,
  row: { category: ProcessCategory; floorLabel?: string; floor?: Floor },
  tradeField: TradeFieldKey,
  subField: TradeSubFieldKey,
  firstStandardFloorLabel?: string,
): number {
  if (row.category === '버림' || row.category === '기초') {
    return resolveProcessQuantity(building, {
      tradeField, subField, ratio: 1,
      sourceType: 'category', tradeGroup: row.category,
    });
  }
  if (!row.floorLabel) return 0;

  const rangeFloorId = row.category === '기준층' && row.floor?.floorLabel?.includes('~')
    ? row.floor.id
    : undefined;
  const quantityFloorLabel = (row.category === '옥탑층') && row.floor
    ? row.floor.floorLabel.replace(/코어\d+-/, '')
    : row.floorLabel;

  return resolveProcessQuantity(building, {
    tradeField, subField, ratio: 1, sourceType: 'floor',
  }, quantityFloorLabel, rangeFloorId);
}

// ─── Hook ────────────────────────────────────────────────────────────────────

export function useBuildingProcessPlan(projectId: string) {
  const {
    buildings,
    setBuildings,
    processPlans,
    setProcessPlans,
    expandedModules,
    dirtyBuildings,
    isSaving,
    activeBuildingIndex,
    setActiveBuildingIndex,
    updateProcessPlan,
    updateExpandedModules,
    markDirty,
    saveToLocalStorage,
    discardChanges: discardChangesWithoutConfirm,
    initializePlans,
  } = useProcessPlanState(projectId, {
    processCategories: PROCESS_CATEGORIES,
    defaultProcessTypes: DEFAULT_PROCESS_TYPES,
  });

  const [savedPumpCarCounts, setSavedPumpCarCounts] = useState<Map<string, number>>(new Map());

  // ─── discardChanges wrapper (with confirmation + pumpcar restore) ────────

  const discardChanges = useCallback((buildingId: string) => {
    if (!confirm('변경사항을 취소하시겠습니까?')) return;
    discardChangesWithoutConfirm(buildingId);
    const savedPumpCarCount = savedPumpCarCounts.get(buildingId);
    if (savedPumpCarCount !== undefined) {
      setBuildings(prev =>
        prev.map(building =>
          building.id === buildingId
            ? {
              ...building,
              meta: {
                ...building.meta,
                pumpCarCount: savedPumpCarCount,
              },
            }
            : building
        )
      );
    }
  }, [discardChangesWithoutConfirm, savedPumpCarCounts, setBuildings]);

  // ─── 전역 챗봇과 탭 컨텍스트 동기화 ─────────────────────────────────────

  useSyncTabContext({
    activeBuildingIndex,
    buildings,
    processPlans,
    enabled: buildings.length > 0,
  });

  // ─── Floor extraction memos ──────────────────────────────────────────────

  // 기준층에 해당하는 층 목록 추출 (각 동별로)
  const getStandardFloors = useMemo(() => {
    const map = new Map<string, Floor[]>();
    buildings.forEach(building => {
      const standardFloors = building.floors.filter(f =>
        f.floorClass === '기준층' || f.floorClass === '최상층'
      );
      const individualFloors: Floor[] = [];
      const floorNumberMap = new Map<number, Floor>();

      standardFloors.forEach(floor => {
        const cleanLabel = floor.floorLabel.replace(/코어\d+-/, '');
        const rangeMatch = cleanLabel.match(/(\d+)~(\d+)F/);
        if (rangeMatch) {
          const start = parseInt(rangeMatch[1], 10);
          const end = parseInt(rangeMatch[2], 10);
          for (let i = start; i <= end; i++) {
            if (!floorNumberMap.has(i)) {
              const floorObj = {
                ...floor,
                id: `${floor.id}-${i}`,
                floorLabel: `${i}F`,
                floorNumber: i,
              };
              floorNumberMap.set(i, floorObj);
              individualFloors.push(floorObj);
            }
          }
        } else {
          const numMatch = cleanLabel.match(/(\d+)F/);
          if (numMatch) {
            const floorNum = parseInt(numMatch[1], 10);
            if (!floorNumberMap.has(floorNum)) {
              const floorObj = {
                ...floor,
                id: `${floor.id}-${floorNum}`,
                floorLabel: `${floorNum}F`,
                floorNumber: floorNum,
              };
              floorNumberMap.set(floorNum, floorObj);
              individualFloors.push(floorObj);
            }
          } else {
            const floorNum = floor.floorNumber;
            if (!floorNumberMap.has(floorNum)) {
              floorNumberMap.set(floorNum, floor);
              individualFloors.push(floor);
            }
          }
        }
      });
      individualFloors.sort((a, b) => a.floorNumber - b.floorNumber);
      map.set(building.id, individualFloors);
    });
    return map;
  }, [buildings]);

  // 셋팅층 목록 추출 (각 동별로)
  const getSettingFloors = useMemo(() => {
    const map = new Map<string, Floor[]>();
    buildings.forEach(building => {
      const settingFloors = building.floors
        .filter(f => f.floorClass === '셋팅층')
        .map(floor => {
          const cleanLabel = floor.floorLabel.replace(/코어\d+-/, '');
          return {
            ...floor,
            floorLabel: cleanLabel,
          };
        })
        .sort((a, b) => a.floorNumber - b.floorNumber);
      map.set(building.id, settingFloors);
    });
    return map;
  }, [buildings]);

  // 일반층 목록 추출 (각 동별로)
  const getNormalFloors = useMemo(() => {
    const map = new Map<string, Floor[]>();
    buildings.forEach(building => {
      const normalFloors = building.floors
        .filter(f => f.floorClass === '일반층')
        .map(floor => {
          const cleanLabel = floor.floorLabel.replace(/코어\d+-/, '');
          return {
            ...floor,
            floorLabel: cleanLabel,
          };
        })
        .sort((a, b) => a.floorNumber - b.floorNumber);
      map.set(building.id, normalFloors);
    });
    return map;
  }, [buildings]);

  // 옥탑층 목록 추출 (각 동별로)
  const getPhFloors = useMemo(() => {
    const map = new Map<string, Floor[]>();
    buildings.forEach(building => {
      const phFloors = building.floors
        .filter(f => f.floorClass === '옥탑층')
        .map(floor => {
          const cleanLabel = floor.floorLabel.replace(/코어\d+-/, '');
          return {
            ...floor,
            floorLabel: cleanLabel,
          };
        })
        .sort((a, b) => a.floorNumber - b.floorNumber);
      map.set(building.id, phFloors);
    });
    return map;
  }, [buildings]);

  // ─── loadBuildings ───────────────────────────────────────────────────────

  const loadBuildings = useCallback(async () => {
    try {
      const data = await getBuildings(projectId);
      setBuildings(data);
      setSavedPumpCarCounts(new Map(
        data.map(building => [building.id, building.meta?.pumpCarCount ?? 1])
      ));

      setActiveBuildingIndex(prev => {
        if (data.length > 0 && prev >= data.length) {
          return 0;
        }
        return prev;
      });

      const plans = await initializePlans(data, processPlans);
      setProcessPlans(plans);
    } catch {
      toast.error('동 목록을 불러오는데 실패했습니다.');
    }
  }, [projectId, setBuildings, setActiveBuildingIndex, setProcessPlans, initializePlans, processPlans]);

  // ─── handlePumpCarCountChange ────────────────────────────────────────────

  const handlePumpCarCountChange = useCallback((buildingId: string, rawValue: string) => {
    const parsedValue = rawValue === '' ? 1 : parseInt(rawValue, 10);
    const value = Math.min(2, Math.max(1, Number.isNaN(parsedValue) ? 1 : parsedValue));

    setBuildings(prev =>
      prev.map(building =>
        building.id === buildingId
          ? {
            ...building,
            meta: {
              ...building.meta,
              pumpCarCount: value,
            },
          }
          : building
      )
    );
  }, [setBuildings]);

  // ─── hasPumpCarCountChanges ──────────────────────────────────────────────

  const hasPumpCarCountChanges = useCallback((building: Building) => {
    const savedCount = savedPumpCarCounts.get(building.id);
    if (savedCount === undefined) return false;
    return (building.meta?.pumpCarCount ?? 1) !== savedCount;
  }, [savedPumpCarCounts]);

  // ─── handleSaveAndUpdateDetailProcess ────────────────────────────────────

  const handleSaveAndUpdateDetailProcess = useCallback(async (buildingId: string) => {
    const building = buildings.find(item => item.id === buildingId);
    if (!building) return;

    const hasPumpCarChanges = hasPumpCarCountChanges(building);

    try {
      saveToLocalStorage(buildingId);

      if (hasPumpCarChanges) {
        const nextPumpCarCount = building.meta?.pumpCarCount ?? 1;
        await updateBuilding(buildingId, projectId, {
          meta: {
            ...building.meta,
            pumpCarCount: nextPumpCarCount,
          },
        });
        setSavedPumpCarCounts(prev => {
          const next = new Map(prev);
          next.set(buildingId, nextPumpCarCount);
          return next;
        });
      }

      if (hasPumpCarChanges) {
        await loadBuildings();
      }
    } catch {
      toast.error('저장 및 세부공정 업데이트에 실패했습니다.');
    }
  }, [
    buildings,
    hasPumpCarCountChanges,
    loadBuildings,
    projectId,
    saveToLocalStorage,
  ]);

  // ─── Floor days calculators ──────────────────────────────────────────────

  const calculateBasementFloorDays = (
    building: Building,
    category: ProcessCategory,
    processType: ProcessType,
    floorLabel: string
  ): number => {
    const mod = getProcessModule(category, processType);
    if (!mod || !mod.items.length) return 0;
    return calculateModuleWorkDaysForFloor(building, mod, category, floorLabel);
  };

  const calculatePhFloorDays = (
    building: Building,
    category: ProcessCategory,
    processType: ProcessType,
    floorLabel: string
  ): number => {
    const mod = getProcessModule(category, processType);
    if (!mod || !mod.items.length) return 0;
    return calculateModuleWorkDaysForFloor(building, mod, category, floorLabel);
  };

  const calculateStandardFloorDays = (
    building: Building,
    category: ProcessCategory,
    processType: ProcessType,
    floorLabel: string
  ): number => {
    const mod = getProcessModule(category, processType);
    if (!mod || !mod.items.length) return 0;
    return calculateModuleWorkDaysForFloor(building, mod, category, floorLabel);
  };

  const calculateSettingFloorDays = (
    building: Building,
    category: ProcessCategory,
    processType: ProcessType,
    floorLabel: string
  ): number => {
    const mod = getProcessModule(category, processType);
    if (!mod || !mod.items.length) return 0;
    return calculateModuleWorkDaysForFloor(building, mod, category, floorLabel);
  };

  const calculateNormalFloorDays = (
    building: Building,
    category: ProcessCategory,
    processType: ProcessType,
    floorLabel: string
  ): number => {
    const mod = getProcessModule(category, processType);
    if (!mod || !mod.items.length) return 0;
    return calculateModuleWorkDaysForFloor(building, mod, category, floorLabel);
  };

  // ─── calculateTotalDays ──────────────────────────────────────────────────

  const calculateTotalDays = useCallback((processes: BuildingProcessPlan['processes'], building?: Building): number => {
    let total = 0;
    PROCESS_CATEGORIES.forEach(category => {
      if (category === '옥탑층' && building) {
        const phFloors = getPhFloors.get(building.id) || [];
        phFloors.forEach(floor => {
          const floorProcessType = processes[category]?.floors?.[floor.floorLabel]?.processType || processes[category]?.processType || DEFAULT_PROCESS_TYPES[category];
          const floorDays = calculatePhFloorDays(building, category, floorProcessType, floor.floorLabel);
          total += floorDays;
        });
      } else if (category === '기준층' && building) {
        const standardFloors = getStandardFloors.get(building.id) || [];
        const processType = processes[category]?.processType || DEFAULT_PROCESS_TYPES[category];
        standardFloors.forEach(floor => {
          const floorDays = calculateStandardFloorDays(building, category, processType, floor.floorLabel);
          total += floorDays;
        });
      } else if (category === '셋팅층' && building) {
        const settingFloors = getSettingFloors.get(building.id) || [];
        const processType = processes[category]?.processType || DEFAULT_PROCESS_TYPES[category];
        settingFloors.forEach(floor => {
          const floorDays = calculateSettingFloorDays(building, category, processType, floor.floorLabel);
          total += floorDays;
        });
      } else if (category === '일반층' && building) {
        const normalFloors = getNormalFloors.get(building.id) || [];
        const processType = processes[category]?.processType || DEFAULT_PROCESS_TYPES[category];
        normalFloors.forEach(floor => {
          total += calculateNormalFloorDays(building, category, processType, floor.floorLabel);
        });
      } else {
        const days = processes[category]?.days;
        if (days !== undefined && days !== null && !isNaN(days)) {
          total += days;
        }
      }
    });
    return total;
  }, [getPhFloors, getStandardFloors, getSettingFloors, getNormalFloors]);

  // ─── Initial load ────────────────────────────────────────────────────────

  useEffect(() => {
    loadBuildings();
  }, [loadBuildings]);

  // ─── floorTradesHash for auto-calculation ────────────────────────────────

  const floorTradesHash = useMemo(() => {
    return buildings
      .flatMap(b => b.floorTrades || [])
      .map(ft => `${ft.id}-${ft.tradeGroup}-${JSON.stringify(ft.trades)}`)
      .join('|');
  }, [buildings]);

  // ─── Auto-calculation useEffect ──────────────────────────────────────────

  useEffect(() => {
    if (buildings.length === 0) return;

    buildings.forEach(building => {
      PROCESS_CATEGORIES.forEach(category => {
        const plan = processPlans.get(building.id);
        if (!plan) return;

        const processType = plan.processes[category]?.processType || DEFAULT_PROCESS_TYPES[category];
        const mod = getProcessModule(category, processType);

        if (!mod || mod.items.length === 0) return;

        const sumDays = calculateModuleWorkDays(building, mod, category);

        const currentDays = plan.processes[category]?.days || 0;
        if (sumDays !== currentDays) {
          setProcessPlans(prevPlans => {
            const prevPlan = prevPlans.get(building.id);
            if (!prevPlan) return prevPlans;

            const updatedPlan = {
              ...prevPlan,
              processes: {
                ...prevPlan.processes,
                [category]: {
                  ...prevPlan.processes[category],
                  days: Math.floor(sumDays),
                },
              },
            };
            updatedPlan.totalDays = calculateTotalDays(updatedPlan.processes, building);

            const newPlans = new Map(prevPlans);
            newPlans.set(building.id, updatedPlan);
            return newPlans;
          });
        }
      });
    });
  }, [
    floorTradesHash,
    processPlans.size,
    buildings,
    processPlans,
    calculateTotalDays,
    setProcessPlans,
  ]);

  // ─── handleUpdateBuildingName ────────────────────────────────────────────

  const handleUpdateBuildingName = useCallback(async (buildingId: string, newName: string) => {
    try {
      await updateBuilding(buildingId, projectId, { buildingName: newName });
      await loadBuildings();
      toast.success('동 이름이 변경되었습니다.');
    } catch (error) {
      toast.error('동 이름 변경에 실패했습니다.');
      throw error;
    }
  }, [projectId, loadBuildings]);

  // ─── handleDeleteBuilding ────────────────────────────────────────────────

  const handleDeleteBuilding = useCallback(async (buildingId: string, index: number) => {
    if (!window.confirm('정말 이 동을 삭제하시겠습니까?')) {
      return;
    }

    try {
      await deleteBuilding(buildingId, projectId);

      setProcessPlans(prevPlans => {
        const newPlans = new Map(prevPlans);
        newPlans.delete(buildingId);
        return newPlans;
      });

      await loadBuildings();

      setActiveBuildingIndex(prev => {
        if (index === prev) {
          return 0;
        } else if (index < prev) {
          return prev - 1;
        }
        return prev;
      });

      toast.success('동이 삭제되었습니다.');
    } catch {
      toast.error('동 삭제에 실패했습니다.');
    }
  }, [projectId, loadBuildings, setProcessPlans, setActiveBuildingIndex]);

  // ─── handleReorder ───────────────────────────────────────────────────────

  const handleReorder = useCallback(async (fromIndex: number, toIndex: number) => {
    try {
      await reorderBuildings(projectId, fromIndex, toIndex);

      setActiveBuildingIndex(prev => {
        if (prev === fromIndex) {
          return toIndex;
        } else if (prev === toIndex) {
          return fromIndex;
        } else if (prev > fromIndex && prev <= toIndex) {
          return prev - 1;
        } else if (prev < fromIndex && prev >= toIndex) {
          return prev + 1;
        }
        return prev;
      });

      await loadBuildings();
    } catch {
      toast.error('동 순서 변경에 실패했습니다.');
    }
  }, [projectId, loadBuildings, setActiveBuildingIndex]);

  // ─── handleProcessTypeChange ─────────────────────────────────────────────

  const handleProcessTypeChange = (buildingId: string, category: ProcessCategory, processType: ProcessType, floorLabel?: string) => {
    const plan = processPlans.get(buildingId);
    if (!plan) return;

    const building = buildings.find(b => b.id === buildingId);
    if (!building) return;

    // 지하층나 옥탑층, 일반층의 경우 층별로 저장
    if ((category === '주동 지하층' || category === '옥탑층' || category === '일반층') && floorLabel) {
      const updatedPlan = {
        ...plan,
        processes: {
          ...plan.processes,
          [category]: {
            ...plan.processes[category],
            processType: plan.processes[category]?.processType || DEFAULT_PROCESS_TYPES[category],
            days: plan.processes[category]?.days || 0,
            floors: {
              ...plan.processes[category]?.floors,
              [floorLabel]: { processType },
            },
          },
        },
      };

      updatedPlan.totalDays = calculateTotalDays(updatedPlan.processes, building);
      updateProcessPlan(buildingId, updatedPlan);
      markDirty(buildingId);
    } else {
      const mod = getProcessModule(category, processType);

      const sumDays = mod ? calculateModuleWorkDays(building, mod, category) : 0;

      const updatedPlan = {
        ...plan,
        processes: {
          ...plan.processes,
          [category]: {
            ...plan.processes[category],
            processType,
            days: Math.floor(sumDays),
          },
        },
      };

      updatedPlan.totalDays = calculateTotalDays(updatedPlan.processes, building);
      updateProcessPlan(buildingId, updatedPlan);
      markDirty(buildingId);
    }

    // 모듈 변경 시 자동으로 확장
    const expanded = expandedModules.get(buildingId) || new Set<string>();
    const newExpanded = new Set(expanded);
    newExpanded.add(category);
    updateExpandedModules(buildingId, newExpanded);
  };

  // ─── getProcessTypeForFloor ──────────────────────────────────────────────

  const getProcessTypeForFloor = useCallback((plan: BuildingProcessPlan | undefined, category: ProcessCategory, floorLabel: string): ProcessType => {
    if (!plan) return DEFAULT_PROCESS_TYPES[category];

    const categoryProcess = plan.processes[category];
    if (!categoryProcess) return DEFAULT_PROCESS_TYPES[category];

    // 지하층나 옥탑층, 일반층의 경우 층별 processType 확인
    if ((category === '주동 지하층' || category === '옥탑층' || category === '일반층') && categoryProcess.floors) {
      if (categoryProcess.floors[floorLabel]) {
        return categoryProcess.floors[floorLabel].processType;
      }
    }

    // 기본 processType 반환
    return categoryProcess.processType || DEFAULT_PROCESS_TYPES[category];
  }, []);

  // ─── activeBuilding ──────────────────────────────────────────────────────

  const activeBuilding = buildings.length > 0 && activeBuildingIndex < buildings.length
    ? buildings[activeBuildingIndex]
    : null;

  // ─── maxFloorNumber ──────────────────────────────────────────────────────

  const maxFloorNumber = useMemo(() => {
    if (!activeBuilding) return undefined;
    const aboveGroundFloors = activeBuilding.floors
      .filter(f => f.levelType === '지상' && f.floorClass !== '옥탑층')
      .map(f => {
        const rangeMatch = f.floorLabel.match(/(\d+)~(\d+)F/);
        if (rangeMatch) return parseInt(rangeMatch[2], 10);
        const match = f.floorLabel.match(/(\d+)F/);
        return match ? parseInt(match[1], 10) : f.floorNumber;
      });
    return aboveGroundFloors.length > 0 ? Math.max(...aboveGroundFloors) : undefined;
  }, [activeBuilding]);

  // ─── processRows ─────────────────────────────────────────────────────────

  const processRows = useMemo(() => createBuildingProcessRows(activeBuilding), [activeBuilding]);

  // ─── handleItemDirectWorkDaysChange ──────────────────────────────────────

  const handleItemDirectWorkDaysChange = useCallback((
    building: Building,
    itemKey: string,
    value: number | null
  ) => {
    const plan = processPlans.get(building.id);
    if (!plan) return;

    // 기존 오버라이드 맵 복사
    const updatedOverrides = { ...plan.itemDirectWorkDaysOverrides };

    // null이면 삭제, 아니면 업데이트
    if (value === null) {
      delete updatedOverrides[itemKey];
    } else {
      updatedOverrides[itemKey] = value;
    }

    // itemKey에서 category와 floorLabel 추출
    const [category] = itemKey.split('-');
    const categoryKey = category as ProcessCategory;

    // 현재 동의 확장된 모듈 가져오기
    const isDetailExpanded = expandedModules.get(building.id) || new Set<string>();

    // 확장된 행 찾기
    const expandedRow = processRows.find((col) => {
      const expandKey = col.floorLabel
        ? `${col.category}-${col.floorLabel}`
        : col.category === '기준층'
          ? '기준층-세부공정'
          : col.category;
      return isDetailExpanded.has(expandKey);
    });

    const expandedEffectiveCategory = expandedRow?.category || categoryKey;

    const colProcessType = expandedRow?.floorLabel && (expandedRow.category === '주동 지하층' || expandedRow.category === '옥탑층' || expandedRow.category === '일반층')
      ? getProcessTypeForFloor(plan, expandedRow.category, expandedRow.floorLabel)
      : plan?.processes[(expandedRow?.category || categoryKey) as keyof typeof plan.processes]?.processType || DEFAULT_PROCESS_TYPES[(expandedRow?.category || categoryKey) as keyof typeof DEFAULT_PROCESS_TYPES];
    const colModule = getProcessModule(expandedEffectiveCategory, colProcessType);

    // 순작업일 합계 재계산
    let sumDirectDays = 0;
    if (expandedRow?.category === '버림' || expandedRow?.category === '기초') {
      colModule?.items.forEach(moduleItem => {
        const moduleItemKey = `${expandedRow.category}-${expandedRow.floorLabel || ''}-${moduleItem.id}`;
        const overriddenDays = updatedOverrides[moduleItemKey];

        if (overriddenDays !== undefined) {
          sumDirectDays += overriddenDays;
          return;
        }

        let quantity = 0;

        if (moduleItem.quantityReference) {
          const ref = moduleItem.quantityRef ?? parseLegacyReference(moduleItem.quantityReference, expandedRow.category);
          if (ref) {
            quantity = resolveProcessQuantity(building, ref);
          }
        }

        sumDirectDays += calculateItemDirectWorkDays({
          item: moduleItem,
          quantity,
          maxPumpCarCount: building.meta?.pumpCarCount || 2,
        });
      });
    } else if (expandedRow?.floorLabel) {
      const firstStandardFloorLabel = processRows.find(
        (r) => r.category === '기준층' && r.floorLabel
      )?.floorLabel;
      const calculationFloorLabel = expandedRow.category === '기준층'
        ? firstStandardFloorLabel || expandedRow.floorLabel
        : expandedRow.floorLabel;

      const floorItems = colModule?.items.filter((moduleItem) =>
        isProcessItemMatchedToBuildingRow(moduleItem, expandedRow, firstStandardFloorLabel)
      ) || [];

      floorItems.forEach(moduleItem => {
        let moduleItemKey: string;
        let overriddenDays: number | undefined;

        if (expandedRow.category === '기준층') {
          const currentFloorKey = `기준층-${expandedRow.floorLabel}-${moduleItem.id}`;
          overriddenDays = updatedOverrides[currentFloorKey];
          if (overriddenDays === undefined) {
            if (firstStandardFloorLabel) {
              const firstStandardFloorKey = `기준층-${firstStandardFloorLabel}-${moduleItem.id}`;
              overriddenDays = updatedOverrides[firstStandardFloorKey];
            }
          }
          moduleItemKey = currentFloorKey;
        } else {
          moduleItemKey = `${expandedRow.category}-${expandedRow.floorLabel || ''}-${moduleItem.id}`;
          overriddenDays = updatedOverrides[moduleItemKey];
        }

        if (overriddenDays !== undefined) {
          sumDirectDays += overriddenDays;
          return;
        }

        let quantity = 0;

        if (moduleItem.quantityReference) {
          const ref = moduleItem.quantityRef ?? parseLegacyReference(moduleItem.quantityReference, expandedRow.category);
          if (ref) {
            const effectiveFloorLabel = expandedRow.category === '기준층' ? calculationFloorLabel : expandedRow.floorLabel;
            const rangeFloorId = expandedRow.category === '기준층' && expandedRow.floor?.floorLabel?.includes('~')
              ? expandedRow.floor.id : undefined;
            quantity = resolveProcessQuantity(building, ref, effectiveFloorLabel, rangeFloorId);
          }
        }

        sumDirectDays += calculateItemDirectWorkDays({
          item: moduleItem,
          quantity,
          maxPumpCarCount: building.meta?.pumpCarCount || 2,
        });
      });
    }

    // 기준층인 경우 순작업일 합계에 따라 공정타입 자동 변경
    const targetCategory = expandedRow?.category || categoryKey;
    const previousProcessType = plan.processes[targetCategory as keyof typeof plan.processes]?.processType || DEFAULT_PROCESS_TYPES[targetCategory as keyof typeof DEFAULT_PROCESS_TYPES];
    let newProcessType = previousProcessType;

    if (targetCategory === '기준층') {
      newProcessType = '표준공정';
    }

    // processPlans의 해당 구분의 days 업데이트
    const updatedPlan = {
      ...plan,
      itemDirectWorkDaysOverrides: updatedOverrides,
      processes: {
        ...plan.processes,
        [targetCategory]: {
          ...plan.processes[targetCategory as keyof typeof plan.processes],
          days: sumDirectDays,
          processType: newProcessType,
        },
      },
    };

    // totalDays 재계산
    updatedPlan.totalDays = calculateTotalDays(updatedPlan.processes, building);

    updateProcessPlan(building.id, updatedPlan);
    markDirty(building.id);
  }, [processPlans, processRows, expandedModules, getProcessTypeForFloor, calculateTotalDays, updateProcessPlan, markDirty]);

  // ─── processColumns ──────────────────────────────────────────────────────

  const processColumns = useMemo(() => {
    if (!activeBuilding) return [];
    return [{ category: '버림' as ProcessCategory, colIndex: 0 }];
  }, [activeBuilding]);

  // ─── Return ──────────────────────────────────────────────────────────────

  return {
    // Building state
    buildings,
    activeBuilding,
    activeBuildingIndex,
    setActiveBuildingIndex,
    // Process plan state
    processPlans,
    expandedModules,
    dirtyBuildings,
    isSaving,
    // Building operations
    handleDeleteBuilding,
    handleUpdateBuildingName,
    handleReorder,
    // Process plan operations
    handleProcessTypeChange,
    handleItemDirectWorkDaysChange,
    handlePumpCarCountChange,
    handleSaveAndUpdateDetailProcess,
    hasPumpCarCountChanges,
    discardChanges,
    saveToLocalStorage,
    updateProcessPlan,
    updateExpandedModules,
    markDirty,
    // Derived data
    processRows,
    processColumns,
    maxFloorNumber,
    // Helpers
    getProcessTypeForFloor,
    // Constants
    PROCESS_TYPE_OPTIONS,
    DEFAULT_PROCESS_TYPES,
  };
}
