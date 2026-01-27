'use client';

import { useState, useEffect, useCallback } from 'react';
import { BuildingTabs } from './BuildingTabs';
import type { Building } from '@/lib/types';
import { getBuildings, deleteBuilding, updateBuilding, reorderBuildings } from '@/lib/services/buildings';
import { toast } from 'sonner';
import { Card } from '@/components/ui';
import { DollarSign } from 'lucide-react';

interface Props {
  projectId: string;
}

export function PriceInputPage({ projectId }: Props) {
  const [buildings, setBuildings] = useState<Building[]>([]);
  const [activeBuildingIndex, setActiveBuildingIndex] = useState(0);
  const [isLoading, setIsLoading] = useState(false);
  const [isInitialized, setIsInitialized] = useState(false);

  // 초기 데이터 로드
  const loadBuildings = useCallback(async () => {
    try {
      setIsLoading(true);
      const data = await getBuildings(projectId);
      setBuildings(data);
      setIsInitialized(true);
      
      // 활성 탭이 유효하지 않으면 첫 번째로 설정
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
    if (!isInitialized) {
      loadBuildings();
    }
  }, [isInitialized, loadBuildings]);

  // 동 순서 변경
  const handleReorder = useCallback(async (fromIndex: number, toIndex: number) => {
    try {
      await reorderBuildings(projectId, fromIndex, toIndex);
      await loadBuildings();
      
      // 활성 탭 인덱스 업데이트
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
      
      // 삭제된 동이 현재 활성 탭이면 첫 번째로 이동
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

  const activeBuilding = buildings[activeBuildingIndex];

  return (
    <div className="space-y-6 w-full px-4 sm:px-6 lg:px-8">
      <div className="mb-6">
        <div className="flex items-center gap-3 mb-2">
          <DollarSign className="w-6 h-6 text-primary-600 dark:text-primary-400" />
          <h2 className="text-2xl font-bold text-slate-900 dark:text-white">단가 입력</h2>
        </div>
        <p className="text-slate-600 dark:text-slate-400">
          동별·층별·공종별 단가를 입력하고 관리합니다.
        </p>
      </div>

      {/* 동 탭 영역 */}
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
              <Card className="p-6">
                <h3 className="text-lg font-semibold text-slate-900 dark:text-white mb-4">
                  {activeBuilding.buildingName} 단가 입력
                </h3>
                <div className="text-center py-12 text-slate-500 dark:text-slate-400">
                  <p>단가 입력 기능은 준비 중입니다.</p>
                  <p className="text-sm mt-2">곧 업데이트될 예정입니다.</p>
                </div>
              </Card>
            </div>
          )}
        </BuildingTabs>
      ) : (
        <Card className="p-6">
          <div className="text-center py-12 text-slate-500 dark:text-slate-400">
            <DollarSign className="w-12 h-12 mx-auto mb-4 text-slate-300 dark:text-slate-600" />
            <p>동이 없습니다. 먼저 데이터 입력 페이지에서 동을 생성해주세요.</p>
          </div>
        </Card>
      )}
    </div>
  );
}

