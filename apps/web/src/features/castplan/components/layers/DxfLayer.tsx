'use client';

import { Group, Line, Circle, Arc, Text, Ellipse, Shape, Rect } from 'react-konva';
import type Konva from 'konva';
import type { ParsedDxfData, DxfEntity, Point2D } from '@/shared/types';
import { dxfColorToHex } from '@/features/castplan/utils/dxf-parser';
import { useMemo, memo } from 'react';

interface DxfLayerProps {
  dxfData: ParsedDxfData;
  scale: number;
}

/**
 * DXF 레이어 렌더러
 *
 * 지원 엔티티:
 * - LINE: 직선
 * - POLYLINE/LWPOLYLINE: 폴리라인
 * - CIRCLE: 원
 * - ARC: 호
 * - ELLIPSE: 타원 (회전 지원)
 * - TEXT/MTEXT: 텍스트
 * - POINT: 점
 * - HATCH: 해치 (단색 채우기)
 * - SOLID: 솔리드 (채워진 폴리곤)
 * - SPLINE: 근사된 폴리라인으로 표시
 */
export function DxfLayer({ dxfData, scale }: DxfLayerProps) {
  // 스케일에 따른 선 두께 조정
  const strokeWidth = Math.max(0.5, 1 / scale);

  // 엔티티 수가 많을 경우 성능 최적화를 위해 메모이제이션
  const visibleLayers = useMemo(
    () => dxfData.layers.filter((layer) => layer.visible),
    [dxfData.layers]
  );

  return (
    <Group>
      {visibleLayers.map((layer) => (
        <Group key={layer.name}>
          {layer.entities.map((entity, idx) => (
            <MemoizedEntityRenderer
              key={`${layer.name}-${idx}`}
              entity={entity}
              defaultColor={dxfColorToHex(layer.color)}
              strokeWidth={strokeWidth}
              scale={scale}
            />
          ))}
        </Group>
      ))}
    </Group>
  );
}

interface DxfEntityRendererProps {
  entity: DxfEntity;
  defaultColor: string;
  strokeWidth: number;
  scale: number;
}

/**
 * 개별 DXF 엔티티 렌더러
 */
function DxfEntityRenderer({
  entity,
  defaultColor,
  strokeWidth,
  scale,
}: DxfEntityRendererProps) {
  const color = entity.color ? dxfColorToHex(entity.color) : defaultColor;

  switch (entity.type) {
    case 'LINE':
      return renderLine(entity, color, strokeWidth);

    case 'POLYLINE':
    case 'LWPOLYLINE':
      return renderPolyline(entity, color, strokeWidth);

    case 'CIRCLE':
      return renderCircle(entity, color, strokeWidth);

    case 'ARC':
      return renderArc(entity, color, strokeWidth);

    case 'ELLIPSE':
      return renderEllipse(entity, color, strokeWidth);

    case 'TEXT':
    case 'MTEXT':
      return renderText(entity, color, scale);

    case 'POINT':
      return renderPoint(entity, color, scale);

    case 'HATCH':
      return renderHatch(entity, color, strokeWidth);

    case 'SOLID':
      return renderSolid(entity, color);

    case 'SPLINE':
      // SPLINE이 근사되지 않은 경우 control points를 직선으로 연결
      return renderSplineRaw(entity, color, strokeWidth);

    default:
      return null;
  }
}

// 메모이제이션된 렌더러
const MemoizedEntityRenderer = memo(DxfEntityRenderer);

// ============================================================================
// 엔티티별 렌더링 함수
// ============================================================================

function renderLine(entity: DxfEntity, color: string, strokeWidth: number) {
  if (!entity.startPoint || !entity.endPoint) return null;
  return (
    <Line
      points={[
        entity.startPoint.x,
        entity.startPoint.y,
        entity.endPoint.x,
        entity.endPoint.y,
      ]}
      stroke={color}
      strokeWidth={strokeWidth}
      listening={false}
      perfectDrawEnabled={false}
    />
  );
}

function renderPolyline(entity: DxfEntity, color: string, strokeWidth: number) {
  if (!entity.vertices || entity.vertices.length < 2) return null;
  return (
    <Line
      points={entity.vertices.flatMap((v) => [v.x, v.y])}
      stroke={color}
      strokeWidth={strokeWidth}
      closed={isClosedPolyline(entity.vertices)}
      listening={false}
      perfectDrawEnabled={false}
    />
  );
}

function renderCircle(entity: DxfEntity, color: string, strokeWidth: number) {
  if (!entity.center || !entity.radius) return null;
  return (
    <Circle
      x={entity.center.x}
      y={entity.center.y}
      radius={entity.radius}
      stroke={color}
      strokeWidth={strokeWidth}
      listening={false}
      perfectDrawEnabled={false}
    />
  );
}

function renderArc(entity: DxfEntity, color: string, strokeWidth: number) {
  if (!entity.center || !entity.radius) return null;

  // Konva Arc는 각도를 다르게 계산함
  const startAngle = entity.startAngle || 0;
  let endAngle = entity.endAngle || 0;

  // 각도 정규화
  while (endAngle < startAngle) {
    endAngle += 360;
  }
  const angle = endAngle - startAngle;

  return (
    <Arc
      x={entity.center.x}
      y={entity.center.y}
      innerRadius={entity.radius}
      outerRadius={entity.radius}
      angle={angle}
      rotation={startAngle}
      stroke={color}
      strokeWidth={strokeWidth}
      listening={false}
      perfectDrawEnabled={false}
    />
  );
}

function renderEllipse(entity: DxfEntity, color: string, strokeWidth: number) {
  if (!entity.center || !entity.majorAxisEndPoint) return null;

  // 장축 길이와 각도 계산
  const majorLength = Math.sqrt(
    entity.majorAxisEndPoint.x ** 2 + entity.majorAxisEndPoint.y ** 2
  );
  const minorLength = majorLength * (entity.minorAxisRatio || 0.5);
  const rotation =
    Math.atan2(entity.majorAxisEndPoint.y, entity.majorAxisEndPoint.x) *
    (180 / Math.PI);

  // 부분 타원 (startAngle, endAngle이 있는 경우)
  const isPartial =
    entity.startAngle !== undefined &&
    entity.endAngle !== undefined &&
    (entity.startAngle !== 0 || Math.abs((entity.endAngle || 0) - Math.PI * 2) > 0.01);

  if (isPartial) {
    // 부분 타원은 Shape으로 커스텀 드로잉
    return (
      <Shape
        sceneFunc={(context: Konva.Context, shape: Konva.Shape) => {
          const startAngle = entity.startAngle || 0;
          const endAngle = entity.endAngle || Math.PI * 2;

          context.beginPath();
          context.save();
          context.translate(entity.center!.x, entity.center!.y);
          context.rotate((rotation * Math.PI) / 180);
          context.scale(1, minorLength / majorLength);
          context.arc(0, 0, majorLength, startAngle, endAngle, false);
          context.restore();
          context.strokeShape(shape);
        }}
        stroke={color}
        strokeWidth={strokeWidth}
        listening={false}
        perfectDrawEnabled={false}
      />
    );
  }

  return (
    <Ellipse
      x={entity.center.x}
      y={entity.center.y}
      radiusX={majorLength}
      radiusY={minorLength}
      rotation={rotation}
      stroke={color}
      strokeWidth={strokeWidth}
      listening={false}
      perfectDrawEnabled={false}
    />
  );
}

function renderText(entity: DxfEntity, color: string, scale: number) {
  if (!entity.position || !entity.text) return null;

  // 스케일에 따른 폰트 크기 조정 (최소 8px 보장)
  const fontSize = Math.max(8, 12 / scale);

  return (
    <Text
      x={entity.position.x}
      y={entity.position.y}
      text={entity.text}
      fontSize={fontSize}
      fill={color}
      listening={false}
      perfectDrawEnabled={false}
    />
  );
}

function renderPoint(entity: DxfEntity, color: string, scale: number) {
  if (!entity.point) return null;

  // 점은 작은 사각형으로 표시 (스케일에 따라 크기 조정)
  const size = Math.max(2, 4 / scale);

  return (
    <Rect
      x={entity.point.x - size / 2}
      y={entity.point.y - size / 2}
      width={size}
      height={size}
      fill={color}
      listening={false}
      perfectDrawEnabled={false}
    />
  );
}

function renderHatch(entity: DxfEntity, color: string, strokeWidth: number) {
  if (!entity.boundaryPaths || entity.boundaryPaths.length === 0) return null;

  // 해치는 경계 패스를 채워진 폴리곤으로 렌더링
  // 복잡한 패턴은 단색으로 대체
  return (
    <Group>
      {entity.boundaryPaths.map((path, idx) => {
        if (path.length < 3) return null;
        return (
          <Line
            key={idx}
            points={path.flatMap((v) => [v.x, v.y])}
            closed={true}
            fill={hexToRgba(color, 0.3)} // 30% 투명도
            stroke={color}
            strokeWidth={strokeWidth}
            listening={false}
            perfectDrawEnabled={false}
          />
        );
      })}
    </Group>
  );
}

function renderSolid(entity: DxfEntity, color: string) {
  if (!entity.vertices || entity.vertices.length < 3) return null;

  // SOLID는 삼각형 또는 사각형
  // AutoCAD SOLID의 정점 순서: p1, p2, p4, p3 (교차 순서)
  const vertices = entity.vertices;
  let points: number[];

  if (vertices.length === 3) {
    points = vertices.flatMap((v) => [v.x, v.y]);
  } else if (vertices.length >= 4) {
    // AutoCAD SOLID 정점 순서 보정: 1, 2, 4, 3 → 1, 2, 3, 4
    points = [
      vertices[0].x, vertices[0].y,
      vertices[1].x, vertices[1].y,
      vertices[3].x, vertices[3].y,
      vertices[2].x, vertices[2].y,
    ];
  } else {
    return null;
  }

  return (
    <Line
      points={points}
      closed={true}
      fill={color}
      listening={false}
      perfectDrawEnabled={false}
    />
  );
}

function renderSplineRaw(entity: DxfEntity, color: string, strokeWidth: number) {
  // 근사되지 않은 SPLINE은 control points 또는 fit points를 직선으로 연결
  const points = entity.controlPoints?.length
    ? entity.controlPoints
    : entity.fitPoints;

  if (!points || points.length < 2) return null;

  return (
    <Line
      points={points.flatMap((v) => [v.x, v.y])}
      stroke={color}
      strokeWidth={strokeWidth}
      dash={[5, 3]} // 점선으로 표시하여 근사임을 나타냄
      listening={false}
      perfectDrawEnabled={false}
    />
  );
}

// ============================================================================
// 유틸리티 함수
// ============================================================================

/**
 * 폴리라인이 닫혀있는지 확인
 */
function isClosedPolyline(vertices: Point2D[]): boolean {
  if (vertices.length < 3) return false;
  const first = vertices[0];
  const last = vertices[vertices.length - 1];
  const threshold = 0.001;
  return (
    Math.abs(first.x - last.x) < threshold &&
    Math.abs(first.y - last.y) < threshold
  );
}

/**
 * HEX 색상을 RGBA로 변환
 */
function hexToRgba(hex: string, alpha: number): string {
  const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
  if (!result) return hex;
  const r = parseInt(result[1], 16);
  const g = parseInt(result[2], 16);
  const b = parseInt(result[3], 16);
  return `rgba(${r}, ${g}, ${b}, ${alpha})`;
}
