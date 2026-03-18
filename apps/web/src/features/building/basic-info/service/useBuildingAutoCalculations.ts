import { useMemo } from 'react';
import type { UnitTypePattern } from '@/shared/types';

interface UseBuildingAutoCalculationsParams {
  /** 단위세대 패턴 목록 */
  unitTypePattern: UnitTypePattern[];
  /** 기본 지상층 수 */
  groundCount: number;
  /** 코어별 지상층 수 배열 */
  coreGroundFloors: number[];
  /** 기본 필로티 세대수 */
  pilotisCount: number;
  /** 코어별 필로티 부대시설 제외 세대수 배열 */
  corePilotisCounts: number[];
  /** 코어별 필로티 층수 배열 */
  corePilotisHeights: number[];
}

interface UseBuildingAutoCalculationsResult {
  /** 계산된 코어 개수 (접미사 -1, -2 등이 붙은 코어 제외) */
  calculatedCoreCount: number;
  /** 계산된 총 세대수 */
  totalUnitCount: number;
  /** 코어별 세대수 상세 (디버그용) */
  coreUnitDetails: Array<{
    coreDisplayName: string;
    unitCount: number;
    floorCount: number;
    pilotisExclusion: number;
  }>;
}

/**
 * 빌딩 자동 계산 훅
 *
 * 코어 개수와 총 세대수를 단위세대 패턴에서 자동 계산합니다.
 *
 * ## 코어 개수 계산 로직
 * - 단위세대 패턴에서 고유한 코어 개수만 카운트
 * - 동일 코어 번호가 반복되면 (코어1, 코어1-1, 코어1-2 등) 하나의 코어로 계산
 *
 * ## 세대수 계산 로직
 * 1. 각 패턴별: unitCount × 해당 코어의 지상층 수 (신규 방식)
 *    - 기존 데이터 호환: unitCount가 없으면 (끝호수 - 시작호수 + 1)로 계산
 * 2. 필로티 제외: 코어별 (필로티 부대시설 제외 세대수 × 필로티 층수)
 * 3. 최종 세대수 = 합계 - 필로티 제외 세대수
 */
export function useBuildingAutoCalculations({
  unitTypePattern,
  groundCount,
  coreGroundFloors,
  pilotisCount,
  corePilotisCounts,
  corePilotisHeights,
}: UseBuildingAutoCalculationsParams): UseBuildingAutoCalculationsResult {

  /**
   * 코어 개수 계산
   * - 코어1이 처음 나오는지 추적
   * - 코어2가 있는지 추적
   * - -1, -2, -3 접미사가 붙은 코어는 제외
   */
  const calculatedCoreCount = useMemo(() => {
    if (unitTypePattern.length === 0) return 0;

    let hasFirstCore1 = false;
    let hasCore2 = false;

    unitTypePattern.forEach((pattern, index) => {
      const coreNum = pattern.coreNumber || 1;

      if (coreNum === 1) {
        if (!hasFirstCore1) {
          const previousCore1Count = unitTypePattern
            .slice(0, index)
            .filter(p => p.coreNumber === 1).length;

          if (previousCore1Count === 0) {
            hasFirstCore1 = true;
          }
        }
      } else if (coreNum === 2) {
        hasCore2 = true;
      }
    });

    let count = 0;
    if (hasFirstCore1) count++;
    if (hasCore2) count++;

    return count;
  }, [unitTypePattern]);

  /**
   * 총 세대수 계산
   *
   * 계산 공식:
   * ((코어1 호수 × 지상층수) + (코어1-1 호수 × 지상층수) + (코어2 호수 × 지상층수))
   * - (코어1 필로티 제외 세대수 × 필로티 층수 + 코어1-1 필로티 제외 세대수 × 필로티 층수 + ...)
   */
  const { totalUnitCount, coreUnitDetails } = useMemo(() => {
    let total = 0;
    const details: UseBuildingAutoCalculationsResult['coreUnitDetails'] = [];

    // 각 패턴 순회하면서 계산
    unitTypePattern.forEach((pattern, index) => {
      const coreNum = pattern.coreNumber || 1;
      // 신규 방식: unitCount 사용, 기존 데이터 호환: from/to 사용
      const unitCount = pattern.unitCount ?? (pattern.to && pattern.from ? pattern.to - pattern.from + 1 : 0);

      // 코어별 층수 가져오기
      let floorCount = groundCount;

      if (coreNum === 1) {
        // 코어1: 인덱스 기반으로 층수 결정
        const core1Index = unitTypePattern
          .slice(0, index + 1)
          .filter(p => p.coreNumber === 1).length - 1;

        if (coreGroundFloors.length > core1Index) {
          floorCount = coreGroundFloors[core1Index] ?? groundCount;
        }
      } else if (coreNum === 2) {
        // 코어2: 코어1 개수 뒤에 위치
        const core1Count = unitTypePattern.filter(p => p.coreNumber === 1).length;
        const core2Index = core1Count;

        if (coreGroundFloors.length > core2Index) {
          floorCount = coreGroundFloors[core2Index] ?? groundCount;
        }
      }

      total += unitCount * floorCount;

      // 디버그용 상세 정보
      const getCoreDisplayName = (cn: number, idx: number) => {
        if (cn === 1) {
          const prevCount = unitTypePattern.slice(0, idx).filter(p => p.coreNumber === 1).length;
          return prevCount > 0 ? `코어1-${prevCount}` : '코어1';
        }
        return `코어${cn}`;
      };

      details.push({
        coreDisplayName: getCoreDisplayName(coreNum, index),
        unitCount,
        floorCount,
        pilotisExclusion: 0, // 아래에서 업데이트
      });
    });

    // 필로티 세대수 제외
    let totalPilotisExclusion = 0;

    if (corePilotisCounts.length > 0 && corePilotisHeights.length > 0) {
      unitTypePattern.forEach((pattern, index) => {
        const coreNum = pattern.coreNumber || 1;

        let pilotisIndex = 0;
        if (coreNum === 1) {
          const core1Index = unitTypePattern
            .slice(0, index + 1)
            .filter(p => p.coreNumber === 1).length - 1;
          pilotisIndex = core1Index;
        } else if (coreNum === 2) {
          const core1Count = unitTypePattern.filter(p => p.coreNumber === 1).length;
          pilotisIndex = core1Count;
        }

        const pilotisCnt = corePilotisCounts.length > pilotisIndex
          ? corePilotisCounts[pilotisIndex] ?? 0
          : 0;
        const pilotisHeight = corePilotisHeights.length > pilotisIndex
          ? corePilotisHeights[pilotisIndex] ?? 0
          : 0;

        const exclusion = pilotisCnt * pilotisHeight;
        totalPilotisExclusion += exclusion;

        // 상세 정보 업데이트
        if (details[index]) {
          details[index].pilotisExclusion = exclusion;
        }
      });
    } else {
      // 기존 방식 호환성 유지
      totalPilotisExclusion = corePilotisCounts.length > 0
        ? corePilotisCounts.reduce((sum, count) => sum + count, 0)
        : pilotisCount;
    }

    return {
      totalUnitCount: total - totalPilotisExclusion,
      coreUnitDetails: details,
    };
  }, [
    unitTypePattern,
    groundCount,
    coreGroundFloors,
    pilotisCount,
    corePilotisCounts,
    corePilotisHeights,
  ]);

  return {
    calculatedCoreCount,
    totalUnitCount,
    coreUnitDetails,
  };
}

/**
 * 코어 표시명 계산 헬퍼 함수
 *
 * @example
 * getCoreDisplayName(1, 0, patterns) // "코어1"
 * getCoreDisplayName(1, 1, patterns) // "코어1-1"
 * getCoreDisplayName(2, 0, patterns) // "코어2"
 */
export function getCoreDisplayName(
  coreNumber: number,
  currentIndex: number,
  unitTypePattern: UnitTypePattern[]
): string {
  if (coreNumber === 1) {
    const previousCore1Count = unitTypePattern
      .slice(0, currentIndex)
      .filter(p => p.coreNumber === 1).length;
    if (previousCore1Count > 0) {
      return `코어1-${previousCore1Count}`;
    }
    return '코어1';
  }
  return `코어${coreNumber}`;
}

/**
 * 필로티 인덱스 계산 헬퍼 함수
 */
export function getPilotisIndex(
  coreNumber: number,
  currentIndex: number,
  unitTypePattern: UnitTypePattern[]
): number {
  if (coreNumber === 1) {
    return unitTypePattern
      .slice(0, currentIndex + 1)
      .filter(p => p.coreNumber === 1).length - 1;
  } else if (coreNumber === 2) {
    return unitTypePattern.filter(p => p.coreNumber === 1).length;
  }
  return 0;
}
