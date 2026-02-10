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
});
