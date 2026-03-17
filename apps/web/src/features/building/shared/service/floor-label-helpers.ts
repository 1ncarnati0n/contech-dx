/**
 * 층 라벨 유틸리티 함수
 * 주차장 및 특수 층 라벨 처리
 */

/**
 * 층 라벨 정규화 - 접미사(주차장, 3단 가시설 적용부 등) 제거
 * @param label - 원본 층 라벨 (예: "B2 주차장", "B1 3단 가시설 적용부")
 * @returns 정규화된 층 라벨 (예: "B2", "B1")
 */
export function normalizeFloorLabel(label: string): string {
  return label.replace(/\s+(주차장|3단 가시설 적용부)$/, '');
}

/**
 * 지하 주차장 층인지 확인
 * @param floorLabel - 층 라벨
 * @returns 지하 주차장 층이면 true
 */
export function isBasementParking(floorLabel: string): boolean {
  return /^B\d+\s*주차장$/.test(floorLabel);
}

/**
 * 3단 가시설 적용부인지 확인
 * @param floorLabel - 층 라벨
 * @returns 3단 가시설 적용부이면 true
 */
export function isThreeStageShoring(floorLabel: string): boolean {
  return /3단 가시설 적용부$/.test(floorLabel);
}

/**
 * 특수 행(주차장, 3단 가시설)인지 확인
 * @param floorLabel - 층 라벨
 * @returns 특수 행이면 true
 */
export function isSpecialRow(floorLabel: string): boolean {
  return isBasementParking(floorLabel) || isThreeStageShoring(floorLabel);
}
