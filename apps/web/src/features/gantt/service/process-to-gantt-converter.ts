/**
 * 공정계획 → 간트차트 컨버터
 *
 * BuildingProcessPlan 데이터를 ConstructionTask[] 형태로 변환하여
 * 기존 간트차트 데이터에 추가(append)할 수 있는 형식을 생성합니다.
 *
 * 계층구조: BLOCK (동) → CP (카테고리) → GROUP (층) → TASK (항목)
 *
 * 핵심: floorDetails.items가 없으면 on-the-fly로 항목별 물량/일수/인원을 계산합니다.
 * Building + ProcessModule 데이터에서 직접 계산하므로 미리 저장할 필요 없음.
 */

import { addDays } from 'date-fns';
import type {
  ConstructionTask,
  TaskData,
  CalendarSettings,
} from 'sa-gantt-lib';
import {
  generateId,
  addWorkingDays,
  addCalendarDays,
  KOREAN_HOLIDAYS_ALL,
} from 'sa-gantt-lib';
import type {
  Building,
  BuildingProcessPlan,
  ProcessCategory,
  ProcessType,
  FloorProcessDetails,
} from '@/shared/types';
import { getProcessModule } from '@/features/building/data/process-modules';
import type { ProcessItem, ProcessModule } from '@/features/building/data/process-modules';
import { filterItemsForFloor, resolveFloorQuantity } from '@/features/building/process-plan/service/process-days-calculator';
import {
  getSpecialRowDeductions,
  resolveWithDeduction,
  type DeductionFields,
} from '@/features/building/process-plan/service/process-quantity-resolver';
import { parseLegacyReference } from '@/features/building/process-plan/service/quantity-reference-migration';
import {
  calculateTotalWorkers,
  calculateDailyInputWorkers,
  calculateWorkDaysWithRounding,
  calculateEquipmentCount,
  calculateDailyInputWorkersByEquipment,
} from '@/features/building/process-plan/service/process-calculation';

// ============================================
// 타입 정의
// ============================================

export interface ProcessToGanttOptions {
  buildings: Building[];
  processPlans: Map<string, BuildingProcessPlan>;
  projectStartDate: Date;
  holidays?: Date[];
  calendarSettings?: CalendarSettings;
}

export interface ConversionResult {
  tasks: ConstructionTask[];
  summary: {
    buildingCount: number;
    totalTaskCount: number;
    taskCountByBuilding: Record<string, number>;
  };
}

/** computeFloorItems가 반환하는 항목 데이터 */
interface ComputedFloorItem {
  itemId: string;
  workItem: string;
  quantity: number;
  directWorkDays: number;
  dailyInputWorkers: number;
}

interface SpecialRowQuantities {
  gangForm?: number;
  alForm?: number;
  formwork?: number;
  rebar?: number;
  concrete?: number;
}

// ============================================
// 상수
// ============================================

/** 카테고리 시공 순서 (버림 → 기초 → 지하 → 지하주차장 → ... → 옥탑) */
export const CATEGORY_ORDER: ProcessCategory[] = [
  '버림',
  '기초',
  '주동 지하층',
  '지하층(층고6.5m이상)',
  '지하주차장',
  '일반층',
  '셋팅층',
  '기준층',
  '최상층',
  '옥탑층',
];

/** 동일 시작일로 병렬 배치되는 지하 카테고리 */
const PARALLEL_UNDERGROUND_CATEGORIES = new Set<ProcessCategory>([
  '주동 지하층',
  '지하층(층고6.5m이상)',
  '지하주차장',
]);

const DEFAULT_CALENDAR_SETTINGS: CalendarSettings = {
  workOnSaturdays: true,
  workOnSundays: false,
  workOnHolidays: false,
};

// ============================================
// 메인 변환 함수
// ============================================

/**
 * 전체 동의 공정계획을 간트차트 태스크로 변환
 */
export function convertProcessPlansToGanttTasks(
  options: ProcessToGanttOptions
): ConversionResult {
  const {
    buildings,
    processPlans,
    projectStartDate,
    holidays = KOREAN_HOLIDAYS_ALL,
    calendarSettings = DEFAULT_CALENDAR_SETTINGS,
  } = options;

  const allTasks: ConstructionTask[] = [];
  const taskCountByBuilding: Record<string, number> = {};

  for (const building of buildings) {
    const plan = processPlans.get(building.id);
    if (!plan) continue;

    const buildingTasks = convertBuildingPlan(
      building,
      plan,
      projectStartDate,
      holidays,
      calendarSettings
    );

    allTasks.push(...buildingTasks);
    taskCountByBuilding[building.buildingName] = buildingTasks.length;
  }

  return {
    tasks: allTasks,
    summary: {
      buildingCount: buildings.length,
      totalTaskCount: allTasks.length,
      taskCountByBuilding,
    },
  };
}

// ============================================
// 동별 변환 로직
// ============================================

/**
 * 단일 동의 공정계획을 간트차트 태스크 배열로 변환
 */
function convertBuildingPlan(
  building: Building,
  plan: BuildingProcessPlan,
  projectStartDate: Date,
  holidays: Date[],
  calendarSettings: CalendarSettings
): ConstructionTask[] {
  const tasks: ConstructionTask[] = [];

  // 구조체 시작일 = 프로젝트 시작일 + (가설 + 흙막이 + 토공사)
  const preWorkDays =
    (plan.temporaryWorkDays || 0) +
    (plan.earthRetentionWorkDays || 0) +
    (plan.earthworkWorkDays || 0);
  const structureStartDate =
    preWorkDays > 0
      ? addDays(projectStartDate, preWorkDays)
      : new Date(projectStartDate);

  // BLOCK 태스크 (동)
  const blockId = generateId();
  const blockTask: ConstructionTask = {
    id: blockId,
    parentId: null,
    wbsLevel: 1,
    type: 'BLOCK',
    name: building.buildingName,
    startDate: structureStartDate,
    endDate: structureStartDate, // CP 생성 후 업데이트
    dependencies: [],
    isExpanded: true,
  };
  tasks.push(blockTask);

  // 각 카테고리별 CP/GROUP/TASK 생성
  let currentDate = new Date(structureStartDate);
  let parallelStartDate: Date | null = null;
  let parallelEndDates: Date[] = [];

  for (const category of CATEGORY_ORDER) {
    const categoryFloorLabels = getImportFloorLabelsForCategory(building, plan, category);

    if (
      (category === '지하주차장' || category === '지하층(층고6.5m이상)') &&
      categoryFloorLabels.length === 0
    ) {
      continue;
    }

    let processInfo = plan.processes[category];

    if (categoryFloorLabels.length === 0 && !processInfo) {
      continue;
    }

    if (!processInfo) {
      // 특수행 기반 카테고리는 processInfo가 없어도 활성 행이 있으면 기본 타입으로 변환 허용
      const canUseSpecialRowFallback =
        (category === '지하주차장' || category === '지하층(층고6.5m이상)') &&
        categoryFloorLabels.length > 0;

      if (!canUseSpecialRowFallback) continue;
      processInfo = { days: 0, processType: '표준공정' as ProcessType };
    }

    if (PARALLEL_UNDERGROUND_CATEGORIES.has(category)) {
      // 병렬 지하 카테고리: 동일 시작일 사용
      if (!parallelStartDate) {
        parallelStartDate = new Date(currentDate);
      }

      const cpResult = convertCategory(
        building,
        plan,
        category,
        processInfo,
        categoryFloorLabels,
        blockId,
        parallelStartDate,
        holidays,
        calendarSettings
      );

      if (cpResult.tasks.length > 0) {
        tasks.push(...cpResult.tasks);
        if (cpResult.endDate) {
          parallelEndDates.push(cpResult.endDate);
        }
      }
      // currentDate 업데이트 안 함 (병렬이므로)
    } else {
      // 병렬 그룹 직후 → 최대 종료일로 currentDate 갱신
      if (parallelEndDates.length > 0) {
        const maxEndDate = new Date(
          Math.max(...parallelEndDates.map(d => d.getTime()))
        );
        currentDate = addDays(maxEndDate, 1);
        parallelEndDates = [];
        parallelStartDate = null;
      }

      const cpResult = convertCategory(
        building,
        plan,
        category,
        processInfo,
        categoryFloorLabels,
        blockId,
        currentDate,
        holidays,
        calendarSettings
      );

      if (cpResult.tasks.length > 0) {
        tasks.push(...cpResult.tasks);
        if (cpResult.endDate) {
          currentDate = addDays(cpResult.endDate, 1);
        }
      }
    }
  }

  // BLOCK 날짜 업데이트 (자식 CP들의 범위)
  updateParentDates(blockTask, tasks.filter((t) => t.parentId === blockId));

  return tasks;
}

// ============================================
// 카테고리별 변환 (CP 레벨)
// ============================================

interface CategoryResult {
  tasks: ConstructionTask[];
  endDate: Date | null;
}

function convertCategory(
  building: Building,
  plan: BuildingProcessPlan,
  category: ProcessCategory,
  processInfo: NonNullable<BuildingProcessPlan['processes'][ProcessCategory]>,
  categoryFloorLabels: string[],
  blockId: string,
  startDate: Date,
  holidays: Date[],
  calendarSettings: CalendarSettings
): CategoryResult {
  const tasks: ConstructionTask[] = [];

  // CP 태스크 생성
  const cpId = generateId();
  const cpTask: ConstructionTask = {
    id: cpId,
    parentId: blockId,
    wbsLevel: 1,
    type: 'CP',
    name: category,
    startDate: new Date(startDate),
    endDate: new Date(startDate),
    cp: {
      workDaysTotal: processInfo.days || 0,
      nonWorkDaysTotal: 0,
    },
    dependencies: [],
    isExpanded: true,
  };
  tasks.push(cpTask);

  // 층 목록 결정:
  // building.floors + floorDetails + floors(층별 타입 오버라이드) 병합
  // 기준층 범위 라벨이 포함된 경우에도 개별 층으로 전개해 GROUP 누락/통합을 방지
  const detailLabels = Object.keys(processInfo.floorDetails || {}).filter(Boolean);
  const floorTypeLabels = Object.keys(processInfo.floors || {}).filter(Boolean);
  const merged = new Set([
    ...categoryFloorLabels,
    ...expandFloorLabels(detailLabels),
    ...expandFloorLabels(floorTypeLabels),
  ]);
  const floorLabels = merged.size > 0
    ? [...merged].sort(
      (a, b) => getFloorSortNumber(a, building) - getFloorSortNumber(b, building)
    )
    : categoryFloorLabels;

  if (floorLabels.length > 0) {
    let floorStartDate = new Date(startDate);

    for (const floorLabel of floorLabels) {
      const floorDetail = processInfo.floorDetails?.[floorLabel];

      const groupResult = convertFloorGroup(
        building,
        plan,
        category,
        processInfo,
        floorLabel,
        floorDetail || null,
        cpId,
        floorStartDate,
        holidays,
        calendarSettings
      );

      tasks.push(...groupResult.tasks);
      if (groupResult.endDate) {
        floorStartDate = addDays(groupResult.endDate, 1);
      }
    }
  }

  // CP 날짜 업데이트
  const childTasks = tasks.filter((t) => t.parentId === cpId);
  if (childTasks.length > 0) {
    updateParentDates(cpTask, childTasks);
  } else if (processInfo.days > 0) {
    // GROUP/TASK가 없지만 days가 있는 경우 (버림, 기초 등)
    cpTask.endDate = addCalendarDays(startDate, processInfo.days);
  }

  // CP 일수는 항상 세부 TASK 합산(순작업일/간접작업일 분리)으로 정규화
  const taskTotals = tasks
    .filter((t) => t.type === 'TASK' && t.task)
    .reduce(
      (acc, t) => {
        const net = t.task?.netWorkDays ?? 0;
        const indirect =
          (t.task?.indirectWorkDaysPre ?? 0) +
          (t.task?.indirectWorkDaysPost ?? 0);
        return {
          netWorkDays: acc.netWorkDays + net,
          indirectWorkDays: acc.indirectWorkDays + indirect,
        };
      },
      { netWorkDays: 0, indirectWorkDays: 0 }
    );

  if (taskTotals.netWorkDays > 0 || taskTotals.indirectWorkDays > 0) {
    cpTask.cp = {
      workDaysTotal: taskTotals.netWorkDays,
      nonWorkDaysTotal: taskTotals.indirectWorkDays,
    };
  }

  return {
    tasks,
    endDate: cpTask.endDate,
  };
}

// ============================================
// 층별 GROUP/TASK 변환
// ============================================

interface FloorGroupResult {
  tasks: ConstructionTask[];
  endDate: Date | null;
}

function convertFloorGroup(
  building: Building,
  plan: BuildingProcessPlan,
  category: ProcessCategory,
  processInfo: NonNullable<BuildingProcessPlan['processes'][ProcessCategory]>,
  floorLabel: string,
  floorDetail: FloorProcessDetails | null,
  cpId: string,
  startDate: Date,
  holidays: Date[],
  calendarSettings: CalendarSettings
): FloorGroupResult {
  const tasks: ConstructionTask[] = [];

  // GROUP 태스크 (층)
  const groupId = generateId();
  const groupTask: ConstructionTask = {
    id: groupId,
    parentId: cpId,
    wbsLevel: 2,
    type: 'GROUP',
    name: floorLabel || category,
    startDate: new Date(startDate),
    endDate: new Date(startDate),
    group: { progress: 0 },
    dependencies: [],
    isExpanded: false,
  };
  tasks.push(groupTask);

  // 해당 층의 processType 결정
  const floorProcessType = getFloorProcessType(plan, category, processInfo, floorLabel);
  const mod = getProcessModule(category, floorProcessType);

  if (!mod) {
    return { tasks, endDate: startDate };
  }

  // floorDetail.items가 있으면 기존 데이터, 없으면 on-the-fly 계산
  const items = (floorDetail?.items && floorDetail.items.length > 0)
    ? floorDetail.items
    : computeFloorItems(building, mod, plan, category, floorLabel);

  if (!items || items.length === 0) {
    return { tasks, endDate: startDate };
  }

  // 각 TASK의 날짜를 순차 스케줄링
  const taskEndDate = scheduleTasksSequentially(
    tasks,
    groupId,
    items,
    mod.items,
    plan,
    category,
    floorLabel,
    startDate,
    holidays,
    calendarSettings
  );

  // GROUP 날짜 업데이트
  const childTasks = tasks.filter((t) => t.parentId === groupId);
  if (childTasks.length > 0) {
    updateParentDates(groupTask, childTasks);
  }

  return {
    tasks,
    endDate: taskEndDate || groupTask.endDate,
  };
}

// ============================================
// On-the-fly 항목 계산
// ============================================

/**
 * 한 층의 세부공정 항목들을 on-the-fly로 계산
 *
 * process-days-calculator.ts의 calculateModuleWorkDaysForFloor와 동일한 로직이지만,
 * 합산 대신 개별 항목 데이터를 반환합니다.
 */
function computeFloorItems(
  building: Building,
  module: ProcessModule,
  plan: BuildingProcessPlan,
  category: ProcessCategory,
  floorLabel: string
): ComputedFloorItem[] {
  const results: ComputedFloorItem[] = [];
  const normalizedFloorLabel = normalizeFloorLabelForCalculation(category, floorLabel);
  const deductionFields = getDeductionFieldsForBasement(
    plan,
    category,
    normalizedFloorLabel
  );
  const specialRowQuantities = getSpecialRowQuantitiesForCategory(
    plan,
    category,
    floorLabel
  );

  // 카테고리별 항목 필터링 (process-days-calculator에서 재사용)
  const filteredItems = filterItemsForFloor(
    module.items,
    category,
    normalizedFloorLabel
  );
  const maxPumpCarCount = building.meta?.pumpCarCount || 2;

  for (const item of filteredItems) {
    let directWorkDays = 0;
    let dailyInputWorkers = 0;

    const quantity = resolveQuantityForFloorItem(
      building,
      item,
      plan,
      category,
      floorLabel,
      normalizedFloorLabel,
      specialRowQuantities,
      deductionFields
    );

    // 3-way 계산 로직 (process-days-calculator.ts:136-181 동일)
    if (item.directWorkDays !== undefined) {
      // 1. 고정일수 항목
      directWorkDays = item.directWorkDays;
      dailyInputWorkers = 1;
    } else if (
      item.equipmentCalculationBase !== undefined &&
      item.equipmentWorkersPerUnit !== undefined &&
      (item.quantityRef || item.quantityReference)
    ) {
      // 2. 장비기반 계산
      if (quantity > 0 && item.dailyProductivity > 0) {
        const equipCount = calculateEquipmentCount(
          quantity,
          item.equipmentCalculationBase,
          maxPumpCarCount
        );
        dailyInputWorkers = calculateDailyInputWorkersByEquipment(
          equipCount,
          item.equipmentWorkersPerUnit
        );
        if (dailyInputWorkers > 0) {
          directWorkDays = calculateWorkDaysWithRounding(
            quantity,
            item.dailyProductivity,
            dailyInputWorkers
          );
        }
      }
    } else if (
      (item.quantityRef || item.quantityReference) &&
      item.dailyProductivity > 0
    ) {
      // 3. 수량기반 계산
      if (quantity > 0) {
        const totalWkrs = calculateTotalWorkers(quantity, item.dailyProductivity);
        dailyInputWorkers = calculateDailyInputWorkers(totalWkrs, item.equipmentCount);
        directWorkDays = calculateWorkDaysWithRounding(
          quantity,
          item.dailyProductivity,
          dailyInputWorkers
        );
      }
    }

    // 오버라이드 적용
    const overrideKey = `${category}-${floorLabel}-${item.id}`;
    directWorkDays = plan.itemDirectWorkDaysOverrides?.[overrideKey] ?? directWorkDays;

    // directWorkDays가 0이면 스킵 (물량 없는 항목)
    if (directWorkDays <= 0 && quantity <= 0) continue;

    results.push({
      itemId: item.id,
      workItem: item.workItem,
      quantity,
      directWorkDays,
      dailyInputWorkers,
    });
  }

  return results;
}

/**
 * 범위 형식 층 라벨(예: "7~11F 기준층")을 개별 라벨(["7F","8F",...,"11F"])로 분해
 * 개별 라벨(예: "6F")은 그대로 통과
 */
function expandFloorLabels(labels: string[]): string[] {
  const result: string[] = [];
  const seen = new Set<number>();
  const seenLabels = new Set<string>();

  const pushUniqueLabel = (value: string) => {
    if (seenLabels.has(value)) return;
    seenLabels.add(value);
    result.push(value);
  };

  for (const label of labels) {
    const cleanLabel = label.replace(/코어\d+-/, '').trim();
    const normalizedLabel = cleanLabel.replace(/\s+/g, '');

    if (!normalizedLabel) continue;

    const basementMatch = normalizedLabel.match(/^B(\d+)$/i);
    if (basementMatch) {
      pushUniqueLabel(`B${basementMatch[1]}`);
      continue;
    }

    const basementParkingMatch = normalizedLabel.match(/^B(\d+)(주차장)$/);
    if (basementParkingMatch) {
      pushUniqueLabel(`B${basementParkingMatch[1]} 주차장`);
      continue;
    }

    const basementHighCeilingMatch = normalizedLabel.match(/^B(\d+)(6\.5m이상)$/i);
    if (basementHighCeilingMatch) {
      pushUniqueLabel(`B${basementHighCeilingMatch[1]} 6.5m이상`);
      continue;
    }

    const phMatch = cleanLabel.match(/^PH(\d+)$/i);
    if (phMatch) {
      pushUniqueLabel(`옥탑${phMatch[1]}층`);
      continue;
    }

    const rooftopMatch = cleanLabel.match(/^옥탑\s*(\d+)(층)?$/);
    if (rooftopMatch) {
      pushUniqueLabel(`옥탑${rooftopMatch[1]}층`);
      continue;
    }

    const rangeMatch = normalizedLabel.match(/(\d+)\s*[~-]\s*(\d+)(?:F|층)/i);

    if (rangeMatch) {
      const start = parseInt(rangeMatch[1], 10);
      const end = parseInt(rangeMatch[2], 10);
      for (let i = start; i <= end; i++) {
        if (!seen.has(i)) {
          seen.add(i);
          result.push(`${i}F`);
        }
      }
    } else {
      const numMatch = normalizedLabel.match(/(\d+)(?:F|층)/i);
      if (numMatch) {
        const num = parseInt(numMatch[1], 10);
        if (!seen.has(num)) {
          seen.add(num);
          pushUniqueLabel(`${num}F`);
        }
      } else {
        pushUniqueLabel(label);
      }
    }
  }

  return result.sort((a, b) => {
    const na = parseInt(a) || 0;
    const nb = parseInt(b) || 0;
    return na - nb;
  });
}

/**
 * building.floors에서 카테고리별 층 목록 추출 (floorDetails 없이)
 */
export function getFloorLabelsForCategory(
  building: Building,
  category: ProcessCategory
): string[] {
  switch (category) {
    case '버림':
    case '기초':
      return ['']; // 층 구분 없음, 단일 그룹

    case '주동 지하층':
      return building.floors
        .filter(f => f.floorClass === '지하층')
        .sort((a, b) => a.floorNumber - b.floorNumber)
        .map(f => f.floorLabel);

    case '지하층(층고6.5m이상)':
      return [''];

    case '지하주차장':
      return building.floors
        .filter(f => f.floorClass === '지하층')
        .sort((a, b) => a.floorNumber - b.floorNumber)
        .map(f => f.floorLabel);

    case '셋팅층':
      return expandFloorLabels(
        building.floors
          .filter(f => f.floorClass === '셋팅층')
          .sort((a, b) => a.floorNumber - b.floorNumber)
          .map(f => f.floorLabel)
      );

    case '기준층':
      return expandFloorLabels(
        building.floors
          .filter(f => f.floorClass === '기준층' || f.floorClass === '최상층')
          .sort((a, b) => a.floorNumber - b.floorNumber)
          .map(f => f.floorLabel)
      );

    case '일반층':
      return expandFloorLabels(
        building.floors
          .filter(f => f.floorClass === '일반층')
          .sort((a, b) => a.floorNumber - b.floorNumber)
          .map(f => f.floorLabel)
      );

    case '최상층':
      return expandFloorLabels(
        building.floors
          .filter(f => f.floorClass === '최상층')
          .sort((a, b) => a.floorNumber - b.floorNumber)
          .map(f => f.floorLabel)
      );

    case '옥탑층':
      return expandFloorLabels(
        building.floors
          .filter(f => f.floorClass === '옥탑층' || f.floorClass === 'PH층')
          .sort((a, b) => a.floorNumber - b.floorNumber)
          .map(f => f.floorLabel)
      );

    default:
      return [];
  }
}

/**
 * 실제 간트 변환용 층 라벨 목록:
 * - 지하 특수행(주차장, 6.5m 이상)은 specialRowQuantities의 활성 행만 반영
 * - 최상층은 기준층에 통합하여 층별 태스크가 누락되지 않게 보장
 */
export function getImportFloorLabelsForCategory(
  building: Building,
  plan: BuildingProcessPlan,
  category: ProcessCategory
): string[] {
  const baseLabels = getFloorLabelsForCategory(building, category);
  const categoryProcess = plan.processes[category];
  const detailFallbackLabels = categoryProcess?.floorDetails
    ? expandFloorLabels(Object.keys(categoryProcess.floorDetails).filter(Boolean))
    : [];
  const floorTypeFallbackLabels = categoryProcess?.floors
    ? expandFloorLabels(Object.keys(categoryProcess.floors).filter(Boolean))
    : [];
  const fallbackLabels = [...new Set([...detailFallbackLabels, ...floorTypeFallbackLabels])];
  const resolvedBaseLabels = baseLabels.length > 0 ? baseLabels : fallbackLabels;

  // 지하 특수 카테고리는 반드시 "할당된 물량"이 있는 행만 생성
  if (category === '지하주차장') {
    return getActiveParkingRowLabels(plan);
  }

  if (category === '지하층(층고6.5m이상)') {
    return hasActiveHighCeilingRows(plan) ? ['B1 6.5m이상'] : [];
  }

  // 지상층 공정계획에서 최상층은 기준층에 포함되어 관리되므로 중복 생성 방지
  if (category === '최상층' && plan.processes['기준층']) {
    return [];
  }

  return resolvedBaseLabels;
}

// ============================================
// 순차 스케줄링 (TASK 날짜 계산)
// ============================================

/**
 * 한 층(GROUP)의 세부공정 항목들을 순차적으로 스케줄링합니다.
 *
 * 각 항목은 이전 항목의 종료일 + 1일부터 시작하며,
 * 간접작업일(양생, 검측 등)은 달력일(calendar days)로,
 * 순작업일(순수 시공)은 작업일(working days, 공휴일 제외)로 계산합니다.
 */
function scheduleTasksSequentially(
  tasks: ConstructionTask[],
  groupId: string,
  items: FloorProcessDetails['items'] | ComputedFloorItem[],
  moduleItems: ProcessItem[],
  plan: BuildingProcessPlan,
  category: ProcessCategory,
  floorLabel: string,
  startDate: Date,
  holidays: Date[],
  calendarSettings: CalendarSettings
): Date | null {
  if (!items || items.length === 0) return null;

  let currentDate = new Date(startDate);
  let lastEndDate: Date | null = null;

  for (const item of items) {
    // 모듈에서 해당 항목의 메타 정보 조회 (indirectDays, unit 등)
    const moduleItem = moduleItems.find((mi) => mi.id === item.itemId);

    // 순작업일: item의 directWorkDays (오버라이드 포함)
    const overrideKey = `${category}-${floorLabel}-${item.itemId}`;
    const netWorkDays =
      plan.itemDirectWorkDaysOverrides?.[overrideKey] ?? item.directWorkDays;

    // 간접작업일: ProcessModule에서 가져옴
    const indirectDaysPost = moduleItem?.indirectDays ?? 0;
    const indirectWorkNamePost = moduleItem?.indirectWorkItem || undefined;

    // TaskData 구성 (totalWorkers 포함)
    // 소수점(예: 0.5일)은 보존하고 날짜 계산 단계에서만 캘린더 규칙에 따라 처리
    const normalizedNetWorkDays = Math.max(0, Math.round(netWorkDays * 10) / 10);
    const normalizedIndirectDaysPost = Math.max(0, Math.round(indirectDaysPost * 10) / 10);
    const taskData: TaskData = {
      netWorkDays: normalizedNetWorkDays,
      indirectWorkDaysPre: 0,
      indirectWorkDaysPost: normalizedIndirectDaysPost,
      indirectWorkNamePost,
      quantity: item.quantity,
      unit: moduleItem?.unit,
      dailyOutput: moduleItem?.dailyProductivity,
      crew: item.dailyInputWorkers,
      totalWorkers: normalizedNetWorkDays * item.dailyInputWorkers,
    };

    // 날짜 계산: 간접(post)은 달력일, 순작업은 작업일
    // 1. 순작업 기간 (공휴일 건너뜀)
    let taskEndDate = currentDate;
    if (taskData.netWorkDays > 0) {
      taskEndDate = addWorkingDays(
        currentDate,
        taskData.netWorkDays,
        holidays,
        calendarSettings
      );
    }

    // 2. 후간접 기간 (달력일)
    let finalEndDate = taskEndDate;
    if (taskData.indirectWorkDaysPost > 0) {
      finalEndDate = addCalendarDays(
        addDays(taskEndDate, 1),
        taskData.indirectWorkDaysPost
      );
    }

    // TASK 생성
    const taskId = generateId();
    const constructionTask: ConstructionTask = {
      id: taskId,
      parentId: groupId,
      wbsLevel: 2,
      type: 'TASK',
      name: item.workItem,
      startDate: new Date(currentDate),
      endDate: finalEndDate,
      task: taskData,
      dependencies: [],
    };

    tasks.push(constructionTask);
    lastEndDate = finalEndDate;

    // 다음 TASK 시작일 = 현재 TASK 종료일 + 1일
    currentDate = addDays(taskEndDate, 1);
  }

  return lastEndDate;
}

// ============================================
// 유틸리티 함수
// ============================================

/**
 * 층 라벨에서 정렬용 숫자 추출
 */
function getFloorSortNumber(label: string, building: Building): number {
  // building.floors에서 매칭 시도
  const floor = building.floors.find((f) => {
    const cleanLabel = f.floorLabel.replace(/코어\d+-/, '');
    return cleanLabel === label;
  });
  if (floor) return floor.floorNumber;

  // 패턴 매칭 폴백
  const basementMatch = label.match(/B(\d+)/i);
  if (basementMatch) return -parseInt(basementMatch[1], 10);

  const rangeMatch = label.match(/(\d+)\s*[~-]\s*(\d+)(?:F|층)/i);
  if (rangeMatch) return parseInt(rangeMatch[1], 10);

  const floorMatch = label.match(/(\d+)(?:F|층)/i);
  if (floorMatch) return parseInt(floorMatch[1], 10);

  const phMatch = label.match(/(?:PH|옥탑)(\d+)/);
  if (phMatch) return 1000 + parseInt(phMatch[1], 10);

  return 0;
}

/**
 * 해당 층의 processType 결정
 */
function getFloorProcessType(
  plan: BuildingProcessPlan,
  category: ProcessCategory,
  processInfo: NonNullable<BuildingProcessPlan['processes'][ProcessCategory]>,
  floorLabel: string
): ProcessType {
  const normalizedFloorLabel = normalizeFloorLabelForProcessType(category, floorLabel);

  // 특수행 라벨(B1 주차장, B1 6.5m이상) → B1으로 정규화된 오버라이드 우선
  if (
    normalizedFloorLabel !== floorLabel &&
    processInfo.floors?.[normalizedFloorLabel]
  ) {
    return processInfo.floors[normalizedFloorLabel].processType;
  }

  // 층별 오버라이드 확인
  if (processInfo.floors?.[floorLabel]) {
    return processInfo.floors[floorLabel].processType;
  }
  // 카테고리 기본 processType
  return processInfo.processType || '표준공정';
}

function normalizeFloorLabelForProcessType(
  category: ProcessCategory,
  floorLabel: string
): string {
  if (category === '지하주차장' || category === '지하층(층고6.5m이상)') {
    return extractBasementFloorLabel(floorLabel) || floorLabel;
  }

  return floorLabel;
}

function normalizeFloorLabelForCalculation(
  category: ProcessCategory,
  floorLabel: string
): string {
  if (category === '지하주차장') {
    return extractBasementFloorLabel(floorLabel) || floorLabel;
  }

  return floorLabel;
}

function extractBasementFloorLabel(label: string): string | null {
  const match = label.match(/^(B\d+)/);
  return match ? match[1] : null;
}

function hasPositiveSpecialQuantity(values: SpecialRowQuantities | undefined): boolean {
  if (!values) return false;
  return ['gangForm', 'alForm', 'formwork', 'rebar', 'concrete'].some((key) => {
    const value = values[key as keyof SpecialRowQuantities] || 0;
    return value > 0;
  });
}

function getActiveParkingRowLabels(plan: BuildingProcessPlan): string[] {
  const labels = Object.entries(plan.specialRowQuantities || {})
    .filter(([key, values]) => /^B\d+\s+주차장$/.test(key) && hasPositiveSpecialQuantity(values))
    .map(([key]) => key);

  return labels.sort((a, b) => {
    const floorA = parseInt(a.match(/^B(\d+)/)?.[1] || '0', 10);
    const floorB = parseInt(b.match(/^B(\d+)/)?.[1] || '0', 10);
    return floorB - floorA; // B2 -> B1 순서
  });
}

function hasActiveHighCeilingRows(plan: BuildingProcessPlan): boolean {
  const specialRows = plan.specialRowQuantities || {};
  return (
    hasPositiveSpecialQuantity(specialRows['B1 6.5m이상']) ||
    hasPositiveSpecialQuantity(specialRows['B2 6.5m이상'])
  );
}

function getSpecialRowQuantitiesForCategory(
  plan: BuildingProcessPlan,
  category: ProcessCategory,
  floorLabel: string
): SpecialRowQuantities | null {
  const specialRows = plan.specialRowQuantities || {};

  if (category === '지하주차장') {
    const values = specialRows[floorLabel];
    return hasPositiveSpecialQuantity(values) ? values : null;
  }

  if (category === '지하층(층고6.5m이상)') {
    const b1 = specialRows['B1 6.5m이상'] || {};
    const b2 = specialRows['B2 6.5m이상'] || {};
    const merged: SpecialRowQuantities = {
      gangForm: (b1.gangForm || 0) + (b2.gangForm || 0),
      alForm: (b1.alForm || 0) + (b2.alForm || 0),
      formwork: (b1.formwork || 0) + (b2.formwork || 0),
      rebar: (b1.rebar || 0) + (b2.rebar || 0),
      concrete: (b1.concrete || 0) + (b2.concrete || 0),
    };

    return hasPositiveSpecialQuantity(merged) ? merged : null;
  }

  return null;
}

function getDeductionFieldsForBasement(
  plan: BuildingProcessPlan,
  category: ProcessCategory,
  normalizedFloorLabel: string
): DeductionFields | null {
  if (category !== '주동 지하층') return null;

  const basementFloorLabel = extractBasementFloorLabel(normalizedFloorLabel);
  if (!basementFloorLabel) return null;

  return getSpecialRowDeductions(
    plan.specialRowQuantities as unknown as Record<string, Record<string, number>> | undefined,
    basementFloorLabel
  );
}

function resolveQuantityFromSpecialRow(
  refTradeField: string,
  ratio: number,
  specialRowQuantities: SpecialRowQuantities
): number {
  const gangForm = specialRowQuantities.gangForm || 0;
  const alForm = specialRowQuantities.alForm || 0;
  const formwork = specialRowQuantities.formwork || 0;

  let baseQuantity = 0;

  if (refTradeField === 'formwork') {
    baseQuantity = gangForm + alForm + formwork;
  } else if (refTradeField === 'stripClean') {
    baseQuantity = (gangForm + alForm + formwork) * 2;
  } else if (refTradeField === 'euroForm') {
    baseQuantity = formwork;
  } else if (refTradeField === 'gangForm') {
    baseQuantity = gangForm;
  } else if (refTradeField === 'alForm') {
    baseQuantity = alForm;
  } else if (refTradeField === 'rebar') {
    baseQuantity = specialRowQuantities.rebar || 0;
  } else if (refTradeField === 'concrete') {
    baseQuantity = specialRowQuantities.concrete || 0;
  }

  return baseQuantity * ratio;
}

function resolveQuantityForFloorItem(
  building: Building,
  item: ProcessItem,
  plan: BuildingProcessPlan,
  category: ProcessCategory,
  floorLabel: string,
  normalizedFloorLabel: string,
  specialRowQuantities: SpecialRowQuantities | null,
  deductionFields: DeductionFields | null
): number {
  if (!(item.quantityRef || item.quantityReference)) return 0;

  const ref = item.quantityRef ?? parseLegacyReference(item.quantityReference, category);

  if (specialRowQuantities && ref) {
    return resolveQuantityFromSpecialRow(ref.tradeField, ref.ratio, specialRowQuantities);
  }

  if (deductionFields && ref && category === '주동 지하층') {
    return resolveWithDeduction(
      building,
      ref,
      normalizedFloorLabel,
      deductionFields
    );
  }

  return resolveFloorQuantity(building, item, category, normalizedFloorLabel || floorLabel);
}

/**
 * 부모 태스크의 날짜를 자식 태스크 범위로 업데이트
 */
function updateParentDates(
  parent: ConstructionTask,
  children: ConstructionTask[]
): void {
  if (children.length === 0) return;

  const minStart = new Date(
    Math.min(...children.map((c) => c.startDate.getTime()))
  );
  const maxEnd = new Date(
    Math.max(...children.map((c) => c.endDate.getTime()))
  );

  parent.startDate = minStart;
  parent.endDate = maxEnd;
}
