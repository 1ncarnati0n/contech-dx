import type { BuildingMeta, UnitTypePattern } from '@/shared/types';
import type { CoreStructure } from '../types';

/**
 * CoreStructure[] → BuildingMeta 변환
 *
 * 골구조도 데이터를 기존 BuildingMeta 형식으로 변환합니다.
 * 기존 meta 값을 baseMeta로 받아 heights 등을 보존합니다.
 */
export function coresToBuildingMeta(
  cores: CoreStructure[],
  baseMeta: BuildingMeta,
): BuildingMeta {
  const coreCount = cores.length;

  // 코어별 층수 배열
  const coreGroundFloors = cores.map(c => c.groundFloors);
  const coreBasementFloors = cores.map(c => c.basementFloors);
  const corePhFloors = cores.map(c => c.rooftopFloors);

  // 필로티 정보
  const corePilotisCounts = cores.map(c => {
    if (!c.piloti || c.piloti.floor === 0) return 0;
    return c.piloti.excludeUnits.length;
  });
  const corePilotisHeights = cores.map(c => {
    if (!c.piloti || c.piloti.floor === 0) return 0;
    return c.piloti.floor;
  });

  // 총 세대수 계산
  const totalUnits = cores.reduce((sum, core) => {
    const unitsPerFloor = core.unitsLeft + core.unitsRight;
    const pilotiUnits = core.piloti ? core.piloti.excludeUnits.length : 0;
    const pilotiHeight = core.piloti ? core.piloti.floor : 0;
    return sum + (unitsPerFloor * core.groundFloors) - (pilotiUnits * pilotiHeight);
  }, 0);

  // UnitTypePattern 생성
  const unitTypePattern: UnitTypePattern[] = cores.map((core, i) => ({
    unitCount: core.unitsLeft + core.unitsRight,
    type: baseMeta.unitTypePattern[i]?.type ?? '',
    coreNumber: core.id,
  }));

  return {
    ...baseMeta,
    coreCount,
    totalUnits,
    unitTypePattern,
    floorCount: {
      ...baseMeta.floorCount,
      basement: Math.max(...coreBasementFloors, 0),
      ground: Math.max(...coreGroundFloors, 0),
      ph: Math.max(...corePhFloors, 0),
      coreGroundFloors,
      coreBasementFloors,
      corePhFloors,
      corePilotisCounts,
      corePilotisHeights,
    },
  };
}

/**
 * BuildingMeta → CoreStructure[] 변환
 *
 * 기존 BuildingMeta에서 골구조도용 CoreStructure 배열을 복원합니다.
 */
export function buildingMetaToCores(meta: BuildingMeta): CoreStructure[] {
  const coreCount = meta.coreCount || 1;
  const cores: CoreStructure[] = [];

  for (let i = 0; i < coreCount; i++) {
    const coreId = i + 1;

    // 세대수 (기존 데이터에는 좌/우 구분이 없으므로 균등 배분)
    const totalUnitsPerFloor = meta.unitTypePattern[i]?.unitCount ?? 2;
    const unitsLeft = Math.ceil(totalUnitsPerFloor / 2);
    const unitsRight = totalUnitsPerFloor - unitsLeft;

    // 층수
    const groundFloors = meta.floorCount.coreGroundFloors?.[i] ?? meta.floorCount.ground;
    const basementFloors = meta.floorCount.coreBasementFloors?.[i] ?? meta.floorCount.basement;
    const rooftopFloors = meta.floorCount.corePhFloors?.[i] ?? meta.floorCount.ph;

    // 필로티
    const pilotisCount = meta.floorCount.corePilotisCounts?.[i] ?? 0;
    const pilotisHeight = meta.floorCount.corePilotisHeights?.[i] ?? 0;

    let piloti: CoreStructure['piloti'] = null;
    if (pilotisCount > 0 && pilotisHeight > 0) {
      // 제외 세대 인덱스 복원 (기존에는 인덱스 정보가 없으므로 뒤에서부터 배정)
      const excludeUnits: number[] = [];
      for (let u = totalUnitsPerFloor - 1; u >= 0 && excludeUnits.length < pilotisCount; u--) {
        excludeUnits.push(u);
      }
      piloti = { floor: pilotisHeight, excludeUnits };
    }

    cores.push({
      id: coreId,
      unitsLeft,
      unitsRight,
      groundFloors,
      basementFloors,
      rooftopFloors,
      piloti,
    });
  }

  return cores;
}
