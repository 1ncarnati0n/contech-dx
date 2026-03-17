/**
 * Unit Rates Service
 * 계획 내역 / 실행 내역 단가 관리
 */

import type { UnitRateItem, UnitRateType } from '@/lib/types';
import { logger } from '@/lib/utils/logger';

// 메모리 스토리지 (임시)
const unitRatesStore = new Map<string, Map<UnitRateType, UnitRateItem[]>>();

/**
 * 프로젝트의 단가 목록 조회
 */
export async function getUnitRates(
  projectId: string,
  type: UnitRateType
): Promise<UnitRateItem[]> {
  const projectRates = unitRatesStore.get(projectId);
  if (!projectRates) {
    return [];
  }
  const rates = projectRates.get(type) || [];
  logger.debug(`Fetched ${rates.length} unit rate items for project ${projectId} (${type})`);
  return [...rates];
}

/**
 * 단가 목록 저장
 */
export async function saveUnitRates(
  projectId: string,
  type: UnitRateType,
  items: UnitRateItem[]
): Promise<UnitRateItem[]> {
  if (!unitRatesStore.has(projectId)) {
    unitRatesStore.set(projectId, new Map());
  }
  const projectRates = unitRatesStore.get(projectId)!;
  projectRates.set(type, items);
  
  logger.debug(`Saved ${items.length} unit rate items for project ${projectId} (${type})`);
  return [...items];
}

/**
 * 단가 항목 추가
 */
export async function addUnitRateItem(
  projectId: string,
  type: UnitRateType,
  item: Omit<UnitRateItem, 'id'>
): Promise<UnitRateItem> {
  const items = await getUnitRates(projectId, type);
  const newItem: UnitRateItem = {
    ...item,
    id: `unit-rate-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
  };
  items.push(newItem);
  await saveUnitRates(projectId, type, items);
  return newItem;
}

/**
 * 단가 항목 수정
 */
export async function updateUnitRateItem(
  projectId: string,
  type: UnitRateType,
  itemId: string,
  updates: Partial<Omit<UnitRateItem, 'id'>>
): Promise<UnitRateItem> {
  const items = await getUnitRates(projectId, type);
  const index = items.findIndex(item => item.id === itemId);
  
  if (index === -1) {
    throw new Error(`Unit rate item not found: ${itemId}`);
  }
  
  const updatedItem = { ...items[index], ...updates };
  
  // 금액 자동 계산
  if (updates.quantity !== undefined || updates.materialUnit !== undefined) {
    updatedItem.materialAmount = (updatedItem.quantity || 0) * (updatedItem.materialUnit || 0);
  }
  if (updates.quantity !== undefined || updates.laborUnit !== undefined) {
    updatedItem.laborAmount = (updatedItem.quantity || 0) * (updatedItem.laborUnit || 0);
  }
  
  items[index] = updatedItem;
  await saveUnitRates(projectId, type, items);
  return updatedItem;
}

/**
 * 단가 항목 삭제
 */
export async function deleteUnitRateItem(
  projectId: string,
  type: UnitRateType,
  itemId: string
): Promise<void> {
  const items = await getUnitRates(projectId, type);
  const filtered = items.filter(item => item.id !== itemId);
  await saveUnitRates(projectId, type, filtered);
  logger.debug(`Deleted unit rate item: ${itemId}`);
}

