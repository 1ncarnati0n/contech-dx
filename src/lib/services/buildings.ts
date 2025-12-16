/**
 * Buildings Service
 * 동(Building) 및 층별 공종 데이터 관리
 * 
 * 주의: 현재는 메모리 기반으로 동작하며, 추후 DB 연동 시 수정 필요
 */

import type {
  Building,
  BuildingMeta,
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

// ============================================
// TTL 기반 캐시 시스템
// ============================================

interface CacheEntry<T> {
  data: T;
  timestamp: number;
}

/** 캐시 TTL (5분) */
const CACHE_TTL_MS = 5 * 60 * 1000;

/** TTL 기반 메모리 캐시 */
const buildingsCache = new Map<string, CacheEntry<Building[]>>();

/**
 * 캐시에서 데이터 조회 (TTL 확인)
 */
function getCacheEntry(projectId: string): Building[] | null {
  const entry = buildingsCache.get(projectId);
  if (!entry) return null;

  const isExpired = Date.now() - entry.timestamp > CACHE_TTL_MS;
  if (isExpired) {
    buildingsCache.delete(projectId);
    logger.debug(`Cache expired for project ${projectId}`);
    return null;
  }

  return entry.data;
}

/**
 * 캐시에 데이터 저장
 */
function setCacheEntry(projectId: string, data: Building[]): void {
  buildingsCache.set(projectId, {
    data,
    timestamp: Date.now(),
  });
}

/**
 * 특정 프로젝트의 캐시 무효화
 */
export function invalidateCache(projectId: string): void {
  buildingsCache.delete(projectId);
  logger.debug(`Cache invalidated for project ${projectId}`);
}

/**
 * 전체 캐시 무효화
 */
export function invalidateAllCache(): void {
  buildingsCache.clear();
  logger.debug('All cache invalidated');
}

// ============================================
// 헬퍼 함수 (코드 중복 제거용)
// ============================================

/**
 * 단일 층에 층고를 적용하는 헬퍼 함수
 * 지하층, 지상층, 옥탑층 등 모든 케이스를 처리
 */
function applyFloorHeight(floor: Floor, heights: BuildingMeta['heights']): void {
  if (!heights) return;

  // 지하층 처리
  if (floor.levelType === '지하') {
    const basementMatch = floor.floorLabel.match(/B(\d+)/);
    if (basementMatch) {
      const basementNum = parseInt(basementMatch[1], 10);
      if (basementNum === 2 && heights.basement2 !== undefined && heights.basement2 !== null) {
        floor.height = heights.basement2;
      } else if (basementNum === 1 && heights.basement1 !== undefined && heights.basement1 !== null) {
        floor.height = heights.basement1;
      }
    }
    return;
  }

  // 지상층 처리
  if (floor.levelType === '지상') {
    // 층 라벨로 먼저 확인 (코어별 층 포함)
    const floorMatch = floor.floorLabel.match(/(\d+)F/);
    if (floorMatch) {
      const floorNum = parseInt(floorMatch[1], 10);
      const heightByFloorNum = getHeightByFloorNumber(floorNum, heights);

      if (heightByFloorNum !== null) {
        floor.height = heightByFloorNum;
        return;
      }
    }

    // floorClass 기반 처리
    const heightByClass = getHeightByFloorClass(floor, heights);
    if (heightByClass !== null) {
      floor.height = heightByClass;
    }
  }
}

/**
 * 층 번호에 따른 층고 반환 (1~5층 특수 처리)
 */
function getHeightByFloorNumber(floorNum: number, heights: BuildingMeta['heights']): number | null {
  if (floorNum === 1 && heights.floor1 !== undefined && heights.floor1 !== null) {
    return heights.floor1;
  }
  if (floorNum === 2 && heights.floor2 !== undefined && heights.floor2 !== null) {
    return heights.floor2;
  }
  if (floorNum === 3 && heights.floor3 !== undefined && heights.floor3 !== null) {
    return heights.floor3;
  }
  if (floorNum === 4 && heights.floor4 !== undefined && heights.floor4 !== null) {
    return heights.floor4;
  }
  if (floorNum === 5 && heights.floor5 !== undefined && heights.floor5 !== null) {
    return heights.floor5;
  }
  return null;
}

/**
 * floorClass에 따른 층고 반환
 */
function getHeightByFloorClass(floor: Floor, heights: BuildingMeta['heights']): number | null {
  if (floor.floorClass === '셋팅층' && heights.floor1 !== undefined && heights.floor1 !== null) {
    return heights.floor1;
  }
  if (floor.floorClass === '기준층' && heights.standard !== undefined && heights.standard !== null) {
    return heights.standard;
  }
  if (floor.floorClass === '최상층' && heights.top !== undefined && heights.top !== null) {
    return heights.top;
  }
  if (floor.floorClass === '옥탑층') {
    return getPhHeight(floor.floorLabel, heights);
  }
  // 기본값: 기준층 높이
  if (heights.standard !== undefined && heights.standard !== null) {
    return heights.standard;
  }
  return null;
}

/**
 * 옥탑층 층고 반환 (PH1, PH2 등 인덱스 처리)
 */
function getPhHeight(floorLabel: string, heights: BuildingMeta['heights']): number | null {
  const phMatch = floorLabel.match(/(?:PH|옥탑)(\d+)/i);
  if (phMatch && heights.ph !== undefined && heights.ph !== null) {
    const phIndex = parseInt(phMatch[1], 10) - 1;
    if (Array.isArray(heights.ph) && heights.ph[phIndex] !== undefined && heights.ph[phIndex] !== null) {
      return heights.ph[phIndex];
    }
    if (!Array.isArray(heights.ph)) {
      return heights.ph;
    }
  }
  return null;
}

/**
 * 여러 층에 층고를 일괄 적용
 */
function applyFloorHeightsToAll(floors: Floor[], heights: BuildingMeta['heights']): void {
  if (!heights || !floors || floors.length === 0) return;
  floors.forEach(floor => applyFloorHeight(floor, heights));
}

/**
 * 층고 변경 감지 헬퍼 함수
 */
function detectHeightChanges(
  currentHeights: BuildingMeta['heights'],
  newHeights?: Partial<BuildingMeta['heights']>
): boolean {
  if (!newHeights) return false;

  // PH 높이 비교
  const prevPhHeights = Array.isArray(currentHeights.ph)
    ? currentHeights.ph
    : [currentHeights.ph || 2650];
  const newPhHeights = newHeights.ph !== undefined
    ? (Array.isArray(newHeights.ph) ? newHeights.ph : [newHeights.ph || 2650])
    : prevPhHeights;
  const phHeightsChanged = JSON.stringify(prevPhHeights) !== JSON.stringify(newPhHeights);

  return (
    (newHeights.basement2 !== undefined && newHeights.basement2 !== currentHeights.basement2) ||
    (newHeights.basement1 !== undefined && newHeights.basement1 !== currentHeights.basement1) ||
    (newHeights.standard !== undefined && newHeights.standard !== currentHeights.standard) ||
    (newHeights.floor1 !== undefined && newHeights.floor1 !== currentHeights.floor1) ||
    (newHeights.floor2 !== undefined && newHeights.floor2 !== currentHeights.floor2) ||
    (newHeights.floor3 !== undefined && newHeights.floor3 !== currentHeights.floor3) ||
    (newHeights.floor4 !== undefined && newHeights.floor4 !== currentHeights.floor4) ||
    (newHeights.floor5 !== undefined && newHeights.floor5 !== currentHeights.floor5) ||
    (newHeights.top !== undefined && newHeights.top !== currentHeights.top) ||
    phHeightsChanged
  );
}

/**
 * 기존 FloorTrade를 새로운 Floor에 매칭하여 보존
 */
function preserveFloorTrades(
  oldFloors: Floor[],
  newFloors: Floor[],
  existingFloorTrades: FloorTrade[]
): FloorTrade[] {
  // 기존 floorTrades를 floorLabel과 floorClass 기준으로 매핑
  const existingFloorTradesMap = new Map<string, FloorTrade[]>();
  oldFloors.forEach(oldFloor => {
    const key = `${oldFloor.floorLabel}_${oldFloor.floorClass}`;
    const trades = existingFloorTrades.filter(t => t.floorId === oldFloor.id);
    if (trades.length > 0) {
      existingFloorTradesMap.set(key, trades);
    }
  });

  // 새로운 floors에 매칭하여 보존
  const preservedFloorTrades: FloorTrade[] = [];
  newFloors.forEach(newFloor => {
    const key = `${newFloor.floorLabel}_${newFloor.floorClass}`;
    const existingTrades = existingFloorTradesMap.get(key);

    if (existingTrades && existingTrades.length > 0) {
      existingTrades.forEach(trade => {
        preservedFloorTrades.push({
          ...trade,
          floorId: newFloor.id,
        });
      });
    }
  });

  return preservedFloorTrades;
}

/**
 * 캐시에서 buildings 로드 (TTL 기반)
 * 캐시가 만료되었거나 없으면 스토리지에서 로드
 */
async function loadBuildingsWithCache(projectId: string): Promise<Building[]> {
  // TTL 기반 캐시 확인
  const cached = getCacheEntry(projectId);
  if (cached) {
    logger.debug(`Fetched ${cached.length} buildings from cache for project ${projectId}`);
    return cached;
  }

  // 스토리지에서 로드
  const buildings = await loadBuildingsByProject(projectId);
  for (const building of buildings) {
    building.floors = await loadFloorsByBuilding(building.id);
    building.floorTrades = await loadFloorTradesByBuilding(building.id);
  }

  // TTL 캐시에 저장
  setCacheEntry(projectId, buildings);
  logger.debug(`Loaded ${buildings.length} buildings from storage for project ${projectId}`);
  return buildings;
}

// ============================================
// 서비스 함수
// ============================================

/**
 * 프로젝트의 모든 동 조회
 */
export async function getBuildings(projectId: string): Promise<Building[]> {
  const buildings = await loadBuildingsWithCache(projectId);
  // 외부로 반환 시 복사본 반환 (캐시 데이터 보호)
  return [...buildings];
}

/**
 * 동 생성
 */
export async function createBuilding(dto: CreateBuildingDTO): Promise<Building> {
  // TTL 기반 캐시에서 로드
  const buildings = await loadBuildingsWithCache(dto.projectId);

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

  // TTL 캐시 업데이트 (타임스탬프 갱신)
  setCacheEntry(dto.projectId, buildings);

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

  // 캐시에서 로드 (헬퍼 함수 사용)
  const buildings = await loadBuildingsWithCache(projectId);

  // 디버깅 로그
  logger.debug(`Updating building: buildingId=${buildingId}, projectId=${projectId}, buildingsCount=${buildings.length}`);

  const buildingIndex = buildings.findIndex(b => b.id === buildingId);
  if (buildingIndex === -1) {
    logger.error(`Building not found: buildingId=${buildingId}, projectId=${projectId}`);
    throw new Error(`Building not found: ${buildingId} in project ${projectId}`);
  }

  const building = buildings[buildingIndex];

  if (updates.buildingName) {
    building.buildingName = updates.buildingName;
  }

  if (updates.meta) {
    // 층고 변경 감지 (헬퍼 함수 사용)
    const heightsChanged = detectHeightChanges(building.meta.heights, updates.meta.heights);

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
      const heights = building.meta.heights;
      const oldFloors = building.floors || [];
      const existingTrades = building.floorTrades || [];

      // 층 재생성
      building.floors = generateFloors(floorCount, coreCount, heights);
      building.floors.forEach(floor => { floor.buildingId = building.id; });

      // FloorTrade 보존 (헬퍼 함수 사용)
      building.floorTrades = preserveFloorTrades(oldFloors, building.floors, existingTrades);

      // 층고 적용 (헬퍼 함수 사용)
      applyFloorHeightsToAll(building.floors, heights);
      logger.debug(`Regenerated ${building.floors.length} floors with preserved trades`);
    } else if (updates.meta.coreCount !== undefined) {
      // 코어 개수만 변경된 경우에도 층 재생성
      const heights = building.meta.heights;
      const oldFloors = building.floors || [];
      const existingTrades = building.floorTrades || [];

      // 층 재생성
      building.floors = generateFloors(building.meta.floorCount, updates.meta.coreCount, heights);
      building.floors.forEach(floor => { floor.buildingId = building.id; });

      // FloorTrade 보존 (헬퍼 함수 사용)
      building.floorTrades = preserveFloorTrades(oldFloors, building.floors, existingTrades);

      // 층고 적용 (헬퍼 함수 사용)
      applyFloorHeightsToAll(building.floors, heights);
      logger.debug(`Regenerated ${building.floors.length} floors (coreCount change)`);
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
  setCacheEntry(projectId, buildings);
  
  return building;
}

/**
 * 동 삭제
 */
export async function deleteBuilding(buildingId: string, projectId: string): Promise<void> {
  // 스토리지에서 삭제
  await deleteBuildingFromStorage(buildingId);

  // TTL 캐시 업데이트
  const buildings = getCacheEntry(projectId) || [];
  const filtered = buildings.filter(b => b.id !== buildingId);
  setCacheEntry(projectId, filtered);

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
  const buildings = await loadBuildingsWithCache(projectId);

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
  setCacheEntry(projectId, buildings);
  
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
  const buildings = await loadBuildingsWithCache(projectId);
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
  setCacheEntry(projectId, buildings);
  
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
  const buildings = await loadBuildingsWithCache(projectId);
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
  setCacheEntry(projectId, buildings);
  
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
  const buildings = await loadBuildingsWithCache(projectId);
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
  setCacheEntry(projectId, buildings);
  
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
<<<<<<< HEAD
    ph?: number | number[];
=======
    ph?: number | number[]; // 배열도 지원
>>>>>>> staging
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

