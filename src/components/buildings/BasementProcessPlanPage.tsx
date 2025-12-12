'use client';

import { Fragment, useState, useEffect, useMemo, useCallback } from 'react';
import { Card, CardHeader, CardTitle, CardContent, Input } from '@/components/ui';
import type { Building, BuildingProcessPlan, ProcessCategory, ProcessType, Floor } from '@/lib/types';
import { getBuildings, deleteBuilding, updateBuilding, reorderBuildings } from '@/lib/services/buildings';
import { toast } from 'sonner';
import { Calendar, ChevronDown, ChevronUp, Layers } from 'lucide-react';
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

// 지하층 공정 구분 목록
const BASEMENT_PROCESS_CATEGORIES: ProcessCategory[] = ['버림', '기초', '지하골조'];

// 공정 타입 옵션
const PROCESS_TYPE_OPTIONS: Record<ProcessCategory, ProcessType[]> = {
  '버림': ['표준공정'],
  '기초': ['표준공정'],
  '지하골조': ['표준공정'],
  '셋팅층': ['표준공정'],
  '기준층': ['5일 사이클', '6일 사이클', '7일 사이클', '8일 사이클'],
  '옥탑층': ['표준공정'],
};

// 기본 공정 타입
const DEFAULT_PROCESS_TYPES: Record<ProcessCategory, ProcessType> = {
  '버림': '표준공정',
  '기초': '표준공정',
  '지하골조': '표준공정',
  '셋팅층': '표준공정',
  '기준층': '6일 사이클',
  '옥탑층': '표준공정',
};

export function BasementProcessPlanPage({ projectId }: Props) {
  const [buildings, setBuildings] = useState<Building[]>([]);
  const [activeBuildingIndex, setActiveBuildingIndex] = useState(0);
  const [isLoading, setIsLoading] = useState(false);
  const [expandedCategories, setExpandedCategories] = useState<Set<ProcessCategory>>(
    new Set(BASEMENT_PROCESS_CATEGORIES)
  );

  // 초기 데이터 로드
  const loadBuildings = useCallback(async () => {
    try {
      setIsLoading(true);
      const data = await getBuildings(projectId);
      setBuildings(data);
      if (data.length > 0 && activeBuildingIndex >= data.length) {
        setActiveBuildingIndex(0);
      }
    } catch (error) {
      toast.error('동 목록을 불러오는데 실패했습니다.');
    } finally {
      setIsLoading(false);
    }
  }, [projectId, activeBuildingIndex]);

  useEffect(() => {
    loadBuildings();
  }, [loadBuildings]);

  // 동 이름 업데이트
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
      const updatedBuildings = buildings.filter(b => b.id !== buildingId);
      setBuildings(updatedBuildings);
      
      if (index === activeBuildingIndex) {
        setActiveBuildingIndex(Math.min(activeBuildingIndex, updatedBuildings.length - 1));
      } else if (index < activeBuildingIndex) {
        setActiveBuildingIndex(activeBuildingIndex - 1);
      }
      
      toast.success('동이 삭제되었습니다.');
    } catch (error) {
      toast.error('동 삭제에 실패했습니다.');
    }
  }, [projectId, buildings, activeBuildingIndex]);

  // 동 순서 변경
  const handleReorder = useCallback(async (fromIndex: number, toIndex: number) => {
    try {
      await reorderBuildings(projectId, fromIndex, toIndex);
      await loadBuildings();
      
      if (activeBuildingIndex === fromIndex) {
        setActiveBuildingIndex(toIndex);
      } else if (activeBuildingIndex === toIndex) {
        setActiveBuildingIndex(fromIndex);
      } else if (activeBuildingIndex > fromIndex && activeBuildingIndex <= toIndex) {
        setActiveBuildingIndex(activeBuildingIndex - 1);
      } else if (activeBuildingIndex < fromIndex && activeBuildingIndex >= toIndex) {
        setActiveBuildingIndex(activeBuildingIndex + 1);
      }
    } catch (error) {
      toast.error('동 순서 변경에 실패했습니다.');
    }
  }, [projectId, loadBuildings, activeBuildingIndex]);

  const activeBuilding = buildings[activeBuildingIndex];

  // 카테고리 확장/축소
  const toggleCategory = useCallback((category: ProcessCategory) => {
    setExpandedCategories(prev => {
      const newSet = new Set(prev);
      if (newSet.has(category)) {
        newSet.delete(category);
      } else {
        newSet.add(category);
      }
      return newSet;
    });
  }, []);

  return (
    <div className="space-y-6 w-full">
      <div className="mb-6">
        <div className="flex items-center gap-3 mb-2">
          <Layers className="w-6 h-6 text-primary-600 dark:text-primary-400" />
          <h2 className="text-2xl font-bold text-slate-900 dark:text-white">지하층 공정계획</h2>
        </div>
        <p className="text-slate-600 dark:text-slate-400">
          지하층 공정계획을 입력하고 관리합니다.
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
            <div className="space-y-6">
              {BASEMENT_PROCESS_CATEGORIES.map((category) => {
                const isExpanded = expandedCategories.has(category);
                const processType = DEFAULT_PROCESS_TYPES[category];

                return (
                  <Card key={category} className="overflow-hidden">
                    <CardHeader
                      className="cursor-pointer hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors"
                      onClick={() => toggleCategory(category)}
                    >
                      <div className="flex items-center justify-between">
                        <CardTitle className="text-lg font-semibold text-slate-900 dark:text-white">
                          {category}
                        </CardTitle>
                        <div className="flex items-center gap-2">
                          <span className="text-sm text-slate-500 dark:text-slate-400">
                            {processType}
                          </span>
                          {isExpanded ? (
                            <ChevronUp className="w-5 h-5 text-slate-400" />
                          ) : (
                            <ChevronDown className="w-5 h-5 text-slate-400" />
                          )}
                        </div>
                      </div>
                    </CardHeader>
                    {isExpanded && (
                      <CardContent className="pt-0">
                        <div className="space-y-4">
                          <div className="text-center py-12 text-slate-500 dark:text-slate-400">
                            <p>{category} 공정계획 입력 기능은 준비 중입니다.</p>
                            <p className="text-sm mt-2">곧 업데이트될 예정입니다.</p>
                          </div>
                        </div>
                      </CardContent>
                    )}
                  </Card>
                );
              })}
            </div>
          )}
        </BuildingTabs>
      ) : (
        <Card className="p-6">
          <div className="text-center py-12 text-slate-500 dark:text-slate-400">
            <Layers className="w-12 h-12 mx-auto mb-4 text-slate-300 dark:text-slate-600" />
            <p>동이 없습니다. 먼저 데이터 입력 페이지에서 동을 생성해주세요.</p>
          </div>
        </Card>
      )}
    </div>
  );
}

