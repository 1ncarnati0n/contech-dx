import type {
  CoreStructure,
  GridData,
  GridRow,
  GridCell,
  CoreColumnInfo,
  CellType,
  FloorCategory,
} from '../types';

/**
 * CoreStructure[] → GridData 변환
 *
 * position 기반: 각 행은 "지면으로부터의 높이"를 나타냄.
 * 각 코어는 해당 position에서 자신의 구조(지상/옥탑/빈칸)를 독립적으로 결정.
 *
 * 예) 코어1: 20F+2PH, 코어2: 15F+1PH
 *   position 22 → 코어1: PH2,   코어2: empty
 *   position 21 → 코어1: PH1,   코어2: empty
 *   position 20 → 코어1: 20F,   코어2: empty
 *   position 16 → 코어1: 16F,   코어2: PH1 (15F 바로 위)
 *   position 15 → 코어1: 15F,   코어2: 15F
 */
export function buildGridData(cores: CoreStructure[]): GridData {
  if (cores.length === 0) {
    return { rows: [], totalColumns: 0, coreColumns: [] };
  }

  // 1. 코어별 열 정보 계산
  const coreColumns = buildCoreColumns(cores);
  const totalColumns = coreColumns.length > 0
    ? coreColumns[coreColumns.length - 1].endCol
    : 0;

  // 2. 전체 높이 범위 계산
  const maxAboveGround = Math.max(...cores.map(c => c.groundFloors + c.rooftopFloors));
  const maxGround = Math.max(...cores.map(c => c.groundFloors));
  const maxBasement = Math.max(...cores.map(c => c.basementFloors));

  // 3. 행 생성 (위→아래)
  const rows: GridRow[] = [];

  // 지상 + 옥탑 (position 기반, 위에서 아래로)
  for (let pos = maxAboveGround; pos >= 1; pos--) {
    const cells: GridCell[] = [];
    let rowLabel = '';
    let rowCategory: FloorCategory = 'standard';

    // 행 라벨 결정: 해당 position이 지상층인 코어가 있으면 "NF", 아니면 "PHn"
    if (pos <= maxGround) {
      rowLabel = `${pos}F`;
      rowCategory = getGroundFloorCategory(pos, maxGround, 0);
    } else {
      rowLabel = `PH${pos - maxGround}`;
      rowCategory = 'rooftop';
    }

    for (let i = 0; i < cores.length; i++) {
      const core = cores[i];
      const colInfo = coreColumns[i];
      const coreTop = core.groundFloors + core.rooftopFloors;

      if (pos > coreTop) {
        // 이 코어의 범위 밖 → 빈칸
        cells.push(...buildEmptyCells(core, colInfo, rowLabel, pos, rowCategory));
      } else if (pos > core.groundFloors) {
        // 옥탑층 영역
        const phNumber = pos - core.groundFloors;
        cells.push(...buildRooftopCells(core, colInfo, rowLabel, pos, phNumber));
      } else {
        // 지상층 영역 — 셋팅층 기준은 해당 코어의 필로티 층 + 1
        const category = getGroundFloorCategory(pos, core.groundFloors, core.piloti?.floor ?? 0);
        cells.push(...buildGroundCells(core, colInfo, rowLabel, pos, category));
      }
    }

    rows.push({
      floorLabel: rowLabel,
      floorNumber: pos,
      category: rowCategory,
      cells,
    });
  }

  // 지하층 (위에서 아래로)
  for (let b = 1; b <= maxBasement; b++) {
    const cells: GridCell[] = [];
    for (let i = 0; i < cores.length; i++) {
      const core = cores[i];
      const colInfo = coreColumns[i];
      if (b <= core.basementFloors) {
        cells.push(...buildBasementCells(core, colInfo, `B${b}`, -b));
      } else {
        cells.push(...buildEmptyCells(core, colInfo, `B${b}`, -b, 'basement'));
      }
    }
    rows.push({
      floorLabel: `B${b}`,
      floorNumber: -b,
      category: 'basement',
      cells,
    });
  }

  // 기초
  rows.push({
    floorLabel: '기초',
    floorNumber: -(maxBasement + 1),
    category: 'foundation',
    cells: [{
      type: 'foundation',
      category: 'foundation',
      coreId: 0,
      floorLabel: '기초',
      floorNumber: -(maxBasement + 1),
      unitLabel: '기초',
      colSpan: totalColumns,
    }],
  });

  return { rows, totalColumns, coreColumns };
}

// ──────────────────────────────────────────
// 코어별 열 위치 계산
// ──────────────────────────────────────────

function buildCoreColumns(cores: CoreStructure[]): CoreColumnInfo[] {
  const columns: CoreColumnInfo[] = [];
  let currentCol = 0;

  for (const core of cores) {
    const leftCols = core.unitsLeft;
    const coreCols = 1;
    const rightCols = core.unitsRight;
    const totalCoreCols = leftCols + coreCols + rightCols;

    columns.push({
      coreId: core.id,
      startCol: currentCol,
      endCol: currentCol + totalCoreCols,
      leftUnitCols: leftCols,
      coreCols,
      rightUnitCols: rightCols,
    });

    currentCol += totalCoreCols;
  }

  return columns;
}

// ──────────────────────────────────────────
// 셀 생성 함수들 (zone별)
// ──────────────────────────────────────────

/** 빈 셀 행 생성 */
function buildEmptyCells(
  core: CoreStructure,
  colInfo: CoreColumnInfo,
  floorLabel: string,
  floorNumber: number,
  category: FloorCategory,
): GridCell[] {
  const cells: GridCell[] = [];
  const total = colInfo.leftUnitCols + 1 + colInfo.rightUnitCols;
  for (let i = 0; i < total; i++) {
    cells.push({
      type: 'empty',
      category,
      coreId: core.id,
      floorLabel,
      floorNumber,
    });
  }
  return cells;
}

/** 옥탑층 셀 생성 — 코어 열에만 표시, 세대 열은 빈칸 */
function buildRooftopCells(
  core: CoreStructure,
  colInfo: CoreColumnInfo,
  floorLabel: string,
  floorNumber: number,
  phNumber: number,
): GridCell[] {
  const cells: GridCell[] = [];

  // 왼쪽 세대 → 빈칸
  for (let u = 0; u < colInfo.leftUnitCols; u++) {
    cells.push({
      type: 'empty',
      category: 'rooftop',
      coreId: core.id,
      floorLabel,
      floorNumber,
      side: 'left',
      unitIndex: u,
    });
  }

  // 코어 → 옥탑 표시
  cells.push({
    type: 'rooftop',
    category: 'rooftop',
    coreId: core.id,
    floorLabel,
    floorNumber,
    unitLabel: `옥탑${phNumber}`,
  });

  // 오른쪽 세대 → 빈칸
  for (let u = 0; u < colInfo.rightUnitCols; u++) {
    cells.push({
      type: 'empty',
      category: 'rooftop',
      coreId: core.id,
      floorLabel,
      floorNumber,
      side: 'right',
      unitIndex: colInfo.leftUnitCols + u,
    });
  }

  return cells;
}

/** 지상층 셀 생성 */
function buildGroundCells(
  core: CoreStructure,
  colInfo: CoreColumnInfo,
  floorLabel: string,
  floor: number,
  category: FloorCategory,
): GridCell[] {
  const cells: GridCell[] = [];
  const totalUnits = core.unitsLeft + core.unitsRight;

  // 왼쪽 세대
  for (let u = 0; u < colInfo.leftUnitCols; u++) {
    if (isPilotiUnit(core, floor, u)) {
      cells.push({ type: 'piloti', category: 'piloti', coreId: core.id, floorLabel, floorNumber: floor, unitLabel: '필로티', unitIndex: u, side: 'left' });
    } else {
      const unitNumber = computeUnitNumber(core.id, floor, u, totalUnits);
      cells.push({ type: 'unit', category, coreId: core.id, floorLabel, floorNumber: floor, unitLabel: String(unitNumber), unitIndex: u, side: 'left' });
    }
  }

  // 코어
  cells.push({
    type: 'core',
    category,
    coreId: core.id,
    floorLabel,
    floorNumber: floor,
    unitLabel: `코어${core.id}`,
  });

  // 오른쪽 세대
  for (let u = 0; u < colInfo.rightUnitCols; u++) {
    const unitIndex = colInfo.leftUnitCols + u;
    if (isPilotiUnit(core, floor, unitIndex)) {
      cells.push({ type: 'piloti', category: 'piloti', coreId: core.id, floorLabel, floorNumber: floor, unitLabel: '필로티', unitIndex, side: 'right' });
    } else {
      const unitNumber = computeUnitNumber(core.id, floor, unitIndex, totalUnits);
      cells.push({ type: 'unit', category, coreId: core.id, floorLabel, floorNumber: floor, unitLabel: String(unitNumber), unitIndex, side: 'right' });
    }
  }

  return cells;
}

/** 지하층 셀 생성 */
function buildBasementCells(
  core: CoreStructure,
  colInfo: CoreColumnInfo,
  floorLabel: string,
  floorNumber: number,
): GridCell[] {
  const cells: GridCell[] = [];
  const total = colInfo.leftUnitCols + 1 + colInfo.rightUnitCols;
  for (let i = 0; i < total; i++) {
    cells.push({
      type: 'basement',
      category: 'basement',
      coreId: core.id,
      floorLabel,
      floorNumber,
    });
  }
  return cells;
}

// ──────────────────────────────────────────
// 유틸리티
// ──────────────────────────────────────────

/** 필로티 세대인지 확인 */
function isPilotiUnit(core: CoreStructure, floor: number, unitIndex: number): boolean {
  if (!core.piloti || core.piloti.floor === 0) return false;
  if (floor > core.piloti.floor) return false;
  return core.piloti.excludeUnits.includes(unitIndex);
}

/** 세대 호수 계산 */
function computeUnitNumber(
  coreId: number,
  floor: number,
  unitIndex: number,
  totalUnitsPerFloor: number,
): number {
  const coreOffset = (coreId - 1) * totalUnitsPerFloor;
  return floor * 100 + coreOffset + unitIndex + 1;
}

/**
 * 지상층 카테고리 결정
 *
 * - 필로티 없음 → 셋팅층 없이 1F부터 기준층
 * - 필로티 N층 → 1F ~ (N+1)F 셋팅층
 */
function getGroundFloorCategory(floor: number, maxFloor: number, pilotiFloor: number): FloorCategory {
  if (floor === maxFloor) return 'top';
  const settingCutoff = pilotiFloor > 0 ? pilotiFloor + 1 : 1;
  if (floor <= settingCutoff) return 'setting';
  return 'standard';
}
