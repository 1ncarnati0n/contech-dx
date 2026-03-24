/**
 * 지오메트리 유틸리티 함수
 *
 * 폴리곤 면적 계산, 포인트 포함 판정 등의 기하학적 계산 제공
 */

import type { Point2D } from '@/shared/types';

/**
 * Shoelace 공식을 사용한 폴리곤 면적 계산
 * @param points - 폴리곤 꼭지점 배열
 * @returns 면적 (양수 값)
 */
export function calculatePolygonArea(points: Point2D[]): number {
  if (points.length < 3) return 0;

  let area = 0;
  const n = points.length;

  for (let i = 0; i < n; i++) {
    const j = (i + 1) % n;
    area += points[i].x * points[j].y;
    area -= points[j].x * points[i].y;
  }

  return Math.abs(area / 2);
}

/**
 * flat 배열 [x1,y1,x2,y2,...] 형식의 폴리곤 면적 계산
 * @param flatPoints - [x1, y1, x2, y2, ...] 형식의 좌표 배열
 * @returns 면적 (양수 값)
 */
export function calculateFlatPolygonArea(flatPoints: number[]): number {
  const points = flatPointsToPoints(flatPoints);
  return calculatePolygonArea(points);
}

/**
 * flat 배열을 Point2D 배열로 변환
 */
export function flatPointsToPoints(flatPoints: number[]): Point2D[] {
  const points: Point2D[] = [];
  for (let i = 0; i < flatPoints.length; i += 2) {
    points.push({ x: flatPoints[i], y: flatPoints[i + 1] });
  }
  return points;
}

/**
 * Point2D 배열을 flat 배열로 변환
 */
export function pointsToFlatPoints(points: Point2D[]): number[] {
  return points.flatMap(p => [p.x, p.y]);
}

/**
 * 폴리곤 둘레 계산
 * @param points - 폴리곤 꼭지점 배열
 * @returns 둘레 길이
 */
export function calculatePolygonPerimeter(points: Point2D[]): number {
  if (points.length < 2) return 0;

  let perimeter = 0;
  const n = points.length;

  for (let i = 0; i < n; i++) {
    const j = (i + 1) % n;
    perimeter += calculateDistance(points[i], points[j]);
  }

  return perimeter;
}

/**
 * 두 점 사이의 거리 계산
 */
export function calculateDistance(p1: Point2D, p2: Point2D): number {
  const dx = p2.x - p1.x;
  const dy = p2.y - p1.y;
  return Math.sqrt(dx * dx + dy * dy);
}

/**
 * 점이 폴리곤 내부에 있는지 확인 (Ray casting 알고리즘)
 * @param point - 확인할 점
 * @param polygon - 폴리곤 꼭지점 배열
 * @returns 내부에 있으면 true
 */
export function isPointInPolygon(point: Point2D, polygon: Point2D[]): boolean {
  if (polygon.length < 3) return false;

  let inside = false;
  const n = polygon.length;

  for (let i = 0, j = n - 1; i < n; j = i++) {
    const xi = polygon[i].x;
    const yi = polygon[i].y;
    const xj = polygon[j].x;
    const yj = polygon[j].y;

    const intersect = ((yi > point.y) !== (yj > point.y))
      && (point.x < (xj - xi) * (point.y - yi) / (yj - yi) + xi);

    if (intersect) inside = !inside;
  }

  return inside;
}

/**
 * 폴리곤의 중심점 (centroid) 계산
 */
export function calculatePolygonCentroid(points: Point2D[]): Point2D {
  if (points.length === 0) return { x: 0, y: 0 };

  let cx = 0;
  let cy = 0;
  const n = points.length;

  for (const p of points) {
    cx += p.x;
    cy += p.y;
  }

  return { x: cx / n, y: cy / n };
}

/**
 * 폴리곤의 바운딩 박스 계산
 */
export function calculateBoundingBox(points: Point2D[]): {
  minX: number;
  minY: number;
  maxX: number;
  maxY: number;
  width: number;
  height: number;
} {
  if (points.length === 0) {
    return { minX: 0, minY: 0, maxX: 0, maxY: 0, width: 0, height: 0 };
  }

  let minX = Infinity;
  let minY = Infinity;
  let maxX = -Infinity;
  let maxY = -Infinity;

  for (const p of points) {
    minX = Math.min(minX, p.x);
    minY = Math.min(minY, p.y);
    maxX = Math.max(maxX, p.x);
    maxY = Math.max(maxY, p.y);
  }

  return {
    minX,
    minY,
    maxX,
    maxY,
    width: maxX - minX,
    height: maxY - minY,
  };
}

/**
 * 각도를 라디안으로 변환
 */
export function degreesToRadians(degrees: number): number {
  return degrees * (Math.PI / 180);
}

/**
 * 라디안을 각도로 변환
 */
export function radiansToDegrees(radians: number): number {
  return radians * (180 / Math.PI);
}

/**
 * 점을 특정 각도로 회전
 * @param point - 회전할 점
 * @param center - 회전 중심
 * @param angleDegrees - 회전 각도 (도)
 */
export function rotatePoint(point: Point2D, center: Point2D, angleDegrees: number): Point2D {
  const angleRad = degreesToRadians(angleDegrees);
  const cos = Math.cos(angleRad);
  const sin = Math.sin(angleRad);

  const dx = point.x - center.x;
  const dy = point.y - center.y;

  return {
    x: center.x + dx * cos - dy * sin,
    y: center.y + dx * sin + dy * cos,
  };
}

/**
 * 원 내부에 점이 있는지 확인
 */
export function isPointInCircle(point: Point2D, center: Point2D, radius: number): boolean {
  return calculateDistance(point, center) <= radius;
}

/**
 * 폴리곤이 원과 겹치는지 확인 (근사치)
 * 폴리곤의 모든 꼭지점 중 하나라도 원 안에 있으면 true
 */
export function doesPolygonIntersectCircle(polygon: Point2D[], center: Point2D, radius: number): boolean {
  // 폴리곤의 꼭지점이 원 안에 있는지 확인
  for (const p of polygon) {
    if (isPointInCircle(p, center, radius)) {
      return true;
    }
  }

  // 원의 중심이 폴리곤 안에 있는지 확인
  if (isPointInPolygon(center, polygon)) {
    return true;
  }

  return false;
}

/**
 * 콘크리트 물량 계산
 * @param area - 면적 (㎡)
 * @param thickness - 두께 (m)
 * @param surchargeRate - 할증률 (%, 예: 5)
 * @returns { volume: 순물량, orderVolume: 발주량 }
 */
export function calculateConcreteVolume(
  area: number,
  thickness: number,
  surchargeRate: number
): { volume: number; orderVolume: number } {
  const volume = area * thickness;
  const orderVolume = volume * (1 + surchargeRate / 100);
  return { volume, orderVolume };
}
