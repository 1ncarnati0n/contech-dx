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
const PROCESS_CATEGORIES: ProcessCategory[] = ['버림', '기초', '지하골조', '셋팅층', '기준층', 'PH층'];

// 공정 타입 옵션 (구분별로 다름)
const PROCESS_TYPE_OPTIONS: Record<ProcessCategory, ProcessType[]> = {
  '버림': ['표준공정'],
  '기초': ['표준공정'],
  '지하골조': ['표준공정'],
  '셋팅층': ['표준공정'],
  '기준층': ['5일 사이클', '6일 사이클', '7일 사이클', '8일 사이클'],
  'PH층': ['표준공정'],
};

// 기본 공정 타입
const DEFAULT_PROCESS_TYPES: Record<ProcessCategory, ProcessType> = {
  '버림': '표준공정',
  '기초': '표준공정',
  '지하골조': '표준공정',
  '셋팅층': '표준공정',
  '기준층': '6일 사이클',
  'PH층': '표준공정',
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

  // PH층 목록 추출 (각 동별로) - 동기본정보 페이지의 층설정 데이터 기반
  const getPhFloors = useMemo(() => {
    const map = new Map<string, Floor[]>();
    buildings.forEach(building => {
      // 동기본정보 페이지의 층설정 데이터(building.floors)에서 PH층 추출
      const phFloors = building.floors
        .filter(f => f.floorClass === 'PH층')
        .map(floor => {
          // 코어 정보 제거 (예: "코어1-PH1층" -> "PH1층")
          let cleanLabel = floor.floorLabel.replace(/코어\d+-/, '');
          return {
            ...floor,
            floorLabel: cleanLabel,
          };
        })
        .sort((a, b) => a.floorNumber - b.floorNumber); // PH1, PH2 순서
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
                  days: sumDays,
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
          const existingPlan = prevPlans.get(building.id);
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

    // 지하골조나 PH층의 경우 층별로 저장
    if ((category === '지하골조' || category === 'PH층') && floorLabel) {
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
            days: sumDays,
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
    
    // 지하골조나 PH층의 경우 층별 processType 확인
    if ((category === '지하골조' || category === 'PH층') && categoryProcess.floors?.[floorLabel]) {
      return categoryProcess.floors[floorLabel].processType;
    }
    
    // 기본 processType 반환
    return categoryProcess.processType || DEFAULT_PROCESS_TYPES[category];
  };

  // 합계일수 계산 - 모든 공정 카테고리의 일수 합계
  const calculateTotalDays = (processes: BuildingProcessPlan['processes'], building?: Building): number => {
    let total = 0;
    // 모든 공정 카테고리의 일수를 합산
    PROCESS_CATEGORIES.forEach(category => {
      if (category === '지하골조' && building) {
        // 지하골조는 각 층별 일수를 합산
        const basementFloors = getBasementFloors.get(building.id) || [];
        basementFloors.forEach(floor => {
          const floorProcessType = processes[category]?.floors?.[floor.floorLabel]?.processType || processes[category]?.processType || DEFAULT_PROCESS_TYPES[category];
          const floorDays = calculateBasementFloorDays(building, category, floorProcessType, floor.floorLabel);
          total += floorDays;
        });
      } else if (category === 'PH층' && building) {
        // PH층은 각 층별 일수를 합산
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

  // 지하골조 각 층별 일수 계산
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
    
    return sumDays;
  };

  // PH층 각 층별 일수 계산
  const calculatePhFloorDays = (
    building: Building,
    category: ProcessCategory,
    processType: ProcessType,
    floorLabel: string
  ): number => {
    const module = getProcessModule(category, processType);
    if (!module || !module.items.length) return 0;

    let sumDays = 0;
    
    // PH층의 경우 floorLabel로 필터링하거나, 모든 항목을 사용하되 수량 참조를 층별로 조정
    const floorItems = module.items.filter(item => {
      if (item.floorLabel) {
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
          // 행 26 = PH1층, 행 27 = PH2층
          const phMatch = floorLabel.match(/PH(\d+)/);
          if (phMatch) {
            const phNum = parseInt(phMatch[1], 10);
            // PH1 = 행 26, PH2 = 행 27
            const targetRowNum = 25 + phNum; // PH1 -> 26, PH2 -> 27
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
        if (quantity > 0) {
          const totalWorkers = calculateTotalWorkers(quantity, item.dailyProductivity);
          const dailyInputWorkers = calculateDailyInputWorkers(totalWorkers, item.equipmentCount);
          directWorkDays = calculateWorkDaysWithRounding(quantity, item.dailyProductivity, dailyInputWorkers);
          sumDays += directWorkDays;
        }
      }
    });
    
    return sumDays;
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
        if (quantity > 0) {
          const totalWorkers = calculateTotalWorkers(quantity, item.dailyProductivity);
          const dailyInputWorkers = calculateDailyInputWorkers(totalWorkers, item.equipmentCount);
          directWorkDays = calculateWorkDaysWithRounding(quantity, item.dailyProductivity, dailyInputWorkers);
          sumDays += directWorkDays;
        }
      }
    });
    
    return sumDays;
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
        if (quantity > 0) {
          const totalWorkers = calculateTotalWorkers(quantity, item.dailyProductivity);
          const dailyInputWorkers = calculateDailyInputWorkers(totalWorkers, item.equipmentCount);
          directWorkDays = calculateWorkDaysWithRounding(quantity, item.dailyProductivity, dailyInputWorkers);
          sumDays += directWorkDays;
        }
      }
    });
    
    return sumDays;
  };

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

  // 물량입력표와 동일한 순서로 행 생성 (버림, 기초, 지하층, 지상층, PH층)
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
    
    // 1. 버림, 기초 행 추가
    rows.push({ category: '버림', rowIndex: rowIndex++ });
    rows.push({ category: '기초', rowIndex: rowIndex++ });
    
    // 2. 지하층 추가
    const basementFloors = floors.filter(f => f.levelType === '지하');
    basementFloors.forEach(floor => {
      rows.push({ 
        category: '지하골조', 
        floorLabel: floor.floorLabel, 
        floor, 
        floorClass: floor.floorClass,
        rowIndex: rowIndex++ 
      });
    });
    
    // 3. 지상층 추가 (셋팅층은 개별 행, 기준층은 하나의 행으로 합치기)
    if (coreCount > 1 && coreGroundFloors && coreGroundFloors.length > 0) {
      // 코어1의 최대 층수
      const core1MaxFloor = coreGroundFloors[0] || 0;
      
      // 셋팅층 및 일반층 추가
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
          rows.push({ 
            category: '셋팅층' as ProcessCategory, 
            floorLabel: `${i}F`, 
            floor: foundFloor,
            floorClass: foundFloor.floorClass,
            rowIndex: rowIndex++ 
          });
        }
      }
      
      // 기준층 찾기 (범위 형식)
      const standardRangeFloor = floors.find(f => 
        f.floorClass === '기준층' && 
        f.floorLabel.includes('~') && 
        (f.floorLabel.includes('코어1-') || !f.floorLabel.includes('코어'))
      );
      
      if (standardRangeFloor) {
        // 범위 추출 (예: "코어1-2~14F 기준층" -> "2~14F")
        const rangeMatch = standardRangeFloor.floorLabel.match(/(\d+)~(\d+)F/);
        if (rangeMatch) {
          const startFloor = parseInt(rangeMatch[1], 10);
          const endFloor = parseInt(rangeMatch[2], 10);
          rows.push({
            category: '기준층' as ProcessCategory,
            floorLabel: `${startFloor}~${endFloor}F`,
            floor: standardRangeFloor,
            floorClass: '기준층',
            rowIndex: rowIndex++
          });
        }
      }
    } else {
      // 코어가 1개이거나 코어별 층수가 없으면 전체 지상층 수로 처리
      const groundFloorCount = activeBuilding.meta.floorCount.ground || 0;
      
      // 셋팅층 및 일반층 추가
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
          rows.push({ 
            category: '셋팅층' as ProcessCategory, 
            floorLabel: `${i}F`, 
            floor: foundFloor,
            floorClass: foundFloor.floorClass,
            rowIndex: rowIndex++ 
          });
        }
      }
      
      // 기준층 찾기 (범위 형식)
      const standardRangeFloor = floors.find(f => 
        f.floorClass === '기준층' && 
        f.floorLabel.includes('~')
      );
      
      if (standardRangeFloor) {
        // 범위 추출 (예: "2~14F 기준층" -> "2~14F")
        const rangeMatch = standardRangeFloor.floorLabel.match(/(\d+)~(\d+)F/);
        if (rangeMatch) {
          const startFloor = parseInt(rangeMatch[1], 10);
          const endFloor = parseInt(rangeMatch[2], 10);
          rows.push({
            category: '기준층' as ProcessCategory,
            floorLabel: `${startFloor}~${endFloor}F`,
            floor: standardRangeFloor,
            floorClass: '기준층',
            rowIndex: rowIndex++
          });
        }
      }
    }
    
    // 4. PH층 추가
    const phFloors = floors.filter(f => f.floorClass === 'PH층');
    phFloors.forEach(floor => {
      rows.push({ 
        category: 'PH층', 
        floorLabel: floor.floorLabel, 
        floor,
        floorClass: floor.floorClass,
        rowIndex: rowIndex++ 
      });
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
                    {/* 호수, 지상층수 정보 - 헤더 위에 표시 */}
                    {activeBuilding && (() => {
                      const building = activeBuilding;
                      const info = getBuildingInfo(building);
                      return (
                        <div className="px-4 py-3 bg-slate-50 dark:bg-slate-900 border-b-2 border-slate-200 dark:border-slate-800">
                          <div className="flex gap-6 text-sm">
                            <div className="font-semibold text-slate-900 dark:text-white">
                              호수: <span className="font-normal">{info.totalUnits}</span>
                            </div>
                            <div className="font-semibold text-slate-900 dark:text-white">
                              지상층수: <span className="font-normal">{info.groundFloors}</span>
                            </div>
                          </div>
                        </div>
                      );
                    })()}
                    
                    <table className="w-full border-collapse text-sm table-fixed">
                    <colgroup>
                      {/* 구분 */}<col style={{ width: '120px' }} />
                      {/* 일수 */}<col style={{ width: '80px' }} />
                      {/* 공정타입 */}<col style={{ width: '120px' }} />
                      {/* 세부공정 */}<col style={{ width: '80px' }} />
                      {/* 세부공정 상세 */}<col style={{ width: '400px' }} />
                    </colgroup>
                    <thead>
                      <tr className="bg-slate-50 dark:bg-slate-900 border-b-2 border-slate-200 dark:border-slate-800">
                        {/* 첫 번째 열: 구분 */}
                        <th className="px-4 py-3 text-center text-sm font-semibold text-slate-900 dark:text-white border-r-2 border-slate-200 dark:border-slate-800">
                          구분
                        </th>
                        
                        {/* 첫 번째 공정 열만 헤더 표시 (일수, 셀렉트박스, 버튼) */}
                        {processColumns.length > 0 && (
                          <Fragment key={`header-${processColumns[0].category}-${processColumns[0].colIndex}`}>
                            {/* 일수 열 */}
                            <th className="px-2 py-3 text-center text-sm font-semibold text-slate-900 dark:text-white border-r border-slate-200 dark:border-slate-800">
                              순작업일수
                            </th>
                            {/* 셀렉트박스 열 */}
                            <th className="px-2 py-3 text-center text-sm font-semibold text-slate-900 dark:text-white border-r border-slate-200 dark:border-slate-800">
                              공정타입
                            </th>
                            {/* 버튼 열 */}
                            <th className="px-2 py-3 text-center text-sm font-semibold text-slate-900 dark:text-white border-r border-slate-200 dark:border-slate-800">
                              세부공정
                            </th>
                          </Fragment>
                        )}
                        
                        {/* 마지막 열: 세부공정 확장 영역 (모든 행에 걸친 넓은 칸) */}
                        <th 
                          className="px-4 py-3 text-center text-sm font-semibold text-slate-900 dark:text-white"
                          rowSpan={totalRows}
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
                              // 일반층인 경우 PH층의 표준공정을 사용
                              const isNormalFloor = row.floorClass === '일반층';
                              const effectiveCategory = isNormalFloor ? 'PH층' : row.category;
                              
                              const processType = row.floorLabel && (row.category === '지하골조' || row.category === 'PH층' || isNormalFloor)
                                ? (isNormalFloor 
                                    ? getProcessTypeForFloor(plan, 'PH층', row.floorLabel)
                                    : getProcessTypeForFloor(plan, row.category, row.floorLabel))
                                : plan?.processes[row.category]?.processType || DEFAULT_PROCESS_TYPES[row.category];
                              const module = getProcessModule(effectiveCategory, processType);
                              
                              // 일수 계산 - 세부공정의 순작업일 합계
                              let days = 0;
                              if (!module || !module.items || module.items.length === 0) {
                                // 모듈이 없으면 기존 방식 사용
                                if (row.category === '버림' || row.category === '기초') {
                                  days = plan?.processes[row.category]?.days || 0;
                                } else if (row.category === '지하골조' && row.floorLabel) {
                                  days = calculateBasementFloorDays(building, row.category, processType, row.floorLabel);
                                } else if (row.category === '셋팅층' && row.floorLabel) {
                                  if (isNormalFloor) {
                                    days = calculatePhFloorDays(building, 'PH층', processType, row.floorLabel);
                                  } else {
                                    days = calculateSettingFloorDays(building, row.category, processType, row.floorLabel);
                                  }
                                } else if (row.category === '기준층' && row.floorLabel) {
                                  const standardFloors = getStandardFloors.get(building.id) || [];
                                  days = standardFloors.reduce((sum, floor) => {
                                    return sum + calculateStandardFloorDays(building, row.category, processType, floor.floorLabel);
                                  }, 0);
                                } else if (row.category === 'PH층' && row.floorLabel) {
                                  days = calculatePhFloorDays(building, row.category, processType, row.floorLabel);
                                }
                              } else {
                                // 세부공정의 순작업일 합계 계산
                                let sumDirectDays = 0;
                                
                                // 기준층 범위 형식인 경우 각 층별 순작업일 합산
                                if (row.category === '기준층' && row.floorLabel && row.floorLabel.includes('~')) {
                                  const rangeMatch = row.floorLabel.match(/(\d+)~(\d+)F/);
                                  if (rangeMatch) {
                                    const startFloor = parseInt(rangeMatch[1], 10);
                                    const endFloor = parseInt(rangeMatch[2], 10);
                                    let totalSum = 0;
                                    
                                    // 각 층별로 순작업일 계산하여 합산
                                    for (let i = startFloor; i <= endFloor; i++) {
                                      const floorLabel = `${i}F`;
                                      let floorSum = 0;
                                      
                                      module.items.forEach(item => {
                                        let directWorkDays = 0;
                                        let quantity = 0;
                                        
                                        if (item.quantityReference) {
                                          const refMatch = item.quantityReference.match(/^([A-Z])(\d+)(?:\*([\d.]+))?$/);
                                          if (refMatch) {
                                            const [, col] = refMatch;
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
                                            
                                            if (field) {
                                              quantity = getQuantityFromFloor(building, floorLabel, field, subField) * ratio;
                                            } else {
                                              quantity = getQuantityByReference(building, item.quantityReference);
                                            }
                                          } else {
                                            quantity = getQuantityByReference(building, item.quantityReference);
                                          }
                                        }
                                        
                                        if (item.directWorkDays !== undefined) {
                                          directWorkDays = item.directWorkDays;
                                          floorSum += directWorkDays;
                                        } else if (item.equipmentCalculationBase !== undefined && item.equipmentWorkersPerUnit !== undefined && item.quantityReference) {
                                          if (quantity > 0 && item.dailyProductivity > 0) {
                                            const calculatedEquipmentCount = calculateEquipmentCount(quantity, item.equipmentCalculationBase);
                                            const dailyInputWorkers = calculateDailyInputWorkersByEquipment(calculatedEquipmentCount, item.equipmentWorkersPerUnit);
                                            if (dailyInputWorkers > 0) {
                                              directWorkDays = calculateWorkDaysWithRounding(quantity, item.dailyProductivity, dailyInputWorkers);
                                              floorSum += directWorkDays;
                                            }
                                          }
                                        } else if (item.quantityReference && item.dailyProductivity > 0) {
                                          if (quantity > 0) {
                                            const totalWorkers = calculateTotalWorkers(quantity, item.dailyProductivity);
                                            const dailyInputWorkers = calculateDailyInputWorkers(totalWorkers, item.equipmentCount);
                                            directWorkDays = calculateWorkDaysWithRounding(quantity, item.dailyProductivity, dailyInputWorkers);
                                            floorSum += directWorkDays;
                                          }
                                        }
                                      });
                                      
                                      totalSum += floorSum;
                                    }
                                    
                                    sumDirectDays = totalSum;
                                  }
                                }
                                // 버림, 기초는 floorLabel 없이 계산
                                else if (row.category === '버림' || row.category === '기초') {
                                  module.items.forEach(item => {
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
                                // 셋팅층, 일반층, 지하골조, PH층 - 각 층별로 해당 층의 항목만 계산
                                else if (row.floorLabel && (row.category === '셋팅층' || row.category === '지하골조' || row.category === 'PH층' || isNormalFloor)) {
                                  // 해당 층의 항목만 필터링
                                  const floorItems = module.items.filter(item => {
                                    // 지하골조의 경우 item.floorLabel과 row.floorLabel이 일치해야 함
                                    if (row.category === '지하골조') {
                                      return item.floorLabel === row.floorLabel;
                                    }
                                    // PH층의 경우 floorLabel이 없으면 모든 항목 포함 (일반층처럼 처리)
                                    if (row.category === 'PH층') {
                                      return !item.floorLabel || item.floorLabel === row.floorLabel;
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
                                    let directWorkDays = 0;
                                    let quantity = 0;
                                    
                                    // 수량 참조를 층별로 조정
                                    if (item.quantityReference) {
                                      const refMatch = item.quantityReference.match(/^([A-Z])(\d+)(?:\*([\d.]+))?$/);
                                      if (refMatch && row.floorLabel) {
                                        const [, col] = refMatch;

                                        if (row.category === '지하골조') {
                                          // 지하골조는 floorLabel 그대로 사용 (B1, B2 등)
                                          quantity = getQuantityFromFloor(building, row.floorLabel, 
                                            col === 'B' ? 'gangForm' : col === 'C' ? 'alForm' : col === 'D' ? 'formwork' : col === 'E' ? 'stripClean' : col === 'F' ? 'rebar' : 'concrete',
                                            col === 'B' || col === 'C' || col === 'D' || col === 'E' ? 'areaM2' : col === 'F' ? 'ton' : 'volumeM3');
                                        } else if (row.category === 'PH층' || isNormalFloor) {
                                          // PH층은 행 번호 조정
                                          const phMatch = row.floorLabel.match(/PH(\d+)/);
                                          if (phMatch) {
                                            const phNum = parseInt(phMatch[1], 10);
                                            const targetRowNum = 25 + phNum;
                                            const newReference = `${col}${targetRowNum}${refMatch[3] ? `*${refMatch[3]}` : ''}`;
                                            quantity = getQuantityByReference(building, newReference);
                                          } else {
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
                                
                                days = sumDirectDays;
                              }
                              
                              // 확장 상태 확인
                              const expandKey = row.floorLabel 
                                ? `${row.category}-${row.floorLabel}`
                                : row.category === '기준층'
                                  ? '기준층-세부공정'
                                  : row.category;
                              const isExpanded = isDetailExpanded.has(expandKey);
                              
                              // 구분 열 표시 (물량입력표와 동일한 형식)
                              const getCategoryLabel = () => {
                                if (row.category === '버림' || row.category === '기초') {
                                  return '';
                                }
                                // 기준층인 경우 "기준층" 표시
                                if (row.category === '기준층') {
                                  return '기준층';
                                }
                                // 층 분류 표시 (물량입력표의 구분 열과 동일)
                                return row.floorClass || '';
                              };
                              
                              // 공정 이름 표시
                              const getProcessLabel = () => {
                                if (row.category === '버림' || row.category === '기초') {
                                  return row.category;
                                }
                                // 기준층인 경우 범위 형식으로 표시 (예: "2~14F")
                                if (row.category === '기준층' && row.floorLabel) {
                                  // 범위 형식인 경우 층 수 계산 (예: "5~14F" -> "5~14F (10개층)")
                                  const rangeMatch = row.floorLabel.match(/(\d+)~(\d+)F/);
                                  if (rangeMatch) {
                                    const startFloor = parseInt(rangeMatch[1], 10);
                                    const endFloor = parseInt(rangeMatch[2], 10);
                                    const floorCount = endFloor - startFloor + 1;
                                    return `${row.floorLabel} (${floorCount}개층)`;
                                  }
                                  return row.floorLabel;
                                }
                                return row.floorLabel || '';
                              };
                              
                              return (
                                <tr 
                                  key={`process-${row.category}-${row.floorLabel || ''}-${row.rowIndex}`}
                                  className="border-b border-slate-200 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-900/50 h-16"
                                >
                                  {/* 첫 번째 열: 구분 (물량입력표와 동일한 형식) */}
                                  <td className="px-4 py-2 text-sm font-semibold text-slate-900 dark:text-white border-r-2 border-slate-200 dark:border-slate-800 h-16 align-middle">
                                    <div className="text-center">{getCategoryLabel()}</div>
                                    <div className="text-center font-normal">{getProcessLabel()}</div>
                                  </td>
                                  
                                  {/* 두 번째 열: 일수 */}
                                  <td className="px-2 py-2 text-center border-r border-slate-200 dark:border-slate-800 h-16 align-middle">
                                    <div className="w-full px-2 py-1 text-sm text-center border border-slate-300 dark:border-slate-700 rounded bg-slate-100 dark:bg-slate-900 text-slate-900 dark:text-white">
                                      {days}
                                    </div>
                                  </td>
                                  
                                  {/* 세 번째 열: 셀렉트박스 */}
                                  <td className="px-2 py-2 border-r border-slate-200 dark:border-slate-800 h-16 align-middle">
                                    <select
                                      value={processType}
                                      onChange={(e) => {
                                        // 일반층인 경우 PH층 카테고리로 저장
                                        const targetCategory = isNormalFloor ? 'PH층' : row.category;
                                        handleProcessTypeChange(building.id, targetCategory, e.target.value as ProcessType, row.floorLabel);
                                      }}
                                      className="w-full px-2 py-1 text-xs border border-slate-300 dark:border-slate-700 rounded bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-primary-500"
                                    >
                                      {PROCESS_TYPE_OPTIONS[effectiveCategory].map(option => (
                                        <option key={option} value={option}>
                                          {option}
                                        </option>
                                      ))}
                                    </select>
                                  </td>
                                  
                                  {/* 네 번째 열: 세부공정 버튼 */}
                                  <td className="px-2 py-2 border-r border-slate-200 dark:border-slate-800 h-16 align-middle">
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
                                  
                                  {/* 다섯 번째 열: 세부공정 상세 (첫 번째 행에서만 rowSpan으로 표시) */}
                                  {rowIdx === 0 && (
                                    <td rowSpan={totalRows} className="px-4 py-2 align-top border-l-2 border-slate-200 dark:border-slate-800">
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
                                          
                                          // 일반층인 경우 PH층 공정을 사용
                                          const isExpandedNormalFloor = expandedRow.floorClass === '일반층';
                                          const expandedEffectiveCategory = isExpandedNormalFloor ? 'PH층' : expandedRow.category;
                                          
                                          const colProcessType = expandedRow.floorLabel && (expandedRow.category === '지하골조' || expandedRow.category === 'PH층' || isExpandedNormalFloor)
                                            ? (isExpandedNormalFloor
                                                ? getProcessTypeForFloor(plan, 'PH층', expandedRow.floorLabel)
                                                : getProcessTypeForFloor(plan, expandedRow.category, expandedRow.floorLabel))
                                            : plan?.processes[expandedRow.category]?.processType || DEFAULT_PROCESS_TYPES[expandedRow.category];
                                          const colModule = getProcessModule(expandedEffectiveCategory, colProcessType);
                                          
                                          if (!colModule || !colModule.items.length) return null;
                                          
                                          // 순작업일 합계 계산
                                          const calculateDirectWorkDaysSum = () => {
                                            // 기준층 범위 형식인 경우 각 층별 순작업일 합산
                                            if (expandedRow.category === '기준층' && expandedRow.floorLabel && expandedRow.floorLabel.includes('~')) {
                                              const rangeMatch = expandedRow.floorLabel.match(/(\d+)~(\d+)F/);
                                              if (rangeMatch) {
                                                const startFloor = parseInt(rangeMatch[1], 10);
                                                const endFloor = parseInt(rangeMatch[2], 10);
                                                let totalSum = 0;
                                                
                                                // 각 층별로 순작업일 계산하여 합산
                                                for (let i = startFloor; i <= endFloor; i++) {
                                                  const floorLabel = `${i}F`;
                                                  let floorSum = 0;
                                                  
                                                  colModule.items.forEach(item => {
                                                    let directWorkDays = 0;
                                                    let quantity = 0;
                                                    
                                                    if (item.quantityReference) {
                                                      const refMatch = item.quantityReference.match(/^([A-Z])(\d+)(?:\*([\d.]+))?$/);
                                                      if (refMatch) {
                                                        const [, col] = refMatch;
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
                                                        
                                                        if (field) {
                                                          quantity = getQuantityFromFloor(building, floorLabel, field, subField) * ratio;
                                                        } else {
                                                          quantity = getQuantityByReference(building, item.quantityReference);
                                                        }
                                                      } else {
                                                        quantity = getQuantityByReference(building, item.quantityReference);
                                                      }
                                                    }
                                                    
                                                    if (item.directWorkDays !== undefined) {
                                                      directWorkDays = item.directWorkDays;
                                                      floorSum += directWorkDays;
                                                    } else if (item.equipmentCalculationBase !== undefined && item.equipmentWorkersPerUnit !== undefined && item.quantityReference) {
                                                      if (quantity > 0 && item.dailyProductivity > 0) {
                                                        const calculatedEquipmentCount = calculateEquipmentCount(quantity, item.equipmentCalculationBase);
                                                        const dailyInputWorkers = calculateDailyInputWorkersByEquipment(calculatedEquipmentCount, item.equipmentWorkersPerUnit);
                                                        if (dailyInputWorkers > 0) {
                                                          directWorkDays = calculateWorkDaysWithRounding(quantity, item.dailyProductivity, dailyInputWorkers);
                                                          floorSum += directWorkDays;
                                                        }
                                                      }
                                                    } else if (item.quantityReference && item.dailyProductivity > 0) {
                                                      if (quantity > 0) {
                                                        const totalWorkers = calculateTotalWorkers(quantity, item.dailyProductivity);
                                                        const dailyInputWorkers = calculateDailyInputWorkers(totalWorkers, item.equipmentCount);
                                                        directWorkDays = calculateWorkDaysWithRounding(quantity, item.dailyProductivity, dailyInputWorkers);
                                                        floorSum += directWorkDays;
                                                      }
                                                    }
                                                  });
                                                  
                                                  totalSum += floorSum;
                                                }
                                                
                                                return totalSum;
                                              }
                                            }
                                            
                                            // 버림, 기초는 floorLabel 없이 계산
                                            if (expandedRow.category === '버림' || expandedRow.category === '기초') {
                                              let sumDirectDays = 0;
                                              
                                              colModule.items.forEach(item => {
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
                                              
                                              return sumDirectDays;
                                            }
                                            
                                            // 셋팅층, 일반층, 지하골조, PH층 - 각 층별로 해당 층의 항목만 계산
                                            if (!expandedRow.floorLabel || 
                                                (expandedRow.category !== '셋팅층' && expandedRow.category !== '지하골조' && expandedRow.category !== 'PH층' && !isExpandedNormalFloor)) {
                                              return 0;
                                            }
                                            
                                            let sumDirectDays = 0;
                                            
                                            // 해당 층의 항목만 필터링
                                            const floorItems = colModule.items.filter(item => {
                                              // 지하골조의 경우 item.floorLabel과 expandedRow.floorLabel이 일치해야 함
                                              if (expandedRow.category === '지하골조') {
                                                return item.floorLabel === expandedRow.floorLabel;
                                              }
                                              // PH층의 경우 floorLabel이 없으면 모든 항목 포함 (일반층처럼 처리)
                                              if (expandedRow.category === 'PH층') {
                                                return !item.floorLabel || item.floorLabel === expandedRow.floorLabel;
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
                                              return true;
                                            });
                                            
                                            floorItems.forEach(item => {
                                              let directWorkDays = 0;
                                              let quantity = 0;
                                              
                                              // 수량 참조를 층별로 조정
                                              if (item.quantityReference) {
                                                const refMatch = item.quantityReference.match(/^([A-Z])(\d+)(?:\*([\d.]+))?$/);
                                                if (refMatch && expandedRow.floorLabel) {
                                                  const [, col, baseRow] = refMatch;
                                                  const baseRowNum = parseInt(baseRow, 10);

                                                  if (expandedRow.category === '지하골조') {
                                                    // 지하골조는 floorLabel 그대로 사용 (B1, B2 등)
                                                    quantity = getQuantityFromFloor(building, expandedRow.floorLabel, 
                                                      col === 'B' ? 'gangForm' : col === 'C' ? 'alForm' : col === 'D' ? 'formwork' : col === 'E' ? 'stripClean' : col === 'F' ? 'rebar' : 'concrete',
                                                      col === 'B' || col === 'C' || col === 'D' || col === 'E' ? 'areaM2' : col === 'F' ? 'ton' : 'volumeM3');
                                                  } else if (expandedRow.category === 'PH층' || isExpandedNormalFloor) {
                                                    // PH층은 행 번호 조정
                                                    const phMatch = expandedRow.floorLabel.match(/PH(\d+)/);
                                                    if (phMatch) {
                                                      const phNum = parseInt(phMatch[1], 10);
                                                      const targetRowNum = 25 + phNum;
                                                      const newReference = `${col}${targetRowNum}${refMatch[3] ? `*${refMatch[3]}` : ''}`;
                                                      quantity = getQuantityByReference(building, newReference);
                                                    } else {
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
                                            
                                            return sumDirectDays;
                                          };
                                          
                                          const directWorkDaysSum = calculateDirectWorkDaysSum();
                                          
                                          return (
                                            <div key={`detail-${expandedRow.category}-${expandedRow.floorLabel || ''}`} className="border-b border-slate-300 dark:border-slate-700 pb-3 last:border-b-0">
                                              <div className="font-semibold text-sm text-slate-900 dark:text-white mb-2">
                                                {expandedRow.category === '버림' || expandedRow.category === '기초' 
                                                  ? `${expandedRow.category}${directWorkDaysSum > 0 ? ` (순작업일 합계 ${directWorkDaysSum}일)` : ''}`
                                                  : expandedRow.category === '지하골조'
                                                    ? `지하층 ${expandedRow.floorLabel}층${directWorkDaysSum > 0 ? ` (순작업일 합계 ${directWorkDaysSum}일)` : ''}`
                                                    : expandedRow.category === '셋팅층'
                                                      ? isExpandedNormalFloor
                                                        ? `일반층 ${expandedRow.floorLabel}${directWorkDaysSum > 0 ? ` (순작업일 합계 ${directWorkDaysSum}일)` : ''}`
                                                        : `셋팅층 ${expandedRow.floorLabel}${directWorkDaysSum > 0 ? ` (순작업일 합계 ${directWorkDaysSum}일)` : ''}`
                                                      : expandedRow.category === '기준층'
                                                        ? `기준층 ${expandedRow.floorLabel}${directWorkDaysSum > 0 ? ` (순작업일 합계 ${directWorkDaysSum}일)` : ''}`
                                                        : `PH층 ${expandedRow.floorLabel}층${directWorkDaysSum > 0 ? ` (순작업일 합계 ${directWorkDaysSum}일)` : ''}`}
                                              </div>
                                              <div className="space-y-2">
                                                {expandedRow.category === '기준층' && expandedRow.floorLabel && expandedRow.floorLabel.includes('~') ? (
                                                  // 기준층은 각 층별로 구분하여 표시 (범위 형식인 경우)
                                                  (() => {
                                                    // 범위 추출 (예: "2~14F" -> 2부터 14까지)
                                                    const rangeMatch = expandedRow.floorLabel.match(/(\d+)~(\d+)F/);
                                                    if (!rangeMatch) return null;
                                                    
                                                    const startFloor = parseInt(rangeMatch[1], 10);
                                                    const endFloor = parseInt(rangeMatch[2], 10);
                                                    
                                                    // 각 층별로 데이터 표시
                                                    const floors: Array<{ floorLabel: string; floorNumber: number }> = [];
                                                    for (let i = startFloor; i <= endFloor; i++) {
                                                      floors.push({ floorLabel: `${i}F`, floorNumber: i });
                                                    }
                                                    
                                                    return floors.map((floor) => (
                                                      <div key={`floor-${floor.floorLabel}`} className="border-l-2 border-slate-300 dark:border-slate-700 pl-3 mb-3">
                                                        <div className="font-semibold text-slate-900 dark:text-white mb-2">
                                                          {floor.floorLabel}
                                                        </div>
                                                        <div className="space-y-1">
                                                          {colModule.items
                                                            .filter((item) => {
                                                              const hasDirectDays = item.directWorkDays !== undefined && item.directWorkDays > 0;
                                                              const hasIndirectDays = item.indirectDays > 0;
                                                              return hasDirectDays || hasIndirectDays;
                                                            })
                                                            .map((item) => {
                                                              // 기준층의 경우 각 층별로 수량 가져오기
                                                              let quantity = 0;
                                                              if (item.quantityReference) {
                                                                const refMatch = item.quantityReference.match(/^([A-Z])(\d+)(?:\*([\d.]+))?$/);
                                                                if (refMatch) {
                                                                  const [, col] = refMatch;
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
                                                                  
                                                                  if (field) {
                                                                    quantity = getQuantityFromFloor(building, floor.floorLabel, field, subField) * ratio;
                                                                  }
                                                                } else {
                                                                  quantity = getQuantityByReference(building, item.quantityReference);
                                                                }
                                                              }
                                                              
                                                              let directWorkDays = 0;
                                                              let totalWorkers = 0;
                                                              let dailyInputWorkers = 0;
                                                              
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
                                                              
                                                              const totalWorkDays = calculateTotalWorkDays(directWorkDays, item.indirectDays);
                                                              
                                                              // 먹매김이 아닌 항목인지 확인
                                                              const isNotMarking = !item.workItem.includes('먹매김');
                                                              // 타설 항목인지 확인 (장비대수 계산이 있는 경우)
                                                              const isConcreteItem = item.equipmentCalculationBase !== undefined && item.equipmentWorkersPerUnit !== undefined;
                                                              
                                                              return (
                                                                <div 
                                                                  key={item.id}
                                                                  className="p-2 bg-white dark:bg-slate-900 rounded border border-slate-200 dark:border-slate-700"
                                                                >
                                                                  <div className="font-bold text-slate-900 dark:text-white mb-1">
                                                                    {item.workItem.replace(/^\d+\.\s*/, '').replace(/\s*\(1일\)/, '')}
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
                                                                    {/* 먹매김이 아닌 경우 인당 1일 작업량과 인원 정보 표시 */}
                                                                    {isNotMarking && item.dailyProductivity > 0 && (
                                                                      <>
                                                                        {/* 타설 항목이 아닌 경우에만 인당 1일 작업량 표시 */}
                                                                        {!isConcreteItem && <div>인당 1일 작업량: {item.dailyProductivity}</div>}
                                                                        {isNotMarking && totalWorkers > 0 && <div>총투입인원: {totalWorkers}</div>}
                                                                        {dailyInputWorkers > 0 && <div>1일 투입인원: {dailyInputWorkers}</div>}
                                                                      </>
                                                                    )}
                                                                    {directWorkDays > 0 && <div>순작업일: {directWorkDays}</div>}
                                                                    {item.indirectDays > 0 && <div>간접작업일: {item.indirectDays}</div>}
                                                                    {item.indirectWorkItem && item.indirectDays > 0 && <div>간접작업항목: {item.indirectWorkItem}</div>}
                                                                    <div className="font-semibold text-slate-900 dark:text-white">
                                                                      총작업일수: {totalWorkDays}
                                                                    </div>
                                                                  </div>
                                                                </div>
                                                              );
                                                            })}
                                                        </div>
                                                      </div>
                                                    ));
                                                  })()
                                                ) : (
                                                  // 다른 공정은 일반적으로 표시
                                                  colModule.items
                                                    .filter((item) => {
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
                                                        } else if (expandedRow.category === '지하골조' && expandedRow.floorLabel) {
                                                          // 지하골조 - 물량입력 데이터에서 가져오기
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
                                                        } else if (expandedRow.category === 'PH층' && expandedRow.floorLabel) {
                                                          // PH층 - 물량입력 데이터에서 가져오기
                                                          const refMatch = item.quantityReference.match(/^([A-Z])(\d+)(?:\*([\d.]+))?$/);
                                                          if (refMatch) {
                                                            const [, colLetter] = refMatch;
                                                            const phMatch = expandedRow.floorLabel.match(/PH(\d+)/);
                                                            if (phMatch) {
                                                              const phNum = parseInt(phMatch[1], 10);
                                                              // 행 26 = PH1, 행 27 = PH2 등
                                                              const targetRowNum = 25 + phNum;
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
                                                      
                                                      const totalWorkDays = calculateTotalWorkDays(directWorkDays, item.indirectDays);
                                                      
                                                      // 먹매김이 아닌 항목인지 확인
                                                      const isNotMarking = !item.workItem.includes('먹매김');
                                                      // 타설 항목인지 확인 (장비대수 계산이 있는 경우)
                                                      const isConcreteItem = item.equipmentCalculationBase !== undefined && item.equipmentWorkersPerUnit !== undefined;
                                                      
                                                      return (
                                                        <div 
                                                          key={item.id}
                                                          className="p-2 bg-white dark:bg-slate-900 rounded border border-slate-200 dark:border-slate-700"
                                                        >
                                                          <div className="font-bold text-slate-900 dark:text-white mb-1">
                                                            {item.workItem.replace(/^\d+\.\s*/, '').replace(/\s*\(1일\)/, '')}
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
                                                            {/* 먹매김이 아닌 경우 인당 1일 작업량과 인원 정보 표시 */}
                                                            {isNotMarking && item.dailyProductivity > 0 && (
                                                              <>
                                                                {/* 타설 항목이 아닌 경우에만 인당 1일 작업량 표시 */}
                                                                {!isConcreteItem && <div>인당 1일 작업량: {item.dailyProductivity}</div>}
                                                                {isNotMarking && totalWorkers > 0 && <div>총투입인원: {totalWorkers}</div>}
                                                                {dailyInputWorkers > 0 && <div>1일 투입인원: {dailyInputWorkers}</div>}
                                                              </>
                                                            )}
                                                            {directWorkDays > 0 && <div>순작업일: {directWorkDays}</div>}
                                                            {item.indirectDays > 0 && <div>간접작업일: {item.indirectDays}</div>}
                                                            {item.indirectWorkItem && item.indirectDays > 0 && <div>간접작업항목: {item.indirectWorkItem}</div>}
                                                            <div className="font-semibold text-slate-900 dark:text-white">
                                                              총작업일수: {totalWorkDays}
                                                            </div>
                                                          </div>
                                                        </div>
                                                      );
                                                    })
                                                )}
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
                            <tr className="border-t-2 border-slate-300 dark:border-slate-700 bg-slate-100 dark:bg-slate-800 h-16">
                              <td className="px-4 py-2 text-center text-sm font-bold text-slate-900 dark:text-white border-r-2 border-slate-200 dark:border-slate-800 h-16 align-middle">
                                합계
                              </td>
                              {processColumns.length > 0 && (
                                <>
                                  {/* 첫 번째 공정 열의 첫 번째 칸(일수 열)에만 합계 표시 */}
                                  <td className="px-2 py-2 text-center text-sm font-bold text-slate-900 dark:text-white border-r border-slate-200 dark:border-slate-800 h-16 align-middle">
                                    {plan ? calculateTotalDays(plan.processes, building) : 0}
                                  </td>
                                  {/* 첫 번째 공정 열의 2번째, 3번째 칸은 빈 칸 */}
                                  <td className="px-2 py-2 border-r border-slate-200 dark:border-slate-800 h-16 align-middle"></td>
                                  <td className="px-2 py-2 border-r border-slate-200 dark:border-slate-800 h-16 align-middle"></td>
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
