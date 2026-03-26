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
  const corePilotisExcludeUnits = cores.map(c => {
    if (!c.piloti || c.piloti.floor === 0) return [];
    return [...c.piloti.excludeUnits];
  });

  // 세대별 지상층 수 배열 (2차원: 코어별 > 세대별)
  const coreUnitGroundFloors = cores.map(c => {
    const total = c.unitsLeft + c.unitsRight;
    if (c.unitGroundFloors && c.unitGroundFloors.length === total) return c.unitGroundFloors;
    return Array(total).fill(c.groundFloors);
  });

  // 총 세대수 계산 (세대별 층수 기반)
  const totalUnits = cores.reduce((sum, core, coreIdx) => {
    const unitFloors = coreUnitGroundFloors[coreIdx];
    const pilotiUnits = core.piloti ? core.piloti.excludeUnits.length : 0;
    const pilotiHeight = core.piloti ? core.piloti.floor : 0;
    const unitTotal = unitFloors.reduce((s, floors) => s + floors, 0);
    return sum + unitTotal - (pilotiUnits * pilotiHeight);
  }, 0);

  // UnitTypePattern 생성 (기존 unitTypes 보존)
  const unitTypePattern: UnitTypePattern[] = cores.map((core, i) => {
    const existing = baseMeta.unitTypePattern[i];
    const unitTypes = existing?.unitTypes && existing.unitTypes.length > 0
      ? existing.unitTypes
      : existing?.type ? [existing.type] : [''];
    return {
      unitCount: core.unitsLeft + core.unitsRight,
      type: unitTypes[0] ?? '',
      unitTypes,
      coreNumber: core.id,
    };
  });

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
      coreUnitGroundFloors,
      coreBasementFloors,
      corePhFloors,
      corePilotisCounts,
      corePilotisHeights,
      corePilotisExcludeUnits: corePilotisExcludeUnits.some(u => u.length > 0)
        ? corePilotisExcludeUnits
        : undefined,
      scaffoldingColumns: cores.some(c => c.scaffolding)
        ? cores.map(c => c.scaffolding?.columns ?? [])
        : undefined,
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

    // 층수 (세대별 지상층 수가 있으면 그 최대값을 groundFloors로 사용)
    const unitGroundFloorsArr = meta.floorCount.coreUnitGroundFloors?.[i];
    const groundFloorsFromUnits = unitGroundFloorsArr && unitGroundFloorsArr.length > 0
      ? Math.max(...unitGroundFloorsArr)
      : undefined;
    const groundFloors = groundFloorsFromUnits
      ?? meta.floorCount.coreGroundFloors?.[i]
      ?? meta.floorCount.ground;
    const basementFloors = meta.floorCount.coreBasementFloors?.[i] ?? meta.floorCount.basement;
    const rooftopFloors = meta.floorCount.corePhFloors?.[i] ?? meta.floorCount.ph;

    // 필로티
    const pilotisCount = meta.floorCount.corePilotisCounts?.[i] ?? 0;
    const pilotisHeight = meta.floorCount.corePilotisHeights?.[i] ?? 0;
    const savedExcludeUnits = meta.floorCount.corePilotisExcludeUnits?.[i];

    let piloti: CoreStructure['piloti'] = null;
    if (pilotisCount > 0 && pilotisHeight > 0) {
      // 저장된 인덱스가 있으면 그대로 사용, 없으면 뒤에서부터 배정 (기존 데이터 호환)
      const excludeUnits = savedExcludeUnits && savedExcludeUnits.length > 0
        ? [...savedExcludeUnits]
        : Array.from({ length: pilotisCount }, (_, u) => totalUnitsPerFloor - 1 - u);
      piloti = { floor: pilotisHeight, excludeUnits };
    }

    // 3단 가시설
    const scaffoldingCols = meta.floorCount.scaffoldingColumns?.[i];
    const scaffolding: CoreStructure['scaffolding'] = scaffoldingCols && scaffoldingCols.length > 0
      ? { columns: scaffoldingCols }
      : null;

    cores.push({
      id: coreId,
      unitsLeft,
      unitsRight,
      groundFloors,
      unitGroundFloors: unitGroundFloorsArr && unitGroundFloorsArr.length === totalUnitsPerFloor
        ? unitGroundFloorsArr
        : undefined,
      basementFloors,
      rooftopFloors,
      piloti,
      scaffolding,
    });
  }

  return cores;
}
