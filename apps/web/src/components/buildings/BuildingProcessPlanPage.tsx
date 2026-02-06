'use client';

import { Fragment, useState, useEffect, useMemo, useCallback } from 'react';
import { Card, CardHeader, CardTitle, CardContent, Input } from '@/components/ui';
import type { Building, BuildingProcessPlan, ProcessCategory, ProcessType, Floor, FloorProcessDetails } from '@/lib/types';
import { getBuildings, deleteBuilding, updateBuilding, reorderBuildings } from '@/lib/services/buildings';
import { toast } from 'sonner';
import { Calendar, ChevronDown, ChevronUp, Building2, Info } from 'lucide-react';
import { BuildingTabs } from './BuildingTabs';
import { getProcessModule } from '@/lib/data/process-modules';
import { getQuantityByReference, getQuantityFromFloor } from '@/lib/utils/quantity-reference';
import { getCellReferenceForRow } from '@/lib/utils/process-cell-reference';
import {
  calculateTotalWorkers,
  calculateDailyInputWorkers,
  calculateTotalWorkDays,
  calculateWorkDaysWithRounding,
  calculateEquipmentCount,
  calculateDailyInputWorkersByEquipment,
  calculateDailyInputWorkersByWorkDays,
  calculateIndirectWorkers,
  calculateIndirectEquipment,
} from '@/lib/utils/process-calculation';
import { calculateModuleWorkDays, calculateModuleWorkDaysForFloor } from '@/lib/utils/process-days-calculator';
import { useSyncTabContext } from '@/lib/hooks/useSyncTabContext';
import { ProcessDetailPanel } from './process-plan';

interface Props {
  projectId: string;
}

// 공정 구분 목록 (지상층만 - 지하층, 기초, 버림은 별도 탭에서 관리)
const PROCESS_CATEGORIES: ProcessCategory[] = ['셋팅층', '기준층', '옥탑층'];

// 공정 타입 옵션 (구분별로 다름)
const PROCESS_TYPE_OPTIONS: Record<ProcessCategory, ProcessType[]> = {
  '버림': ['표준공정'],
  '기초': ['표준공정'],
  '주동 지하층': ['표준공정'],
  '지하층(층고6.5m이상)': ['표준공정'],
  '셋팅층': ['표준공정', '5일 사이클', '6일 사이클', '7일 사이클', '8일 사이클'],
  '기준층': ['5일 사이클', '6일 사이클', '7일 사이클', '8일 사이클'],
  '최상층': ['5일 사이클', '6일 사이클', '7일 사이클', '8일 사이클'],
  'PH층': ['표준공정', '5일 사이클', '6일 사이클', '7일 사이클', '8일 사이클'],
  '옥탑층': ['표준공정'],
  '지하주차장': ['표준공정'],
  '일반층': ['표준공정', '5일 사이클', '6일 사이클', '7일 사이클', '8일 사이클'],
};

// 기본 공정 타입
const DEFAULT_PROCESS_TYPES: Record<ProcessCategory, ProcessType> = {
  '버림': '표준공정',
  '기초': '표준공정',
  '주동 지하층': '표준공정',
  '지하층(층고6.5m이상)': '표준공정',
  '셋팅층': '표준공정',
  '기준층': '6일 사이클',
  '최상층': '6일 사이클',
  'PH층': '표준공정',
  '옥탑층': '표준공정',
  '지하주차장': '표준공정',
  '일반층': '표준공정',
};

export function BuildingProcessPlanPage({ projectId }: Props) {
  const [buildings, setBuildings] = useState<Building[]>([]);
  const [processPlans, setProcessPlans] = useState<Map<string, BuildingProcessPlan>>(new Map());
  const [isLoading, setIsLoading] = useState(false);
  const [expandedModules, setExpandedModules] = useState<Map<string, Set<string>>>(new Map()); // buildingId-category 조합
  const [activeBuildingIndex, setActiveBuildingIndex] = useState(0);

  // 전역 챗봇과 탭 컨텍스트 동기화
  useSyncTabContext({
    activeBuildingIndex,
    buildings,
    processPlans,
    enabled: buildings.length > 0,
  });

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

  // 🔥 Stage 1 Optimization: Memoize floorTrades hash to avoid JSON.stringify on every render
  const floorTradesHash = useMemo(() => {
    return buildings
      .flatMap(b => b.floorTrades || [])
      .map(ft => `${ft.id}-${ft.tradeGroup}-${JSON.stringify(ft.trades)}`)
      .join('|');
  }, [buildings]);

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

        // 🚀 Stage 2 Optimization: Use consolidated calculation utility
        // Replaces 35 lines of duplicate logic with single function call
        const sumDays = calculateModuleWorkDays(building, module, category);

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
    });
  }, [
    floorTradesHash, // 🔥 Stage 1: Use memoized hash instead of JSON.stringify
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
    if ((category === '주동 지하층' || category === '옥탑층') && floorLabel) {
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

      // 🚀 Stage 2 Optimization: Use consolidated calculation utility
      const sumDays = module ? calculateModuleWorkDays(building, module, category) : 0;

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
    if ((category === '주동 지하층' || category === '옥탑층') && categoryProcess.floors) {
      if (categoryProcess.floors[floorLabel]) {
        return categoryProcess.floors[floorLabel].processType;
      }
    }

    // 기본 processType 반환
    return categoryProcess.processType || DEFAULT_PROCESS_TYPES[category];
  };

  // 합계일수 계산 - 지상층 공정 카테고리의 일수 합계 (지하층, 기초, 버림은 별도 탭에서 관리)
  const calculateTotalDays = (processes: BuildingProcessPlan['processes'], building?: Building): number => {
    let total = 0;
    // 모든 공정 카테고리의 일수를 합산
    PROCESS_CATEGORIES.forEach(category => {
      if (category === '옥탑층' && building) {
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

  // 지하층 각 층별 일수 계산 (통합 유틸 사용)
  const calculateBasementFloorDays = (
    building: Building,
    category: ProcessCategory,
    processType: ProcessType,
    floorLabel: string
  ): number => {
    const module = getProcessModule(category, processType);
    if (!module || !module.items.length) return 0;
    return calculateModuleWorkDaysForFloor(building, module, category, floorLabel);
  };

  // 옥탑층 각 층별 일수 계산 (통합 유틸 사용)
  const calculatePhFloorDays = (
    building: Building,
    category: ProcessCategory,
    processType: ProcessType,
    floorLabel: string
  ): number => {
    const module = getProcessModule(category, processType);
    if (!module || !module.items.length) return 0;
    return calculateModuleWorkDaysForFloor(building, module, category, floorLabel);
  };

  // 기준층 각 층별 일수 계산 (통합 유틸 사용)
  const calculateStandardFloorDays = (
    building: Building,
    category: ProcessCategory,
    processType: ProcessType,
    floorLabel: string
  ): number => {
    const module = getProcessModule(category, processType);
    if (!module || !module.items.length) return 0;
    return calculateModuleWorkDaysForFloor(building, module, category, floorLabel);
  };

  // 셋팅층 각 층별 일수 계산 (통합 유틸 사용)
  const calculateSettingFloorDays = (
    building: Building,
    category: ProcessCategory,
    processType: ProcessType,
    floorLabel: string
  ): number => {
    const module = getProcessModule(category, processType);
    if (!module || !module.items.length) return 0;
    return calculateModuleWorkDaysForFloor(building, module, category, floorLabel);
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
        return `코어${coreNum} ${unitCount}호 ${pattern.type}`;
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
            category: '최상층' as ProcessCategory,
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
            category: '최상층' as ProcessCategory,
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

    // 지하층, 기초, 버림은 별도의 "지하층 공정계획" 탭에서 관리

    return rows;
  }, [activeBuilding]);

  // 세부공정 순작업일 변경 핸들러
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
    const [category, floorLabel] = itemKey.split('-');
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

    // 일반층인 경우 옥탑층 공정을 사용
    const isExpandedNormalFloor = expandedRow?.floorClass === '일반층';
    const expandedEffectiveCategory = isExpandedNormalFloor ? '옥탑층' : (expandedRow?.category || categoryKey);

    const colProcessType = expandedRow?.floorLabel && (expandedRow.category === '주동 지하층' || expandedRow.category === 'PH층' || expandedRow.category === '옥탑층' || isExpandedNormalFloor)
      ? (isExpandedNormalFloor
        ? getProcessTypeForFloor(plan, '옥탑층', expandedRow.floorLabel)
        : getProcessTypeForFloor(plan, expandedRow.category, expandedRow.floorLabel))
      : plan?.processes[expandedRow?.category || categoryKey]?.processType || DEFAULT_PROCESS_TYPES[expandedRow?.category || categoryKey];
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
    } else if (expandedRow?.floorLabel) {
      const targetFloorLabel = expandedRow.category === '기준층'
        ? (processRows.find(r => r.category === '기준층' && r.floorLabel)?.floorLabel || expandedRow.floorLabel)
        : expandedRow.floorLabel;
      const calculationFloorLabel = expandedRow.category === '기준층' && processRows.find(r => r.category === '기준층' && r.floorLabel)
        ? processRows.find(r => r.category === '기준층' && r.floorLabel)!.floorLabel
        : expandedRow.floorLabel;

      const floorItems = colModule?.items.filter(moduleItem => {
        if (expandedRow.category === '주동 지하층') {
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
          return moduleItem.floorLabel === targetFloorLabel || !moduleItem.floorLabel;
        }
        if (expandedRow.category === '옥탑층') {
          if (!moduleItem.floorLabel) return true;
          if (!expandedRow.floorLabel) return true;
          const itemMatch = moduleItem.floorLabel.match(/옥탑(\d+)/);
          const rowMatch = expandedRow.floorLabel.match(/옥탑(\d+)/);
          if (itemMatch && rowMatch) {
            return itemMatch[1] === rowMatch[1];
          }
          return moduleItem.floorLabel === expandedRow.floorLabel;
        }
        return true;
      }) || [];

      floorItems.forEach(moduleItem => {
        let moduleItemKey: string;
        let overriddenDays: number | undefined;

        if (expandedRow.category === '기준층') {
          const currentFloorKey = `기준층-${expandedRow.floorLabel}-${moduleItem.id}`;
          overriddenDays = updatedOverrides[currentFloorKey];
          if (overriddenDays === undefined) {
            const firstStandardFloorLabel = processRows.find(r => r.category === '기준층' && r.floorLabel)?.floorLabel;
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

        let directWorkDays = 0;
        let quantity = 0;

        if (moduleItem.quantityReference) {
          const refMatch = moduleItem.quantityReference.match(/^([A-Z])(\d+)(?:\*([\d.]+))?$/);
          if (refMatch && expandedRow.floorLabel) {
            const [, col] = refMatch;
            const ratio = refMatch[3] ? parseFloat(refMatch[3]) : 1;

            if (expandedRow.category === '주동 지하층' && expandedRow.floorLabel) {
              quantity = getQuantityFromFloor(building, expandedRow.floorLabel,
                col === 'B' ? 'gangForm' : col === 'C' ? 'alForm' : col === 'D' ? 'formwork' : col === 'E' ? 'stripClean' : col === 'F' ? 'rebar' : 'concrete',
                col === 'B' || col === 'C' || col === 'D' || col === 'E' ? 'areaM2' : col === 'F' ? 'ton' : 'volumeM3') * ratio;
            } else if ((expandedRow.category === '옥탑층' || isExpandedNormalFloor) && expandedRow.floorLabel) {
              const field = col === 'B' ? 'gangForm' : col === 'C' ? 'alForm' : col === 'D' ? 'formwork' : col === 'E' ? 'stripClean' : col === 'F' ? 'rebar' : 'concrete' as const;
              const subField = col === 'B' || col === 'C' || col === 'D' || col === 'E' ? 'areaM2' : col === 'F' ? 'ton' : 'volumeM3';
              quantity = getQuantityFromFloor(building, expandedRow.floorLabel, field, subField) * ratio;
            } else if (expandedRow.category === '셋팅층' && expandedRow.floorLabel) {
              const floorMatch = expandedRow.floorLabel.match(/(\d+)F/);
              if (floorMatch) {
                const floorNum = parseInt(floorMatch[1], 10);
                const targetRowNum = floorNum + 10;
                const newReference = `${col}${targetRowNum}${refMatch[3] ? `*${refMatch[3]}` : ''}`;
                quantity = getQuantityByReference(building, newReference);
              }
            } else if (expandedRow.category === '기준층' && calculationFloorLabel) {
              const field = col === 'B' ? 'gangForm' : col === 'C' ? 'alForm' : col === 'D' ? 'formwork' : col === 'E' ? 'stripClean' : col === 'F' ? 'rebar' : 'concrete' as const;
              const subField = col === 'B' || col === 'C' || col === 'D' || col === 'E' ? 'areaM2' : col === 'F' ? 'ton' : 'volumeM3';
              const rangeFloorId = expandedRow.floor?.floorLabel?.includes('~') ? expandedRow.floor.id : undefined;
              quantity = getQuantityFromFloor(building, calculationFloorLabel, field, subField, rangeFloorId) * ratio;
            } else {
              quantity = getQuantityByReference(building, moduleItem.quantityReference);
            }
          } else {
            quantity = getQuantityByReference(building, moduleItem.quantityReference);
          }
        }

        if (moduleItem.directWorkDays !== undefined) {
          directWorkDays = moduleItem.directWorkDays;
          sumDirectDays += directWorkDays;
        } else if (moduleItem.equipmentCalculationBase !== undefined && moduleItem.equipmentWorkersPerUnit !== undefined) {
          if (quantity > 0 && moduleItem.dailyProductivity > 0) {
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
    const targetCategory = expandedRow?.category || categoryKey;
    const previousProcessType = plan.processes[targetCategory]?.processType || DEFAULT_PROCESS_TYPES[targetCategory];
    let newProcessType = previousProcessType;

    if (targetCategory === '기준층') {
      if (sumDirectDays === 5) newProcessType = '5일 사이클';
      else if (sumDirectDays === 6) newProcessType = '6일 사이클';
      else if (sumDirectDays === 7) newProcessType = '7일 사이클';
      else if (sumDirectDays === 8) newProcessType = '8일 사이클';
      else newProcessType = DEFAULT_PROCESS_TYPES[targetCategory];
    }

    // processPlans의 해당 구분의 days 업데이트
    const updatedPlan = {
      ...plan,
      itemDirectWorkDaysOverrides: updatedOverrides,
      processes: {
        ...plan.processes,
        [targetCategory]: {
          ...plan.processes[targetCategory],
          days: sumDirectDays,
          processType: newProcessType,
        },
      },
    };

    // totalDays 재계산
    updatedPlan.totalDays = calculateTotalDays(updatedPlan.processes, building);

    setProcessPlans(new Map(processPlans.set(building.id, updatedPlan)));

    // localStorage에 저장
    try {
      if (typeof window !== 'undefined') {
        const storageKey = `contech_process_plan_${building.id}`;
        localStorage.setItem(storageKey, JSON.stringify(updatedPlan));
      }
    } catch (error) {
      console.error('Failed to save direct work days:', error);
      toast.error('순작업일 저장에 실패했습니다.');
    }
  }, [processPlans, processRows, expandedModules, getProcessTypeForFloor, calculateTotalDays]);

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
            <div className="p-4">
              {/* 호수, 펌프카 대수 정보 - 카드 형식 */}
              {activeBuilding && (() => {
                const building = activeBuilding;
                const info = getBuildingInfo(building);
                return (
                  <Card className="mb-4">
                    <CardContent className="p-4">
                      <div className="flex items-center gap-6 flex-wrap">
                        <div className="flex items-center gap-2">
                          <label className="text-sm font-semibold text-zinc-900 dark:text-white whitespace-nowrap">
                            호수:
                          </label>
                          <span className="text-sm text-zinc-600 dark:text-zinc-400">
                            {info.coreUnits && info.coreUnits.length > 0
                              ? info.coreUnits.map((cu, idx) => `코어${cu.coreNumber} ${cu.units}호`).join(', ')
                              : info.totalUnits}
                          </span>
                        </div>
                        <div className="flex items-center gap-2">
                          <label className="text-sm font-semibold text-zinc-900 dark:text-white whitespace-nowrap">
                            펌프카 최대 투입대수:
                          </label>
                          <Input
                            type="number"
                            min="1"
                            max="2"
                            step="1"
                            value={building.meta?.pumpCarCount ?? 1}
                            onChange={async (e) => {
                              const rawValue = e.target.value === '' ? 1 : parseInt(e.target.value, 10);
                              const value = Math.min(2, Math.max(1, rawValue || 1));
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
                              const rawValue = e.target.value === '' ? 1 : parseInt(e.target.value, 10);
                              const value = Math.min(2, Math.max(1, rawValue || 1));
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
                            className="w-20"
                            placeholder="1"
                          />
                          <span className="text-sm text-zinc-600 dark:text-zinc-400">대</span>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                );
              })()}

              <div className="flex items-start gap-4 min-w-[1024px]">
                {/* 좌측: 테이블 카드 */}
                <div className="flex-1 min-w-0 rounded-lg shadow-md border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-950 overflow-hidden">
                  {/* 테이블 헤더 */}
                  <div className="bg-zinc-100 dark:bg-zinc-900 px-4 py-3 border-b border-zinc-200 dark:border-zinc-800">
                    <h3 className="font-semibold text-sm text-zinc-900 dark:text-zinc-100">
                      공정 목록
                    </h3>
                  </div>

                  {/* 테이블 스크롤 컨테이너 */}
                  <div className="overflow-x-auto">
                    <table className="w-full border-collapse text-sm table-fixed">
                      <colgroup>
                        {/* 구분 항목 */}<col style={{ width: '92px' }} />
                        {/* 층수 */}<col style={{ width: '44px' }} />
                        {/* 형틀 합계 */}<col style={{ width: '52px' }} />
                        {/* 갱폼 */}<col style={{ width: '48px' }} />
                        {/* 알폼 */}<col style={{ width: '48px' }} />
                        {/* 유로폼 */}<col style={{ width: '52px' }} />
                        {/* 해체/정리 */}<col style={{ width: '52px' }} />
                        {/* 철근 */}<col style={{ width: '54px' }} />
                        {/* 콘크리트 */}<col style={{ width: '58px' }} />
                        {/* 일수 */}<col style={{ width: '64px' }} />
                        {/* 공정타입 */}<col style={{ width: '90px' }} />
                        {/* 세부공정 */}<col style={{ width: '56px' }} />
                      </colgroup>
                      <thead className="bg-zinc-50 dark:bg-zinc-900/50">
                        {/* 상단 헤더 행 */}
                        <tr className="border-b border-zinc-200 dark:border-zinc-800" style={{ height: '24px' }}>
                          <th rowSpan={2} className="px-2 py-1 text-center text-xs font-semibold text-zinc-500 dark:text-zinc-400 uppercase tracking-wider border-r border-zinc-200 dark:border-zinc-800" style={{ height: '24px', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                            구분
                          </th>
                          <th rowSpan={2} className="px-2 py-1 text-center text-xs font-semibold text-zinc-500 dark:text-zinc-400 uppercase tracking-wider border-r border-zinc-200 dark:border-zinc-800" style={{ height: '24px', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                            층수
                          </th>
                          <th colSpan={4} className="px-1 py-0.5 text-center text-xs font-semibold text-zinc-500 dark:text-zinc-400 uppercase tracking-wider border-r border-zinc-200 dark:border-zinc-800" style={{ whiteSpace: 'nowrap' }}>
                            형틀
                          </th>
                          <th rowSpan={2} className="px-0.5 py-1 text-center text-xs font-semibold text-zinc-500 dark:text-zinc-400 uppercase tracking-wider border-r border-zinc-200 dark:border-zinc-800" style={{ height: '24px', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', lineHeight: '1.1' }}>
                            해체/<br />정리
                          </th>
                          <th rowSpan={2} className="px-1 py-1 text-center text-xs font-semibold text-zinc-500 dark:text-zinc-400 uppercase tracking-wider border-r border-zinc-200 dark:border-zinc-800" style={{ height: '24px', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                            철근
                          </th>
                          <th rowSpan={2} className="px-1 py-1 text-center text-xs font-semibold text-zinc-500 dark:text-zinc-400 uppercase tracking-wider border-r-2 border-zinc-200 dark:border-zinc-800" style={{ height: '24px', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                            콘크리트
                          </th>
                          {processColumns.length > 0 && (
                            <Fragment key={`header-${processColumns[0].category}-${processColumns[0].colIndex}`}>
                              <th rowSpan={2} className="px-1 py-1 text-center text-xs font-semibold text-zinc-500 dark:text-zinc-400 uppercase tracking-wider border-r border-zinc-200 dark:border-zinc-800" style={{ height: '24px', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                                순작업일수
                              </th>
                              <th rowSpan={2} className="px-1 py-1 text-center text-xs font-semibold text-zinc-500 dark:text-zinc-400 uppercase tracking-wider border-r border-zinc-200 dark:border-zinc-800" style={{ height: '24px', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                                공정타입
                              </th>
                              <th rowSpan={2} className="px-1 py-1 text-center text-xs font-semibold text-zinc-500 dark:text-zinc-400 uppercase tracking-wider border-r border-zinc-200 dark:border-zinc-800" style={{ height: '24px', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                                세부공정
                              </th>
                            </Fragment>
                          )}
                        </tr>
                        {/* 하단 서브헤더 행: 형틀 세분화 */}
                        <tr className="border-b border-zinc-200 dark:border-zinc-800" style={{ height: '20px' }}>
                          <th className="px-0.5 py-0.5 text-center text-[10px] font-medium text-zinc-400 dark:text-zinc-500 border-r border-zinc-200 dark:border-zinc-800" style={{ whiteSpace: 'nowrap' }}>
                            합계
                          </th>
                          <th className="px-0.5 py-0.5 text-center text-[10px] font-medium text-zinc-400 dark:text-zinc-500 border-r border-zinc-200 dark:border-zinc-800" style={{ whiteSpace: 'nowrap' }}>
                            갱폼
                          </th>
                          <th className="px-0.5 py-0.5 text-center text-[10px] font-medium text-zinc-400 dark:text-zinc-500 border-r border-zinc-200 dark:border-zinc-800" style={{ whiteSpace: 'nowrap' }}>
                            알폼
                          </th>
                          <th className="px-0.5 py-0.5 text-center text-[10px] font-medium text-zinc-400 dark:text-zinc-500 border-r border-zinc-200 dark:border-zinc-800" style={{ whiteSpace: 'nowrap' }}>
                            유로폼
                          </th>
                        </tr>
                      </thead>
                      <tbody className="bg-white dark:bg-zinc-900 divide-y divide-zinc-200 dark:divide-zinc-800">
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

                                // processType 결정 (주동 지하층/옥탑층은 층별, 나머지는 카테고리별)
                                let processType: ProcessType;
                                if (row.floorLabel && (row.category === '주동 지하층' || row.category === '옥탑층' || isNormalFloor)) {
                                  processType = isNormalFloor
                                    ? getProcessTypeForFloor(plan, '옥탑층', row.floorLabel)
                                    : getProcessTypeForFloor(plan, row.category, row.floorLabel);
                                } else {
                                  processType = plan?.processes[row.category]?.processType || DEFAULT_PROCESS_TYPES[row.category];
                                }
                                const module = getProcessModule(effectiveCategory, processType);

                                // 일수 계산 - 세부공정의 순작업일 합계
                                let days = 0;
                                if (!module || !module.items || module.items.length === 0) {
                                  // 모듈이 없으면 기존 방식 사용
                                  if (row.category === '버림' || row.category === '기초') {
                                    days = plan?.processes[row.category]?.days || 0;
                                  } else if (row.category === '주동 지하층' && row.floorLabel) {
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
                                  } else if (row.category === '최상층' && row.floorLabel) {
                                    // 최상층은 자기 자신의 수량으로 계산
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
                                  else if (row.floorLabel && (row.category === '셋팅층' || row.category === '주동 지하층' || row.category === 'PH층' || row.category === '옥탑층' || row.category === '기준층' || row.category === '최상층' || isNormalFloor)) {
                                    // 해당 층의 항목만 필터링
                                    const floorItems = module.items.filter(item => {
                                      // 지하층의 경우 item.floorLabel과 row.floorLabel이 일치해야 함
                                      if (row.category === '주동 지하층') {
                                        return item.floorLabel === row.floorLabel;
                                      }
                                      // PH층의 경우 floorLabel이 없으면 모든 항목 포함 (일반층처럼 처리)
                                      if (row.category === 'PH층') {
                                        return !item.floorLabel || item.floorLabel === row.floorLabel;
                                      }
                                      // 옥탑층의 경우 옥탑1, 옥탑2 형식 처리
                                      if (row.category === '옥탑층') {
                                        if (!item.floorLabel) return true;
                                        if (!row.floorLabel) return true;
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
                                      // 최상층도 기준층과 동일 패턴 (자신의 층 항목 + 공통 항목)
                                      if (row.category === '최상층') {
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
                                      let firstStandardFloorLabel: string | undefined;
                                      if (row.category === '기준층') {
                                        const found = processRows.find(r => r.category === '기준층' && r.floorLabel);
                                        firstStandardFloorLabel = found?.floorLabel;
                                      }

                                      // 기준층인 경우: 현재 층의 오버라이드 값을 먼저 확인하고, 없으면 첫 번째 기준층의 오버라이드 값 확인
                                      let overriddenDays: number | undefined;
                                      if (row.category === '기준층') {
                                        // 먼저 현재 층의 오버라이드 값 확인
                                        const currentFloorKey = `기준층-${row.floorLabel}-${item.id}`;
                                        overriddenDays = plan?.itemDirectWorkDaysOverrides?.[currentFloorKey];

                                        // 현재 층에 오버라이드가 없으면 첫 번째 기준층의 오버라이드 값 확인
                                        if (overriddenDays === undefined && firstStandardFloorLabel) {
                                          const firstStandardFloorKey = `기준층-${firstStandardFloorLabel}-${item.id}`;
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
                                        if (refMatch && row.floorLabel) {
                                          const [, col] = refMatch;

                                          if (row.category === '주동 지하층') {
                                            // 지하층은 floorLabel 그대로 사용 (B1, B2 등)
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
                                          } else if (isNormalFloor && row.floorLabel) {
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
                                          } else if (row.category === '셋팅층' && row.floorLabel) {
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
                                          } else if (row.category === '최상층') {
                                            // 최상층은 자신의 층 수량 직접 사용 (기준층처럼 공유하지 않음)
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
                                            if (calculationFloorLabel) {
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
                                  if (row.category === '주동 지하층') {
                                    return '주동 지하층';
                                  }
                                  // 옥탑층인 경우 "옥탑층" 표시
                                  if (row.category === '옥탑층') {
                                    return '옥탑층';
                                  }
                                  // 기준층인 경우 "기준층" 표시
                                  if (row.category === '기준층') {
                                    return '기준층';
                                  }
                                  // 최상층인 경우 "최상층" 표시
                                  if (row.category === '최상층') {
                                    return '최상층';
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
                                  // 최상층도 개별 층 표시 (예: "15F")
                                  if (row.category === '최상층' && row.floorLabel) {
                                    return row.floorLabel;
                                  }
                                  // 나머지는 floorLabel 표시 (B2, B1, 1F, 옥탑1 등)
                                  return row.floorLabel || '';
                                };

                                // 물량 데이터 가져오기 - 공통 파라미터 해석
                                const resolveParams = () => {
                                  if (!row.floorLabel) return null;
                                  const rangeFloorId = row.category === '기준층' && row.floor?.floorLabel?.includes('~')
                                    ? row.floor.id
                                    : undefined;
                                  const quantityFloorLabel = (row.category === '옥탑층' || row.category === 'PH층') && row.floor
                                    ? row.floor.floorLabel.replace(/코어\d+-/, '')
                                    : row.floorLabel;
                                  return { quantityFloorLabel, rangeFloorId };
                                };

                                const getGangFormQty = () => {
                                  if (row.category === '버림' || row.category === '기초') {
                                    return building.floorTrades.filter(ft => ft.tradeGroup === row.category)
                                      .reduce((sum, t) => sum + (t.trades.gangForm?.areaM2 || 0), 0);
                                  }
                                  const p = resolveParams();
                                  return p ? getQuantityFromFloor(building, p.quantityFloorLabel, 'gangForm', 'areaM2', p.rangeFloorId) : 0;
                                };

                                const getAlFormQty = () => {
                                  if (row.category === '버림' || row.category === '기초') {
                                    return building.floorTrades.filter(ft => ft.tradeGroup === row.category)
                                      .reduce((sum, t) => sum + (t.trades.alForm?.areaM2 || 0), 0);
                                  }
                                  const p = resolveParams();
                                  return p ? getQuantityFromFloor(building, p.quantityFloorLabel, 'alForm', 'areaM2', p.rangeFloorId) : 0;
                                };

                                const getEuroFormQty = () => {
                                  if (row.category === '버림' || row.category === '기초') {
                                    return building.floorTrades.filter(ft => ft.tradeGroup === row.category)
                                      .reduce((sum, t) => sum + (t.trades.euroForm?.areaM2 || 0), 0);
                                  }
                                  const p = resolveParams();
                                  return p ? getQuantityFromFloor(building, p.quantityFloorLabel, 'euroForm', 'areaM2', p.rangeFloorId) : 0;
                                };

                                const getStripCleanQty = () => getEuroFormQty() * 2;

                                const getFormworkQuantity = () => {
                                  return getGangFormQty() + getAlFormQty() + getEuroFormQty();
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
                                    className={`border-b border-zinc-200 dark:border-zinc-800 hover:bg-zinc-50 dark:hover:bg-zinc-900/50 transition-colors duration-200 border-l-4 border-l-transparent ${isExpanded ? 'bg-accent-50 dark:bg-accent-900/20 border-l-accent-500 shadow-sm' : ''}`}
                                    style={{ height: '32px' }}
                                  >
                                    {/* 첫 번째 열: 구분 항목 */}
                                    <td className="px-2 py-1 text-xs font-semibold text-zinc-900 dark:text-white border-r border-zinc-200 dark:border-zinc-800 align-middle" style={{ height: '32px', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                                      <div className="text-center">{getCategoryLabel()}</div>
                                    </td>

                                    {/* 두 번째 열: 층수 */}
                                    <td className="px-2 py-1 text-xs font-semibold text-zinc-900 dark:text-white border-r border-zinc-200 dark:border-zinc-800 align-middle" style={{ height: '32px', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                                      <div className="text-center font-normal">{getFloorNumberLabel()}</div>
                                    </td>

                                    {/* 형틀 합계 */}
                                    <td className="relative px-0.5 py-1 text-center text-xs border-r border-zinc-200 dark:border-zinc-800 align-middle" style={{ height: '24px' }}>
                                      {getCellReferenceForRow(row.category, row.floorLabel, 'formworkTotal', maxFloorNumber) && (
                                        <span className="absolute top-0 left-0.5 pointer-events-none select-none text-[8px] font-mono leading-none text-blue-400/70 dark:text-blue-500/50" aria-hidden="true">
                                          {getCellReferenceForRow(row.category, row.floorLabel, 'formworkTotal', maxFloorNumber)}
                                        </span>
                                      )}
                                      <div className="text-xs font-medium">
                                        {getFormworkQuantity() > 0 ? getFormworkQuantity().toFixed(2) : '0.00'}
                                      </div>
                                    </td>
                                    {/* 갱폼 */}
                                    <td className="relative px-0.5 py-1 text-center text-xs border-r border-zinc-200 dark:border-zinc-800 align-middle" style={{ height: '24px' }}>
                                      {getCellReferenceForRow(row.category, row.floorLabel, 'gangForm', maxFloorNumber) && (
                                        <span className="absolute top-0 left-0.5 pointer-events-none select-none text-[8px] font-mono leading-none text-blue-400/70 dark:text-blue-500/50" aria-hidden="true">
                                          {getCellReferenceForRow(row.category, row.floorLabel, 'gangForm', maxFloorNumber)}
                                        </span>
                                      )}
                                      <div className="text-xs text-zinc-500 dark:text-zinc-400">
                                        {getGangFormQty() > 0 ? getGangFormQty().toFixed(2) : '0.00'}
                                      </div>
                                    </td>
                                    {/* 알폼 */}
                                    <td className="relative px-0.5 py-1 text-center text-xs border-r border-zinc-200 dark:border-zinc-800 align-middle" style={{ height: '24px' }}>
                                      {getCellReferenceForRow(row.category, row.floorLabel, 'alForm', maxFloorNumber) && (
                                        <span className="absolute top-0 left-0.5 pointer-events-none select-none text-[8px] font-mono leading-none text-blue-400/70 dark:text-blue-500/50" aria-hidden="true">
                                          {getCellReferenceForRow(row.category, row.floorLabel, 'alForm', maxFloorNumber)}
                                        </span>
                                      )}
                                      <div className="text-xs text-zinc-500 dark:text-zinc-400">
                                        {getAlFormQty() > 0 ? getAlFormQty().toFixed(2) : '0.00'}
                                      </div>
                                    </td>
                                    {/* 유로폼 */}
                                    <td className="relative px-0.5 py-1 text-center text-xs border-r border-zinc-200 dark:border-zinc-800 align-middle" style={{ height: '24px' }}>
                                      {getCellReferenceForRow(row.category, row.floorLabel, 'euroForm', maxFloorNumber) && (
                                        <span className="absolute top-0 left-0.5 pointer-events-none select-none text-[8px] font-mono leading-none text-blue-400/70 dark:text-blue-500/50" aria-hidden="true">
                                          {getCellReferenceForRow(row.category, row.floorLabel, 'euroForm', maxFloorNumber)}
                                        </span>
                                      )}
                                      <div className="text-xs text-zinc-500 dark:text-zinc-400">
                                        {getEuroFormQty() > 0 ? getEuroFormQty().toFixed(2) : '0.00'}
                                      </div>
                                    </td>

                                    {/* 해체/정리 (유로폼 × 2, 읽기전용) */}
                                    <td className="relative px-0.5 py-1 text-center text-xs border-r border-zinc-200 dark:border-zinc-800 align-middle" style={{ height: '24px' }}>
                                      {getCellReferenceForRow(row.category, row.floorLabel, 'stripClean', maxFloorNumber) && (
                                        <span className="absolute top-0 left-0.5 pointer-events-none select-none text-[8px] font-mono leading-none text-blue-400/70 dark:text-blue-500/50" aria-hidden="true">
                                          {getCellReferenceForRow(row.category, row.floorLabel, 'stripClean', maxFloorNumber)}
                                        </span>
                                      )}
                                      <div className="text-xs text-zinc-500 dark:text-zinc-400">
                                        {getStripCleanQty() > 0 ? getStripCleanQty().toFixed(2) : '0.00'}
                                      </div>
                                    </td>

                                    {/* 네 번째 열: 철근 */}
                                    <td className="relative px-1 py-1 text-center text-xs border-r border-zinc-200 dark:border-zinc-800 align-middle" style={{ height: '24px' }}>
                                      {getCellReferenceForRow(row.category, row.floorLabel, 'rebar', maxFloorNumber) && (
                                        <span className="absolute top-0 left-0.5 pointer-events-none select-none text-[8px] font-mono leading-none text-blue-400/70 dark:text-blue-500/50" aria-hidden="true">
                                          {getCellReferenceForRow(row.category, row.floorLabel, 'rebar', maxFloorNumber)}
                                        </span>
                                      )}
                                      <div className="text-xs">
                                        {getRebarQuantity() > 0 ? getRebarQuantity().toFixed(2) : '0.00'}
                                      </div>
                                    </td>

                                    {/* 다섯 번째 열: 콘크리트 */}
                                    <td className="relative px-1 py-1 text-center text-xs border-r-2 border-zinc-200 dark:border-zinc-800 align-middle" style={{ height: '24px' }}>
                                      {getCellReferenceForRow(row.category, row.floorLabel, 'concrete', maxFloorNumber) && (
                                        <span className="absolute top-0 left-0.5 pointer-events-none select-none text-[8px] font-mono leading-none text-blue-400/70 dark:text-blue-500/50" aria-hidden="true">
                                          {getCellReferenceForRow(row.category, row.floorLabel, 'concrete', maxFloorNumber)}
                                        </span>
                                      )}
                                      <div className="text-xs">
                                        {getConcreteQuantity() > 0 ? getConcreteQuantity().toFixed(2) : '0.00'}
                                      </div>
                                    </td>

                                    {/* 여섯 번째 열: 일수 */}
                                    <td className="px-1 py-1 text-center border-r border-zinc-200 dark:border-zinc-800 align-middle" style={{ height: '24px' }}>
                                      <div className="w-full px-1 py-0.5 text-xs text-center border border-zinc-300 dark:border-zinc-700 rounded bg-zinc-100 dark:bg-zinc-900 text-zinc-900 dark:text-white">
                                        {days}
                                      </div>
                                    </td>

                                    {/* 일곱 번째 열: 셀렉트박스 */}
                                    <td className="px-1 py-1 border-r border-zinc-200 dark:border-zinc-800 align-middle" style={{ height: '24px' }}>
                                      {/* 일반 지하층 행은 항상 표준공정 드롭다운 표시 */}
                                      <select
                                        value={processType}
                                        onChange={(e) => {
                                          // 일반층인 경우 옥탑층 카테고리로 저장
                                          const targetCategory = isNormalFloor ? '옥탑층' : row.category;
                                          handleProcessTypeChange(building.id, targetCategory, e.target.value as ProcessType, row.floorLabel);
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
                                    <td className="px-1 py-1 border-r border-zinc-200 dark:border-zinc-800 align-middle" style={{ height: '24px' }}>
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
                                  </tr>
                                );
                              })}

                              {/* 합계 행 - 첫 번째 공정 열의 첫 번째 칸에만 표시 */}
                              <tr className="border-t-2 border-zinc-300 dark:border-zinc-700 bg-zinc-100 dark:bg-zinc-800" style={{ height: '24px' }}>
                                {/* 구분 항목 열 */}
                                <td className="px-2 py-1 text-center text-xs font-semibold text-zinc-900 dark:text-white border-r border-zinc-200 dark:border-zinc-800 align-middle" style={{ height: '24px' }}>
                                  합계
                                </td>
                                {/* 층수 열 */}
                                <td className="px-2 py-1 text-center text-xs border-r border-zinc-200 dark:border-zinc-800 align-middle" style={{ height: '24px' }}></td>
                                {/* 형틀 합계 열 */}
                                <td className="px-1 py-1 text-center text-xs border-r border-zinc-200 dark:border-zinc-800 align-middle" style={{ height: '24px' }}></td>
                                {/* 갱폼 열 */}
                                <td className="px-1 py-1 text-center text-xs border-r border-zinc-200 dark:border-zinc-800 align-middle" style={{ height: '24px' }}></td>
                                {/* 알폼 열 */}
                                <td className="px-1 py-1 text-center text-xs border-r border-zinc-200 dark:border-zinc-800 align-middle" style={{ height: '24px' }}></td>
                                {/* 유로폼 열 */}
                                <td className="px-1 py-1 text-center text-xs border-r border-zinc-200 dark:border-zinc-800 align-middle" style={{ height: '24px' }}></td>
                                {/* 해체/정리 열 */}
                                <td className="px-1 py-1 text-center text-xs border-r border-zinc-200 dark:border-zinc-800 align-middle" style={{ height: '24px' }}></td>
                                {/* 철근 열 */}
                                <td className="px-1 py-1 text-center text-xs border-r border-zinc-200 dark:border-zinc-800 align-middle" style={{ height: '24px' }}></td>
                                {/* 콘크리트 열 */}
                                <td className="px-1 py-1 text-center text-xs border-r-2 border-zinc-200 dark:border-zinc-800 align-middle" style={{ height: '24px' }}></td>
                                {processColumns.length > 0 && (
                                  <>
                                    {/* 순작업일수 열에 합계 표시 */}
                                    <td className="px-1 py-1 text-center text-xs font-semibold text-zinc-900 dark:text-white border-r border-zinc-200 dark:border-zinc-800 align-middle" style={{ height: '24px' }}>
                                      {plan ? calculateTotalDays(plan.processes, building) : 0}
                                    </td>
                                    {/* 공정타입 열 (빈칸) */}
                                    <td className="px-1 py-1 border-r border-zinc-200 dark:border-zinc-800 align-middle" style={{ height: '24px' }}></td>
                                    {/* 세부공정 열 (빈칸) */}
                                    <td className="px-1 py-1 border-r border-zinc-200 dark:border-zinc-800 align-middle" style={{ height: '24px' }}></td>
                                  </>
                                )}
                              </tr>
                            </Fragment>
                          );
                        })()}
                      </tbody>
                    </table>
                  </div>
                </div>

                {/* 우측: 패널 카드 */}
                <div className="w-[320px] flex-shrink-0 rounded-lg shadow-lg border-2 border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-950 overflow-hidden">
                  {/* 패널 헤더 */}
                  <div className="bg-zinc-100 dark:bg-zinc-900 px-4 py-3 border-b border-zinc-200 dark:border-zinc-800">
                    <h3 className="font-semibold text-sm text-zinc-900 dark:text-zinc-100">
                      세부공정 정보
                    </h3>
                  </div>

                  {/* 패널 콘텐츠 */}
                  <div className="p-4">
                    <div className="sticky top-4 overflow-y-auto space-y-4 text-xs" style={{ maxHeight: 'calc(100vh - 260px)', minHeight: '300px' }}>
                      {(() => {
                        const building = activeBuilding;
                        const plan = processPlans.get(building!.id);
                        const isDetailExpanded = expandedModules.get(building!.id) || new Set<string>();

                        // 확장된 행 찾기
                        const expandedRow = processRows.find((col) => {
                          const expandKey = col.floorLabel
                            ? `${col.category}-${col.floorLabel}`
                            : col.category === '기준층'
                              ? '기준층-세부공정'
                              : col.category;
                          return isDetailExpanded.has(expandKey);
                        });

                        // 확장된 행이 없으면 안내 메시지
                        if (!expandedRow) {
                          return (
                            <div className="flex flex-col items-center justify-center h-full text-zinc-400 dark:text-zinc-500">
                              <Info className="w-6 h-6 mb-2" />
                              <p className="text-xs text-center">
                                세부공정 버튼을 클릭하여<br />상세 정보를 확인하세요
                              </p>
                            </div>
                          );
                        }

                        // 공정 타입과 모듈 결정
                        const expandedProcessType = plan?.processes[expandedRow?.category || '버림']?.processType || DEFAULT_PROCESS_TYPES[expandedRow?.category || '버림'] || '표준공정';
                        const expandedModule = expandedRow ? (getProcessModule(expandedRow.category, expandedProcessType) || null) : null;

                        // 카테고리명 표시
                        const getCategoryDisplayName = () => {
                          if (!expandedRow) return '';
                          if (expandedRow.category === '버림' || expandedRow.category === '기초') {
                            return expandedRow.category;
                          }
                          if (expandedRow.category === '기준층') {
                            return '기준층';
                          }
                          if (expandedRow.category === '최상층') {
                            return '최상층';
                          }
                          if (expandedRow.floorLabel) {
                            return `${expandedRow.category} ${expandedRow.floorLabel}`;
                          }
                          return expandedRow.category;
                        };

                        return (
                          <div className="space-y-4">
                            {/* 헤더 */}
                            <div className="border-l-4 border-accent-500 pl-4 bg-accent-50 dark:bg-accent-900/20 py-3 rounded">
                              <div className="flex items-center gap-2 mb-2">
                                <h4 className="text-sm font-bold text-zinc-900 dark:text-white">
                                  {getCategoryDisplayName()} 상세 공정
                                </h4>
                              </div>
                              <p className="text-xs text-zinc-600 dark:text-zinc-400">
                                세부 공종별 계획 정보
                              </p>
                            </div>

                            {/* ProcessDetailPanel 본문 */}
                            <ProcessDetailPanel
                              building={building!}
                              expandedRow={expandedRow || null}
                              module={expandedModule}
                              plan={plan}
                              processRows={processRows}
                              onDirectWorkDaysChange={(itemKey, value) => handleItemDirectWorkDaysChange(building!, itemKey, value)}
                              specialRowQuantities={plan?.specialRowQuantities}
                            />


                          </div>
                        );
                      })()}
                    </div>
                  </div>
                </div>
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
                지상층 공정계획을 입력하려면 먼저 <br />
                <span className="font-medium text-primary-600 dark:text-primary-400">"동 기본정보"</span> 탭에서 동을 생성해주세요.
              </p>
            </div>
          </div>
        </Card>
      )}

    </div>
  );
}
