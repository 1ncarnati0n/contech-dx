'use client';

import { useRef, useCallback } from 'react';
import { BuildingForm } from './BuildingForm';
import { BuildingTabs } from '../../shared/view/BuildingTabs';
import { BuildingBasicInfo } from './BuildingBasicInfo';
import { FloorSettingsTable } from './FloorSettingsTable';
import { FloorTradeTable, type FloorTradeTableHandle } from '../../quantity/view/FloorTradeTable';
import { Spinner } from '@/shared/components/ui';
import { useBuildingList } from '../../shared/service/useBuildingList';
import { useGenerationProgress } from '../service/useGenerationProgress';

interface Props {
  projectId: string;
}

export function DataInputPage({ projectId }: Props) {
  const {
    buildings,
    activeBuildingIndex,
    isLoading,
    activeBuilding,
    setActiveBuildingIndex,
    loadBuildings,
    handleCreateBuildings,
    handleDeleteBuilding,
    handleUpdateBuildingName,
    handleReorder,
  } = useBuildingList(projectId);

  const generation = useGenerationProgress();
  const floorTradeTableRef = useRef<FloorTradeTableHandle>(null);

  const handleBeforeRegenerate = useCallback(async () => {
    if (floorTradeTableRef.current) {
      await floorTradeTableRef.current.flushPendingSaves();
    }
  }, []);

  return (
    <div className="space-y-6 w-full px-4 sm:px-6 lg:px-8">
      {/* 동 수 입력 영역 */}
      <BuildingForm onCreate={handleCreateBuildings} isLoading={isLoading} />

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
              <BuildingBasicInfo
                building={activeBuilding}
                onUpdate={loadBuildings}
                isFirstBuilding={activeBuildingIndex === 0}
                onStartGeneration={generation.handleStart}
                onGenerationProgress={generation.handleProgress}
                onGenerationComplete={() => generation.handleComplete(loadBuildings)}
                onBeforeRegenerate={handleBeforeRegenerate}
              />

              {/* 층 생성 로딩 표시 */}
              {generation.isGenerating && (
                <div className="bg-white dark:bg-slate-900 rounded-lg border border-slate-200 dark:border-slate-800 p-6">
                  <div className="space-y-4">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <Spinner size="sm" variant="primary" />
                        <div>
                          <p className="text-sm font-medium text-slate-900 dark:text-white">
                            {generation.message || '층 설정 및 물량 입력표 생성 중...'}
                          </p>
                          <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                            잠시만 기다려주세요
                          </p>
                        </div>
                      </div>
                      <span className="text-sm font-semibold text-primary-600 dark:text-primary-400">
                        {generation.progress}%
                      </span>
                    </div>
                    <div className="w-full h-2 bg-slate-200 dark:bg-slate-800 rounded-full overflow-hidden">
                      <div
                        className="h-full bg-primary-500 transition-all duration-300 ease-out"
                        style={{ width: `${generation.progress}%` }}
                      />
                    </div>
                  </div>
                </div>
              )}

              {/* 층 설정 테이블 */}
              {(!generation.isGenerating || generation.progress >= 100) && (
                <FloorSettingsTable
                  building={activeBuilding}
                  onUpdate={loadBuildings}
                />
              )}

              {/* 층별 공종 입력 테이블 */}
              {(!generation.isGenerating || generation.progress >= 100) && (
                <FloorTradeTable
                  ref={floorTradeTableRef}
                  building={activeBuilding}
                  onUpdate={loadBuildings}
                />
              )}
            </div>
          )}
        </BuildingTabs>
      ) : (
        <div className="text-center py-12 text-slate-500 dark:text-slate-400">
          <p>동 수를 입력하고 &quot;동 탭 생성&quot; 버튼을 클릭하여 시작하세요.</p>
        </div>
      )}
    </div>
  );
}
