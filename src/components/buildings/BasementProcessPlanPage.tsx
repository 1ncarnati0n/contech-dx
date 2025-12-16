'use client';

import { Fragment, useState, useEffect, useMemo, useCallback } from 'react';
import { Card, CardHeader, CardTitle, CardContent, Input } from '@/components/ui';
import type { Building, BuildingProcessPlan, ProcessCategory, ProcessType, Floor } from '@/lib/types';
import { getBuildings, deleteBuilding, updateBuilding, reorderBuildings } from '@/lib/services/buildings';
import { toast } from 'sonner';
import { Calendar, ChevronDown, ChevronUp } from 'lucide-react';
import { BuildingTabs } from './BuildingTabs';
import { getProcessModule } from '@/lib/data/process-modules';
import { getQuantityByReference, getQuantityFromFloor } from '@/lib/utils/quantity-reference';
import { 
  calculateTotalWorkers, 
  calculateDailyInputWorkers, 
  calculateTotalWorkDays,
  calculateWorkDaysWithRounding,
  calculateEquipmentCount,
  calculateDailyInputWorkersByEquipment,
  calculateDailyInputWorkersByWorkDays,
} from '@/lib/utils/process-calculation';
import { logger } from '@/lib/utils/logger';

interface Props {
  projectId: string;
}

// 공정 구분 목록 (지하층 공정계획: 버림, 기초, 지하층만)
const PROCESS_CATEGORIES: ProcessCategory[] = ['버림', '기초', '지하층'];

// 공정 타입 옵션 (구분별로 다름) - 지하층 공정계획은 버림, 기초, 지하층만 사용
const PROCESS_TYPE_OPTIONS: Partial<Record<ProcessCategory, ProcessType[]>> = {
  '버림': ['표준공정'],
  '기초': ['표준공정'],
  '지하층': ['표준공정'],
};

// 기본 공정 타입 - 지하층 공정계획은 버림, 기초, 지하층만 사용
const DEFAULT_PROCESS_TYPES: Partial<Record<ProcessCategory, ProcessType>> = {
  '버림': '표준공정',
  '기초': '표준공정',
  '지하층': '표준공정',
};

export function BasementProcessPlanPage({ projectId }: Props) {
  const [buildings, setBuildings] = useState<Building[]>([]);
  const [processPlans, setProcessPlans] = useState<Map<string, BuildingProcessPlan>>(new Map());
  const [isLoading, setIsLoading] = useState(false);
  const [expandedModules, setExpandedModules] = useState<Map<string, Set<string>>>(new Map()); // buildingId-category 조합
  const [activeBuildingIndex, setActiveBuildingIndex] = useState(0);

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
          let cleanLabel = floor.floorLabel.replace(/코어\d+-/, '');
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

  // 동 목록 로드
  useEffect(() => {
    loadBuildings();
  }, [projectId]);

  // 물량 데이터 또는 processPlans 변경 시 자동으로 일수 계산
  useEffect(() => {
    if (buildings.length === 0) return;

    buildings.forEach(building => {
      PROCESS_CATEGORIES.forEach(category => {
        const plan = processPlans.get(building.id);
        if (!plan) return;

        const processType = plan.processes[category]?.processType || DEFAULT_PROCESS_TYPES[category] || '표준공정';
        const module = getProcessModule(category, processType);
        
        if (!module || module.items.length === 0) return;

        // 각 세부공종 항목의 순작업일을 계산하고, 모든 항목의 합계를 해당 구분의 일수로 설정
        let sumDays = 0;
        
        module.items.forEach(item => {
          let directWorkDays = 0;
          
          // directWorkDays가 고정값인 경우
          if (item.directWorkDays !== undefined) {
            directWorkDays = item.directWorkDays;
            sumDays += directWorkDays;
          } 
          // 장비기반 계산인 경우
          else if (item.equipmentCalculationBase !== undefined && item.equipmentWorkersPerUnit !== undefined && item.quantityReference) {
            const quantity = getQuantityByReference(building, item.quantityReference);
            if (quantity > 0 && item.dailyProductivity > 0) {
              // 장비대수 계산
              const calculatedEquipmentCount = calculateEquipmentCount(quantity, item.equipmentCalculationBase);
              // 1일 투입인원 = 장비대수 * 인원수
              const dailyInputWorkers = calculateDailyInputWorkersByEquipment(calculatedEquipmentCount, item.equipmentWorkersPerUnit);
              // 순작업일 계산
              if (dailyInputWorkers > 0) {
                directWorkDays = calculateWorkDaysWithRounding(quantity, item.dailyProductivity, dailyInputWorkers);
                sumDays += directWorkDays;
              }
            }
          }
          // 계산식이 필요한 경우 (quantityReference와 dailyProductivity가 있는 경우)
          else if (item.quantityReference && item.dailyProductivity > 0) {
            const quantity = getQuantityByReference(building, item.quantityReference);
            if (quantity > 0) {
              const totalWorkers = calculateTotalWorkers(quantity, item.dailyProductivity);
              const dailyInputWorkers = calculateDailyInputWorkers(totalWorkers, item.equipmentCount);
              directWorkDays = calculateWorkDaysWithRounding(quantity, item.dailyProductivity, dailyInputWorkers);
              sumDays += directWorkDays;
            }
          }
        });

        // 계산된 일수로 업데이트 (기존 일수와 다를 때만)
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
            return new Map(prevPlans.set(building.id, updatedPlan));
          });
        }
      });
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [
    buildings.map(b => JSON.stringify(b.floorTrades)).join('|'), // floorTrades 변경 감지
    processPlans.size, // processPlans 변경 감지 (셀렉트박스 변경 시)
  ]);

  const loadBuildings = useCallback(async () => {
    try {
      setIsLoading(true);
      const data = await getBuildings(projectId);
      setBuildings(data);
      
      // activeBuildingIndex가 범위를 벗어나면 조정
      setActiveBuildingIndex(prev => {
        if (data.length > 0 && prev >= data.length) {
          return 0;
        }
        return prev;
      });
      
      // 각 동별로 기본 공정 계획 초기화
      setProcessPlans(prevPlans => {
        const plans = new Map<string, BuildingProcessPlan>();
        data.forEach(building => {
          let existingPlan = prevPlans.get(building.id);
          
          // localStorage에서도 로드 시도
          if (!existingPlan && typeof window !== 'undefined') {
            try {
              const storageKey = `contech_process_plan_${building.id}`;
              const storedPlanJson = localStorage.getItem(storageKey);
              if (storedPlanJson) {
                existingPlan = JSON.parse(storedPlanJson) as BuildingProcessPlan;
              }
            } catch (error) {
              logger.error('Failed to load process plan from localStorage:', error);
            }
          }
          
          if (!existingPlan) {
            const defaultProcesses: BuildingProcessPlan['processes'] = {};
            PROCESS_CATEGORIES.forEach(category => {
              defaultProcesses[category] = {
                days: 0,
                processType: DEFAULT_PROCESS_TYPES[category] || '표준공정',
              };
            });
            
            plans.set(building.id, {
              id: `plan-${building.id}`,
              buildingId: building.id,
              projectId: projectId,
              processes: defaultProcesses,
              totalDays: 0,
            });
          } else {
            plans.set(building.id, existingPlan);
          }
        });
        return plans;
      });
    } catch (error) {
      toast.error('동 목록을 불러오는데 실패했습니다.');
    } finally {
      setIsLoading(false);
    }
  }, [projectId]);

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
    } catch (error) {
      toast.error('동 삭제에 실패했습니다.');
    }
  }, [projectId, loadBuildings]);

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
    } catch (error) {
      toast.error('동 순서 변경에 실패했습니다.');
    }
  }, [projectId, loadBuildings]);

  // 공정 타입 변경
  const handleProcessTypeChange = (buildingId: string, category: ProcessCategory, processType: ProcessType, floorLabel?: string) => {
    const plan = processPlans.get(buildingId);
    if (!plan) return;

    const building = buildings.find(b => b.id === buildingId);
    if (!building) return;

    // 지하층의 경우 층별로 저장
    if (category === '지하층' && floorLabel) {
      // 주차장이나 3단 가시설 적용부인 경우, 해당 지하층의 공정타입도 함께 업데이트
      let targetFloorLabel = floorLabel;
      const parkingMatch = floorLabel.match(/^(B\d+)\s+주차장/);
      const facilityMatch = floorLabel.match(/^(B\d+)\s+3단\s+가시설\s+적용부/);
      
      if (parkingMatch) {
        targetFloorLabel = parkingMatch[1];
      } else if (facilityMatch) {
        targetFloorLabel = facilityMatch[1];
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
      setProcessPlans(new Map(processPlans.set(buildingId, updatedPlan)));
    } else {
      // 기존 로직 (카테고리 전체에 대한 공정 변경)
      // 새로운 모듈 가져오기
      const module = getProcessModule(category, processType);
      
      // 일수 재계산 (순작업일 합계)
      let sumDays = 0;
      if (module && module.items.length > 0) {
        module.items.forEach(item => {
          let directWorkDays = 0;
          
          // directWorkDays가 고정값인 경우
          if (item.directWorkDays !== undefined) {
            directWorkDays = item.directWorkDays;
            sumDays += directWorkDays;
          } 
          // 계산식이 필요한 경우 (quantityReference와 dailyProductivity가 있는 경우)
          else if (item.quantityReference && item.dailyProductivity > 0) {
            const quantity = getQuantityByReference(building, item.quantityReference);
            if (quantity > 0) {
              const totalWorkers = calculateTotalWorkers(quantity, item.dailyProductivity);
              const dailyInputWorkers = calculateDailyInputWorkers(totalWorkers, item.equipmentCount);
              directWorkDays = calculateWorkDaysWithRounding(quantity, item.dailyProductivity, dailyInputWorkers);
              sumDays += directWorkDays;
            }
          }
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
      setProcessPlans(new Map(processPlans.set(buildingId, updatedPlan)));
    }
    
    // 모듈 변경 시 자동으로 확장
    const expanded = expandedModules.get(buildingId) || new Set<string>();
    const newExpanded = new Set(expanded);
    newExpanded.add(category);
    setExpandedModules(new Map(expandedModules.set(buildingId, newExpanded)));
  };

  // 각 층별 processType을 가져오는 헬퍼 함수
  const getProcessTypeForFloor = (plan: BuildingProcessPlan | undefined, category: ProcessCategory, floorLabel: string): ProcessType => {
    if (!plan) return DEFAULT_PROCESS_TYPES[category] || '표준공정';
    
    const categoryProcess = plan.processes[category];
    if (!categoryProcess) return DEFAULT_PROCESS_TYPES[category] || '표준공정';
    
    // 지하층의 경우 층별 processType 확인
    if (category === '지하층' && categoryProcess.floors) {
      if (categoryProcess.floors[floorLabel]) {
        return categoryProcess.floors[floorLabel].processType;
      }
    }
    
    // 기본 processType 반환
    return categoryProcess.processType || DEFAULT_PROCESS_TYPES[category] || '표준공정';
  };

  // 합계일수 계산 - 모든 공정 카테고리의 일수 합계
  const calculateTotalDays = (processes: BuildingProcessPlan['processes'], building?: Building): number => {
    let total = 0;
    // 모든 공정 카테고리의 일수를 합산
    PROCESS_CATEGORIES.forEach(category => {
      if (category === '지하층' && building) {
        // 지하층는 각 층별 일수를 합산
        const basementFloors = getBasementFloors.get(building.id) || [];
        basementFloors.forEach(floor => {
          const floorProcessType = processes[category]?.floors?.[floor.floorLabel]?.processType || processes[category]?.processType || DEFAULT_PROCESS_TYPES[category] || '표준공정';
          const floorDays = calculateBasementFloorDays(building, category, floorProcessType, floor.floorLabel);
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
  };

  // 지하층 각 층별 일수 계산
  const calculateBasementFloorDays = (
    building: Building,
    category: ProcessCategory,
    processType: ProcessType,
    floorLabel: string
  ): number => {
    const module = getProcessModule(category, processType);
    if (!module || !module.items.length) return 0;

    let sumDays = 0;
    
    // 해당 층의 항목만 필터링
    const floorItems = module.items.filter(item => item.floorLabel === floorLabel);
    
    floorItems.forEach(item => {
      let directWorkDays = 0;
      
      // directWorkDays가 고정값인 경우
      if (item.directWorkDays !== undefined) {
        directWorkDays = item.directWorkDays;
        sumDays += directWorkDays;
      } 
      // 장비기반 계산인 경우
      else if (item.equipmentCalculationBase !== undefined && item.equipmentWorkersPerUnit !== undefined && item.quantityReference) {
        const quantity = getQuantityByReference(building, item.quantityReference);
        if (quantity > 0 && item.dailyProductivity > 0) {
          const calculatedEquipmentCount = calculateEquipmentCount(quantity, item.equipmentCalculationBase);
          const dailyInputWorkers = calculateDailyInputWorkersByEquipment(calculatedEquipmentCount, item.equipmentWorkersPerUnit);
          if (dailyInputWorkers > 0) {
            directWorkDays = calculateWorkDaysWithRounding(quantity, item.dailyProductivity, dailyInputWorkers);
            sumDays += directWorkDays;
          }
        }
      }
      // 계산식이 필요한 경우
      else if (item.quantityReference && item.dailyProductivity > 0) {
        const quantity = getQuantityByReference(building, item.quantityReference);
        if (quantity > 0) {
          const totalWorkers = calculateTotalWorkers(quantity, item.dailyProductivity);
          const dailyInputWorkers = calculateDailyInputWorkers(totalWorkers, item.equipmentCount);
          directWorkDays = calculateWorkDaysWithRounding(quantity, item.dailyProductivity, dailyInputWorkers);
          sumDays += directWorkDays;
        }
      }
    });
    
    return Math.floor(sumDays);
  };

  // 지하층 공정계획에서는 옥탑층 일수 계산 함수를 사용하지 않음 (BuildingProcessPlanPage에서 처리)

  // 지하층 공정계획에서는 기준층과 셋팅층 일수 계산 함수를 사용하지 않음 (BuildingProcessPlanPage에서 처리)

  // 동별 주요정보 계산 (Building.meta에서 가져오기)
  const getBuildingInfo = (building: Building) => {
    const meta = building.meta;
    
    // 호수
    const totalUnits = meta.totalUnits;
    
    // 코어 개수
    const coreCount = meta.coreCount;
    
    // 필로티 세대수
    const pilotisCount = meta.floorCount.pilotisCount || 0;
    
    // 지상층수 계산
    const groundFloors = meta.floorCount.coreGroundFloors 
      ? meta.floorCount.coreGroundFloors.reduce((sum, count) => sum + (count || 0), 0)
      : meta.floorCount.ground || 0;
    
    // 단위세대 구성 문자열 생성
    const unitComposition = meta.unitTypePattern
      .map(pattern => {
        const coreNum = pattern.coreNumber || 1;
        return `코어${coreNum} ${pattern.from}~${pattern.to}호 ${pattern.type}`;
      })
      .join(', ');

    return {
      totalUnits,
      coreCount,
      pilotisCount,
      groundFloors,
      unitComposition,
    };
  };

  // activeBuilding을 먼저 계산 (hooks 순서 보장을 위해)
  const activeBuilding = buildings.length > 0 && activeBuildingIndex < buildings.length 
    ? buildings[activeBuildingIndex] 
    : null;

  // 물량입력표와 반대 순서로 행 생성 (옥탑층, PH층, 지상층, 지하층, 기초, 버림)
  const processRows = useMemo(() => {
    if (!activeBuilding) return [];
    
    const rows: Array<{
      category: ProcessCategory;
      floorLabel?: string;
      floor?: Floor;
      floorClass?: string;
      rowIndex: number;
      isSpecialRow?: boolean; // 주차장, 3단 가시설 적용부 구분용
    }> = [];
    
    let rowIndex = 0;
    const floors = activeBuilding.floors;
    
    // 지하층 공정계획: 버림, 기초, 지하층만 표시
    // 3. 지하층 추가 (역순)
    const basementFloors = floors.filter(f => f.levelType === '지하')
      .sort((a, b) => (b.floorNumber || 0) - (a.floorNumber || 0)); // 역순 정렬
    
    // cleanLabel 기준으로 중복 제거
    const addedLabels = new Set<string>();
    basementFloors.forEach(floor => {
      // 코어 정보 제거 (예: "코어1-B1" -> "B1")
      let cleanLabel = floor.floorLabel.replace(/코어\d+-/, '');
      
      // 이미 추가된 cleanLabel이면 건너뛰기
      if (addedLabels.has(cleanLabel)) {
        return;
      }
      addedLabels.add(cleanLabel);
      
      // 각 지하층별로 주차장 행 추가
      rows.push({ 
        category: '지하층' as ProcessCategory, 
        rowIndex: rowIndex++,
        isSpecialRow: true,
        floorLabel: `${cleanLabel} 주차장`
      });
      
      // 각 지하층별로 3단 가시설 적용부 행 추가
      rows.push({ 
        category: '지하층' as ProcessCategory, 
        rowIndex: rowIndex++,
        isSpecialRow: true,
        floorLabel: `${cleanLabel} 3단 가시설 적용부`
      });
      
      // 지하층 행 추가
      rows.push({ 
        category: '지하층', 
        floorLabel: cleanLabel, 
        floor, 
        floorClass: floor.floorClass,
        rowIndex: rowIndex++ 
      });
    });
    
    // 4. 기초 행 추가
    rows.push({ category: '기초', rowIndex: rowIndex++ });
    
    // 5. 버림 행 추가 (맨 아래)
    rows.push({ category: '버림', rowIndex: rowIndex++ });
    
    return rows;
  }, [activeBuilding]);
  
  // 공정 열 목록 생성 (첫 번째 공정 열만 사용)
  const processColumns = useMemo(() => {
    if (!activeBuilding) return [];
    return [{ category: '버림' as ProcessCategory, colIndex: 0 }];
  }, [activeBuilding]);

  // 전체 행 수 계산 (공정 구분 행 수 + 합계 행)
  const totalRows = useMemo(() => {
    if (!activeBuilding) return 0;
    // processRows의 행 수 + 합계 1행
    return processRows.length + 1;
  }, [processRows]);

  return (
    <div className="space-y-6 w-full px-4 sm:px-6 lg:px-8">
      <div className="mb-6">
        <div className="flex items-center gap-3 mb-2">
          <Calendar className="w-6 h-6 text-primary-600 dark:text-primary-400" />
          <h2 className="text-2xl font-bold text-slate-900 dark:text-white">지하층 공정계획</h2>
        </div>
        <p className="text-slate-600 dark:text-slate-400">
          지하층 공정계획을 입력하고 관리합니다. 산정된 일수는 간트차트에서 활용됩니다.
        </p>
      </div>

      {/* 가설공사 흙막이 토공사 공사일수 입력창 - 동별 구분 탭 위에 표시 */}
      {buildings.length > 0 && activeBuilding && (() => {
        const building = activeBuilding;
        const plan = processPlans.get(building.id);
        const temporaryWorkDays = plan?.temporaryWorkDays || 0;
        const earthRetentionWorkDays = plan?.earthRetentionWorkDays || 0;
        const earthworkWorkDays = plan?.earthworkWorkDays || 0;
        
        const handleWorkDaysChange = (field: 'temporaryWorkDays' | 'earthRetentionWorkDays' | 'earthworkWorkDays', value: number | null) => {
          if (!building) return;
          
          const currentPlan = processPlans.get(building.id);
          if (!currentPlan) return;
          
          const updatedPlan = {
            ...currentPlan,
            [field]: value !== null && value >= 0 ? value : undefined,
          };
          
          setProcessPlans(new Map(processPlans.set(building.id, updatedPlan)));
          
          // localStorage에 저장
          try {
            if (typeof window !== 'undefined') {
              const storageKey = `contech_process_plan_${building.id}`;
              localStorage.setItem(storageKey, JSON.stringify(updatedPlan));
            }
          } catch (error) {
            logger.error('Failed to save work days:', error);
            toast.error('공사일수 저장에 실패했습니다.');
          }
        };
        
        return (
          <Card className="mb-4">
            <CardContent className="p-4">
              <div className="flex items-center gap-6 flex-wrap">
                <div className="flex items-center gap-2">
                  <label className="text-sm font-semibold text-slate-900 dark:text-white whitespace-nowrap">
                    가설공사 공사일수:
                  </label>
                  <Input
                    type="number"
                    min="0"
                    step="1"
                    value={temporaryWorkDays || ''}
                    onChange={(e) => {
                      const value = e.target.value === '' ? null : parseFloat(e.target.value);
                      handleWorkDaysChange('temporaryWorkDays', value);
                    }}
                    onBlur={(e) => {
                      const value = e.target.value === '' ? null : Math.max(0, Math.round(parseFloat(e.target.value) || 0));
                      handleWorkDaysChange('temporaryWorkDays', value);
                    }}
                    className="w-24"
                    placeholder="일수"
                  />
                  <span className="text-sm text-slate-600 dark:text-slate-400">일</span>
                </div>
                <div className="flex items-center gap-2">
                  <label className="text-sm font-semibold text-slate-900 dark:text-white whitespace-nowrap">
                    흙막이 공사일수:
                  </label>
                  <Input
                    type="number"
                    min="0"
                    step="1"
                    value={earthRetentionWorkDays || ''}
                    onChange={(e) => {
                      const value = e.target.value === '' ? null : parseFloat(e.target.value);
                      handleWorkDaysChange('earthRetentionWorkDays', value);
                    }}
                    onBlur={(e) => {
                      const value = e.target.value === '' ? null : Math.max(0, Math.round(parseFloat(e.target.value) || 0));
                      handleWorkDaysChange('earthRetentionWorkDays', value);
                    }}
                    className="w-24"
                    placeholder="일수"
                  />
                  <span className="text-sm text-slate-600 dark:text-slate-400">일</span>
                </div>
                <div className="flex items-center gap-2">
                  <label className="text-sm font-semibold text-slate-900 dark:text-white whitespace-nowrap">
                    토공사 공사일수:
                  </label>
                  <Input
                    type="number"
                    min="0"
                    step="1"
                    value={earthworkWorkDays || ''}
                    onChange={(e) => {
                      const value = e.target.value === '' ? null : parseFloat(e.target.value);
                      handleWorkDaysChange('earthworkWorkDays', value);
                    }}
                    onBlur={(e) => {
                      const value = e.target.value === '' ? null : Math.max(0, Math.round(parseFloat(e.target.value) || 0));
                      handleWorkDaysChange('earthworkWorkDays', value);
                    }}
                    className="w-24"
                    placeholder="일수"
                  />
                  <span className="text-sm text-slate-600 dark:text-slate-400">일</span>
                </div>
              </div>
            </CardContent>
          </Card>
        );
      })()}

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
            <Card className="w-full">
                <CardContent className="p-0">
                  <div className="overflow-x-auto w-full">
                    <table className="w-full border-collapse text-sm table-fixed">
                    <colgroup>
                      {/* 구분 항목 */}<col style={{ width: '80px' }} />
                      {/* 층수 */}<col style={{ width: '115px' }} />
                      {/* 형틀 */}<col style={{ width: '80px' }} />
                      {/* 철근 */}<col style={{ width: '80px' }} />
                      {/* 콘크리트 */}<col style={{ width: '80px' }} />
                      {/* 일수 */}<col style={{ width: '90px' }} />
                      {/* 공정타입 */}<col style={{ width: '115px' }} />
                      {/* 세부공정 */}<col style={{ width: '80px' }} />
                      {/* 세부공정 상세 */}<col style={{ minWidth: '400px' }} />
                    </colgroup>
                    <thead>
                      <tr className="bg-slate-50 dark:bg-slate-900 border-b-2 border-slate-200 dark:border-slate-800" style={{ height: '24px' }}>
                        {/* 첫 번째 열: 구분 항목 */}
                        <th className="px-2 py-1 text-center text-xs font-semibold text-slate-900 dark:text-white border-r border-slate-200 dark:border-slate-800" style={{ height: '24px', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                          구분
                        </th>
                        {/* 두 번째 열: 층수 */}
                        <th className="px-2 py-1 text-center text-xs font-semibold text-slate-900 dark:text-white border-r border-slate-200 dark:border-slate-800" style={{ height: '24px', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                          층수
                        </th>
                        {/* 세 번째 열: 형틀 */}
                        <th className="px-1 py-1 text-center text-xs font-semibold text-slate-900 dark:text-white border-r border-slate-200 dark:border-slate-800" style={{ height: '24px', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                          형틀
                        </th>
                        {/* 네 번째 열: 철근 */}
                        <th className="px-1 py-1 text-center text-xs font-semibold text-slate-900 dark:text-white border-r border-slate-200 dark:border-slate-800" style={{ height: '24px', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                          철근
                        </th>
                        {/* 다섯 번째 열: 콘크리트 */}
                        <th className="px-1 py-1 text-center text-xs font-semibold text-slate-900 dark:text-white border-r-2 border-slate-200 dark:border-slate-800" style={{ height: '24px', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                          콘크리트
                        </th>
                        
                        {/* 첫 번째 공정 열만 헤더 표시 (일수, 셀렉트박스, 버튼) */}
                        {processColumns.length > 0 && (
                          <Fragment key={`header-${processColumns[0].category}-${processColumns[0].colIndex}`}>
                            {/* 일수 열 */}
                            <th className="px-1 py-1 text-center text-xs font-semibold text-slate-900 dark:text-white border-r border-slate-200 dark:border-slate-800" style={{ height: '24px', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                              순작업일수
                            </th>
                            {/* 셀렉트박스 열 */}
                            <th className="px-1 py-1 text-center text-xs font-semibold text-slate-900 dark:text-white border-r border-slate-200 dark:border-slate-800" style={{ height: '24px', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                              공정타입
                            </th>
                            {/* 버튼 열 */}
                            <th className="px-1 py-1 text-center text-xs font-semibold text-slate-900 dark:text-white border-r border-slate-200 dark:border-slate-800" style={{ height: '24px', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                              세부공정
                            </th>
                          </Fragment>
                        )}
                        
                        {/* 마지막 열: 세부공정 확장 영역 (모든 행에 걸친 넓은 칸) */}
                        <th 
                          className="px-4 py-2 text-center text-sm font-semibold text-slate-900 dark:text-white"
                          rowSpan={totalRows}
                          style={{ height: '30px', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', width: '100%', maxWidth: '218px' }}
                        >
                          세부공정 상세
                        </th>
                      </tr>
                    </thead>
                    <tbody>
                      {(() => {
                        const building = activeBuilding;
                        const plan = processPlans.get(building.id);
                        const info = getBuildingInfo(building);
                        const isDetailExpanded = expandedModules.get(building.id) || new Set<string>();
                        const firstRowIsSpecial = processRows[0]?.isSpecialRow || false;
                        
                        return (
                          <Fragment key={building.id}>
                            {/* 공정 구분 섹션 - 물량입력표와 동일한 순서로 행 표시 */}
                            {processRows.map((row, rowIdx) => {
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
                                
                                setProcessPlans(new Map(processPlans.set(building.id, updatedPlan)));
                                
                                // localStorage에 저장
                                try {
                                  if (typeof window !== 'undefined') {
                                    const storageKey = `contech_process_plan_${building.id}`;
                                    localStorage.setItem(storageKey, JSON.stringify(updatedPlan));
                                  }
                                } catch (error) {
                                  logger.error('Failed to save special row quantity:', error);
                                  toast.error('수량 저장에 실패했습니다.');
                                }
                              };
                              
                              // 특수 행(주차장, 3단 가시설 적용부)은 일수 계산 건너뛰기
                              if (row.isSpecialRow) {
                                // 특수 행은 일수 0으로 표시
                                // 주차장과 3단 가시설에도 해당 지하층의 표준공정 적용
                                let processType: ProcessType;
                                if (row.floorLabel) {
                                  // floorLabel에서 지하층 정보 추출 (예: "B1 주차장" -> "B1")
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
                                const module = getProcessModule(row.category, processType);
                                
                                // 확장 상태 확인
                                const expandKey = row.floorLabel 
                                  ? `${row.category}-${row.floorLabel}`
                                  : row.category;
                                const isExpanded = isDetailExpanded.has(expandKey);
                                
                                // 3단 가시설 적용부는 여러 줄 표기 허용
                                const isMultiLineRow = row.floorLabel?.includes('3단 가시설 적용부');
                                
                                // 구분 항목 표시
                                const getCategoryLabelLocal = () => {
                                  return '지하층';
                                };
                                
                                return (
                                  <tr 
                                    key={`process-${row.category}-${row.floorLabel || ''}-${row.rowIndex}`}
                                    className="border-b border-slate-200 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-900/50"
                                    style={{ height: 'auto' }}
                                  >
                                    {/* 첫 번째 열: 구분 항목 */}
                                    <td className="px-2 py-1 text-xs font-semibold text-slate-900 dark:text-white border-r border-slate-200 dark:border-slate-800 align-middle" style={{ whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                                      <div className="text-center">{getCategoryLabelLocal()}</div>
                                    </td>
                                    
                                    {/* 두 번째 열: 층수 */}
                                    <td className="px-2 py-1 text-xs font-semibold text-slate-900 dark:text-white border-r border-slate-200 dark:border-slate-800 align-middle" style={{ ...(isMultiLineRow ? {} : { whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }) }}>
                                      <div className="text-center font-normal">{row.floorLabel || ''}</div>
                                    </td>
                                    
                                    {/* 세 번째 열: 형틀 */}
                                    <td className="px-1 py-0.5 text-center text-xs border-r border-slate-200 dark:border-slate-800 align-middle">
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
                                          const value = e.target.value === '' ? null : Math.max(0, parseFloat(e.target.value) || 0);
                                          handleSpecialRowQuantityChangeLocal('formwork', value);
                                        }}
                                        className="flex justify-center items-center text-center w-16 h-5 text-xs px-1 py-0 [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:appearance-none [-moz-appearance:textfield]"
                                        placeholder="0"
                                        title="형틀"
                                        onClick={(e) => e.stopPropagation()}
                                      />
                                    </td>
                                    
                                    {/* 네 번째 열: 철근 */}
                                    <td className="px-1 py-0.5 text-center text-xs border-r border-slate-200 dark:border-slate-800 align-middle">
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
                                          const value = e.target.value === '' ? null : Math.max(0, parseFloat(e.target.value) || 0);
                                          handleSpecialRowQuantityChangeLocal('rebar', value);
                                        }}
                                        className="flex justify-center items-center text-center w-16 h-5 text-xs px-1 py-0 [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:appearance-none [-moz-appearance:textfield]"
                                        placeholder="0"
                                        onClick={(e) => e.stopPropagation()}
                                      />
                                    </td>
                                    
                                    {/* 다섯 번째 열: 콘크리트 */}
                                    <td className="px-1 py-0.5 text-center text-xs border-r-2 border-slate-200 dark:border-slate-800 align-middle">
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
                                          const value = e.target.value === '' ? null : Math.max(0, parseFloat(e.target.value) || 0);
                                          handleSpecialRowQuantityChangeLocal('concrete', value);
                                        }}
                                        className="flex justify-center items-center text-center w-16 h-5 text-xs px-1 py-0 [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:appearance-none [-moz-appearance:textfield]"
                                        placeholder="0"
                                        onClick={(e) => e.stopPropagation()}
                                      />
                                    </td>
                                    
                                    {/* 여섯 번째 열: 일수 */}
                                    <td className="px-1 py-1 text-center border-r border-slate-200 dark:border-slate-800 align-middle" style={{ height: '24px' }}>
                                      {(() => {
                                        // 주차장과 3단 가시설의 순작업일 합계 계산
                                        if (module && module.items.length > 0 && row.floorLabel) {
                                          let sumDirectDays = 0;
                                          const specialKey = row.floorLabel;
                                          const specialQuantities = plan?.specialRowQuantities?.[specialKey] || {};
                                          
                                          // floorLabel에서 지하층 정보 추출 (예: "B1 주차장" -> "B1")
                                          const floorMatch = row.floorLabel.match(/^(B\d+)/);
                                          const targetFloorLabel = floorMatch ? floorMatch[1] : row.floorLabel;
                                          
                                          // 해당 층의 항목만 필터링
                                          const floorItems = module.items.filter(item => {
                                            return item.floorLabel === targetFloorLabel;
                                          });
                                          
                                          floorItems.forEach(item => {
                                            // 오버라이드된 순작업일 확인
                                            const itemKey = `${row.category}-${row.floorLabel || ''}-${item.id}`;
                                            const overriddenDays = plan?.itemDirectWorkDaysOverrides?.[itemKey];
                                            
                                            if (overriddenDays !== undefined) {
                                              sumDirectDays += overriddenDays;
                                              return;
                                            }
                                            
                                            let directWorkDays = 0;
                                            let quantity = 0;
                                            
                                            // specialRowQuantities에서 수량 가져오기
                                            if (item.quantityReference) {
                                              const refMatch = item.quantityReference.match(/^([A-Z])(\d+)(?:\*([\d.]+))?$/);
                                              if (refMatch) {
                                                const [, col] = refMatch;
                                                const ratio = refMatch[3] ? parseFloat(refMatch[3]) : 1;
                                                
                                                // specialRowQuantities에서 해당 필드의 수량 가져오기
                                                if (col === 'B') {
                                                  quantity = (specialQuantities.gangForm || 0) * ratio;
                                                } else if (col === 'C') {
                                                  quantity = (specialQuantities.alForm || 0) * ratio;
                                                } else if (col === 'D') {
                                                  quantity = (specialQuantities.formwork || 0) * ratio;
                                                } else if (col === 'F') {
                                                  quantity = (specialQuantities.rebar || 0) * ratio;
                                                } else if (col === 'G') {
                                                  quantity = (specialQuantities.concrete || 0) * ratio;
                                                }
                                              }
                                            }
                                            
                                            if (item.directWorkDays !== undefined) {
                                              directWorkDays = item.directWorkDays;
                                              sumDirectDays += directWorkDays;
                                            } else if (item.equipmentCalculationBase !== undefined && item.equipmentWorkersPerUnit !== undefined && item.quantityReference) {
                                              if (quantity > 0 && item.dailyProductivity > 0) {
                                                const calculatedEquipmentCount = calculateEquipmentCount(quantity, item.equipmentCalculationBase);
                                                const dailyInputWorkers = calculateDailyInputWorkersByEquipment(calculatedEquipmentCount, item.equipmentWorkersPerUnit);
                                                if (dailyInputWorkers > 0) {
                                                  directWorkDays = calculateWorkDaysWithRounding(quantity, item.dailyProductivity, dailyInputWorkers);
                                                  sumDirectDays += directWorkDays;
                                                }
                                              }
                                            } else if (item.quantityReference && item.dailyProductivity > 0) {
                                              if (quantity > 0) {
                                                const totalWorkers = calculateTotalWorkers(quantity, item.dailyProductivity);
                                                const dailyInputWorkers = calculateDailyInputWorkers(totalWorkers, item.equipmentCount);
                                                directWorkDays = calculateWorkDaysWithRounding(quantity, item.dailyProductivity, dailyInputWorkers);
                                                sumDirectDays += directWorkDays;
                                              }
                                            }
                                          });
                                          
                                          return (
                                            <div className="w-full px-2 py-1 text-sm text-center border border-slate-300 dark:border-slate-700 rounded bg-slate-100 dark:bg-slate-900 text-slate-900 dark:text-white">
                                              {Math.floor(sumDirectDays)}
                                            </div>
                                          );
                                        }
                                        
                                        return (
                                          <div className="w-full px-2 py-1 text-sm text-center border border-slate-300 dark:border-slate-700 rounded bg-slate-100 dark:bg-slate-900 text-slate-900 dark:text-white">
                                            0
                                          </div>
                                        );
                                      })()}
                                    </td>
                                    
                                    {/* 일곱 번째 열: 셀렉트박스 */}
                                    <td className="px-1 py-1 border-r border-slate-200 dark:border-slate-800 align-middle" style={{ height: '24px' }}>
                                      <select
                                        value={processType}
                                        onChange={(e) => {
                                          handleProcessTypeChange(building.id, row.category, e.target.value as ProcessType, row.floorLabel);
                                        }}
                                        className="w-full px-1 py-0.5 text-xs border border-slate-300 dark:border-slate-700 rounded bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-primary-500"
                                      >
                                        {(PROCESS_TYPE_OPTIONS[row.category] || []).map(option => (
                                          <option key={option} value={option}>
                                            {option}
                                          </option>
                                        ))}
                                      </select>
                                    </td>
                                    
                                    {/* 여덟 번째 열: 세부공정 버튼 */}
                                    <td className="px-1 py-1 border-r border-slate-200 dark:border-slate-800 align-middle" style={{ height: '24px' }}>
                                      {module && module.items.length > 0 && (
                                        <button
                                          onClick={() => {
                                            const expanded = expandedModules.get(building.id) || new Set<string>();
                                            const newExpanded = new Set<string>();
                                            // 다른 행의 확장 상태를 모두 제거하고 현재 행만 확장
                                            if (!expanded.has(expandKey)) {
                                              newExpanded.add(expandKey);
                                            }
                                            // 이미 확장된 경우 닫기 (newExpanded는 빈 Set이므로 아무것도 표시되지 않음)
                                            setExpandedModules(new Map(expandedModules.set(building.id, newExpanded)));
                                          }}
                                          className="p-1 hover:bg-slate-200 dark:hover:bg-slate-700 rounded mx-auto block"
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
                                    
                                    {/* 아홉 번째 열: 세부공정 상세 (첫 번째 행에서만 rowSpan으로 표시) */}
                                    {rowIdx === 0 && (
                                      <td rowSpan={totalRows} className="px-4 py-2 align-top border-l-2 border-slate-200 dark:border-slate-800" style={{ width: '100%' }}>
                                        <div className="space-y-4 text-xs max-h-[600px] overflow-y-auto min-h-[200px]">
                                          {/* 현재 확장된 행의 세부공정만 표시 */}
                                          {(() => {
                                            // 확장된 행 찾기 (한 번에 하나만)
                                            const expandedRow = processRows.find((col) => {
                                              const expandKey = col.floorLabel 
                                                ? `${col.category}-${col.floorLabel}`
                                                : col.category === '기준층'
                                                  ? '기준층-세부공정'
                                                  : col.category;
                                              return isDetailExpanded.has(expandKey);
                                            });
                                            
                                            if (!expandedRow) {
                                              // 확장된 행이 없을 때도 공간 유지
                                              return (
                                                <div className="text-slate-400 dark:text-slate-500 text-center py-8">
                                                  세부공정 버튼을 클릭하여 상세 정보를 확인하세요
                                                </div>
                                              );
                                            }
                                            
                                            const expandKey = expandedRow.floorLabel 
                                              ? `${expandedRow.category}-${expandedRow.floorLabel}`
                                              : expandedRow.category === '기준층'
                                                ? '기준층-세부공정'
                                                : expandedRow.category;
                                            
                                            // 지하층 공정계획에서는 일반층을 처리하지 않음
                                            const expandedEffectiveCategory = expandedRow.category;
                                            
                                            // 주차장이나 3단 가시설인지 확인
                                            const isParking = expandedRow.floorLabel?.includes('주차장');
                                            const isFacility = expandedRow.floorLabel?.includes('3단 가시설 적용부');
                                            const isSpecialRow = isParking || isFacility;
                                            
                                            // 주차장이나 3단 가시설인 경우 해당 지하층의 공정타입 사용
                                            let targetFloorLabel = expandedRow.floorLabel;
                                            if (isSpecialRow && expandedRow.floorLabel) {
                                              const floorMatch = expandedRow.floorLabel.match(/^(B\d+)/);
                                              if (floorMatch) {
                                                targetFloorLabel = floorMatch[1];
                                              }
                                            }
                                            
                                            const colProcessType = expandedRow.floorLabel && expandedRow.category === '지하층'
                                              ? getProcessTypeForFloor(plan, expandedRow.category, targetFloorLabel || expandedRow.floorLabel)
                                              : plan?.processes[expandedRow.category]?.processType || DEFAULT_PROCESS_TYPES[expandedRow.category] || '표준공정';
                                            const colModule = getProcessModule(expandedEffectiveCategory, colProcessType);
                                            
                                            if (!colModule || !colModule.items.length) return null;
                                            
                                            // 순작업일 합계 계산 (오버라이드된 값 고려)
                                            const calculateDirectWorkDaysSum = () => {
                                              // 버림, 기초는 floorLabel 없이 계산
                                              if (expandedRow.category === '버림' || expandedRow.category === '기초') {
                                                let sumDirectDays = 0;
                                                
                                                colModule.items.forEach(item => {
                                                  // 오버라이드된 순작업일 확인
                                                  const itemKey = `${expandedRow.category}-${expandedRow.floorLabel || ''}-${item.id}`;
                                                  const overriddenDays = plan?.itemDirectWorkDaysOverrides?.[itemKey];
                                                  
                                                  if (overriddenDays !== undefined) {
                                                    // 오버라이드된 값 사용
                                                    sumDirectDays += overriddenDays;
                                                    return;
                                                  }
                                                  
                                                  let directWorkDays = 0;
                                                  let quantity = 0;
                                                  
                                                  if (item.quantityReference) {
                                                    quantity = getQuantityByReference(building, item.quantityReference);
                                                  }
                                                  
                                                  if (item.directWorkDays !== undefined) {
                                                    directWorkDays = item.directWorkDays;
                                                    sumDirectDays += directWorkDays;
                                                  } else if (item.equipmentCalculationBase !== undefined && item.equipmentWorkersPerUnit !== undefined && item.quantityReference) {
                                                    if (quantity > 0 && item.dailyProductivity > 0) {
                                                      const calculatedEquipmentCount = calculateEquipmentCount(quantity, item.equipmentCalculationBase);
                                                      const dailyInputWorkers = calculateDailyInputWorkersByEquipment(calculatedEquipmentCount, item.equipmentWorkersPerUnit);
                                                      if (dailyInputWorkers > 0) {
                                                        directWorkDays = calculateWorkDaysWithRounding(quantity, item.dailyProductivity, dailyInputWorkers);
                                                        sumDirectDays += directWorkDays;
                                                      }
                                                    }
                                                  } else if (item.quantityReference && item.dailyProductivity > 0) {
                                                    if (quantity > 0) {
                                                      const totalWorkers = calculateTotalWorkers(quantity, item.dailyProductivity);
                                                      const dailyInputWorkers = calculateDailyInputWorkers(totalWorkers, item.equipmentCount);
                                                      directWorkDays = calculateWorkDaysWithRounding(quantity, item.dailyProductivity, dailyInputWorkers);
                                                      sumDirectDays += directWorkDays;
                                                    }
                                                  }
                                                });
                                                
                                                return Math.floor(sumDirectDays);
                                              }
                                              
                                              // 지하층 공정계획에서는 지하층만 처리
                                              if (!expandedRow.floorLabel || expandedRow.category !== '지하층') {
                                                return 0;
                                              }
                                              
                                              let sumDirectDays = 0;
                                              
                                              // 주차장이나 3단 가시설인 경우 해당 특수 행의 수량 사용
                                              if (isSpecialRow) {
                                                const specialKey = expandedRow.floorLabel;
                                                const specialQuantities = plan?.specialRowQuantities?.[specialKey] || {};
                                                
                                                // 해당 층의 항목만 필터링 (지하층 항목 사용)
                                                const floorItems = colModule.items.filter(item => {
                                                  return item.floorLabel === targetFloorLabel;
                                                });
                                                
                                                floorItems.forEach(item => {
                                                  // 오버라이드된 순작업일 확인
                                                  const itemKey = `${expandedRow.category}-${expandedRow.floorLabel || ''}-${item.id}`;
                                                  const overriddenDays = plan?.itemDirectWorkDaysOverrides?.[itemKey];
                                                  
                                                  if (overriddenDays !== undefined) {
                                                    sumDirectDays += overriddenDays;
                                                    return;
                                                  }
                                                  
                                                  let directWorkDays = 0;
                                                  let quantity = 0;
                                                  
                                                  // specialRowQuantities에서 수량 가져오기
                                                  if (item.quantityReference) {
                                                    const refMatch = item.quantityReference.match(/^([A-Z])(\d+)(?:\*([\d.]+))?$/);
                                                    if (refMatch) {
                                                      const [, col] = refMatch;
                                                      const ratio = refMatch[3] ? parseFloat(refMatch[3]) : 1;
                                                      
                                                      // specialRowQuantities에서 해당 필드의 수량 가져오기
                                                      if (col === 'B') {
                                                        quantity = (specialQuantities.gangForm || 0) * ratio;
                                                      } else if (col === 'C') {
                                                        quantity = (specialQuantities.alForm || 0) * ratio;
                                                      } else if (col === 'D') {
                                                        quantity = (specialQuantities.formwork || 0) * ratio;
                                                      } else if (col === 'F') {
                                                        quantity = (specialQuantities.rebar || 0) * ratio;
                                                      } else if (col === 'G') {
                                                        quantity = (specialQuantities.concrete || 0) * ratio;
                                                      }
                                                    }
                                                  }
                                                  
                                                  if (item.directWorkDays !== undefined) {
                                                    directWorkDays = item.directWorkDays;
                                                    sumDirectDays += directWorkDays;
                                                  } else if (item.equipmentCalculationBase !== undefined && item.equipmentWorkersPerUnit !== undefined && item.quantityReference) {
                                                    if (quantity > 0 && item.dailyProductivity > 0) {
                                                      const calculatedEquipmentCount = calculateEquipmentCount(quantity, item.equipmentCalculationBase);
                                                      const dailyInputWorkers = calculateDailyInputWorkersByEquipment(calculatedEquipmentCount, item.equipmentWorkersPerUnit);
                                                      if (dailyInputWorkers > 0) {
                                                        directWorkDays = calculateWorkDaysWithRounding(quantity, item.dailyProductivity, dailyInputWorkers);
                                                        sumDirectDays += directWorkDays;
                                                      }
                                                    }
                                                  } else if (item.quantityReference && item.dailyProductivity > 0) {
                                                    if (quantity > 0) {
                                                      const totalWorkers = calculateTotalWorkers(quantity, item.dailyProductivity);
                                                      const dailyInputWorkers = calculateDailyInputWorkers(totalWorkers, item.equipmentCount);
                                                      directWorkDays = calculateWorkDaysWithRounding(quantity, item.dailyProductivity, dailyInputWorkers);
                                                      sumDirectDays += directWorkDays;
                                                    }
                                                  }
                                                });
                                              } else {
                                                // 일반 지하층인 경우 기존 로직 사용
                                                // 해당 층의 항목만 필터링
                                                const floorItems = colModule.items.filter(item => {
                                                  // 지하층의 경우 item.floorLabel과 expandedRow.floorLabel이 일치해야 함
                                                  return item.floorLabel === expandedRow.floorLabel;
                                                });
                                                
                                                floorItems.forEach(item => {
                                                  // 오버라이드된 순작업일 확인
                                                  const itemKey = `${expandedRow.category}-${expandedRow.floorLabel || ''}-${item.id}`;
                                                  
                                                  const overriddenDays = plan?.itemDirectWorkDaysOverrides?.[itemKey];
                                                  
                                                  if (overriddenDays !== undefined) {
                                                    // 오버라이드된 값 사용
                                                    sumDirectDays += overriddenDays;
                                                    return;
                                                  }
                                                  
                                                  let directWorkDays = 0;
                                                  let quantity = 0;
                                                  
                                                  // 지하층 공정계획에서는 지하층만 처리
                                                  if (item.quantityReference) {
                                                    const refMatch = item.quantityReference.match(/^([A-Z])(\d+)(?:\*([\d.]+))?$/);
                                                    if (refMatch) {
                                                      const [, col] = refMatch;
                                                      const ratio = refMatch[3] ? parseFloat(refMatch[3]) : 1;
                                                      quantity = getQuantityFromFloor(building, expandedRow.floorLabel ?? '',
                                                        col === 'B' ? 'gangForm' : col === 'C' ? 'alForm' : col === 'D' ? 'formwork' : col === 'E' ? 'stripClean' : col === 'F' ? 'rebar' : 'concrete',
                                                        col === 'B' || col === 'C' || col === 'D' || col === 'E' ? 'areaM2' : col === 'F' ? 'ton' : 'volumeM3') * ratio;
                                                    } else {
                                                      quantity = getQuantityByReference(building, item.quantityReference);
                                                    }
                                                  }
                                                  
                                                  if (item.directWorkDays !== undefined) {
                                                    directWorkDays = item.directWorkDays;
                                                    sumDirectDays += directWorkDays;
                                                  } else if (item.equipmentCalculationBase !== undefined && item.equipmentWorkersPerUnit !== undefined && item.quantityReference) {
                                                    if (quantity > 0 && item.dailyProductivity > 0) {
                                                      const calculatedEquipmentCount = calculateEquipmentCount(quantity, item.equipmentCalculationBase);
                                                      const dailyInputWorkers = calculateDailyInputWorkersByEquipment(calculatedEquipmentCount, item.equipmentWorkersPerUnit);
                                                      if (dailyInputWorkers > 0) {
                                                        directWorkDays = calculateWorkDaysWithRounding(quantity, item.dailyProductivity, dailyInputWorkers);
                                                        sumDirectDays += directWorkDays;
                                                      }
                                                    }
                                                  } else if (item.quantityReference && item.dailyProductivity > 0) {
                                                    if (quantity > 0) {
                                                      const totalWorkers = calculateTotalWorkers(quantity, item.dailyProductivity);
                                                      const dailyInputWorkers = calculateDailyInputWorkers(totalWorkers, item.equipmentCount);
                                                      directWorkDays = calculateWorkDaysWithRounding(quantity, item.dailyProductivity, dailyInputWorkers);
                                                      sumDirectDays += directWorkDays;
                                                    }
                                                  }
                                                });
                                              }
                                              
                                              return Math.floor(sumDirectDays);
                                            };
                                            
                                            const sumDirectDays = calculateDirectWorkDaysSum();
                                            
                                            return (
                                              <div className="space-y-4">
                                                <div className="font-semibold text-slate-900 dark:text-white border-b border-slate-200 dark:border-slate-700 pb-2">
                                                  {expandedRow.category === '버림' || expandedRow.category === '기초' 
                                                    ? `${expandedRow.category}${sumDirectDays > 0 ? ` (순작업일 합계 ${sumDirectDays}일)` : ''}`
                                                    : expandedRow.category === '지하층'
                                                      ? isSpecialRow
                                                        ? `${expandedRow.floorLabel}${sumDirectDays > 0 ? ` (순작업일 합계 ${sumDirectDays}일)` : ''}`
                                                        : `지하층 ${expandedRow.floorLabel}층${sumDirectDays > 0 ? ` (순작업일 합계 ${sumDirectDays}일)` : ''}`
                                                      : `${expandedRow.category} ${expandedRow.floorLabel || ''} 세부공정`}
                                                </div>
                                                
                                                <div className="space-y-3">
                                                  {colModule.items.map((item, itemIdx) => {
                                                    const itemKey = `${expandedRow.category}-${expandedRow.floorLabel || ''}-${item.id}`;
                                                    const itemDirectDays = plan?.itemDirectWorkDaysOverrides?.[itemKey] ?? item.directWorkDays;
                                                    
                                                    // 순작업일 변경 핸들러
                                                    const handleDirectWorkDaysChange = async (
                                                      buildingId: string,
                                                      row: typeof expandedRow,
                                                      itemId: string,
                                                      newValue: number,
                                                      module: typeof colModule,
                                                      processType: ProcessType
                                                    ) => {
                                                      const currentPlan = processPlans.get(buildingId);
                                                      if (!currentPlan) return;
                                                      
                                                      const itemKey = `${row.category}-${row.floorLabel || ''}-${itemId}`;
                                                      const updatedOverrides = {
                                                        ...(currentPlan.itemDirectWorkDaysOverrides || {}),
                                                        [itemKey]: newValue > 0 ? newValue : undefined,
                                                      };
                                                      
                                                      // undefined 값 제거
                                                      Object.keys(updatedOverrides).forEach(key => {
                                                        if (updatedOverrides[key] === undefined) {
                                                          delete updatedOverrides[key];
                                                        }
                                                      });
                                                      
                                                      // 순작업일 합계 재계산
                                                      let sumDirectDays = 0;
                                                      
                                                      if (row.category === '버림' || row.category === '기초') {
                                                        module.items.forEach(moduleItem => {
                                                          const moduleItemKey = `${row.category}-${row.floorLabel || ''}-${moduleItem.id}`;
                                                          const overriddenDays = updatedOverrides[moduleItemKey];
                                                          
                                                          if (overriddenDays !== undefined) {
                                                            sumDirectDays += overriddenDays;
                                                            return;
                                                          }
                                                          
                                                          if (moduleItem.directWorkDays !== undefined) {
                                                            sumDirectDays += moduleItem.directWorkDays;
                                                          } else if (moduleItem.quantityReference && moduleItem.dailyProductivity > 0) {
                                                            const quantity = getQuantityByReference(building, moduleItem.quantityReference);
                                                            if (quantity > 0) {
                                                              const totalWorkers = calculateTotalWorkers(quantity, moduleItem.dailyProductivity);
                                                              const dailyInputWorkers = calculateDailyInputWorkers(totalWorkers, moduleItem.equipmentCount);
                                                              const directWorkDays = calculateWorkDaysWithRounding(quantity, moduleItem.dailyProductivity, dailyInputWorkers);
                                                              sumDirectDays += directWorkDays;
                                                            }
                                                          }
                                                        });
                                                      } else if (row.category === '지하층' && row.floorLabel) {
                                                        // 주차장이나 3단 가시설인지 확인
                                                        const isParking = row.floorLabel.includes('주차장');
                                                        const isFacility = row.floorLabel.includes('3단 가시설 적용부');
                                                        const isSpecialRow = isParking || isFacility;
                                                        
                                                        // floorLabel에서 지하층 정보 추출
                                                        const floorMatch = row.floorLabel.match(/^(B\d+)/);
                                                        const targetFloorLabel = floorMatch ? floorMatch[1] : row.floorLabel;
                                                        
                                                        const floorItems = module.items.filter(moduleItem => moduleItem.floorLabel === targetFloorLabel);
                                                        floorItems.forEach(moduleItem => {
                                                          const moduleItemKey = `${row.category}-${row.floorLabel || ''}-${moduleItem.id}`;
                                                          const overriddenDays = updatedOverrides[moduleItemKey];
                                                          
                                                          if (overriddenDays !== undefined) {
                                                            sumDirectDays += overriddenDays;
                                                            return;
                                                          }
                                                          
                                                          if (moduleItem.directWorkDays !== undefined) {
                                                            sumDirectDays += moduleItem.directWorkDays;
                                                          } else if (moduleItem.quantityReference && moduleItem.dailyProductivity > 0 && row.floorLabel) {
                                                            let quantity = 0;
                                                            
                                                            // 주차장이나 3단 가시설인 경우 specialRowQuantities에서 수량 가져오기
                                                            if (isSpecialRow) {
                                                              const specialKey = row.floorLabel;
                                                              const specialQuantities = currentPlan.specialRowQuantities?.[specialKey] || {};
                                                              const refMatch = moduleItem.quantityReference.match(/^([A-Z])(\d+)(?:\*([\d.]+))?$/);
                                                              if (refMatch) {
                                                                const [, col] = refMatch;
                                                                const ratio = refMatch[3] ? parseFloat(refMatch[3]) : 1;
                                                                
                                                                // specialRowQuantities에서 해당 필드의 수량 가져오기
                                                                if (col === 'B') {
                                                                  quantity = (specialQuantities.gangForm || 0) * ratio;
                                                                } else if (col === 'C') {
                                                                  quantity = (specialQuantities.alForm || 0) * ratio;
                                                                } else if (col === 'D') {
                                                                  quantity = (specialQuantities.formwork || 0) * ratio;
                                                                } else if (col === 'F') {
                                                                  quantity = (specialQuantities.rebar || 0) * ratio;
                                                                } else if (col === 'G') {
                                                                  quantity = (specialQuantities.concrete || 0) * ratio;
                                                                }
                                                              }
                                                            } else {
                                                              quantity = getQuantityFromFloor(building, row.floorLabel, 
                                                                moduleItem.quantityReference.match(/^([A-Z])/)?.[1] === 'B' ? 'gangForm' : 
                                                                moduleItem.quantityReference.match(/^([A-Z])/)?.[1] === 'C' ? 'alForm' : 
                                                                moduleItem.quantityReference.match(/^([A-Z])/)?.[1] === 'D' ? 'formwork' : 
                                                                moduleItem.quantityReference.match(/^([A-Z])/)?.[1] === 'E' ? 'stripClean' : 
                                                                moduleItem.quantityReference.match(/^([A-Z])/)?.[1] === 'F' ? 'rebar' : 'concrete',
                                                                moduleItem.quantityReference.match(/^([A-Z])/)?.[1] === 'F' ? 'ton' : 
                                                                moduleItem.quantityReference.match(/^([A-Z])/)?.[1] === 'G' ? 'volumeM3' : 'areaM2');
                                                            }
                                                            
                                                            if (quantity > 0) {
                                                              const totalWorkers = calculateTotalWorkers(quantity, moduleItem.dailyProductivity);
                                                              const dailyInputWorkers = calculateDailyInputWorkers(totalWorkers, moduleItem.equipmentCount);
                                                              const directWorkDays = calculateWorkDaysWithRounding(quantity, moduleItem.dailyProductivity, dailyInputWorkers);
                                                              sumDirectDays += directWorkDays;
                                                            }
                                                          }
                                                        });
                                                      }
                                                      
                                                      // undefined 값 제거
                                                      const cleanedOverrides: Record<string, number> = {};
                                                      Object.keys(updatedOverrides).forEach(key => {
                                                        const value = updatedOverrides[key];
                                                        if (value !== undefined) {
                                                          cleanedOverrides[key] = value;
                                                        }
                                                      });
                                                      
                                                      // 순작업일 합계에 Math.floor 적용
                                                      const flooredSumDirectDays = Math.floor(sumDirectDays);
                                                      
                                                      const updatedPlan = {
                                                        ...currentPlan,
                                                        itemDirectWorkDaysOverrides: Object.keys(cleanedOverrides).length > 0 ? cleanedOverrides : undefined,
                                                        processes: {
                                                          ...currentPlan.processes,
                                                          [row.category]: {
                                                            ...currentPlan.processes[row.category],
                                                            days: flooredSumDirectDays,
                                                          },
                                                        },
                                                      };
                                                      
                                                      updatedPlan.totalDays = calculateTotalDays(updatedPlan.processes, building);
                                                      setProcessPlans(new Map(processPlans.set(buildingId, updatedPlan)));
                                                      
                                                      // localStorage에 저장
                                                      try {
                                                        if (typeof window !== 'undefined') {
                                                          const storageKey = `contech_process_plan_${buildingId}`;
                                                          localStorage.setItem(storageKey, JSON.stringify(updatedPlan));
                                                        }
                                                      } catch (error) {
                                                        logger.error('Failed to save direct work days:', error);
                                                      }
                                                    };
                                                    
                                                    // 수량 계산
                                                    let quantity = 0;
                                                    if (item.quantityReference) {
                                                      // 주차장이나 3단 가시설인 경우 specialRowQuantities에서 수량 가져오기
                                                      const isParking = expandedRow.floorLabel?.includes('주차장');
                                                      const isFacility = expandedRow.floorLabel?.includes('3단 가시설 적용부');
                                                      const isSpecialRow = isParking || isFacility;
                                                      
                                                      if (isSpecialRow && expandedRow.floorLabel) {
                                                        const specialKey = expandedRow.floorLabel;
                                                        const specialQuantities = plan?.specialRowQuantities?.[specialKey] || {};
                                                        const refMatch = item.quantityReference.match(/^([A-Z])(\d+)(?:\*([\d.]+))?$/);
                                                        if (refMatch) {
                                                          const [, col] = refMatch;
                                                          const ratio = refMatch[3] ? parseFloat(refMatch[3]) : 1;
                                                          
                                                          // specialRowQuantities에서 해당 필드의 수량 가져오기
                                                          if (col === 'B') {
                                                            quantity = (specialQuantities.gangForm || 0) * ratio;
                                                          } else if (col === 'C') {
                                                            quantity = (specialQuantities.alForm || 0) * ratio;
                                                          } else if (col === 'D') {
                                                            quantity = (specialQuantities.formwork || 0) * ratio;
                                                          } else if (col === 'F') {
                                                            quantity = (specialQuantities.rebar || 0) * ratio;
                                                          } else if (col === 'G') {
                                                            quantity = (specialQuantities.concrete || 0) * ratio;
                                                          }
                                                        }
                                                      } else if (expandedRow.category === '지하층' && expandedRow.floorLabel) {
                                                        const refMatch = item.quantityReference.match(/^([A-Z])(\d+)(?:\*([\d.]+))?$/);
                                                        if (refMatch) {
                                                          const [, col] = refMatch;
                                                          const ratio = refMatch[3] ? parseFloat(refMatch[3]) : 1;
                                                          quantity = getQuantityFromFloor(building, expandedRow.floorLabel,
                                                            col === 'B' ? 'gangForm' : col === 'C' ? 'alForm' : col === 'D' ? 'formwork' : col === 'E' ? 'stripClean' : col === 'F' ? 'rebar' : 'concrete',
                                                            col === 'F' ? 'ton' : col === 'G' ? 'volumeM3' : 'areaM2') * ratio;
                                                        } else {
                                                          const colMatch = item.quantityReference.match(/^([A-Z])/);
                                                          if (colMatch) {
                                                            const col = colMatch[1];
                                                            quantity = getQuantityFromFloor(building, expandedRow.floorLabel,
                                                              col === 'B' ? 'gangForm' : col === 'C' ? 'alForm' : col === 'D' ? 'formwork' : col === 'E' ? 'stripClean' : col === 'F' ? 'rebar' : 'concrete',
                                                              col === 'F' ? 'ton' : col === 'G' ? 'volumeM3' : 'areaM2');
                                                          }
                                                        }
                                                      } else {
                                                        quantity = getQuantityByReference(building, item.quantityReference);
                                                      }
                                                    }
                                                    
                                                    return (
                                                      <div key={item.id} className="border border-slate-200 dark:border-slate-700 rounded-lg p-3">
                                                        <div className="font-medium text-slate-900 dark:text-white mb-2">
                                                          {item.workItem}
                                                        </div>
                                                        
                                                        <div className="space-y-2 text-xs">
                                                          <div className="flex items-center justify-between">
                                                            <span className="text-slate-600 dark:text-slate-400">순작업일:</span>
                                                            <Input
                                                              type="number"
                                                              min="0"
                                                              step="1"
                                                              value={itemDirectDays ?? ''}
                                                              onChange={(e) => {
                                                                const newValue = Math.round(parseFloat(e.target.value) || 0);
                                                                handleDirectWorkDaysChange(
                                                                  building.id,
                                                                  expandedRow,
                                                                  item.id,
                                                                  newValue,
                                                                  colModule,
                                                                  colProcessType
                                                                );
                                                              }}
                                                              onBlur={(e) => {
                                                                const newValue = Math.round(Math.max(0, parseFloat(e.target.value) || 0));
                                                                handleDirectWorkDaysChange(
                                                                  building.id,
                                                                  expandedRow,
                                                                  item.id,
                                                                  newValue,
                                                                  colModule,
                                                                  colProcessType
                                                                );
                                                              }}
                                                              className="w-20 h-6 text-xs font-bold text-right [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:appearance-none [-moz-appearance:textfield]"
                                                            />
                                                          </div>
                                                          
                                                          {/* 수량 표시 */}
                                                          {item.quantityReference && (
                                                            <div className="flex items-center justify-between">
                                                              <span className="text-slate-600 dark:text-slate-400">수량:</span>
                                                              <span className="text-slate-900 dark:text-white">
                                                                {quantity.toFixed(2)}
                                                              </span>
                                                            </div>
                                                          )}
                                                          
                                                          <div className="flex items-center justify-between">
                                                            <span className="text-slate-600 dark:text-slate-400">총작업일수:</span>
                                                            <span className="text-slate-900 dark:text-white">
                                                              {calculateTotalWorkDays(itemDirectDays || 0, item.indirectDays)}
                                                            </span>
                                                          </div>
                                                          
                                                          {item.indirectDays > 0 && (
                                                            <div className="flex items-center justify-between">
                                                              <span className="text-slate-600 dark:text-slate-400">간접작업일:</span>
                                                              <span className="text-slate-900 dark:text-white">
                                                                {item.indirectDays}
                                                              </span>
                                                            </div>
                                                          )}
                                                          
                                                          {item.indirectWorkItem && item.indirectDays > 0 && (
                                                            <div className="flex items-center justify-between">
                                                              <span className="text-slate-600 dark:text-slate-400">간접작업항목:</span>
                                                              <span className="text-slate-900 dark:text-white">
                                                                {item.indirectWorkItem}
                                                              </span>
                                                            </div>
                                                          )}
                                                          
                                                          {(() => {
                                                            // 먹매김이 아닌 항목인지 확인
                                                            const isNotMarking = !item.workItem.includes('먹매김');
                                                            
                                                            // 먹매김이 아닌 경우에만 투입인원과 생산성 정보 표시
                                                            if (!isNotMarking) {
                                                              return null;
                                                            }
                                                            
                                                            // 순작업일이 오버라이드되었는지 확인
                                                            const overriddenDirectWorkDays = plan?.itemDirectWorkDaysOverrides?.[itemKey];
                                                            const displayDirectWorkDays = overriddenDirectWorkDays !== undefined ? overriddenDirectWorkDays : (itemDirectDays || 0);
                                                            
                                                            // 기본 계산
                                                            let totalWorkers = 0;
                                                            let dailyInputWorkers = 0;
                                                            
                                                            // 순작업일이 오버라이드된 경우, 나머지 항목들을 재계산
                                                            if (overriddenDirectWorkDays !== undefined && overriddenDirectWorkDays > 0) {
                                                              // 장비기반 계산인 경우 (타설 등)
                                                              if (item.equipmentCalculationBase !== undefined && item.equipmentWorkersPerUnit !== undefined && item.quantityReference) {
                                                                const calculatedEquipmentCount = calculateEquipmentCount(quantity, item.equipmentCalculationBase);
                                                                dailyInputWorkers = calculateDailyInputWorkersByEquipment(calculatedEquipmentCount, item.equipmentWorkersPerUnit);
                                                                // 총투입인원 = 1일투입인원 * 순작업일
                                                                if (dailyInputWorkers > 0) {
                                                                  totalWorkers = dailyInputWorkers * displayDirectWorkDays;
                                                                }
                                                              }
                                                              // 일반 계산인 경우
                                                              else if (item.dailyProductivity > 0 && quantity > 0) {
                                                                // 총투입인원은 기존 계산식 유지
                                                                totalWorkers = calculateTotalWorkers(quantity, item.dailyProductivity);
                                                                // 1일 투입인원 = 총투입인원 / 순작업일
                                                                if (totalWorkers > 0 && displayDirectWorkDays > 0) {
                                                                  dailyInputWorkers = Math.ceil(totalWorkers / displayDirectWorkDays);
                                                                }
                                                              }
                                                              // directWorkDays가 고정값인 경우
                                                              else if (item.directWorkDays !== undefined && item.dailyProductivity > 0 && quantity > 0) {
                                                                totalWorkers = calculateTotalWorkers(quantity, item.dailyProductivity);
                                                                dailyInputWorkers = calculateDailyInputWorkersByWorkDays(totalWorkers, displayDirectWorkDays);
                                                              }
                                                            } else {
                                                              // 오버라이드되지 않은 경우 기존 계산
                                                              if (item.equipmentCalculationBase !== undefined && item.equipmentWorkersPerUnit !== undefined && item.quantityReference) {
                                                                const calculatedEquipmentCount = calculateEquipmentCount(quantity, item.equipmentCalculationBase);
                                                                dailyInputWorkers = calculateDailyInputWorkersByEquipment(calculatedEquipmentCount, item.equipmentWorkersPerUnit);
                                                                if (item.dailyProductivity > 0 && dailyInputWorkers > 0 && quantity > 0) {
                                                                  // 타설의 경우 총투입인원 = 1일투입인원 * 순작업일
                                                                  if (displayDirectWorkDays > 0) {
                                                                    totalWorkers = dailyInputWorkers * displayDirectWorkDays;
                                                                  }
                                                                }
                                                              } else if (item.dailyProductivity > 0 && quantity > 0) {
                                                                totalWorkers = calculateTotalWorkers(quantity, item.dailyProductivity);
                                                                dailyInputWorkers = totalWorkers > 0 && item.equipmentCount > 0 ? calculateDailyInputWorkers(totalWorkers, item.equipmentCount) : 0;
                                                              }
                                                            }
                                                            
                                                            return (
                                                              <>
                                                                <div className="flex items-center justify-between">
                                                                  <span className="text-slate-600 dark:text-slate-400">총투입인원:</span>
                                                                  <span className="text-slate-900 dark:text-white">
                                                                    {totalWorkers.toFixed(1)}
                                                                  </span>
                                                                </div>
                                                                
                                                                <div className="flex items-center justify-between">
                                                                  <span className="text-slate-600 dark:text-slate-400">1일 투입인원:</span>
                                                                  <span className="text-slate-900 dark:text-white">
                                                                    {dailyInputWorkers.toFixed(1)}
                                                                  </span>
                                                                </div>
                                                                
                                                                {item.equipmentCalculationBase !== undefined && item.equipmentWorkersPerUnit !== undefined && (
                                                                  <>
                                                                    <div className="flex items-center justify-between">
                                                                      <span className="text-slate-600 dark:text-slate-400">장비대수:</span>
                                                                      <span className="text-slate-900 dark:text-white">
                                                                        {quantity > 0 ? calculateEquipmentCount(quantity, item.equipmentCalculationBase) : 0}
                                                                      </span>
                                                                    </div>
                                                                    
                                                                    <div className="flex items-center justify-between">
                                                                      <span className="text-slate-600 dark:text-slate-400">장비당 1일 투입인원:</span>
                                                                      <span className="text-slate-900 dark:text-white">
                                                                        {quantity > 0 ? calculateDailyInputWorkersByEquipment(
                                                                          calculateEquipmentCount(quantity, item.equipmentCalculationBase),
                                                                          item.equipmentWorkersPerUnit
                                                                        ).toFixed(1) : '0.0'}
                                                                      </span>
                                                                    </div>
                                                                  </>
                                                                )}
                                                                
                                                                <div className="flex items-center justify-between">
                                                                  <span className="text-slate-600 dark:text-slate-400">인당 생산성:</span>
                                                                  <span className="text-slate-900 dark:text-white">{item.dailyProductivity}</span>
                                                                </div>
                                                              </>
                                                            );
                                                          })()}
                                                        </div>
                                                      </div>
                                                    );
                                                  })}
                                                </div>
                                                
                                                <div className="font-semibold text-slate-900 dark:text-white border-t border-slate-200 dark:border-slate-700 pt-2">
                                                  순작업일 합계: {sumDirectDays}일
                                                </div>
                                              </div>
                                            );
                                          })()}
                                        </div>
                                      </td>
                                    )}
                                  </tr>
                                );
                              }
                              
                              // 지하층 공정계획에서는 버림, 기초, 지하층만 처리
                              const effectiveCategory = row.category;
                              
                              const processType = row.floorLabel && row.category === '지하층'
                                ? getProcessTypeForFloor(plan, row.category, row.floorLabel)
                                : plan?.processes[row.category]?.processType || DEFAULT_PROCESS_TYPES[row.category] || '표준공정';
                              const module = getProcessModule(effectiveCategory, processType);
                              
                              // 일수 계산 - 세부공정의 순작업일 합계
                              let days = 0;
                              if (!module || !module.items || module.items.length === 0) {
                                // 모듈이 없으면 기존 방식 사용
                                if (row.category === '버림' || row.category === '기초') {
                                  days = plan?.processes[row.category]?.days || 0;
                                } else if (row.category === '지하층' && row.floorLabel) {
                                  days = calculateBasementFloorDays(building, row.category, processType, row.floorLabel);
                                }
                                // 지하층 공정계획에서는 셋팅층, 기준층, PH층, 옥탑층을 처리하지 않음
                              } else {
                                // 세부공정의 순작업일 합계 계산 (오버라이드된 값 고려)
                                let sumDirectDays = 0;
                                
                                // 버림, 기초는 floorLabel 없이 계산
                                if (row.category === '버림' || row.category === '기초') {
                                  module.items.forEach(item => {
                                    // 오버라이드된 순작업일 확인
                                    const itemKey = `${row.category}-${row.floorLabel || ''}-${item.id}`;
                                    const overriddenDays = plan?.itemDirectWorkDaysOverrides?.[itemKey];
                                    
                                    if (overriddenDays !== undefined) {
                                      // 오버라이드된 값 사용
                                      sumDirectDays += overriddenDays;
                                      return;
                                    }
                                    
                                    let directWorkDays = 0;
                                    let quantity = 0;
                                    
                                    if (item.quantityReference) {
                                      quantity = getQuantityByReference(building, item.quantityReference);
                                    }
                                    
                                    if (item.directWorkDays !== undefined) {
                                      directWorkDays = item.directWorkDays;
                                      sumDirectDays += directWorkDays;
                                    } else if (item.equipmentCalculationBase !== undefined && item.equipmentWorkersPerUnit !== undefined && item.quantityReference) {
                                      if (quantity > 0 && item.dailyProductivity > 0) {
                                        const calculatedEquipmentCount = calculateEquipmentCount(quantity, item.equipmentCalculationBase);
                                        const dailyInputWorkers = calculateDailyInputWorkersByEquipment(calculatedEquipmentCount, item.equipmentWorkersPerUnit);
                                        if (dailyInputWorkers > 0) {
                                          directWorkDays = calculateWorkDaysWithRounding(quantity, item.dailyProductivity, dailyInputWorkers);
                                          sumDirectDays += directWorkDays;
                                        }
                                      }
                                    } else if (item.quantityReference && item.dailyProductivity > 0) {
                                      if (quantity > 0) {
                                        const totalWorkers = calculateTotalWorkers(quantity, item.dailyProductivity);
                                        const dailyInputWorkers = calculateDailyInputWorkers(totalWorkers, item.equipmentCount);
                                        directWorkDays = calculateWorkDaysWithRounding(quantity, item.dailyProductivity, dailyInputWorkers);
                                        sumDirectDays += directWorkDays;
                                      }
                                    }
                                  });
                                }
                                // 지하층 공정계획에서는 지하층만 처리
                                else if (row.floorLabel && row.category === '지하층') {
                                  // 해당 층의 항목만 필터링
                                  const floorItems = module.items.filter(item => {
                                    // 지하층의 경우 item.floorLabel과 row.floorLabel이 일치해야 함
                                    return item.floorLabel === row.floorLabel;
                                  });
                                  
                                  floorItems.forEach(item => {
                                    // 오버라이드된 순작업일 확인
                                    const itemKey = `${row.category}-${row.floorLabel || ''}-${item.id}`;
                                    const overriddenDays = plan?.itemDirectWorkDaysOverrides?.[itemKey];
                                    
                                    if (overriddenDays !== undefined) {
                                      // 오버라이드된 값 사용
                                      sumDirectDays += overriddenDays;
                                      return;
                                    }
                                    
                                    let directWorkDays = 0;
                                    let quantity = 0;
                                    
                                    // 수량 참조를 층별로 조정
                                    if (item.quantityReference) {
                                      const refMatch = item.quantityReference.match(/^([A-Z])(\d+)(?:\*([\d.]+))?$/);
                                      if (refMatch) {
                                        const [, col] = refMatch;
                                        
                                        if (row.category === '지하층' && row.floorLabel) {
                                          // 지하층는 floorLabel 그대로 사용 (B1, B2 등)
                                          quantity = getQuantityFromFloor(building, row.floorLabel, 
                                            col === 'B' ? 'gangForm' : col === 'C' ? 'alForm' : col === 'D' ? 'formwork' : col === 'E' ? 'stripClean' : col === 'F' ? 'rebar' : 'concrete',
                                            col === 'B' || col === 'C' || col === 'D' || col === 'E' ? 'areaM2' : col === 'F' ? 'ton' : 'volumeM3');
                                        } else {
                                          // 지하층 공정계획에서는 지하층만 처리
                                          quantity = getQuantityByReference(building, item.quantityReference);
                                        }
                                      } else {
                                        quantity = getQuantityByReference(building, item.quantityReference);
                                      }
                                    }
                                    
                                    // directWorkDays 계산
                                    if (item.directWorkDays !== undefined) {
                                      directWorkDays = item.directWorkDays;
                                      sumDirectDays += directWorkDays;
                                    } else if (item.equipmentCalculationBase !== undefined && item.equipmentWorkersPerUnit !== undefined && item.quantityReference) {
                                      if (quantity > 0 && item.dailyProductivity > 0) {
                                        const calculatedEquipmentCount = calculateEquipmentCount(quantity, item.equipmentCalculationBase);
                                        const dailyInputWorkers = calculateDailyInputWorkersByEquipment(calculatedEquipmentCount, item.equipmentWorkersPerUnit);
                                        if (dailyInputWorkers > 0) {
                                          directWorkDays = calculateWorkDaysWithRounding(quantity, item.dailyProductivity, dailyInputWorkers);
                                          sumDirectDays += directWorkDays;
                                        }
                                      }
                                    } else if (item.quantityReference && item.dailyProductivity > 0) {
                                      if (quantity > 0) {
                                        const totalWorkers = calculateTotalWorkers(quantity, item.dailyProductivity);
                                        const dailyInputWorkers = calculateDailyInputWorkers(totalWorkers, item.equipmentCount);
                                        directWorkDays = calculateWorkDaysWithRounding(quantity, item.dailyProductivity, dailyInputWorkers);
                                        sumDirectDays += directWorkDays;
                                      }
                                    }
                                  });
                                }
                                
                                days = Math.floor(sumDirectDays);
                              }
                              
                              // 확장 상태 확인
                              const expandKey = row.floorLabel 
                                ? `${row.category}-${row.floorLabel}`
                                : row.category;
                              const isExpanded = isDetailExpanded.has(expandKey);
                              
                              // 구분 항목 표시 (왼쪽 열)
                              const getCategoryLabel = () => {
                                // 특수 행 처리 (주차장, 3단 가시설 적용부)
                                if (row.isSpecialRow) {
                                  return '지하층';
                                }
                                if (row.category === '버림' || row.category === '기초') {
                                  return row.category;
                                }
                                // 지하층는 그대로 표시
                                return row.category;
                              };
                              
                              // 층수 표시 (오른쪽 열)
                              const getFloorNumberLabel = () => {
                                // 특수 행 처리 (주차장, 3단 가시설 적용부) - 원래대로 표시
                                if (row.isSpecialRow && row.floorLabel) {
                                  return row.floorLabel;
                                }
                                // 버림, 기초는 층수 없음
                                if (row.category === '버림' || row.category === '기초') {
                                  return '';
                                }
                                // 지하층인 경우 "B1 동지하", "B2 동지하" 형식으로 표시
                                if (row.category === '지하층' && row.floorLabel) {
                                  return `${row.floorLabel} 동지하`;
                                }
                                // 나머지는 floorLabel 표시 (B2, B1 등)
                                return row.floorLabel || '';
                              };
                              
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
                                
                                setProcessPlans(new Map(processPlans.set(building.id, updatedPlan)));
                                
                                // localStorage에 저장
                                try {
                                  if (typeof window !== 'undefined') {
                                    const storageKey = `contech_process_plan_${building.id}`;
                                    localStorage.setItem(storageKey, JSON.stringify(updatedPlan));
                                  }
                                } catch (error) {
                                  logger.error('Failed to save special row quantity:', error);
                                  toast.error('수량 저장에 실패했습니다.');
                                }
                              };
                              
                              // 물량 데이터 가져오기
                              const getFormworkQuantity = () => {
                                // 특수 행인 경우 저장된 수량 반환 (형틀만 표시)
                                if (row.isSpecialRow) {
                                  return getSpecialRowQuantity('formwork');
                                }
                                
                                // 버림, 기초는 tradeGroup으로 가져오기
                                if (row.category === '버림' || row.category === '기초') {
                                  const trades = building.floorTrades.filter(ft => ft.tradeGroup === row.category);
                                  let total = 0;
                                  trades.forEach(trade => {
                                    const gangForm = trade.trades.gangForm?.areaM2 || 0;
                                    const alForm = trade.trades.alForm?.areaM2 || 0;
                                    const formwork = trade.trades.formwork?.areaM2 || 0;
                                    total += gangForm + alForm + formwork;
                                  });
                                  return total;
                                }
                                if (!row.floorLabel) return 0;
                                
                                // 지하층인 경우 주차장과 3단 가시설 수량 제외
                                // 형틀 수량은 갱폼+알폼을 제외하고 형틀만 표시
                                let baseQuantity = 0;
                                // 지하층 공정계획에서는 범위 층 처리가 필요 없음
                                const rangeFloorId = undefined;
                                // 지하층인 경우 형틀만 가져오기 (갱폼+알폼 제외)
                                if (row.category === '지하층') {
                                  baseQuantity = getQuantityFromFloor(building, row.floorLabel, 'formwork', 'areaM2', rangeFloorId);
                                  
                                  // 같은 지하층의 주차장과 3단 가시설 수량 제외 (형틀만)
                                  if (row.floorLabel && !row.isSpecialRow) {
                                    const plan = processPlans.get(building.id);
                                    const parkingKey = `${row.floorLabel} 주차장`;
                                    const facilityKey = `${row.floorLabel} 3단 가시설 적용부`;
                                    const parkingQty = plan?.specialRowQuantities?.[parkingKey] || {};
                                    const facilityQty = plan?.specialRowQuantities?.[facilityKey] || {};
                                    const parkingFormwork = parkingQty.formwork || 0;
                                    const facilityFormwork = facilityQty.formwork || 0;
                                    baseQuantity = Math.max(0, baseQuantity - parkingFormwork - facilityFormwork);
                                  }
                                } else {
                                  // 다른 카테고리는 기존 로직 유지
                                  const gangForm = getQuantityFromFloor(building, row.floorLabel, 'gangForm', 'areaM2', rangeFloorId);
                                  const alForm = getQuantityFromFloor(building, row.floorLabel, 'alForm', 'areaM2', rangeFloorId);
                                  const formwork = getQuantityFromFloor(building, row.floorLabel, 'formwork', 'areaM2', rangeFloorId);
                                  baseQuantity = gangForm + alForm + formwork;
                                }
                                
                                return baseQuantity;
                              };
                              
                              const getRebarQuantity = () => {
                                // 특수 행인 경우 저장된 수량 반환
                                if (row.isSpecialRow) {
                                  return getSpecialRowQuantity('rebar');
                                }
                                
                                // 버림, 기초는 tradeGroup으로 가져오기
                                if (row.category === '버림' || row.category === '기초') {
                                  const trades = building.floorTrades.filter(ft => ft.tradeGroup === row.category);
                                  let total = 0;
                                  trades.forEach(trade => {
                                    total += trade.trades.rebar?.ton || 0;
                                  });
                                  return total;
                                }
                                if (!row.floorLabel) return 0;
                                
                                // 지하층인 경우 주차장과 3단 가시설 수량 제외
                                let baseQuantity = 0;
                                // 지하층 공정계획에서는 범위 층 처리가 필요 없음
                                const rangeFloorId = undefined;
                                baseQuantity = getQuantityFromFloor(building, row.floorLabel, 'rebar', 'ton', rangeFloorId);
                                
                                // 같은 지하층의 주차장과 3단 가시설 수량 제외
                                if (row.category === '지하층' && row.floorLabel && !row.isSpecialRow) {
                                  const plan = processPlans.get(building.id);
                                  const parkingKey = `${row.floorLabel} 주차장`;
                                  const facilityKey = `${row.floorLabel} 3단 가시설 적용부`;
                                  const parkingQty = plan?.specialRowQuantities?.[parkingKey] || {};
                                  const facilityQty = plan?.specialRowQuantities?.[facilityKey] || {};
                                  const parkingRebar = parkingQty.rebar || 0;
                                  const facilityRebar = facilityQty.rebar || 0;
                                  baseQuantity = Math.max(0, baseQuantity - parkingRebar - facilityRebar);
                                }
                                
                                return baseQuantity;
                              };
                              
                              const getConcreteQuantity = () => {
                                // 특수 행인 경우 저장된 수량 반환
                                if (row.isSpecialRow) {
                                  return getSpecialRowQuantity('concrete');
                                }
                                
                                // 버림, 기초는 tradeGroup으로 가져오기
                                if (row.category === '버림' || row.category === '기초') {
                                  const trades = building.floorTrades.filter(ft => ft.tradeGroup === row.category);
                                  let total = 0;
                                  trades.forEach(trade => {
                                    total += trade.trades.concrete?.volumeM3 || 0;
                                  });
                                  return total;
                                }
                                if (!row.floorLabel) return 0;
                                
                                // 지하층인 경우 주차장과 3단 가시설 수량 제외
                                let baseQuantity = 0;
                                // 지하층 공정계획에서는 범위 층 처리가 필요 없음
                                const rangeFloorId = undefined;
                                baseQuantity = getQuantityFromFloor(building, row.floorLabel, 'concrete', 'volumeM3', rangeFloorId);
                                
                                // 같은 지하층의 주차장과 3단 가시설 수량 제외
                                if (row.category === '지하층' && row.floorLabel && !row.isSpecialRow) {
                                  const plan = processPlans.get(building.id);
                                  const parkingKey = `${row.floorLabel} 주차장`;
                                  const facilityKey = `${row.floorLabel} 3단 가시설 적용부`;
                                  const parkingQty = plan?.specialRowQuantities?.[parkingKey] || {};
                                  const facilityQty = plan?.specialRowQuantities?.[facilityKey] || {};
                                  const parkingConcrete = parkingQty.concrete || 0;
                                  const facilityConcrete = facilityQty.concrete || 0;
                                  baseQuantity = Math.max(0, baseQuantity - parkingConcrete - facilityConcrete);
                                }
                                
                                return baseQuantity;
                              };
                              
                              return (
                                <tr 
                                  key={`process-${row.category}-${row.floorLabel || ''}-${row.rowIndex}`}
                                  className="border-b border-slate-200 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-900/50"
                                  style={{ height: row.isSpecialRow ? 'auto' : '24px' }}
                                >
                                  {/* 첫 번째 열: 구분 항목 */}
                                  <td className="px-2 py-1 text-xs font-semibold text-slate-900 dark:text-white border-r border-slate-200 dark:border-slate-800 align-middle" style={{ height: row.isSpecialRow ? 'auto' : '24px', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                                    <div className="text-center">{getCategoryLabel()}</div>
                                  </td>
                                  
                                  {/* 두 번째 열: 층수 */}
                                  <td className="px-2 py-1 text-xs font-semibold text-slate-900 dark:text-white border-r border-slate-200 dark:border-slate-800 align-middle" style={{ height: row.isSpecialRow ? 'auto' : '24px', width: '115px', ...(row.floorLabel?.includes('3단 가시설 적용부') ? {} : { whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }) }}>
                                    <div className="text-center font-normal">{getFloorNumberLabel()}</div>
                                  </td>
                                  
                                  {/* 세 번째 열: 형틀 */}
                                  <td className="px-1 py-0.5 text-center text-xs border-r border-slate-200 dark:border-slate-800 align-middle" style={{ height: row.isSpecialRow ? 'auto' : '24px' }}>
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
                                          const value = e.target.value === '' ? null : Math.max(0, parseFloat(e.target.value) || 0);
                                          handleSpecialRowQuantityChange('formwork', value);
                                        }}
                                        className="flex justify-center items-center text-center w-16 h-5 text-xs px-1 py-0 [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:appearance-none [-moz-appearance:textfield]"
                                        placeholder="0"
                                        title="형틀"
                                        onClick={(e) => e.stopPropagation()}
                                      />
                                    ) : (
                                      <div className="text-xs">
                                        {getFormworkQuantity() > 0 ? getFormworkQuantity().toFixed(2) : '0.00'}
                                      </div>
                                    )}
                                  </td>
                                  
                                  {/* 네 번째 열: 철근 */}
                                  <td className="px-1 py-0.5 text-center text-xs border-r border-slate-200 dark:border-slate-800 align-middle" style={{ height: row.isSpecialRow ? 'auto' : '24px' }}>
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
                                          const value = e.target.value === '' ? null : Math.max(0, parseFloat(e.target.value) || 0);
                                          handleSpecialRowQuantityChange('rebar', value);
                                        }}
                                        className="flex justify-center items-center text-center w-16 h-5 text-xs px-1 py-0 [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:appearance-none [-moz-appearance:textfield]"
                                        placeholder="0"
                                        onClick={(e) => e.stopPropagation()}
                                      />
                                    ) : (
                                      <div className="text-xs">
                                        {getRebarQuantity() > 0 ? getRebarQuantity().toFixed(2) : '0.00'}
                                      </div>
                                    )}
                                  </td>
                                  
                                  {/* 다섯 번째 열: 콘크리트 */}
                                  <td className="px-1 py-0.5 text-center text-xs border-r-2 border-slate-200 dark:border-slate-800 align-middle" style={{ height: row.isSpecialRow ? 'auto' : '24px' }}>
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
                                          const value = e.target.value === '' ? null : Math.max(0, parseFloat(e.target.value) || 0);
                                          handleSpecialRowQuantityChange('concrete', value);
                                        }}
                                        className="flex justify-center items-center text-center w-16 h-5 text-xs px-1 py-0 [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:appearance-none [-moz-appearance:textfield]"
                                        placeholder="0"
                                        onClick={(e) => e.stopPropagation()}
                                      />
                                    ) : (
                                      <div className="text-xs">
                                        {getConcreteQuantity() > 0 ? getConcreteQuantity().toFixed(2) : '0.00'}
                                      </div>
                                    )}
                                  </td>
                                  
                                  {/* 여섯 번째 열: 일수 */}
                                  <td className="px-1 py-1 text-center border-r border-slate-200 dark:border-slate-800 align-middle" style={{ height: row.isSpecialRow ? 'auto' : '24px' }}>
                                    <div className="w-full px-1 py-0.5 text-xs text-center border border-slate-300 dark:border-slate-700 rounded bg-slate-100 dark:bg-slate-900 text-slate-900 dark:text-white">
                                      {days}
                                    </div>
                                  </td>
                                  
                                  {/* 일곱 번째 열: 셀렉트박스 */}
                                  <td className="px-1 py-1 border-r border-slate-200 dark:border-slate-800 align-middle" style={{ height: row.isSpecialRow ? 'auto' : '24px' }}>
                                    <select
                                      value={processType}
                                      onChange={(e) => {
                                        // 지하층 공정계획에서는 지하층만 처리
                                        handleProcessTypeChange(building.id, row.category, e.target.value as ProcessType, row.floorLabel);
                                      }}
                                      className="w-full px-1 py-0.5 text-xs border border-slate-300 dark:border-slate-700 rounded bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-primary-500"
                                    >
                                      {(PROCESS_TYPE_OPTIONS[effectiveCategory] || []).map(option => (
                                        <option key={option} value={option}>
                                          {option}
                                        </option>
                                      ))}
                                    </select>
                                  </td>
                                  
                                  {/* 여덟 번째 열: 세부공정 버튼 */}
                                  <td className="px-1 py-1 border-r border-slate-200 dark:border-slate-800 align-middle" style={{ height: row.isSpecialRow ? 'auto' : '24px' }}>
                                    {module && module.items.length > 0 && (
                                      <button
                                        onClick={() => {
                                          const expanded = expandedModules.get(building.id) || new Set<string>();
                                          const newExpanded = new Set<string>();
                                          // 다른 행의 확장 상태를 모두 제거하고 현재 행만 확장
                                          if (!expanded.has(expandKey)) {
                                            newExpanded.add(expandKey);
                                          }
                                          // 이미 확장된 경우 닫기 (newExpanded는 빈 Set이므로 아무것도 표시되지 않음)
                                          setExpandedModules(new Map(expandedModules.set(building.id, newExpanded)));
                                        }}
                                        className="p-1 hover:bg-slate-200 dark:hover:bg-slate-700 rounded mx-auto block"
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
                                  
                                  {/* 아홉 번째 열: 세부공정 상세 (첫 번째 행에서만 rowSpan으로 표시, 첫 번째 행이 특수 행이 아닐 때만) */}
                                  {rowIdx === 0 && !firstRowIsSpecial && (
                                    <td rowSpan={totalRows} className="px-2 py-1 align-top border-l-2 border-slate-200 dark:border-slate-800" style={{ width: '100%', minWidth: '400px' }}>
                                      <div className="space-y-4 text-xs max-h-[600px] overflow-y-auto min-h-[200px]">
                                        {/* 현재 확장된 행의 세부공정만 표시 */}
                                        {(() => {
                                          // 확장된 행 찾기 (한 번에 하나만)
                                          const expandedRow = processRows.find((col) => {
                                            const expandKey = col.floorLabel 
                                              ? `${col.category}-${col.floorLabel}`
                                              : col.category === '기준층'
                                                ? '기준층-세부공정'
                                                : col.category;
                                            return isDetailExpanded.has(expandKey);
                                          });
                                          
                                          if (!expandedRow) {
                                            // 확장된 행이 없을 때도 공간 유지
                                            return (
                                              <div className="text-slate-400 dark:text-slate-500 text-center py-8">
                                                세부공정 버튼을 클릭하여 상세 정보를 확인하세요
                                              </div>
                                            );
                                          }
                                          
                                          const expandKey = expandedRow.floorLabel 
                                            ? `${expandedRow.category}-${expandedRow.floorLabel}`
                                            : expandedRow.category === '기준층'
                                              ? '기준층-세부공정'
                                              : expandedRow.category;
                                          
                                          // 지하층 공정계획에서는 지하층만 처리
                                          const expandedEffectiveCategory = expandedRow.category;
                                          
                                          const colProcessType = expandedRow.floorLabel && expandedRow.category === '지하층'
                                            ? getProcessTypeForFloor(plan, expandedRow.category, expandedRow.floorLabel)
                                            : plan?.processes[expandedRow.category]?.processType || DEFAULT_PROCESS_TYPES[expandedRow.category] || '표준공정';
                                          const colModule = getProcessModule(expandedEffectiveCategory, colProcessType);
                                          
                                          if (!colModule || !colModule.items.length) return null;
                                          
                                          // 순작업일 합계 계산 (오버라이드된 값 고려)
                                          const calculateDirectWorkDaysSum = () => {
                                            // 버림, 기초는 floorLabel 없이 계산
                                            if (expandedRow.category === '버림' || expandedRow.category === '기초') {
                                              let sumDirectDays = 0;
                                              
                                              colModule.items.forEach(item => {
                                                // 오버라이드된 순작업일 확인
                                                const itemKey = `${expandedRow.category}-${expandedRow.floorLabel || ''}-${item.id}`;
                                                const overriddenDays = plan?.itemDirectWorkDaysOverrides?.[itemKey];
                                                
                                                if (overriddenDays !== undefined) {
                                                  // 오버라이드된 값 사용
                                                  sumDirectDays += overriddenDays;
                                                  return;
                                                }
                                                
                                                let directWorkDays = 0;
                                                let quantity = 0;
                                                
                                                if (item.quantityReference) {
                                                  quantity = getQuantityByReference(building, item.quantityReference);
                                                }
                                                
                                                if (item.directWorkDays !== undefined) {
                                                  directWorkDays = item.directWorkDays;
                                                  sumDirectDays += directWorkDays;
                                                } else if (item.equipmentCalculationBase !== undefined && item.equipmentWorkersPerUnit !== undefined && item.quantityReference) {
                                                  if (quantity > 0 && item.dailyProductivity > 0) {
                                                    const calculatedEquipmentCount = calculateEquipmentCount(quantity, item.equipmentCalculationBase);
                                                    const dailyInputWorkers = calculateDailyInputWorkersByEquipment(calculatedEquipmentCount, item.equipmentWorkersPerUnit);
                                                    if (dailyInputWorkers > 0) {
                                                      directWorkDays = calculateWorkDaysWithRounding(quantity, item.dailyProductivity, dailyInputWorkers);
                                                      sumDirectDays += directWorkDays;
                                                    }
                                                  }
                                                } else if (item.quantityReference && item.dailyProductivity > 0) {
                                                  if (quantity > 0) {
                                                    const totalWorkers = calculateTotalWorkers(quantity, item.dailyProductivity);
                                                    const dailyInputWorkers = calculateDailyInputWorkers(totalWorkers, item.equipmentCount);
                                                    directWorkDays = calculateWorkDaysWithRounding(quantity, item.dailyProductivity, dailyInputWorkers);
                                                    sumDirectDays += directWorkDays;
                                                  }
                                                }
                                              });
                                              
                                              return Math.floor(sumDirectDays);
                                            }
                                            
                                            // 지하층 공정계획에서는 지하층만 처리
                                            if (!expandedRow.floorLabel || expandedRow.category !== '지하층') {
                                              return 0;
                                            }
                                            
                                            let sumDirectDays = 0;
                                            
                                            // 해당 층의 항목만 필터링
                                            const floorItems = colModule.items.filter(item => {
                                              // 지하층의 경우 item.floorLabel과 expandedRow.floorLabel이 일치해야 함
                                              return item.floorLabel === expandedRow.floorLabel;
                                            });
                                            
                                            floorItems.forEach(item => {
                                              // 오버라이드된 순작업일 확인
                                              const itemKey = `${expandedRow.category}-${expandedRow.floorLabel || ''}-${item.id}`;
                                              const overriddenDays = plan?.itemDirectWorkDaysOverrides?.[itemKey];
                                              
                                              if (overriddenDays !== undefined) {
                                                // 오버라이드된 값 사용
                                                sumDirectDays += overriddenDays;
                                                return;
                                              }
                                              
                                              let directWorkDays = 0;
                                              let quantity = 0;
                                              
                                              // 수량 참조를 층별로 조정
                                              if (item.quantityReference) {
                                                const refMatch = item.quantityReference.match(/^([A-Z])(\d+)(?:\*([\d.]+))?$/);
                                                if (refMatch) {
                                                  const [, col, baseRow] = refMatch;
                                                  const baseRowNum = parseInt(baseRow, 10);
                                                  
                                                  if (expandedRow.category === '지하층' && expandedRow.floorLabel) {
                                                    // 지하층는 floorLabel 그대로 사용 (B1, B2 등)
                                                    quantity = getQuantityFromFloor(building, expandedRow.floorLabel, 
                                                      col === 'B' ? 'gangForm' : col === 'C' ? 'alForm' : col === 'D' ? 'formwork' : col === 'E' ? 'stripClean' : col === 'F' ? 'rebar' : 'concrete',
                                                      col === 'B' || col === 'C' || col === 'D' || col === 'E' ? 'areaM2' : col === 'F' ? 'ton' : 'volumeM3');
                                                  } else {
                                                    // 지하층 공정계획에서는 지하층만 처리
                                                    quantity = getQuantityByReference(building, item.quantityReference);
                                                  }
                                                } else {
                                                  quantity = getQuantityByReference(building, item.quantityReference);
                                                }
                                              }
                                              
                                              // directWorkDays 계산
                                              if (item.directWorkDays !== undefined) {
                                                directWorkDays = item.directWorkDays;
                                                sumDirectDays += directWorkDays;
                                              } else if (item.equipmentCalculationBase !== undefined && item.equipmentWorkersPerUnit !== undefined && item.quantityReference) {
                                                if (quantity > 0 && item.dailyProductivity > 0) {
                                                  const calculatedEquipmentCount = calculateEquipmentCount(quantity, item.equipmentCalculationBase);
                                                  const dailyInputWorkers = calculateDailyInputWorkersByEquipment(calculatedEquipmentCount, item.equipmentWorkersPerUnit);
                                                  if (dailyInputWorkers > 0) {
                                                    directWorkDays = calculateWorkDaysWithRounding(quantity, item.dailyProductivity, dailyInputWorkers);
                                                    sumDirectDays += directWorkDays;
                                                  }
                                                }
                                              } else if (item.quantityReference && item.dailyProductivity > 0) {
                                                if (quantity > 0) {
                                                  const totalWorkers = calculateTotalWorkers(quantity, item.dailyProductivity);
                                                  const dailyInputWorkers = calculateDailyInputWorkers(totalWorkers, item.equipmentCount);
                                                  directWorkDays = calculateWorkDaysWithRounding(quantity, item.dailyProductivity, dailyInputWorkers);
                                                  sumDirectDays += directWorkDays;
                                                }
                                              }
                                            });
                                            
                                            return Math.floor(sumDirectDays);
                                          };
                                          
                                          const directWorkDaysSum = calculateDirectWorkDaysSum();
                                          
                                          return (
                                            <div key={`detail-${expandedRow.category}-${expandedRow.floorLabel || ''}`} className="border-b border-slate-300 dark:border-slate-700 pb-3 last:border-b-0">
                                              <div className="font-semibold text-sm text-slate-900 dark:text-white mb-2">
                                                {expandedRow.category === '버림' || expandedRow.category === '기초' 
                                                  ? `${expandedRow.category}${directWorkDaysSum > 0 ? ` (순작업일 합계 ${directWorkDaysSum}일)` : ''}`
                                                  : expandedRow.category === '지하층' && expandedRow.floorLabel
                                                    ? `지하층 ${expandedRow.floorLabel}층${directWorkDaysSum > 0 ? ` (순작업일 합계 ${directWorkDaysSum}일)` : ''}`
                                                    : `${expandedRow.category}${directWorkDaysSum > 0 ? ` (순작업일 합계 ${directWorkDaysSum}일)` : ''}`}
                                              </div>
                                              <div className="space-y-2">
                                                {/* 모든 공정은 일반적으로 표시 */}
                                                {colModule.items
                                                    .filter((item) => {
                                                      // 기준층의 경우 floorLabel이 일치하거나 없으면 포함
                                                      if (expandedRow.category === '기준층') {
                                                        return item.floorLabel === expandedRow.floorLabel || !item.floorLabel;
                                                      }
                                                      // 지하층의 경우 floorLabel이 일치해야 함
                                                      if (expandedRow.category === '지하층') {
                                                        return item.floorLabel === expandedRow.floorLabel;
                                                      }
                                                      // 버림, 기초는 모든 항목 포함
                                                      return true;
                                                    })
                                                    .map((item) => {
                                                      // 수량 가져오기 - 물량입력 데이터(building.floorTrades)에서 가져옴
                                                      let quantity = 0;
                                                      if (item.quantityReference) {
                                                        if (expandedRow.category === '지하층' && expandedRow.floorLabel) {
                                                          // 지하층 - 물량입력 데이터에서 가져오기
                                                          const refMatch = item.quantityReference.match(/^([A-Z])(\d+)(?:\*([\d.]+))?$/);
                                                          if (refMatch) {
                                                            const [, colLetter] = refMatch;
                                                            const floorMatch = expandedRow.floorLabel.match(/B(\d+)/);
                                                            if (floorMatch) {
                                                              const basementNum = parseInt(floorMatch[1], 10);
                                                              // 행 8 = B2, 행 9 = B1
                                                              const targetRowNum = 10 - basementNum;
                                                              const newReference = `${colLetter}${targetRowNum}${refMatch[3] ? `*${refMatch[3]}` : ''}`;
                                                              quantity = getQuantityByReference(building, newReference);
                                                            }
                                                          }
                                                        } else {
                                                          // 버림, 기초 등 - 물량입력 데이터에서 가져오기
                                                          quantity = getQuantityByReference(building, item.quantityReference);
                                                        }
                                                      }
                                                      
                                                      let directWorkDays = 0;
                                                      let totalWorkers = 0;
                                                      let dailyInputWorkers = 0;
                                                      
                                                      // 순작업일 오버라이드 가져오기 (먼저 확인)
                                                      const plan = processPlans.get(activeBuilding?.id || '');
                                                      const itemDirectWorkDaysKey = `${expandedRow.category}-${expandedRow.floorLabel || ''}-${item.id}`;
                                                      const itemDirectWorkDaysOverrides = plan?.itemDirectWorkDaysOverrides || {};
                                                      const overriddenDirectWorkDays = itemDirectWorkDaysOverrides[itemDirectWorkDaysKey];
                                                      
                                                      if (item.directWorkDays !== undefined) {
                                                        directWorkDays = item.directWorkDays;
                                                        if (item.dailyProductivity > 0 && quantity > 0) {
                                                          totalWorkers = calculateTotalWorkers(quantity, item.dailyProductivity);
                                                          dailyInputWorkers = calculateDailyInputWorkersByWorkDays(totalWorkers, directWorkDays);
                                                        }
                                                      } else if (item.equipmentCalculationBase !== undefined && item.equipmentWorkersPerUnit !== undefined) {
                                                        const calculatedEquipmentCount = calculateEquipmentCount(quantity, item.equipmentCalculationBase);
                                                        dailyInputWorkers = calculateDailyInputWorkersByEquipment(calculatedEquipmentCount, item.equipmentWorkersPerUnit);
                                                        if (item.dailyProductivity > 0 && dailyInputWorkers > 0 && quantity > 0) {
                                                          directWorkDays = calculateWorkDaysWithRounding(quantity, item.dailyProductivity, dailyInputWorkers);
                                                        }
                                                        // 타설의 경우 총투입인원 = 1일투입인원 * 순작업일
                                                        if (directWorkDays > 0 && dailyInputWorkers > 0) {
                                                          totalWorkers = dailyInputWorkers * directWorkDays;
                                                        }
                                                      } else if (item.dailyProductivity > 0 && quantity > 0) {
                                                        totalWorkers = calculateTotalWorkers(quantity, item.dailyProductivity);
                                                        dailyInputWorkers = calculateDailyInputWorkers(totalWorkers, item.equipmentCount);
                                                        directWorkDays = dailyInputWorkers > 0
                                                          ? calculateWorkDaysWithRounding(quantity, item.dailyProductivity, dailyInputWorkers)
                                                          : 0;
                                                      }
                                                      
                                                      // 오버라이드된 순작업일 사용
                                                      const displayDirectWorkDays = overriddenDirectWorkDays !== undefined ? overriddenDirectWorkDays : directWorkDays;
                                                      
                                                      // 순작업일이 오버라이드된 경우, 나머지 항목들을 재계산
                                                      if (overriddenDirectWorkDays !== undefined && overriddenDirectWorkDays > 0) {
                                                        // 장비기반 계산인 경우 (타설 등)
                                                        if (item.equipmentCalculationBase !== undefined && item.equipmentWorkersPerUnit !== undefined) {
                                                          const calculatedEquipmentCount = calculateEquipmentCount(quantity, item.equipmentCalculationBase);
                                                          dailyInputWorkers = calculateDailyInputWorkersByEquipment(calculatedEquipmentCount, item.equipmentWorkersPerUnit);
                                                          // 총투입인원 = 1일투입인원 * 순작업일
                                                          if (dailyInputWorkers > 0) {
                                                            totalWorkers = dailyInputWorkers * displayDirectWorkDays;
                                                          }
                                                        }
                                                        // 일반 계산인 경우
                                                        else if (item.dailyProductivity > 0 && quantity > 0) {
                                                          // 총투입인원은 기존 계산식 유지
                                                          if (totalWorkers === 0) {
                                                            totalWorkers = calculateTotalWorkers(quantity, item.dailyProductivity);
                                                          }
                                                          // 1일 투입인원 = 총투입인원 / 순작업일
                                                          if (totalWorkers > 0 && displayDirectWorkDays > 0) {
                                                            dailyInputWorkers = Math.ceil(totalWorkers / displayDirectWorkDays);
                                                          }
                                                        }
                                                        // directWorkDays가 고정값인 경우
                                                        else if (item.directWorkDays !== undefined && item.dailyProductivity > 0 && quantity > 0) {
                                                          totalWorkers = calculateTotalWorkers(quantity, item.dailyProductivity);
                                                          dailyInputWorkers = calculateDailyInputWorkersByWorkDays(totalWorkers, displayDirectWorkDays);
                                                        }
                                                      }
                                                      
                                                      const totalWorkDays = calculateTotalWorkDays(displayDirectWorkDays, item.indirectDays);
                                                      
                                                      // 먹매김이 아닌 항목인지 확인
                                                      const isNotMarking = !item.workItem.includes('먹매김');
                                                      // 타설 항목인지 확인 (장비대수 계산이 있는 경우)
                                                      const isConcreteItem = item.equipmentCalculationBase !== undefined && item.equipmentWorkersPerUnit !== undefined;
                                                      
                                                      // 순작업일 업데이트 핸들러
                                                      const handleDirectWorkDaysChange = async (newValue: number | null) => {
                                                        if (!activeBuilding) return;
                                                        
                                                        const currentPlan = processPlans.get(activeBuilding.id);
                                                        if (!currentPlan) return;
                                                        
                                                        const existingOverrides = currentPlan.itemDirectWorkDaysOverrides || {};
                                                        const updatedOverrides: Record<string, number> = { ...existingOverrides };
                                                        
                                                        // 지하층 공정계획에서는 지하층만 처리
                                                        if (newValue !== null && newValue > 0) {
                                                          updatedOverrides[itemDirectWorkDaysKey] = newValue;
                                                        } else {
                                                          delete updatedOverrides[itemDirectWorkDaysKey];
                                                        }
                                                        
                                                        // 순작업일 합계 재계산
                                                        let sumDirectDays = 0;
                                                        
                                                        // 버림, 기초는 floorLabel 없이 계산
                                                        if (expandedRow.category === '버림' || expandedRow.category === '기초') {
                                                          colModule.items.forEach(moduleItem => {
                                                            const moduleItemKey = `${expandedRow.category}-${expandedRow.floorLabel || ''}-${moduleItem.id}`;
                                                            const overriddenDays = updatedOverrides[moduleItemKey];
                                                            
                                                            if (overriddenDays !== undefined) {
                                                              sumDirectDays += overriddenDays;
                                                              return;
                                                            }
                                                            
                                                            let directWorkDays = 0;
                                                            let quantity = 0;
                                                            
                                                            if (moduleItem.quantityReference) {
                                                              quantity = getQuantityByReference(building, moduleItem.quantityReference);
                                                            }
                                                            
                                                            if (moduleItem.directWorkDays !== undefined) {
                                                              directWorkDays = moduleItem.directWorkDays;
                                                              sumDirectDays += directWorkDays;
                                                            } else if (moduleItem.equipmentCalculationBase !== undefined && moduleItem.equipmentWorkersPerUnit !== undefined && moduleItem.quantityReference) {
                                                              if (quantity > 0 && moduleItem.dailyProductivity > 0) {
                                                                const calculatedEquipmentCount = calculateEquipmentCount(quantity, moduleItem.equipmentCalculationBase);
                                                                const dailyInputWorkers = calculateDailyInputWorkersByEquipment(calculatedEquipmentCount, moduleItem.equipmentWorkersPerUnit);
                                                                if (dailyInputWorkers > 0) {
                                                                  directWorkDays = calculateWorkDaysWithRounding(quantity, moduleItem.dailyProductivity, dailyInputWorkers);
                                                                  sumDirectDays += directWorkDays;
                                                                }
                                                              }
                                                            } else if (moduleItem.quantityReference && moduleItem.dailyProductivity > 0) {
                                                              if (quantity > 0) {
                                                                const totalWorkers = calculateTotalWorkers(quantity, moduleItem.dailyProductivity);
                                                                const dailyInputWorkers = calculateDailyInputWorkers(totalWorkers, moduleItem.equipmentCount);
                                                                directWorkDays = calculateWorkDaysWithRounding(quantity, moduleItem.dailyProductivity, dailyInputWorkers);
                                                                sumDirectDays += directWorkDays;
                                                              }
                                                            }
                                                          });
                                                        } else if (expandedRow.floorLabel) {
                                                          // 층별 계산 - 지하층 공정계획에서는 지하층만 처리
                                                          const targetFloorLabel = expandedRow.floorLabel;
                                                          const calculationFloorLabel = expandedRow.floorLabel;
                                                          
                                                          const floorItems = colModule.items.filter(moduleItem => {
                                                            // 지하층 공정계획에서는 지하층만 처리
                                                            if (expandedRow.category === '지하층') {
                                                              return moduleItem.floorLabel === expandedRow.floorLabel;
                                                            }
                                                            // 버림, 기초는 모든 항목 포함
                                                            return true;
                                                          });
                                                          
                                                          floorItems.forEach(moduleItem => {
                                                            // 지하층 공정계획에서는 지하층만 처리
                                                            const moduleItemKey = `${expandedRow.category}-${expandedRow.floorLabel || ''}-${moduleItem.id}`;
                                                            const overriddenDays = updatedOverrides[moduleItemKey];
                                                            
                                                            if (overriddenDays !== undefined) {
                                                              sumDirectDays += overriddenDays;
                                                              return;
                                                            }
                                                            
                                                            let directWorkDays = 0;
                                                            let quantity = 0;
                                                            
                                                            // 수량 계산 (기존 로직과 동일)
                                                            if (moduleItem.quantityReference) {
                                                              const refMatch = moduleItem.quantityReference.match(/^([A-Z])(\d+)(?:\*([\d.]+))?$/);
                                                              if (refMatch) {
                                                                const [, col] = refMatch;
                                                                
                                                                if (expandedRow.category === '지하층' && expandedRow.floorLabel) {
                                                                  quantity = getQuantityFromFloor(building, expandedRow.floorLabel, 
                                                                    col === 'B' ? 'gangForm' : col === 'C' ? 'alForm' : col === 'D' ? 'formwork' : col === 'E' ? 'stripClean' : col === 'F' ? 'rebar' : 'concrete',
                                                                    col === 'B' || col === 'C' || col === 'D' || col === 'E' ? 'areaM2' : col === 'F' ? 'ton' : 'volumeM3');
                                                                } else {
                                                                  // 지하층 공정계획에서는 지하층만 처리
                                                                  quantity = getQuantityByReference(building, moduleItem.quantityReference);
                                                                }
                                                              } else {
                                                                quantity = getQuantityByReference(building, moduleItem.quantityReference);
                                                              }
                                                            }
                                                            
                                                            // directWorkDays 계산
                                                            if (moduleItem.directWorkDays !== undefined) {
                                                              directWorkDays = moduleItem.directWorkDays;
                                                              sumDirectDays += directWorkDays;
                                                            } else if (moduleItem.equipmentCalculationBase !== undefined && moduleItem.equipmentWorkersPerUnit !== undefined && moduleItem.quantityReference) {
                                                              if (quantity > 0 && moduleItem.dailyProductivity > 0) {
                                                                const calculatedEquipmentCount = calculateEquipmentCount(quantity, moduleItem.equipmentCalculationBase);
                                                                const dailyInputWorkers = calculateDailyInputWorkersByEquipment(calculatedEquipmentCount, moduleItem.equipmentWorkersPerUnit);
                                                                if (dailyInputWorkers > 0) {
                                                                  directWorkDays = calculateWorkDaysWithRounding(quantity, moduleItem.dailyProductivity, dailyInputWorkers);
                                                                  sumDirectDays += directWorkDays;
                                                                }
                                                              }
                                                            } else if (moduleItem.quantityReference && moduleItem.dailyProductivity > 0) {
                                                              if (quantity > 0) {
                                                                const totalWorkers = calculateTotalWorkers(quantity, moduleItem.dailyProductivity);
                                                                const dailyInputWorkers = calculateDailyInputWorkers(totalWorkers, moduleItem.equipmentCount);
                                                                directWorkDays = calculateWorkDaysWithRounding(quantity, moduleItem.dailyProductivity, dailyInputWorkers);
                                                                sumDirectDays += directWorkDays;
                                                              }
                                                            }
                                                          });
                                                        }
                                                        
                                                        // 지하층 공정계획에서는 공정타입 자동 변경 없음
                                                        const previousProcessType = currentPlan.processes[expandedRow.category]?.processType || DEFAULT_PROCESS_TYPES[expandedRow.category] || '표준공정';
                                                        const newProcessType = previousProcessType;
                                                        
                                                        // processPlans의 해당 구분의 days 업데이트
                                                        const updatedPlan = {
                                                          ...currentPlan,
                                                          itemDirectWorkDaysOverrides: updatedOverrides,
                                                          processes: {
                                                            ...currentPlan.processes,
                                                            [expandedRow.category]: {
                                                              ...currentPlan.processes[expandedRow.category],
                                                              days: sumDirectDays,
                                                              processType: newProcessType,
                                                            },
                                                          },
                                                        };
                                                        
                                                        // totalDays 재계산
                                                        updatedPlan.totalDays = calculateTotalDays(updatedPlan.processes, building);
                                                        
                                                        setProcessPlans(new Map(processPlans.set(activeBuilding.id, updatedPlan)));
                                                        
                                                        // localStorage에 저장
                                                        try {
                                                          if (typeof window !== 'undefined') {
                                                            const storageKey = `contech_process_plan_${activeBuilding.id}`;
                                                            localStorage.setItem(storageKey, JSON.stringify(updatedPlan));
                                                          }
                                                        } catch (error) {
                                                          logger.error('Failed to save direct work days:', error);
                                                          toast.error('순작업일 저장에 실패했습니다.');
                                                        }
                                                      };
                                                      
                                                      // 오버라이드된 순작업일로 총작업일수 재계산
                                                      const recalculatedTotalWorkDays = calculateTotalWorkDays(displayDirectWorkDays, item.indirectDays);
                                                      
                                                      return (
                                                        <div 
                                                          key={item.id}
                                                          className="p-2 bg-white dark:bg-slate-900 rounded border border-slate-200 dark:border-slate-700"
                                                        >
                                                          <div className="font-bold text-slate-900 dark:text-white mb-1">
                                                            {item.workItem.replace(/^\d+\.\s*/, '').replace(/\s*\(1일\)/, '')}
                                                          </div>
                                                          {/* 순작업일을 세부공정명 바로 아래에 위치 */}
                                                          <div className="mb-2">
                                                            <div className="text-xs text-slate-600 dark:text-slate-400 mb-1">순작업일</div>
                                                            <Input
                                                              type="number"
                                                              min="0"
                                                              step="1"
                                                              value={(displayDirectWorkDays ?? 0) > 0 ? Math.round(displayDirectWorkDays ?? 0) : ''}
                                                              onChange={(e) => {
                                                                const value = e.target.value === '' ? null : Math.round(parseFloat(e.target.value) || 0);
                                                                handleDirectWorkDaysChange(value);
                                                              }}
                                                              onBlur={(e) => {
                                                                // blur 시 정수로 반올림
                                                                const value = e.target.value === '' ? null : Math.round(parseFloat(e.target.value) || 0);
                                                                if (value !== null && value !== displayDirectWorkDays) {
                                                                  handleDirectWorkDaysChange(value);
                                                                }
                                                              }}
                                                              className="font-bold text-slate-900 dark:text-white w-20 h-8 text-sm [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:appearance-none [-moz-appearance:textfield]"
                                                              placeholder="0"
                                                            />
                                                          </div>
                                                          <div className="text-slate-600 dark:text-slate-400 space-y-0.5 text-xs">
                                                            {item.unit && <div>단위: {item.unit}</div>}
                                                            {item.quantityReference && <div>수량: {quantity.toFixed(2)}</div>}
                                                            {/* 타설 항목인 경우 장비투입대수 표시 */}
                                                            {isConcreteItem && (
                                                              <>
                                                                {(() => {
                                                                  const equipmentCount = calculateEquipmentCount(quantity, item.equipmentCalculationBase!);
                                                                  return equipmentCount > 0 && <div>장비투입대수: {equipmentCount}</div>;
                                                                })()}
                                                              </>
                                                            )}
                                                            {/* 먹매김이 아닌 경우 인당 생산성과 인원 정보 표시 */}
                                                            {isNotMarking && item.dailyProductivity > 0 && (
                                                              <>
                                                                {/* 타설 항목이 아닌 경우에만 인당 생산성 표시 */}
                                                                {!isConcreteItem && <div>인당 생산성: {item.dailyProductivity}</div>}
                                                                {isNotMarking && totalWorkers > 0 && <div>총투입인원: {totalWorkers}</div>}
                                                                {dailyInputWorkers > 0 && <div>1일 투입인원: {dailyInputWorkers}</div>}
                                                              </>
                                                            )}
                                                            {item.indirectDays > 0 && <div>간접작업일: {item.indirectDays}</div>}
                                                            {item.indirectWorkItem && item.indirectDays > 0 && <div>간접작업항목: {item.indirectWorkItem}</div>}
                                                            <div className="text-slate-900 dark:text-white">
                                                              총작업일수: {recalculatedTotalWorkDays}
                                                            </div>
                                                          </div>
                                                        </div>
                                                      );
                                                    })
                                                }
                                              </div>
                                            </div>
                                          );
                                        })()}
                                      </div>
                                    </td>
                                  )}
                                </tr>
                              );
                            })}
                            
                            {/* 합계 행 - 첫 번째 공정 열의 첫 번째 칸에만 표시 */}
                            <tr className="border-t-2 border-slate-300 dark:border-slate-700 bg-slate-100 dark:bg-slate-800" style={{ height: '24px' }}>
                              {/* 구분 항목 열 */}
                              <td className="px-2 py-1 text-center text-xs font-bold text-slate-900 dark:text-white border-r border-slate-200 dark:border-slate-800 align-middle" style={{ height: '24px' }}>
                                합계
                              </td>
                              {/* 층수 열 */}
                              <td className="px-2 py-1 text-center text-xs font-bold text-slate-900 dark:text-white border-r border-slate-200 dark:border-slate-800 align-middle" style={{ height: '24px' }}>
                              </td>
                              {/* 형틀 열 */}
                              <td className="px-1 py-1 text-center text-xs font-bold text-slate-900 dark:text-white border-r border-slate-200 dark:border-slate-800 align-middle" style={{ height: '24px' }}>
                              </td>
                              {/* 철근 열 */}
                              <td className="px-1 py-1 text-center text-xs font-bold text-slate-900 dark:text-white border-r border-slate-200 dark:border-slate-800 align-middle" style={{ height: '24px' }}>
                              </td>
                              {/* 콘크리트 열 */}
                              <td className="px-1 py-1 text-center text-xs font-bold text-slate-900 dark:text-white border-r-2 border-slate-200 dark:border-slate-800 align-middle" style={{ height: '24px' }}>
                              </td>
                              {processColumns.length > 0 && (
                                <>
                                  {/* 첫 번째 공정 열의 첫 번째 칸(일수 열)에만 합계 표시 */}
                                  <td className="px-1 py-1 text-center text-xs font-bold text-slate-900 dark:text-white border-r border-slate-200 dark:border-slate-800 align-middle" style={{ height: '24px' }}>
                                    {plan ? calculateTotalDays(plan.processes, building) : 0}
                                  </td>
                                  {/* 첫 번째 공정 열의 2번째, 3번째 칸은 빈 칸 */}
                                  <td className="px-1 py-1 border-r border-slate-200 dark:border-slate-800 align-middle" style={{ height: '24px' }}></td>
                                  <td className="px-1 py-1 border-r border-slate-200 dark:border-slate-800 align-middle" style={{ height: '24px' }}></td>
                                </>
                              )}
                              {/* 세부공정 상세 열 */}
                              <td className="px-2 py-1 align-top"></td>
                            </tr>
                          </Fragment>
                        );
                      })()}
                    </tbody>
                  </table>
                </div>
              </CardContent>
            </Card>
          )}
        </BuildingTabs>
      ) : null}
    </div>
  );
}
