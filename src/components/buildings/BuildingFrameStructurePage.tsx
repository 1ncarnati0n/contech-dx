'use client';

import { useState, useEffect, useCallback } from 'react';
import { BuildingTabs } from './BuildingTabs';
import { getBuildings } from '@/lib/services/buildings';
import { toast } from 'sonner';
import { Spinner, Card } from '@/components/ui';
import type { Building } from '@/lib/types';

interface Props {
  projectId: string;
}

export function BuildingFrameStructurePage({ projectId }: Props) {
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

  const activeBuilding = buildings[activeBuildingIndex];

  return (
    <div className="space-y-6">
      {isLoading && !isInitialized ? (
        <div className="flex justify-center items-center py-12">
          <Spinner />
        </div>
      ) : buildings.length > 0 ? (
        <BuildingTabs
          buildings={buildings}
          activeIndex={activeBuildingIndex}
          onTabChange={setActiveBuildingIndex}
        >
          {activeBuilding && (
            <div className="space-y-6">
              <Card className="p-6">
                <h2 className="text-xl font-bold text-slate-900 dark:text-white mb-4">
                  {activeBuilding.buildingName} - 골구조도 입력
                </h2>
                <div className="space-y-4">
                  <p className="text-slate-600 dark:text-slate-400">
                    골구조도 입력 기능은 준비 중입니다.
                  </p>
                  {/* 여기에 골구조도 입력 UI 추가 예정 */}
                </div>
              </Card>
            </div>
          )}
        </BuildingTabs>
      ) : (
        <div className="text-center py-12 text-slate-500 dark:text-slate-400">
          <p>동 수를 입력하고 "동 탭 생성" 버튼을 클릭하여 시작하세요.</p>
        </div>
      )}
    </div>
  );
}
