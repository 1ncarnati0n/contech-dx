/**
 * Mock Storage Service
 * JSON 파일 기반 데이터 저장소 (Supabase 마이그레이션 준비)
 * 
 * 브라우저 환경: localStorage 사용
 * Node.js 환경: 파일 시스템 사용
 */

import type {
  Building,
  Floor,
  FloorTrade,
} from '@/lib/types';
import { logger } from '@/lib/utils/logger';

// Check if running in browser
const isBrowser = typeof window !== 'undefined';

// Storage Keys
const STORAGE_KEY_BUILDINGS = 'contech_buildings';
const STORAGE_KEY_FLOORS = 'contech_floors';
const STORAGE_KEY_FLOOR_TRADES = 'contech_floor_trades';

// ============================================
// Mock Data Structure (Supabase 테이블 구조와 유사)
// ============================================

export interface MockDataStore {
  buildings: Building[];
  floors: Floor[];
  floorTrades: FloorTrade[];
}

// ============================================
// Browser Storage (localStorage)
// ============================================

/**
 * localStorage에서 데이터 로드
 */
function loadFromLocalStorage(): MockDataStore {
  if (!isBrowser) {
    return { buildings: [], floors: [], floorTrades: [] };
  }

  try {
    const buildingsJson = localStorage.getItem(STORAGE_KEY_BUILDINGS);
    const floorsJson = localStorage.getItem(STORAGE_KEY_FLOORS);
    const floorTradesJson = localStorage.getItem(STORAGE_KEY_FLOOR_TRADES);

    return {
      buildings: buildingsJson ? JSON.parse(buildingsJson) : [],
      floors: floorsJson ? JSON.parse(floorsJson) : [],
      floorTrades: floorTradesJson ? JSON.parse(floorTradesJson) : [],
    };
  } catch (error) {
    logger.error('Error loading from localStorage:', error);
    return { buildings: [], floors: [], floorTrades: [] };
  }
}

/**
 * localStorage에 데이터 저장
 */
function saveToLocalStorage(data: MockDataStore): void {
  if (!isBrowser) return;

  try {
    localStorage.setItem(STORAGE_KEY_BUILDINGS, JSON.stringify(data.buildings, null, 2));
    localStorage.setItem(STORAGE_KEY_FLOORS, JSON.stringify(data.floors, null, 2));
    localStorage.setItem(STORAGE_KEY_FLOOR_TRADES, JSON.stringify(data.floorTrades, null, 2));
    logger.debug('Data saved to localStorage');
  } catch (error) {
    logger.error('Error saving to localStorage:', error);
  }
}

// ============================================
// File System Storage (Node.js 환경)
// ============================================

/**
 * 파일 시스템에서 데이터 로드
 */
async function loadFromFile(): Promise<MockDataStore> {
  if (isBrowser) {
    return loadFromLocalStorage();
  }

  try {
    const fs = await import('fs/promises');
    const path = await import('path');
    
    const mockDataPath = path.join(process.cwd(), 'public', 'mock.json');
    
    try {
      const fileContent = await fs.readFile(mockDataPath, 'utf-8');
      const data = JSON.parse(fileContent) as MockDataStore;
      logger.debug('Data loaded from mock.json');
      return data;
    } catch (fileError: any) {
      if (fileError.code === 'ENOENT') {
        // 파일이 없으면 빈 데이터 반환
        logger.debug('mock.json not found, returning empty data');
        return { buildings: [], floors: [], floorTrades: [] };
      }
      throw fileError;
    }
  } catch (error) {
    logger.error('Error loading from file:', error);
    return { buildings: [], floors: [], floorTrades: [] };
  }
}

/**
 * 파일 시스템에 데이터 저장
 */
async function saveToFile(data: MockDataStore): Promise<void> {
  if (isBrowser) {
    saveToLocalStorage(data);
    return;
  }

  try {
    const fs = await import('fs/promises');
    const path = await import('path');
    
    const mockDataPath = path.join(process.cwd(), 'public', 'mock.json');
    const jsonContent = JSON.stringify(data, null, 2);
    
    await fs.writeFile(mockDataPath, jsonContent, 'utf-8');
    logger.debug('Data saved to mock.json');
  } catch (error) {
    logger.error('Error saving to file:', error);
    throw error;
  }
}

// ============================================
// Public API
// ============================================

/**
 * 모든 데이터 로드
 */
export async function loadMockData(): Promise<MockDataStore> {
  if (isBrowser) {
    return loadFromLocalStorage();
  } else {
    return await loadFromFile();
  }
}

/**
 * 모든 데이터 저장
 */
export async function saveMockData(data: MockDataStore): Promise<void> {
  if (isBrowser) {
    saveToLocalStorage(data);
  } else {
    await saveToFile(data);
  }
}

/**
 * 프로젝트별 동 데이터 로드
 */
export async function loadBuildingsByProject(projectId: string): Promise<Building[]> {
  const data = await loadMockData();
  return data.buildings.filter(b => b.projectId === projectId);
}

/**
 * 동별 층 데이터 로드
 */
export async function loadFloorsByBuilding(buildingId: string): Promise<Floor[]> {
  const data = await loadMockData();
  return data.floors.filter(f => f.buildingId === buildingId);
}

/**
 * 동별 공종 데이터 로드
 */
export async function loadFloorTradesByBuilding(buildingId: string): Promise<FloorTrade[]> {
  const data = await loadMockData();
  return data.floorTrades.filter(t => t.buildingId === buildingId);
}

/**
 * 동 저장
 */
export async function saveBuilding(building: Building): Promise<void> {
  const data = await loadMockData();
  
  const index = data.buildings.findIndex(b => b.id === building.id);
  if (index >= 0) {
    data.buildings[index] = building;
  } else {
    data.buildings.push(building);
  }
  
  await saveMockData(data);
}

/**
 * 여러 동 저장
 */
export async function saveBuildings(buildings: Building[]): Promise<void> {
  const data = await loadMockData();
  
  // 기존 프로젝트의 동들을 제거하고 새로 추가
  if (buildings.length > 0) {
    const projectId = buildings[0].projectId;
    data.buildings = data.buildings.filter(b => b.projectId !== projectId);
    data.buildings.push(...buildings);
  }
  
  await saveMockData(data);
}

/**
 * 층 저장
 */
export async function saveFloor(floor: Floor): Promise<void> {
  const data = await loadMockData();
  
  const index = data.floors.findIndex(f => f.id === floor.id);
  if (index >= 0) {
    data.floors[index] = floor;
  } else {
    data.floors.push(floor);
  }
  
  await saveMockData(data);
}

/**
 * 여러 층 저장
 */
export async function saveFloors(floors: Floor[]): Promise<void> {
  const data = await loadMockData();
  
  // 기존 동의 층들을 제거하고 새로 추가
  if (floors.length > 0) {
    const buildingId = floors[0].buildingId;
    data.floors = data.floors.filter(f => f.buildingId !== buildingId);
    data.floors.push(...floors);
  }
  
  await saveMockData(data);
}

/**
 * 공종 데이터 저장
 */
export async function saveFloorTrade(trade: FloorTrade): Promise<void> {
  const data = await loadMockData();
  
  const index = data.floorTrades.findIndex(
    t => t.id === trade.id || (t.floorId === trade.floorId && t.tradeGroup === trade.tradeGroup)
  );
  if (index >= 0) {
    data.floorTrades[index] = trade;
  } else {
    data.floorTrades.push(trade);
  }
  
  await saveMockData(data);
}

/**
 * 여러 공종 데이터 저장
 */
export async function saveFloorTrades(trades: FloorTrade[]): Promise<void> {
  const data = await loadMockData();
  
  // 기존 동의 공종 데이터를 제거하고 새로 추가
  if (trades.length > 0) {
    const buildingId = trades[0].buildingId;
    data.floorTrades = data.floorTrades.filter(t => t.buildingId !== buildingId);
    data.floorTrades.push(...trades);
  }
  
  await saveMockData(data);
}

/**
 * 동 삭제 (관련된 층과 공종 데이터도 함께 삭제)
 */
export async function deleteBuilding(buildingId: string): Promise<void> {
  const data = await loadMockData();
  
  data.buildings = data.buildings.filter(b => b.id !== buildingId);
  data.floors = data.floors.filter(f => f.buildingId !== buildingId);
  data.floorTrades = data.floorTrades.filter(t => t.buildingId !== buildingId);
  
  await saveMockData(data);
}

/**
 * 층 삭제 (관련된 공종 데이터도 함께 삭제)
 */
export async function deleteFloor(floorId: string): Promise<void> {
  const data = await loadMockData();
  
  data.floors = data.floors.filter(f => f.id !== floorId);
  data.floorTrades = data.floorTrades.filter(t => t.floorId !== floorId);
  
  await saveMockData(data);
}

/**
 * 공종 데이터 삭제
 */
export async function deleteFloorTrade(tradeId: string): Promise<void> {
  const data = await loadMockData();
  
  data.floorTrades = data.floorTrades.filter(t => t.id !== tradeId);
  
  await saveMockData(data);
}

/**
 * 모든 데이터 삭제
 */
export async function clearAllMockData(): Promise<void> {
  const emptyData: MockDataStore = {
    buildings: [],
    floors: [],
    floorTrades: [],
  };
  
  await saveMockData(emptyData);
  logger.debug('All mock data cleared');
}

/**
 * 데이터를 JSON 파일로 export (브라우저 환경)
 */
export function exportMockDataAsJson(): string {
  if (!isBrowser) {
    throw new Error('exportMockDataAsJson is only available in browser environment');
  }
  
  const data = loadFromLocalStorage();
  return JSON.stringify(data, null, 2);
}

/**
 * JSON 파일에서 데이터 import (브라우저 환경)
 */
export async function importMockDataFromJson(jsonString: string): Promise<void> {
  if (!isBrowser) {
    throw new Error('importMockDataFromJson is only available in browser environment');
  }
  
  try {
    const data = JSON.parse(jsonString) as MockDataStore;
    await saveMockData(data);
    logger.debug('Data imported from JSON');
  } catch (error) {
    logger.error('Error importing JSON data:', error);
    throw new Error('Invalid JSON format');
  }
}
