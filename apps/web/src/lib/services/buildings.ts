/**
 * Buildings Service
 * 동(Building) 및 층별 공종 데이터 관리
 *
 * Supabase DB 연동 버전 (2025-01-28)
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
import { isSpecialFloorId } from '@/lib/utils/floorIdUtils';
import * as SupabaseBuildingService from './SupabaseBuildingDataService';

// ============================================
// 캐시 관리 (위임)
// ============================================

/**
 * 특정 프로젝트의 캐시 무효화
 */
export function invalidateCache(projectId: string): void {
  SupabaseBuildingService.invalidateCache(projectId);
}

/**
 * 전체 캐시 무효화
 */
export function invalidateAllCache(): void {
  SupabaseBuildingService.invalidateAllCache();
}

// ============================================
// 헬퍼 함수 (층 생성 로직)
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
 *
 * 주의: 특별 floorId (group-% 형식, 버림/기초)는 Floor 객체 없이 직접 저장되므로
 * 별도로 보존합니다. 일반 층은 floorLabel + floorClass 기준으로 매칭합니다.
 */
function preserveFloorTrades(
  oldFloors: Floor[],
  newFloors: Floor[],
  existingFloorTrades: FloorTrade[]
): FloorTrade[] {
  const preservedFloorTrades: FloorTrade[] = [];

  // 1. 특별 floorId (버림/기초) 데이터 먼저 보존
  // 이 데이터는 Floor 객체와 연결되지 않고 독립적으로 존재하므로 그대로 유지
  existingFloorTrades.forEach(trade => {
    if (isSpecialFloorId(trade.floorId)) {
      preservedFloorTrades.push(trade);
    }
  });

  // 2. 일반 층 데이터: floorLabel + floorClass 기준으로 매핑
  const existingFloorTradesMap = new Map<string, FloorTrade[]>();
  oldFloors.forEach(oldFloor => {
    const key = `${oldFloor.floorLabel}_${oldFloor.floorClass}`;
    const trades = existingFloorTrades.filter(
      t => t.floorId === oldFloor.id && !isSpecialFloorId(t.floorId)
    );
    if (trades.length > 0) {
      existingFloorTradesMap.set(key, trades);
    }
  });

  // 새로운 floors에 매칭하여 보존
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
 * 층 자동 생성
 */
function generateFloors(
  floorCount: {
    basement: number;
    ground: number;
    ph: number;
    coreGroundFloors?: number[];
    coreBasementFloors?: number[];
  },
  coreCount?: number,
  heights?: BuildingMeta['heights']
): Floor[] {
  const floors: Floor[] = [];

  // 지하층 생성 (B2, B1, ...)
  if (coreCount && coreCount > 1 && floorCount.coreBasementFloors && floorCount.coreBasementFloors.length > 0) {
    // 코어별 지하층 생성
    for (let coreIndex = 0; coreIndex < coreCount; coreIndex++) {
      const coreNumber = coreIndex + 1;
      const coreBasementCount = floorCount.coreBasementFloors[coreIndex] || 0;

      for (let i = coreBasementCount; i >= 1; i--) {
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
  if (coreCount && coreCount > 1 && floorCount.coreGroundFloors && floorCount.coreGroundFloors.length > 0) {
    // 코어별 지상층 생성
    for (let coreIndex = 0; coreIndex < coreCount; coreIndex++) {
      const coreNumber = coreIndex + 1;
      const coreFloorCount = floorCount.coreGroundFloors[coreIndex] || 0;

      if (coreFloorCount === 0) continue;

      const settingFloors = determineSettingFloors(coreFloorCount, heights);
      const highestSettingFloor = settingFloors.length > 0 ? Math.max(...settingFloors) : null;

      // 기준층 시작점을 먼저 계산 (중복 방지)
      let actualStandardStart = highestSettingFloor ? highestSettingFloor + 1 : (coreFloorCount >= 2 ? 2 : 1);

      // 5층이 셋팅층이고 6층 이상이면, 6층은 개별 생성하고 기준층은 7층부터
      if (settingFloors.includes(5) && coreFloorCount >= 6) {
        actualStandardStart = 7;
      }

      // 1~5층 개별 처리 (기준층 범위에 포함되는 층은 제외)
      for (let floorNum = 5; floorNum >= 1; floorNum--) {
        if (coreFloorCount < floorNum) continue;

        // 기준층 범위에 포함되는 층은 개별 생성하지 않음
        if (floorNum >= actualStandardStart && floorNum <= coreFloorCount - 1) {
          continue;
        }

        const isSettingFloor = settingFloors.includes(floorNum);

        floors.push({
          id: `floor-core${coreNumber}-${floorNum}f-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
          buildingId: '',
          floorLabel: `코어${coreNumber}-${floorNum}F`,
          floorNumber: coreNumber * 1000 + floorNum,
          levelType: '지상',
          floorClass: isSettingFloor ? '셋팅층' : '일반층',
          height: null,
        });
      }

      // 5층이 셋팅층이고 6층이 있는 경우, 6층 개별 생성
      if (settingFloors.includes(5) && coreFloorCount >= 6) {
        floors.push({
          id: `floor-core${coreNumber}-6f-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
          buildingId: '',
          floorLabel: `코어${coreNumber}-6F`,
          floorNumber: coreNumber * 1000 + 6,
          levelType: '지상',
          floorClass: '기준층',
          height: null,
        });
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
    // 단일 코어 지상층 생성
    const groundFloorCount = floorCount.ground || 0;

    if (groundFloorCount === 1) {
      floors.push({
        id: `floor-1f-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
        buildingId: '',
        floorLabel: '1F',
        floorNumber: 1,
        levelType: '지상',
        floorClass: '셋팅층',
        height: null,
      });
    } else if (groundFloorCount > 1) {
      const settingFloors = determineSettingFloors(groundFloorCount, heights);
      const highestSettingFloor = settingFloors.length > 0 ? Math.max(...settingFloors) : null;

      // 기준층 시작점을 먼저 계산 (중복 방지)
      let actualStandardStart = highestSettingFloor ? highestSettingFloor + 1 : (groundFloorCount >= 2 ? 2 : 1);

      // 5층이 셋팅층이고 6층 이상이면, 6층은 개별 생성하고 기준층은 7층부터
      if (settingFloors.includes(5) && groundFloorCount >= 6) {
        actualStandardStart = 7;
      }

      // 1~5층 개별 처리 (기준층 범위에 포함되는 층은 제외)
      for (let floorNum = 5; floorNum >= 1; floorNum--) {
        if (groundFloorCount < floorNum) continue;

        // 기준층 범위에 포함되는 층은 개별 생성하지 않음
        if (floorNum >= actualStandardStart && floorNum <= groundFloorCount - 1) {
          continue;
        }

        const isSettingFloor = settingFloors.includes(floorNum);

        floors.push({
          id: `floor-${floorNum}f-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
          buildingId: '',
          floorLabel: `${floorNum}F`,
          floorNumber: floorNum,
          levelType: '지상',
          floorClass: isSettingFloor ? '셋팅층' : '일반층',
          height: null,
        });
      }

      // 기준층 범위 (actualStandardStart는 이미 계산됨)

      // 5층이 셋팅층이고 6층이 있는 경우, 6층 개별 생성
      if (settingFloors.includes(5) && groundFloorCount >= 6) {
        floors.push({
          id: `floor-6f-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
          buildingId: '',
          floorLabel: '6F',
          floorNumber: 6,
          levelType: '지상',
          floorClass: '기준층',
          height: null,
        });
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
      floorNumber: 1000 + i,
      levelType: '지상',
      floorClass: '옥탑층',
      height: phHeight,
    });
  }

  return floors;
}

/**
 * 셋팅층 결정 헬퍼 함수
 * 규칙: 기준층 층고와 같은 연속 구간의 마지막(가장 아래) 층 = 셋팅층
 *
 * 예시: floor1=3050, floor2=2950, floor3=2850, standard=2850
 * - 5층→4층→3층: 기준층 층고(2850)와 같음, 연속 구간
 * - 3층이 연속 구간의 마지막(가장 아래) 층 → 셋팅층
 * - 2층, 1층: 기준층 층고와 다름 → 일반층
 */
function determineSettingFloors(groundFloorCount: number, heights?: BuildingMeta['heights']): number[] {
  if (!heights) return [];

  const standardHeight = heights.standard;
  if (standardHeight === undefined || standardHeight === null) return [];

  const floorHeights = [
    { num: 5, height: heights.floor5 },
    { num: 4, height: heights.floor4 },
    { num: 3, height: heights.floor3 },
    { num: 2, height: heights.floor2 },
    { num: 1, height: heights.floor1 },
  ];

  // 위에서 아래로 순회하며 기준층 층고와 같은 연속 구간의 마지막 층을 찾음
  let lastStandardHeightFloor: number | null = null;

  for (const { num, height } of floorHeights) {
    // 건물 층수보다 높은 층은 스킵
    if (groundFloorCount < num) continue;

    if (height === standardHeight) {
      // 기준층 층고와 같은 층 → 셋팅층 후보 업데이트 (가장 아래 층)
      lastStandardHeightFloor = num;
    } else if (height !== undefined && height !== null) {
      // 기준층 층고와 다른 층을 만남 → 연속 구간 끊김
      // 이전까지의 lastStandardHeightFloor가 셋팅층
      if (lastStandardHeightFloor !== null) {
        return [lastStandardHeightFloor];
      }
    }
  }

  // 모든 층이 기준층 층고와 같은 경우, 가장 아래 층이 셋팅층
  if (lastStandardHeightFloor !== null) {
    return [lastStandardHeightFloor];
  }

  return [];
}

// ============================================
// 서비스 함수 (Supabase 연동)
// ============================================

/**
 * 프로젝트의 모든 동 조회
 */
export async function getBuildings(projectId: string): Promise<Building[]> {
  return SupabaseBuildingService.getBuildings(projectId);
}

/**
 * Overview용 경량 빌딩 데이터 조회
 * 🚀 PERFORMANCE FIX: 200-500ms 개선
 *
 * Overview 탭에서는 5개 공종(gangForm, alForm, formwork, rebar, concrete)의
 * 물량 데이터만 필요하므로 불필요한 데이터를 필터링하여 전송량을 70-90% 감소
 *
 * Before: 1MB+ (전체 building 데이터)
 * After: 50-100KB (필수 데이터만)
 */
export async function getBuildingsForOverview(projectId: string): Promise<Building[]> {
  const buildings = await SupabaseBuildingService.getBuildings(projectId);

  // Overview에서 필요한 5개 공종만 필터링
  const REQUIRED_TRADES = ['gangForm', 'alForm', 'formwork', 'rebar', 'concrete'] as const;

  /**
   * TradeData에서 Overview에 필요한 필드만 추출
   * areaM2, ton, volumeM3만 유지하고 나머지 제거
   */
  const filterTradeData = (trades: any): any => {
    const filtered: any = {};
    REQUIRED_TRADES.forEach(trade => {
      if (trades[trade]) {
        filtered[trade] = {
          areaM2: trades[trade].areaM2 || 0,
          ton: trades[trade].ton || 0,
          volumeM3: trades[trade].volumeM3 || 0,
        };
      }
    });
    return filtered;
  };

  return buildings.map(building => ({
    ...building,
    // Floor 데이터 최소화 (높이 정보 제거)
    floors: building.floors.map(floor => ({
      id: floor.id,
      buildingId: floor.buildingId,
      floorLabel: floor.floorLabel,
      floorNumber: floor.floorNumber,
      levelType: floor.levelType,
      floorClass: floor.floorClass,
      height: null, // Overview에서는 높이 불필요
    })),
    // FloorTrade 데이터에서 필요한 공종만 필터링
    floorTrades: building.floorTrades.map(ft => ({
      ...ft,
      trades: filterTradeData(ft.trades),
    })),
    // Meta 데이터 최소화
    meta: {
      ...building.meta,
      floorCount: { basement: 0, ground: 0, ph: 0 }, // Overview에서는 카운트 불필요
      heights: {} as any, // 높이 정보 제거
    },
  }));
}

/**
 * 동 생성
 */
export async function createBuilding(dto: CreateBuildingDTO): Promise<Building> {
  // 층 자동 생성
  const floors = generateFloors(dto.meta.floorCount, dto.meta.coreCount, dto.meta.heights);

  // Supabase에 저장
  const building = await SupabaseBuildingService.createBuilding(
    dto.projectId,
    dto.buildingName,
    dto.buildingNumber,
    dto.meta,
    floors
  );

  logger.debug(`Created building: ${building.buildingName}`);
  return building;
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

  // 현재 빌딩 데이터 조회
  const buildings = await getBuildings(projectId);
  const building = buildings.find(b => b.id === buildingId);

  if (!building) {
    logger.error(`Building not found: buildingId=${buildingId}, projectId=${projectId}`);
    throw new Error(`Building not found: ${buildingId} in project ${projectId}`);
  }

  // meta 업데이트 처리
  if (updates.meta) {
    const heightsChanged = detectHeightChanges(building.meta.heights, updates.meta.heights);

    // 층수 변경 또는 층고 변경 시 층 재생성
    const floorCountChanged = updates.meta.floorCount !== undefined && (
      JSON.stringify(updates.meta.floorCount) !== JSON.stringify(building.meta.floorCount)
    );

    const shouldRegenerateFloors =
      floorCountChanged ||
      updates.forceRegenerateFloors === true ||
      (heightsChanged && building.floors && building.floors.length > 0);

    if (shouldRegenerateFloors) {
      const coreCount = updates.meta.coreCount ?? building.meta.coreCount;
      const floorCount = updates.meta.floorCount ?? building.meta.floorCount;

      // 새 heights 병합
      const newHeights = updates.meta.heights
        ? { ...building.meta.heights, ...updates.meta.heights }
        : building.meta.heights;

      const oldFloors = building.floors || [];
      const existingTrades = building.floorTrades || [];

      // 층 재생성
      const newFloors = generateFloors(floorCount, coreCount, newHeights);

      // 층고 적용
      applyFloorHeightsToAll(newFloors, newHeights);

      // Supabase에 meta 업데이트
      await SupabaseBuildingService.updateBuilding(buildingId, projectId, {
        buildingName: updates.buildingName,
        meta: updates.meta,
      });

      // 층 교체 (Supabase에서 새 ID 발급)
      const replacedFloors = await SupabaseBuildingService.replaceFloors(buildingId, projectId, newFloors);

      // FloorTrade 보존 (새 floorId로 매핑)
      const preservedTrades = preserveFloorTrades(oldFloors, replacedFloors, existingTrades);
      if (preservedTrades.length > 0) {
        await SupabaseBuildingService.saveFloorTrades(buildingId, projectId, preservedTrades);
      }

      logger.debug(`Regenerated ${replacedFloors.length} floors with preserved trades`);
    } else {
      // 층 재생성 없이 meta만 업데이트
      await SupabaseBuildingService.updateBuilding(buildingId, projectId, {
        buildingName: updates.buildingName,
        meta: updates.meta,
      });
    }
  } else if (updates.buildingName) {
    // 이름만 변경
    await SupabaseBuildingService.updateBuilding(buildingId, projectId, {
      buildingName: updates.buildingName,
    });
  }

  // 업데이트된 빌딩 반환
  const updatedBuildings = await getBuildings(projectId);
  const updatedBuilding = updatedBuildings.find(b => b.id === buildingId);

  if (!updatedBuilding) {
    throw new Error(`Building not found after update: ${buildingId}`);
  }

  return updatedBuilding;
}

/**
 * 동 삭제
 */
export async function deleteBuilding(buildingId: string, projectId: string): Promise<void> {
  await SupabaseBuildingService.deleteBuilding(buildingId, projectId);
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
  const buildings = await getBuildings(projectId);

  if (fromIndex < 0 || fromIndex >= buildings.length || toIndex < 0 || toIndex >= buildings.length) {
    throw new Error('Invalid index');
  }

  const [moved] = buildings.splice(fromIndex, 1);
  buildings.splice(toIndex, 0, moved);

  // buildingNumber 업데이트
  for (let i = 0; i < buildings.length; i++) {
    await SupabaseBuildingService.updateBuilding(buildings[i].id, projectId, {
      buildingNumber: i + 1,
    });
  }

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
  // 층 교체
  await SupabaseBuildingService.replaceFloors(buildingId, projectId, floors);

  // 공종 데이터 교체
  await SupabaseBuildingService.saveFloorTrades(buildingId, projectId, floorTrades);

  // 업데이트된 빌딩 반환
  const buildings = await getBuildings(projectId);
  const building = buildings.find(b => b.id === buildingId);

  if (!building) {
    throw new Error('Building not found');
  }

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
  const floor = await SupabaseBuildingService.updateFloor(floorId, projectId, updates);
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
  const floorTrade = await SupabaseBuildingService.saveFloorTrade(
    buildingId,
    projectId,
    trade.floorId,
    trade.tradeGroup,
    trade.trades
  );

  return floorTrade;
}
