'use client';

import { BuildingForm } from './BuildingForm';
import { BuildingTabs } from '../../shared/view/BuildingTabs';
import { BuildingBasicInfo } from './BuildingBasicInfo';
import { FloorSettingsTable } from './FloorSettingsTable';
import { Spinner, Button, Card } from '@/shared/components/ui';
import { Copy, Building2 } from 'lucide-react';
import { useBuildingList, useBuildingCopy } from '../../shared/service/useBuildingList';
import { useGenerationProgress } from '../service/useGenerationProgress';

interface Props {
  projectId: string;
}

export function BuildingBasicInfoPage({ projectId }: Props) {
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

  const {
    isCopying,
    copyCount,
    showCopyDialog,
    setCopyCount,
    setShowCopyDialog,
    handleCopyBuilding,
    resetCopyState,
  } = useBuildingCopy(projectId, buildings, loadBuildings, setActiveBuildingIndex);

  const generation = useGenerationProgress();

  return (
    <div className="space-y-6 w-full px-4 sm:px-6 lg:px-8">
      {/* 동 수 입력 및 복사 영역 */}
      <Card className="p-4">
        <div className="flex items-center gap-4 flex-wrap">
          <BuildingForm onCreate={handleCreateBuildings} isLoading={isLoading} />

          {buildings.length > 0 && activeBuilding && (
            <>
              <div className="w-px h-8 bg-slate-200 dark:bg-slate-700" />
              <div className="flex items-center gap-3">
                <div>
                  <h3 className="text-sm font-medium text-slate-900 dark:text-white">동 복사</h3>
                  <p className="text-xs text-slate-500 dark:text-slate-400">
                    {activeBuilding.buildingName}의 정보를 복사하여 새로운 동을 생성합니다.
                  </p>
                </div>
                <div className="flex items-center gap-3">
                  {showCopyDialog ? (
                    <>
                      <input
                        type="number"
                        min="1"
                        max="10"
                        value={copyCount}
                        onChange={(e) => setCopyCount(Math.max(1, Number(e.target.value)))}
                        className="w-20 px-3 py-2 border border-slate-200 dark:border-slate-700 rounded-lg bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-primary-500 text-sm"
                        disabled={isCopying}
                        autoFocus
                      />
                      <Button
                        variant="primary"
                        size="sm"
                        onClick={() => handleCopyBuilding(activeBuilding, copyCount)}
                        disabled={isCopying || copyCount <= 0}
                        className="gap-2"
                      >
                        <Copy className="w-4 h-4" />
                        {isCopying ? '복사 중...' : '복사'}
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={resetCopyState}
                        disabled={isCopying}
                      >
                        취소
                      </Button>
                    </>
                  ) : (
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setShowCopyDialog(true)}
                      className="gap-2"
                    >
                      <Copy className="w-4 h-4" />
                      동 복사
                    </Button>
                  )}
                </div>
              </div>
            </>
          )}
        </div>
      </Card>

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
              />

              {/* 층 생성 로딩 */}
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

              {(!generation.isGenerating || generation.progress >= 100) && (
                <FloorSettingsTable
                  building={activeBuilding}
                  onUpdate={loadBuildings}
                />
              )}
            </div>
          )}
        </BuildingTabs>
      ) : (
        <Card className="p-8">
          <div className="flex flex-col items-center justify-center text-center space-y-4">
            <div className="w-16 h-16 rounded-full bg-slate-100 dark:bg-slate-800 flex items-center justify-center">
              <Building2 className="w-8 h-8 text-slate-400 dark:text-slate-500" />
            </div>
            <div className="space-y-2">
              <h3 className="text-lg font-medium text-slate-900 dark:text-white">
                등록된 동이 없습니다
              </h3>
              <p className="text-sm text-slate-500 dark:text-slate-400 max-w-sm">
                위의 동 수 입력란에 생성할 동의 개수를 입력하고 <br />
                <span className="font-medium text-primary-600 dark:text-primary-400">&quot;동 탭 생성&quot;</span> 버튼을 클릭하여 시작하세요.
              </p>
            </div>
          </div>
        </Card>
      )}
    </div>
  );
}
