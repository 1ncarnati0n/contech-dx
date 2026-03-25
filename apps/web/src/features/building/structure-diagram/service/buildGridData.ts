import type {
  CoreStructure,
  GridData,
  GridRow,
  GridCell,
  CoreColumnInfo,
  CellType,
  FloorCategory,
} from '../types';
import { SETTING_FLOOR_OFFSET, CELL_LABELS } from '../constants';

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
interface BuildGridOptions {
  hasHighCeilingEquipmentRoom?: boolean;
}

export function buildGridData(cores: CoreStructure[], options?: BuildGridOptions): GridData {
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

  // 전체 코어 중 최대 필로티 층 → 셋팅층 = 이 값 + 2 (딱 한 층)
  // 필로티 없으면 2층이 셋팅층
  const maxPilotiFloor = Math.max(...cores.map(c => c.piloti?.floor ?? 0));
  const settingFloor = maxPilotiFloor + SETTING_FLOOR_OFFSET;

  // 3. 행 생성 (위→아래)
  const rows: GridRow[] = [];

  // 지상 + 옥탑 (position 기반, 위에서 아래로)
  for (let pos = maxAboveGround; pos >= 1; pos--) {
    const cells: GridCell[] = [];
    let rowLabel = '';
    let rowCategory: FloorCategory = 'standard';

    // 행 라벨 결정: 해당 position이 지상층인 코어가 있으면 "NF", 아니면 "PHn"
    if (pos <= maxGround) {
      rowLabel = CELL_LABELS.FLOOR(pos);
      rowCategory = getGroundFloorCategory(pos, maxGround, settingFloor);
    } else {
      rowLabel = CELL_LABELS.PH(pos - maxGround);
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
        // 지상층 영역 — 세대별 높이 차이 반영
        const category = getGroundFloorCategory(pos, core.groundFloors, settingFloor);
        cells.push(...buildGroundCellsWithUnitFloors(core, colInfo, rowLabel, pos, category, settingFloor));
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
        cells.push(...buildBasementCells(core, colInfo, CELL_LABELS.BASEMENT(b), -b, options?.hasHighCeilingEquipmentRoom));
      } else {
        cells.push(...buildEmptyCells(core, colInfo, CELL_LABELS.BASEMENT(b), -b, 'basement'));
      }
    }
    rows.push({
      floorLabel: CELL_LABELS.BASEMENT(b),
      floorNumber: -b,
      category: 'basement',
      cells,
    });
  }

  // 기초
  rows.push({
    floorLabel: CELL_LABELS.FOUNDATION,
    floorNumber: -(maxBasement + 1),
    category: 'foundation',
    cells: [{
      type: 'foundation',
      category: 'foundation',
      coreId: 0,
      floorLabel: CELL_LABELS.FOUNDATION,
      floorNumber: -(maxBasement + 1),
      unitLabel: CELL_LABELS.FOUNDATION,
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
    unitLabel: CELL_LABELS.ROOFTOP(phNumber),
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

/** 세대별 지상층 수 배열 (unitGroundFloors fallback) */
function getUnitGroundFloorsArray(core: CoreStructure): number[] {
  const total = core.unitsLeft + core.unitsRight;
  if (total === 0) return [];
  if (core.unitGroundFloors && core.unitGroundFloors.length === total) {
    return core.unitGroundFloors;
  }
  return Array(total).fill(core.groundFloors);
}

/** 지상층 셀 생성 (세대별 높이 차이 반영) */
function buildGroundCellsWithUnitFloors(
  core: CoreStructure,
  colInfo: CoreColumnInfo,
  floorLabel: string,
  floor: number,
  category: FloorCategory,
  settingFloor: number,
): GridCell[] {
  const cells: GridCell[] = [];
  const totalUnits = core.unitsLeft + core.unitsRight;
  const unitFloors = getUnitGroundFloorsArray(core);

  // 왼쪽 세대
  for (let u = 0; u < colInfo.leftUnitCols; u++) {
    const unitMaxFloor = unitFloors[u] ?? core.groundFloors;
    if (floor > unitMaxFloor) {
      // 이 세대의 범위 밖 → 빈칸
      cells.push({ type: 'empty', category, coreId: core.id, floorLabel, floorNumber: floor, unitIndex: u, side: 'left' });
    } else if (isPilotiUnit(core, floor, u)) {
      cells.push({ type: 'piloti', category: 'piloti', coreId: core.id, floorLabel, floorNumber: floor, unitLabel: CELL_LABELS.PILOTI, unitIndex: u, side: 'left' });
    } else {
      const unitCategory = getGroundFloorCategory(floor, unitMaxFloor, settingFloor);
      const unitNumber = computeUnitNumber(core.id, floor, u, totalUnits);
      cells.push({ type: 'unit', category: unitCategory, coreId: core.id, floorLabel, floorNumber: floor, unitLabel: String(unitNumber), unitIndex: u, side: 'left' });
    }
  }

  // 코어 (코어는 groundFloors=최대값 기준)
  cells.push({
    type: 'core',
    category,
    coreId: core.id,
    floorLabel,
    floorNumber: floor,
    unitLabel: CELL_LABELS.CORE(core.id),
  });

  // 오른쪽 세대
  for (let u = 0; u < colInfo.rightUnitCols; u++) {
    const unitIndex = colInfo.leftUnitCols + u;
    const unitMaxFloor = unitFloors[unitIndex] ?? core.groundFloors;
    if (floor > unitMaxFloor) {
      cells.push({ type: 'empty', category, coreId: core.id, floorLabel, floorNumber: floor, unitIndex, side: 'right' });
    } else if (isPilotiUnit(core, floor, unitIndex)) {
      cells.push({ type: 'piloti', category: 'piloti', coreId: core.id, floorLabel, floorNumber: floor, unitLabel: CELL_LABELS.PILOTI, unitIndex, side: 'right' });
    } else {
      const unitCategory = getGroundFloorCategory(floor, unitMaxFloor, settingFloor);
      const unitNumber = computeUnitNumber(core.id, floor, unitIndex, totalUnits);
      cells.push({ type: 'unit', category: unitCategory, coreId: core.id, floorLabel, floorNumber: floor, unitLabel: String(unitNumber), unitIndex, side: 'right' });
    }
  }

  return cells;
}

/** 지상층 셀 생성 (하위호환 - 코어 단위) */
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
      cells.push({ type: 'piloti', category: 'piloti', coreId: core.id, floorLabel, floorNumber: floor, unitLabel: CELL_LABELS.PILOTI, unitIndex: u, side: 'left' });
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
    unitLabel: CELL_LABELS.CORE(core.id),
  });

  // 오른쪽 세대
  for (let u = 0; u < colInfo.rightUnitCols; u++) {
    const unitIndex = colInfo.leftUnitCols + u;
    if (isPilotiUnit(core, floor, unitIndex)) {
      cells.push({ type: 'piloti', category: 'piloti', coreId: core.id, floorLabel, floorNumber: floor, unitLabel: CELL_LABELS.PILOTI, unitIndex, side: 'right' });
    } else {
      const unitNumber = computeUnitNumber(core.id, floor, unitIndex, totalUnits);
      cells.push({ type: 'unit', category, coreId: core.id, floorLabel, floorNumber: floor, unitLabel: String(unitNumber), unitIndex, side: 'right' });
    }
  }

  return cells;
}

/** 지하층 셀 생성 (3단 가시설 반영) */
function buildBasementCells(
  core: CoreStructure,
  colInfo: CoreColumnInfo,
  floorLabel: string,
  floorNumber: number,
  hasHighCeilingEquipmentRoom?: boolean,
): GridCell[] {
  const cells: GridCell[] = [];
  const scaffoldingCols = hasHighCeilingEquipmentRoom ? (core.scaffolding?.columns ?? []) : [];

  // 왼쪽 세대
  for (let u = 0; u < colInfo.leftUnitCols; u++) {
    const isScaffolding = scaffoldingCols.includes(u);
    cells.push({
      type: isScaffolding ? 'scaffolding' : 'basement',
      category: isScaffolding ? 'scaffolding' : 'basement',
      coreId: core.id,
      floorLabel,
      floorNumber,
      unitLabel: isScaffolding ? CELL_LABELS.SCAFFOLDING : undefined,
      unitIndex: u,
      side: 'left',
    });
  }

  // 코어
  const isCoreScaffolding = scaffoldingCols.includes(-1);
  cells.push({
    type: isCoreScaffolding ? 'scaffolding' : 'basement',
    category: isCoreScaffolding ? 'scaffolding' : 'basement',
    coreId: core.id,
    floorLabel,
    floorNumber,
    unitLabel: isCoreScaffolding ? '3단' : undefined,
  });

  // 오른쪽 세대
  for (let u = 0; u < colInfo.rightUnitCols; u++) {
    const unitIndex = colInfo.leftUnitCols + u;
    const isScaffolding = scaffoldingCols.includes(unitIndex);
    cells.push({
      type: isScaffolding ? 'scaffolding' : 'basement',
      category: isScaffolding ? 'scaffolding' : 'basement',
      coreId: core.id,
      floorLabel,
      floorNumber,
      unitLabel: isScaffolding ? CELL_LABELS.SCAFFOLDING : undefined,
      unitIndex,
      side: 'right',
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
 * - 최상층: 맨 위 층
 * - 셋팅층: 전체 코어 중 최대 필로티 + 2 = 딱 그 한 층
 * - 일반층: 셋팅층 아래
 * - 기준층: 셋팅층 위 ~ 최상층 아래
 */
function getGroundFloorCategory(floor: number, maxFloor: number, settingFloor: number): FloorCategory {
  if (floor === maxFloor) return 'top';
  if (floor === settingFloor) return 'setting';
  if (floor < settingFloor) return 'standard';
  return 'basis';
}
