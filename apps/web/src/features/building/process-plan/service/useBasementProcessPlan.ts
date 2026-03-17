'use client';

import { useEffect, useMemo, useCallback } from 'react';
import type { Building, BuildingProcessPlan, ProcessCategory, ProcessType, Floor } from '@/shared/types';
import type { TradeFieldKey, TradeSubFieldKey } from '@/shared/types/process-quantity';
import { getBuildings, deleteBuilding, updateBuilding, reorderBuildings } from '@/features/building/shared/repository/buildings';
import { toast } from 'sonner';
import { getProcessModule } from '@/features/building/data/process-modules';
import { resolveProcessQuantity, getSpecialRowDeductions, resolveWithDeduction, type DeductionFields } from '@/features/building/process-plan/service/process-quantity-resolver';
import { parseLegacyReference } from '@/features/building/process-plan/service/quantity-reference-migration';
import { calculateModuleWorkDays, calculateModuleWorkDaysForFloor } from '@/features/building/process-plan/service/process-days-calculator';
import { useProcessPlanState } from './useProcessPlanState';
import { calculateItemDirectWorkDays } from './calculateItemDirectWorkDays';
import { createBasementProcessRows } from './createBasementProcessRows';

// ─── Constants ───────────────────────────────────────────────────────────────

// 공정 구분 목록 (지하층 공정계획: 버림, 기초, 주동 지하층만)
export const PROCESS_CATEGORIES: ProcessCategory[] = ['버림', '기초', '주동 지하층'];

// 공정 타입 옵션 (구분별로 다름) - 지하층 공정계획용
export const PROCESS_TYPE_OPTIONS: Partial<Record<ProcessCategory, ProcessType[]>> = {
  '버림': ['표준공정'],
  '기초': ['표준공정'],
  '주동 지하층': ['표준공정'],
  '지하층(층고6.5m이상)': ['표준공정'],
  '지하주차장': ['표준공정'],
};

// 기본 공정 타입 - 지하층 공정계획은 버림, 기초, 주동 지하층만 사용
export const DEFAULT_PROCESS_TYPES: Partial<Record<ProcessCategory, ProcessType>> = {
  '버림': '표준공정',
  '기초': '표준공정',
  '주동 지하층': '표준공정',
  '지하층(층고6.5m이상)': '표준공정',
  '지하주차장': '표준공정',
};

// 특수 행 필드 → floorTrade 필드 매핑 (resolveProcessQuantity 호출용)
export const SPECIAL_FIELD_TO_TRADE: Record<
  'gangForm' | 'alForm' | 'formwork' | 'rebar' | 'concrete',
  { tradeField: 'gangForm' | 'alForm' | 'euroForm' | 'rebar' | 'concrete'; subField: TradeSubFieldKey }
> = {
  gangForm: { tradeField: 'gangForm', subField: 'areaM2' },
  alForm: { tradeField: 'alForm', subField: 'areaM2' },
  formwork: { tradeField: 'euroForm', subField: 'areaM2' },   // UI: formwork → data: euroForm
  rebar: { tradeField: 'rebar', subField: 'ton' },
  concrete: { tradeField: 'concrete', subField: 'volumeM3' },
};

type SpecialRowField = 'gangForm' | 'alForm' | 'formwork' | 'rebar' | 'concrete';

// ─── Pure helper functions (exported for View usage) ─────────────────────────

/**
 * Gets the quantity for a special row field from processPlans.
 */
export function getSpecialRowQuantity(
  processPlans: Map<string, BuildingProcessPlan>,
  buildingId: string,
  floorLabel: string | undefined,
  isSpecialRow: boolean | undefined,
  field: SpecialRowField,
): number {
  if (!isSpecialRow || !floorLabel) return 0;
  const plan = processPlans.get(buildingId);
  const key = floorLabel;
  return plan?.specialRowQuantities?.[key]?.[field] || 0;
}

/**
 * Updates a special row quantity in processPlans.
 */
export function handleSpecialRowQuantityChange(
  processPlans: Map<string, BuildingProcessPlan>,
  buildingId: string,
  floorLabel: string | undefined,
  isSpecialRow: boolean | undefined,
  field: SpecialRowField,
  value: number | null,
  updateProcessPlan: (buildingId: string, plan: BuildingProcessPlan) => void,
  markDirty: (buildingId: string) => void,
): void {
  if (!isSpecialRow || !floorLabel) return;

  const currentPlan = processPlans.get(buildingId);
  if (!currentPlan) return;

  const key = floorLabel;
  const updatedQuantities: Record<string, Record<string, unknown>> = {
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

  updateProcessPlan(buildingId, updatedPlan);
  markDirty(buildingId);
}

/**
 * Calculates the max available quantity for a special row field.
 */
export function getMaxAvailableForSpecialRow(
  processPlans: Map<string, BuildingProcessPlan>,
  building: Building,
  floorLabel: string | undefined,
  isSpecialRow: boolean | undefined,
  field: SpecialRowField,
): number {
  if (!isSpecialRow || !floorLabel) return Infinity;
  const baseFloor = floorLabel.match(/^(B\d+)/)?.[1];
  if (!baseFloor) return Infinity;

  const { tradeField, subField } = SPECIAL_FIELD_TO_TRADE[field];
  const baseQty = resolveProcessQuantity(building, {
    tradeField, subField, ratio: 1, sourceType: 'floor',
  }, baseFloor);

  const currentKey = floorLabel;
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
}

/**
 * Resolves quantity for a basement row, handling special rows, category rows,
 * and floor rows with deductions.
 */
export function resolveBasementQty(
  building: Building,
  processPlans: Map<string, BuildingProcessPlan>,
  rowCategory: ProcessCategory,
  rowFloorLabel: string | undefined,
  rowIsSpecialRow: boolean | undefined,
  tradeField: TradeFieldKey,
  subField: TradeSubFieldKey,
  specialField: SpecialRowField,
  deductions: DeductionFields | undefined,
): number {
  if (rowIsSpecialRow) {
    return getSpecialRowQuantity(processPlans, building.id, rowFloorLabel, rowIsSpecialRow, specialField);
  }
  if (rowCategory === '버림' || rowCategory === '기초') {
    return resolveProcessQuantity(building, {
      tradeField, subField, ratio: 1,
      sourceType: 'category', tradeGroup: rowCategory,
    });
  }
  if (rowCategory === '지하층(층고6.5m이상)') {
    return resolveProcessQuantity(building, {
      tradeField, subField, ratio: 1,
      sourceType: 'combined', combineFloors: ['B1', 'B2'],
    });
  }
  if (!rowFloorLabel) return 0;
  const base = resolveProcessQuantity(building, {
    tradeField, subField, ratio: 1, sourceType: 'floor',
  }, rowFloorLabel);
  return Math.max(0, base - (deductions?.[specialField] || 0));
}

// ─── Hook ────────────────────────────────────────────────────────────────────

export function useBasementProcessPlan(projectId: string) {
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

  // ─── discardChanges wrapper (with confirmation) ──────────────────────────

  const discardChanges = useCallback((buildingId: string) => {
    if (!confirm('변경사항을 취소하시겠습니까?')) return;
    discardChangesWithoutConfirm(buildingId);
  }, [discardChangesWithoutConfirm]);

  // ─── getBasementFloors ───────────────────────────────────────────────────

  const getBasementFloors = useMemo(() => {
    const map = new Map<string, Floor[]>();
    buildings.forEach(building => {
      const basementFloors = building.floors
        .filter(f => f.levelType === '지하')
        .map(floor => {
          const cleanLabel = floor.floorLabel.replace(/코어\d+-/, '');
          return {
            ...floor,
            floorLabel: cleanLabel,
          };
        })
        .sort((a, b) => a.floorNumber - b.floorNumber);
      map.set(building.id, basementFloors);
    });
    return map;
  }, [buildings]);

  // ─── calculateTotalDays ──────────────────────────────────────────────────

  const calculateTotalDays = useCallback((processes: BuildingProcessPlan['processes'], building?: Building): number => {
    let total = 0;
    PROCESS_CATEGORIES.forEach(category => {
      if (category === '주동 지하층' && building) {
        const basementFloors = getBasementFloors.get(building.id) || [];
        basementFloors.forEach(floor => {
          const floorProcessType = processes[category]?.floors?.[floor.floorLabel]?.processType || processes[category]?.processType || DEFAULT_PROCESS_TYPES[category] || '표준공정';
          const mod = getProcessModule(category, floorProcessType);
          if (!mod || !mod.items.length) return;
          const floorDays = calculateModuleWorkDaysForFloor(building, mod, category, floor.floorLabel);
          total += floorDays;
        });
      } else {
        const days = processes[category]?.days;
        if (days !== undefined && days !== null && !isNaN(days)) {
          total += days;
        }
      }
    });
    return total;
  }, [getBasementFloors]);

  // ─── loadBuildings ───────────────────────────────────────────────────────

  const loadBuildings = useCallback(async () => {
    try {
      const data = await getBuildings(projectId);
      setBuildings(data);

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

        const processType = plan.processes[category]?.processType || DEFAULT_PROCESS_TYPES[category] || '표준공정';
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

      // 특수 카테고리 자동 계산
      (['지하주차장', '지하층(층고6.5m이상)'] as ProcessCategory[]).forEach(specialCat => {
        const plan = processPlans.get(building.id);
        if (!plan) return;

        const processType = plan.processes[specialCat]?.processType
          || DEFAULT_PROCESS_TYPES[specialCat] || '표준공정';
        const mod = getProcessModule(specialCat, processType);
        if (!mod || !mod.items.length) return;

        let computedDays = 0;
        if (specialCat === '지하주차장') {
          const basementFloors = getBasementFloors.get(building.id) || [];
          basementFloors.forEach(floor => {
            computedDays += calculateModuleWorkDaysForFloor(
              building, mod, specialCat, floor.floorLabel
            );
          });
        } else {
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
    floorTradesHash,
    processPlans.size,
    buildings,
    processPlans,
    getBasementFloors,
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

  const handleProcessTypeChange = useCallback((buildingId: string, category: ProcessCategory, processType: ProcessType, floorLabel?: string) => {
    const plan = processPlans.get(buildingId);
    if (!plan) return;

    const building = buildings.find(b => b.id === buildingId);
    if (!building) return;

    if ((category === '주동 지하층' || category === '지하주차장' || category === '지하층(층고6.5m이상)') && floorLabel) {
      let targetFloorLabel = floorLabel;
      const parkingMatch = floorLabel.match(/^(B\d+)\s+주차장/);
      const consolidatedMatch = floorLabel.match(/^B1\+B2\s+통합/);

      if (parkingMatch) {
        targetFloorLabel = parkingMatch[1];
      } else if (consolidatedMatch) {
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

      updatedPlan.totalDays = calculateTotalDays(updatedPlan.processes, building);
      updateProcessPlan(buildingId, updatedPlan);
    } else {
      const mod = getProcessModule(category, processType);

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

      updatedPlan.totalDays = calculateTotalDays(updatedPlan.processes, building);
      updateProcessPlan(buildingId, updatedPlan);
    }

    // 모듈 변경 시 자동으로 확장
    const expanded = expandedModules.get(buildingId) || new Set<string>();
    const newExpanded = new Set(expanded);
    newExpanded.add(category);
    updateExpandedModules(buildingId, newExpanded);
  }, [processPlans, buildings, calculateTotalDays, updateProcessPlan, expandedModules, updateExpandedModules]);

  // ─── getProcessTypeForFloor ──────────────────────────────────────────────

  const getProcessTypeForFloor = useCallback((plan: BuildingProcessPlan | undefined, category: ProcessCategory, floorLabel: string): ProcessType => {
    if (!plan) return DEFAULT_PROCESS_TYPES[category] || '표준공정';

    const categoryProcess = plan.processes[category];
    if (!categoryProcess) return DEFAULT_PROCESS_TYPES[category] || '표준공정';

    if ((category === '주동 지하층' || category === '지하주차장' || category === '지하층(층고6.5m이상)') && categoryProcess.floors) {
      if (categoryProcess.floors[floorLabel]) {
        return categoryProcess.floors[floorLabel].processType;
      }
    }

    return categoryProcess.processType || DEFAULT_PROCESS_TYPES[category] || '표준공정';
  }, []);

  // ─── isSpecialRowActive / isHighCeilingActive ────────────────────────────

  const isSpecialRowActive = useCallback((buildingId: string, floorLabel: string): boolean => {
    const plan = processPlans.get(buildingId);
    const quantities = plan?.specialRowQuantities?.[floorLabel];
    if (!quantities) return false;
    return Object.values(quantities).some(v => v !== undefined && v > 0);
  }, [processPlans]);

  const isHighCeilingActive = useCallback((buildingId: string): boolean => {
    return isSpecialRowActive(buildingId, 'B1 6.5m이상') || isSpecialRowActive(buildingId, 'B2 6.5m이상');
  }, [isSpecialRowActive]);

  // ─── calculateBasementFloorDays ──────────────────────────────────────────

  const calculateBasementFloorDays = useCallback((
    building: Building,
    category: ProcessCategory,
    processType: ProcessType,
    floorLabel: string,
  ): number => {
    const mod = getProcessModule(category, processType);
    if (!mod || !mod.items.length) return 0;
    return calculateModuleWorkDaysForFloor(building, mod, category, floorLabel);
  }, []);

  // ─── handleItemDirectWorkDaysChange ──────────────────────────────────────

  const handleItemDirectWorkDaysChange = useCallback((
    buildingId: string,
    itemKey: string,
    newValue: number | null,
  ) => {
    const currentPlan = processPlans.get(buildingId);
    if (!currentPlan) return;

    const parts = itemKey.split('-');
    const category = parts[0] as ProcessCategory;
    const floorLabel = parts.slice(1, -1).join('-');

    const updatedOverrides = {
      ...(currentPlan.itemDirectWorkDaysOverrides || {}),
      [itemKey]: newValue !== null && newValue > 0 ? newValue : undefined,
    };

    const cleanedOverrides: Record<string, number> = {};
    Object.keys(updatedOverrides).forEach(key => {
      const value = updatedOverrides[key];
      if (value !== undefined) {
        cleanedOverrides[key] = value;
      }
    });

    let sumDirectDays = 0;
    const building = buildings.find(b => b.id === buildingId);
    if (!building) return;

    const isParking = floorLabel.includes('주차장');
    const isFacility = floorLabel.includes('3단 가시설 적용부');
    const isHighCeiling = floorLabel.includes('6.5m이상');
    const isSpecialRow = isParking || isFacility || isHighCeiling;

    const floorMatch = floorLabel.match(/^(B\d+)/);
    const targetFloorLabel = isSpecialRow && floorMatch ? floorMatch[1] : floorLabel;

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

    markDirty(buildingId);
  }, [buildings, processPlans, markDirty, calculateTotalDays, updateProcessPlan, getProcessTypeForFloor]);

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

  const processRows = useMemo(() => createBasementProcessRows(activeBuilding), [activeBuilding]);

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
    loadBuildings,
    handleDeleteBuilding,
    handleUpdateBuildingName,
    handleReorder,
    // Process plan operations
    handleProcessTypeChange,
    handleItemDirectWorkDaysChange,
    discardChanges,
    saveToLocalStorage,
    updateProcessPlan,
    updateExpandedModules,
    markDirty,
    // Derived data
    getBasementFloors,
    processRows,
    processColumns,
    maxFloorNumber,
    // Helpers
    getProcessTypeForFloor,
    isSpecialRowActive,
    isHighCeilingActive,
    calculateBasementFloorDays,
    // Constants
    PROCESS_CATEGORIES,
    PROCESS_TYPE_OPTIONS,
    DEFAULT_PROCESS_TYPES,
  };
}
