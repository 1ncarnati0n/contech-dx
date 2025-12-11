'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { BuildingForm } from './BuildingForm';
import { BuildingTabs } from './BuildingTabs';
import { BuildingBasicInfo } from './BuildingBasicInfo';
import { FloorSettingsTable } from './FloorSettingsTable';
import { FloorTradeTable, type FloorTradeTableHandle } from './FloorTradeTable';
import type { Building, BuildingMeta, Floor } from '@/lib/types';
import { createBuilding, getBuildings, deleteBuilding, updateBuilding, reorderBuildings, updateBuildingFloorsAndTrades } from '@/lib/services/buildings';
import { toast } from 'sonner';
import { Spinner } from '@/components/ui';

interface Props {
  projectId: string;
}

export function DataInputPage({ projectId }: Props) {
  const [buildings, setBuildings] = useState<Building[]>([]);
  const [activeBuildingIndex, setActiveBuildingIndex] = useState(0);
  const [isLoading, setIsLoading] = useState(false);
  const [isInitialized, setIsInitialized] = useState(false);
  const [commonMeta, setCommonMeta] = useState<BuildingMeta | null>(null);
  const [isGeneratingFloors, setIsGeneratingFloors] = useState(false);
  const [generationProgress, setGenerationProgress] = useState(0);
  const [generationMessage, setGenerationMessage] = useState('');
  const floorTradeTableRef = useRef<FloorTradeTableHandle>(null);

  // 초기 데이터 로드
  const loadBuildings = useCallback(async () => {
    try {
      const data = await getBuildings(projectId);
      setBuildings(data);
      setIsInitialized(true);
      
      // 활성 탭이 유효하지 않으면 첫 번째로 설정
      if (data.length > 0 && activeBuildingIndex >= data.length) {
        setActiveBuildingIndex(0);
      }
    } catch (error) {
      toast.error('동 목록을 불러오는데 실패했습니다.');
    }
  }, [projectId, activeBuildingIndex]);

  useEffect(() => {
    if (!isInitialized) {
      loadBuildings();
    }
  }, [isInitialized, loadBuildings]);

  // 공통 메타데이터가 변경되면 모든 동에 자동 적용
  useEffect(() => {
    if (commonMeta && buildings.length > 0) {
      // 모든 동에 공통 메타데이터 적용
      const applyPromises = buildings.map(building => 
        updateBuilding(building.id, projectId, {
          meta: commonMeta,
        }).catch((error) => {
          console.error(`Failed to apply common meta to ${building.buildingName}:`, error);
          return null;
        })
      );
      
      Promise.all(applyPromises).then(() => {
        loadBuildings();
      });
    }
  }, [commonMeta, projectId]); // commonMeta가 변경될 때만 실행

  // 동 이름에서 번호 추출 및 다음 번호 찾기
  const getNextBuildingNumber = useCallback((existingBuildings: Building[]): number => {
    if (existingBuildings.length === 0) return 101;
    
    const numbers = existingBuildings
      .map(b => {
        const match = b.buildingName.match(/(\d+)동/);
        return match ? parseInt(match[1], 10) : 0;
      })
      .filter(n => n > 0)
      .sort((a, b) => b - a);
    
    return numbers.length > 0 ? numbers[0] + 1 : 101;
  }, []);

  // 동 생성
  const handleCreateBuildings = useCallback(async (count: number) => {
    if (count <= 0) {
      toast.error('동 수를 입력해주세요.');
      return;
    }

    setIsLoading(true);
    try {
      const newBuildings: Building[] = [];
      let nextNumber = getNextBuildingNumber(buildings);
      
      // 입력한 동수에서 기존 동 수를 빼서 추가 생성할 개수 계산
      const existingCount = buildings.length;
      const targetTotalCount = count;
      const additionalCount = Math.max(0, targetTotalCount - existingCount);
      
      if (additionalCount === 0) {
        toast.info(`이미 ${existingCount}개의 동이 존재합니다. 추가 생성할 동이 없습니다.`);
        setIsLoading(false);
        return;
      }
      
      // 103동을 기준으로 찾기
      const referenceBuilding = buildings.find(b => b.buildingName === '103동' || b.buildingNumber === 103);
      
      // 전동 공통적용 메타데이터가 있으면 사용, 없으면 103동의 메타데이터 사용, 그것도 없으면 기본값
      let defaultMeta: BuildingMeta;
      let referenceFloors: Floor[] = [];
      
      if (referenceBuilding) {
        // 103동이 있으면 103동의 메타데이터와 층 설정 복사
        defaultMeta = JSON.parse(JSON.stringify(referenceBuilding.meta));
        referenceFloors = JSON.parse(JSON.stringify(referenceBuilding.floors));
      } else if (commonMeta) {
        defaultMeta = commonMeta;
      } else {
        defaultMeta = {
          totalUnits: 0,
          unitTypePattern: [],
          coreCount: 0,
          coreType: '중복도(판상형)',
          slabType: '벽식구조',
          floorCount: {
            basement: 0,
            ground: 0,
            ph: 0,
            pilotisCount: 0,
          },
          heights: {
            basement2: 0,
            basement1: 0,
            standard: 0,
            floor1: 0,
            floor2: 0,
            top: 0,
            ph: 0,
          },
        };
      }
      
      for (let i = 0; i < additionalCount; i++) {
        const buildingName = `${nextNumber + i}동`;
        
        // 103동이 있으면 층 설정도 복사
        if (referenceBuilding && referenceFloors.length > 0) {
          const building = await createBuilding({
            projectId,
            buildingName,
            buildingNumber: buildings.length + i + 1,
            meta: { ...defaultMeta },
          });
          
          // 층 설정을 복사하되 buildingId는 새로운 동의 ID로 변경
          const copiedFloors = referenceFloors.map((floor, floorIndex) => ({
            ...floor,
            id: `floor-${Date.now()}-${Math.random().toString(36).substr(2, 9)}-${i}-${floorIndex}`,
            buildingId: building.id,
          }));
          
          // 층 설정 저장
          await updateBuildingFloorsAndTrades(
            building.id,
            projectId,
            copiedFloors,
            []
          );
          
          // building 객체의 floors도 업데이트
          building.floors = copiedFloors;
          
          newBuildings.push(building);
        } else {
          const building = await createBuilding({
            projectId,
            buildingName,
            buildingNumber: buildings.length + i + 1,
            meta: { ...defaultMeta },
          });
          newBuildings.push(building);
        }
      }

      // 새로 생성된 동들을 기존 목록에 추가
      const updatedBuildings = [...buildings, ...newBuildings];
      setBuildings(updatedBuildings);
      
      // 마지막 생성된 동으로 탭 이동
      setActiveBuildingIndex(updatedBuildings.length - 1);
      
      toast.success(`${additionalCount}개의 동이 추가 생성되었습니다. (총 ${updatedBuildings.length}개)`);
    } catch (error) {
      toast.error('동 생성에 실패했습니다.');
    } finally {
      setIsLoading(false);
    }
  }, [projectId, buildings, commonMeta, getNextBuildingNumber]);

  // 전동 공통적용 메타데이터 저장
  const handleApplyCommonMeta = useCallback((meta: BuildingMeta) => {
    setCommonMeta(meta);
  }, []);

  // 층 생성 진행률 콜백
  const handleGenerationProgress = useCallback((progress: number, message: string) => {
    setGenerationProgress(progress);
    setGenerationMessage(message);
  }, []);

  // 층 생성 시작
  const handleStartGeneration = useCallback(() => {
    setIsGeneratingFloors(true);
    setGenerationProgress(0);
    setGenerationMessage('데이터 저장 중...');
  }, []);

  // 층 생성 완료
  const handleGenerationComplete = useCallback(async () => {
    setGenerationProgress(100);
    setGenerationMessage('완료!');
    
    // 데이터 새로고침
    await loadBuildings();
    
    // 약간의 지연 후 로딩 상태 해제 (시각적 피드백)
    setTimeout(() => {
      setIsGeneratingFloors(false);
      setGenerationProgress(0);
      setGenerationMessage('');
    }, 300);
  }, [loadBuildings]);

  // 층 재생성 전 저장 완료 보장
  const handleBeforeRegenerate = useCallback(async () => {
    if (floorTradeTableRef.current) {
      await floorTradeTableRef.current.flushPendingSaves();
    }
  }, []);

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
    <div className="space-y-6">
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
              {/* 동 기본 정보 카드 */}
              <BuildingBasicInfo
                building={activeBuilding}
                onUpdate={loadBuildings}
                isFirstBuilding={activeBuildingIndex === 0}
                onStartGeneration={handleStartGeneration}
                onGenerationProgress={handleGenerationProgress}
                onGenerationComplete={handleGenerationComplete}
                onBeforeRegenerate={handleBeforeRegenerate}
              />

              {/* 층 생성 로딩 표시 */}
              {isGeneratingFloors && (
                <div className="bg-white dark:bg-slate-900 rounded-lg border border-slate-200 dark:border-slate-800 p-6">
                  <div className="space-y-4">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <Spinner size="sm" variant="primary" />
                        <div>
                          <p className="text-sm font-medium text-slate-900 dark:text-white">
                            {generationMessage || '층 설정 및 물량 입력표 생성 중...'}
                          </p>
                          <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                            잠시만 기다려주세요
                          </p>
                        </div>
                      </div>
                      <span className="text-sm font-semibold text-primary-600 dark:text-primary-400">
                        {generationProgress}%
                      </span>
                    </div>
                    {/* 진행률 바 */}
                    <div className="w-full h-2 bg-slate-200 dark:bg-slate-800 rounded-full overflow-hidden">
                      <div
                        className="h-full bg-primary-500 transition-all duration-300 ease-out"
                        style={{ width: `${generationProgress}%` }}
                      />
                    </div>
                  </div>
                </div>
              )}

              {/* 층 설정 테이블 - 생성 중이 아니거나 완료되면 표시 */}
              {(!isGeneratingFloors || generationProgress >= 100) && (
                <FloorSettingsTable
                  building={activeBuilding}
                  onUpdate={loadBuildings}
                />
              )}

              {/* 층별 공종 입력 테이블 - 생성 중이 아니거나 완료되면 표시 */}
              {(!isGeneratingFloors || generationProgress >= 100) && (
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
          <p>동 수를 입력하고 "동 탭 생성" 버튼을 클릭하여 시작하세요.</p>
        </div>
      )}
    </div>
  );
}

