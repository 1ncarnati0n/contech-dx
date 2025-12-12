'use client';

import { useState, useEffect, useMemo, useRef } from 'react';
import { Card, CardHeader, CardTitle, CardContent, Input } from '@/components/ui';
import type { Building, Floor, FloorClass } from '@/lib/types';
import { updateFloor } from '@/lib/services/buildings';
import { toast } from 'sonner';

interface Props {
  building: Building;
  onUpdate: () => void;
}

const FLOOR_CLASSES: FloorClass[] = ['지하층', '일반층', '셋팅층', '기준층', '최상층', '옥탑층'];

export function FloorSettingsTable({ building, onUpdate }: Props) {
  const [floors, setFloors] = useState<Floor[]>(building.floors);
  const [pendingHeights, setPendingHeights] = useState<Record<string, number | null>>({});
  const [savedFloorIds, setSavedFloorIds] = useState<Set<string>>(new Set());
  const processedSettingFloorRef = useRef<string | null>(null);

  useEffect(() => {
    setFloors(building.floors);
  }, [building]);

  // 기존 셋팅층 확인 및 자동 분류 적용
  useEffect(() => {
    const applySettingFloorLogic = async () => {
      const currentFloors = building.floors;
      
      // 1~5층 중 셋팅층 찾기
      const settingFloor = currentFloors.find(f => {
        if (f.levelType !== '지상' || f.floorClass !== '셋팅층') return false;
        const match = f.floorLabel.match(/(\d+)F/);
        if (match) {
          const floorNum = parseInt(match[1], 10);
          return floorNum >= 1 && floorNum <= 5;
        }
        return false;
      });

      if (settingFloor) {
        // 이미 처리한 셋팅층이면 건너뛰기
        if (processedSettingFloorRef.current === settingFloor.id) {
          return;
        }

        const floorMatch = settingFloor.floorLabel.match(/(\d+)F/);
        if (floorMatch) {
          const settingFloorNum = parseInt(floorMatch[1], 10);
          
          // 셋팅층보다 위에 있는 층들(최대 5층까지) 확인
          const floorsToUpdate = currentFloors.filter(f => {
            if (f.levelType !== '지상' || f.id === settingFloor.id) return false;
            const match = f.floorLabel.match(/(\d+)F/);
            if (match) {
              const floorNum = parseInt(match[1], 10);
              return floorNum > settingFloorNum && floorNum <= 5;
            }
            return false;
          });

          // 기준층이 아닌 층들을 기준층으로 변경
          const needsUpdate = floorsToUpdate.some(f => f.floorClass !== '기준층');
          
          if (needsUpdate) {
            for (const floorToUpdate of floorsToUpdate) {
              if (floorToUpdate.floorClass !== '기준층') {
                try {
                  await updateFloor(floorToUpdate.id, building.id, building.projectId, { floorClass: '기준층' });
                  setFloors(prev => prev.map(f => 
                    f.id === floorToUpdate.id ? { ...f, floorClass: '기준층' } : f
                  ));
                } catch (error) {
                  console.error(`Failed to update floor ${floorToUpdate.id}:`, error);
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
        // 셋팅층이 없으면 ref 초기화
        processedSettingFloorRef.current = null;
      }
    };

    if (building.floors.length > 0) {
      applySettingFloorLogic();
    }
  }, [building.floors, building.id, building.projectId, onUpdate]);

  // 코어1의 최대 층수를 기준으로 층 목록 생성
  const displayFloors = useMemo(() => {
    const coreCount = building.meta.coreCount;
    const coreGroundFloors = building.meta.floorCount.coreGroundFloors;
    
    // 코어가 2개 이상이고 코어별 층수가 있으면 코어1의 최대 층수를 기준으로 표 작성
    if (coreCount > 1 && coreGroundFloors && coreGroundFloors.length > 0) {
      const result: Floor[] = [];
      const addedFloorIds = new Set<string>(); // 중복 체크용
      
      // 코어1의 최대 층수
      const core1MaxFloor = coreGroundFloors[0] || 0;
      
      // 지하층 추가 (공통)
      const basementFloors = floors.filter(f => f.levelType === '지하');
      basementFloors.forEach(f => {
        if (!addedFloorIds.has(f.id)) {
          result.push(f);
          addedFloorIds.add(f.id);
        }
      });
      
      // 기존 범위 형식의 기준층 찾기 (범위에 포함된 개별 층 제외용)
      // 범위 형식: "2~14F", "코어1-2~14F", "2~14F 기준층" 등
      const existingRangeFloors = floors.filter(f => 
        f.floorClass === '기준층' && 
        f.floorLabel.includes('~') &&
        (f.floorLabel.includes('코어1-') || !f.floorLabel.includes('코어'))
      );
      
      // 범위에 포함된 층 번호 추출 (코어1 기준)
      const excludedFloorNums = new Set<number>();
      existingRangeFloors.forEach(rangeFloor => {
        // 코어1-2~14F 형식, 2~14F 형식, 2~14F 기준층 형식 모두 처리
        // "기준층" 텍스트가 있어도 없어도 처리
        let rangeMatch = rangeFloor.floorLabel.match(/코어1-(\d+)~(\d+)F/);
        if (!rangeMatch) {
          rangeMatch = rangeFloor.floorLabel.match(/(\d+)~(\d+)F/);
        }
        if (rangeMatch) {
          const start = parseInt(rangeMatch[1], 10);
          const end = parseInt(rangeMatch[2], 10);
          for (let num = start; num <= end; num++) {
            excludedFloorNums.add(num);
          }
        }
      });
      
      // 범위에 포함된 개별 기준층 ID를 Set으로 저장 (중복 제거용) - 필터링 전에 먼저 생성
      const excludedFloorIds = new Set<string>();
      existingRangeFloors.forEach(rangeFloor => {
        // "기준층" 텍스트가 있어도 없어도 처리
        const rangeMatch = rangeFloor.floorLabel.match(/코어1-(\d+)~(\d+)F/) || 
                          rangeFloor.floorLabel.match(/(\d+)~(\d+)F/);
        if (rangeMatch) {
          const start = parseInt(rangeMatch[1], 10);
          const end = parseInt(rangeMatch[2], 10);
          // 범위에 포함된 개별 층 찾기
          for (let num = start; num <= end; num++) {
            const individualFloor = floors.find(f => {
              if (f.floorLabel.includes('~')) return false;
              const coreMatch = f.floorLabel.match(/코어1-(\d+)F/);
              if (coreMatch && parseInt(coreMatch[1], 10) === num) return true;
              if (coreCount <= 1) {
                const match = f.floorLabel.match(/^(\d+)F$/);
                if (match && parseInt(match[1], 10) === num) return true;
              }
              return false;
            });
            if (individualFloor) {
              excludedFloorIds.add(individualFloor.id);
            }
          }
        }
      });
      
      // 셋팅층과 일반층, 개별 기준층을 floorNumber로 정렬하여 추가 (범위에 포함된 층 제외)
      const settingAndNormalFloors = floors.filter(f => {
        if (f.floorClass !== '셋팅층' && f.floorClass !== '일반층' && f.floorClass !== '기준층') return false;
        if (!f.floorLabel.includes('코어1-') && f.floorLabel.includes('코어')) return false;
        
        // 범위 형식의 층은 제외 (이미 범위로 표시됨)
        if (f.floorLabel.includes('~')) return false;
        
        // 범위에 포함된 개별 층 ID인지 확인
        if (excludedFloorIds.has(f.id)) {
          return false;
        }
        
        // 범위에 포함된 층인지 확인
        const match = f.floorLabel.match(/코어1-(\d+)F/) || f.floorLabel.match(/^(\d+)F$/);
        if (match) {
          const floorNum = parseInt(match[1], 10);
          if (excludedFloorNums.has(floorNum)) {
            return false;
          }
        }
        return true;
      }).sort((a, b) => a.floorNumber - b.floorNumber);
      settingAndNormalFloors.forEach(f => {
        if (!addedFloorIds.has(f.id)) {
          result.push(f);
          addedFloorIds.add(f.id);
        }
      });
      
      // 기존 범위 형식의 기준층 추가
      existingRangeFloors.forEach(f => {
        if (!addedFloorIds.has(f.id)) {
          result.push(f);
          addedFloorIds.add(f.id);
        }
      });
      
      // 범위에 포함되지 않은 개별 기준층과 최상층 처리
      // 코어1의 지상층 기준으로 층 정보 수집 (범위에 포함된 층 제외)
      const groundFloors: Array<{ floor: Floor | null; floorNum: number }> = [];
      
      for (let i = 1; i <= core1MaxFloor; i++) {
        // 범위에 포함된 층은 건너뛰기 (범위 형식으로 이미 표시됨)
        if (excludedFloorNums.has(i)) {
          continue;
        }
        
        // 코어1 기준으로 층 찾기 (코어1-XF 형식 또는 XF 형식)
        // 단, 범위 형식의 층은 제외 (이미 범위로 표시됨)
        // 그리고 범위에 포함된 개별 층도 제외
        const core1Floor = floors.find(f => {
          // 범위 형식의 층은 제외
          if (f.floorLabel.includes('~')) {
            return false;
          }
          
          // 범위에 포함된 개별 층 ID인지 확인
          if (excludedFloorIds.has(f.id)) {
            return false;
          }
          
          // 범위에 포함된 개별 층인지 확인
          let floorNum: number | null = null;
          const coreMatch = f.floorLabel.match(/코어1-(\d+)F/);
          if (coreMatch) {
            floorNum = parseInt(coreMatch[1], 10);
          } else if (coreCount <= 1) {
            const match = f.floorLabel.match(/^(\d+)F$/);
            if (match) {
              floorNum = parseInt(match[1], 10);
            }
          }
          
          // 범위에 포함된 층이면 제외
          if (floorNum !== null && excludedFloorNums.has(floorNum)) {
            return false;
          }
          
          // 층 번호가 일치하는지 확인
          if (floorNum === i) {
            return true;
          }
          
          return false;
        });
        
        // 범위에 포함되지 않은 경우만 추가 (개별 층이 존재하든 없든)
        if (!excludedFloorNums.has(i)) {
          if (core1Floor) {
            groundFloors.push({ floor: core1Floor, floorNum: i });
          } else {
            // 층이 없지만 범위에 포함되지 않은 경우 더미 층으로 추가
            groundFloors.push({ floor: null, floorNum: i });
          }
        }
      }

      // 연속된 기준층을 범위로 묶기 (범위에 포함되지 않은 층만)
      let i = 0;
      while (i < groundFloors.length) {
        const current = groundFloors[i];
        const currentFloor = current.floor;
        
        // 셋팅층, 일반층, 최상층은 개별로 추가
        if (currentFloor && (currentFloor.floorClass === '셋팅층' || currentFloor.floorClass === '일반층' || currentFloor.floorClass === '최상층')) {
          if (!addedFloorIds.has(currentFloor.id)) {
            result.push(currentFloor);
            addedFloorIds.add(currentFloor.id);
          }
          i++;
          continue;
        }
        
        // 기준층인 경우 연속된 범위 찾기
        if (currentFloor && currentFloor.floorClass === '기준층') {
          // 이미 범위에 포함된 층인지 확인
          if (excludedFloorNums.has(current.floorNum)) {
            // 범위에 포함된 층은 건너뛰기 (범위 형식의 층이 이미 추가됨)
            i++;
            continue;
          }
          
          let rangeStart = current.floorNum;
          let rangeEnd = current.floorNum;
          let rangeFloors: Floor[] = [currentFloor];
          
          // 연속된 기준층 찾기
          let j = i + 1;
          while (j < groundFloors.length) {
            const next = groundFloors[j];
            const nextFloor = next.floor;
            
            // 범위에 포함된 층이면 중단
            if (excludedFloorNums.has(next.floorNum)) {
              break;
            }
            
            // 기준층이 아니거나 연속되지 않으면 중단
            if (!nextFloor || nextFloor.floorClass !== '기준층' || next.floorNum !== rangeEnd + 1) {
              break;
            }
            
            rangeEnd = next.floorNum;
            rangeFloors.push(nextFloor);
            j++;
          }
          
          // 범위가 2층 이상이면 범위 형식으로 추가
          if (rangeEnd > rangeStart) {
            // 범위 형식의 더미 층 생성
            const dummyId = `dummy-range-${rangeStart}~${rangeEnd}F`;
            if (!addedFloorIds.has(dummyId)) {
              result.push({
                id: dummyId,
                buildingId: building.id,
                floorLabel: `${rangeStart}~${rangeEnd}F`,
                floorNumber: rangeStart,
                levelType: '지상',
                floorClass: '기준층',
                height: rangeFloors[0]?.height || null,
              });
              addedFloorIds.add(dummyId);
            }
          } else {
            // 단일 층이면 개별로 추가
            if (currentFloor && !addedFloorIds.has(currentFloor.id)) {
              result.push(currentFloor);
              addedFloorIds.add(currentFloor.id);
            }
          }
          
          i = j;
        } else {
          // 층이 없거나 다른 분류면 더미 층 생성
          const isTopFloor = current.floorNum === core1MaxFloor;
          const dummyId = `dummy-${current.floorNum}F`;
          if (!addedFloorIds.has(dummyId)) {
            result.push({
              id: dummyId,
              buildingId: building.id,
              floorLabel: `${current.floorNum}F`,
              floorNumber: current.floorNum,
              levelType: '지상',
              floorClass: isTopFloor ? '최상층' : '기준층',
              height: null,
            });
            addedFloorIds.add(dummyId);
          }
          i++;
        }
      }
      
      // 옥탑층 추가 (공통) - PH층 또는 옥탑층 모두 처리
      const phFloors = floors.filter(f => f.floorClass === '옥탑층' || f.floorClass === 'PH층');
      phFloors.forEach(f => {
        if (!addedFloorIds.has(f.id)) {
          result.push(f);
          addedFloorIds.add(f.id);
        }
      });
      
      return result;
    }
    
    // 기존 방식: 연속된 기준층을 범위로 묶어서 표시
    const sortedFloors = [...floors].sort((a, b) => a.floorNumber - b.floorNumber);
    const result: Floor[] = [];
    const addedFloorIds = new Set<string>(); // 중복 체크용
    
    // 지하층과 옥탑층은 개별로 추가
    const basementFloors = sortedFloors.filter(f => f.levelType === '지하');
    const phFloors = sortedFloors.filter(f => f.floorClass === '옥탑층' || f.floorClass === 'PH층');
    basementFloors.forEach(f => {
      if (!addedFloorIds.has(f.id)) {
        result.push(f);
        addedFloorIds.add(f.id);
      }
    });
    
    // 지상층 처리
    const groundFloors = sortedFloors.filter(f => f.levelType === '지상' && f.floorClass !== '옥탑층' && f.floorClass !== 'PH층');
    
    let i = 0;
    while (i < groundFloors.length) {
      const current = groundFloors[i];
      
      // 셋팅층, 일반층, 최상층은 개별로 추가
      if (current.floorClass === '셋팅층' || current.floorClass === '일반층' || current.floorClass === '최상층') {
        result.push(current);
        i++;
        continue;
      }
      
      // 기준층인 경우 연속된 범위 찾기
      if (current.floorClass === '기준층') {
        let rangeStart = current.floorNumber;
        let rangeEnd = current.floorNumber;
        let rangeFloors: Floor[] = [current];
        
        // 연속된 기준층 찾기
        let j = i + 1;
        while (j < groundFloors.length) {
          const next = groundFloors[j];
          
          // 기준층이 아니거나 연속되지 않으면 중단
          if (next.floorClass !== '기준층' || next.floorNumber !== rangeEnd + 1) {
            break;
          }
          
          rangeEnd = next.floorNumber;
          rangeFloors.push(next);
          j++;
        }
        
        // 범위가 2층 이상이면 범위 형식으로 추가
        if (rangeEnd > rangeStart) {
          // 기존 범위 형식이 있으면 사용, 없으면 생성
          const existingRangeFloor = floors.find(f => 
            f.floorClass === '기준층' && 
            f.floorLabel.includes('~')
          );
          
          if (existingRangeFloor) {
            if (!addedFloorIds.has(existingRangeFloor.id)) {
              result.push(existingRangeFloor);
              addedFloorIds.add(existingRangeFloor.id);
            }
          } else {
            // 범위 형식의 더미 층 생성
            const dummyId = `dummy-range-${rangeStart}~${rangeEnd}F`;
            if (!addedFloorIds.has(dummyId)) {
              result.push({
                id: dummyId,
                buildingId: building.id,
                floorLabel: `${rangeStart}~${rangeEnd}F`,
                floorNumber: rangeStart,
                levelType: '지상',
                floorClass: '기준층',
                height: rangeFloors[0]?.height || null,
              });
              addedFloorIds.add(dummyId);
            }
          }
        } else {
          // 단일 층이면 개별로 추가
          if (!addedFloorIds.has(current.id)) {
            result.push(current);
            addedFloorIds.add(current.id);
          }
        }
        
        i = j;
      } else {
        // 다른 분류면 개별로 추가
        if (!addedFloorIds.has(current.id)) {
          result.push(current);
          addedFloorIds.add(current.id);
        }
        i++;
      }
    }
    
    phFloors.forEach(f => {
      if (!addedFloorIds.has(f.id)) {
        result.push(f);
        addedFloorIds.add(f.id);
      }
    });
    
    return result;
  }, [floors, building.meta.coreCount, building.meta.floorCount.coreGroundFloors, building.id]);

  const handleFloorUpdate = async (floorId: string, updates: { floorClass?: FloorClass; height?: number | null }, showToast: boolean = true) => {
    try {
      await updateFloor(floorId, building.id, building.projectId, updates);
      const updatedFloors = floors.map(f => f.id === floorId ? { ...f, ...updates } : f);
      setFloors(updatedFloors);
      
      // 셋팅층 설정 시 자동 분류 로직
      if (updates.floorClass === '셋팅층') {
        const updatedFloor = updatedFloors.find(f => f.id === floorId);
        if (updatedFloor) {
          const floorMatch = updatedFloor.floorLabel.match(/(\d+)F/);
          if (floorMatch) {
            const settingFloorNum = parseInt(floorMatch[1], 10);
            
            // 1~5층 중 셋팅층이 설정되면, 그보다 위에 있는 층들(최대 5층까지)을 기준층으로 변경
            if (settingFloorNum >= 1 && settingFloorNum <= 5) {
              const floorsToUpdate = updatedFloors.filter(f => {
                if (f.levelType !== '지상' || f.id === floorId) return false;
                const match = f.floorLabel.match(/(\d+)F/);
                if (match) {
                  const floorNum = parseInt(match[1], 10);
                  return floorNum > settingFloorNum && floorNum <= 5;
                }
                return false;
              });
              
              // 셋팅층보다 위에 있는 층들을 기준층으로 변경
              for (const floorToUpdate of floorsToUpdate) {
                if (floorToUpdate.floorClass !== '기준층') {
                  await handleFloorUpdate(floorToUpdate.id, { floorClass: '기준층' }, false);
                }
              }
              
              // 셋팅층보다 낮은 층들(1~5층 범위 내)을 일반층으로 변경
              const lowerFloors = updatedFloors.filter(f => {
                if (f.levelType !== '지상' || f.id === floorId) return false;
                const match = f.floorLabel.match(/(\d+)F/);
                if (match) {
                  const floorNum = parseInt(match[1], 10);
                  return floorNum >= 1 && floorNum < settingFloorNum && floorNum <= 5;
                }
                return false;
              });
              
              // 낮은 층들을 '일반층'으로 변경
              for (const lowerFloor of lowerFloors) {
                if (lowerFloor.floorClass !== '일반층' && lowerFloor.floorClass !== '셋팅층') {
                  await handleFloorUpdate(lowerFloor.id, { floorClass: '일반층' }, false);
                }
              }
              
              setFloors([...updatedFloors]);
            }
          }
        }
      }
      
      // 층고 업데이트 시 셋팅층 자동 판단 로직
      if (updates.height !== undefined) {
        // #region agent log
        fetch('http://127.0.0.1:7242/ingest/a7e9fc51-dfaa-4483-8da9-69eb13479c9c',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'FloorSettingsTable.tsx:543',message:'Height update detected',data:{floorId,newHeight:updates.height},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'A'})}).catch(()=>{});
        // #endregion
        const updatedFloor = updatedFloors.find(f => f.id === floorId);
        if (!updatedFloor || updatedFloor.levelType !== '지상') {
          // 지상층이 아니면 처리하지 않음
          // #region agent log
          fetch('http://127.0.0.1:7242/ingest/a7e9fc51-dfaa-4483-8da9-69eb13479c9c',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'FloorSettingsTable.tsx:546',message:'Skipping non-ground floor',data:{floorId,levelType:updatedFloor?.levelType},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'A'})}).catch(()=>{});
          // #endregion
        } else {
          const standardHeight = building.meta.heights?.standard;
          // #region agent log
          fetch('http://127.0.0.1:7242/ingest/a7e9fc51-dfaa-4483-8da9-69eb13479c9c',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'FloorSettingsTable.tsx:549',message:'Standard height check',data:{standardHeight,updatedFloorLabel:updatedFloor.floorLabel,updatedFloorHeight:updatedFloor.height,updatedFloorClass:updatedFloor.floorClass},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'A'})}).catch(()=>{});
          // #endregion
          if (standardHeight !== undefined && standardHeight !== null) {
            // 층 번호 추출 함수
            const extractFloorNumber = (floor: Floor): number | null => {
              if (floor.floorLabel.includes('~')) return null; // 범위 형식은 제외
              
              const coreCount = building.meta.coreCount;
              if (coreCount > 1) {
                const coreMatch = floor.floorLabel.match(/코어1-(\d+)F/);
                if (coreMatch) return parseInt(coreMatch[1], 10);
              } else {
                const match = floor.floorLabel.match(/^(\d+)F$/);
                if (match) return parseInt(match[1], 10);
              }
              return null;
            };

            // 업데이트된 층의 층 번호 추출
            const updatedFloorNum = extractFloorNumber(updatedFloor);
            // #region agent log
            fetch('http://127.0.0.1:7242/ingest/a7e9fc51-dfaa-4483-8da9-69eb13479c9c',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'FloorSettingsTable.tsx:567',message:'Extracted floor number',data:{updatedFloorNum,updatedFloorLabel:updatedFloor.floorLabel},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'A'})}).catch(()=>{});
            // #endregion
            
            if (updatedFloorNum !== null) {
              // 지상층만 필터링하고 층 번호로 내림차순 정렬 (위에서 아래로)
              const groundFloors = updatedFloors
                .filter(f => f.levelType === '지상' && !f.floorLabel.includes('~'))
                .map(f => ({ floor: f, floorNum: extractFloorNumber(f) }))
                .filter(item => item.floorNum !== null)
                .sort((a, b) => (b.floorNum || 0) - (a.floorNum || 0)); // 내림차순
              // #region agent log
              fetch('http://127.0.0.1:7242/ingest/a7e9fc51-dfaa-4483-8da9-69eb13479c9c',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'FloorSettingsTable.tsx:575',message:'Ground floors filtered',data:{groundFloorsCount:groundFloors.length,groundFloors:groundFloors.map(item=>({floorNum:item.floorNum,floorLabel:item.floor.floorLabel,floorClass:item.floor.floorClass,height:item.floor.height}))},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'A'})}).catch(()=>{});
              // #endregion

              // 1층의 경우 특수 처리
              if (updatedFloorNum === 1) {
                // 2층까지 기준층 층고와 같은지 확인
                const floor2 = groundFloors.find(item => item.floorNum === 2);
                if (floor2 && floor2.floor.height === standardHeight) {
                  // 1층이 다르면 1층을 셋팅층으로 설정
                  // 중요: updates.height를 사용하여 업데이트하려는 값을 확인
                  if (updates.height !== null && updates.height !== standardHeight) {
                    if (updatedFloor.floorClass !== '셋팅층') {
                      await handleFloorUpdate(floorId, { floorClass: '셋팅층' }, false);
                    }
                  }
                }
              } else {
                // 모든 지상층을 위에서 아래로 정렬 (내림차순)
                const allGroundFloors = groundFloors
                  .sort((a, b) => (b.floorNum || 0) - (a.floorNum || 0)); // 위에서 아래로 (내림차순)

                // 업데이트된 층의 층고가 standardHeight와 다른 경우
                // 중요: updates.height를 사용하여 업데이트하려는 값을 확인 (updatedFloor.height는 이미 업데이트된 값)
                if (updates.height !== null && updates.height !== standardHeight) {
                  // #region agent log
                  fetch('http://127.0.0.1:7242/ingest/a7e9fc51-dfaa-4483-8da9-69eb13479c9c',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'FloorSettingsTable.tsx:609',message:'Updated floor height differs from standard',data:{updatedFloorNum,updatedFloorHeight:updates.height,standardHeight},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'A'})}).catch(()=>{});
                  // #endregion
                  // 업데이트된 층보다 위쪽 층들만 필터링
                  const upperFloors = allGroundFloors.filter(item => 
                    item.floorNum !== null && item.floorNum > updatedFloorNum
                  );
                  // #region agent log
                  fetch('http://127.0.0.1:7242/ingest/a7e9fc51-dfaa-4483-8da9-69eb13479c9c',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'FloorSettingsTable.tsx:614',message:'Filtered upper floors',data:{upperFloorsCount:upperFloors.length,upperFloors:upperFloors.map(item=>({floorNum:item.floorNum,floorLabel:item.floor.floorLabel,floorClass:item.floor.floorClass,height:item.floor.height}))},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'A'})}).catch(()=>{});
                  // #endregion
                  
                  // 위에서 아래로 내려오면서 기준층 층고와 같은 연속된 층들 찾기
                  let lastStandardHeightFloor: { floor: Floor; floorNum: number } | null = null;
                  
                  for (const item of upperFloors) {
                    if (item.floorNum === null) continue;
                    
                    const floor = item.floor;
                    
                    // 기준층이고 층고가 standardHeight와 같은 경우
                    if (floor.floorClass === '기준층' && floor.height === standardHeight) {
                      // 연속된 기준층 층고 층들 중 가장 아래 층(마지막 층) 저장
                      if (!lastStandardHeightFloor || item.floorNum < lastStandardHeightFloor.floorNum) {
                        lastStandardHeightFloor = item;
                        // #region agent log
                        fetch('http://127.0.0.1:7242/ingest/a7e9fc51-dfaa-4483-8da9-69eb13479c9c',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'FloorSettingsTable.tsx:625',message:'Found standard height floor',data:{floorNum:item.floorNum,floorLabel:floor.floorLabel,floorClass:floor.floorClass,height:floor.height},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'A'})}).catch(()=>{});
                        // #endregion
                      }
                    } else if (floor.height !== standardHeight) {
                      // 기준층 층고가 아닌 층을 만나면 연속이 깨짐
                      // #region agent log
                      fetch('http://127.0.0.1:7242/ingest/a7e9fc51-dfaa-4483-8da9-69eb13479c9c',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'FloorSettingsTable.tsx:631',message:'Found different height, breaking continuity',data:{floorNum:item.floorNum,floorLabel:floor.floorLabel,floorClass:floor.floorClass,height:floor.height,lastStandardHeightFloor:lastStandardHeightFloor?{floorNum:lastStandardHeightFloor.floorNum,floorLabel:lastStandardHeightFloor.floor.floorLabel}:null},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'A'})}).catch(()=>{});
                      // #endregion
                      break;
                    }
                  }

                  // 위에서 내려오면서 기준층 층고로 연속되던 마지막 층을 셋팅층으로 설정
                  if (lastStandardHeightFloor) {
                    // #region agent log
                    fetch('http://127.0.0.1:7242/ingest/a7e9fc51-dfaa-4483-8da9-69eb13479c9c',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'FloorSettingsTable.tsx:638',message:'Setting setting floor',data:{settingFloorNum:lastStandardHeightFloor.floorNum,settingFloorLabel:lastStandardHeightFloor.floor.floorLabel,settingFloorClass:lastStandardHeightFloor.floor.floorClass},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'A'})}).catch(()=>{});
                    // #endregion
                    if (lastStandardHeightFloor.floor.floorClass !== '셋팅층') {
                      await handleFloorUpdate(lastStandardHeightFloor.floor.id, { floorClass: '셋팅층' }, false);
                    }
                  } else {
                    // #region agent log
                    fetch('http://127.0.0.1:7242/ingest/a7e9fc51-dfaa-4483-8da9-69eb13479c9c',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'FloorSettingsTable.tsx:642',message:'Not setting setting floor - no lastStandardHeightFloor',data:{},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'A'})}).catch(()=>{});
                    // #endregion
                  }
                } else if (updates.height === standardHeight) {
                  // 업데이트된 층이 기준층 층고로 변경된 경우
                  // 위에서 아래로 내려오면서 기준층 층고와 다른 층이 있으면, 그 위의 기준층 층고 층이 셋팅층이어야 함
                  // 중요: updates.height를 사용하여 업데이트하려는 값을 확인
                  let foundDifferentHeight = false;
                  let settingFloorCandidate: { floor: Floor; floorNum: number } | null = null;
                  
                  for (const item of allGroundFloors) {
                    if (item.floorNum === null) continue;
                    
                    const floor = item.floor;
                    
                    // 업데이트된 층을 만나면 그 층이 기준층 층고이므로 계속 확인
                    if (item.floorNum === updatedFloorNum) {
                      continue;
                    }
                    
                    if (floor.height !== standardHeight) {
                      foundDifferentHeight = true;
                      // 기준층 층고와 다른 층을 만났으므로, 그 위의 기준층 층고 층이 셋팅층 후보
                      break;
                    } else if (floor.floorClass === '기준층' && floor.height === standardHeight) {
                      // 연속된 기준층 층고 층들 중 가장 아래 층 저장
                      if (!settingFloorCandidate || item.floorNum < settingFloorCandidate.floorNum) {
                        settingFloorCandidate = item;
                      }
                    }
                  }
                  
                  // 기준층 층고와 다른 층이 있고, 그 위에 기준층 층고 층이 있으면 셋팅층으로 설정
                  if (foundDifferentHeight && settingFloorCandidate) {
                    if (settingFloorCandidate.floor.floorClass !== '셋팅층') {
                      await handleFloorUpdate(settingFloorCandidate.floor.id, { floorClass: '셋팅층' }, false);
                    }
                  }
                }
              }
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
                // 더미 범위 층인 경우 (dummy-range-X~YF)
                let actualFloors: Floor[] = [];
                if (floor.id.startsWith('dummy-range-')) {
                  const rangeMatch = floor.floorLabel.match(/(\d+)~(\d+)F/);
                  if (rangeMatch) {
                    const start = parseInt(rangeMatch[1], 10);
                    const end = parseInt(rangeMatch[2], 10);
                    // 범위에 해당하는 모든 층 찾기 (코어1 기준 또는 코어가 없는 경우)
                    const coreCount = building.meta.coreCount;
                    actualFloors = floors.filter(f => {
                      if (f.floorClass !== '기준층') return false;
                      
                      if (coreCount > 1) {
                        // 코어가 있는 경우 코어1 기준으로 찾기
                        const match = f.floorLabel.match(/코어1-(\d+)F/);
                        if (match) {
                          const floorNum = parseInt(match[1], 10);
                          return floorNum >= start && floorNum <= end;
                        }
                      } else {
                        // 코어가 없는 경우
                        const match = f.floorLabel.match(/(\d+)F/);
                        if (match) {
                          const floorNum = parseInt(match[1], 10);
                          return floorNum >= start && floorNum <= end;
                        }
                      }
                      return false;
                    });
                  }
                }
                
                // 더미 단일 층인 경우 실제 층 찾기 (업데이트용)
                const actualFloor = floor.id.startsWith('dummy-range-')
                  ? (actualFloors.length > 0 ? actualFloors[0] : null) // 범위의 첫 번째 층을 대표로 사용
                  : floor.id.startsWith('dummy-') 
                    ? floors.find(f => {
                        const match = f.floorLabel.match(/코어1-(\d+)F/);
                        const floorMatch = floor.id.match(/dummy-(\d+)F/);
                        return match && floorMatch && match[1] === floorMatch[1];
                      })
                    : floor;

                // 층 라벨 포맷팅 (기준층은 범위 형식으로 표시, 옥탑층은 PH1->옥탑1 형식으로 표시)
                const formatFloorLabel = (label: string, floorClass: FloorClass) => {
                  let formatted = label.replace(/코어\d+-/, '');
                  
                  // 옥탑층인 경우 PH1 -> 옥탑1, PH2 -> 옥탑2 형식으로 변환
                  if ((floorClass === '옥탑층' || floorClass === 'PH층') && formatted.match(/^PH\d+$/i)) {
                    const phMatch = formatted.match(/PH(\d+)/i);
                    if (phMatch) {
                      formatted = `옥탑${phMatch[1]}`;
                    }
                  }
                  
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
                        onChange={async (e) => {
                          const newClass = e.target.value as FloorClass;
                          // 범위 형식의 층인 경우 모든 개별 층 업데이트
                          if (floor.id.startsWith('dummy-range-') && actualFloors.length > 0) {
                            for (const f of actualFloors) {
                              await handleFloorUpdate(f.id, { floorClass: newClass }, false);
                            }
                          } else if (actualFloor) {
                            await handleFloorUpdate(actualFloor.id, { floorClass: newClass });
                          }
                        }}
                        disabled={!actualFloor && actualFloors.length === 0}
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
                        onChange={async (e) => {
                          const value = e.target.value ? Number(e.target.value) : null;
                          // 범위 형식의 층인 경우 모든 개별 층 업데이트
                          if (floor.id.startsWith('dummy-range-') && actualFloors.length > 0) {
                            for (const f of actualFloors) {
                              await handleFloorUpdate(f.id, { height: value }, false);
                            }
                          } else {
                            const targetFloor = actualFloor || floor;
                            if (targetFloor && !targetFloor.id.startsWith('dummy-')) {
                              handleHeightChange(targetFloor.id, value);
                            }
                          }
                        }}
                        onBlur={async () => {
                          // 범위 형식의 층인 경우 이미 onChange에서 처리됨
                          if (!floor.id.startsWith('dummy-range-')) {
                            const targetFloor = actualFloor || floor;
                            if (targetFloor && !targetFloor.id.startsWith('dummy-')) {
                              handleHeightBlur(targetFloor.id);
                            }
                          }
                        }}
                        disabled={floor.id.startsWith('dummy-') && actualFloors.length === 0 && !actualFloor}
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

