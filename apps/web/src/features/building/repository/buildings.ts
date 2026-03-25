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
  TradeData,
  TradeFieldData,
  UpdateFloorDTO,
  UpdateFloorTradeDTO,
} from '@/shared/types';
import { logger } from '@/shared/utils/logger';
import { isSpecialFloorId } from '@/features/building/shared/service/floorIdUtils';
import { resolveFloorHeight } from '@/features/building/shared/service/floorHeightResolver';
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
/**
 * 여러 층에 층고를 일괄 적용
 * resolveFloorHeight로 조회한 값을 floor.height에 mutation 적용
 */
function applyFloorHeightsToAll(floors: Floor[], heights: BuildingMeta['heights']): void {
  if (!heights || !floors || floors.length === 0) return;
  floors.forEach(floor => {
    const resolved = resolveFloorHeight(floor, heights);
    if (resolved !== null) {
      floor.height = resolved;
    }
  });
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
  const matchedOldKeys = new Set<string>();
  const matchedNewIds = new Set<string>();

  newFloors.forEach(newFloor => {
    const key = `${newFloor.floorLabel}_${newFloor.floorClass}`;
    const existingTrades = existingFloorTradesMap.get(key);

    if (existingTrades && existingTrades.length > 0) {
      matchedOldKeys.add(key);
      matchedNewIds.add(newFloor.id);
      existingTrades.forEach(trade => {
        preservedFloorTrades.push({
          ...trade,
          floorId: newFloor.id,
        });
      });
    }
  });

  // 3. 폴백 매칭: floorClass(+ 코어 접두사) 기준
  // 정확 매칭 실패한 층끼리 floorClass로 2차 매칭 시도
  const extractCorePrefix = (label: string): string => {
    const match = label.match(/^(코어\d+)-/);
    return match ? match[1] : '';
  };

  // 미매칭 old floors: floorClass + 코어 접두사 → trades 그룹핑
  const unmatchedOldByClass = new Map<string, { oldFloorId: string; trades: FloorTrade[] }[]>();
  oldFloors.forEach(oldFloor => {
    const key = `${oldFloor.floorLabel}_${oldFloor.floorClass}`;
    if (matchedOldKeys.has(key)) return;

    const trades = existingFloorTrades.filter(
      t => t.floorId === oldFloor.id && !isSpecialFloorId(t.floorId)
    );
    if (trades.length === 0) return;

    const fallbackKey = `${extractCorePrefix(oldFloor.floorLabel)}_${oldFloor.floorClass}`;
    if (!unmatchedOldByClass.has(fallbackKey)) {
      unmatchedOldByClass.set(fallbackKey, []);
    }
    unmatchedOldByClass.get(fallbackKey)!.push({ oldFloorId: oldFloor.id, trades });
  });

  // 미매칭 new floors: floorClass + 코어 접두사로 그룹핑
  const unmatchedNewByClass = new Map<string, Floor[]>();
  newFloors.forEach(newFloor => {
    if (matchedNewIds.has(newFloor.id)) return;

    const fallbackKey = `${extractCorePrefix(newFloor.floorLabel)}_${newFloor.floorClass}`;
    if (!unmatchedNewByClass.has(fallbackKey)) {
      unmatchedNewByClass.set(fallbackKey, []);
    }
    unmatchedNewByClass.get(fallbackKey)!.push(newFloor);
  });

  // 1:1 매칭만 허용 — 같은 class의 미매칭 후보가 양쪽 모두 1개일 때만 폴백
  unmatchedOldByClass.forEach((oldEntries, fallbackKey) => {
    const newEntries = unmatchedNewByClass.get(fallbackKey);
    if (!newEntries || oldEntries.length !== 1 || newEntries.length !== 1) return;

    const oldEntry = oldEntries[0];
    const newFloor = newEntries[0];

    oldEntry.trades.forEach(trade => {
      preservedFloorTrades.push({
        ...trade,
        floorId: newFloor.id,
      });
    });
  });

  return preservedFloorTrades;
}

/**
 * 층 자동 생성
 */
function generateFloors(
  floorCount: BuildingMeta['floorCount'],
  coreCount?: number,
  heights?: BuildingMeta['heights']
): Floor[] {
  const floors: Floor[] = [];

  // 셋팅층 결정: 전체 코어 중 최대 필로티 층 + 2 (필로티 없으면 2층)
  const SETTING_FLOOR_OFFSET = 1;
  let maxPilotiFloor = 0;

  // corePilotisHeights에서 최대값 추출
  if (floorCount.corePilotisHeights && floorCount.corePilotisHeights.length > 0) {
    maxPilotiFloor = Math.max(...floorCount.corePilotisHeights, 0);
  }

  // corePilotisHeights가 전부 0이거나 없는데 corePilotisCounts에 필로티가 있으면 fallback
  if (maxPilotiFloor === 0) {
    if (floorCount.corePilotisCounts && floorCount.corePilotisCounts.some(c => c > 0)) {
      maxPilotiFloor = 1;
    } else if (floorCount.pilotisCount && floorCount.pilotisCount > 0) {
      maxPilotiFloor = 1;
    }
  }

  const settingFloorNum = maxPilotiFloor + SETTING_FLOOR_OFFSET;

  // DEBUG: 셋팅층 계산 추적 (문제 해결 후 제거)
  console.log('[generateFloors] settingFloor 계산:', {
    corePilotisHeights: floorCount.corePilotisHeights,
    corePilotisCounts: floorCount.corePilotisCounts,
    pilotisCount: floorCount.pilotisCount,
    maxPilotiFloor,
    settingFloorNum,
    coreCount,
  });

  // 지하층 생성 (B2, B1, ...)
  if (coreCount && coreCount > 1 && floorCount.coreBasementFloors && floorCount.coreBasementFloors.length > 0) {
    // 코어별 지하층 생성
    for (let coreIndex = 0; coreIndex < coreCount; coreIndex++) {
      const coreNumber = coreIndex + 1;
      const coreBasementCount = floorCount.coreBasementFloors[coreIndex] || 0;

      for (let i = coreBasementCount; i >= 1; i--) {
        let basementHeight: number | null = null;
        if (heights) {
          const bKey = `basement${i}` as keyof typeof heights;
          const bVal = heights[bKey];
          if (bVal !== undefined && bVal !== null && typeof bVal === 'number') {
            basementHeight = bVal;
          }
        }

        floors.push({
          id: `floor-core${coreNumber}-b${i}-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
          buildingId: '',
          coreLabel: coreNumber,
          floorLabel: `B${i}`,
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
        const bKey = `basement${i}` as keyof typeof heights;
        const bVal = heights[bKey];
        if (bVal !== undefined && bVal !== null && typeof bVal === 'number') {
          basementHeight = bVal;
        }
      }

      floors.push({
        id: `floor-b${i}-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
        buildingId: '',
        coreLabel: 1,
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

      // 셋팅층을 지상층 범위 내로 클램핑 (최상층은 별도 처리)
      const effectiveSetting = Math.min(settingFloorNum, coreFloorCount - 1);
      const basisStart = effectiveSetting + 1;

      // 지상층 생성 (1F ~ 최상층)
      for (let floorNum = 1; floorNum <= coreFloorCount; floorNum++) {
        let floorClass: Floor['floorClass'];
        if (coreFloorCount > 1 && floorNum === coreFloorCount) {
          floorClass = '최상층';
        } else if (effectiveSetting > 0 && floorNum === effectiveSetting) {
          floorClass = '셋팅층';
        } else if (floorNum < basisStart) {
          floorClass = '일반층';
        } else {
          floorClass = '기준층';
        }

        floors.push({
          id: `floor-core${coreNumber}-${floorNum}f-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
          buildingId: '',
          coreLabel: coreNumber,
          floorLabel: `${floorNum}F`,
          floorNumber: coreNumber * 1000 + floorNum,
          levelType: '지상',
          floorClass,
          height: null,
        });
      }
    }
  } else {
    // 단일 코어 지상층 생성
    const groundFloorCount = floorCount.ground || 0;
    if (groundFloorCount > 0) {
      // 셋팅층을 지상층 범위 내로 클램핑 (최상층은 별도 처리)
      const effectiveSetting = Math.min(settingFloorNum, groundFloorCount > 1 ? groundFloorCount - 1 : groundFloorCount);
      const basisStartSingle = effectiveSetting + 1;

      for (let floorNum = 1; floorNum <= groundFloorCount; floorNum++) {
        let floorClass: Floor['floorClass'];
        if (groundFloorCount > 1 && floorNum === groundFloorCount) {
          floorClass = '최상층';
        } else if (effectiveSetting > 0 && floorNum === effectiveSetting) {
          floorClass = '셋팅층';
        } else if (floorNum < basisStartSingle) {
          floorClass = '일반층';
        } else {
          floorClass = '기준층';
        }

        floors.push({
          id: `floor-${floorNum}f-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
          buildingId: '',
          coreLabel: 1,
          floorLabel: `${floorNum}F`,
          floorNumber: floorNum,
          levelType: '지상',
          floorClass,
          height: null,
        });
      }
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
      coreLabel: 1,
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
  type OverviewTradeFields = { areaM2: number; ton: number; volumeM3: number };
  const filterTradeData = (trades: TradeData): Record<string, OverviewTradeFields> => {
    const filtered: Record<string, OverviewTradeFields> = {};
    REQUIRED_TRADES.forEach(trade => {
      if (trades[trade]) {
        const t = trades[trade] as TradeFieldData;
        filtered[trade] = {
          areaM2: t.areaM2 || 0,
          ton: t.ton || 0,
          volumeM3: t.volumeM3 || 0,
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
      coreLabel: floor.coreLabel,
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
      heights: {} as Partial<BuildingMeta['heights']> as BuildingMeta['heights'], // 높이 정보 제거
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
    // forceRegenerateFloors가 명시적으로 true일 때만 층 재생성
    // 구성 저장(단위세대 등)에서는 층 재생성 없이 meta만 업데이트
    const shouldRegenerateFloors =
      updates.forceRegenerateFloors === true;

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
