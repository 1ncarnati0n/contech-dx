import { convertProcessPlansToGanttTasks } from '@/lib/utils/process-to-gantt-converter';
import type { Building, BuildingProcessPlan, Floor, FloorTrade } from '@/lib/types';

function createBasementFloor(label: string, floorNumber: number): Floor {
  return {
    id: `floor-${label}`,
    buildingId: 'building-1',
    floorLabel: label,
    floorNumber,
    levelType: '지하',
    floorClass: '지하층',
    height: 3,
  };
}

function createGroundFloor(
  label: string,
  floorNumber: number,
  floorClass: Floor['floorClass']
): Floor {
  return {
    id: `floor-${label}`,
    buildingId: 'building-1',
    floorLabel: label,
    floorNumber,
    levelType: '지상',
    floorClass,
    height: 3,
  };
}

function createFloorTrade(
  floorId: string,
  concreteVolumeM3: number
): FloorTrade {
  return {
    id: `trade-${floorId}`,
    floorId,
    buildingId: 'building-1',
    tradeGroup: '아파트',
    trades: {
      concrete: {
        volumeM3: concreteVolumeM3,
        equipmentCount: 1,
        productivityM3: 130,
        workers: 5,
        cost: 0,
      },
    },
  };
}

function createBuilding(
  floors: Floor[],
  floorTrades: FloorTrade[]
): Building {
  return {
    id: 'building-1',
    projectId: 'project-1',
    buildingName: 'A동',
    buildingNumber: 1,
    meta: {
      pumpCarCount: 2,
      floorCount: { hasHighCeilingEquipmentRoom: true },
    } as Building['meta'],
    floors,
    floorTrades,
  };
}

function createPlan(
  overrides?: Partial<BuildingProcessPlan>
): BuildingProcessPlan {
  return {
    id: 'plan-1',
    buildingId: 'building-1',
    projectId: 'project-1',
    processes: {},
    totalDays: 0,
    ...overrides,
  };
}

function findCpTask(tasks: Array<{ type: string; name: string }>, name: string) {
  return tasks.find((task) => task.type === 'CP' && task.name === name);
}

describe('convertProcessPlansToGanttTasks', () => {
  it('uses allocated parking special-row quantity and imports only active parking rows', () => {
    const b1 = createBasementFloor('B1', -1);
    const b2 = createBasementFloor('B2', -2);
    const building = createBuilding(
      [b2, b1],
      [
        createFloorTrade(b1.id, 999), // 기본 물량과 다른 값을 넣어 특수행 우선 적용 여부 검증
        createFloorTrade(b2.id, 999),
      ]
    );

    const plan = createPlan({
      processes: {
        '지하주차장': { days: 0, processType: '표준공정' },
      },
      specialRowQuantities: {
        'B1 주차장': { concrete: 130 },
      },
    });

    const { tasks } = convertProcessPlansToGanttTasks({
      buildings: [building],
      processPlans: new Map([[building.id, plan]]),
      projectStartDate: new Date('2026-01-01T00:00:00'),
    });

    const parkingCp = findCpTask(tasks as Array<{ type: string; name: string; id: string }>, '지하주차장');
    expect(parkingCp).toBeDefined();

    const parkingGroups = (tasks as Array<{ type: string; parentId: string | null; name: string }>)
      .filter((task) => task.type === 'GROUP' && task.parentId === (parkingCp as { id: string }).id);
    expect(parkingGroups.map((group) => group.name)).toEqual(['B1 주차장']);

    const b1ParkingGroup = parkingGroups[0] as { id: string };
    const concreteTask = (tasks as Array<{ type: string; parentId: string | null; name: string; task?: { quantity?: number } }>)
      .find(
        (task) =>
          task.type === 'TASK' &&
          task.parentId === b1ParkingGroup.id &&
          task.name === '타설'
      );

    expect(concreteTask).toBeDefined();
    expect(concreteTask?.task?.quantity).toBe(130);
  });

  it('keeps 0.5 indirect inspection days for setting floor detailed tasks', () => {
    const setting1F = createGroundFloor('1F', 1, '셋팅층');
    const building = createBuilding([setting1F], []);

    const plan = createPlan({
      processes: {
        '셋팅층': { days: 0, processType: '표준공정' },
      },
    });

    const { tasks } = convertProcessPlansToGanttTasks({
      buildings: [building],
      processPlans: new Map([[building.id, plan]]),
      projectStartDate: new Date('2026-01-01T00:00:00'),
    });

    const settingCp = findCpTask(
      tasks as Array<{ type: string; name: string; id: string; cp?: { nonWorkDaysTotal?: number } }>,
      '셋팅층'
    );
    expect(settingCp).toBeDefined();

    const settingGroup = (tasks as Array<{ id: string; type: string; parentId: string | null }>)
      .find((task) => task.type === 'GROUP' && task.parentId === (settingCp as { id: string }).id);
    expect(settingGroup).toBeDefined();

    const detailTasks = (tasks as Array<{
      type: string;
      parentId: string | null;
      name: string;
      task?: { indirectWorkDaysPost?: number };
    }>).filter((task) => task.type === 'TASK' && task.parentId === (settingGroup as { id: string }).id);

    const targetNames = new Set(['벽 철근조립', '알폼 조립', '보슬라브 철근조립']);
    const targetDetails = detailTasks.filter((task) => targetNames.has(task.name));

    expect(targetDetails).toHaveLength(3);
    targetDetails.forEach((task) => {
      expect(task.task?.indirectWorkDaysPost).toBe(0.5);
    });
    expect((settingCp as { cp?: { nonWorkDaysTotal?: number } }).cp?.nonWorkDaysTotal).toBe(7.5);
  });

  it('updates CP work/non-work totals from summed detailed tasks', () => {
    const b1 = createBasementFloor('B1', -1);
    const b2 = createBasementFloor('B2', -2);
    const building = createBuilding(
      [b2, b1],
      [createFloorTrade(b1.id, 120), createFloorTrade(b2.id, 120)]
    );

    const plan = createPlan({
      processes: {
        '지하주차장': { days: 999, processType: '표준공정' },
      },
      specialRowQuantities: {
        'B1 주차장': { gangForm: 10, alForm: 10, formwork: 20, rebar: 15, concrete: 120 },
      },
    });

    const { tasks } = convertProcessPlansToGanttTasks({
      buildings: [building],
      processPlans: new Map([[building.id, plan]]),
      projectStartDate: new Date('2026-01-01T00:00:00'),
    });

    const cpTask = findCpTask(tasks as Array<{ type: string; name: string; id: string; cp?: { workDaysTotal: number; nonWorkDaysTotal: number } }>, '지하주차장');
    expect(cpTask).toBeDefined();

    const groupIds = new Set(
      (tasks as Array<{ id: string; type: string; parentId: string | null }>)
        .filter((task) => task.type === 'GROUP' && task.parentId === (cpTask as { id: string }).id)
        .map((task) => task.id)
    );

    const detailTasks = (tasks as Array<{
      type: string;
      parentId: string | null;
      task?: { netWorkDays?: number; indirectWorkDaysPre?: number; indirectWorkDaysPost?: number };
    }>)
      .filter((task) => task.type === 'TASK' && task.parentId !== null && groupIds.has(task.parentId));

    const netDays = detailTasks.reduce((sum, task) => sum + (task.task?.netWorkDays || 0), 0);
    const indirectDays = detailTasks.reduce(
      (sum, task) => sum + (task.task?.indirectWorkDaysPre || 0) + (task.task?.indirectWorkDaysPost || 0),
      0
    );

    expect(netDays + indirectDays).toBeGreaterThan(0);
    expect((cpTask as { cp?: { workDaysTotal: number } }).cp?.workDaysTotal).toBe(netDays);
    expect((cpTask as { cp?: { nonWorkDaysTotal: number } }).cp?.nonWorkDaysTotal).toBe(indirectDays);
  });

  it('applies special-row deductions to basement main process quantities', () => {
    const b1 = createBasementFloor('B1', -1);
    const building = createBuilding(
      [b1],
      [createFloorTrade(b1.id, 100)]
    );

    const plan = createPlan({
      processes: {
        '주동 지하층': { days: 0, processType: '표준공정' },
      },
      specialRowQuantities: {
        'B1 주차장': { concrete: 100 }, // 주동 지하층에서 차감
      },
    });

    const { tasks } = convertProcessPlansToGanttTasks({
      buildings: [building],
      processPlans: new Map([[building.id, plan]]),
      projectStartDate: new Date('2026-01-01T00:00:00'),
    });

    const basementCp = findCpTask(tasks as Array<{ type: string; name: string; id: string }>, '주동 지하층');
    expect(basementCp).toBeDefined();

    const b1Group = (tasks as Array<{ type: string; parentId: string | null; name: string; id: string }>)
      .find(
        (task) =>
          task.type === 'GROUP' &&
          task.parentId === (basementCp as { id: string }).id &&
          task.name === 'B1'
      );
    expect(b1Group).toBeDefined();

    const concreteTask = (tasks as Array<{ type: string; parentId: string | null; name: string }>)
      .find(
        (task) =>
          task.type === 'TASK' &&
          task.parentId === (b1Group as { id: string }).id &&
          task.name === '타설'
      );

    // concrete(100) - deduction(100) = 0, ratio 0.6 적용 후도 0 → TASK 생성되지 않아야 함
    expect(concreteTask).toBeUndefined();
  });

  it('does not fallback-import categories that are missing from process plan', () => {
    const b1 = createBasementFloor('B1', -1);
    const b2 = createBasementFloor('B2', -2);
    const building = createBuilding(
      [b2, b1],
      [createFloorTrade(b1.id, 120), createFloorTrade(b2.id, 120)]
    );

    const plan = createPlan({
      processes: {}, // 명시적으로 저장된 카테고리 없음
    });

    const { tasks } = convertProcessPlansToGanttTasks({
      buildings: [building],
      processPlans: new Map([[building.id, plan]]),
      projectStartDate: new Date('2026-01-01T00:00:00'),
    });

    const cpTasks = (tasks as Array<{ type: string }>).filter((task) => task.type === 'CP');
    expect(cpTasks).toHaveLength(0);
    expect(tasks).toHaveLength(1); // BLOCK만 생성
  });

  it('does not generate parking/high-ceiling details when no special quantity is allocated', () => {
    const b1 = createBasementFloor('B1', -1);
    const b2 = createBasementFloor('B2', -2);
    const building = createBuilding(
      [b2, b1],
      [createFloorTrade(b1.id, 100), createFloorTrade(b2.id, 100)]
    );

    const plan = createPlan({
      processes: {
        '지하주차장': { days: 15, processType: '표준공정' },
        '지하층(층고6.5m이상)': { days: 20, processType: '표준공정' },
      },
      // 할당 없음
      specialRowQuantities: {},
    });

    const { tasks } = convertProcessPlansToGanttTasks({
      buildings: [building],
      processPlans: new Map([[building.id, plan]]),
      projectStartDate: new Date('2026-01-01T00:00:00'),
    });

    const cpNames = (tasks as Array<{ type: string; name: string }>)
      .filter((task) => task.type === 'CP')
      .map((task) => task.name);

    expect(cpNames).not.toContain('지하주차장');
    expect(cpNames).not.toContain('지하층(층고6.5m이상)');
  });

  it('includes top floor in 기준층 and formats PH labels as 옥탑층 labels', () => {
    const standard2F = createGroundFloor('2F', 2, '기준층');
    const top3F = createGroundFloor('3F', 3, '최상층');
    const ph1 = createGroundFloor('PH1', 4, 'PH층');

    const building = createBuilding(
      [standard2F, top3F, ph1],
      []
    );

    const plan = createPlan({
      processes: {
        '기준층': { days: 0, processType: '표준공정' },
        '옥탑층': { days: 0, processType: '표준공정' },
      },
    });

    const { tasks } = convertProcessPlansToGanttTasks({
      buildings: [building],
      processPlans: new Map([[building.id, plan]]),
      projectStartDate: new Date('2026-01-01T00:00:00'),
    });

    const standardCp = findCpTask(tasks as Array<{ type: string; name: string; id: string }>, '기준층');
    expect(standardCp).toBeDefined();

    const standardGroups = (tasks as Array<{ type: string; parentId: string | null; name: string }>)
      .filter((task) => task.type === 'GROUP' && task.parentId === (standardCp as { id: string }).id)
      .map((task) => task.name);
    expect(standardGroups).toEqual(expect.arrayContaining(['2F', '3F']));

    const topCp = findCpTask(tasks as Array<{ type: string; name: string }>, '최상층');
    expect(topCp).toBeUndefined();

    const rooftopCp = findCpTask(tasks as Array<{ type: string; name: string; id: string }>, '옥탑층');
    expect(rooftopCp).toBeDefined();

    const rooftopGroups = (tasks as Array<{ type: string; parentId: string | null; name: string }>)
      .filter((task) => task.type === 'GROUP' && task.parentId === (rooftopCp as { id: string }).id)
      .map((task) => task.name);
    expect(rooftopGroups).toContain('옥탑1층');
    expect(rooftopGroups).not.toContain('PH1');
  });

  it('expands ranged 기준층 labels written with 층 suffix into per-floor groups', () => {
    const standardRange = createGroundFloor('2~4층 기준층', 2, '기준층');
    const topFloor = createGroundFloor('5층', 5, '최상층');
    const building = createBuilding([standardRange, topFloor], []);

    const plan = createPlan({
      processes: {
        '기준층': { days: 0, processType: '표준공정' },
      },
    });

    const { tasks } = convertProcessPlansToGanttTasks({
      buildings: [building],
      processPlans: new Map([[building.id, plan]]),
      projectStartDate: new Date('2026-01-01T00:00:00'),
    });

    const standardCp = findCpTask(tasks as Array<{ type: string; name: string; id: string }>, '기준층');
    expect(standardCp).toBeDefined();

    const standardGroups = (tasks as Array<{ type: string; parentId: string | null; name: string }>)
      .filter((task) => task.type === 'GROUP' && task.parentId === (standardCp as { id: string }).id)
      .map((task) => task.name);

    expect(standardGroups).toEqual(expect.arrayContaining(['2F', '3F', '4F', '5F']));
    expect(standardGroups).not.toContain('2~4층 기준층');
  });

  it('falls back to 기준층 process floor overrides when building floor class labels are missing', () => {
    const floor2 = createGroundFloor('2F', 2, '일반층');
    const floor3 = createGroundFloor('3F', 3, '일반층');
    const building = createBuilding([floor2, floor3], []);

    const plan = createPlan({
      processes: {
        '기준층': {
          days: 0,
          processType: '표준공정',
          floors: {
            '2F': { processType: '표준공정' },
            '3F': { processType: '표준공정' },
          },
        },
      },
    });

    const { tasks } = convertProcessPlansToGanttTasks({
      buildings: [building],
      processPlans: new Map([[building.id, plan]]),
      projectStartDate: new Date('2026-01-01T00:00:00'),
    });

    const standardCp = findCpTask(tasks as Array<{ type: string; name: string; id: string }>, '기준층');
    expect(standardCp).toBeDefined();

    const standardGroups = (tasks as Array<{ type: string; parentId: string | null; name: string }>)
      .filter((task) => task.type === 'GROUP' && task.parentId === (standardCp as { id: string }).id)
      .map((task) => task.name);

    expect(standardGroups).toEqual(expect.arrayContaining(['2F', '3F']));
  });
});
