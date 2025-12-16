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

interface Props {
  projectId: string;
}

// 공정 구분 목록
const PROCESS_CATEGORIES: ProcessCategory[] = ['버림', '기초', '지하층', '셋팅층', '기준층', '옥탑층'];

// 공정 타입 옵션 (구분별로 다름)
const PROCESS_TYPE_OPTIONS: Record<ProcessCategory, ProcessType[]> = {
  '버림': ['표준공정'],
  '기초': ['표준공정'],
  '지하층': ['표준공정'],
  '셋팅층': ['표준공정'],
  '기준층': ['5일 사이클', '6일 사이클', '7일 사이클', '8일 사이클'],
  'PH층': ['표준공정'],
  '옥탑층': ['표준공정'],
};

// 기본 공정 타입
const DEFAULT_PROCESS_TYPES: Record<ProcessCategory, ProcessType> = {
  '버림': '표준공정',
  '기초': '표준공정',
  '지하층': '표준공정',
  '셋팅층': '표준공정',
  '기준층': '6일 사이클',
  'PH층': '표준공정',
  '옥탑층': '표준공정',
};

export function BuildingProcessPlanPage({ projectId }: Props) {
  const [buildings, setBuildings] = useState<Building[]>([]);
  const [processPlans, setProcessPlans] = useState<Map<string, BuildingProcessPlan>>(new Map());
  const [isLoading, setIsLoading] = useState(false);
  const [expandedModules, setExpandedModules] = useState<Map<string, Set<string>>>(new Map()); // buildingId-category 조합
  const [activeBuildingIndex, setActiveBuildingIndex] = useState(0);

  // 기준층에 해당하는 층 목록 추출 (각 동별로) - 동기본정보 페이지의 층설정 데이터 기반, 최상층 포함, 코어 구분 없음, 중복 제거
  const getStandardFloors = useMemo(() => {
    const map = new Map<string, Floor[]>();
    buildings.forEach(building => {
      // 동기본정보 페이지의 층설정 데이터(building.floors)에서 기준층과 최상층 추출
      const standardFloors = building.floors.filter(f => 
        f.floorClass === '기준층' || f.floorClass === '최상층'
      );
      // 범위 형식(예: "2~14F 기준층")을 개별 층으로 분해
      const individualFloors: Floor[] = [];
      const floorNumberMap = new Map<number, Floor>(); // 층 번호별로 하나만 저장
      
      standardFloors.forEach(floor => {
        // 코어 정보 제거 (예: "코어1-3F" -> "3F")
        let cleanLabel = floor.floorLabel.replace(/코어\d+-/, '');
        const rangeMatch = cleanLabel.match(/(\d+)~(\d+)F/);
        if (rangeMatch) {
          const start = parseInt(rangeMatch[1], 10);
          const end = parseInt(rangeMatch[2], 10);
          for (let i = start; i <= end; i++) {
            // 같은 층 번호가 이미 있으면 건너뛰기
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
          // 개별 층인 경우 - 층 번호 추출
          const numMatch = cleanLabel.match(/(\d+)F/);
          if (numMatch) {
            const floorNum = parseInt(numMatch[1], 10);
            // 같은 층 번호가 이미 있으면 건너뛰기
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
            // 층 번호를 추출할 수 없는 경우 (최상층 등)
            const floorNum = floor.floorNumber;
            if (!floorNumberMap.has(floorNum)) {
              floorNumberMap.set(floorNum, floor);
              individualFloors.push(floor);
            }
          }
        }
      });
      // 층 번호 순으로 정렬
      individualFloors.sort((a, b) => a.floorNumber - b.floorNumber);
      map.set(building.id, individualFloors);
    });
    return map;
  }, [buildings]);

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

  // 셋팅층 및 일반층 목록 추출 (각 동별로) - 동기본정보 페이지의 층설정 데이터 기반
  const getSettingFloors = useMemo(() => {
    const map = new Map<string, Floor[]>();
    buildings.forEach(building => {
      // 동기본정보 페이지의 층설정 데이터(building.floors)에서 셋팅층과 일반층 추출
      const settingFloors = building.floors
        .filter(f => f.floorClass === '셋팅층' || f.floorClass === '일반층')
        .map(floor => {
          // 코어 정보 제거 (예: "코어1-1F" -> "1F")
          let cleanLabel = floor.floorLabel.replace(/코어\d+-/, '');
          return {
            ...floor,
            floorLabel: cleanLabel,
          };
        })
        .sort((a, b) => a.floorNumber - b.floorNumber); // 1층, 2층 순서
      map.set(building.id, settingFloors);
    });
    return map;
  }, [buildings]);

  // 옥탑층 목록 추출 (각 동별로) - 동기본정보 페이지의 층설정 데이터 기반
  const getPhFloors = useMemo(() => {
    const map = new Map<string, Floor[]>();
    buildings.forEach(building => {
      // 동기본정보 페이지의 층설정 데이터(building.floors)에서 옥탑층 추출
      const phFloors = building.floors
        .filter(f => f.floorClass === '옥탑층')
        .map(floor => {
          // 코어 정보 제거 (예: "코어1-옥탑1층" -> "옥탑1층")
          let cleanLabel = floor.floorLabel.replace(/코어\d+-/, '');
          return {
            ...floor,
            floorLabel: cleanLabel,
          };
        })
        .sort((a, b) => a.floorNumber - b.floorNumber); // 옥탑1, 옥탑2 순서
      map.set(building.id, phFloors);
    });
    return map;
  }, [buildings]);

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

        const processType = plan.processes[category]?.processType || DEFAULT_PROCESS_TYPES[category];
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
              // 장비대수 계산 (펌프카 최대 투입대수 기준)
              const maxPumpCarCount = building.meta?.pumpCarCount || 2;
              const calculatedEquipmentCount = calculateEquipmentCount(quantity, item.equipmentCalculationBase, maxPumpCarCount);
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
              console.error('Failed to load process plan from localStorage:', error);
            }
          }
          
          if (!existingPlan) {
            const defaultProcesses: BuildingProcessPlan['processes'] = {};
            PROCESS_CATEGORIES.forEach(category => {
              defaultProcesses[category] = {
                days: 0,
                processType: DEFAULT_PROCESS_TYPES[category],
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

    // 지하층나 옥탑층의 경우 층별로 저장
    if ((category === '지하층' || category === '옥탑층') && floorLabel) {
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
    if (!plan) return DEFAULT_PROCESS_TYPES[category];
    
    const categoryProcess = plan.processes[category];
    if (!categoryProcess) return DEFAULT_PROCESS_TYPES[category];
    
    // 지하층나 옥탑층의 경우 층별 processType 확인
    if ((category === '지하층' || category === '옥탑층') && categoryProcess.floors) {
      if (categoryProcess.floors[floorLabel]) {
        return categoryProcess.floors[floorLabel].processType;
      }
    }
    
    // 기본 processType 반환
    return categoryProcess.processType || DEFAULT_PROCESS_TYPES[category];
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
          const floorProcessType = processes[category]?.floors?.[floor.floorLabel]?.processType || processes[category]?.processType || DEFAULT_PROCESS_TYPES[category];
          const floorDays = calculateBasementFloorDays(building, category, floorProcessType, floor.floorLabel);
          total += floorDays;
        });
      } else if (category === '옥탑층' && building) {
        // 옥탑층은 각 층별 일수를 합산
        const phFloors = getPhFloors.get(building.id) || [];
        phFloors.forEach(floor => {
          const floorProcessType = processes[category]?.floors?.[floor.floorLabel]?.processType || processes[category]?.processType || DEFAULT_PROCESS_TYPES[category];
          const floorDays = calculatePhFloorDays(building, category, floorProcessType, floor.floorLabel);
          total += floorDays;
        });
      } else if (category === '기준층' && building) {
        // 기준층은 각 층별 일수를 합산
        const standardFloors = getStandardFloors.get(building.id) || [];
        const processType = processes[category]?.processType || DEFAULT_PROCESS_TYPES[category];
        standardFloors.forEach(floor => {
          const floorDays = calculateStandardFloorDays(building, category, processType, floor.floorLabel);
          total += floorDays;
        });
      } else if (category === '셋팅층' && building) {
        // 셋팅층은 각 층별 일수를 합산
        const settingFloors = getSettingFloors.get(building.id) || [];
        const processType = processes[category]?.processType || DEFAULT_PROCESS_TYPES[category];
        settingFloors.forEach(floor => {
          const floorDays = calculateSettingFloorDays(building, category, processType, floor.floorLabel);
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
          // 장비대수 계산 (펌프카 최대 투입대수 기준)
          const maxPumpCarCount = building.meta?.pumpCarCount || 2;
          const calculatedEquipmentCount = calculateEquipmentCount(quantity, item.equipmentCalculationBase, maxPumpCarCount);
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

  // 옥탑층 각 층별 일수 계산
  const calculatePhFloorDays = (
    building: Building,
    category: ProcessCategory,
    processType: ProcessType,
    floorLabel: string
  ): number => {
    const module = getProcessModule(category, processType);
    if (!module || !module.items.length) return 0;

    let sumDays = 0;
    
    // 옥탑층의 경우 floorLabel로 필터링하거나, 모든 항목을 사용하되 수량 참조를 층별로 조정
    const floorItems = module.items.filter(item => {
      if (item.floorLabel) {
        // 옥탑1, 옥탑2 형식 처리
        const itemMatch = item.floorLabel.match(/옥탑(\d+)/);
        const rowMatch = floorLabel.match(/옥탑(\d+)/);
        if (itemMatch && rowMatch) {
          return itemMatch[1] === rowMatch[1];
        }
        return item.floorLabel === floorLabel;
      }
      return true; // floorLabel이 없으면 모든 항목 사용
    });
    
    floorItems.forEach(item => {
      let directWorkDays = 0;
      let quantity = 0;
      
      // 수량 참조를 층별로 조정
      if (item.quantityReference) {
        const refMatch = item.quantityReference.match(/^([A-Z])(\d+)(?:\*([\d.]+))?$/);
        if (refMatch) {
          const [, col, baseRow] = refMatch;
          const baseRowNum = parseInt(baseRow, 10);
          // 행 26 = 옥탑1, 행 27 = 옥탑2
          const phMatch = floorLabel.match(/옥탑(\d+)/);
          if (phMatch) {
            const phNum = parseInt(phMatch[1], 10);
            // 옥탑1 = 행 26, 옥탑2 = 행 27
            const targetRowNum = 25 + phNum; // 옥탑1 -> 26, 옥탑2 -> 27
            const newReference = `${col}${targetRowNum}${refMatch[3] ? `*${refMatch[3]}` : ''}`;
            quantity = getQuantityByReference(building, newReference);
          } else {
            quantity = getQuantityByReference(building, item.quantityReference);
          }
        } else {
          quantity = getQuantityByReference(building, item.quantityReference);
        }
      }
      
      // directWorkDays가 고정값인 경우
      if (item.directWorkDays !== undefined) {
        directWorkDays = item.directWorkDays;
        sumDays += directWorkDays;
      } 
      // 장비기반 계산인 경우
      else if (item.equipmentCalculationBase !== undefined && item.equipmentWorkersPerUnit !== undefined && item.quantityReference) {
        if (quantity > 0 && item.dailyProductivity > 0) {
          // 장비대수 계산 (펌프카 최대 투입대수 기준)
          const maxPumpCarCount = building.meta?.pumpCarCount || 2;
          const calculatedEquipmentCount = calculateEquipmentCount(quantity, item.equipmentCalculationBase, maxPumpCarCount);
          const dailyInputWorkers = calculateDailyInputWorkersByEquipment(calculatedEquipmentCount, item.equipmentWorkersPerUnit);
          if (dailyInputWorkers > 0) {
            directWorkDays = calculateWorkDaysWithRounding(quantity, item.dailyProductivity, dailyInputWorkers);
            sumDays += directWorkDays;
          }
        }
      }
      // 계산식이 필요한 경우
      else if (item.quantityReference && item.dailyProductivity > 0) {
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

  // 기준층 각 층별 일수 계산
  const calculateStandardFloorDays = (
    building: Building,
    category: ProcessCategory,
    processType: ProcessType,
    floorLabel: string
  ): number => {
    const module = getProcessModule(category, processType);
    if (!module || !module.items.length) return 0;

    let sumDays = 0;
    
    // 기준층의 경우 모든 항목을 사용하되 수량 참조를 층별로 조정
    module.items.forEach(item => {
      let directWorkDays = 0;
      let quantity = 0;
      
      // 수량 참조를 층별로 조정 - floorLabel을 직접 사용
      if (item.quantityReference) {
        const refMatch = item.quantityReference.match(/^([A-Z])(\d+)(?:\*([\d.]+))?$/);
        if (refMatch) {
          const [, col] = refMatch;
          const ratio = refMatch[3] ? parseFloat(refMatch[3]) : 1;
          
          // 컬럼에 따라 field와 subField 결정
          let field: 'gangForm' | 'alForm' | 'formwork' | 'stripClean' | 'rebar' | 'concrete' | null = null;
          let subField = '';
          
          switch (col) {
            case 'B':
              field = 'gangForm';
              subField = 'areaM2';
              break;
            case 'C':
              field = 'alForm';
              subField = 'areaM2';
              break;
            case 'D':
              field = 'formwork';
              subField = 'areaM2';
              break;
            case 'E':
              field = 'stripClean';
              subField = 'areaM2';
              break;
            case 'F':
              field = 'rebar';
              subField = 'ton';
              break;
            case 'G':
              field = 'concrete';
              subField = 'volumeM3';
              break;
          }
          
          if (field) {
            // floorLabel을 직접 사용하여 수량 가져오기
            quantity = getQuantityFromFloor(building, floorLabel, field, subField) * ratio;
          } else {
            quantity = getQuantityByReference(building, item.quantityReference);
          }
        } else {
          quantity = getQuantityByReference(building, item.quantityReference);
        }
      }
      
      // directWorkDays가 고정값인 경우
      if (item.directWorkDays !== undefined) {
        directWorkDays = item.directWorkDays;
        sumDays += directWorkDays;
      } 
      // 장비기반 계산인 경우
      else if (item.equipmentCalculationBase !== undefined && item.equipmentWorkersPerUnit !== undefined && item.quantityReference) {
        if (quantity > 0 && item.dailyProductivity > 0) {
          // 장비대수 계산 (펌프카 최대 투입대수 기준)
          const maxPumpCarCount = building.meta?.pumpCarCount || 2;
          const calculatedEquipmentCount = calculateEquipmentCount(quantity, item.equipmentCalculationBase, maxPumpCarCount);
          const dailyInputWorkers = calculateDailyInputWorkersByEquipment(calculatedEquipmentCount, item.equipmentWorkersPerUnit);
          if (dailyInputWorkers > 0) {
            directWorkDays = calculateWorkDaysWithRounding(quantity, item.dailyProductivity, dailyInputWorkers);
            sumDays += directWorkDays;
          }
        }
      }
      // 계산식이 필요한 경우
      else if (item.quantityReference && item.dailyProductivity > 0) {
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

  // 셋팅층 각 층별 일수 계산
  const calculateSettingFloorDays = (
    building: Building,
    category: ProcessCategory,
    processType: ProcessType,
    floorLabel: string
  ): number => {
    const module = getProcessModule(category, processType);
    if (!module || !module.items.length) return 0;

    let sumDays = 0;
    
    // 셋팅층의 경우 모든 항목을 사용하되 수량 참조를 층별로 조정
    module.items.forEach(item => {
      let directWorkDays = 0;
      let quantity = 0;
      
      // 수량 참조를 층별로 조정
      if (item.quantityReference) {
        const refMatch = item.quantityReference.match(/^([A-Z])(\d+)(?:\*([\d.]+))?$/);
        if (refMatch) {
          const [, col, baseRow] = refMatch;
          const baseRowNum = parseInt(baseRow, 10);
          // 행 11 = 1층, 행 12 = 2층, ...
          const floorMatch = floorLabel.match(/(\d+)F/);
          if (floorMatch) {
            const floorNum = parseInt(floorMatch[1], 10);
            // 1층 = 행 11, 2층 = 행 12, ...
            const targetRowNum = floorNum + 10; // 1층 -> 11, 2층 -> 12
            const newReference = `${col}${targetRowNum}${refMatch[3] ? `*${refMatch[3]}` : ''}`;
            quantity = getQuantityByReference(building, newReference);
          } else {
            quantity = getQuantityByReference(building, item.quantityReference);
          }
        } else {
          quantity = getQuantityByReference(building, item.quantityReference);
        }
      }
      
      // directWorkDays가 고정값인 경우
      if (item.directWorkDays !== undefined) {
        directWorkDays = item.directWorkDays;
        sumDays += directWorkDays;
      } 
      // 장비기반 계산인 경우
      else if (item.equipmentCalculationBase !== undefined && item.equipmentWorkersPerUnit !== undefined && item.quantityReference) {
        if (quantity > 0 && item.dailyProductivity > 0) {
          // 장비대수 계산 (펌프카 최대 투입대수 기준)
          const maxPumpCarCount = building.meta?.pumpCarCount || 2;
          const calculatedEquipmentCount = calculateEquipmentCount(quantity, item.equipmentCalculationBase, maxPumpCarCount);
          const dailyInputWorkers = calculateDailyInputWorkersByEquipment(calculatedEquipmentCount, item.equipmentWorkersPerUnit);
          if (dailyInputWorkers > 0) {
            directWorkDays = calculateWorkDaysWithRounding(quantity, item.dailyProductivity, dailyInputWorkers);
            sumDays += directWorkDays;
          }
        }
      }
      // 계산식이 필요한 경우
      else if (item.quantityReference && item.dailyProductivity > 0) {
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

  // 동별 주요정보 계산 (Building.meta에서 가져오기)
  const getBuildingInfo = (building: Building) => {
    const meta = building.meta;
    
    // 호수 계산: 코어정보에서 호수를 더하고 제외세대수를 뺀 값
    let calculatedUnits = 0;
    const coreUnits: Array<{ coreNumber: number; units: number }> = [];
    
    if (meta.unitTypePattern && meta.unitTypePattern.length > 0) {
      // 각 코어별로 호수 계산
      const coreUnitsMap = new Map<number, number>();
      
      meta.unitTypePattern.forEach(pattern => {
        const coreNum = pattern.coreNumber || 1;
        const units = pattern.to - pattern.from + 1;
        
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
    
    // 단위세대 구성 문자열 생성
    const unitComposition = meta.unitTypePattern
      .map(pattern => {
        const coreNum = pattern.coreNumber || 1;
        return `코어${coreNum} ${pattern.from}~${pattern.to}호 ${pattern.type}`;
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
    }> = [];
    
    let rowIndex = 0;
    const floors = activeBuilding.floors;
    const coreCount = activeBuilding.meta.coreCount;
    const coreGroundFloors = activeBuilding.meta.floorCount.coreGroundFloors;
    
    // 1. 옥탑층 추가 (맨 위) - 옥탑3, 옥탑2, 옥탑1 순서로 표시
    const rooftopFloors = floors.filter(f => f.floorClass === '옥탑층')
      .sort((a, b) => (b.floorNumber || 0) - (a.floorNumber || 0)); // 역순 정렬
      
    rooftopFloors.forEach(floor => {
      // 코어 정보 제거 (예: "코어1-옥탑1층" -> "옥탑1층")
      let cleanLabel = floor.floorLabel.replace(/코어\d+-/, '');
      // PH 형식을 옥탑 형식으로 변환 (PH1 -> 옥탑1, PH2 -> 옥탑2, PH3 -> 옥탑3)
      if (cleanLabel.match(/^PH\d+$/i)) {
        const phMatch = cleanLabel.match(/PH(\d+)/i);
        if (phMatch) {
          cleanLabel = `옥탑${phMatch[1]}`;
        }
      }
      
      rows.push({ 
        category: '옥탑층', 
        floorLabel: cleanLabel, 
        floor,
        floorClass: floor.floorClass,
        rowIndex: rowIndex++ 
      });
    });
    
    // 2. PH층 추가
    const phFloors = floors.filter(f => f.floorClass === 'PH층');
    phFloors.forEach(floor => {
      // 코어 정보 제거 및 PH 형식을 옥탑 형식으로 변환
      let cleanLabel = floor.floorLabel.replace(/코어\d+-/, '');
      // PH 형식을 옥탑 형식으로 변환 (PH1 -> 옥탑1, PH2 -> 옥탑2, PH3 -> 옥탑3)
      if (cleanLabel.match(/^PH\d+$/i)) {
        const phMatch = cleanLabel.match(/PH(\d+)/i);
        if (phMatch) {
          cleanLabel = `옥탑${phMatch[1]}`;
        }
      }
      rows.push({ 
        category: 'PH층', 
        floorLabel: cleanLabel, 
        floor,
        floorClass: floor.floorClass,
        rowIndex: rowIndex++ 
      });
    });
    
    // 3. 지상층 추가 (기준층, 일반층, 셋팅층 순서 - 역순)
    if (coreCount > 1 && coreGroundFloors && coreGroundFloors.length > 0) {
      // 코어1의 최대 층수
      const core1MaxFloor = coreGroundFloors[0] || 0;
      
      // 기준층 찾기 (범위 형식) - 개별 행으로 분리
      const standardRangeFloor = floors.find(f => 
        f.floorClass === '기준층' && 
        f.floorLabel.includes('~') && 
        (f.floorLabel.includes('코어1-') || !f.floorLabel.includes('코어'))
      );
      
      // 최상층을 먼저 추가 (범위에 포함되어 있든 없든 모두) - 코어가 여러 개인 경우
      const topFloorsMultiCore = floors.filter(f => {
        if (f.floorClass !== '최상층') return false;
        return f.floorLabel.includes('코어1-') || !f.floorLabel.includes('코어');
      });
      
      topFloorsMultiCore.forEach(floor => {
        const floorMatch = floor.floorLabel.match(/(\d+)F/);
        if (floorMatch) {
          const floorNum = parseInt(floorMatch[1], 10);
          rows.push({
            category: '기준층' as ProcessCategory,
            floorLabel: `${floorNum}F`,
            floor: floor,
            floorClass: '최상층',
            rowIndex: rowIndex++
          });
        }
      });
      
      // 기준층 범위 추가 (최상층 제외)
      if (standardRangeFloor) {
        // 범위 추출 (예: "코어1-2~14F 기준층" -> 2F, 3F, ..., 14F 개별 행으로)
        const rangeMatch = standardRangeFloor.floorLabel.match(/(\d+)~(\d+)F/);
        if (rangeMatch) {
          const startFloor = parseInt(rangeMatch[1], 10);
          const endFloor = parseInt(rangeMatch[2], 10);
          
          // 최상층 층 번호 수집
          const topFloorNums = new Set<number>();
          topFloorsMultiCore.forEach(floor => {
            const floorMatch = floor.floorLabel.match(/(\d+)F/);
            if (floorMatch) {
              topFloorNums.add(parseInt(floorMatch[1], 10));
            }
          });
          
          // 기준층 추가 (최상층 제외, 역순)
          for (let i = endFloor; i >= startFloor; i--) {
            if (!topFloorNums.has(i)) {
              rows.push({
                category: '기준층' as ProcessCategory,
                floorLabel: `${i}F`,
                floor: standardRangeFloor,
                floorClass: '기준층',
                rowIndex: rowIndex++
              });
            }
          }
        }
      }
      
      // 셋팅층 및 일반층 추가 (역순으로) - 기준층 범위에 포함된 층은 제외
      const standardRangeFloorNums = new Set<number>();
      if (standardRangeFloor) {
        const rangeMatch = standardRangeFloor.floorLabel.match(/(\d+)~(\d+)F/);
        if (rangeMatch) {
          const startFloor = parseInt(rangeMatch[1], 10);
          const endFloor = parseInt(rangeMatch[2], 10);
          for (let i = startFloor; i <= endFloor; i++) {
            standardRangeFloorNums.add(i);
          }
        }
      }
      
      const settingAndNormalFloors: Array<{ floor: Floor; floorNum: number }> = [];
      for (let i = 1; i <= core1MaxFloor; i++) {
        let foundFloor = floors.find(f => {
          const match = f.floorLabel.match(/코어1-(\d+)F$/);
          if (match && parseInt(match[1], 10) === i) {
            return true;
          }
          const rangeMatch = f.floorLabel.match(/코어1-(\d+)~(\d+)F 기준층/);
          if (rangeMatch) {
            const start = parseInt(rangeMatch[1], 10);
            const end = parseInt(rangeMatch[2], 10);
            return i >= start && i <= end;
          }
          return false;
        });
        
        if (foundFloor && (foundFloor.floorClass === '셋팅층' || foundFloor.floorClass === '일반층')) {
          // 기준층 범위에 포함된 층은 제외
          if (!standardRangeFloorNums.has(i)) {
            settingAndNormalFloors.push({ floor: foundFloor, floorNum: i });
          }
        }
      }
      
      // 역순으로 추가
      settingAndNormalFloors.reverse().forEach(({ floor, floorNum }) => {
        rows.push({ 
          category: '셋팅층' as ProcessCategory, 
          floorLabel: `${floorNum}F`, 
          floor: floor,
          floorClass: floor.floorClass,
          rowIndex: rowIndex++ 
        });
      });
    } else {
      // 코어가 1개이거나 코어별 층수가 없으면 전체 지상층 수로 처리
      const groundFloorCount = activeBuilding.meta.floorCount.ground || 0;
      
      // 기준층 찾기 (범위 형식) - 개별 행으로 분리
      const standardRangeFloor = floors.find(f => 
        f.floorClass === '기준층' && 
        f.floorLabel.includes('~')
      );
      
      // 최상층을 먼저 추가 (범위에 포함되어 있든 없든 모두) - 코어가 1개인 경우
      const topFloors = floors.filter(f => {
        if (f.floorClass !== '최상층') return false;
        return true;
      });
      
      topFloors.forEach(floor => {
        const floorMatch = floor.floorLabel.match(/(\d+)F/);
        if (floorMatch) {
          const floorNum = parseInt(floorMatch[1], 10);
          rows.push({
            category: '기준층' as ProcessCategory,
            floorLabel: `${floorNum}F`,
            floor: floor,
            floorClass: '최상층',
            rowIndex: rowIndex++
          });
        }
      });
      
      // 기준층 범위 추가 (최상층 제외)
      if (standardRangeFloor) {
        // 범위 추출 (예: "2~14F 기준층" -> 2F, 3F, ..., 14F 개별 행으로)
        const rangeMatch = standardRangeFloor.floorLabel.match(/(\d+)~(\d+)F/);
        if (rangeMatch) {
          const startFloor = parseInt(rangeMatch[1], 10);
          const endFloor = parseInt(rangeMatch[2], 10);
          
          // 최상층 층 번호 수집
          const topFloorNums = new Set<number>();
          topFloors.forEach(floor => {
            const floorMatch = floor.floorLabel.match(/(\d+)F/);
            if (floorMatch) {
              topFloorNums.add(parseInt(floorMatch[1], 10));
            }
          });
          
          // 기준층 추가 (최상층 제외, 역순)
          for (let i = endFloor; i >= startFloor; i--) {
            if (!topFloorNums.has(i)) {
              rows.push({
                category: '기준층' as ProcessCategory,
                floorLabel: `${i}F`,
                floor: standardRangeFloor,
                floorClass: '기준층',
                rowIndex: rowIndex++
              });
            }
          }
        }
      }
      
      // 셋팅층 및 일반층 추가 (역순으로) - 기준층 범위에 포함된 층은 제외
      const standardRangeFloorNumsSingleCore = new Set<number>();
      if (standardRangeFloor) {
        const rangeMatch = standardRangeFloor.floorLabel.match(/(\d+)~(\d+)F/);
        if (rangeMatch) {
          const startFloor = parseInt(rangeMatch[1], 10);
          const endFloor = parseInt(rangeMatch[2], 10);
          for (let i = startFloor; i <= endFloor; i++) {
            standardRangeFloorNumsSingleCore.add(i);
          }
        }
      }
      
      const settingAndNormalFloors: Array<{ floor: Floor; floorNum: number }> = [];
      for (let i = 1; i <= groundFloorCount; i++) {
        let foundFloor = floors.find(f => {
          if (f.floorLabel === `${i}F` && (f.floorClass === '셋팅층' || f.floorClass === '일반층')) {
            return true;
          }
          const rangeMatch = f.floorLabel.match(/(\d+)~(\d+)F 기준층/);
          if (rangeMatch) {
            const start = parseInt(rangeMatch[1], 10);
            const end = parseInt(rangeMatch[2], 10);
            return i >= start && i <= end;
          }
          return false;
        });
        
        if (foundFloor && (foundFloor.floorClass === '셋팅층' || foundFloor.floorClass === '일반층')) {
          // 기준층 범위에 포함된 층은 제외
          if (!standardRangeFloorNumsSingleCore.has(i)) {
            settingAndNormalFloors.push({ floor: foundFloor, floorNum: i });
          }
        }
      }
      
      // 역순으로 추가
      settingAndNormalFloors.reverse().forEach(({ floor, floorNum }) => {
        rows.push({ 
          category: '셋팅층' as ProcessCategory, 
          floorLabel: `${floorNum}F`, 
          floor: floor,
          floorClass: floor.floorClass,
          rowIndex: rowIndex++ 
        });
      });
    }
    
    // 4. 지하층 추가 (각 층별로)
    const basementFloors = floors.filter(f => f.levelType === '지하' || f.floorClass === '지하층');
    
    // 코어 정보를 제거한 cleanLabel 기준으로 중복 제거하고 정렬
    const uniqueBasementFloorsMap = new Map<string, typeof floors[0]>();
    
    basementFloors.forEach(floor => {
      // 코어 정보 제거 (예: "코어1-B1" -> "B1")
      let cleanLabel = floor.floorLabel.replace(/코어\d+-/, '');
      
      // 같은 cleanLabel이 이미 있으면 건너뛰기 (중복 제거)
      if (!uniqueBasementFloorsMap.has(cleanLabel)) {
        uniqueBasementFloorsMap.set(cleanLabel, floor);
      }
    });
    
    // B1이 위에 B2가 아래로 오도록 정렬 (숫자가 작은 게 먼저: B1 -> B2)
    const sortedBasementFloors = Array.from(uniqueBasementFloorsMap.entries())
      .sort(([labelA], [labelB]) => {
        const aMatch = labelA.match(/B(\d+)/i);
        const bMatch = labelB.match(/B(\d+)/i);
        if (aMatch && bMatch) {
          // 숫자가 작은 게 먼저 (B1이 위에, B2가 아래)
          return parseInt(aMatch[1], 10) - parseInt(bMatch[1], 10);
        }
        return 0;
      });
    
    sortedBasementFloors.forEach(([cleanLabel, floor]) => {
      rows.push({
        category: '지하층' as ProcessCategory,
        floorLabel: cleanLabel,
        floor: floor,
        floorClass: floor.floorClass,
        rowIndex: rowIndex++
      });
    });
    
    // 5. 기초 추가
    rows.push({
      category: '기초' as ProcessCategory,
      floorLabel: undefined,
      floor: undefined,
      floorClass: undefined,
      rowIndex: rowIndex++
    });
    
    // 6. 버림 추가
    rows.push({
      category: '버림' as ProcessCategory,
      floorLabel: undefined,
      floor: undefined,
      floorClass: undefined,
      rowIndex: rowIndex++
    });
    
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
          <h2 className="text-2xl font-bold text-slate-900 dark:text-white">동별 공정계획</h2>
        </div>
        <p className="text-slate-600 dark:text-slate-400">
          동별 주요정보와 구분별 공정일수를 한눈에 확인하고 관리합니다. 산정된 일수는 간트차트에서 활용됩니다.
        </p>
      </div>

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
                    {/* 호수, 펌프카 대수 정보 - 헤더 위에 표시 */}
                    {activeBuilding && (() => {
                      const building = activeBuilding;
                      const info = getBuildingInfo(building);
                      return (
                        <div className="px-4 py-3 bg-slate-50 dark:bg-slate-900 border-b-2 border-slate-200 dark:border-slate-800">
                          <div className="flex gap-6 text-sm items-center">
                            <div className="font-semibold text-slate-900 dark:text-white">
                              호수: <span className="font-normal">
                                {info.coreUnits && info.coreUnits.length > 0
                                  ? info.coreUnits.map((cu, idx) => `코어${cu.coreNumber} ${cu.units}호`).join(', ')
                                  : info.totalUnits}
                              </span>
                            </div>
                            <div className="font-semibold text-slate-900 dark:text-white flex items-center gap-2">
                              펌프카 최대 투입대수:
                              <Input
                                type="number"
                                min="0"
                                step="1"
                                value={building.meta?.pumpCarCount ?? ''}
                                onChange={async (e) => {
                                  const value = e.target.value === '' ? null : parseInt(e.target.value, 10);
                                  try {
                                    await updateBuilding(building.id, projectId, {
                                      meta: {
                                        ...building.meta,
                                        pumpCarCount: value,
                                      },
                                    });
                                    await loadBuildings();
                                  } catch (error) {
                                    toast.error('펌프카 대수 저장에 실패했습니다.');
                                  }
                                }}
                                onBlur={async (e) => {
                                  const value = e.target.value === '' ? null : Math.max(0, parseInt(e.target.value, 10) || 0);
                                  try {
                                    await updateBuilding(building.id, projectId, {
                                      meta: {
                                        ...building.meta,
                                        pumpCarCount: value,
                                      },
                                    });
                                    await loadBuildings();
                                  } catch (error) {
                                    toast.error('펌프카 대수 저장에 실패했습니다.');
                                  }
                                }}
                                className="w-20 h-8 text-sm [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:appearance-none [-moz-appearance:textfield]"
                                placeholder="0"
                              />
                            </div>
                          </div>
                        </div>
                      );
                    })()}
                    
                    <table className="w-full border-collapse text-sm table-fixed">
                    <colgroup>
                      {/* 구분 항목 */}<col style={{ width: '80px' }} />
                      {/* 층수 */}<col style={{ width: '120px' }} />
                      {/* 형틀 */}<col style={{ width: '80px' }} />
                      {/* 철근 */}<col style={{ width: '80px' }} />
                      {/* 콘크리트 */}<col style={{ width: '80px' }} />
                      {/* 일수 */}<col style={{ width: '90px' }} />
                      {/* 공정타입 */}<col style={{ width: '115px' }} />
                      {/* 세부공정 */}<col style={{ width: '80px' }} />
                      {/* 세부공정 상세 */}<col />
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
                        
                        return (
                          <Fragment key={building.id}>
                            {/* 공정 구분 섹션 - 물량입력표와 동일한 순서로 행 표시 */}
                            {processRows.map((row, rowIdx) => {
                              // 일반층인 경우 옥탑층의 표준공정을 사용
                              const isNormalFloor = row.floorClass === '일반층';
                              const effectiveCategory = isNormalFloor ? '옥탑층' : row.category;
                              
                              const processType = row.floorLabel && (row.category === '지하층' || row.category === '옥탑층' || isNormalFloor)
                                ? (isNormalFloor 
                                    ? getProcessTypeForFloor(plan, '옥탑층', row.floorLabel)
                                    : getProcessTypeForFloor(plan, row.category, row.floorLabel))
                                : plan?.processes[row.category]?.processType || DEFAULT_PROCESS_TYPES[row.category];
                              const module = getProcessModule(effectiveCategory, processType);
                              
                              // 일수 계산 - 세부공정의 순작업일 합계
                              let days = 0;
                              if (!module || !module.items || module.items.length === 0) {
                                // 모듈이 없으면 기존 방식 사용
                                if (row.category === '버림' || row.category === '기초') {
                                  days = plan?.processes[row.category]?.days || 0;
                                } else if (row.category === '지하층' && row.floorLabel) {
                                  days = calculateBasementFloorDays(building, row.category, processType, row.floorLabel);
                                } else if (row.category === '셋팅층' && row.floorLabel) {
                                  if (isNormalFloor) {
                                    days = calculatePhFloorDays(building, '옥탑층', processType, row.floorLabel);
                                  } else {
                                    days = calculateSettingFloorDays(building, row.category, processType, row.floorLabel);
                                  }
                                } else if (row.category === '기준층' && row.floorLabel) {
                                  // 기준층은 이제 개별 층으로 처리
                                  days = calculateStandardFloorDays(building, row.category, processType, row.floorLabel);
                                } else if (row.category === 'PH층' && row.floorLabel) {
                                  days = calculatePhFloorDays(building, row.category, processType, row.floorLabel);
                                } else if (row.category === '옥탑층' && row.floorLabel) {
                                  days = calculatePhFloorDays(building, row.category, processType, row.floorLabel);
                                }
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
                                        // 장비대수 계산 (펌프카 최대 투입대수 기준)
                                        const maxPumpCarCount = building.meta?.pumpCarCount || 2;
                                        const calculatedEquipmentCount = calculateEquipmentCount(quantity, item.equipmentCalculationBase, maxPumpCarCount);
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
                                // 셋팅층, 일반층, 지하층, PH층, 옥탑층, 기준층 - 각 층별로 해당 층의 항목만 계산
                                else if (row.floorLabel && (row.category === '셋팅층' || row.category === '지하층' || row.category === 'PH층' || row.category === '옥탑층' || row.category === '기준층' || isNormalFloor)) {
                                  // 해당 층의 항목만 필터링
                                  const floorItems = module.items.filter(item => {
                                    // 지하층의 경우 item.floorLabel과 row.floorLabel이 일치해야 함
                                    if (row.category === '지하층') {
                                      return item.floorLabel === row.floorLabel;
                                    }
                                    // PH층의 경우 floorLabel이 없으면 모든 항목 포함 (일반층처럼 처리)
                                    if (row.category === 'PH층') {
                                      return !item.floorLabel || item.floorLabel === row.floorLabel;
                                    }
                                    // 옥탑층의 경우 옥탑1, 옥탑2 형식 처리
                                    if (row.category === '옥탑층') {
                                      if (!item.floorLabel) return true;
                                      const itemMatch = item.floorLabel.match(/옥탑(\d+)/);
                                      const rowMatch = row.floorLabel.match(/옥탑(\d+)/);
                                      if (itemMatch && rowMatch) {
                                        return itemMatch[1] === rowMatch[1];
                                      }
                                      return item.floorLabel === row.floorLabel;
                                    }
                                    // 기준층의 경우 floorLabel이 "2F", "3F" 형식이므로 항목의 floorLabel과 일치하거나 없으면 포함
                                    if (row.category === '기준층') {
                                      return item.floorLabel === row.floorLabel || !item.floorLabel;
                                    }
                                    // 일반층은 PH층 로직 사용
                                    if (isNormalFloor) {
                                      return item.floorLabel === row.floorLabel || !item.floorLabel;
                                    }
                                    // 셋팅층의 경우 floorLabel이 "1F", "2F" 형식이므로 항목의 floorLabel과 일치하거나 없으면 포함
                                    if (row.category === '셋팅층') {
                                      return item.floorLabel === row.floorLabel || !item.floorLabel;
                                    }
                                    return true;
                                  });
                                  
                                  floorItems.forEach(item => {
                                    // 오버라이드된 순작업일 확인
                                    // 기준층인 경우: 현재 층의 오버라이드 값을 먼저 확인하고, 없으면 첫 번째 기준층의 오버라이드 값 확인
                                    let itemKey = `${row.category}-${row.floorLabel || ''}-${item.id}`;
                                    let firstStandardFloor: { floorLabel: string } | undefined;
                                    if (row.category === '기준층') {
                                      firstStandardFloor = processRows.find(r => r.category === '기준층' && r.floorLabel);
                                    }
                                    
                                    // 기준층인 경우: 현재 층의 오버라이드 값을 먼저 확인하고, 없으면 첫 번째 기준층의 오버라이드 값 확인
                                    let overriddenDays: number | undefined;
                                    if (row.category === '기준층') {
                                      // 먼저 현재 층의 오버라이드 값 확인
                                      const currentFloorKey = `기준층-${row.floorLabel}-${item.id}`;
                                      overriddenDays = plan?.itemDirectWorkDaysOverrides?.[currentFloorKey];
                                      
                                      // 현재 층에 오버라이드가 없으면 첫 번째 기준층의 오버라이드 값 확인
                                      if (overriddenDays === undefined && firstStandardFloor) {
                                        const firstStandardFloorKey = `기준층-${firstStandardFloor.floorLabel}-${item.id}`;
                                        overriddenDays = plan?.itemDirectWorkDaysOverrides?.[firstStandardFloorKey];
                                      }
                                    } else {
                                      overriddenDays = plan?.itemDirectWorkDaysOverrides?.[itemKey];
                                    }
                                    
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
                                        
                                        if (row.category === '지하층') {
                                          // 지하층는 floorLabel 그대로 사용 (B1, B2 등)
                                          quantity = getQuantityFromFloor(building, row.floorLabel, 
                                            col === 'B' ? 'gangForm' : col === 'C' ? 'alForm' : col === 'D' ? 'formwork' : col === 'E' ? 'stripClean' : col === 'F' ? 'rebar' : 'concrete',
                                            col === 'B' || col === 'C' || col === 'D' || col === 'E' ? 'areaM2' : col === 'F' ? 'ton' : 'volumeM3');
                                        } else if (row.category === '옥탑층') {
                                          // 옥탑층은 물량입력 데이터에서 직접 가져오기
                                          const ratio = refMatch[3] ? parseFloat(refMatch[3]) : 1;
                                          let field: 'gangForm' | 'alForm' | 'formwork' | 'stripClean' | 'rebar' | 'concrete' | null = null;
                                          let subField = '';
                                          switch (col) {
                                            case 'B': field = 'gangForm'; subField = 'areaM2'; break;
                                            case 'C': field = 'alForm'; subField = 'areaM2'; break;
                                            case 'D': field = 'formwork'; subField = 'areaM2'; break;
                                            case 'E': field = 'stripClean'; subField = 'areaM2'; break;
                                            case 'F': field = 'rebar'; subField = 'ton'; break;
                                            case 'G': field = 'concrete'; subField = 'volumeM3'; break;
                                          }
                                          if (field && row.floorLabel) {
                                            quantity = getQuantityFromFloor(building, row.floorLabel, field, subField) * ratio;
                                          }
                                        } else if (isNormalFloor) {
                                          // 일반층의 경우 1F, 2F 형식이므로 행 번호 조정
                                          const floorMatch = row.floorLabel.match(/(\d+)F/);
                                          if (floorMatch) {
                                            const floorNum = parseInt(floorMatch[1], 10);
                                            const targetRowNum = floorNum + 10;
                                            const newReference = `${col}${targetRowNum}${refMatch[3] ? `*${refMatch[3]}` : ''}`;
                                            quantity = getQuantityByReference(building, newReference);
                                          } else {
                                            quantity = getQuantityByReference(building, item.quantityReference);
                                          }
                                        } else if (row.category === '셋팅층') {
                                          // 셋팅층은 행 번호 조정 (1층 = 행 11, 2층 = 행 12, ...)
                                          const floorMatch = row.floorLabel.match(/(\d+)F/);
                                          if (floorMatch) {
                                            const floorNum = parseInt(floorMatch[1], 10);
                                            const targetRowNum = floorNum + 10;
                                            const newReference = `${col}${targetRowNum}${refMatch[3] ? `*${refMatch[3]}` : ''}`;
                                            quantity = getQuantityByReference(building, newReference);
                                          } else {
                                            quantity = getQuantityByReference(building, item.quantityReference);
                                          }
                                        } else if (row.category === '기준층') {
                                          // 기준층은 첫 번째 기준층의 수량을 사용하여 합계 계산 (모든 기준층 행에 공통 적용)
                                          const firstStandardFloor = processRows.find(r => r.category === '기준층' && r.floorLabel);
                                          const calculationFloorLabel = firstStandardFloor?.floorLabel || row.floorLabel;
                                          const floorMatch = calculationFloorLabel.match(/(\d+)F/);
                                          if (floorMatch) {
                                            const floorNum = parseInt(floorMatch[1], 10);
                                            const targetRowNum = floorNum + 10;
                                            const newReference = `${col}${targetRowNum}${refMatch[3] ? `*${refMatch[3]}` : ''}`;
                                            quantity = getQuantityByReference(building, newReference);
                                          } else {
                                            quantity = getQuantityByReference(building, item.quantityReference);
                                          }
                                        } else {
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
                                        // 장비대수 계산 (펌프카 최대 투입대수 기준)
                                        const maxPumpCarCount = building.meta?.pumpCarCount || 2;
                                        const calculatedEquipmentCount = calculateEquipmentCount(quantity, item.equipmentCalculationBase, maxPumpCarCount);
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
                                
                                // 세부공정이 있는 경우 항상 계산된 sumDirectDays 사용 (소수점 버림)
                                // 저장된 days 값은 무시하고 항상 실시간 계산된 합계를 표시
                                days = Math.floor(sumDirectDays);
                              }
                              
                              // 확장 상태 확인
                              const expandKey = row.floorLabel 
                                ? `${row.category}-${row.floorLabel}`
                                : row.category === '기준층'
                                  ? '기준층-세부공정'
                                  : row.category;
                              const isExpanded = isDetailExpanded.has(expandKey);
                              
                              // 구분 항목 표시 (왼쪽 열)
                              const getCategoryLabel = () => {
                                if (row.category === '버림' || row.category === '기초') {
                                  return row.category;
                                }
                                // 지하층인 경우 "지하층" 표시
                                if (row.category === '지하층') {
                                  return '지하층';
                                }
                                // 옥탑층인 경우 "옥탑층" 표시
                                if (row.category === '옥탑층') {
                                  return '옥탑층';
                                }
                                // 기준층인 경우 "기준층" 표시
                                if (row.category === '기준층') {
                                  return '기준층';
                                }
                                // 셋팅층 또는 일반층인 경우 층 분류 표시
                                if (row.floorClass === '셋팅층') {
                                  return '셋팅층';
                                }
                                if (row.floorClass === '일반층') {
                                  return '일반층';
                                }
                                return row.floorClass || '';
                              };
                              
                              // 층수 표시 (오른쪽 열)
                              const getFloorNumberLabel = () => {
                                // 버림, 기초는 층수 없음
                                if (row.category === '버림' || row.category === '기초') {
                                  return '';
                                }
                                // 기준층인 경우 개별 층 표시 (예: "2F", "3F")
                                if (row.category === '기준층' && row.floorLabel) {
                                  return row.floorLabel;
                                }
                                // 나머지는 floorLabel 표시 (B2, B1, 1F, 옥탑1 등)
                                return row.floorLabel || '';
                              };
                              
                              // 물량 데이터 가져오기
                              const getFormworkQuantity = () => {
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
                                // 형틀 = 갱폼 + 알폼 + 형틀
                                // 기준층 범위 형식인 경우 row.floor.id를 rangeFloorId로 전달하여 정확한 범위 찾기
                                const rangeFloorId = row.category === '기준층' && row.floor?.floorLabel?.includes('~') 
                                  ? row.floor.id 
                                  : undefined;
                                
                                // 옥탑층인 경우 원본 floorLabel 사용 (PH1, PH2, PH3 형식)
                                const quantityFloorLabel = (row.category === '옥탑층' || row.category === 'PH층') && row.floor
                                  ? row.floor.floorLabel.replace(/코어\d+-/, '') // 코어 정보 제거
                                  : row.floorLabel;
                                
                                // #region agent log
                                if (row.floorLabel === '13F' || quantityFloorLabel === '13F') {
                                  fetch('http://127.0.0.1:7242/ingest/a7e9fc51-dfaa-4483-8da9-69eb13479c9c',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'BuildingProcessPlanPage.tsx:getFormworkQuantity:13F:entry',message:'13F formwork quantity calculation',data:{category:row.category,floorLabel:row.floorLabel,quantityFloorLabel,rangeFloorId,floorId:row.floor?.id,floorLabelFromFloor:row.floor?.floorLabel},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'A'})}).catch(()=>{});
                                }
                                // #endregion
                                
                                const gangForm = getQuantityFromFloor(building, quantityFloorLabel, 'gangForm', 'areaM2', rangeFloorId);
                                const alForm = getQuantityFromFloor(building, quantityFloorLabel, 'alForm', 'areaM2', rangeFloorId);
                                const formwork = getQuantityFromFloor(building, quantityFloorLabel, 'formwork', 'areaM2', rangeFloorId);
                                const result = gangForm + alForm + formwork;
                                
                                // #region agent log
                                if (row.floorLabel === '13F' || quantityFloorLabel === '13F') {
                                  fetch('http://127.0.0.1:7242/ingest/a7e9fc51-dfaa-4483-8da9-69eb13479c9c',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'BuildingProcessPlanPage.tsx:getFormworkQuantity:13F:result',message:'13F formwork quantity result',data:{gangForm,alForm,formwork,result,isZero:result===0},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'B'})}).catch(()=>{});
                                }
                                // #endregion
                                
                                return result;
                              };
                              
                              const getRebarQuantity = () => {
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
                                // 기준층 범위 형식인 경우 row.floor.id를 rangeFloorId로 전달하여 정확한 범위 찾기
                                const rangeFloorId = row.category === '기준층' && row.floor?.floorLabel?.includes('~') 
                                  ? row.floor.id 
                                  : undefined;
                                
                                // 옥탑층인 경우 원본 floorLabel 사용 (PH1, PH2, PH3 형식)
                                const quantityFloorLabel = (row.category === '옥탑층' || row.category === 'PH층') && row.floor
                                  ? row.floor.floorLabel.replace(/코어\d+-/, '') // 코어 정보 제거
                                  : row.floorLabel;
                                
                                return getQuantityFromFloor(building, quantityFloorLabel, 'rebar', 'ton', rangeFloorId);
                              };
                              
                              const getConcreteQuantity = () => {
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
                                // 기준층 범위 형식인 경우 row.floor.id를 rangeFloorId로 전달하여 정확한 범위 찾기
                                const rangeFloorId = row.category === '기준층' && row.floor?.floorLabel?.includes('~') 
                                  ? row.floor.id 
                                  : undefined;
                                
                                // 옥탑층인 경우 원본 floorLabel 사용 (PH1, PH2, PH3 형식)
                                const quantityFloorLabel = (row.category === '옥탑층' || row.category === 'PH층') && row.floor
                                  ? row.floor.floorLabel.replace(/코어\d+-/, '') // 코어 정보 제거
                                  : row.floorLabel;
                                
                                return getQuantityFromFloor(building, quantityFloorLabel, 'concrete', 'volumeM3', rangeFloorId);
                              };
                              
                              return (
                                <tr 
                                  key={`process-${row.category}-${row.floorLabel || ''}-${row.rowIndex}`}
                                  className="border-b border-slate-200 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-900/50"
                                  style={{ height: '24px' }}
                                >
                                  {/* 첫 번째 열: 구분 항목 */}
                                  <td className="px-2 py-1 text-xs font-semibold text-slate-900 dark:text-white border-r border-slate-200 dark:border-slate-800 align-middle" style={{ height: '24px', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                                    <div className="text-center">{getCategoryLabel()}</div>
                                  </td>
                                  
                                  {/* 두 번째 열: 층수 */}
                                  <td className="px-2 py-1 text-xs font-semibold text-slate-900 dark:text-white border-r border-slate-200 dark:border-slate-800 align-middle" style={{ height: '24px', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                                    <div className="text-center font-normal">{getFloorNumberLabel()}</div>
                                  </td>
                                  
                                  {/* 세 번째 열: 형틀 */}
                                  <td className="px-1 py-1 text-center text-xs border-r border-slate-200 dark:border-slate-800 align-middle" style={{ height: '24px' }}>
                                    <div className="text-xs">
                                      {getFormworkQuantity() > 0 ? getFormworkQuantity().toFixed(2) : '0.00'}
                                    </div>
                                  </td>
                                  
                                  {/* 네 번째 열: 철근 */}
                                  <td className="px-1 py-1 text-center text-xs border-r border-slate-200 dark:border-slate-800 align-middle" style={{ height: '24px' }}>
                                    <div className="text-xs">
                                      {getRebarQuantity() > 0 ? getRebarQuantity().toFixed(2) : '0.00'}
                                    </div>
                                  </td>
                                  
                                  {/* 다섯 번째 열: 콘크리트 */}
                                  <td className="px-1 py-1 text-center text-xs border-r-2 border-slate-200 dark:border-slate-800 align-middle" style={{ height: '24px' }}>
                                    <div className="text-xs">
                                      {getConcreteQuantity() > 0 ? getConcreteQuantity().toFixed(2) : '0.00'}
                                    </div>
                                  </td>
                                  
                                  {/* 여섯 번째 열: 일수 */}
                                  <td className="px-1 py-1 text-center border-r border-slate-200 dark:border-slate-800 align-middle" style={{ height: '24px' }}>
                                    <div className="w-full px-1 py-0.5 text-xs text-center border border-slate-300 dark:border-slate-700 rounded bg-slate-100 dark:bg-slate-900 text-slate-900 dark:text-white">
                                      {days}
                                    </div>
                                  </td>
                                  
                                  {/* 일곱 번째 열: 셀렉트박스 */}
                                  <td className="px-1 py-1 border-r border-slate-200 dark:border-slate-800 align-middle" style={{ height: '24px' }}>
                                    <select
                                      value={processType}
                                      onChange={(e) => {
                                        // 일반층인 경우 옥탑층 카테고리로 저장
                                        const targetCategory = isNormalFloor ? '옥탑층' : row.category;
                                        handleProcessTypeChange(building.id, targetCategory, e.target.value as ProcessType, row.floorLabel);
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
                                          
                                          // 일반층인 경우 옥탑층 공정을 사용
                                          const isExpandedNormalFloor = expandedRow.floorClass === '일반층';
                                          const expandedEffectiveCategory = isExpandedNormalFloor ? '옥탑층' : expandedRow.category;
                                          
                                          const colProcessType = expandedRow.floorLabel && (expandedRow.category === '지하층' || expandedRow.category === 'PH층' || expandedRow.category === '옥탑층' || isExpandedNormalFloor)
                                            ? (isExpandedNormalFloor
                                                ? getProcessTypeForFloor(plan, '옥탑층', expandedRow.floorLabel)
                                                : getProcessTypeForFloor(plan, expandedRow.category, expandedRow.floorLabel))
                                            : plan?.processes[expandedRow.category]?.processType || DEFAULT_PROCESS_TYPES[expandedRow.category];
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
                                                    // 장비대수 계산 (펌프카 최대 투입대수 기준)
                                                    const maxPumpCarCount = building.meta?.pumpCarCount || 2;
                                                    const calculatedEquipmentCount = calculateEquipmentCount(quantity, item.equipmentCalculationBase, maxPumpCarCount);
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
                                            
                                            // 셋팅층, 일반층, 지하층, PH층, 옥탑층, 기준층 - 각 층별로 해당 층의 항목만 계산
                                            if (!expandedRow.floorLabel || 
                                                (expandedRow.category !== '셋팅층' && expandedRow.category !== '지하층' && expandedRow.category !== 'PH층' && expandedRow.category !== '기준층' && expandedRow.category !== '옥탑층' && !isExpandedNormalFloor)) {
                                              return 0;
                                            }
                                            
                                            let sumDirectDays = 0;
                                            
                                            // 해당 층의 항목만 필터링
                                            const floorItems = colModule.items.filter(item => {
                                              // 지하층의 경우 item.floorLabel과 expandedRow.floorLabel이 일치해야 함
                                              if (expandedRow.category === '지하층') {
                                                return item.floorLabel === expandedRow.floorLabel;
                                              }
                                              // PH층의 경우 floorLabel이 없으면 모든 항목 포함 (일반층처럼 처리)
                                              if (expandedRow.category === 'PH층') {
                                                return !item.floorLabel || item.floorLabel === expandedRow.floorLabel;
                                              }
                                              // 옥탑층의 경우 옥탑1, 옥탑2 형식 처리
                                              if (expandedRow.category === '옥탑층') {
                                                if (!item.floorLabel) return true;
                                                const itemMatch = item.floorLabel.match(/옥탑(\d+)/);
                                                const rowMatch = expandedRow.floorLabel.match(/옥탑(\d+)/);
                                                if (itemMatch && rowMatch) {
                                                  return itemMatch[1] === rowMatch[1];
                                                }
                                                return item.floorLabel === expandedRow.floorLabel;
                                              }
                                              // 일반층은 PH층 로직 사용
                                              if (isExpandedNormalFloor) {
                                                // 일반층의 경우 floorLabel이 "1F", "2F" 형식이므로 PH층 항목 중에서 매칭
                                                // PH층 항목의 floorLabel 형식 확인 필요
                                                return item.floorLabel === expandedRow.floorLabel || !item.floorLabel;
                                              }
                                              // 셋팅층의 경우 floorLabel이 "1F", "2F" 형식이므로 항목의 floorLabel과 일치하거나 없으면 포함
                                              if (expandedRow.category === '셋팅층') {
                                                return item.floorLabel === expandedRow.floorLabel || !item.floorLabel;
                                              }
                                              // 기준층의 경우 floorLabel이 "2F", "3F" 형식이므로 항목의 floorLabel과 일치하거나 없으면 포함
                                              if (expandedRow.category === '기준층') {
                                                return item.floorLabel === expandedRow.floorLabel || !item.floorLabel;
                                              }
                                              return true;
                                            });
                                            
                                            floorItems.forEach(item => {
                                              // 오버라이드된 순작업일 확인
                                              // 기준층인 경우 모든 기준층 행에 공통 적용되므로, 첫 번째 기준층 행의 floorLabel 사용
                                              let itemKey = `${expandedRow.category}-${expandedRow.floorLabel || ''}-${item.id}`;
                                              let firstStandardFloor: { floorLabel: string } | undefined;
                                              if (expandedRow.category === '기준층') {
                                                // 기준층인 경우 모든 기준층 행에 공통 적용된 오버라이드 사용
                                                firstStandardFloor = processRows.find(r => r.category === '기준층' && r.floorLabel);
                                                if (firstStandardFloor) {
                                                  itemKey = `기준층-${firstStandardFloor.floorLabel}-${item.id}`;
                                                }
                                              }
                                              
                                              // 기준층인 경우: 현재 층의 오버라이드 값을 먼저 확인하고, 없으면 첫 번째 기준층의 오버라이드 값 확인
                                              let overriddenDays: number | undefined;
                                              if (expandedRow.category === '기준층') {
                                                // 먼저 현재 층의 오버라이드 값 확인
                                                const currentFloorKey = `기준층-${expandedRow.floorLabel}-${item.id}`;
                                                overriddenDays = plan?.itemDirectWorkDaysOverrides?.[currentFloorKey];
                                                
                                                // 현재 층에 오버라이드가 없으면 첫 번째 기준층의 오버라이드 값 확인
                                                if (overriddenDays === undefined && firstStandardFloor) {
                                                  const firstStandardFloorKey = `기준층-${firstStandardFloor.floorLabel}-${item.id}`;
                                                  overriddenDays = plan?.itemDirectWorkDaysOverrides?.[firstStandardFloorKey];
                                                }
                                              } else {
                                                overriddenDays = plan?.itemDirectWorkDaysOverrides?.[itemKey];
                                              }
                                              
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
                                                  
                                                  if (expandedRow.category === '지하층') {
                                                    // 지하층는 floorLabel 그대로 사용 (B1, B2 등)
                                                    quantity = getQuantityFromFloor(building, expandedRow.floorLabel, 
                                                      col === 'B' ? 'gangForm' : col === 'C' ? 'alForm' : col === 'D' ? 'formwork' : col === 'E' ? 'stripClean' : col === 'F' ? 'rebar' : 'concrete',
                                                      col === 'B' || col === 'C' || col === 'D' || col === 'E' ? 'areaM2' : col === 'F' ? 'ton' : 'volumeM3');
                                                  } else if (expandedRow.category === '옥탑층') {
                                                    // 옥탑층은 물량입력 데이터에서 직접 가져오기
                                                    const ratio = refMatch[3] ? parseFloat(refMatch[3]) : 1;
                                                    let field: 'gangForm' | 'alForm' | 'formwork' | 'stripClean' | 'rebar' | 'concrete' | null = null;
                                                    let subField = '';
                                                    switch (col) {
                                                      case 'B': field = 'gangForm'; subField = 'areaM2'; break;
                                                      case 'C': field = 'alForm'; subField = 'areaM2'; break;
                                                      case 'D': field = 'formwork'; subField = 'areaM2'; break;
                                                      case 'E': field = 'stripClean'; subField = 'areaM2'; break;
                                                      case 'F': field = 'rebar'; subField = 'ton'; break;
                                                      case 'G': field = 'concrete'; subField = 'volumeM3'; break;
                                                    }
                                                    if (field && expandedRow.floorLabel) {
                                                      quantity = getQuantityFromFloor(building, expandedRow.floorLabel, field, subField) * ratio;
                                                    }
                                                  } else if (isExpandedNormalFloor) {
                                                    // 일반층의 경우 1F, 2F 형식이므로 행 번호 조정
                                                    const floorMatch = expandedRow.floorLabel.match(/(\d+)F/);
                                                    if (floorMatch) {
                                                      const floorNum = parseInt(floorMatch[1], 10);
                                                      const targetRowNum = floorNum + 10;
                                                      const newReference = `${col}${targetRowNum}${refMatch[3] ? `*${refMatch[3]}` : ''}`;
                                                      quantity = getQuantityByReference(building, newReference);
                                                    } else {
                                                      quantity = getQuantityByReference(building, item.quantityReference);
                                                    }
                                                  } else if (expandedRow.category === '셋팅층') {
                                                    // 셋팅층은 행 번호 조정 (1층 = 행 11, 2층 = 행 12, ...)
                                                    const floorMatch = expandedRow.floorLabel.match(/(\d+)F/);
                                                    if (floorMatch) {
                                                      const floorNum = parseInt(floorMatch[1], 10);
                                                      const targetRowNum = floorNum + 10;
                                                      const newReference = `${col}${targetRowNum}${refMatch[3] ? `*${refMatch[3]}` : ''}`;
                                                      quantity = getQuantityByReference(building, newReference);
                                                    } else {
                                                      quantity = getQuantityByReference(building, item.quantityReference);
                                                    }
                                                  } else if (expandedRow.category === '기준층') {
                                                    // 기준층은 첫 번째 기준층의 수량을 사용하여 합계 계산 (모든 기준층 행에 공통 적용)
                                                    const firstStandardFloor = processRows.find(r => r.category === '기준층' && r.floorLabel);
                                                    const calculationFloorLabel = firstStandardFloor?.floorLabel || expandedRow.floorLabel;
                                                    const floorMatch = calculationFloorLabel.match(/(\d+)F/);
                                                    if (floorMatch) {
                                                      const floorNum = parseInt(floorMatch[1], 10);
                                                      const targetRowNum = floorNum + 10;
                                                      const newReference = `${col}${targetRowNum}${refMatch[3] ? `*${refMatch[3]}` : ''}`;
                                                      quantity = getQuantityByReference(building, newReference);
                                                    } else {
                                                      quantity = getQuantityByReference(building, item.quantityReference);
                                                    }
                                                  } else {
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
                                                  // 장비대수 계산 (펌프카 최대 투입대수 기준)
                                                  const maxPumpCarCount = building.meta?.pumpCarCount || 2;
                                                  const calculatedEquipmentCount = calculateEquipmentCount(quantity, item.equipmentCalculationBase, maxPumpCarCount);
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
                                                  : expandedRow.category === '지하층'
                                                    ? `지하층 ${expandedRow.floorLabel}층${directWorkDaysSum > 0 ? ` (순작업일 합계 ${directWorkDaysSum}일)` : ''}`
                                                    : (expandedRow.category === '옥탑층' || expandedRow.category === 'PH층')
                                                      ? (() => {
                                                          // PH 형식을 옥탑 형식으로 변환
                                                          let displayLabel = expandedRow.floorLabel || '';
                                                          if (displayLabel.match(/^PH\d+$/i)) {
                                                            const phMatch = displayLabel.match(/PH(\d+)/i);
                                                            if (phMatch) {
                                                              displayLabel = `옥탑${phMatch[1]}`;
                                                            }
                                                          }
                                                          return `옥탑층 ${displayLabel}층${directWorkDaysSum > 0 ? ` (순작업일 합계 ${directWorkDaysSum}일)` : ''}`;
                                                        })()
                                                    : expandedRow.category === '셋팅층'
                                                      ? isExpandedNormalFloor
                                                        ? `일반층 ${expandedRow.floorLabel}${directWorkDaysSum > 0 ? ` (순작업일 합계 ${directWorkDaysSum}일)` : ''}`
                                                        : `셋팅층 ${expandedRow.floorLabel}${directWorkDaysSum > 0 ? ` (순작업일 합계 ${directWorkDaysSum}일)` : ''}`
                                                      : expandedRow.category === '기준층'
                                                        ? `기준층 ${expandedRow.floorLabel}${directWorkDaysSum > 0 ? ` (순작업일 합계 ${directWorkDaysSum}일)` : ''}`
                                                        : `옥탑층 ${expandedRow.floorLabel}층${directWorkDaysSum > 0 ? ` (순작업일 합계 ${directWorkDaysSum}일)` : ''}`}
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
                                                      // PH층의 경우 floorLabel이 없으면 모든 항목 포함
                                                      if (expandedRow.category === 'PH층') {
                                                        return !item.floorLabel || item.floorLabel === expandedRow.floorLabel;
                                                      }
                                                      // 옥탑층의 경우 옥탑1, 옥탑2 형식 처리
                                                      if (expandedRow.category === '옥탑층') {
                                                        if (!item.floorLabel) return true;
                                                        const itemMatch = item.floorLabel.match(/옥탑(\d+)/);
                                                        const rowMatch = expandedRow.floorLabel.match(/옥탑(\d+)/);
                                                        if (itemMatch && rowMatch) {
                                                          return itemMatch[1] === rowMatch[1];
                                                        }
                                                        return item.floorLabel === expandedRow.floorLabel;
                                                      }
                                                      // 일반층은 PH층 로직 사용
                                                      if (isExpandedNormalFloor) {
                                                        return item.floorLabel === expandedRow.floorLabel || !item.floorLabel;
                                                      }
                                                      // 셋팅층의 경우 floorLabel이 "1F", "2F" 형식이므로 항목의 floorLabel과 일치하거나 없으면 포함
                                                      if (expandedRow.category === '셋팅층') {
                                                        return item.floorLabel === expandedRow.floorLabel || !item.floorLabel;
                                                      }
                                                      // 버림, 기초는 floorLabel 없이 모든 항목 포함
                                                      if (expandedRow.floorLabel && item.floorLabel) {
                                                        return item.floorLabel === expandedRow.floorLabel;
                                                      }
                                                      const hasDirectDays = item.directWorkDays !== undefined && item.directWorkDays > 0;
                                                      const hasIndirectDays = item.indirectDays > 0;
                                                      return hasDirectDays || hasIndirectDays;
                                                    })
                                                    .map((item) => {
                                                      // 수량 가져오기 - 물량입력 데이터(building.floorTrades)에서 가져옴
                                                      let quantity = 0;
                                                      if (item.quantityReference) {
                                                        if (expandedRow.category === '셋팅층' && expandedRow.floorLabel) {
                                                          // 일반층인 경우 - 물량입력 데이터에서 직접 가져오기
                                                          if (isExpandedNormalFloor) {
                                                            // 일반층은 지상층이므로 행 번호 매핑: 행 11 = 1층, 행 12 = 2층
                                                            const refMatch = item.quantityReference.match(/^([A-Z])(\d+)(?:\*([\d.]+))?$/);
                                                            if (refMatch) {
                                                              const [, colLetter] = refMatch;
                                                              const ratio = refMatch[3] ? parseFloat(refMatch[3]) : 1;
                                                              const floorMatch = expandedRow.floorLabel.match(/(\d+)F/);
                                                              if (floorMatch) {
                                                                const floorNum = parseInt(floorMatch[1], 10);
                                                                // 일반층은 지상층 행 번호 매핑 사용 (행 11 = 1층, 행 12 = 2층 등)
                                                                const targetRowNum = floorNum + 10;
                                                                const newReference = `${colLetter}${targetRowNum}${refMatch[3] ? `*${refMatch[3]}` : ''}`;
                                                                quantity = getQuantityByReference(building, newReference);
                                                              }
                                                            }
                                                          } else {
                                                            // 셋팅층인 경우 - 물량입력 데이터에서 가져오기
                                                            const refMatch = item.quantityReference.match(/^([A-Z])(\d+)(?:\*([\d.]+))?$/);
                                                            if (refMatch) {
                                                              const [, colLetter] = refMatch;
                                                              const floorMatch = expandedRow.floorLabel.match(/(\d+)F/);
                                                              if (floorMatch) {
                                                                const floorNum = parseInt(floorMatch[1], 10);
                                                                // 행 11 = 1층, 행 12 = 2층 등
                                                                const targetRowNum = floorNum + 10;
                                                                const newReference = `${colLetter}${targetRowNum}${refMatch[3] ? `*${refMatch[3]}` : ''}`;
                                                                quantity = getQuantityByReference(building, newReference);
                                                              }
                                                            }
                                                          }
                                                        } else if (expandedRow.category === '지하층' && expandedRow.floorLabel) {
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
                                                        } else if ((expandedRow.category === 'PH층' || expandedRow.category === '옥탑층') && expandedRow.floorLabel) {
                                                          // PH층/옥탑층 - 물량입력 데이터에서 직접 가져오기
                                                          const refMatch = item.quantityReference.match(/^([A-Z])(\d+)(?:\*([\d.]+))?$/);
                                                          if (refMatch) {
                                                            const [, colLetter] = refMatch;
                                                            const ratio = refMatch[3] ? parseFloat(refMatch[3]) : 1;
                                                            // 옥탑층은 getQuantityFromFloor를 사용하여 직접 가져오기
                                                            let field: 'gangForm' | 'alForm' | 'formwork' | 'stripClean' | 'rebar' | 'concrete' | null = null;
                                                            let subField = '';
                                                            switch (colLetter) {
                                                              case 'B': field = 'gangForm'; subField = 'areaM2'; break;
                                                              case 'C': field = 'alForm'; subField = 'areaM2'; break;
                                                              case 'D': field = 'formwork'; subField = 'areaM2'; break;
                                                              case 'E': field = 'stripClean'; subField = 'areaM2'; break;
                                                              case 'F': field = 'rebar'; subField = 'ton'; break;
                                                              case 'G': field = 'concrete'; subField = 'volumeM3'; break;
                                                            }
                                                            if (field) {
                                                              quantity = getQuantityFromFloor(building, expandedRow.floorLabel, field, subField) * ratio;
                                                            }
                                                          }
                                                        } else if (expandedRow.category === '기준층' && expandedRow.floorLabel) {
                                                          // 기준층 - 물량입력 데이터에서 직접 가져오기
                                                          const refMatch = item.quantityReference.match(/^([A-Z])(\d+)(?:\*([\d.]+))?$/);
                                                          if (refMatch) {
                                                            const [, colLetter] = refMatch;
                                                            const ratio = refMatch[3] ? parseFloat(refMatch[3]) : 1;
                                                            // 기준층은 getQuantityFromFloor를 사용하여 직접 가져오기
                                                            const rangeFloorId = expandedRow.floor?.floorLabel?.includes('~') 
                                                              ? expandedRow.floor.id 
                                                              : undefined;
                                                            let field: 'gangForm' | 'alForm' | 'formwork' | 'stripClean' | 'rebar' | 'concrete' | null = null;
                                                            let subField = '';
                                                            switch (colLetter) {
                                                              case 'B': field = 'gangForm'; subField = 'areaM2'; break;
                                                              case 'C': field = 'alForm'; subField = 'areaM2'; break;
                                                              case 'D': field = 'formwork'; subField = 'areaM2'; break;
                                                              case 'E': field = 'stripClean'; subField = 'areaM2'; break;
                                                              case 'F': field = 'rebar'; subField = 'ton'; break;
                                                              case 'G': field = 'concrete'; subField = 'volumeM3'; break;
                                                            }
                                                            if (field) {
                                                              quantity = getQuantityFromFloor(building, expandedRow.floorLabel, field, subField, rangeFloorId) * ratio;
                                                            }
                                                          }
                                                        } else if (expandedRow.category === '옥탑층' && expandedRow.floorLabel) {
                                                          // 옥탑층 - 물량입력 데이터에서 직접 가져오기
                                                          const refMatch = item.quantityReference.match(/^([A-Z])(\d+)(?:\*([\d.]+))?$/);
                                                          if (refMatch) {
                                                            const [, colLetter] = refMatch;
                                                            const ratio = refMatch[3] ? parseFloat(refMatch[3]) : 1;
                                                            // 옥탑층은 getQuantityFromFloor를 사용하여 직접 가져오기
                                                            let field: 'gangForm' | 'alForm' | 'formwork' | 'stripClean' | 'rebar' | 'concrete' | null = null;
                                                            let subField = '';
                                                            switch (colLetter) {
                                                              case 'B': field = 'gangForm'; subField = 'areaM2'; break;
                                                              case 'C': field = 'alForm'; subField = 'areaM2'; break;
                                                              case 'D': field = 'formwork'; subField = 'areaM2'; break;
                                                              case 'E': field = 'stripClean'; subField = 'areaM2'; break;
                                                              case 'F': field = 'rebar'; subField = 'ton'; break;
                                                              case 'G': field = 'concrete'; subField = 'volumeM3'; break;
                                                            }
                                                            if (field) {
                                                              quantity = getQuantityFromFloor(building, expandedRow.floorLabel, field, subField) * ratio;
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
                                                        // 장비대수 계산 (펌프카 최대 투입대수 기준)
                                                        const maxPumpCarCount = building.meta?.pumpCarCount || 2;
                                                        const calculatedEquipmentCount = calculateEquipmentCount(quantity, item.equipmentCalculationBase, maxPumpCarCount);
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
                                                          // 장비대수 계산 (펌프카 최대 투입대수 기준)
                                                          const maxPumpCarCount = building.meta?.pumpCarCount || 2;
                                                          const calculatedEquipmentCount = calculateEquipmentCount(quantity, item.equipmentCalculationBase, maxPumpCarCount);
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
                                                        
                                                        const updatedOverrides = {
                                                          ...(currentPlan.itemDirectWorkDaysOverrides || {}),
                                                        };
                                                        
                                                        // 기준층인 경우 모든 기준층 행에 공통 적용
                                                        if (expandedRow.category === '기준층') {
                                                          // processRows에서 모든 기준층 행 찾기
                                                          processRows.forEach(row => {
                                                            if (row.category === '기준층' && row.floorLabel) {
                                                              const standardFloorKey = `기준층-${row.floorLabel}-${item.id}`;
                                                              updatedOverrides[standardFloorKey] = newValue !== null && newValue > 0 ? newValue : undefined;
                                                            }
                                                          });
                                                        } else {
                                                          // 기준층이 아닌 경우 기존 로직
                                                          updatedOverrides[itemDirectWorkDaysKey] = newValue !== null && newValue > 0 ? newValue : undefined;
                                                        }
                                                        
                                                        // undefined 값 제거
                                                        Object.keys(updatedOverrides).forEach(key => {
                                                          if (updatedOverrides[key] === undefined) {
                                                            delete updatedOverrides[key];
                                                          }
                                                        });
                                                        
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
                                                                // 장비대수 계산 (펌프카 최대 투입대수 기준)
                                                                const maxPumpCarCount = building.meta?.pumpCarCount || 2;
                                                                const calculatedEquipmentCount = calculateEquipmentCount(quantity, moduleItem.equipmentCalculationBase, maxPumpCarCount);
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
                                                          // 층별 계산
                                                          // 기준층인 경우 모든 기준층 행에 공통 적용되므로, 첫 번째 기준층 행의 floorLabel 사용하여 수량 계산
                                                          const firstStandardFloor = processRows.find(r => r.category === '기준층' && r.floorLabel);
                                                          const targetFloorLabel = expandedRow.category === '기준층' 
                                                            ? (firstStandardFloor?.floorLabel || expandedRow.floorLabel)
                                                            : expandedRow.floorLabel;
                                                          
                                                          // 기준층인 경우 합계 계산 시 첫 번째 기준층의 수량을 사용
                                                          const calculationFloorLabel = expandedRow.category === '기준층' && firstStandardFloor
                                                            ? firstStandardFloor.floorLabel
                                                            : expandedRow.floorLabel;
                                                          
                                                          const floorItems = colModule.items.filter(moduleItem => {
                                                            if (expandedRow.category === '지하층') {
                                                              return moduleItem.floorLabel === expandedRow.floorLabel;
                                                            }
                                                            if (expandedRow.category === 'PH층') {
                                                              return !moduleItem.floorLabel || moduleItem.floorLabel === expandedRow.floorLabel;
                                                            }
                                                            if (isExpandedNormalFloor) {
                                                              return moduleItem.floorLabel === expandedRow.floorLabel || !moduleItem.floorLabel;
                                                            }
                                                            if (expandedRow.category === '셋팅층') {
                                                              return moduleItem.floorLabel === expandedRow.floorLabel || !moduleItem.floorLabel;
                                                            }
                                                            if (expandedRow.category === '기준층') {
                                                              // 기준층은 모든 기준층 행에 공통 적용되므로 floorLabel 조건 없이 모든 항목 포함
                                                              return !moduleItem.floorLabel || true;
                                                            }
                                                            if (expandedRow.category === '옥탑층') {
                                                              if (!moduleItem.floorLabel) return true;
                                                              const itemMatch = moduleItem.floorLabel.match(/옥탑(\d+)/);
                                                              const rowMatch = expandedRow.floorLabel.match(/옥탑(\d+)/);
                                                              if (itemMatch && rowMatch) {
                                                                return itemMatch[1] === rowMatch[1];
                                                              }
                                                              return moduleItem.floorLabel === expandedRow.floorLabel;
                                                            }
                                                            return true;
                                                          });
                                                          
                                                          floorItems.forEach(moduleItem => {
                                                            // 기준층인 경우: 현재 층의 오버라이드 값을 먼저 확인하고, 없으면 첫 번째 기준층의 오버라이드 값 확인
                                                            let overriddenDays: number | undefined;
                                                            if (expandedRow.category === '기준층') {
                                                              // 먼저 현재 층의 오버라이드 값 확인
                                                              const currentFloorKey = `기준층-${expandedRow.floorLabel}-${moduleItem.id}`;
                                                              overriddenDays = updatedOverrides[currentFloorKey];
                                                              
                                                              // 현재 층에 오버라이드가 없으면 첫 번째 기준층의 오버라이드 값 확인
                                                              if (overriddenDays === undefined) {
                                                                const firstStandardFloorKey = `기준층-${targetFloorLabel}-${moduleItem.id}`;
                                                                overriddenDays = updatedOverrides[firstStandardFloorKey];
                                                              }
                                                            } else {
                                                              const moduleItemKey = `${expandedRow.category}-${expandedRow.floorLabel || ''}-${moduleItem.id}`;
                                                              overriddenDays = updatedOverrides[moduleItemKey];
                                                            }
                                                            
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
                                                                
                                                                if (expandedRow.category === '지하층') {
                                                                  quantity = getQuantityFromFloor(building, expandedRow.floorLabel, 
                                                                    col === 'B' ? 'gangForm' : col === 'C' ? 'alForm' : col === 'D' ? 'formwork' : col === 'E' ? 'stripClean' : col === 'F' ? 'rebar' : 'concrete',
                                                                    col === 'B' || col === 'C' || col === 'D' || col === 'E' ? 'areaM2' : col === 'F' ? 'ton' : 'volumeM3');
                                                                } else if (expandedRow.category === '옥탑층' || isExpandedNormalFloor) {
                                                                  const phMatch = expandedRow.floorLabel.match(/옥탑(\d+)/);
                                                                  if (phMatch) {
                                                                    const phNum = parseInt(phMatch[1], 10);
                                                                    const targetRowNum = 25 + phNum;
                                                                    const newReference = `${col}${targetRowNum}${refMatch[3] ? `*${refMatch[3]}` : ''}`;
                                                                    quantity = getQuantityByReference(building, newReference);
                                                                  } else {
                                                                    const floorMatch = expandedRow.floorLabel.match(/(\d+)F/);
                                                                    if (floorMatch) {
                                                                      const floorNum = parseInt(floorMatch[1], 10);
                                                                      const targetRowNum = floorNum + 10;
                                                                      const newReference = `${col}${targetRowNum}${refMatch[3] ? `*${refMatch[3]}` : ''}`;
                                                                      quantity = getQuantityByReference(building, newReference);
                                                                    } else {
                                                                      quantity = getQuantityByReference(building, moduleItem.quantityReference);
                                                                    }
                                                                  }
                                                                } else if (expandedRow.category === '셋팅층') {
                                                                  const floorMatch = expandedRow.floorLabel.match(/(\d+)F/);
                                                                  if (floorMatch) {
                                                                    const floorNum = parseInt(floorMatch[1], 10);
                                                                    const targetRowNum = floorNum + 10;
                                                                    const newReference = `${col}${targetRowNum}${refMatch[3] ? `*${refMatch[3]}` : ''}`;
                                                                    quantity = getQuantityByReference(building, newReference);
                                                                  } else {
                                                                    quantity = getQuantityByReference(building, moduleItem.quantityReference);
                                                                  }
                                                                } else if (expandedRow.category === '기준층') {
                                                                  // 기준층인 경우 첫 번째 기준층의 수량을 사용하여 합계 계산
                                                                  const floorMatch = calculationFloorLabel.match(/(\d+)F/);
                                                                  if (floorMatch) {
                                                                    const floorNum = parseInt(floorMatch[1], 10);
                                                                    const targetRowNum = floorNum + 10;
                                                                    const newReference = `${col}${targetRowNum}${refMatch[3] ? `*${refMatch[3]}` : ''}`;
                                                                    quantity = getQuantityByReference(building, newReference);
                                                                  } else {
                                                                    quantity = getQuantityByReference(building, moduleItem.quantityReference);
                                                                  }
                                                                } else {
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
                                                                // 장비대수 계산 (펌프카 최대 투입대수 기준)
                                                                const maxPumpCarCount = building.meta?.pumpCarCount || 2;
                                                                const calculatedEquipmentCount = calculateEquipmentCount(quantity, moduleItem.equipmentCalculationBase, maxPumpCarCount);
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
                                                        
                                                        // 기준층인 경우 순작업일 합계에 따라 공정타입 자동 변경
                                                        const previousProcessType = currentPlan.processes[expandedRow.category]?.processType || DEFAULT_PROCESS_TYPES[expandedRow.category];
                                                        const previousDays = currentPlan.processes[expandedRow.category]?.days || 0;
                                                        let newProcessType = previousProcessType;
                                                        if (expandedRow.category === '기준층') {
                                                          if (sumDirectDays === 5) {
                                                            newProcessType = '5일 사이클';
                                                          } else if (sumDirectDays === 6) {
                                                            newProcessType = '6일 사이클';
                                                          } else if (sumDirectDays === 7) {
                                                            newProcessType = '7일 사이클';
                                                          } else if (sumDirectDays === 8) {
                                                            newProcessType = '8일 사이클';
                                                          } else {
                                                            // 5, 6, 7, 8일이 아닌 경우 기본값으로 리셋
                                                            newProcessType = DEFAULT_PROCESS_TYPES[expandedRow.category];
                                                          }
                                                        }
                                                        
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
                                                          console.error('Failed to save direct work days:', error);
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
                                                              value={displayDirectWorkDays > 0 ? Math.round(displayDirectWorkDays) : ''}
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
                                                                  // 장비대수 계산 (펌프카 최대 투입대수 기준)
                                                                  const maxPumpCarCount = building.meta?.pumpCarCount || 2;
                                                                  const equipmentCount = calculateEquipmentCount(quantity, item.equipmentCalculationBase!, maxPumpCarCount);
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
