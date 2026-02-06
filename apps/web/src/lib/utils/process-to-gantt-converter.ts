/**
 * 공정계획 → 간트차트 컨버터
 *
 * BuildingProcessPlan 데이터를 ConstructionTask[] 형태로 변환하여
 * 기존 간트차트 데이터에 추가(append)할 수 있는 형식을 생성합니다.
 *
 * 계층구조: BLOCK (동) → CP (카테고리) → GROUP (층) → TASK (항목)
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
} from '@/lib/types';
import { getProcessModule } from '@/lib/data/process-modules';
import type { ProcessItem } from '@/lib/data/process-modules';

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

// ============================================
// 상수
// ============================================

/** 카테고리 시공 순서 (버림 → 기초 → 지하 → ... → 옥탑) */
const CATEGORY_ORDER: ProcessCategory[] = [
  '버림',
  '기초',
  '주동 지하층',
  '셋팅층',
  '기준층',
  '최상층',
  'PH층',
  '옥탑층',
];

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

  for (const category of CATEGORY_ORDER) {
    const processInfo = plan.processes[category];
    if (!processInfo) continue;

    const cpResult = convertCategory(
      building,
      plan,
      category,
      processInfo,
      blockId,
      currentDate,
      holidays,
      calendarSettings
    );

    if (cpResult.tasks.length > 0) {
      tasks.push(...cpResult.tasks);
      // 다음 카테고리는 이전 카테고리 종료일 + 1일부터 시작
      if (cpResult.endDate) {
        currentDate = addDays(cpResult.endDate, 1);
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

  // floorDetails가 있는 카테고리 → GROUP + TASK 생성
  if (processInfo.floorDetails && Object.keys(processInfo.floorDetails).length > 0) {
    const floorLabels = getSortedFloorLabels(processInfo.floorDetails, building);
    let floorStartDate = new Date(startDate);

    for (const floorLabel of floorLabels) {
      const floorDetail = processInfo.floorDetails[floorLabel];
      if (!floorDetail || !floorDetail.items || floorDetail.items.length === 0) continue;

      const groupResult = convertFloorGroup(
        building,
        plan,
        category,
        processInfo,
        floorLabel,
        floorDetail,
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
  // floorDetails 없이 days만 있는 카테고리 → CP만 생성 (TASK 없이)
  // CP의 workDaysTotal은 이미 설정됨

  // CP 날짜 업데이트
  const childTasks = tasks.filter((t) => t.parentId === cpId);
  if (childTasks.length > 0) {
    updateParentDates(cpTask, childTasks);
  } else if (processInfo.days > 0) {
    // GROUP/TASK가 없지만 days가 있는 경우 (버림, 기초 등)
    cpTask.endDate = addCalendarDays(startDate, processInfo.days);
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
  floorDetail: FloorProcessDetails,
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
    name: floorLabel,
    startDate: new Date(startDate),
    endDate: new Date(startDate),
    group: { progress: 0 },
    dependencies: [],
    isExpanded: false,
  };
  tasks.push(groupTask);

  // 해당 층의 processType 결정
  const floorProcessType = getFloorProcessType(plan, category, processInfo, floorLabel);
  const module = getProcessModule(category, floorProcessType);

  if (!module || !floorDetail.items) {
    return { tasks, endDate: startDate };
  }

  // 각 TASK의 날짜를 순차 스케줄링
  const taskEndDate = scheduleTasksSequentially(
    tasks,
    groupId,
    floorDetail,
    module.items,
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
// 순차 스케줄링 (TASK 날짜 계산)
// ============================================

/**
 * 한 층(GROUP)의 세부공정 항목들을 순차적으로 스케줄링합니다.
 *
 * 각 항목은 이전 항목의 종료일 + 1일부터 시작하며,
 * 간접작업일(양생, 검측 등)은 달력일(calendar days)로,
 * 순작업일(순수 시공)은 작업일(working days, 공휴일 제외)로 계산합니다.
 *
 * @param tasks - 생성된 태스크를 push할 배열
 * @param groupId - 부모 GROUP의 ID
 * @param floorDetail - 층별 공정 상세 (items 배열 포함)
 * @param moduleItems - ProcessModule의 items 배열 (indirectDays, unit 등)
 * @param plan - 해당 동의 공정계획 (오버라이드 조회용)
 * @param category - 공정 카테고리 (예: '기준층')
 * @param floorLabel - 층 라벨 (예: '3F')
 * @param startDate - 이 GROUP의 시작일
 * @param holidays - 공휴일 배열
 * @param calendarSettings - 캘린더 설정 (토/일/공휴일 작업 여부)
 * @returns 마지막 TASK의 종료일 (또는 null)
 */
function scheduleTasksSequentially(
  tasks: ConstructionTask[],
  groupId: string,
  floorDetail: FloorProcessDetails,
  moduleItems: ProcessItem[],
  plan: BuildingProcessPlan,
  category: ProcessCategory,
  floorLabel: string,
  startDate: Date,
  holidays: Date[],
  calendarSettings: CalendarSettings
): Date | null {
  if (!floorDetail.items || floorDetail.items.length === 0) return null;

  let currentDate = new Date(startDate);
  let lastEndDate: Date | null = null;

  for (const item of floorDetail.items) {
    // 모듈에서 해당 항목의 메타 정보 조회 (indirectDays, unit 등)
    const moduleItem = moduleItems.find((mi) => mi.id === item.itemId);

    // 순작업일: floorDetail의 directWorkDays (오버라이드 포함)
    const overrideKey = `${category}-${floorLabel}-${item.itemId}`;
    const netWorkDays =
      plan.itemDirectWorkDaysOverrides?.[overrideKey] ?? item.directWorkDays;

    // 간접작업일: ProcessModule에서 가져옴
    const indirectDaysPost = moduleItem?.indirectDays ?? 0;
    const indirectWorkNamePost = moduleItem?.indirectWorkItem || undefined;

    // TaskData 구성
    const taskData: TaskData = {
      netWorkDays: Math.ceil(netWorkDays),
      indirectWorkDaysPre: 0,
      indirectWorkDaysPost: Math.ceil(indirectDaysPost),
      indirectWorkNamePost,
      quantity: item.quantity,
      unit: moduleItem?.unit,
      dailyOutput: moduleItem?.dailyProductivity,
      crew: item.dailyInputWorkers,
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
    currentDate = addDays(finalEndDate, 1);
  }

  return lastEndDate;
}

// ============================================
// 유틸리티 함수
// ============================================

/**
 * 층 라벨을 floorNumber 기준 오름차순 정렬
 * B3→B2→B1→1F→2F→... 순서
 */
function getSortedFloorLabels(
  floorDetails: Record<string, FloorProcessDetails>,
  building: Building
): string[] {
  const labels = Object.keys(floorDetails);

  return labels.sort((a, b) => {
    const numA = getFloorSortNumber(a, building);
    const numB = getFloorSortNumber(b, building);
    return numA - numB;
  });
}

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
  const basementMatch = label.match(/B(\d+)/);
  if (basementMatch) return -parseInt(basementMatch[1], 10);

  const floorMatch = label.match(/(\d+)F/);
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
  // 층별 오버라이드 확인
  if (processInfo.floors?.[floorLabel]) {
    return processInfo.floors[floorLabel].processType;
  }
  // 카테고리 기본 processType
  return processInfo.processType || '표준공정';
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
