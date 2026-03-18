import { act, renderHook, waitFor } from '@testing-library/react';
import { useProcessPlanState, type ProcessPlanConfig } from '@/features/building/process-plan/hooks/useProcessPlanState';
import type { Building, BuildingProcessPlan, ProcessCategory, ProcessType } from '@/shared/types';
import { toast } from 'sonner';

jest.mock('sonner', () => ({
  toast: {
    success: jest.fn(),
    error: jest.fn(),
  },
}));

function createBuilding(id: string, projectId: string): Building {
  return {
    id,
    projectId,
    buildingName: `B-${id}`,
    buildingNumber: 1,
    meta: {} as Building['meta'],
    floors: [],
    floorTrades: [],
  };
}

function createPlan(buildingId: string, projectId: string, days = 1): BuildingProcessPlan {
  return {
    id: `plan-${buildingId}`,
    buildingId,
    projectId,
    processes: {
      버림: { days, processType: '표준공정' },
      기초: { days, processType: '표준공정' },
    },
    totalDays: days * 2,
  };
}

describe('useProcessPlanState', () => {
  const projectId = 'project-1';
  const processCategories: ProcessCategory[] = ['버림', '기초'];
  const defaultProcessTypes: Partial<Record<ProcessCategory, ProcessType>> = {
    버림: '표준공정',
    기초: '표준공정',
  };
  const config: ProcessPlanConfig = {
    processCategories,
    defaultProcessTypes,
  };

  beforeEach(() => {
    localStorage.clear();
    jest.clearAllMocks();
  });

  it('initializePlans는 저장 데이터가 없으면 기본 계획을 생성한다', () => {
    const { result } = renderHook(() => useProcessPlanState(projectId, config));
    const building = createBuilding('b1', projectId);

    const plans = result.current.initializePlans([building], new Map());
    const plan = plans.get(building.id);

    expect(plan).toBeDefined();
    expect(plan?.projectId).toBe(projectId);
    expect(plan?.processes['버림']?.processType).toBe('표준공정');
    expect(plan?.processes['기초']?.processType).toBe('표준공정');
  });

  it('saveToLocalStorage는 저장 후 dirty 상태를 해제하고 success 토스트를 띄운다', async () => {
    const { result } = renderHook(() => useProcessPlanState(projectId, config));
    const plan = createPlan('b1', projectId, 3);

    act(() => {
      result.current.setProcessPlans(new Map([['b1', plan]]));
      result.current.markDirty('b1');
    });

    act(() => {
      result.current.saveToLocalStorage('b1');
    });

    await waitFor(() => {
      expect(localStorage.getItem('contech_process_plan_b1')).toBeTruthy();
      expect(result.current.dirtyBuildings.has('b1')).toBe(false);
    });

    expect(toast.success).toHaveBeenCalledTimes(1);
  });

  it('discardChanges는 localStorage 계획으로 복원하고 dirty 상태를 해제한다', async () => {
    const { result } = renderHook(() => useProcessPlanState(projectId, config));
    const savedPlan = createPlan('b1', projectId, 5);
    const changedPlan = createPlan('b1', projectId, 1);

    localStorage.setItem('contech_process_plan_b1', JSON.stringify(savedPlan));

    act(() => {
      result.current.setProcessPlans(new Map([['b1', changedPlan]]));
      result.current.markDirty('b1');
    });

    act(() => {
      result.current.discardChanges('b1');
    });

    await waitFor(() => {
      const restored = result.current.processPlans.get('b1');
      expect(restored?.totalDays).toBe(savedPlan.totalDays);
      expect(result.current.dirtyBuildings.has('b1')).toBe(false);
    });
  });
});
