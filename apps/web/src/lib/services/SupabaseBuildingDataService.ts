/**
 * Supabase Building Data Service
 * 동(Building), 층(Floor), 층별 공종(FloorTrade), 공정계획, 타설구간 데이터 관리
 *
 * 클라이언트/서버 양쪽에서 사용 가능한 유니버설 서비스
 */

import { createClient as createBrowserClient } from '@/lib/supabase/client';
import type {
  Building,
  BuildingMeta,
  Floor,
  FloorTrade,
  BuildingProcessPlan,
  PouringSection,
  BuildingRow,
  FloorRow,
  FloorTradeRow,
  BuildingProcessPlanRow,
  PouringSectionRow,
  BuildingInsert,
  FloorInsert,
  FloorTradeInsert,
  TradeData,
} from '@/lib/types';
import { logger } from '@/lib/utils/logger';
import { MemoryCache, DEFAULT_TTL } from './cache';

// ============================================
// 캐시 인스턴스
// ============================================

const buildingsCache = new MemoryCache<Building[]>({
  name: 'supabase-buildings',
  ttl: DEFAULT_TTL,
});

// ============================================
// Row <-> Model 변환 함수
// ============================================

/**
 * BuildingRow -> Building 변환
 */
function rowToBuilding(row: BuildingRow, floors: Floor[] = [], floorTrades: FloorTrade[] = []): Building {
  return {
    id: row.id,
    projectId: row.project_id,
    buildingName: row.building_name,
    buildingNumber: row.building_number,
    meta: row.meta,
    floors,
    floorTrades,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

/**
 * FloorRow -> Floor 변환
 */
function rowToFloor(row: FloorRow): Floor {
  return {
    id: row.id,
    buildingId: row.building_id,
    floorLabel: row.floor_label,
    floorNumber: row.floor_number,
    levelType: row.level_type,
    floorClass: row.floor_class,
    height: row.height,
  };
}

/**
 * FloorTradeRow -> FloorTrade 변환
 */
function rowToFloorTrade(row: FloorTradeRow): FloorTrade {
  return {
    id: row.id,
    floorId: row.floor_id,
    buildingId: row.building_id,
    tradeGroup: row.trade_group,
    trades: row.trades,
  };
}

/**
 * Floor -> FloorInsert 변환
 */
function floorToInsert(floor: Floor): FloorInsert {
  return {
    building_id: floor.buildingId,
    floor_label: floor.floorLabel,
    floor_number: floor.floorNumber,
    level_type: floor.levelType,
    floor_class: floor.floorClass,
    height: floor.height,
  };
}

/**
 * FloorTrade -> FloorTradeInsert 변환
 */
function floorTradeToInsert(trade: FloorTrade): FloorTradeInsert {
  return {
    floor_id: trade.floorId,
    building_id: trade.buildingId,
    trade_group: trade.tradeGroup,
    trades: trade.trades,
  };
}

/**
 * BuildingProcessPlanRow -> BuildingProcessPlan 변환
 */
function rowToProcessPlan(row: BuildingProcessPlanRow): BuildingProcessPlan {
  return {
    id: row.id,
    buildingId: row.building_id,
    projectId: row.project_id,
    processes: row.processes,
    totalDays: row.total_days,
    itemDirectWorkDaysOverrides: row.item_direct_work_days_overrides || undefined,
    temporaryWorkDays: row.temporary_work_days || undefined,
    earthRetentionWorkDays: row.earth_retention_work_days || undefined,
    earthworkWorkDays: row.earthwork_work_days || undefined,
    specialRowQuantities: row.special_row_quantities || undefined,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

/**
 * PouringSectionRow -> PouringSection 변환
 */
function rowToPouringSection(row: PouringSectionRow): PouringSection {
  return {
    id: row.id,
    projectId: row.project_id,
    label: row.label,
    concreteVolume: row.concrete_volume || undefined,
    equipmentCount: row.equipment_count || undefined,
    processDays: row.process_days || undefined,
    isPassage: row.is_passage,
    includesGroundFloor: row.includes_ground_floor,
    includesFacility3: row.includes_facility3,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

// ============================================
// 유틸리티 함수
// ============================================

/**
 * Supabase 클라이언트 반환
 * 클라이언트 컴포넌트에서 사용되므로 항상 브라우저 클라이언트 사용
 * 서버 컴포넌트는 직접 @/lib/supabase/server를 import해서 사용할 것
 */
function getSupabaseClient() {
  return createBrowserClient();
}

// ============================================
// Building CRUD
// ============================================

/**
 * 프로젝트의 모든 동 조회 (floors, floorTrades 포함)
 */
export async function getBuildings(projectId: string): Promise<Building[]> {
  // 캐시 확인
  const cached = buildingsCache.get(projectId);
  if (cached) {
    return [...cached];
  }

  const supabase = await getSupabaseClient();

  // 1. Buildings 조회
  const { data: buildingRows, error: buildingError } = await supabase
    .from('buildings')
    .select('*')
    .eq('project_id', projectId)
    .order('building_number', { ascending: true });

  if (buildingError) {
    logger.error('Failed to fetch buildings:', buildingError);
    throw new Error(`Failed to fetch buildings: ${buildingError.message}`);
  }

  if (!buildingRows || buildingRows.length === 0) {
    buildingsCache.set(projectId, []);
    return [];
  }

  const buildingIds = buildingRows.map(b => b.id);

  // 2. Floors 조회 (병렬)
  const { data: floorRows, error: floorError } = await supabase
    .from('floors')
    .select('*')
    .in('building_id', buildingIds)
    .order('floor_number', { ascending: true });

  if (floorError) {
    logger.error('Failed to fetch floors:', floorError);
    throw new Error(`Failed to fetch floors: ${floorError.message}`);
  }

  // 3. FloorTrades 조회 (병렬)
  const { data: tradeRows, error: tradeError } = await supabase
    .from('floor_trades')
    .select('*')
    .in('building_id', buildingIds);

  if (tradeError) {
    logger.error('Failed to fetch floor trades:', tradeError);
    throw new Error(`Failed to fetch floor trades: ${tradeError.message}`);
  }

  // 4. 데이터 조합
  const floorsMap = new Map<string, Floor[]>();
  const tradesMap = new Map<string, FloorTrade[]>();

  (floorRows || []).forEach(row => {
    const floor = rowToFloor(row);
    const existing = floorsMap.get(floor.buildingId) || [];
    existing.push(floor);
    floorsMap.set(floor.buildingId, existing);
  });

  (tradeRows || []).forEach(row => {
    const trade = rowToFloorTrade(row);
    const existing = tradesMap.get(trade.buildingId) || [];
    existing.push(trade);
    tradesMap.set(trade.buildingId, existing);
  });

  const buildings = buildingRows.map(row =>
    rowToBuilding(
      row,
      floorsMap.get(row.id) || [],
      tradesMap.get(row.id) || []
    )
  );

  // 캐시 저장
  buildingsCache.set(projectId, buildings);
  logger.debug(`Loaded ${buildings.length} buildings from Supabase for project ${projectId}`);

  return [...buildings];
}

/**
 * 동 생성
 */
export async function createBuilding(
  projectId: string,
  buildingName: string,
  buildingNumber: number,
  meta: BuildingMeta,
  floors: Floor[]
): Promise<Building> {
  const supabase = await getSupabaseClient();

  // 1. Building 생성
  const buildingInsert: BuildingInsert = {
    project_id: projectId,
    building_name: buildingName,
    building_number: buildingNumber,
    meta,
  };

  const { data: buildingRow, error: buildingError } = await supabase
    .from('buildings')
    .insert(buildingInsert)
    .select()
    .single();

  if (buildingError) {
    logger.error('Failed to create building:', buildingError);
    throw new Error(`Failed to create building: ${buildingError.message}`);
  }

  // 2. Floors 생성 (buildingId 설정)
  const floorInserts: FloorInsert[] = floors.map(floor => ({
    building_id: buildingRow.id,
    floor_label: floor.floorLabel,
    floor_number: floor.floorNumber,
    level_type: floor.levelType,
    floor_class: floor.floorClass,
    height: floor.height,
  }));

  let createdFloors: Floor[] = [];
  if (floorInserts.length > 0) {
    const { data: floorRows, error: floorError } = await supabase
      .from('floors')
      .insert(floorInserts)
      .select();

    if (floorError) {
      logger.error('Failed to create floors:', floorError);
      throw new Error(`Failed to create floors: ${floorError.message}`);
    }

    createdFloors = (floorRows || []).map(rowToFloor);
  }

  // 캐시 무효화
  buildingsCache.invalidate(projectId);

  const building = rowToBuilding(buildingRow, createdFloors, []);
  logger.debug(`Created building: ${buildingName} (${building.id})`);

  return building;
}

/**
 * 동 수정 (meta 업데이트)
 */
export async function updateBuilding(
  buildingId: string,
  projectId: string,
  updates: {
    buildingName?: string;
    buildingNumber?: number;
    meta?: Partial<BuildingMeta>;
  }
): Promise<Building> {
  const supabase = await getSupabaseClient();

  // 현재 데이터 조회
  const { data: currentRow, error: fetchError } = await supabase
    .from('buildings')
    .select('*')
    .eq('id', buildingId)
    .single();

  if (fetchError || !currentRow) {
    throw new Error(`Building not found: ${buildingId}`);
  }

  // 업데이트 데이터 준비
  const updateData: Partial<BuildingRow> = {};
  if (updates.buildingName) {
    updateData.building_name = updates.buildingName;
  }
  if (updates.buildingNumber !== undefined) {
    updateData.building_number = updates.buildingNumber;
  }
  if (updates.meta) {
    const mergedMeta = { ...currentRow.meta, ...updates.meta };
    // heights 병합
    if (updates.meta.heights) {
      mergedMeta.heights = { ...currentRow.meta.heights, ...updates.meta.heights };
    }
    updateData.meta = mergedMeta;
  }

  // 업데이트 실행
  const { data: updatedRow, error: updateError } = await supabase
    .from('buildings')
    .update(updateData)
    .eq('id', buildingId)
    .select()
    .single();

  if (updateError) {
    logger.error('Failed to update building:', updateError);
    throw new Error(`Failed to update building: ${updateError.message}`);
  }

  // 캐시 무효화
  buildingsCache.invalidate(projectId);

  // floors와 floorTrades 다시 조회
  const buildings = await getBuildings(projectId);
  const building = buildings.find(b => b.id === buildingId);

  if (!building) {
    throw new Error(`Building not found after update: ${buildingId}`);
  }

  return building;
}

/**
 * 동 삭제
 */
export async function deleteBuilding(buildingId: string, projectId: string): Promise<void> {
  const supabase = await getSupabaseClient();

  const { error } = await supabase
    .from('buildings')
    .delete()
    .eq('id', buildingId);

  if (error) {
    logger.error('Failed to delete building:', error);
    throw new Error(`Failed to delete building: ${error.message}`);
  }

  // 캐시 무효화
  buildingsCache.invalidate(projectId);
  logger.debug(`Deleted building: ${buildingId}`);
}

// ============================================
// Floor CRUD
// ============================================

/**
 * 동의 층 목록 교체 (기존 층 삭제 후 새로 생성)
 */
export async function replaceFloors(buildingId: string, projectId: string, floors: Floor[]): Promise<Floor[]> {
  const supabase = await getSupabaseClient();

  // 1. 기존 층 삭제
  const { error: deleteError } = await supabase
    .from('floors')
    .delete()
    .eq('building_id', buildingId);

  if (deleteError) {
    logger.error('Failed to delete existing floors:', deleteError);
    throw new Error(`Failed to delete existing floors: ${deleteError.message}`);
  }

  // 2. 새 층 생성
  if (floors.length === 0) {
    buildingsCache.invalidate(projectId);
    return [];
  }

  const floorInserts: FloorInsert[] = floors.map(floor => ({
    building_id: buildingId,
    floor_label: floor.floorLabel,
    floor_number: floor.floorNumber,
    level_type: floor.levelType,
    floor_class: floor.floorClass,
    height: floor.height,
  }));

  const { data: floorRows, error: insertError } = await supabase
    .from('floors')
    .insert(floorInserts)
    .select();

  if (insertError) {
    logger.error('Failed to insert floors:', insertError);
    throw new Error(`Failed to insert floors: ${insertError.message}`);
  }

  // 캐시 무효화
  buildingsCache.invalidate(projectId);

  return (floorRows || []).map(rowToFloor);
}

/**
 * 층 수정
 */
export async function updateFloor(
  floorId: string,
  projectId: string,
  updates: {
    floorClass?: Floor['floorClass'];
    height?: number | null;
  }
): Promise<Floor> {
  const supabase = await getSupabaseClient();

  const updateData: Partial<FloorRow> = {};
  if (updates.floorClass !== undefined) {
    updateData.floor_class = updates.floorClass;
  }
  if (updates.height !== undefined) {
    updateData.height = updates.height;
  }

  const { data: updatedRow, error } = await supabase
    .from('floors')
    .update(updateData)
    .eq('id', floorId)
    .select()
    .single();

  if (error) {
    logger.error('Failed to update floor:', error);
    throw new Error(`Failed to update floor: ${error.message}`);
  }

  // 캐시 무효화
  buildingsCache.invalidate(projectId);

  return rowToFloor(updatedRow);
}

// ============================================
// FloorTrade CRUD
// ============================================

/**
 * Supabase 에러 객체에서 정보를 안전하게 추출
 * PostgrestError의 속성이 non-enumerable하거나 getter로 정의된 경우를 처리
 */
function extractSupabaseError(error: unknown): {
  code: string;
  message: string;
  details: string;
  hint: string;
} {
  const err = error as Record<string, unknown>;
  return {
    code: String(err?.code ?? 'UNKNOWN'),
    message: String(err?.message ?? 'Unknown error'),
    details: String(err?.details ?? ''),
    hint: String(err?.hint ?? ''),
  };
}

/**
 * 층별 공종 데이터 저장 (Upsert)
 */
export async function saveFloorTrade(
  buildingId: string,
  projectId: string,
  floorId: string,
  tradeGroup: string,
  trades: Partial<TradeData>
): Promise<FloorTrade> {
  // 입력 데이터 유효성 검증 (빈 문자열 체크 포함)
  if (!floorId || floorId.trim() === '' || !buildingId || buildingId.trim() === '' || !tradeGroup || tradeGroup.trim() === '') {
    const missingParams = [
      (!floorId || floorId.trim() === '') && `floorId="${floorId}"`,
      (!buildingId || buildingId.trim() === '') && `buildingId="${buildingId}"`,
      (!tradeGroup || tradeGroup.trim() === '') && `tradeGroup="${tradeGroup}"`,
    ].filter(Boolean).join(', ');
    throw new Error(`Missing or empty required parameters: ${missingParams}`);
  }

  // dummy floor ID 체크
  if (floorId.startsWith('dummy-')) {
    throw new Error(`Cannot save floor trade for dummy floor: ${floorId}`);
  }

  const supabase = await getSupabaseClient();

  // 기존 데이터 조회
  const { data: existingRow, error: selectError } = await supabase
    .from('floor_trades')
    .select('*')
    .eq('floor_id', floorId)
    .eq('trade_group', tradeGroup)
    .single();

  // PGRST116은 정상 (레코드 없음), 다른 에러는 throw
  if (selectError && selectError.code !== 'PGRST116') {
    const errInfo = extractSupabaseError(selectError);
    logger.error('Floor trade lookup error:', {
      ...errInfo,
      floorId,
      tradeGroup,
    });
    throw new Error(`Failed to lookup floor trade: ${errInfo.message} (${errInfo.code})`);
  }

  if (existingRow) {
    // 업데이트: 기존 trades와 병합
    const mergedTrades = { ...existingRow.trades, ...trades };
    const { data: updatedRow, error } = await supabase
      .from('floor_trades')
      .update({ trades: mergedTrades })
      .eq('id', existingRow.id)
      .select()
      .single();

    if (error) {
      const errInfo = extractSupabaseError(error);
      logger.error('Failed to update floor trade:', {
        ...errInfo,
        existingRowId: existingRow.id,
        floorId,
        tradeGroup,
      });
      throw new Error(`Failed to update floor trade: ${errInfo.message} (${errInfo.code})`);
    }

    buildingsCache.invalidate(projectId);
    return rowToFloorTrade(updatedRow);
  } else {
    // 새로 생성
    const insertData: FloorTradeInsert = {
      floor_id: floorId,
      building_id: buildingId,
      trade_group: tradeGroup,
      trades: trades as TradeData,
    };

    logger.debug('Attempting to insert floor trade:', {
      floorId,
      buildingId,
      tradeGroup,
      tradesKeys: Object.keys(trades),
    });

    const { data: newRow, error } = await supabase
      .from('floor_trades')
      .insert(insertData)
      .select()
      .single();

    if (error) {
      const errInfo = extractSupabaseError(error);
      logger.error('Failed to create floor trade:', {
        ...errInfo,
        insertData: {
          floor_id: insertData.floor_id,
          building_id: insertData.building_id,
          trade_group: insertData.trade_group,
          tradesKeys: Object.keys(insertData.trades || {}),
        },
      });
      throw new Error(`Failed to create floor trade: ${errInfo.message} (${errInfo.code})`);
    }

    buildingsCache.invalidate(projectId);
    return rowToFloorTrade(newRow);
  }
}

/**
 * 여러 층별 공종 데이터 일괄 저장
 */
export async function saveFloorTrades(
  buildingId: string,
  projectId: string,
  trades: FloorTrade[]
): Promise<void> {
  const supabase = await getSupabaseClient();

  // 기존 데이터 삭제
  const { error: deleteError } = await supabase
    .from('floor_trades')
    .delete()
    .eq('building_id', buildingId);

  if (deleteError) {
    logger.error('Failed to delete existing floor trades:', deleteError);
    throw new Error(`Failed to delete existing floor trades: ${deleteError.message}`);
  }

  // 새 데이터 삽입
  if (trades.length > 0) {
    const insertData = trades.map(floorTradeToInsert);
    const { error: insertError } = await supabase
      .from('floor_trades')
      .insert(insertData);

    if (insertError) {
      logger.error('Failed to insert floor trades:', insertError);
      throw new Error(`Failed to insert floor trades: ${insertError.message}`);
    }
  }

  buildingsCache.invalidate(projectId);
}

// ============================================
// BuildingProcessPlan CRUD
// ============================================

/**
 * 동별 공정 계획 조회
 */
export async function getProcessPlan(buildingId: string): Promise<BuildingProcessPlan | null> {
  const supabase = await getSupabaseClient();

  const { data: row, error } = await supabase
    .from('building_process_plans')
    .select('*')
    .eq('building_id', buildingId)
    .single();

  if (error) {
    if (error.code === 'PGRST116') {
      // No rows returned
      return null;
    }
    logger.error('Failed to fetch process plan:', error);
    throw new Error(`Failed to fetch process plan: ${error.message}`);
  }

  return rowToProcessPlan(row);
}

/**
 * 동별 공정 계획 저장 (Upsert)
 */
export async function saveProcessPlan(plan: BuildingProcessPlan): Promise<BuildingProcessPlan> {
  const supabase = await getSupabaseClient();

  const upsertData = {
    building_id: plan.buildingId,
    project_id: plan.projectId,
    processes: plan.processes,
    total_days: plan.totalDays,
    item_direct_work_days_overrides: plan.itemDirectWorkDaysOverrides || null,
    temporary_work_days: plan.temporaryWorkDays || null,
    earth_retention_work_days: plan.earthRetentionWorkDays || null,
    earthwork_work_days: plan.earthworkWorkDays || null,
    special_row_quantities: plan.specialRowQuantities || null,
  };

  const { data: row, error } = await supabase
    .from('building_process_plans')
    .upsert(upsertData, { onConflict: 'building_id' })
    .select()
    .single();

  if (error) {
    logger.error('Failed to save process plan:', error);
    throw new Error(`Failed to save process plan: ${error.message}`);
  }

  return rowToProcessPlan(row);
}

// ============================================
// PouringSection CRUD
// ============================================

/**
 * 프로젝트의 타설 구간 목록 조회
 */
export async function getPouringSections(projectId: string): Promise<PouringSection[]> {
  const supabase = await getSupabaseClient();

  const { data: rows, error } = await supabase
    .from('pouring_sections')
    .select('*')
    .eq('project_id', projectId)
    .order('label', { ascending: true });

  if (error) {
    logger.error('Failed to fetch pouring sections:', error);
    throw new Error(`Failed to fetch pouring sections: ${error.message}`);
  }

  return (rows || []).map(rowToPouringSection);
}

/**
 * 타설 구간 저장 (Upsert)
 */
export async function savePouringSection(section: PouringSection): Promise<PouringSection> {
  const supabase = await getSupabaseClient();

  const upsertData = {
    id: section.id,
    project_id: section.projectId,
    label: section.label,
    concrete_volume: section.concreteVolume || null,
    equipment_count: section.equipmentCount || null,
    process_days: section.processDays || null,
    is_passage: section.isPassage || false,
    includes_ground_floor: section.includesGroundFloor || false,
    includes_facility3: section.includesFacility3 || false,
  };

  const { data: row, error } = await supabase
    .from('pouring_sections')
    .upsert(upsertData)
    .select()
    .single();

  if (error) {
    logger.error('Failed to save pouring section:', error);
    throw new Error(`Failed to save pouring section: ${error.message}`);
  }

  return rowToPouringSection(row);
}

/**
 * 여러 타설 구간 일괄 저장
 */
export async function savePouringSections(projectId: string, sections: PouringSection[]): Promise<void> {
  const supabase = await getSupabaseClient();

  // 기존 데이터 삭제
  const { error: deleteError } = await supabase
    .from('pouring_sections')
    .delete()
    .eq('project_id', projectId);

  if (deleteError) {
    logger.error('Failed to delete existing pouring sections:', deleteError);
    throw new Error(`Failed to delete existing pouring sections: ${deleteError.message}`);
  }

  // 새 데이터 삽입
  if (sections.length > 0) {
    const insertData = sections.map(section => ({
      project_id: projectId,
      label: section.label,
      concrete_volume: section.concreteVolume || null,
      equipment_count: section.equipmentCount || null,
      process_days: section.processDays || null,
      is_passage: section.isPassage || false,
      includes_ground_floor: section.includesGroundFloor || false,
      includes_facility3: section.includesFacility3 || false,
    }));

    const { error: insertError } = await supabase
      .from('pouring_sections')
      .insert(insertData);

    if (insertError) {
      logger.error('Failed to insert pouring sections:', insertError);
      throw new Error(`Failed to insert pouring sections: ${insertError.message}`);
    }
  }
}

/**
 * 타설 구간 삭제
 */
export async function deletePouringSection(sectionId: string): Promise<void> {
  const supabase = await getSupabaseClient();

  const { error } = await supabase
    .from('pouring_sections')
    .delete()
    .eq('id', sectionId);

  if (error) {
    logger.error('Failed to delete pouring section:', error);
    throw new Error(`Failed to delete pouring section: ${error.message}`);
  }
}

// ============================================
// 캐시 관리
// ============================================

/**
 * 특정 프로젝트의 캐시 무효화
 */
export function invalidateCache(projectId: string): void {
  buildingsCache.invalidate(projectId);
}

/**
 * 전체 캐시 무효화
 */
export function invalidateAllCache(): void {
  buildingsCache.invalidateAll();
}

