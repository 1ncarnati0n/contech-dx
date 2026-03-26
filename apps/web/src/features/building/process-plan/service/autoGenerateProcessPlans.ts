import type { Building, BuildingProcessPlan, ProcessCategory } from '@/shared/types';
import { getProcessModule } from '@/features/building/data/process-modules';
import { calculateModuleWorkDays } from './process-days-calculator';
import { getBuildings } from '@/features/building/shared/repository/buildings';
import { saveProcessPlan } from '@/features/building/shared/repository/SupabaseBuildingDataService';

/**
 * 전체 공정 카테고리 (지하 + 지상)
 */
const ALL_CATEGORIES: ProcessCategory[] = [
  '버림', '기초', '주동 지하층',
  '셋팅층', '기준층', '옥탑층', '일반층',
];

const DEFAULT_PROCESS_TYPE = '표준공정' as const;

/**
 * 단일 동의 공정계획을 자동 생성합니다.
 *
 * 동의 물량 데이터(floorTrades)와 기본 공정모듈(PROCESS_MODULES)을 사용하여
 * 각 카테고리별 작업일수를 자동 계산합니다.
 */
export function generateProcessPlanForBuilding(
  building: Building,
  projectId: string,
): BuildingProcessPlan {
  const processes: BuildingProcessPlan['processes'] = {};
  let totalDays = 0;

  for (const category of ALL_CATEGORIES) {
    const mod = getProcessModule(category, DEFAULT_PROCESS_TYPE);
    if (!mod) {
      processes[category] = { days: 0, processType: DEFAULT_PROCESS_TYPE };
      continue;
    }

    const days = calculateModuleWorkDays(building, mod, category);
    processes[category] = { days, processType: DEFAULT_PROCESS_TYPE };
    totalDays += days;
  }

  return {
    id: `plan-${building.id}`,
    buildingId: building.id,
    projectId,
    processes,
    totalDays,
  };
}

export interface AutoGenerateResult {
  totalBuildings: number;
  generatedCount: number;
  skippedCount: number;
  errors: string[];
}

/**
 * 프로젝트의 모든 동에 대해 공정계획을 자동 생성하고 DB에 저장합니다.
 *
 * 물량 데이터가 없는 동(floorTrades가 비어있는 경우)은 건너뜁니다.
 */
export async function autoGenerateAllProcessPlans(
  projectId: string,
): Promise<AutoGenerateResult> {
  const buildings = await getBuildings(projectId);

  const result: AutoGenerateResult = {
    totalBuildings: buildings.length,
    generatedCount: 0,
    skippedCount: 0,
    errors: [],
  };

  for (const building of buildings) {
    // 물량 데이터가 없는 동은 건너뜀
    if (!building.floorTrades || building.floorTrades.length === 0) {
      result.skippedCount++;
      continue;
    }

    try {
      const plan = generateProcessPlanForBuilding(building, projectId);

      // totalDays가 0이면 의미 없으므로 건너뜀
      if (plan.totalDays === 0) {
        result.skippedCount++;
        continue;
      }

      await saveProcessPlan(plan);
      result.generatedCount++;
    } catch (error) {
      const name = building.buildingName || building.id;
      result.errors.push(`${name}: ${error instanceof Error ? error.message : '알 수 없는 오류'}`);
    }
  }

  return result;
}
