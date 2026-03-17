'use client';

import { BuildingTabs } from '../../shared/view/BuildingTabs';
import { Card } from '@/shared/components/ui';
import { Layers, Construction } from 'lucide-react';
import { useBuildingList } from '../../shared/service/useBuildingList';

interface Props {
  projectId: string;
}

export function GeologicalDataPage({ projectId }: Props) {
  const {
    buildings,
    activeBuildingIndex,
    activeBuilding,
    setActiveBuildingIndex,
    handleDeleteBuilding,
    handleUpdateBuildingName,
    handleReorder,
  } = useBuildingList(projectId);

  return (
    <div className="space-y-6 w-full px-4 sm:px-6 lg:px-8">
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
                  {activeBuilding.buildingName} 지질 데이터
                </h3>
                <div className="flex items-center gap-2 p-3 bg-amber-50 dark:bg-amber-900/20 text-amber-700 dark:text-amber-300 rounded-lg mb-4">
                  <Construction className="w-4 h-4 flex-shrink-0" />
                  <span className="text-sm font-medium">🚧 이 기능은 현재 준비 중입니다. 곧 업데이트될 예정입니다.</span>
                </div>
                <div className="text-center py-12 text-slate-500 dark:text-slate-400">
                  <p>지질 데이터 입력 기능 개발 예정</p>
                </div>
              </Card>
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
