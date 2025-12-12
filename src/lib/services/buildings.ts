/**
 * Buildings Service
 * 동(Building) 및 층별 공종 데이터 관리
 * 
 * 주의: 현재는 메모리 기반으로 동작하며, 추후 DB 연동 시 수정 필요
 */

import type {
  Building,
  CreateBuildingDTO,
  UpdateBuildingDTO,
  Floor,
  FloorTrade,
  UpdateFloorDTO,
  UpdateFloorTradeDTO,
} from '@/lib/types';
import { logger } from '@/lib/utils/logger';
import {
  loadBuildingsByProject,
  loadFloorsByBuilding,
  loadFloorTradesByBuilding,
  saveBuilding,
  saveBuildings,
  saveFloors,
  saveFloorTrades,
  saveFloor as saveFloorToStorage,
  saveFloorTrade as saveFloorTradeToStorage,
  deleteBuilding as deleteBuildingFromStorage,
  deleteFloor as deleteFloorFromStorage,
  deleteFloorTrade as deleteFloorTradeFromStorage,
} from './mockStorage';

// 메모리 캐시 (성능 최적화용)
const buildingsCache = new Map<string, Building[]>();

/**
 * 프로젝트의 모든 동 조회
 */
export async function getBuildings(projectId: string): Promise<Building[]> {
  // 캐시 확인
  if (buildingsCache.has(projectId)) {
    const cached = buildingsCache.get(projectId)!;
    logger.debug(`Fetched ${cached.length} buildings from cache for project ${projectId}`);
    return [...cached];
  }

  // 스토리지에서 로드
  const buildings = await loadBuildingsByProject(projectId);
  
  // 각 동의 floors와 floorTrades 로드
  for (const building of buildings) {
    building.floors = await loadFloorsByBuilding(building.id);
    building.floorTrades = await loadFloorTradesByBuilding(building.id);
  }
  
  // 캐시에 저장
  buildingsCache.set(projectId, buildings);
  
  logger.debug(`Fetched ${buildings.length} buildings for project ${projectId}`);
  return [...buildings];
}

/**
 * 동 생성
 */
export async function createBuilding(dto: CreateBuildingDTO): Promise<Building> {
  // 캐시에서 로드 또는 스토리지에서 로드
  let buildings = buildingsCache.get(dto.projectId);
  if (!buildings) {
    buildings = await loadBuildingsByProject(dto.projectId);
    for (const building of buildings) {
      building.floors = await loadFloorsByBuilding(building.id);
      building.floorTrades = await loadFloorTradesByBuilding(building.id);
    }
    buildingsCache.set(dto.projectId, buildings);
  }
  
  const newBuilding: Building = {
    id: `building-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
    projectId: dto.projectId,
    buildingName: dto.buildingName,
    buildingNumber: dto.buildingNumber,
    meta: dto.meta,
    floors: generateFloors(dto.meta.floorCount, dto.meta.coreCount, dto.meta.heights),
    floorTrades: [],
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };
  
  // buildingId 설정
  newBuilding.floors.forEach(floor => {
    floor.buildingId = newBuilding.id;
  });
  
  buildings.push(newBuilding);
  
  // 스토리지에 저장
  await saveBuildings(buildings);
  await saveFloors(newBuilding.floors);
  
  // 캐시 업데이트
  buildingsCache.set(dto.projectId, buildings);
  
  logger.debug(`Created building: ${newBuilding.buildingName}`);
  return newBuilding;
}

/**
 * 동 수정
 */
export async function updateBuilding(
  buildingId: string,
  projectId: string,
  updates: UpdateBuildingDTO
): Promise<Building> {
  if (!buildingId || !projectId) {
    throw new Error('Building ID and Project ID are required');
  }
  
  // 캐시에서 로드 또는 스토리지에서 로드
  let buildings = buildingsCache.get(projectId);
  if (!buildings) {
    buildings = await loadBuildingsByProject(projectId);
    for (const building of buildings) {
      building.floors = await loadFloorsByBuilding(building.id);
      building.floorTrades = await loadFloorTradesByBuilding(building.id);
    }
    buildingsCache.set(projectId, buildings);
  }
  
  // 디버깅: building 찾기 전 로그
  logger.debug(`Updating building: buildingId=${buildingId}, projectId=${projectId}, buildingsCount=${buildings.length}`);
  if (buildings.length > 0) {
    logger.debug(`Available building IDs: ${buildings.map(b => b.id).join(', ')}`);
  }
  
  const buildingIndex = buildings.findIndex(b => b.id === buildingId);
  
  if (buildingIndex === -1) {
    logger.error(`Building not found: buildingId=${buildingId}, projectId=${projectId}, buildingsCount=${buildings.length}`);
    throw new Error(`Building not found: ${buildingId} in project ${projectId}`);
  }
  
  const building = buildings[buildingIndex];
  
  if (updates.buildingName) {
    building.buildingName = updates.buildingName;
  }
  
  if (updates.meta) {
    // 층고 변경 감지 (각 속성 비교, 안전하게 처리)
    const prevPhHeights = Array.isArray(building.meta.heights.ph) ? building.meta.heights.ph : [building.meta.heights.ph || 2650];
    const newPhHeights = updates.meta.heights?.ph !== undefined 
      ? (Array.isArray(updates.meta.heights.ph) ? updates.meta.heights.ph : [updates.meta.heights.ph || 2650])
      : prevPhHeights;
    const phHeightsChanged = JSON.stringify(prevPhHeights) !== JSON.stringify(newPhHeights);
    
    const heightsChanged = updates.meta.heights && (
      (updates.meta.heights.basement2 !== undefined && updates.meta.heights.basement2 !== building.meta.heights.basement2) ||
      (updates.meta.heights.basement1 !== undefined && updates.meta.heights.basement1 !== building.meta.heights.basement1) ||
      (updates.meta.heights.standard !== undefined && updates.meta.heights.standard !== building.meta.heights.standard) ||
      (updates.meta.heights.floor1 !== undefined && updates.meta.heights.floor1 !== building.meta.heights.floor1) ||
      (updates.meta.heights.floor2 !== undefined && updates.meta.heights.floor2 !== building.meta.heights.floor2) ||
      (updates.meta.heights.floor3 !== undefined && updates.meta.heights.floor3 !== building.meta.heights.floor3) ||
      (updates.meta.heights.floor4 !== undefined && updates.meta.heights.floor4 !== building.meta.heights.floor4) ||
      (updates.meta.heights.floor5 !== undefined && updates.meta.heights.floor5 !== building.meta.heights.floor5) ||
      (updates.meta.heights.top !== undefined && updates.meta.heights.top !== building.meta.heights.top) ||
      phHeightsChanged
    );
    
    // meta 업데이트 (heights는 병합)
    if (updates.meta.heights) {
      // 옥탑층 층고를 배열로 변환하여 병합
      const updatedPhHeights = updates.meta.heights.ph !== undefined
        ? (Array.isArray(updates.meta.heights.ph) ? updates.meta.heights.ph : [updates.meta.heights.ph || 2650])
        : (Array.isArray(building.meta.heights.ph) ? building.meta.heights.ph : [building.meta.heights.ph || 2650]);
      
      building.meta = {
        ...building.meta,
        ...updates.meta,
        heights: {
          ...building.meta.heights,
          ...updates.meta.heights,
          ph: updatedPhHeights,
        },
      };
    } else {
      building.meta = { ...building.meta, ...updates.meta };
    }
    
    // 층수 변경 또는 층고 변경 시 층 재생성
    // 층고 변경 시에도 기준층 범위가 변경될 수 있으므로 층을 재생성해야 함
    const floorCountChanged = updates.meta.floorCount !== undefined && (
      JSON.stringify(updates.meta.floorCount) !== JSON.stringify(building.meta.floorCount)
    );
    
    const shouldRegenerateFloors = 
      floorCountChanged ||
      (updates as any).forceRegenerateFloors === true ||
      (heightsChanged && building.floors && building.floors.length > 0); // 층고 변경 시에도 재생성
    
    if (shouldRegenerateFloors) {
      const coreCount = updates.meta.coreCount ?? building.meta.coreCount;
      const floorCount = updates.meta.floorCount ?? building.meta.floorCount;
      
      // 기존 floorTrades를 floorLabel과 floorClass 기준으로 매핑 (물량 데이터 보존용)
      const existingFloorTradesMap = new Map<string, FloorTrade[]>();
      if (building.floorTrades && building.floors) {
        building.floors.forEach(oldFloor => {
          const key = `${oldFloor.floorLabel}_${oldFloor.floorClass}`;
          const trades = building.floorTrades.filter(t => t.floorId === oldFloor.id);
          if (trades.length > 0) {
            existingFloorTradesMap.set(key, trades);
          }
        });
      }
      
      // 업데이트된 heights 사용 (이미 building.meta에 반영됨)
      const heights = building.meta.heights;
      building.floors = generateFloors(floorCount, coreCount, heights);
      
      // buildingId 설정
      building.floors.forEach(floor => {
        floor.buildingId = building.id;
      });
      
      // 기존 floorTrades를 새로운 floors에 매칭하여 보존
      const preservedFloorTrades: FloorTrade[] = [];
      building.floors.forEach(newFloor => {
        const key = `${newFloor.floorLabel}_${newFloor.floorClass}`;
        const existingTrades = existingFloorTradesMap.get(key);
        
        if (existingTrades && existingTrades.length > 0) {
          // 같은 floorLabel과 floorClass를 가진 기존 floorTrades가 있으면 보존
          existingTrades.forEach(trade => {
            preservedFloorTrades.push({
              ...trade,
              floorId: newFloor.id, // 새로운 floorId로 업데이트
            });
          });
        }
        // 새로운 층이거나 층분류가 변경된 경우는 floorTrades를 추가하지 않음 (빈 상태)
      });
      
      // 보존된 floorTrades로 업데이트
      building.floorTrades = preservedFloorTrades;
      
      // 층 재생성 시에만 기본 층고 적용 (자동반영 버튼을 누르지 않아도 초기값 설정)
      if (heights && building.floors.length > 0) {
        building.floors.forEach(floor => {
          // 지하층 처리
          if (floor.levelType === '지하') {
            // B2, B1 형식 또는 코어1-B2, 코어1-B1 형식 모두 처리
            const basementMatch = floor.floorLabel.match(/B(\d+)/);
            if (basementMatch) {
              const basementNum = parseInt(basementMatch[1], 10);
              if (basementNum === 2 && heights.basement2 !== undefined && heights.basement2 !== null) {
                floor.height = heights.basement2;
              } else if (basementNum === 1 && heights.basement1 !== undefined && heights.basement1 !== null) {
                floor.height = heights.basement1;
              }
            }
          }
          // 지상층 처리
          else if (floor.levelType === '지상') {
            // 층 라벨로 먼저 확인 (코어별 층 포함)
            const floorMatch = floor.floorLabel.match(/(\d+)F/);
            if (floorMatch) {
              const floorNum = parseInt(floorMatch[1], 10);
              if (floorNum === 1 && heights.floor1 !== undefined && heights.floor1 !== null) {
                floor.height = heights.floor1;
              } else if (floorNum === 2 && heights.floor2 !== undefined && heights.floor2 !== null) {
                floor.height = heights.floor2;
              } else if (floorNum === 3 && heights.floor3 !== undefined && heights.floor3 !== null) {
                floor.height = heights.floor3;
              } else if (floorNum === 4 && heights.floor4 !== undefined && heights.floor4 !== null) {
                floor.height = heights.floor4;
              } else if (floorNum === 5 && heights.floor5 !== undefined && heights.floor5 !== null) {
                floor.height = heights.floor5;
              } else if (floor.floorClass === '기준층' && heights.standard !== undefined && heights.standard !== null) {
                floor.height = heights.standard;
              } else if (floor.floorClass === '최상층' && heights.top !== undefined && heights.top !== null) {
                floor.height = heights.top;
              } else if (floor.floorClass === '옥탑층') {
                // 옥탑층 라벨에서 번호 추출 (PH1, PH2 또는 옥탑1, 옥탑2 형식)
                const phMatch = floor.floorLabel.match(/(?:PH|옥탑)(\d+)/i);
                if (phMatch && heights.ph !== undefined && heights.ph !== null) {
                  const phIndex = parseInt(phMatch[1], 10) - 1; // PH1/옥탑1 -> 0, PH2/옥탑2 -> 1
                  if (Array.isArray(heights.ph) && heights.ph[phIndex] !== undefined && heights.ph[phIndex] !== null) {
                    floor.height = heights.ph[phIndex];
                  } else if (!Array.isArray(heights.ph)) {
                    floor.height = heights.ph;
                  }
                }
              } else if (heights.standard !== undefined && heights.standard !== null) {
                // 기본값으로 기준층 높이 사용
                floor.height = heights.standard;
              }
            } else {
              // 라벨 매칭 실패 시 floorClass로 확인
              if (floor.floorClass === '셋팅층' && heights.floor1 !== undefined && heights.floor1 !== null) {
                floor.height = heights.floor1;
              } else if (floor.floorClass === '기준층' && heights.standard !== undefined && heights.standard !== null) {
                floor.height = heights.standard;
              } else if (floor.floorClass === '최상층' && heights.top !== undefined && heights.top !== null) {
                floor.height = heights.top;
              } else if (floor.floorClass === '옥탑층') {
                // 옥탑층 라벨에서 번호 추출 (PH1, PH2 또는 옥탑1, 옥탑2 형식)
                const phMatch = floor.floorLabel.match(/(?:PH|옥탑)(\d+)/i);
                if (phMatch && heights.ph !== undefined && heights.ph !== null) {
                  const phIndex = parseInt(phMatch[1], 10) - 1; // PH1/옥탑1 -> 0, PH2/옥탑2 -> 1
                  if (Array.isArray(heights.ph) && heights.ph[phIndex] !== undefined && heights.ph[phIndex] !== null) {
                    floor.height = heights.ph[phIndex];
                  } else if (!Array.isArray(heights.ph)) {
                    floor.height = heights.ph;
                  }
                }
              } else if (heights.standard !== undefined && heights.standard !== null) {
                // 기본값으로 기준층 높이 사용
                floor.height = heights.standard;
              }
            }
          }
        });
        
        logger.debug(`Applied initial floor heights for regenerated floors: ${building.floors.length} floors`);
      }
    } else if (updates.meta.coreCount !== undefined) {
      // 코어 개수만 변경된 경우에도 층 재생성
      
      // 기존 floorTrades를 floorLabel과 floorClass 기준으로 매핑 (물량 데이터 보존용)
      const existingFloorTradesMap = new Map<string, FloorTrade[]>();
      if (building.floorTrades && building.floors) {
        building.floors.forEach(oldFloor => {
          const key = `${oldFloor.floorLabel}_${oldFloor.floorClass}`;
          const trades = building.floorTrades.filter(t => t.floorId === oldFloor.id);
          if (trades.length > 0) {
            existingFloorTradesMap.set(key, trades);
          }
        });
      }
      
      // 업데이트된 heights 사용 (이미 building.meta에 반영됨)
      const heights = building.meta.heights;
      building.floors = generateFloors(building.meta.floorCount, updates.meta.coreCount, heights);
      
      // buildingId 설정
      building.floors.forEach(floor => {
        floor.buildingId = building.id;
      });
      
      // 기존 floorTrades를 새로운 floors에 매칭하여 보존
      const preservedFloorTrades: FloorTrade[] = [];
      building.floors.forEach(newFloor => {
        const key = `${newFloor.floorLabel}_${newFloor.floorClass}`;
        const existingTrades = existingFloorTradesMap.get(key);
        
        if (existingTrades && existingTrades.length > 0) {
          // 같은 floorLabel과 floorClass를 가진 기존 floorTrades가 있으면 보존
          existingTrades.forEach(trade => {
            preservedFloorTrades.push({
              ...trade,
              floorId: newFloor.id, // 새로운 floorId로 업데이트
            });
          });
        }
        // 새로운 층이거나 층분류가 변경된 경우는 floorTrades를 추가하지 않음 (빈 상태)
      });
      
      // 보존된 floorTrades로 업데이트
      building.floorTrades = preservedFloorTrades;
      
      // 층 재생성 시에만 기본 층고 적용
      if (heights && building.floors.length > 0) {
        building.floors.forEach(floor => {
          // 지하층 처리
          if (floor.levelType === '지하') {
            if (floor.floorLabel === 'B2' && heights.basement2 !== undefined && heights.basement2 !== null) {
              floor.height = heights.basement2;
            } else if (floor.floorLabel === 'B1' && heights.basement1 !== undefined && heights.basement1 !== null) {
              floor.height = heights.basement1;
            }
          }
          // 지상층 처리
          else if (floor.levelType === '지상') {
            // 층 라벨로 먼저 확인 (코어별 층 포함)
            const floorMatch = floor.floorLabel.match(/(\d+)F/);
            if (floorMatch) {
              const floorNum = parseInt(floorMatch[1], 10);
              if (floorNum === 1 && heights.floor1 !== undefined && heights.floor1 !== null) {
                floor.height = heights.floor1;
              } else if (floorNum === 2 && heights.floor2 !== undefined && heights.floor2 !== null) {
                floor.height = heights.floor2;
              } else if (floorNum === 3 && heights.floor3 !== undefined && heights.floor3 !== null) {
                floor.height = heights.floor3;
              } else if (floorNum === 4 && heights.floor4 !== undefined && heights.floor4 !== null) {
                floor.height = heights.floor4;
              } else if (floorNum === 5 && heights.floor5 !== undefined && heights.floor5 !== null) {
                floor.height = heights.floor5;
              } else if (floor.floorClass === '기준층' && heights.standard !== undefined && heights.standard !== null) {
                floor.height = heights.standard;
              } else if (floor.floorClass === '최상층' && heights.top !== undefined && heights.top !== null) {
                floor.height = heights.top;
              } else if (floor.floorClass === '옥탑층') {
                // 옥탑층 라벨에서 번호 추출 (PH1, PH2 또는 옥탑1, 옥탑2 형식)
                const phMatch = floor.floorLabel.match(/(?:PH|옥탑)(\d+)/i);
                if (phMatch && heights.ph !== undefined && heights.ph !== null) {
                  const phIndex = parseInt(phMatch[1], 10) - 1; // PH1/옥탑1 -> 0, PH2/옥탑2 -> 1
                  if (Array.isArray(heights.ph) && heights.ph[phIndex] !== undefined && heights.ph[phIndex] !== null) {
                    floor.height = heights.ph[phIndex];
                  } else if (!Array.isArray(heights.ph)) {
                    floor.height = heights.ph;
                  }
                }
              } else if (heights.standard !== undefined && heights.standard !== null) {
                // 기본값으로 기준층 높이 사용
                floor.height = heights.standard;
              }
            } else {
              // 라벨 매칭 실패 시 floorClass로 확인
              if (floor.floorClass === '셋팅층' && heights.floor1 !== undefined && heights.floor1 !== null) {
                floor.height = heights.floor1;
              } else if (floor.floorClass === '기준층' && heights.standard !== undefined && heights.standard !== null) {
                floor.height = heights.standard;
              } else if (floor.floorClass === '최상층' && heights.top !== undefined && heights.top !== null) {
                floor.height = heights.top;
              } else if (floor.floorClass === '옥탑층') {
                // 옥탑층 라벨에서 번호 추출 (PH1, PH2 또는 옥탑1, 옥탑2 형식)
                const phMatch = floor.floorLabel.match(/(?:PH|옥탑)(\d+)/i);
                if (phMatch && heights.ph !== undefined && heights.ph !== null) {
                  const phIndex = parseInt(phMatch[1], 10) - 1; // PH1/옥탑1 -> 0, PH2/옥탑2 -> 1
                  if (Array.isArray(heights.ph) && heights.ph[phIndex] !== undefined && heights.ph[phIndex] !== null) {
                    floor.height = heights.ph[phIndex];
                  } else if (!Array.isArray(heights.ph)) {
                    floor.height = heights.ph;
                  }
                }
              } else if (heights.standard !== undefined && heights.standard !== null) {
                // 기본값으로 기준층 높이 사용
                floor.height = heights.standard;
              }
            }
          }
        });
        
        logger.debug(`Applied initial floor heights for regenerated floors: ${building.floors.length} floors`);
      }
    }
    
    // 층고 변경 시에는 자동으로 floors의 height를 업데이트하지 않음
    // 층설정 테이블의 "층고 자동반영" 버튼을 통해 수동으로 반영해야 함
  }
  
  building.updatedAt = new Date().toISOString();
  buildings[buildingIndex] = building;
  
  // 스토리지에 저장
  await saveBuildings(buildings);
  await saveFloors(building.floors);
  await saveFloorTrades(building.floorTrades);
  
  // 캐시 업데이트
  buildingsCache.set(projectId, buildings);
  
  return building;
}

/**
 * 동 삭제
 */
export async function deleteBuilding(buildingId: string, projectId: string): Promise<void> {
  // 스토리지에서 삭제
  await deleteBuildingFromStorage(buildingId);
  
  // 캐시 업데이트
  const buildings = buildingsCache.get(projectId) || [];
  const filtered = buildings.filter(b => b.id !== buildingId);
  buildingsCache.set(projectId, filtered);
  
  logger.debug(`Deleted building: ${buildingId}`);
}

/**
 * 동 순서 변경
 */
export async function reorderBuildings(
  projectId: string,
  fromIndex: number,
  toIndex: number
): Promise<void> {
  // 캐시에서 로드 또는 스토리지에서 로드
  let buildings = buildingsCache.get(projectId);
  if (!buildings) {
    buildings = await loadBuildingsByProject(projectId);
    for (const building of buildings) {
      building.floors = await loadFloorsByBuilding(building.id);
      building.floorTrades = await loadFloorTradesByBuilding(building.id);
    }
    buildingsCache.set(projectId, buildings);
  }
  
  if (fromIndex < 0 || fromIndex >= buildings.length || toIndex < 0 || toIndex >= buildings.length) {
    throw new Error('Invalid index');
  }
  
  const [moved] = buildings.splice(fromIndex, 1);
  buildings.splice(toIndex, 0, moved);
  
  // buildingNumber 업데이트
  buildings.forEach((building, index) => {
    building.buildingNumber = index + 1;
  });
  
  // 스토리지에 저장
  await saveBuildings(buildings);
  
  // 캐시 업데이트
  buildingsCache.set(projectId, buildings);
  
  logger.debug(`Reordered buildings: ${fromIndex} -> ${toIndex}`);
}

/**
 * 동의 floors와 floorTrades 업데이트
 */
export async function updateBuildingFloorsAndTrades(
  buildingId: string,
  projectId: string,
  floors: Floor[],
  floorTrades: FloorTrade[]
): Promise<Building> {
  // 캐시에서 로드 또는 스토리지에서 로드
  let buildings = buildingsCache.get(projectId);
  if (!buildings) {
    buildings = await loadBuildingsByProject(projectId);
    for (const building of buildings) {
      building.floors = await loadFloorsByBuilding(building.id);
      building.floorTrades = await loadFloorTradesByBuilding(building.id);
    }
    buildingsCache.set(projectId, buildings);
  }
  
  const building = buildings.find(b => b.id === buildingId);
  
  if (!building) {
    throw new Error('Building not found');
  }
  
  building.floors = floors;
  building.floorTrades = floorTrades;
  building.updatedAt = new Date().toISOString();
  
  // 스토리지에 저장
  await saveBuildings(buildings);
  await saveFloors(floors);
  await saveFloorTrades(floorTrades);
  
  // 캐시 업데이트
  buildingsCache.set(projectId, buildings);
  
  logger.debug(`Updated floors and trades for building: ${buildingId}`);
  return building;
}

/**
 * 층 수정
 */
export async function updateFloor(
  floorId: string,
  buildingId: string,
  projectId: string,
  updates: UpdateFloorDTO
): Promise<Floor> {
  // 캐시에서 로드 또는 스토리지에서 로드
  let buildings = buildingsCache.get(projectId);
  if (!buildings) {
    buildings = await loadBuildingsByProject(projectId);
    for (const building of buildings) {
      building.floors = await loadFloorsByBuilding(building.id);
      building.floorTrades = await loadFloorTradesByBuilding(building.id);
    }
    buildingsCache.set(projectId, buildings);
  }
  
  const building = buildings.find(b => b.id === buildingId);
  
  if (!building) {
    throw new Error('Building not found');
  }
  
  const floor = building.floors.find(f => f.id === floorId);
  if (!floor) {
    throw new Error('Floor not found');
  }
  
  if (updates.floorClass !== undefined) {
    floor.floorClass = updates.floorClass;
  }
  
  if (updates.height !== undefined) {
    floor.height = updates.height;
  }
  
  building.updatedAt = new Date().toISOString();
  
  // 스토리지에 저장
  await saveBuildings(buildings);
  await saveFloorToStorage(floor);
  
  // 캐시 업데이트
  buildingsCache.set(projectId, buildings);
  
  return floor;
}

/**
 * 층별 공종 데이터 저장
 */
export async function saveFloorTrade(
  buildingId: string,
  projectId: string,
  trade: UpdateFloorTradeDTO
): Promise<FloorTrade> {
  // 캐시에서 로드 또는 스토리지에서 로드
  let buildings = buildingsCache.get(projectId);
  if (!buildings) {
    buildings = await loadBuildingsByProject(projectId);
    for (const building of buildings) {
      building.floors = await loadFloorsByBuilding(building.id);
      building.floorTrades = await loadFloorTradesByBuilding(building.id);
    }
    buildingsCache.set(projectId, buildings);
  }
  
  const building = buildings.find(b => b.id === buildingId);
  
  if (!building) {
    throw new Error('Building not found');
  }
  
  // 기존 trade 찾기
  let floorTrade = building.floorTrades.find(
    t => t.floorId === trade.floorId && t.tradeGroup === trade.tradeGroup
  );
  
  if (floorTrade) {
    // 업데이트
    floorTrade.trades = { ...floorTrade.trades, ...trade.trades };
  } else {
    // 새로 생성
    floorTrade = {
      id: `trade-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      floorId: trade.floorId,
      buildingId: buildingId,
      tradeGroup: trade.tradeGroup,
      trades: trade.trades as any,
    };
    building.floorTrades.push(floorTrade);
  }
  
  building.updatedAt = new Date().toISOString();
  
  // 스토리지에 저장
  await saveBuildings(buildings);
  await saveFloorTradeToStorage(floorTrade);
  
  // 캐시 업데이트
  buildingsCache.set(projectId, buildings);
  
  return floorTrade;
}

/**
 * 층 자동 생성
 */
function generateFloors(
  floorCount: {
    basement: number;
    ground: number;
    ph: number;
    coreGroundFloors?: number[];
    coreBasementFloors?: number[]; // 코어별 지하층 수 추가
  },
  coreCount?: number,
  heights?: {
    basement2?: number;
    basement1?: number;
    standard?: number;
    floor1?: number;
    floor2?: number;
    floor3?: number;
    floor4?: number;
    floor5?: number;
    top?: number;
    ph?: number | number[]; // 배열도 지원
  }
): Floor[] {
  const floors: Floor[] = [];
  
  // 지하층 생성 (B2, B1, ...)
  // 코어별 지하층 수가 있으면 코어별로 생성, 없으면 전체 지하층 수로 생성
  if (coreCount && coreCount > 1 && floorCount.coreBasementFloors && floorCount.coreBasementFloors.length > 0) {
    // 코어별 지하층 생성
    for (let coreIndex = 0; coreIndex < coreCount; coreIndex++) {
      const coreNumber = coreIndex + 1;
      const coreBasementCount = floorCount.coreBasementFloors[coreIndex] || 0;
      
      for (let i = coreBasementCount; i >= 1; i--) {
        // 지하층 층고 설정
        let basementHeight: number | null = null;
        if (heights) {
          if (i === 2 && heights.basement2 !== undefined && heights.basement2 !== null) {
            basementHeight = heights.basement2;
          } else if (i === 1 && heights.basement1 !== undefined && heights.basement1 !== null) {
            basementHeight = heights.basement1;
          }
        }
        
        floors.push({
          id: `floor-core${coreNumber}-b${i}-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
          buildingId: '',
          floorLabel: `코어${coreNumber}-B${i}`,
          floorNumber: -(coreNumber * 1000 + i),
          levelType: '지하',
          floorClass: '지하층',
          height: basementHeight,
        });
      }
    }
  } else {
    // 전체 지하층 수로 생성 (기존 방식)
    for (let i = floorCount.basement; i >= 1; i--) {
      // 지하층 층고 설정
      let basementHeight: number | null = null;
      if (heights) {
        if (i === 2 && heights.basement2 !== undefined && heights.basement2 !== null) {
          basementHeight = heights.basement2;
        } else if (i === 1 && heights.basement1 !== undefined && heights.basement1 !== null) {
          basementHeight = heights.basement1;
        }
      }
      
      floors.push({
        id: `floor-b${i}-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
        buildingId: '',
        floorLabel: `B${i}`,
        floorNumber: -i,
        levelType: '지하',
        floorClass: '지하층',
        height: basementHeight,
      });
    }
  }
  
  // 지상층 생성
  // 코어가 2개 이상이고 코어별 층수가 설정되어 있으면 코어별로 생성
  if (coreCount && coreCount > 1 && floorCount.coreGroundFloors && floorCount.coreGroundFloors.length > 0) {
    // 각 코어별로 층 생성
    for (let coreIndex = 0; coreIndex < coreCount; coreIndex++) {
      const coreNumber = coreIndex + 1;
      const coreFloorCount = floorCount.coreGroundFloors[coreIndex] || 0;
      
      if (coreFloorCount === 0) continue;
      
      // 1층, 2층, 3층, 4층, 5층 층고가 있고 기준층 층고와 다른지 확인
      const hasFloor1 = heights && heights.floor1 !== undefined && heights.floor1 !== null;
      const hasFloor2 = heights && heights.floor2 !== undefined && heights.floor2 !== null;
      const hasFloor3 = heights && heights.floor3 !== undefined && heights.floor3 !== null;
      const hasFloor4 = heights && heights.floor4 !== undefined && heights.floor4 !== null;
      const hasFloor5 = heights && heights.floor5 !== undefined && heights.floor5 !== null;
      const standardHeight = heights?.standard;
      const floor1Height = heights?.floor1;
      const floor2Height = heights?.floor2;
      const floor3Height = heights?.floor3;
      const floor4Height = heights?.floor4;
      const floor5Height = heights?.floor5;
      
      // 5~1층 순서대로 기준층과 층고가 달라지는 층의 윗층이 셋팅층
      // 각 층의 층고를 확인하고 기준층과 다른지 체크
      const settingFloors: number[] = [];
      
      // 5층부터 1층까지 역순으로 확인하여 기준층과 층고가 다른 층 찾기
      // 더 위층이 셋팅층이면 아래층은 일반층
      if (coreFloorCount >= 5 && hasFloor5 && standardHeight !== undefined && standardHeight !== null && floor5Height !== standardHeight) {
        settingFloors.push(5);
      }
      if (coreFloorCount >= 4 && hasFloor4 && standardHeight !== undefined && standardHeight !== null && floor4Height !== standardHeight && !settingFloors.includes(5)) {
        settingFloors.push(4);
      }
      if (coreFloorCount >= 3 && hasFloor3 && standardHeight !== undefined && standardHeight !== null && floor3Height !== standardHeight && !settingFloors.includes(4) && !settingFloors.includes(5)) {
        settingFloors.push(3);
      }
      if (coreFloorCount >= 2 && hasFloor2 && standardHeight !== undefined && standardHeight !== null && floor2Height !== standardHeight && !settingFloors.includes(3) && !settingFloors.includes(4) && !settingFloors.includes(5)) {
        settingFloors.push(2);
      }
      if (coreFloorCount >= 1 && hasFloor1 && standardHeight !== undefined && standardHeight !== null && floor1Height !== standardHeight && !settingFloors.includes(2) && !settingFloors.includes(3) && !settingFloors.includes(4) && !settingFloors.includes(5)) {
        settingFloors.push(1);
      }
      
      // 가장 높은 셋팅층 번호 (기준층 시작점 계산용)
      const highestSettingFloor = settingFloors.length > 0 ? Math.max(...settingFloors) : null;
      
      // 5~1층 순서대로 처리 (위층부터 아래층으로)
      for (let floorNum = 5; floorNum >= 1; floorNum--) {
        if (coreFloorCount < floorNum) continue;
        
        const isSettingFloor = settingFloors.includes(floorNum);
        
        if (isSettingFloor) {
          // 셋팅층
          floors.push({
            id: `floor-core${coreNumber}-${floorNum}f-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
            buildingId: '',
            floorLabel: `코어${coreNumber}-${floorNum}F`,
            floorNumber: coreNumber * 1000 + floorNum,
            levelType: '지상',
            floorClass: '셋팅층',
            height: null,
          });
        } else {
          // 일반층 (위층에 셋팅층이 있거나, 기준층과 층고가 같은 경우)
          floors.push({
            id: `floor-core${coreNumber}-${floorNum}f-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
            buildingId: '',
            floorLabel: `코어${coreNumber}-${floorNum}F`,
            floorNumber: coreNumber * 1000 + floorNum,
            levelType: '지상',
            floorClass: '일반층',
            height: null,
          });
        }
      }
      
      // 기준층 범위 생성 (가장 높은 셋팅층 다음 층부터 최상층 전까지)
      const standardStart = highestSettingFloor ? highestSettingFloor + 1 : (coreFloorCount >= 2 ? 2 : 1);
      
      // 5층이 셋팅층이고 기준층과 층고가 다르면, 6층도 기준층에서 분리하여 셋팅층으로 처리
      // 6층의 층고는 기본적으로 기준층과 같지만, 사용자가 수정할 수 있으므로
      // 일단 6층을 개별 층으로 생성하고, 층고 업데이트 시점에 기준층과 다르면 셋팅층으로 변경
      let actualStandardStart = standardStart;
      
      // 5층이 셋팅층이면 6층도 개별 층으로 생성 (나중에 층고 비교하여 셋팅층으로 변경 가능)
      if (settingFloors.includes(5) && coreFloorCount >= 6) {
        // 6층을 개별 기준층으로 생성 (나중에 층고가 다르면 셋팅층으로 변경)
        floors.push({
          id: `floor-core${coreNumber}-6f-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
          buildingId: '',
          floorLabel: `코어${coreNumber}-6F`,
          floorNumber: coreNumber * 1000 + 6,
          levelType: '지상',
          floorClass: '기준층', // 일단 기준층으로 생성, 층고 업데이트 시점에 변경 가능
          height: null,
        });
        actualStandardStart = 7; // 7층부터 기준층 범위 시작
      }
      
      if (actualStandardStart <= coreFloorCount - 1) {
        const standardEnd = coreFloorCount - 1;
        floors.push({
          id: `floor-core${coreNumber}-${actualStandardStart}~${standardEnd}f-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
          buildingId: '',
          floorLabel: `코어${coreNumber}-${actualStandardStart}~${standardEnd}F 기준층`,
          floorNumber: coreNumber * 1000 + actualStandardStart,
          levelType: '지상',
          floorClass: '기준층',
          height: null,
        });
      }
      
      // 최상층
      if (coreFloorCount > 1) {
        floors.push({
          id: `floor-core${coreNumber}-${coreFloorCount}f-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
          buildingId: '',
          floorLabel: `코어${coreNumber}-${coreFloorCount}F`,
          floorNumber: coreNumber * 1000 + coreFloorCount,
          levelType: '지상',
          floorClass: '최상층',
          height: null,
        });
      }
    }
  } else {
    // 코어가 1개이거나 코어별 층수가 없으면 전체 지상층 수로 생성
    const groundFloorCount = floorCount.ground || 0;
    
    if (groundFloorCount === 0) {
      // 층이 없으면 건너뛰기
    } else if (groundFloorCount === 1) {
      // 1층만 있는 경우
      const hasFloor1 = heights && heights.floor1 !== undefined && heights.floor1 !== null;
      const standardHeight = heights?.standard;
      const floor1Height = heights?.floor1;
      const isFloor1Different = hasFloor1 && standardHeight !== undefined && standardHeight !== null && floor1Height !== standardHeight;
      
      floors.push({
        id: `floor-1f-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
        buildingId: '',
        floorLabel: '1F',
        floorNumber: 1,
        levelType: '지상',
        floorClass: isFloor1Different ? '셋팅층' : '셋팅층', // 1층만 있으면 기본적으로 셋팅층
        height: null,
      });
    } else {
      // 1층, 2층, 3층, 4층, 5층 층고가 있고 기준층 층고와 다른지 확인
      const hasFloor1 = heights && heights.floor1 !== undefined && heights.floor1 !== null;
      const hasFloor2 = heights && heights.floor2 !== undefined && heights.floor2 !== null;
      const hasFloor3 = heights && heights.floor3 !== undefined && heights.floor3 !== null;
      const hasFloor4 = heights && heights.floor4 !== undefined && heights.floor4 !== null;
      const hasFloor5 = heights && heights.floor5 !== undefined && heights.floor5 !== null;
      const standardHeight = heights?.standard;
      const floor1Height = heights?.floor1;
      const floor2Height = heights?.floor2;
      const floor3Height = heights?.floor3;
      const floor4Height = heights?.floor4;
      const floor5Height = heights?.floor5;
      
      // 5~1층 순서대로 기준층과 층고가 달라지는 층의 윗층이 셋팅층
      // 각 층의 층고를 확인하고 기준층과 다른지 체크
      const settingFloors: number[] = [];
      
      // 5층부터 1층까지 역순으로 확인하여 기준층과 층고가 다른 층 찾기
      // 더 위층이 셋팅층이면 아래층은 일반층
      if (groundFloorCount >= 5 && hasFloor5 && standardHeight !== undefined && standardHeight !== null && floor5Height !== standardHeight) {
        settingFloors.push(5);
      }
      if (groundFloorCount >= 4 && hasFloor4 && standardHeight !== undefined && standardHeight !== null && floor4Height !== standardHeight && !settingFloors.includes(5)) {
        settingFloors.push(4);
      }
      if (groundFloorCount >= 3 && hasFloor3 && standardHeight !== undefined && standardHeight !== null && floor3Height !== standardHeight && !settingFloors.includes(4) && !settingFloors.includes(5)) {
        settingFloors.push(3);
      }
      if (groundFloorCount >= 2 && hasFloor2 && standardHeight !== undefined && standardHeight !== null && floor2Height !== standardHeight && !settingFloors.includes(3) && !settingFloors.includes(4) && !settingFloors.includes(5)) {
        settingFloors.push(2);
      }
      if (groundFloorCount >= 1 && hasFloor1 && standardHeight !== undefined && standardHeight !== null && floor1Height !== standardHeight && !settingFloors.includes(2) && !settingFloors.includes(3) && !settingFloors.includes(4) && !settingFloors.includes(5)) {
        settingFloors.push(1);
      }
      
      // 가장 높은 셋팅층 번호 (기준층 시작점 계산용)
      const highestSettingFloor = settingFloors.length > 0 ? Math.max(...settingFloors) : null;
      
      // 5~1층 순서대로 처리 (위층부터 아래층으로)
      for (let floorNum = 5; floorNum >= 1; floorNum--) {
        if (groundFloorCount < floorNum) continue;
        
        const isSettingFloor = settingFloors.includes(floorNum);
        
        if (isSettingFloor) {
          // 셋팅층
          floors.push({
            id: `floor-${floorNum}f-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
            buildingId: '',
            floorLabel: `${floorNum}F`,
            floorNumber: floorNum,
            levelType: '지상',
            floorClass: '셋팅층',
            height: null,
          });
        } else {
          // 일반층 (위층에 셋팅층이 있거나, 기준층과 층고가 같은 경우)
          floors.push({
            id: `floor-${floorNum}f-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
            buildingId: '',
            floorLabel: `${floorNum}F`,
            floorNumber: floorNum,
            levelType: '지상',
            floorClass: '일반층',
            height: null,
          });
        }
      }
      
      // 기준층 범위 생성 (가장 높은 셋팅층 다음 층부터 최상층 전까지)
      const standardStart = highestSettingFloor ? highestSettingFloor + 1 : (groundFloorCount >= 2 ? 2 : 1);
      
      // 5층이 셋팅층이면 6층도 개별 층으로 생성 (나중에 층고 비교하여 셋팅층으로 변경 가능)
      let actualStandardStart = standardStart;
      
      if (settingFloors.includes(5) && groundFloorCount >= 6) {
        // 6층을 개별 기준층으로 생성 (나중에 층고가 다르면 셋팅층으로 변경)
        floors.push({
          id: `floor-6f-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
          buildingId: '',
          floorLabel: '6F',
          floorNumber: 6,
          levelType: '지상',
          floorClass: '기준층', // 일단 기준층으로 생성, 층고 업데이트 시점에 변경 가능
          height: null,
        });
        actualStandardStart = 7; // 7층부터 기준층 범위 시작
      }
      
      if (actualStandardStart <= groundFloorCount - 1) {
        const standardEnd = groundFloorCount - 1;
        floors.push({
          id: `floor-${actualStandardStart}~${standardEnd}f-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
          buildingId: '',
          floorLabel: `${actualStandardStart}~${standardEnd}F 기준층`,
          floorNumber: actualStandardStart,
          levelType: '지상',
          floorClass: '기준층',
          height: null,
        });
      }
      
      // 최상층
      floors.push({
        id: `floor-${groundFloorCount}f-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
        buildingId: '',
        floorLabel: `${groundFloorCount}F`,
        floorNumber: groundFloorCount,
        levelType: '지상',
        floorClass: '최상층',
        height: null,
      });
    }
  }
  
  // PH층 생성
  for (let i = 1; i <= floorCount.ph; i++) {
    // 옥탑층 층고 설정 (heights.ph가 배열이면 각 인덱스 사용, 아니면 단일 값 사용)
    let phHeight: number | null = null;
    if (heights && heights.ph !== undefined && heights.ph !== null) {
      if (Array.isArray(heights.ph)) {
        phHeight = heights.ph[i - 1] !== undefined && heights.ph[i - 1] !== null ? heights.ph[i - 1] : null;
      } else {
        phHeight = heights.ph;
      }
    }
    
    floors.push({
      id: `floor-ph${i}-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      buildingId: '',
      floorLabel: `PH${i}`,
      floorNumber: 1000 + i, // PH는 큰 숫자로 정렬
      levelType: '지상',
      floorClass: '옥탑층',
      height: phHeight, // heights.ph 배열에서 해당 인덱스의 값 사용
    });
  }
  
  return floors;
}

