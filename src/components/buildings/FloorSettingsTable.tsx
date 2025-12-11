'use client';

import { useState, useEffect, useMemo } from 'react';
import { Card, CardHeader, CardTitle, CardContent, Input } from '@/components/ui';
import type { Building, Floor, FloorClass } from '@/lib/types';
import { updateFloor } from '@/lib/services/buildings';
import { toast } from 'sonner';

interface Props {
  building: Building;
  onUpdate: () => void;
}

const FLOOR_CLASSES: FloorClass[] = ['지하층', '일반층', '셋팅층', '기준층', '최상층', 'PH층'];

export function FloorSettingsTable({ building, onUpdate }: Props) {
  const [floors, setFloors] = useState<Floor[]>(building.floors);
  const [pendingHeights, setPendingHeights] = useState<Record<string, number | null>>({});
  const [savedFloorIds, setSavedFloorIds] = useState<Set<string>>(new Set());

  useEffect(() => {
    setFloors(building.floors);
  }, [building]);

  // 코어1의 최대 층수를 기준으로 층 목록 생성
  const displayFloors = useMemo(() => {
    const coreCount = building.meta.coreCount;
    const coreGroundFloors = building.meta.floorCount.coreGroundFloors;
    
    // 코어가 2개 이상이고 코어별 층수가 있으면 코어1의 최대 층수를 기준으로 표 작성
    if (coreCount > 1 && coreGroundFloors && coreGroundFloors.length > 0) {
      const result: Floor[] = [];
      
      // 코어1의 최대 층수
      const core1MaxFloor = coreGroundFloors[0] || 0;
      
      // 지하층 추가 (공통)
      const basementFloors = floors.filter(f => f.levelType === '지하');
      result.push(...basementFloors);
      
      // 셋팅층과 일반층을 floorNumber로 정렬하여 추가
      const settingAndNormalFloors = floors.filter(f => 
        (f.floorClass === '셋팅층' || f.floorClass === '일반층') && 
        (f.floorLabel.includes('코어1-') || !f.floorLabel.includes('코어'))
      ).sort((a, b) => a.floorNumber - b.floorNumber);
      result.push(...settingAndNormalFloors);
      
      // 코어1의 지상층 기준으로 행 추가 (1F, 2F, ...)
      // 먼저 기준층 범위 형식이 있는지 확인 (코어1 기준)
      const standardRangeFloor = floors.find(f => 
        f.floorClass === '기준층' && 
        f.floorLabel.includes('~') && 
        (f.floorLabel.includes('코어1-') || !f.floorLabel.includes('코어'))
      );
      
      if (standardRangeFloor) {
        // 기준층 범위가 있으면 개별 층 대신 범위 형식으로 추가
        result.push(standardRangeFloor);
        
        // 최상층 추가 (코어1의 최대 층수)
        const topFloor = floors.find(f => {
          const match = f.floorLabel.match(/코어1-(\d+)F/);
          return match && parseInt(match[1], 10) === core1MaxFloor && f.floorClass === '최상층';
        });
        
        if (topFloor) {
          result.push(topFloor);
        } else {
          // 최상층이 없으면 찾기 (코어1의 최대 층수)
          const topFloorAlt = floors.find(f => {
            const match = f.floorLabel.match(/코어1-(\d+)F/);
            return match && parseInt(match[1], 10) === core1MaxFloor;
          });
          if (topFloorAlt) {
            result.push(topFloorAlt);
          }
        }
      } else {
        // 기준층 범위가 없으면 개별 층 처리
        // 셋팅층과 일반층은 이미 추가했으므로, 기준층과 최상층만 추가
      for (let i = 1; i <= core1MaxFloor; i++) {
          // 셋팅층 또는 일반층은 이미 추가했으므로 건너뛰기
          const isSettingOrNormalFloor = floors.some(f => {
            const match = f.floorLabel.match(/코어1-(\d+)F/);
            return match && parseInt(match[1], 10) === i && (f.floorClass === '셋팅층' || f.floorClass === '일반층');
          });
          if (isSettingOrNormalFloor) {
            continue;
          }
          
        // 코어1의 해당 층 찾기
        const core1Floor = floors.find(f => {
          const match = f.floorLabel.match(/코어1-(\d+)F/);
          return match && parseInt(match[1], 10) === i;
        });
        
        if (core1Floor) {
          result.push(core1Floor);
        } else {
          // 코어1에 해당 층이 없으면 더미 층 생성 (표시용)
            // 최상층인 경우 최상층으로 표시
            const isTopFloor = i === core1MaxFloor;
          result.push({
            id: `dummy-${i}F`,
            buildingId: building.id,
            floorLabel: `${i}F`,
            floorNumber: i,
            levelType: '지상',
              floorClass: isTopFloor ? '최상층' : '기준층',
            height: null,
          });
          }
        }
      }
      
      // PH층 추가 (공통)
      const phFloors = floors.filter(f => f.floorClass === 'PH층');
      result.push(...phFloors);
      
      return result;
    }
    
    // 기존 방식: 모든 층 반환 (floorNumber로 정렬)
    return [...floors].sort((a, b) => a.floorNumber - b.floorNumber);
  }, [floors, building.meta.coreCount, building.meta.floorCount.coreGroundFloors, building.id]);

  const handleFloorUpdate = async (floorId: string, updates: { floorClass?: FloorClass; height?: number | null }, showToast: boolean = true) => {
    try {
      await updateFloor(floorId, building.id, building.projectId, updates);
      const updatedFloors = floors.map(f => f.id === floorId ? { ...f, ...updates } : f);
      setFloors(updatedFloors);
      
      // 셋팅층이 2층이나 3층으로 설정된 경우, 그보다 낮은 층을 '일반층'으로 변경
      if (updates.floorClass === '셋팅층') {
        const updatedFloor = updatedFloors.find(f => f.id === floorId);
        if (updatedFloor) {
          const floorMatch = updatedFloor.floorLabel.match(/(\d+)F/);
          if (floorMatch) {
            const settingFloorNum = parseInt(floorMatch[1], 10);
            // 셋팅층이 2층이나 3층인 경우
            if (settingFloorNum === 2 || settingFloorNum === 3) {
              // 지상층 중 셋팅층보다 낮은 층 찾기
              const lowerFloors = updatedFloors.filter(f => {
                if (f.levelType !== '지상' || f.id === floorId) return false;
                const match = f.floorLabel.match(/(\d+)F/);
                if (match) {
                  const floorNum = parseInt(match[1], 10);
                  return floorNum < settingFloorNum;
                }
                return false;
              });
              
              // 낮은 층들을 '일반층'으로 변경
              for (const lowerFloor of lowerFloors) {
                if (lowerFloor.floorClass !== '일반층') {
                  await updateFloor(lowerFloor.id, building.id, building.projectId, { floorClass: '일반층' });
                  updatedFloors.forEach(f => {
                    if (f.id === lowerFloor.id) {
                      f.floorClass = '일반층';
                    }
                  });
                }
              }
              setFloors([...updatedFloors]);
            }
          }
        }
      }
      
      // 층고 업데이트인 경우에만 토스트 표시 (showToast가 true이고 아직 저장되지 않은 경우)
      if (updates.height !== undefined && showToast && !savedFloorIds.has(floorId)) {
        toast.success('층고가 저장되었습니다.');
        setSavedFloorIds(prev => new Set(prev).add(floorId));
      } else if (updates.floorClass !== undefined && showToast) {
        toast.success('층 정보가 업데이트되었습니다.');
      }
      
      // pendingHeights에서 제거
      if (updates.height !== undefined) {
        setPendingHeights(prev => {
          const next = { ...prev };
          delete next[floorId];
          return next;
        });
      }
      
      onUpdate();
    } catch (error) {
      toast.error('업데이트에 실패했습니다.');
    }
  };

  // 층고 입력 변경 시 로컬 상태만 업데이트
  const handleHeightChange = (floorId: string, value: number | null) => {
    setPendingHeights(prev => ({ ...prev, [floorId]: value }));
    setFloors(floors.map(f => f.id === floorId ? { ...f, height: value } : f));
    // 저장 상태 초기화 (새로운 값이 입력되면 다시 저장 가능하도록)
    setSavedFloorIds(prev => {
      const next = new Set(prev);
      next.delete(floorId);
      return next;
    });
  };

  // 입력창 blur 시 저장
  const handleHeightBlur = (floorId: string) => {
    if (pendingHeights[floorId] !== undefined) {
      const height = pendingHeights[floorId];
      handleFloorUpdate(floorId, { height }, true);
    }
  };

  if (floors.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>층 설정</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-slate-500 dark:text-slate-400">
            동 기본 정보에서 층수를 입력하고 저장하면 층 리스트가 자동 생성됩니다.
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>층 설정</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="overflow-x-auto">
          <table className="w-full border-collapse">
            <thead>
              <tr className="border-b border-slate-200 dark:border-slate-800">
                <th className="px-2 py-1 text-left text-sm font-semibold text-slate-900 dark:text-white">층</th>
                <th className="px-2 py-1 text-left text-sm font-semibold text-slate-900 dark:text-white">지상/지하</th>
                <th className="px-2 py-1 text-left text-sm font-semibold text-slate-900 dark:text-white">층 분류</th>
                <th className="px-2 py-1 text-left text-sm font-semibold text-slate-900 dark:text-white">층고(mm)</th>
              </tr>
            </thead>
            <tbody>
              {displayFloors.map((floor) => {
                // 더미 층인 경우 실제 층 찾기 (업데이트용)
                const actualFloor = floor.id.startsWith('dummy-') 
                  ? floors.find(f => {
                      const match = f.floorLabel.match(/코어1-(\d+)F/);
                      const floorMatch = floor.id.match(/dummy-(\d+)F/);
                      return match && floorMatch && match[1] === floorMatch[1];
                    })
                  : floor;

                // 층 라벨 포맷팅 (기준층은 범위 형식으로 표시)
                const formatFloorLabel = (label: string, floorClass: FloorClass) => {
                  let formatted = label.replace(/코어\d+-/, '');
                  
                  // 기준층인 경우 "2~14F 기준층" -> "2~14F" 형식으로 표시
                  if (floorClass === '기준층' && formatted.includes('기준층')) {
                    formatted = formatted.replace(/\s*기준층\s*/, '');
                  }
                  
                  return formatted;
                };

                return (
                  <tr
                    key={floor.id}
                    className="border-b border-slate-100 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-900"
                  >
                    <td className="px-2 py-1 text-sm text-slate-900 dark:text-white font-medium">
                      {formatFloorLabel(floor.floorLabel, floor.floorClass)}
                    </td>
                    <td className="px-2 py-1 text-sm text-slate-600 dark:text-slate-400">
                      {floor.levelType}
                    </td>
                    <td className="px-2 py-1">
                      <select
                        value={floor.floorClass}
                        onChange={(e) => {
                          if (actualFloor) {
                            handleFloorUpdate(actualFloor.id, { floorClass: e.target.value as FloorClass });
                          }
                        }}
                        disabled={!actualFloor}
                        className="w-full px-2 py-1 text-sm border border-slate-200 dark:border-slate-700 rounded bg-white dark:bg-slate-800 text-slate-900 dark:text-white disabled:opacity-50 disabled:cursor-not-allowed"
                      >
                        {FLOOR_CLASSES.map((fc) => (
                          <option key={fc} value={fc}>
                            {fc}
                          </option>
                        ))}
                      </select>
                    </td>
                    <td className="px-2 py-1">
                      <Input
                        type="number"
                        step="1"
                        min="0"
                        value={floor.height ?? ''}
                        onChange={(e) => {
                          // 기준층인 경우 actualFloor가 없어도 floor 자체를 사용
                          const targetFloor = actualFloor || floor;
                          if (targetFloor && !targetFloor.id.startsWith('dummy-')) {
                            const value = e.target.value ? Number(e.target.value) : null;
                            handleHeightChange(targetFloor.id, value);
                          }
                        }}
                        onBlur={() => {
                          // 기준층인 경우 actualFloor가 없어도 floor 자체를 사용
                          const targetFloor = actualFloor || floor;
                          if (targetFloor && !targetFloor.id.startsWith('dummy-')) {
                            handleHeightBlur(targetFloor.id);
                          }
                        }}
                        disabled={true}
                        placeholder="층고 입력 (mm)"
                        className="w-24 h-8 disabled:opacity-50 disabled:cursor-not-allowed"
                      />
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </CardContent>
    </Card>
  );
}

