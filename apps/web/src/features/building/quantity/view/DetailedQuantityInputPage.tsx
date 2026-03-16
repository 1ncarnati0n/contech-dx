'use client';

import { BuildingTabs } from '../../shared/view/BuildingTabs';
import { DetailedFloorTradeTable } from './DetailedFloorTradeTable';
import { Card } from '@/shared/components/ui';
import { Package } from 'lucide-react';
import { useBuildingListPage } from '../service/useBuildingListPage';

interface Props {
  projectId: string;
}

export function DetailedQuantityInputPage({ projectId }: Props) {
  const {
    buildings,
    activeBuildingIndex,
    setActiveBuildingIndex,
    activeBuilding,
    loadBuildings,
    handleReorder,
    handleUpdateBuildingName,
    handleDeleteBuilding,
  } = useBuildingListPage(projectId);

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
              <DetailedFloorTradeTable
                building={activeBuilding}
                onUpdate={loadBuildings}
              />
            </div>
          )}
        </BuildingTabs>
      ) : (
        <Card className="p-6">
          <div className="text-center py-12 text-slate-500 dark:text-slate-400">
            <Package className="w-12 h-12 mx-auto mb-4 text-slate-300 dark:text-slate-600" />
            <p>동이 없습니다. 먼저 데이터 입력 페이지에서 동을 생성해주세요.</p>
          </div>
        </Card>
      )}
    </div>
  );
}
