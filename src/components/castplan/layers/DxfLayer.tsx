'use client';

import { Group, Line, Circle, Arc, Text } from 'react-konva';
import type { ParsedDxfData, DxfEntity } from '@/lib/types';
import { dxfColorToHex } from '@/lib/utils/dxf-parser';

interface DxfLayerProps {
  dxfData: ParsedDxfData;
  scale: number;
}

export function DxfLayer({ dxfData, scale }: DxfLayerProps) {
  // 스케일에 따른 선 두께 조정
  const strokeWidth = Math.max(0.5, 1 / scale);

  return (
    <Group>
      {dxfData.layers
        .filter((layer) => layer.visible)
        .map((layer) => (
          <Group key={layer.name}>
            {layer.entities.map((entity, idx) => (
              <DxfEntityRenderer
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

function DxfEntityRenderer({
  entity,
  defaultColor,
  strokeWidth,
  scale,
}: DxfEntityRendererProps) {
  const color = entity.color ? dxfColorToHex(entity.color) : defaultColor;

  switch (entity.type) {
    case 'LINE':
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
        />
      );

    case 'POLYLINE':
    case 'LWPOLYLINE':
      if (!entity.vertices || entity.vertices.length < 2) return null;
      return (
        <Line
          points={entity.vertices.flatMap((v) => [v.x, v.y])}
          stroke={color}
          strokeWidth={strokeWidth}
          closed={isClosedPolyline(entity.vertices)}
          listening={false}
        />
      );

    case 'CIRCLE':
      if (!entity.center || !entity.radius) return null;
      return (
        <Circle
          x={entity.center.x}
          y={entity.center.y}
          radius={entity.radius}
          stroke={color}
          strokeWidth={strokeWidth}
          listening={false}
        />
      );

    case 'ARC':
      if (!entity.center || !entity.radius) return null;
      return (
        <Arc
          x={entity.center.x}
          y={entity.center.y}
          innerRadius={entity.radius}
          outerRadius={entity.radius}
          angle={(entity.endAngle || 0) - (entity.startAngle || 0)}
          rotation={entity.startAngle || 0}
          stroke={color}
          strokeWidth={strokeWidth}
          listening={false}
        />
      );

    case 'TEXT':
    case 'MTEXT':
      if (!entity.position || !entity.text) return null;
      return (
        <Text
          x={entity.position.x}
          y={entity.position.y}
          text={entity.text}
          fontSize={12 / scale}
          fill={color}
          listening={false}
        />
      );

    default:
      return null;
  }
}

/**
 * 폴리라인이 닫혀있는지 확인
 */
function isClosedPolyline(vertices: { x: number; y: number }[]): boolean {
  if (vertices.length < 3) return false;
  const first = vertices[0];
  const last = vertices[vertices.length - 1];
  const threshold = 0.001;
  return (
    Math.abs(first.x - last.x) < threshold &&
    Math.abs(first.y - last.y) < threshold
  );
}
