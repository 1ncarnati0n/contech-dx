import type { CastPlanTool, CastBlock, DxfParseProgress, Point2D } from '@/shared/types';

/** 도구에 따른 커서 스타일 */
export function getCursorStyle(tool: CastPlanTool, isDragging: boolean): string {
  if (isDragging) return 'grabbing';

  switch (tool) {
    case 'pan':
      return 'grab';
    case 'select':
      return 'default';
    case 'split':
      return 'crosshair';
    case 'gate':
    case 'pumpcar':
      return 'copy';
    case 'measure':
      return 'crosshair';
    default:
      return 'default';
  }
}

/** HEX 색상에 투명도 적용 → rgba 문자열 */
export function adjustColorOpacity(hexColor: string, opacity: number): string {
  const hex = hexColor.replace('#', '');
  const r = parseInt(hex.substring(0, 2), 16);
  const g = parseInt(hex.substring(2, 4), 16);
  const b = parseInt(hex.substring(4, 6), 16);
  return `rgba(${r}, ${g}, ${b}, ${opacity})`;
}

/** HEX 색상을 RGBA로 변환 */
export function hexToRgba(hex: string, alpha: number): string {
  const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
  if (!result) return hex;
  const r = parseInt(result[1], 16);
  const g = parseInt(result[2], 16);
  const b = parseInt(result[3], 16);
  return `rgba(${r}, ${g}, ${b}, ${alpha})`;
}

/** 폴리라인이 닫혀있는지 확인 */
export function isClosedPolyline(vertices: Point2D[]): boolean {
  if (vertices.length < 3) return false;
  const first = vertices[0];
  const last = vertices[vertices.length - 1];
  const threshold = 0.001;
  return (
    Math.abs(first.x - last.x) < threshold &&
    Math.abs(first.y - last.y) < threshold
  );
}

export interface BlockTotals {
  area: number;
  volume: number;
  orderVolume: number;
}

/** 블록 배열의 총계 계산 */
export function calculateBlockTotals(blocks: CastBlock[]): BlockTotals {
  return blocks.reduce(
    (acc, block) => ({
      area: acc.area + (block.area || 0),
      volume: acc.volume + (block.volume || 0),
      orderVolume: acc.orderVolume + (block.orderVolume || 0),
    }),
    { area: 0, volume: 0, orderVolume: 0 }
  );
}

/** DXF 파싱 단계 설명 반환 */
export function getPhaseDescription(phase: DxfParseProgress['phase']): string {
  switch (phase) {
    case 'reading':
      return '파일을 읽고 있습니다...';
    case 'parsing':
      return 'DXF 구조를 분석하고 있습니다...';
    case 'processing':
      return '엔티티를 처리하고 있습니다...';
    case 'complete':
      return '완료!';
    case 'error':
      return '오류가 발생했습니다';
    default:
      return '처리 중...';
  }
}
