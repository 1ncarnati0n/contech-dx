/**
 * 타설구간 계산 유틸리티
 */

import type { PouringSection, PouringSectionCalculationResult } from '@/lib/types';

/**
 * 프로젝트 전체 기초 콘크리트 물량과 동 개수를 기반으로 타설구간 개수 계산
 * @param totalConcreteVolume 프로젝트 전체 기초 콘크리트 물량 합계 (㎥)
 * @param buildingCount 동 개수
 * @param equipmentCapacity 장비 1대당 최대타설량 (기본값: 800)
 * @param maxEquipmentCount 최대 투입 장비 대수 (기본값: 2)
 * @returns 타설구간 개수
 */
export function calculatePouringSectionCount(
  totalConcreteVolume: number,
  buildingCount: number,
  equipmentCapacity: number = 800,
  maxEquipmentCount: number = 2
): number {
  if (totalConcreteVolume <= 0) {
    // 물량이 없어도 최소 동 개수 + 통로
    return Math.max(1, buildingCount + 1);
  }
  
  const maxPouringCapacity = equipmentCapacity * maxEquipmentCount; // 1,600㎥
  const minSectionCount = buildingCount + 1; // 동 개수 + 통로
  
  // Step 1: 기본 계산
  const baseSectionCount = Math.floor(totalConcreteVolume / maxPouringCapacity);
  const remainder = totalConcreteVolume % maxPouringCapacity;
  
  // Step 2: 남은 물량 처리 (남은 물량이 있으면 무조건 추가 구간 생성)
  let calculatedCount = baseSectionCount;
  if (remainder > 0) {
    calculatedCount += 1; // 장비 1대 기준 추가 구간 (800㎥ 미만이어도 추가)
  }
  
  // Step 3: 최소 구간 개수와 비교
  return Math.max(calculatedCount, minSectionCount);
}

/**
 * 장비 대수 계산 (각 구간별)
 * @param volume 구간별 물량 (㎥)
 * @param equipmentCapacity 장비 1대당 최대타설량 (기본값: 800)
 * @param maxEquipmentCount 최대 투입 장비 대수 (기본값: 2)
 * @returns 장비 대수
 */
export function calculateEquipmentCountForSection(
  volume: number,
  equipmentCapacity: number = 800,
  maxEquipmentCount: number = 2
): number {
  if (volume <= 0) return 0;
  if (equipmentCapacity === 0) return 1;
  
  // 남은 물량이 800 이상이면 장비 대수 2대
  if (volume >= equipmentCapacity) {
    return maxEquipmentCount;
  }
  
  // 800 미만이면 1대
  return 1;
}

/**
 * 타설구간별 물량 분배
 * @param totalConcreteVolume 전체 물량 (㎥)
 * @param sectionCount 타설구간 개수
 * @returns 각 구간별 분배 물량 배열
 */
export function distributeConcreteVolume(
  totalConcreteVolume: number,
  sectionCount: number
): number[] {
  if (sectionCount <= 0) return [];
  
  // 평균 물량 계산
  const averageVolume = totalConcreteVolume / sectionCount;
  
  // 각 구간에 평균 물량 할당
  const volumes: number[] = [];
  let remainingVolume = totalConcreteVolume;
  
  for (let i = 0; i < sectionCount; i++) {
    if (i === sectionCount - 1) {
      // 마지막 구간에는 남은 물량 모두 할당 (반올림 오차 보정)
      volumes.push(remainingVolume);
    } else {
      const volume = Math.round(averageVolume * 100) / 100; // 소수점 2자리
      volumes.push(volume);
      remainingVolume -= volume;
    }
  }
  
  return volumes;
}

/**
 * 타설구간 계산 상세 결과 반환
 * @param totalConcreteVolume 프로젝트 전체 기초 콘크리트 물량 합계 (㎥)
 * @param buildingCount 동 개수
 * @param projectId 프로젝트 ID
 * @param equipmentCapacity 장비 1대당 최대타설량 (기본값: 800)
 * @param maxEquipmentCount 최대 투입 장비 대수 (기본값: 2)
 * @returns 타설구간 계산 상세 결과
 */
export function calculatePouringSectionDetailed(
  totalConcreteVolume: number,
  buildingCount: number,
  projectId: string,
  equipmentCapacity: number = 800,
  maxEquipmentCount: number = 2
): PouringSectionCalculationResult {
  const maxPouringCapacity = equipmentCapacity * maxEquipmentCount; // 1,600㎥
  const minSectionCount = buildingCount + 1; // 동 개수 + 통로
  
  // Step 1: 기본 계산
  const baseSectionCount = Math.floor(totalConcreteVolume / maxPouringCapacity);
  const remainder = totalConcreteVolume % maxPouringCapacity;
  
  // Step 2: 남은 물량 처리
  let calculatedCount = baseSectionCount;
  if (remainder > 0) {
    calculatedCount += 1; // 장비 1대 기준 추가 구간
  }
  
  // Step 3: 최소 구간 개수와 비교
  const finalSectionCount = Math.max(calculatedCount, minSectionCount);
  
  // Step 4: 타설구간별 물량 분배
  const distributedVolumes = distributeConcreteVolume(totalConcreteVolume, finalSectionCount);
  
  // Step 5: 타설구간 목록 생성 및 물량/장비 대수 할당
  const sections = initializePouringSections(projectId, finalSectionCount).map((section, index) => {
    const volume = distributedVolumes[index] || 0;
    const equipmentCount = calculateEquipmentCountForSection(volume, equipmentCapacity, maxEquipmentCount);
    
    return {
      ...section,
      concreteVolume: volume,
      equipmentCount, // 장비 대수 추가 (타입에 없으면 나중에 추가)
    };
  });
  
  return {
    totalConcreteVolume,
    buildingCount,
    baseSectionCount,
    remainder,
    calculatedCount,
    minSectionCount,
    finalSectionCount,
    sections,
  };
}

/**
 * 타설구간 라벨 생성 (A, B, C, ...)
 * @param index 인덱스 (0부터 시작)
 * @returns 라벨 문자열 ('A', 'B', 'C', ...)
 */
export function generatePouringSectionLabel(index: number): string {
  return String.fromCharCode(65 + index); // 'A' = 65
}

/**
 * 타설구간 목록 초기화
 * @param projectId 프로젝트 ID
 * @param sectionCount 타설구간 개수
 * @returns PouringSection[]
 */
export function initializePouringSections(
  projectId: string,
  sectionCount: number
): PouringSection[] {
  const sections: PouringSection[] = [];
  
  for (let i = 0; i < sectionCount; i++) {
    const label = generatePouringSectionLabel(i);
    sections.push({
      id: `${projectId}-pouring-${label}`,
      label,
      projectId,
      isPassage: i === sectionCount - 1, // 마지막 구간이 통로부분
      includesGroundFloor: false, // 초기값: 지상층 주동 미포함
      includesFacility3: false, // 초기값: 3단 가시설 미포함
      processDays: 0,
      concreteVolume: 0,
    });
  }
  
  return sections;
}
