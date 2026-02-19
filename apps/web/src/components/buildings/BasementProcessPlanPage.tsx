'use client';

import { Fragment, useEffect, useMemo, useCallback } from 'react';
import { Card, CardContent, Input } from '@/components/ui';
import { SaveStatusBar } from './SaveStatusBar';
import type { Building, BuildingProcessPlan, ProcessCategory, ProcessType, Floor } from '@/lib/types';
import type { TradeFieldKey, TradeSubFieldKey } from '@/lib/types/process-quantity';
import { getBuildings, deleteBuilding, updateBuilding, reorderBuildings } from '@/lib/services/buildings';
import { toast } from 'sonner';
import { ChevronDown, ChevronUp, Building2 } from 'lucide-react';
import { BuildingTabs } from './BuildingTabs';
import {
  ProcessDetailPanel,
  ProcessPlanDetailCard,
  ProcessPlanTable,
  ProcessPlanTableRow,
  ProcessPlanSidePanel,
} from './process-plan';
import { getProcessModule } from '@/lib/data/process-modules';
import { resolveProcessQuantity, getSpecialRowDeductions, resolveWithDeduction } from '@/lib/utils/process-quantity-resolver';
import { parseLegacyReference } from '@/lib/utils/quantity-reference-migration';

import { getCellReferenceForRow } from '@/lib/utils/process-cell-reference';
import { calculateModuleWorkDays, calculateModuleWorkDaysForFloor, calculateModuleIndirectDaysForFloor, calculateModuleIndirectDays } from '@/lib/utils/process-days-calculator';
import { useProcessPlanState } from './hooks/useProcessPlanState';
import { calculateItemDirectWorkDays } from './process-plan/utils/calculateItemDirectWorkDays';
import { createBasementProcessRows } from './process-plan/utils/createBasementProcessRows';
import {
  getBasementRowCategoryLabel,
  getBasementRowFloorNumberLabel,
} from './process-plan/utils/processRowHelpers';

interface Props {
  projectId: string;
}

// 공정 구분 목록 (지하층 공정계획: 버림, 기초, 주동 지하층만)
const PROCESS_CATEGORIES: ProcessCategory[] = ['버림', '기초', '주동 지하층'];

// 공정 타입 옵션 (구분별로 다름) - 지하층 공정계획용
const PROCESS_TYPE_OPTIONS: Partial<Record<ProcessCategory, ProcessType[]>> = {
  '버림': ['표준공정'],
  '기초': ['표준공정'],
  '주동 지하층': ['표준공정'],
  '지하층(층고6.5m이상)': ['표준공정'],
  '지하주차장': ['표준공정'],
};

// 기본 공정 타입 - 지하층 공정계획은 버림, 기초, 주동 지하층만 사용
const DEFAULT_PROCESS_TYPES: Partial<Record<ProcessCategory, ProcessType>> = {
  '버림': '표준공정',
  '기초': '표준공정',
  '주동 지하층': '표준공정',
  '지하층(층고6.5m이상)': '표준공정',
  '지하주차장': '표준공정',
};

// 특수 행 필드 → floorTrade 필드 매핑 (resolveProcessQuantity 호출용)
const SPECIAL_FIELD_TO_TRADE: Record<
  'gangForm' | 'alForm' | 'formwork' | 'rebar' | 'concrete',
  { tradeField: 'gangForm' | 'alForm' | 'euroForm' | 'rebar' | 'concrete'; subField: TradeSubFieldKey }
> = {
  gangForm: { tradeField: 'gangForm', subField: 'areaM2' },
  alForm: { tradeField: 'alForm', subField: 'areaM2' },
  formwork: { tradeField: 'euroForm', subField: 'areaM2' },   // UI: formwork → data: euroForm
  rebar: { tradeField: 'rebar', subField: 'ton' },
  concrete: { tradeField: 'concrete', subField: 'volumeM3' },
};

export function BasementProcessPlanPage({ projectId }: Props) {
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

  const discardChanges = useCallback((buildingId: string) => {
    if (!confirm('변경사항을 취소하시겠습니까?')) return;
    discardChangesWithoutConfirm(buildingId);
  }, [discardChangesWithoutConfirm]);

  // 지하층 공정계획에서는 기준층을 사용하지 않음 (BuildingProcessPlanPage에서 처리)

  // 지하층 목록 추출 (각 동별로) - 동기본정보 페이지의 층설정 데이터 기반
  const getBasementFloors = useMemo(() => {
    const map = new Map<string, Floor[]>();
    buildings.forEach(building => {
      // 동기본정보 페이지의 층설정 데이터(building.floors)에서 지하층 추출
      const basementFloors = building.floors
        .filter(f => f.levelType === '지하')
        .map(floor => {
          // 코어 정보 제거 (예: "코어1-B1" -> "B1")
          const cleanLabel = floor.floorLabel.replace(/코어\d+-/, '');
          return {
            ...floor,
            floorLabel: cleanLabel,
          };
        })
        .sort((a, b) => a.floorNumber - b.floorNumber); // B2, B1 순서
      map.set(building.id, basementFloors);
    });
    return map;
  }, [buildings]);

  // 지하층 공정계획에서는 셋팅층과 일반층을 사용하지 않음 (BuildingProcessPlanPage에서 처리)

  // 지하층 공정계획에서는 옥탑층을 사용하지 않음 (BuildingProcessPlanPage에서 처리)

  const loadBuildings = useCallback(async () => {
    try {
      const data = await getBuildings(projectId);
      setBuildings(data);

      // activeBuildingIndex가 범위를 벗어나면 조정
      setActiveBuildingIndex(prev => {
        if (data.length > 0 && prev >= data.length) {
          return 0;
        }
        return prev;
      });

      setProcessPlans(prevPlans => initializePlans(data, prevPlans));
    } catch {
      toast.error('동 목록을 불러오는데 실패했습니다.');
    }
  }, [projectId, setBuildings, setActiveBuildingIndex, setProcessPlans, initializePlans]);

  // 합계일수 계산 - 모든 공정 카테고리의 일수 합계
  const calculateTotalDays = useCallback((processes: BuildingProcessPlan['processes'], building?: Building): number => {
    let total = 0;
    // 모든 공정 카테고리의 일수를 합산
    PROCESS_CATEGORIES.forEach(category => {
      if (category === '주동 지하층' && building) {
        // 주동 지하층는 각 층별 일수를 합산
        const basementFloors = getBasementFloors.get(building.id) || [];
        // 일반 지하층은 항상 표준공정 사용
        basementFloors.forEach(floor => {
          const floorProcessType = processes[category]?.floors?.[floor.floorLabel]?.processType || processes[category]?.processType || DEFAULT_PROCESS_TYPES[category] || '표준공정';
          const mod = getProcessModule(category, floorProcessType);
          if (!mod || !mod.items.length) return;
          const floorDays = calculateModuleWorkDaysForFloor(building, mod, category, floor.floorLabel);
          total += floorDays;
        });
        // 지하층 공정계획에서는 옥탑층, 기준층, 셋팅층을 처리하지 않음
      } else {
        const days = processes[category]?.days;
        if (days !== undefined && days !== null && !isNaN(days)) {
          total += days;
        }
      }
    });
    return total;
  }, [getBasementFloors]);

  // 동 목록 로드
  useEffect(() => {
    loadBuildings();
  }, [loadBuildings]);

  // 🔥 Stage 1 Optimization: Memoize floorTrades hash to avoid JSON.stringify on every render
  const floorTradesHash = useMemo(() => {
    return buildings
      .flatMap(b => b.floorTrades || [])
      .map(ft => `${ft.id}-${ft.tradeGroup}-${JSON.stringify(ft.trades)}`)
      .join('|');
  }, [buildings]);

  // 🎯 Stage 2 Task 5: Simplified auto-calculation using calculateModuleWorkDays utility
  // 물량 데이터 또는 processPlans 변경 시 자동으로 일수 계산
  useEffect(() => {
    if (buildings.length === 0) return;

    buildings.forEach(building => {
      PROCESS_CATEGORIES.forEach(category => {
        const plan = processPlans.get(building.id);
        if (!plan) return;

        const processType = plan.processes[category]?.processType || DEFAULT_PROCESS_TYPES[category] || '표준공정';
        const mod = getProcessModule(category, processType);

        if (!mod || mod.items.length === 0) return;

        // 🎯 Stage 2 Task 5: Use unified calculation utility (replaces 40+ lines of duplicate code)
        const sumDays = calculateModuleWorkDays(building, mod, category);

        // 계산된 일수로 업데이트 (기존 일수와 다를 때만)
        const currentDays = plan.processes[category]?.days || 0;
        if (sumDays !== currentDays) {
          // 🔥 Stage 1 Optimization: More efficient Map update without full copy
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

      // 특수 카테고리 자동 계산 및 plan.processes에 저장
      (['지하주차장', '지하층(층고6.5m이상)'] as ProcessCategory[]).forEach(specialCat => {
        const plan = processPlans.get(building.id);
        if (!plan) return;

        const processType = plan.processes[specialCat]?.processType
          || DEFAULT_PROCESS_TYPES[specialCat] || '표준공정';
        const mod = getProcessModule(specialCat, processType);
        if (!mod || !mod.items.length) return;

        let computedDays = 0;
        if (specialCat === '지하주차장') {
          // 각 지하층별 주차장 일수 합산
          const basementFloors = getBasementFloors.get(building.id) || [];
          basementFloors.forEach(floor => {
            computedDays += calculateModuleWorkDaysForFloor(
              building, mod, specialCat, floor.floorLabel
            );
          });
        } else {
          // 지하층(층고6.5m이상): 전체 모듈 일수
          computedDays = calculateModuleWorkDays(building, mod, specialCat);
        }

        const finalDays = Math.floor(computedDays);
        const currentDays = plan.processes[specialCat]?.days || 0;

        if (finalDays !== currentDays && finalDays > 0) {
          setProcessPlans(prevPlans => {
            const prevPlan = prevPlans.get(building.id);
            if (!prevPlan) return prevPlans;
            const updatedPlan = {
              ...prevPlan,
              processes: {
                ...prevPlan.processes,
                [specialCat]: {
                  ...(prevPlan.processes[specialCat] || {}),
                  days: finalDays,
                  processType,
                },
              },
            };
            const newPlans = new Map(prevPlans);
            newPlans.set(building.id, updatedPlan);
            return newPlans;
          });
        }
      });
    });
  }, [
    floorTradesHash, // 🔥 Stage 1: Use memoized hash instead of JSON.stringify
    processPlans.size, // processPlans 변경 감지 (셀렉트박스 변경 시)
    buildings,
    processPlans,
    getBasementFloors,
    calculateTotalDays,
    setProcessPlans,
  ]);

  // 동 이름 변경
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

  // 동 삭제
  const handleDeleteBuilding = useCallback(async (buildingId: string, index: number) => {
    if (!window.confirm('정말 이 동을 삭제하시겠습니까?')) {
      return;
    }

    try {
      await deleteBuilding(buildingId, projectId);

      // 삭제된 동의 processPlan도 제거
      setProcessPlans(prevPlans => {
        const newPlans = new Map(prevPlans);
        newPlans.delete(buildingId);
        return newPlans;
      });

      await loadBuildings();

      // 삭제된 동이 현재 활성 탭이면 첫 번째로 이동
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

  // 동 순서 변경
  const handleReorder = useCallback(async (fromIndex: number, toIndex: number) => {
    try {
      await reorderBuildings(projectId, fromIndex, toIndex);

      // 활성 탭 인덱스 업데이트
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

  // 공정 타입 변경
  const handleProcessTypeChange = (buildingId: string, category: ProcessCategory, processType: ProcessType, floorLabel?: string) => {
    const plan = processPlans.get(buildingId);
    if (!plan) return;

    const building = buildings.find(b => b.id === buildingId);
    if (!building) return;

    // 주동 지하층/지하주차장/지하층(6.5m이상)의 경우 층별로 저장
    if ((category === '주동 지하층' || category === '지하주차장' || category === '지하층(층고6.5m이상)') && floorLabel) {
      // 주차장이나 6.5m이상인 경우, 해당 지하층의 공정타입도 함께 업데이트
      let targetFloorLabel = floorLabel;
      const parkingMatch = floorLabel.match(/^(B\d+)\s+주차장/);
      const consolidatedMatch = floorLabel.match(/^B1\+B2\s+통합/);

      if (parkingMatch) {
        targetFloorLabel = parkingMatch[1];
      } else if (consolidatedMatch) {
        // B1+B2 통합인 경우 그대로 사용
        targetFloorLabel = floorLabel;
      }

      const updatedPlan = {
        ...plan,
        processes: {
          ...plan.processes,
          [category]: {
            ...plan.processes[category],
            processType: plan.processes[category]?.processType || DEFAULT_PROCESS_TYPES[category] || '표준공정',
            days: plan.processes[category]?.days || 0,
            floors: {
              ...plan.processes[category]?.floors,
              [targetFloorLabel]: { processType },
            },
          },
        },
      };

      // 합계일수 재계산
      updatedPlan.totalDays = calculateTotalDays(updatedPlan.processes, building);
      updateProcessPlan(buildingId, updatedPlan); // 🔥 Stage 1: Use helper function
    } else {
      // 기존 로직 (카테고리 전체에 대한 공정 변경)
      // 새로운 모듈 가져오기
      const mod = getProcessModule(category, processType);

      // 일수 재계산 (순작업일 합계)
      let sumDays = 0;
      if (mod && mod.items.length > 0) {
        mod.items.forEach(item => {
          const ref = item.quantityReference
            ? item.quantityRef ?? parseLegacyReference(item.quantityReference, category)
            : null;
          const quantity = ref ? resolveProcessQuantity(building, ref) : 0;
          sumDays += calculateItemDirectWorkDays({ item, quantity, useEquipmentFormula: false });
        });
      }

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

      // 합계일수 재계산
      updatedPlan.totalDays = calculateTotalDays(updatedPlan.processes, building);
      updateProcessPlan(buildingId, updatedPlan); // 🔥 Stage 1: Use helper function
    }

    // 모듈 변경 시 자동으로 확장
    const expanded = expandedModules.get(buildingId) || new Set<string>();
    const newExpanded = new Set(expanded);
    newExpanded.add(category);
    updateExpandedModules(buildingId, newExpanded); // 🔥 Stage 1: Use helper function
  };

  // 각 층별 processType을 가져오는 헬퍼 함수
  const getProcessTypeForFloor = (plan: BuildingProcessPlan | undefined, category: ProcessCategory, floorLabel: string): ProcessType => {
    if (!plan) return DEFAULT_PROCESS_TYPES[category] || '표준공정';

    const categoryProcess = plan.processes[category];
    if (!categoryProcess) return DEFAULT_PROCESS_TYPES[category] || '표준공정';

    // 지하층/지하주차장/6.5m이상의 경우 층별 processType 확인
    if ((category === '주동 지하층' || category === '지하주차장' || category === '지하층(층고6.5m이상)') && categoryProcess.floors) {
      if (categoryProcess.floors[floorLabel]) {
        return categoryProcess.floors[floorLabel].processType;
      }
    }

    // 기본 processType 반환
    return categoryProcess.processType || DEFAULT_PROCESS_TYPES[category] || '표준공정';
  };

  // 특수 행(주차장, 6.5m이상) 활성화 여부 체크 - 물량이 하나라도 0보다 크면 활성화
  const isSpecialRowActive = (buildingId: string, floorLabel: string): boolean => {
    const plan = processPlans.get(buildingId);
    const quantities = plan?.specialRowQuantities?.[floorLabel];
    if (!quantities) return false;
    return Object.values(quantities).some(v => v !== undefined && v > 0);
  };

  // 지하층(6.5m이상) 활성화 여부 체크 - B1/B2 합산 물량이 0보다 크면 활성화
  const isHighCeilingActive = (buildingId: string): boolean => {
    return isSpecialRowActive(buildingId, 'B1 6.5m이상') || isSpecialRowActive(buildingId, 'B2 6.5m이상');
  };

  // 지하층 각 층별 일수 계산 (통합 유틸 사용)
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

  // 지하층 공정계획에서는 옥탑층 일수 계산 함수를 사용하지 않음 (BuildingProcessPlanPage에서 처리)

  // 지하층 공정계획에서는 기준층과 셋팅층 일수 계산 함수를 사용하지 않음 (BuildingProcessPlanPage에서 처리)

  // 세부공정 항목별 순작업일 변경 핸들러 (ProcessDetailPanel에 전달용)
  const handleItemDirectWorkDaysChange = useCallback((
    buildingId: string,
    itemKey: string,
    newValue: number | null
  ) => {
    const currentPlan = processPlans.get(buildingId);
    if (!currentPlan) return;

    // itemKey에서 정보 추출: "category-floorLabel-itemId"
    const parts = itemKey.split('-');
    const category = parts[0] as ProcessCategory;
    const floorLabel = parts.slice(1, -1).join('-'); // 중간 부분이 floorLabel (비어있을 수 있음)

    const updatedOverrides = {
      ...(currentPlan.itemDirectWorkDaysOverrides || {}),
      [itemKey]: newValue !== null && newValue > 0 ? newValue : undefined,
    };

    // undefined 값 제거
    const cleanedOverrides: Record<string, number> = {};
    Object.keys(updatedOverrides).forEach(key => {
      const value = updatedOverrides[key];
      if (value !== undefined) {
        cleanedOverrides[key] = value;
      }
    });

    // 순작업일 합계 재계산
    let sumDirectDays = 0;
    const building = buildings.find(b => b.id === buildingId);
    if (!building) return;

    // 주차장이나 3단 가시설, 6.5m이상인지 확인
    const isParking = floorLabel.includes('주차장');
    const isFacility = floorLabel.includes('3단 가시설 적용부');
    const isHighCeiling = floorLabel.includes('6.5m이상');
    const isSpecialRow = isParking || isFacility || isHighCeiling;

    // floorLabel에서 지하층 정보 추출
    const floorMatch = floorLabel.match(/^(B\d+)/);
    const targetFloorLabel = isSpecialRow && floorMatch ? floorMatch[1] : floorLabel;

    // processType 결정
    const processType = floorLabel && (category === '주동 지하층' || category === '지하주차장' || category === '지하층(층고6.5m이상)')
      ? getProcessTypeForFloor(currentPlan, category, targetFloorLabel || floorLabel)
      : currentPlan?.processes[category]?.processType || DEFAULT_PROCESS_TYPES[category] || '표준공정';
    const mod = getProcessModule(category, processType);

    if (mod && mod.items) {
      if (category === '버림' || category === '기초') {
        mod.items.forEach(moduleItem => {
          const moduleItemKey = `${category}-${floorLabel}-${moduleItem.id}`;
          const overriddenDays = cleanedOverrides[moduleItemKey];

          if (overriddenDays !== undefined) {
            sumDirectDays += overriddenDays;
            return;
          }

          const ref = moduleItem.quantityReference
            ? moduleItem.quantityRef ?? parseLegacyReference(moduleItem.quantityReference, category)
            : null;
          const quantity = ref ? resolveProcessQuantity(building, ref) : 0;
          sumDirectDays += calculateItemDirectWorkDays({
            item: moduleItem,
            quantity,
            useEquipmentFormula: false,
          });
        });
      } else if ((category === '주동 지하층' || category === '지하주차장' || category === '지하층(층고6.5m이상)') && floorLabel) {
        const floorItems = mod.items.filter(moduleItem => moduleItem.floorLabel === targetFloorLabel);
        floorItems.forEach(moduleItem => {
          const moduleItemKey = `${category}-${floorLabel}-${moduleItem.id}`;
          const overriddenDays = cleanedOverrides[moduleItemKey];

          if (overriddenDays !== undefined) {
            sumDirectDays += overriddenDays;
            return;
          }

          let quantity = 0;
          const ref = moduleItem.quantityReference
            ? moduleItem.quantityRef ?? parseLegacyReference(moduleItem.quantityReference, category)
            : null;

          // 주차장이나 3단 가시설인 경우 specialRowQuantities에서 수량 가져오기
          if (isSpecialRow && ref) {
            const specialKey = floorLabel;
            const specialQuantities = currentPlan.specialRowQuantities?.[specialKey] || {};
            const specialQty = (specialQuantities as Record<string, number | undefined>)[ref.tradeField];
            quantity = (specialQty || 0) * ref.ratio;
          } else if (ref) {
            quantity = resolveProcessQuantity(building, ref, floorLabel);
          }

          sumDirectDays += calculateItemDirectWorkDays({
            item: moduleItem,
            quantity,
            useEquipmentFormula: false,
          });
        });
      }
    }

    // 순작업일 합계에 Math.floor 적용
    const flooredSumDirectDays = Math.floor(sumDirectDays);

    const updatedPlan = {
      ...currentPlan,
      itemDirectWorkDaysOverrides: Object.keys(cleanedOverrides).length > 0 ? cleanedOverrides : undefined,
      processes: {
        ...currentPlan.processes,
        [category]: {
          ...currentPlan.processes[category],
          days: flooredSumDirectDays,
        },
      },
    };

    updatedPlan.totalDays = calculateTotalDays(updatedPlan.processes, building);
    updateProcessPlan(buildingId, updatedPlan);

    // dirty 마킹 (명시적 저장으로 변경)
    markDirty(buildingId);
  }, [buildings, processPlans, markDirty, calculateTotalDays, updateProcessPlan]);

  // activeBuilding을 먼저 계산 (hooks 순서 보장을 위해)
  const activeBuilding = buildings.length > 0 && activeBuildingIndex < buildings.length
    ? buildings[activeBuildingIndex]
    : null;

  // 해당 동의 최대 지상층 번호 (옥탑 제외) - 셀 주소 라벨의 옥탑층 행 번호 계산용
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

  // 물량입력표와 반대 순서로 행 생성 (지하층, 기초, 버림)
  const processRows = useMemo(() => createBasementProcessRows(activeBuilding), [activeBuilding]);

  // 공정 열 목록 생성 (첫 번째 공정 열만 사용)
  const processColumns = useMemo(() => {
    if (!activeBuilding) return [];
    return [{ category: '버림' as ProcessCategory, colIndex: 0 }];
  }, [activeBuilding]);

  return (
    <div className="space-y-6">


      {buildings.length > 0 ? (
        <BuildingTabs
          buildings={buildings}
          activeIndex={activeBuildingIndex}
          onTabChange={setActiveBuildingIndex}
          onDelete={handleDeleteBuilding}
          onUpdateBuildingName={handleUpdateBuildingName}
          onReorder={handleReorder}
        >
          {activeBuilding && (
            <div className="p-4 space-y-4">
              {/* 가설공사 흙막이 토공사 공사일수 입력창 - 동별 탭 아래에 표시 */}
              {(() => {
                const building = activeBuilding;
                const plan = processPlans.get(building.id);
                const temporaryWorkDays = plan?.temporaryWorkDays ?? 0;
                const earthRetentionWorkDays = plan?.earthRetentionWorkDays ?? 0;
                const earthworkWorkDays = plan?.earthworkWorkDays ?? 0;

                const handleWorkDaysChange = (field: 'temporaryWorkDays' | 'earthRetentionWorkDays' | 'earthworkWorkDays', value: number | null) => {
                  if (!building) return;

                  const currentPlan = processPlans.get(building.id);
                  if (!currentPlan) return;

                  const updatedPlan = {
                    ...currentPlan,
                    [field]: value !== null && value >= 0 ? value : 0,
                  };

                  updateProcessPlan(building.id, updatedPlan);
                  markDirty(building.id);
                };

                return (
                  <Card className="mb-4">
                    <CardContent className="p-4">
                      <div className="flex items-center gap-6 flex-wrap">
                        <div className="flex items-center gap-2">
                          <label className="text-sm font-semibold text-zinc-900 dark:text-white whitespace-nowrap">
                            가설공사 공사일수:
                          </label>
                          <Input
                            type="number"
                            min="0"
                            step="1"
                            value={temporaryWorkDays}
                            onChange={(e) => {
                              const value = e.target.value === '' ? 0 : parseFloat(e.target.value);
                              handleWorkDaysChange('temporaryWorkDays', value);
                            }}
                            onBlur={(e) => {
                              const value = e.target.value === '' ? 0 : Math.max(0, Math.round(parseFloat(e.target.value) || 0));
                              handleWorkDaysChange('temporaryWorkDays', value);
                            }}
                            className="w-24"
                            placeholder="일수"
                          />
                          <span className="text-sm text-zinc-600 dark:text-zinc-400">일</span>
                        </div>
                        <div className="flex items-center gap-2">
                          <label className="text-sm font-semibold text-zinc-900 dark:text-white whitespace-nowrap">
                            흙막이 공사일수:
                          </label>
                          <Input
                            type="number"
                            min="0"
                            step="1"
                            value={earthRetentionWorkDays}
                            onChange={(e) => {
                              const value = e.target.value === '' ? 0 : parseFloat(e.target.value);
                              handleWorkDaysChange('earthRetentionWorkDays', value);
                            }}
                            onBlur={(e) => {
                              const value = e.target.value === '' ? 0 : Math.max(0, Math.round(parseFloat(e.target.value) || 0));
                              handleWorkDaysChange('earthRetentionWorkDays', value);
                            }}
                            className="w-24"
                            placeholder="일수"
                          />
                          <span className="text-sm text-zinc-600 dark:text-zinc-400">일</span>
                        </div>
                        <div className="flex items-center gap-2">
                          <label className="text-sm font-semibold text-zinc-900 dark:text-white whitespace-nowrap">
                            토공사 공사일수:
                          </label>
                          <Input
                            type="number"
                            min="0"
                            step="1"
                            value={earthworkWorkDays}
                            onChange={(e) => {
                              const value = e.target.value === '' ? 0 : parseFloat(e.target.value);
                              handleWorkDaysChange('earthworkWorkDays', value);
                            }}
                            onBlur={(e) => {
                              const value = e.target.value === '' ? 0 : Math.max(0, Math.round(parseFloat(e.target.value) || 0));
                              handleWorkDaysChange('earthworkWorkDays', value);
                            }}
                            className="w-24"
                            placeholder="일수"
                          />
                          <span className="text-sm text-zinc-600 dark:text-zinc-400">일</span>
                        </div>
                        <div className="ml-auto">
                          <SaveStatusBar
                            hasUnsavedChanges={dirtyBuildings.has(building.id)}
                            isSaving={isSaving}
                            onSave={() => saveToLocalStorage(building.id)}
                            onDiscard={() => discardChanges(building.id)}
                            allowSaveWithoutChanges
                            saveLabel="저장/세부공정 업데이트"
                          />
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                );
              })()}

              {/* 공정 목록 테이블 */}
              <div className="flex items-start gap-4 min-w-[1024px]">
                {/* 좌측: 테이블 카드 */}
                <ProcessPlanTable
                  hasProcessColumns={processColumns.length > 0}
                  summaryLabelClassName="text-zinc-500 dark:text-zinc-400 uppercase tracking-wider"
                >
                  {(() => {
                          const building = activeBuilding;
                          const plan = processPlans.get(building.id);
                          const isDetailExpanded = expandedModules.get(building.id) || new Set<string>();

                          return (
                            <Fragment key={building.id}>
                              {/* 공정 구분 섹션 - 물량입력표와 동일한 순서로 행 표시 */}
                              {processRows.map((row) => {
                                // 특수 행 수량 가져오기/저장 함수 (특수 행 렌더링 블록 내에서 사용)
                                const getSpecialRowQuantityLocal = (field: 'gangForm' | 'alForm' | 'formwork' | 'rebar' | 'concrete') => {
                                  if (!row.isSpecialRow || !row.floorLabel) return 0;
                                  const plan = processPlans.get(building.id);
                                  const key = row.floorLabel;
                                  return plan?.specialRowQuantities?.[key]?.[field] || 0;
                                };

                                const handleSpecialRowQuantityChangeLocal = (field: 'gangForm' | 'alForm' | 'formwork' | 'rebar' | 'concrete', value: number | null) => {
                                  if (!row.isSpecialRow || !row.floorLabel) return;

                                  const currentPlan = processPlans.get(building.id);
                                  if (!currentPlan) return;

                                  const key = row.floorLabel;
                                  const updatedQuantities = {
                                    ...(currentPlan.specialRowQuantities || {}),
                                    [key]: {
                                      ...(currentPlan.specialRowQuantities?.[key] || {}),
                                      [field]: value !== null && value >= 0 ? value : undefined,
                                    },
                                  };

                                  // undefined 값 제거
                                  Object.keys(updatedQuantities).forEach(k => {
                                    const qty = updatedQuantities[k];
                                    Object.keys(qty).forEach(f => {
                                      if (qty[f as keyof typeof qty] === undefined) {
                                        delete qty[f as keyof typeof qty];
                                      }
                                    });
                                    if (Object.keys(qty).length === 0) {
                                      delete updatedQuantities[k];
                                    }
                                  });

                                  const updatedPlan = {
                                    ...currentPlan,
                                    specialRowQuantities: Object.keys(updatedQuantities).length > 0 ? updatedQuantities : undefined,
                                  };

                                  updateProcessPlan(building.id, updatedPlan); // 🔥 Stage 1: Use helper function
                                  markDirty(building.id);
                                };

                                // 특수 행 필드별 최대 가용물량 계산 (주동 지하층 base - 다른 특수 행 합계)
                                const getMaxAvailableForSpecialRow = (
                                  field: 'gangForm' | 'alForm' | 'formwork' | 'rebar' | 'concrete'
                                ): number => {
                                  if (!row.isSpecialRow || !row.floorLabel) return Infinity;
                                  const baseFloor = row.floorLabel.match(/^(B\d+)/)?.[1];
                                  if (!baseFloor) return Infinity;

                                  const { tradeField, subField } = SPECIAL_FIELD_TO_TRADE[field];
                                  const baseQty = resolveProcessQuantity(building, {
                                    tradeField, subField, ratio: 1, sourceType: 'floor',
                                  }, baseFloor);

                                  const currentKey = row.floorLabel;
                                  const otherKeys = [
                                    `${baseFloor} 주차장`,
                                    `${baseFloor} 3단 가시설 적용부`,
                                    `${baseFloor} 6.5m이상`,
                                  ].filter(k => k !== currentKey);

                                  let otherSum = 0;
                                  const plan = processPlans.get(building.id);
                                  otherKeys.forEach(k => {
                                    otherSum += plan?.specialRowQuantities?.[k]?.[field] || 0;
                                  });

                                  return Math.max(0, baseQty - otherSum);
                                };

                                // 특수 행(주차장, 3단 가시설 적용부, 6.5m이상)은 일수 계산 건너뛰기
                                if (row.isSpecialRow) {
                                  // 특수 행은 해당 지하층의 표준공정 적용
                                  let processType: ProcessType;
                                  if (row.floorLabel) {
                                    const floorMatch = row.floorLabel.match(/^(B\d+)/);
                                    if (floorMatch) {
                                      const basementFloorLabel = floorMatch[1];
                                      processType = getProcessTypeForFloor(plan, row.category, basementFloorLabel);
                                    } else {
                                      processType = plan?.processes[row.category]?.processType || DEFAULT_PROCESS_TYPES[row.category] || '표준공정';
                                    }
                                  } else {
                                    processType = plan?.processes[row.category]?.processType || DEFAULT_PROCESS_TYPES[row.category] || '표준공정';
                                  }
                                  const mod = getProcessModule(row.category, processType);

                                  // 확장 상태 확인 - 6.5m이상은 B1/B2 통합 expandKey 사용
                                  const expandKey = (row.isFirstHighCeiling || row.isSecondHighCeiling)
                                    ? `${row.category}-합산`
                                    : row.floorLabel
                                      ? `${row.category}-${row.floorLabel}`
                                      : row.category;
                                  const isExpanded = isDetailExpanded.has(expandKey);

                                  const isMultiLineRow = false;

                                  // 비활성 상태 체크 - 6.5m이상은 B1/B2 합산 판정
                                  const isRowActive = (row.isFirstHighCeiling || row.isSecondHighCeiling)
                                    ? isHighCeilingActive(building.id)
                                    : row.floorLabel ? isSpecialRowActive(building.id, row.floorLabel) : false;

                                  const categoryLabel = getBasementRowCategoryLabel(row);

                                  // B1+B2 합산 물량으로 순작업일 계산하는 헬퍼 (B1 행의 rowSpan 일수 셀에서 사용)
                                  return (
                                    <ProcessPlanTableRow
                                      key={`process-${row.category}-${row.floorLabel || ''}-${row.rowIndex}`}
                                      isExpanded={isExpanded}
                                    >
                                      {/* 첫 번째 열: 구분 항목 - B2(isSecondHighCeiling)는 rowSpan으로 병합되므로 렌더링 생략 */}
                                      {!row.isSecondHighCeiling && (
                                        <td
                                          className={`px-2 py-1 text-xs font-semibold text-zinc-500 dark:text-zinc-400 uppercase tracking-wider border-r border-zinc-200 dark:border-zinc-800 align-middle ${!isRowActive ? 'opacity-40' : ''}`}
                                          style={{ whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}
                                          {...(row.isFirstHighCeiling ? { rowSpan: 2 } : {})}
                                        >
                                          <div className="text-center">{categoryLabel}</div>
                                        </td>
                                      )}

                                      {/* 두 번째 열: 층수 - 항상 렌더링 (B1/B2 각각 표시) */}
                                      <td className={`px-2 py-1 text-xs font-semibold text-zinc-500 dark:text-zinc-400 uppercase tracking-wider border-r border-zinc-200 dark:border-zinc-800 align-middle ${!isRowActive ? 'opacity-40' : ''}`} style={{ ...(isMultiLineRow ? {} : { whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }) }}>
                                        <div className="text-center font-normal">{row.floorLabel?.match(/^(B\d+)/)?.[1] || ''}</div>
                                      </td>

                                      {/* 형틀 합계 (읽기전용 - 갱폼+알폼+유로폼) */}
                                      <td className={`px-0.5 py-0.5 text-center text-xs border-r border-zinc-200 dark:border-zinc-800 align-middle ${!isRowActive ? 'opacity-40' : ''}`}>
                                        <div className="text-xs font-medium text-zinc-500">
                                          {((getSpecialRowQuantityLocal('gangForm') || 0) + (getSpecialRowQuantityLocal('alForm') || 0) + (getSpecialRowQuantityLocal('formwork') || 0)).toFixed(2)}
                                        </div>
                                      </td>
                                      {/* 갱폼 */}
                                      <td className="px-0.5 py-0.5 text-center text-xs border-r border-zinc-200 dark:border-zinc-800 align-middle">
                                        <Input
                                          type="number"
                                          min="0"
                                          step="0.01"
                                          value={getSpecialRowQuantityLocal('gangForm') || ''}
                                          onChange={(e) => {
                                            const value = e.target.value === '' ? null : parseFloat(e.target.value);
                                            handleSpecialRowQuantityChangeLocal('gangForm', value);
                                          }}
                                          onBlur={(e) => {
                                            const parsed = e.target.value === '' ? null : Math.max(0, parseFloat(e.target.value) || 0);
                                            const max = getMaxAvailableForSpecialRow('gangForm');
                                            const value = parsed !== null ? Math.min(parsed, max) : null;
                                            handleSpecialRowQuantityChangeLocal('gangForm', value);
                                          }}
                                          className="flex justify-center items-center text-center w-11 h-5 text-xs font-normal px-0.5 py-0 [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:appearance-none [-moz-appearance:textfield]"
                                          placeholder="0"
                                          title={`갱폼 (최대: ${getMaxAvailableForSpecialRow('gangForm').toFixed(2)})`}
                                          onClick={(e) => e.stopPropagation()}
                                        />
                                      </td>
                                      {/* 알폼 */}
                                      <td className="px-0.5 py-0.5 text-center text-xs border-r border-zinc-200 dark:border-zinc-800 align-middle">
                                        <Input
                                          type="number"
                                          min="0"
                                          step="0.01"
                                          value={getSpecialRowQuantityLocal('alForm') || ''}
                                          onChange={(e) => {
                                            const value = e.target.value === '' ? null : parseFloat(e.target.value);
                                            handleSpecialRowQuantityChangeLocal('alForm', value);
                                          }}
                                          onBlur={(e) => {
                                            const parsed = e.target.value === '' ? null : Math.max(0, parseFloat(e.target.value) || 0);
                                            const max = getMaxAvailableForSpecialRow('alForm');
                                            const value = parsed !== null ? Math.min(parsed, max) : null;
                                            handleSpecialRowQuantityChangeLocal('alForm', value);
                                          }}
                                          className="flex justify-center items-center text-center w-11 h-5 text-xs font-normal px-0.5 py-0 [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:appearance-none [-moz-appearance:textfield]"
                                          placeholder="0"
                                          title={`알폼 (최대: ${getMaxAvailableForSpecialRow('alForm').toFixed(2)})`}
                                          onClick={(e) => e.stopPropagation()}
                                        />
                                      </td>
                                      {/* 유로폼 */}
                                      <td className="px-0.5 py-0.5 text-center text-xs border-r border-zinc-200 dark:border-zinc-800 align-middle">
                                        <Input
                                          type="number"
                                          min="0"
                                          step="0.01"
                                          value={getSpecialRowQuantityLocal('formwork') || ''}
                                          onChange={(e) => {
                                            const value = e.target.value === '' ? null : parseFloat(e.target.value);
                                            handleSpecialRowQuantityChangeLocal('formwork', value);
                                          }}
                                          onBlur={(e) => {
                                            const parsed = e.target.value === '' ? null : Math.max(0, parseFloat(e.target.value) || 0);
                                            const max = getMaxAvailableForSpecialRow('formwork');
                                            const value = parsed !== null ? Math.min(parsed, max) : null;
                                            handleSpecialRowQuantityChangeLocal('formwork', value);
                                          }}
                                          className="flex justify-center items-center text-center w-11 h-5 text-xs font-normal px-0.5 py-0 [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:appearance-none [-moz-appearance:textfield]"
                                          placeholder="0"
                                          title={`유로폼 (최대: ${getMaxAvailableForSpecialRow('formwork').toFixed(2)})`}
                                          onClick={(e) => e.stopPropagation()}
                                        />
                                      </td>

                                      {/* 해체/정리 (형틀합계 × 2, 자동계산) - 비활성 시 회색 */}
                                      <td className={`px-0.5 py-0.5 text-center text-xs border-r border-zinc-200 dark:border-zinc-800 align-middle ${!isRowActive ? 'opacity-40' : ''}`}>
                                        <div className="text-xs text-zinc-500 dark:text-zinc-400">
                                          {(((getSpecialRowQuantityLocal('gangForm') || 0) + (getSpecialRowQuantityLocal('alForm') || 0) + (getSpecialRowQuantityLocal('formwork') || 0)) * 2).toFixed(2)}
                                        </div>
                                      </td>

                                      {/* 철근 */}
                                      <td className="px-1 py-0.5 text-center text-xs border-r border-zinc-200 dark:border-zinc-800 align-middle">
                                        <Input
                                          type="number"
                                          min="0"
                                          step="0.01"
                                          value={getSpecialRowQuantityLocal('rebar') || ''}
                                          onChange={(e) => {
                                            const value = e.target.value === '' ? null : parseFloat(e.target.value);
                                            handleSpecialRowQuantityChangeLocal('rebar', value);
                                          }}
                                          onBlur={(e) => {
                                            const parsed = e.target.value === '' ? null : Math.max(0, parseFloat(e.target.value) || 0);
                                            const max = getMaxAvailableForSpecialRow('rebar');
                                            const value = parsed !== null ? Math.min(parsed, max) : null;
                                            handleSpecialRowQuantityChangeLocal('rebar', value);
                                          }}
                                          className="flex justify-center items-center text-center w-12 h-5 text-xs font-normal px-0.5 py-0 [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:appearance-none [-moz-appearance:textfield]"
                                          placeholder="0"
                                          title={`철근 (최대: ${getMaxAvailableForSpecialRow('rebar').toFixed(2)})`}
                                          onClick={(e) => e.stopPropagation()}
                                        />
                                      </td>

                                      {/* 콘크리트 */}
                                      <td className="px-1 py-0.5 text-center text-xs border-r-2 border-zinc-200 dark:border-zinc-800 align-middle">
                                        <Input
                                          type="number"
                                          min="0"
                                          step="0.01"
                                          value={getSpecialRowQuantityLocal('concrete') || ''}
                                          onChange={(e) => {
                                            const value = e.target.value === '' ? null : parseFloat(e.target.value);
                                            handleSpecialRowQuantityChangeLocal('concrete', value);
                                          }}
                                          onBlur={(e) => {
                                            const parsed = e.target.value === '' ? null : Math.max(0, parseFloat(e.target.value) || 0);
                                            const max = getMaxAvailableForSpecialRow('concrete');
                                            const value = parsed !== null ? Math.min(parsed, max) : null;
                                            handleSpecialRowQuantityChangeLocal('concrete', value);
                                          }}
                                          className="flex justify-center items-center text-center w-12 h-5 text-xs font-normal px-0.5 py-0 [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:appearance-none [-moz-appearance:textfield]"
                                          placeholder="0"
                                          title={`콘크리트 (최대: ${getMaxAvailableForSpecialRow('concrete').toFixed(2)})`}
                                          onClick={(e) => e.stopPropagation()}
                                        />
                                      </td>

                                      {/* 공정타입 - B2(isSecondHighCeiling)는 rowSpan으로 병합되므로 렌더링 생략 */}
                                      {!row.isSecondHighCeiling && (
                                        <td
                                          className={`px-1 py-1 border-r border-zinc-200 dark:border-zinc-800 align-middle ${!isRowActive ? 'opacity-40' : ''}`}
                                          style={{ height: '24px' }}
                                          {...(row.isFirstHighCeiling ? { rowSpan: 2 } : {})}
                                        >
                                          <select
                                            value={processType}
                                            onChange={(e) => {
                                              handleProcessTypeChange(building.id, row.category, e.target.value as ProcessType, row.floorLabel);
                                            }}
                                            disabled={!isRowActive}
                                            className="w-full px-1 py-0.5 text-xs border border-zinc-300 dark:border-zinc-700 rounded bg-white dark:bg-zinc-800 text-zinc-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-primary-500 disabled:opacity-50 disabled:cursor-not-allowed"
                                          >
                                            {(PROCESS_TYPE_OPTIONS[row.category] || []).map(option => (
                                              <option key={option} value={option}>
                                                {option}
                                              </option>
                                            ))}
                                          </select>
                                        </td>
                                      )}

                                      {/* 세부공정 버튼 - B2(isSecondHighCeiling)는 rowSpan으로 병합되므로 렌더링 생략 */}
                                      {!row.isSecondHighCeiling && (
                                        <td
                                          className="px-1 py-1 border-r border-zinc-200 dark:border-zinc-800 align-middle"
                                          style={{ height: '24px' }}
                                          {...(row.isFirstHighCeiling ? { rowSpan: 2 } : {})}
                                        >
                                          {isRowActive && mod && mod.items.length > 0 && (
                                            <button
                                              onClick={() => {
                                                const expanded = expandedModules.get(building.id) || new Set<string>();
                                                const newExpanded = new Set<string>();
                                                if (!expanded.has(expandKey)) {
                                                  newExpanded.add(expandKey);
                                                }
                                                updateExpandedModules(building.id, newExpanded);
                                              }}
                                              className="p-1 hover:bg-zinc-200 dark:hover:bg-zinc-700 rounded mx-auto block"
                                              title="세부공정 보기/숨기기"
                                            >
                                              {isExpanded ? (
                                                <ChevronUp className="w-4 h-4" />
                                              ) : (
                                                <ChevronDown className="w-4 h-4" />
                                              )}
                                            </button>
                                          )}
                                        </td>
                                      )}
                                    </ProcessPlanTableRow>
                                  );
                                }

                                // 지하층 공정계획에서는 버림, 기초, 지하층만 처리
                                const effectiveCategory = row.category;

                                // processType 결정 (주동 지하층/지하주차장/6.5m이상은 층별, 나머지는 카테고리별)
                                let processType: ProcessType;
                                if (row.floorLabel && (row.category === '주동 지하층' || row.category === '지하주차장' || row.category === '지하층(층고6.5m이상)')) {
                                  processType = getProcessTypeForFloor(plan, row.category, row.floorLabel);
                                } else {
                                  processType = plan?.processes[row.category]?.processType || DEFAULT_PROCESS_TYPES[row.category] || '표준공정';
                                }
                                const mod = getProcessModule(effectiveCategory, processType);

                                // 일수 계산 - 세부공정의 순작업일 합계
                                let days = 0;
                                let indirectDays = 0;
                                if (!mod || !mod.items || mod.items.length === 0) {
                                  // 모듈이 없으면 기존 방식 사용
                                  if (row.category === '버림' || row.category === '기초' || row.category === '지하층(층고6.5m이상)') {
                                    days = plan?.processes[row.category]?.days || 0;
                                  } else if (row.category === '주동 지하층' && row.floorLabel) {
                                    days = calculateBasementFloorDays(building, row.category, processType, row.floorLabel);
                                  }
                                  // fallback에서도 간접작업일 계산
                                  if (mod) {
                                    if (row.floorLabel && (row.category === '주동 지하층')) {
                                      indirectDays = calculateModuleIndirectDaysForFloor(mod, row.category, row.floorLabel);
                                    } else {
                                      indirectDays = calculateModuleIndirectDays(mod);
                                    }
                                  }
                                  // days는 이미 totalDays(직접+간접)이므로 순작업일수 = days - indirectDays
                                  days = days - indirectDays;
                                } else {
                                  // 세부공정의 순작업일 합계 계산 (오버라이드된 값 고려)
                                  let sumDirectDays = 0;
                                  let sumIndirectDays = 0;

                                  // 버림, 기초, 지하층(층고6.5m이상)은 floorLabel 없이 전체 항목 계산
                                  if (row.category === '버림' || row.category === '기초' || row.category === '지하층(층고6.5m이상)') {
                                    mod.items.forEach(item => {
                                      sumIndirectDays += item.indirectDays;
                                      // 오버라이드된 순작업일 확인
                                      const itemKey = `${row.category}-${row.floorLabel || ''}-${item.id}`;
                                      const overriddenDays = plan?.itemDirectWorkDaysOverrides?.[itemKey];

                                      if (overriddenDays !== undefined) {
                                        // 오버라이드된 값 사용
                                        sumDirectDays += overriddenDays;
                                        return;
                                      }

                                      let quantity = 0;

                                      if (item.quantityReference) {
                                        const ref = item.quantityRef ?? parseLegacyReference(item.quantityReference, row.category);
                                        if (ref) {
                                          quantity = resolveProcessQuantity(building, ref);
                                        }
                                      }

                                      sumDirectDays += calculateItemDirectWorkDays({
                                        item,
                                        quantity,
                                      });
                                    });
                                  }
                                  // 지하주차장 공정
                                  else if (row.floorLabel && row.category === '지하주차장') {
                                    // "B1 주차장" → "B1" 추출
                                    const parkingFloorMatch = row.floorLabel.match(/^(B\d+)/);
                                    const baseFloorLabel = parkingFloorMatch ? parkingFloorMatch[1] : row.floorLabel;
                                    const floorItems = mod.items.filter(item => item.floorLabel === baseFloorLabel);

                                    floorItems.forEach(item => {
                                      sumIndirectDays += item.indirectDays;
                                      const itemKey = `${row.category}-${row.floorLabel || ''}-${item.id}`;
                                      const overriddenDays = plan?.itemDirectWorkDaysOverrides?.[itemKey];

                                      if (overriddenDays !== undefined) {
                                        sumDirectDays += overriddenDays;
                                        return;
                                      }

                                      const ref = item.quantityReference
                                        ? item.quantityRef ?? parseLegacyReference(item.quantityReference, row.category)
                                        : null;
                                      const quantity = ref ? resolveProcessQuantity(building, ref, baseFloorLabel) : 0;
                                      sumDirectDays += calculateItemDirectWorkDays({
                                        item,
                                        quantity,
                                        useEquipmentFormula: false,
                                      });
                                    });
                                  }
                                  // 지하층 공정계획에서는 지하층만 처리
                                  else if (row.floorLabel && row.category === '주동 지하층') {
                                    // 특수 행 차감 합계 계산
                                    const deductions = getSpecialRowDeductions(plan?.specialRowQuantities, row.floorLabel!);

                                    // 해당 층의 항목만 필터링
                                    const floorItems = mod.items.filter(item => {
                                      return item.floorLabel === row.floorLabel;
                                    });

                                    floorItems.forEach(item => {
                                      sumIndirectDays += item.indirectDays;
                                      // 오버라이드된 순작업일 확인
                                      const itemKey = `${row.category}-${row.floorLabel || ''}-${item.id}`;
                                      const overriddenDays = plan?.itemDirectWorkDaysOverrides?.[itemKey];

                                      if (overriddenDays !== undefined) {
                                        sumDirectDays += overriddenDays;
                                        return;
                                      }

                                      let quantity = 0;

                                      // 수량 참조를 층별로 조정 (차감 적용)
                                      if (item.quantityReference) {
                                        const ref = item.quantityRef ?? parseLegacyReference(item.quantityReference, row.category);
                                        if (ref) {
                                          quantity = resolveWithDeduction(building, ref, row.floorLabel!, deductions);
                                        }
                                      }

                                      sumDirectDays += calculateItemDirectWorkDays({ item, quantity });
                                    });
                                  }

                                  days = Math.floor(sumDirectDays);
                                  indirectDays = Math.ceil(sumIndirectDays);
                                }
                                void days;

                                // 확장 상태 확인
                                const expandKey = row.floorLabel
                                  ? `${row.category}-${row.floorLabel}`
                                  : row.category;
                                const isExpanded = isDetailExpanded.has(expandKey);

                                // 특수 행 수량 가져오기/저장
                                const getSpecialRowQuantity = (field: 'gangForm' | 'alForm' | 'formwork' | 'rebar' | 'concrete') => {
                                  if (!row.isSpecialRow || !row.floorLabel) return 0;
                                  const plan = processPlans.get(building.id);
                                  const key = row.floorLabel;
                                  const quantity = plan?.specialRowQuantities?.[key]?.[field] || 0;
                                  return quantity;
                                };

                                const handleSpecialRowQuantityChange = (field: 'gangForm' | 'alForm' | 'formwork' | 'rebar' | 'concrete', value: number | null) => {
                                  if (!row.isSpecialRow || !row.floorLabel) return;

                                  const currentPlan = processPlans.get(building.id);
                                  if (!currentPlan) return;

                                  const key = row.floorLabel;
                                  const updatedQuantities = {
                                    ...(currentPlan.specialRowQuantities || {}),
                                    [key]: {
                                      ...(currentPlan.specialRowQuantities?.[key] || {}),
                                      [field]: value !== null && value >= 0 ? value : undefined,
                                    },
                                  };

                                  // undefined 값 제거
                                  Object.keys(updatedQuantities).forEach(k => {
                                    const qty = updatedQuantities[k];
                                    Object.keys(qty).forEach(f => {
                                      if (qty[f as keyof typeof qty] === undefined) {
                                        delete qty[f as keyof typeof qty];
                                      }
                                    });
                                    if (Object.keys(qty).length === 0) {
                                      delete updatedQuantities[k];
                                    }
                                  });

                                  const updatedPlan = {
                                    ...currentPlan,
                                    specialRowQuantities: Object.keys(updatedQuantities).length > 0 ? updatedQuantities : undefined,
                                  };

                                  updateProcessPlan(building.id, updatedPlan); // 🔥 Stage 1: Use helper function
                                  markDirty(building.id);
                                };

                                // 특수 행 필드별 최대 가용물량 계산 (Path B용)
                                const getMaxAvailableForSpecialRowB = (
                                  field: 'gangForm' | 'alForm' | 'formwork' | 'rebar' | 'concrete'
                                ): number => {
                                  if (!row.isSpecialRow || !row.floorLabel) return Infinity;
                                  const baseFloor = row.floorLabel.match(/^(B\d+)/)?.[1];
                                  if (!baseFloor) return Infinity;

                                  const { tradeField, subField } = SPECIAL_FIELD_TO_TRADE[field];
                                  const baseQty = resolveProcessQuantity(building, {
                                    tradeField, subField, ratio: 1, sourceType: 'floor',
                                  }, baseFloor);

                                  const currentKey = row.floorLabel;
                                  const otherKeys = [
                                    `${baseFloor} 주차장`,
                                    `${baseFloor} 3단 가시설 적용부`,
                                    `${baseFloor} 6.5m이상`,
                                  ].filter(k => k !== currentKey);

                                  let otherSum = 0;
                                  const plan = processPlans.get(building.id);
                                  otherKeys.forEach(k => {
                                    otherSum += plan?.specialRowQuantities?.[k]?.[field] || 0;
                                  });

                                  return Math.max(0, baseQty - otherSum);
                                };

                                // 물량 데이터 가져오기 - 특수 행 수량 차감 (공유 유틸리티 사용)
                                const rowDeductions = (row.category === '주동 지하층' && row.floorLabel && !row.isSpecialRow)
                                  ? getSpecialRowDeductions(plan?.specialRowQuantities, row.floorLabel)
                                  : undefined;

                                const resolveBasementQty = (
                                  tradeField: TradeFieldKey,
                                  subField: TradeSubFieldKey,
                                  specialField: 'gangForm' | 'alForm' | 'formwork' | 'rebar' | 'concrete'
                                ) => {
                                  if (row.isSpecialRow) return getSpecialRowQuantity(specialField);
                                  if (row.category === '버림' || row.category === '기초') {
                                    return resolveProcessQuantity(building, {
                                      tradeField, subField, ratio: 1,
                                      sourceType: 'category', tradeGroup: row.category,
                                    });
                                  }
                                  if (row.category === '지하층(층고6.5m이상)') {
                                    return resolveProcessQuantity(building, {
                                      tradeField, subField, ratio: 1,
                                      sourceType: 'combined', combineFloors: ['B1', 'B2'],
                                    });
                                  }
                                  if (!row.floorLabel) return 0;
                                  const base = resolveProcessQuantity(building, {
                                    tradeField, subField, ratio: 1, sourceType: 'floor',
                                  }, row.floorLabel);
                                  return Math.max(0, base - (rowDeductions?.[specialField] || 0));
                                };

                                const getGangFormQty = () => resolveBasementQty('gangForm', 'areaM2', 'gangForm');
                                const getAlFormQty = () => resolveBasementQty('alForm', 'areaM2', 'alForm');
                                const getEuroFormQty = () => resolveBasementQty('euroForm', 'areaM2', 'formwork');
                                const getStripCleanQty = () => (getGangFormQty() + getAlFormQty() + getEuroFormQty()) * 2;
                                const getFormworkQuantity = () => getGangFormQty() + getAlFormQty() + getEuroFormQty();
                                const getRebarQuantity = () => resolveBasementQty('rebar', 'ton', 'rebar');
                                const getConcreteQuantity = () => resolveBasementQty('concrete', 'volumeM3', 'concrete');

                                return (
                                  <ProcessPlanTableRow
                                    key={`process-${row.category}-${row.floorLabel || ''}-${row.rowIndex}`}
                                    isExpanded={isExpanded}
                                  >
                                    {/* 첫 번째 열: 구분 항목 */}
                                    <td className="px-2 py-1 text-xs font-semibold text-zinc-500 dark:text-zinc-400 uppercase tracking-wider border-r border-zinc-200 dark:border-zinc-800 align-middle" style={{ height: row.isSpecialRow ? 'auto' : '24px', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                                      <div className="text-center">{getBasementRowCategoryLabel(row)}</div>
                                    </td>

                                    {/* 두 번째 열: 층수 */}
                                    <td className="px-2 py-1 text-xs font-semibold text-zinc-500 dark:text-zinc-400 uppercase tracking-wider border-r border-zinc-200 dark:border-zinc-800 align-middle" style={{ height: row.isSpecialRow ? 'auto' : '24px', width: '115px', ...(row.floorLabel?.includes('3단 가시설 적용부') ? {} : { whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }) }}>
                                      <div className="text-center font-normal">{getBasementRowFloorNumberLabel(row)}</div>
                                    </td>

                                    {/* 형틀 합계 */}
                                    <td className="relative px-0.5 py-0.5 text-center text-xs border-r border-zinc-200 dark:border-zinc-800 align-middle" style={{ height: '32px' }}>
                                      {row.isSpecialRow ? (
                                        <div className="text-xs font-medium text-zinc-500">
                                          {((getSpecialRowQuantity('gangForm') || 0) + (getSpecialRowQuantity('alForm') || 0) + (getSpecialRowQuantity('formwork') || 0)).toFixed(2)}
                                        </div>
                                      ) : (
                                        <>
                                          {getCellReferenceForRow(row.category, row.floorLabel, 'formworkTotal', maxFloorNumber) && (
                                            <span className="absolute top-0 left-0.5 pointer-events-none select-none text-[8px] font-mono leading-none text-blue-400/70 dark:text-blue-500/50" aria-hidden="true">
                                              {getCellReferenceForRow(row.category, row.floorLabel, 'formworkTotal', maxFloorNumber)}
                                            </span>
                                          )}
                                          <div className="text-xs font-medium">
                                            {getFormworkQuantity() > 0 ? getFormworkQuantity().toFixed(2) : '0.00'}
                                          </div>
                                        </>
                                      )}
                                    </td>
                                    {/* 갱폼 */}
                                    <td className="relative px-0.5 py-0.5 text-center text-xs border-r border-zinc-200 dark:border-zinc-800 align-middle" style={{ height: '32px' }}>
                                      {row.isSpecialRow ? (
                                        <Input
                                          type="number"
                                          min="0"
                                          step="0.01"
                                          value={getSpecialRowQuantity('gangForm') || ''}
                                          onChange={(e) => {
                                            const value = e.target.value === '' ? null : parseFloat(e.target.value);
                                            handleSpecialRowQuantityChange('gangForm', value);
                                          }}
                                          onBlur={(e) => {
                                            const parsed = e.target.value === '' ? null : Math.max(0, parseFloat(e.target.value) || 0);
                                            const max = getMaxAvailableForSpecialRowB('gangForm');
                                            const value = parsed !== null ? Math.min(parsed, max) : null;
                                            handleSpecialRowQuantityChange('gangForm', value);
                                          }}
                                          className="flex justify-center items-center text-center w-11 h-5 text-xs font-normal px-0.5 py-0 [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:appearance-none [-moz-appearance:textfield]"
                                          placeholder="0"
                                          title={`갱폼 (최대: ${getMaxAvailableForSpecialRowB('gangForm').toFixed(2)})`}
                                          onClick={(e) => e.stopPropagation()}
                                        />
                                      ) : (
                                        <>
                                          {getCellReferenceForRow(row.category, row.floorLabel, 'gangForm', maxFloorNumber) && (
                                            <span className="absolute top-0 left-0.5 pointer-events-none select-none text-[8px] font-mono leading-none text-blue-400/70 dark:text-blue-500/50" aria-hidden="true">
                                              {getCellReferenceForRow(row.category, row.floorLabel, 'gangForm', maxFloorNumber)}
                                            </span>
                                          )}
                                          <div className="text-xs text-zinc-500 dark:text-zinc-400">
                                            {getGangFormQty() > 0 ? getGangFormQty().toFixed(2) : '0.00'}
                                          </div>
                                        </>
                                      )}
                                    </td>
                                    {/* 알폼 */}
                                    <td className="relative px-0.5 py-0.5 text-center text-xs border-r border-zinc-200 dark:border-zinc-800 align-middle" style={{ height: '32px' }}>
                                      {row.isSpecialRow ? (
                                        <Input
                                          type="number"
                                          min="0"
                                          step="0.01"
                                          value={getSpecialRowQuantity('alForm') || ''}
                                          onChange={(e) => {
                                            const value = e.target.value === '' ? null : parseFloat(e.target.value);
                                            handleSpecialRowQuantityChange('alForm', value);
                                          }}
                                          onBlur={(e) => {
                                            const parsed = e.target.value === '' ? null : Math.max(0, parseFloat(e.target.value) || 0);
                                            const max = getMaxAvailableForSpecialRowB('alForm');
                                            const value = parsed !== null ? Math.min(parsed, max) : null;
                                            handleSpecialRowQuantityChange('alForm', value);
                                          }}
                                          className="flex justify-center items-center text-center w-11 h-5 text-xs font-normal px-0.5 py-0 [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:appearance-none [-moz-appearance:textfield]"
                                          placeholder="0"
                                          title={`알폼 (최대: ${getMaxAvailableForSpecialRowB('alForm').toFixed(2)})`}
                                          onClick={(e) => e.stopPropagation()}
                                        />
                                      ) : (
                                        <>
                                          {getCellReferenceForRow(row.category, row.floorLabel, 'alForm', maxFloorNumber) && (
                                            <span className="absolute top-0 left-0.5 pointer-events-none select-none text-[8px] font-mono leading-none text-blue-400/70 dark:text-blue-500/50" aria-hidden="true">
                                              {getCellReferenceForRow(row.category, row.floorLabel, 'alForm', maxFloorNumber)}
                                            </span>
                                          )}
                                          <div className="text-xs text-zinc-500 dark:text-zinc-400">
                                            {getAlFormQty() > 0 ? getAlFormQty().toFixed(2) : '0.00'}
                                          </div>
                                        </>
                                      )}
                                    </td>
                                    {/* 유로폼 */}
                                    <td className="relative px-0.5 py-0.5 text-center text-xs border-r border-zinc-200 dark:border-zinc-800 align-middle" style={{ height: '32px' }}>
                                      {row.isSpecialRow ? (
                                        <Input
                                          type="number"
                                          min="0"
                                          step="0.01"
                                          value={getSpecialRowQuantity('formwork') || ''}
                                          onChange={(e) => {
                                            const value = e.target.value === '' ? null : parseFloat(e.target.value);
                                            handleSpecialRowQuantityChange('formwork', value);
                                          }}
                                          onBlur={(e) => {
                                            const parsed = e.target.value === '' ? null : Math.max(0, parseFloat(e.target.value) || 0);
                                            const max = getMaxAvailableForSpecialRowB('formwork');
                                            const value = parsed !== null ? Math.min(parsed, max) : null;
                                            handleSpecialRowQuantityChange('formwork', value);
                                          }}
                                          className="flex justify-center items-center text-center w-11 h-5 text-xs font-normal px-0.5 py-0 [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:appearance-none [-moz-appearance:textfield]"
                                          placeholder="0"
                                          title={`유로폼 (최대: ${getMaxAvailableForSpecialRowB('formwork').toFixed(2)})`}
                                          onClick={(e) => e.stopPropagation()}
                                        />
                                      ) : (
                                        <>
                                          {getCellReferenceForRow(row.category, row.floorLabel, 'euroForm', maxFloorNumber) && (
                                            <span className="absolute top-0 left-0.5 pointer-events-none select-none text-[8px] font-mono leading-none text-blue-400/70 dark:text-blue-500/50" aria-hidden="true">
                                              {getCellReferenceForRow(row.category, row.floorLabel, 'euroForm', maxFloorNumber)}
                                            </span>
                                          )}
                                          <div className="text-xs text-zinc-500 dark:text-zinc-400">
                                            {getEuroFormQty() > 0 ? getEuroFormQty().toFixed(2) : '0.00'}
                                          </div>
                                        </>
                                      )}
                                    </td>

                                    {/* 해체/정리 (유로폼 × 2, 자동계산) */}
                                    <td className="relative px-0.5 py-0.5 text-center text-xs border-r border-zinc-200 dark:border-zinc-800 align-middle" style={{ height: '32px' }}>
                                      {getCellReferenceForRow(row.category, row.floorLabel, 'stripClean', maxFloorNumber) && (
                                        <span className="absolute top-0 left-0.5 pointer-events-none select-none text-[8px] font-mono leading-none text-blue-400/70 dark:text-blue-500/50" aria-hidden="true">
                                          {getCellReferenceForRow(row.category, row.floorLabel, 'stripClean', maxFloorNumber)}
                                        </span>
                                      )}
                                      <div className="text-xs text-zinc-500 dark:text-zinc-400">
                                        {getStripCleanQty() > 0 ? getStripCleanQty().toFixed(2) : '0.00'}
                                      </div>
                                    </td>

                                    {/* 철근 */}
                                    <td className="relative px-1 py-0.5 text-center text-xs border-r border-zinc-200 dark:border-zinc-800 align-middle" style={{ height: '32px' }}>
                                      {row.isSpecialRow ? (
                                        <Input
                                          type="number"
                                          min="0"
                                          step="0.01"
                                          value={getRebarQuantity() || ''}
                                          onChange={(e) => {
                                            const value = e.target.value === '' ? null : parseFloat(e.target.value);
                                            handleSpecialRowQuantityChange('rebar', value);
                                          }}
                                          onBlur={(e) => {
                                            const parsed = e.target.value === '' ? null : Math.max(0, parseFloat(e.target.value) || 0);
                                            const max = getMaxAvailableForSpecialRowB('rebar');
                                            const value = parsed !== null ? Math.min(parsed, max) : null;
                                            handleSpecialRowQuantityChange('rebar', value);
                                          }}
                                          className="flex justify-center items-center text-center w-12 h-5 text-xs font-normal px-0.5 py-0 [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:appearance-none [-moz-appearance:textfield]"
                                          placeholder="0"
                                          title={`철근 (최대: ${getMaxAvailableForSpecialRowB('rebar').toFixed(2)})`}
                                          onClick={(e) => e.stopPropagation()}
                                        />
                                      ) : (
                                        <>
                                          {getCellReferenceForRow(row.category, row.floorLabel, 'rebar', maxFloorNumber) && (
                                            <span className="absolute top-0 left-0.5 pointer-events-none select-none text-[8px] font-mono leading-none text-blue-400/70 dark:text-blue-500/50" aria-hidden="true">
                                              {getCellReferenceForRow(row.category, row.floorLabel, 'rebar', maxFloorNumber)}
                                            </span>
                                          )}
                                          <div className="text-xs">
                                            {getRebarQuantity() > 0 ? getRebarQuantity().toFixed(2) : '0.00'}
                                          </div>
                                        </>
                                      )}
                                    </td>

                                    {/* 콘크리트 */}
                                    <td className="relative px-1 py-0.5 text-center text-xs border-r-2 border-zinc-200 dark:border-zinc-800 align-middle" style={{ height: '32px' }}>
                                      {row.isSpecialRow ? (
                                        <Input
                                          type="number"
                                          min="0"
                                          step="0.01"
                                          value={getConcreteQuantity() || ''}
                                          onChange={(e) => {
                                            const value = e.target.value === '' ? null : parseFloat(e.target.value);
                                            handleSpecialRowQuantityChange('concrete', value);
                                          }}
                                          onBlur={(e) => {
                                            const parsed = e.target.value === '' ? null : Math.max(0, parseFloat(e.target.value) || 0);
                                            const max = getMaxAvailableForSpecialRowB('concrete');
                                            const value = parsed !== null ? Math.min(parsed, max) : null;
                                            handleSpecialRowQuantityChange('concrete', value);
                                          }}
                                          className="flex justify-center items-center text-center w-12 h-5 text-xs font-normal px-0.5 py-0 [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:appearance-none [-moz-appearance:textfield]"
                                          placeholder="0"
                                          title={`콘크리트 (최대: ${getMaxAvailableForSpecialRowB('concrete').toFixed(2)})`}
                                          onClick={(e) => e.stopPropagation()}
                                        />
                                      ) : (
                                        <>
                                          {getCellReferenceForRow(row.category, row.floorLabel, 'concrete', maxFloorNumber) && (
                                            <span className="absolute top-0 left-0.5 pointer-events-none select-none text-[8px] font-mono leading-none text-blue-400/70 dark:text-blue-500/50" aria-hidden="true">
                                              {getCellReferenceForRow(row.category, row.floorLabel, 'concrete', maxFloorNumber)}
                                            </span>
                                          )}
                                          <div className="text-xs">
                                            {getConcreteQuantity() > 0 ? getConcreteQuantity().toFixed(2) : '0.00'}
                                          </div>
                                        </>
                                      )}
                                    </td>

                                    {/* 일곱 번째 열: 셀렉트박스 */}
                                    <td className="px-1 py-1 border-r border-zinc-200 dark:border-zinc-800 align-middle" style={{ height: '32px' }}>
                                      {/* 일반 지하층 행은 항상 표준공정 드롭다운 표시 */}
                                      <select
                                        value={processType}
                                        onChange={(e) => {
                                          // 지하층 공정계획에서는 지하층만 처리
                                          handleProcessTypeChange(building.id, row.category, e.target.value as ProcessType, row.floorLabel);
                                        }}
                                        className="w-full px-1 py-0.5 text-xs border border-zinc-300 dark:border-zinc-700 rounded bg-white dark:bg-zinc-800 text-zinc-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-primary-500"
                                      >
                                        {(PROCESS_TYPE_OPTIONS[effectiveCategory] || []).map(option => (
                                          <option key={option} value={option}>
                                            {option}
                                          </option>
                                        ))}
                                      </select>
                                    </td>

                                    {/* 여덟 번째 열: 세부공정 버튼 */}
                                    <td className="px-1 py-1 border-r border-zinc-200 dark:border-zinc-800 align-middle" style={{ height: '32px' }}>
                                      {mod && mod.items.length > 0 && (
                                        <button
                                          onClick={() => {
                                            const expanded = expandedModules.get(building.id) || new Set<string>();
                                            const newExpanded = new Set<string>();
                                            // 다른 행의 확장 상태를 모두 제거하고 현재 행만 확장
                                            if (!expanded.has(expandKey)) {
                                              newExpanded.add(expandKey);
                                            }
                                            // 이미 확장된 경우 닫기 (newExpanded는 빈 Set이므로 아무것도 표시되지 않음)
                                            updateExpandedModules(building.id, newExpanded);
                                          }}
                                          className="p-1 hover:bg-zinc-200 dark:hover:bg-zinc-700 rounded mx-auto block"
                                          title="세부공정 보기/숨기기"
                                        >
                                          {isExpanded ? (
                                            <ChevronUp className="w-4 h-4" />
                                          ) : (
                                            <ChevronDown className="w-4 h-4" />
                                          )}
                                        </button>
                                      )}
                                    </td>
                                  </ProcessPlanTableRow>
                                );
                              })}
                            </Fragment>
                          );
                  })()}
                </ProcessPlanTable>

                {/* 우측: 패널 카드 */}
                <ProcessPlanSidePanel>
                  {(() => {
                        const building = activeBuilding;
                        const plan = processPlans.get(building!.id);
                        const isDetailExpanded = expandedModules.get(building!.id) || new Set<string>();

                        // 확장된 행 찾기 - 6.5m이상은 통합 expandKey 사용
                        const expandedRow = processRows.find((col) => {
                          const expandKey = (col.isFirstHighCeiling || col.isSecondHighCeiling)
                            ? `${col.category}-합산`
                            : col.floorLabel
                              ? `${col.category}-${col.floorLabel}`
                              : col.category === '기준층'
                                ? '기준층-세부공정'
                                : col.category;
                          return isDetailExpanded.has(expandKey);
                        });

                        // 카테고리명 표시
                        const getCategoryDisplayName = (row: NonNullable<typeof expandedRow>) => {
                          if (row.category === '버림' || row.category === '기초') {
                            return row.category;
                          }
                          if (row.category === '주동 지하층' && row.floorLabel) {
                            return `주동 지하층 ${row.floorLabel}`;
                          }
                          if (row.category === '지하층(층고6.5m이상)') {
                            return '지하층(6.5m이상) B1+B2';
                          }
                          if (row.category === '지하주차장') {
                            return row.floorLabel || '지하주차장';
                          }
                          return row.category;
                        };

                        return (
                          <ProcessPlanDetailCard
                            expandedRow={expandedRow || null}
                            getCategoryDisplayName={getCategoryDisplayName}
                          >
                            {(selectedRow) => {
                              // 주차장/3단 가시설/6.5m이상 특수 행 처리
                              const isParking = selectedRow.floorLabel?.includes('주차장');
                              const isFacility = selectedRow.floorLabel?.includes('3단 가시설 적용부');
                              const isHighCeiling = selectedRow.floorLabel?.includes('6.5m이상');
                              const isSpecialRow = isParking || isFacility || isHighCeiling;

                              let targetFloorLabel = selectedRow.floorLabel;
                              if (isSpecialRow && selectedRow.floorLabel) {
                                const floorMatch = selectedRow.floorLabel.match(/^(B\d+)/);
                                if (floorMatch) {
                                  targetFloorLabel = floorMatch[1];
                                }
                              }

                              const expandedProcessType = selectedRow.floorLabel && (selectedRow.category === '주동 지하층' || selectedRow.category === '지하주차장' || selectedRow.category === '지하층(층고6.5m이상)')
                                ? getProcessTypeForFloor(plan, selectedRow.category, targetFloorLabel || selectedRow.floorLabel)
                                : plan?.processes[selectedRow.category]?.processType || DEFAULT_PROCESS_TYPES[selectedRow.category] || '표준공정';
                              const expandedModule = getProcessModule(selectedRow.category, expandedProcessType) || null;

                              return (
                                <ProcessDetailPanel
                                  building={building!}
                                  expandedRow={selectedRow}
                                  module={expandedModule}
                                  plan={plan}
                                  processRows={processRows}
                                  onDirectWorkDaysChange={(itemKey, value) => handleItemDirectWorkDaysChange(building!.id, itemKey, value)}
                                  specialRowQuantities={(() => {
                                    if (!isHighCeiling || !plan?.specialRowQuantities) return plan?.specialRowQuantities;
                                    // B1+B2 합산 물량을 B1 키로 통합
                                    const b1Qty = plan.specialRowQuantities['B1 6.5m이상'] || {};
                                    const b2Qty = plan.specialRowQuantities['B2 6.5m이상'] || {};
                                    return {
                                      ...plan.specialRowQuantities,
                                      ['B1 6.5m이상']: {
                                        gangForm: (b1Qty.gangForm || 0) + (b2Qty.gangForm || 0),
                                        alForm: (b1Qty.alForm || 0) + (b2Qty.alForm || 0),
                                        formwork: (b1Qty.formwork || 0) + (b2Qty.formwork || 0),
                                        rebar: (b1Qty.rebar || 0) + (b2Qty.rebar || 0),
                                        concrete: (b1Qty.concrete || 0) + (b2Qty.concrete || 0),
                                      },
                                    };
                                  })()}
                                />
                              );
                            }}
                          </ProcessPlanDetailCard>
                        );
                  })()}
                </ProcessPlanSidePanel>
              </div>
            </div>
          )}
        </BuildingTabs>
      ) : (
        <Card className="p-8">
          <div className="flex flex-col items-center justify-center text-center space-y-4">
            <div className="w-16 h-16 rounded-full bg-zinc-100 dark:bg-zinc-800 flex items-center justify-center">
              <Building2 className="w-8 h-8 text-zinc-400 dark:text-zinc-500" />
            </div>
            <div className="space-y-2">
              <h3 className="text-lg font-medium text-zinc-900 dark:text-white">
                등록된 동이 없습니다
              </h3>
              <p className="text-sm text-zinc-500 dark:text-zinc-400 max-w-sm">
                지하층 공정계획을 입력하려면 먼저 <br />
                <span className="font-medium text-primary-600 dark:text-primary-400">&quot;동 기본정보&quot;</span> 탭에서 동을 생성해주세요.
              </p>
            </div>
          </div>
        </Card>
      )}
    </div>
  );
}
