/**
 * 골구조도(Structure Diagram) 타입 정의
 */

/** 셀 유형 */
export type CellType =
  | 'unit'        // 세대
  | 'core'        // 코어 (구조체)
  | 'piloti'      // 필로티
  | 'rooftop'     // 옥탑
  | 'basement'    // 지하층
  | 'foundation'  // 기초
  | 'empty';      // 빈 셀 (코어 높이 차이로 인한 빈 공간)

/** 층 분류 (색상 매핑용) */
export type FloorCategory =
  | 'setting'     // 셋팅층 (1~3F 또는 높이가 다른 층)
  | 'standard'    // 기준층
  | 'top'         // 최상층
  | 'rooftop'     // 옥탑
  | 'basement'    // 지하층
  | 'foundation'  // 기초
  | 'piloti';     // 필로티

/** 코어 구조 정의 */
export interface CoreStructure {
  id: number;                  // 코어 번호 (1~4)
  unitsLeft: number;           // 왼쪽 세대수 (0~3)
  unitsRight: number;          // 오른쪽 세대수 (0~3)
  groundFloors: number;        // 지상 층수
  basementFloors: number;      // 지하 층수
  rooftopFloors: number;       // 옥탑 층수
  piloti: {
    floor: number;             // 필로티 시작 층 (0이면 없음)
    excludeUnits: number[];    // 제외 세대 인덱스 (0-based, 왼→오른 순서)
  } | null;
}

/** 그리드 셀 데이터 */
export interface GridCell {
  type: CellType;
  category: FloorCategory;
  coreId: number;              // 소속 코어 번호
  floorLabel: string;          // "1F", "B1", "PH1" 등
  floorNumber: number;         // 정렬용 숫자
  unitLabel?: string;          // 세대 라벨 ("101", "201" 등)
  unitIndex?: number;          // 세대 인덱스 (0-based)
  side?: 'left' | 'right';    // 좌/우 세대 구분
  colSpan?: number;            // 셀 병합 (기초용)
}

/** 그리드 행 데이터 */
export interface GridRow {
  floorLabel: string;
  floorNumber: number;
  category: FloorCategory;
  cells: GridCell[];
}

/** 전체 그리드 데이터 */
export interface GridData {
  rows: GridRow[];
  totalColumns: number;        // 전체 열 수
  coreColumns: CoreColumnInfo[];
}

/** 코어별 열 정보 */
export interface CoreColumnInfo {
  coreId: number;
  startCol: number;            // 시작 열 (0-based)
  endCol: number;              // 끝 열 (exclusive)
  leftUnitCols: number;        // 왼쪽 세대 열 수
  coreCols: number;            // 코어 열 수 (항상 1)
  rightUnitCols: number;       // 오른쪽 세대 열 수
}
