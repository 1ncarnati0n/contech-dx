'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import type { Building, Floor, FloorClass } from '@/shared/types';
import { updateFloor } from '@/features/building/shared/repository/buildings';
import { toast } from 'sonner';
import { logger } from '@/shared/utils/logger';

// ============================================
// 층 번호 추출 헬퍼
// ============================================

function extractFloorNum(floor: Floor, coreCount: number): number | null {
  if (floor.floorLabel.includes('~')) return null;

  if (coreCount > 1) {
    const m = floor.floorLabel.match(/코어1-(\d+)F/);
    if (m) return parseInt(m[1], 10);
  } else {
    const m = floor.floorLabel.match(/^(\d+)F$/);
    if (m) return parseInt(m[1], 10);
  }
  return null;
}

function findFloorsInRange(floors: Floor[], floorId: string, minNum: number, maxNum: number): Floor[] {
  return floors.filter(f => {
    if (f.levelType !== '지상' || f.id === floorId) return false;
    const m = f.floorLabel.match(/(\d+)F/);
    if (m) {
      const num = parseInt(m[1], 10);
      return num >= minNum && num <= maxNum;
    }
    return false;
  });
}

// ============================================
// 셋팅층 설정 시 자동 분류
// ============================================

async function applySettingFloorClassification(
  floors: Floor[],
  settingFloorId: string,
  settingFloorNum: number,
  doUpdate: (floorId: string, updates: { floorClass?: FloorClass }, showToast?: boolean) => Promise<void>,
) {
  if (settingFloorNum < 1 || settingFloorNum > 5) return;

  // 셋팅층보다 위에 있는 층(~5층)을 기준층으로
  const upperFloors = findFloorsInRange(floors, settingFloorId, settingFloorNum + 1, 5);
  for (const f of upperFloors) {
    if (f.floorClass !== '기준층') {
      await doUpdate(f.id, { floorClass: '기준층' }, false);
    }
  }

  // 셋팅층보다 아래 층(1~)을 일반층으로
  const lowerFloors = findFloorsInRange(floors, settingFloorId, 1, settingFloorNum - 1);
  for (const f of lowerFloors) {
    if (f.floorClass !== '일반층' && f.floorClass !== '셋팅층') {
      await doUpdate(f.id, { floorClass: '일반층' }, false);
    }
  }
}

// ============================================
// 층고 변경 시 셋팅층 자동 판단
// ============================================

async function applyHeightBasedClassification(
  floors: Floor[],
  floorId: string,
  updatedFloorNum: number,
  newHeight: number,
  standardHeight: number,
  coreCount: number,
  doUpdate: (floorId: string, updates: { floorClass?: FloorClass }, showToast?: boolean) => Promise<void>,
) {
  const groundFloors = floors
    .filter(f => f.levelType === '지상' && !f.floorLabel.includes('~'))
    .map(f => ({ floor: f, floorNum: extractFloorNum(f, coreCount) }))
    .filter((item): item is { floor: Floor; floorNum: number } => item.floorNum !== null)
    .sort((a, b) => b.floorNum - a.floorNum); // 내림차순 (위→아래)

  if (updatedFloorNum === 1) {
    // 1층 특수처리: 2층이 기준층 층고이고 1층이 다르면 셋팅층
    const floor2 = groundFloors.find(item => item.floorNum === 2);
    if (floor2 && floor2.floor.height === standardHeight && newHeight !== standardHeight) {
      const updatedFloor = floors.find(f => f.id === floorId);
      if (updatedFloor && updatedFloor.floorClass !== '셋팅층') {
        await doUpdate(floorId, { floorClass: '셋팅층' }, false);
      }
    }
    return;
  }

  if (newHeight !== standardHeight) {
    // 기준층 층고와 다른 경우: 위에서 내려오면서 연속 기준층고 마지막 층 = 셋팅층
    const upperFloors = groundFloors.filter(item => item.floorNum > updatedFloorNum);

    let lastStandardHeightFloor: { floor: Floor; floorNum: number } | null = null;
    for (const item of upperFloors) {
      if (item.floor.height === standardHeight) {
        if (!lastStandardHeightFloor || item.floorNum < lastStandardHeightFloor.floorNum) {
          lastStandardHeightFloor = item;
        }
      } else {
        break;
      }
    }

    if (lastStandardHeightFloor && lastStandardHeightFloor.floor.floorClass !== '셋팅층') {
      await doUpdate(lastStandardHeightFloor.floor.id, { floorClass: '셋팅층' }, false);
    }
  } else {
    // 기준층 층고로 변경된 경우: 위에서 내려오면서 다른 층고를 만나면 그 위의 마지막 기준층고 층이 셋팅층
    let foundDifferentHeight = false;
    let settingFloorCandidate: { floor: Floor; floorNum: number } | null = null;

    for (const item of groundFloors) {
      if (item.floorNum === updatedFloorNum) {
        if (!settingFloorCandidate || item.floorNum < settingFloorCandidate.floorNum) {
          settingFloorCandidate = item;
        }
        continue;
      }

      if (item.floor.height !== standardHeight) {
        foundDifferentHeight = true;
        break;
      } else {
        if (!settingFloorCandidate || item.floorNum < settingFloorCandidate.floorNum) {
          settingFloorCandidate = item;
        }
      }
    }

    if (foundDifferentHeight && settingFloorCandidate && settingFloorCandidate.floor.floorClass !== '셋팅층') {
      await doUpdate(settingFloorCandidate.floor.id, { floorClass: '셋팅층' }, false);
    }
  }
}

// ============================================
// useFloorUpdate 훅
// ============================================

interface UseFloorUpdateResult {
  floors: Floor[];
  handleFloorUpdate: (floorId: string, updates: { floorClass?: FloorClass; height?: number | null }, showToast?: boolean) => Promise<void>;
}

/**
 * 층 업데이트 훅
 *
 * - API를 통한 층 업데이트
 * - 셋팅층 설정 시 자동 분류 (위쪽→기준층, 아래쪽→일반층)
 * - 층고 변경 시 셋팅층 자동 판단
 * - 초기 로드 시 셋팅층 기반 자동 분류
 */
export function useFloorUpdate(building: Building, onUpdate: () => void): UseFloorUpdateResult {
  const [floors, setFloors] = useState<Floor[]>(building.floors);
  const processedSettingFloorRef = useRef<string | null>(null);

  useEffect(() => {
    setFloors(building.floors);
  }, [building]);

  const handleFloorUpdate = useCallback(async (
    floorId: string,
    updates: { floorClass?: FloorClass; height?: number | null },
    showToast: boolean = true,
  ) => {
    try {
      await updateFloor(floorId, building.id, building.projectId, updates);
      const updatedFloors = floors.map(f => f.id === floorId ? { ...f, ...updates } : f);
      setFloors(updatedFloors);

      // 셋팅층 설정 시 자동 분류
      if (updates.floorClass === '셋팅층') {
        const updatedFloor = updatedFloors.find(f => f.id === floorId);
        if (updatedFloor) {
          const m = updatedFloor.floorLabel.match(/(\d+)F/);
          if (m) {
            const settingFloorNum = parseInt(m[1], 10);
            await applySettingFloorClassification(
              updatedFloors,
              floorId,
              settingFloorNum,
              handleFloorUpdate,
            );
            setFloors([...updatedFloors]);
          }
        }
      }

      // 층고 변경 시 셋팅층 자동 판단
      if (updates.height !== undefined) {
        const updatedFloor = updatedFloors.find(f => f.id === floorId);
        if (updatedFloor && updatedFloor.levelType === '지상') {
          const standardHeight = building.meta.heights?.standard;
          if (standardHeight !== undefined && standardHeight !== null) {
            const updatedFloorNum = extractFloorNum(updatedFloor, building.meta.coreCount);
            if (updatedFloorNum !== null && updates.height !== null) {
              await applyHeightBasedClassification(
                updatedFloors,
                floorId,
                updatedFloorNum,
                updates.height,
                standardHeight,
                building.meta.coreCount,
                handleFloorUpdate,
              );
            }
          }
        }
      }

      if (updates.floorClass !== undefined && showToast) {
        toast.success('층 정보가 업데이트되었습니다.');
      }

      onUpdate();
    } catch {
      toast.error('업데이트에 실패했습니다.');
    }
  }, [building, floors, onUpdate]);

  // 초기 셋팅층 자동 분류
  useEffect(() => {
    const applyInitialClassification = async () => {
      const currentFloors = building.floors;

      const settingFloor = currentFloors.find(f => {
        if (f.levelType !== '지상' || f.floorClass !== '셋팅층') return false;
        const m = f.floorLabel.match(/(\d+)F/);
        if (m) {
          const num = parseInt(m[1], 10);
          return num >= 1 && num <= 5;
        }
        return false;
      });

      if (settingFloor) {
        if (processedSettingFloorRef.current === settingFloor.id) return;

        const m = settingFloor.floorLabel.match(/(\d+)F/);
        if (m) {
          const settingFloorNum = parseInt(m[1], 10);
          const floorsAbove = findFloorsInRange(currentFloors, settingFloor.id, settingFloorNum + 1, 5);
          const needsUpdate = floorsAbove.some(f => f.floorClass !== '기준층');

          if (needsUpdate) {
            for (const f of floorsAbove) {
              if (f.floorClass !== '기준층') {
                try {
                  await updateFloor(f.id, building.id, building.projectId, { floorClass: '기준층' });
                  setFloors(prev => prev.map(fl => fl.id === f.id ? { ...fl, floorClass: '기준층' } : fl));
                } catch (error) {
                  logger.error(`Failed to update floor ${f.id}:`, error);
                }
              }
            }
            processedSettingFloorRef.current = settingFloor.id;
            onUpdate();
          } else {
            processedSettingFloorRef.current = settingFloor.id;
          }
        }
      } else {
        processedSettingFloorRef.current = null;
      }
    };

    if (building.floors.length > 0) {
      applyInitialClassification();
    }
  }, [building.floors, building.id, building.projectId, onUpdate]);

  return { floors, handleFloorUpdate };
}
