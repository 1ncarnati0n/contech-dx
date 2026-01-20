'use client';

import { Group, Line, Text } from 'react-konva';
import type { CastBlock } from '@/lib/types';
import { calculateFlatPolygonArea, flatPointsToPoints, calculatePolygonCentroid } from '@/lib/utils/geometry';

interface BlockLayerProps {
  blocks: CastBlock[];
  selectedBlockId: string | null;
  showLabels: boolean;
  onClick: (blockId: string) => void;
  onDragEnd: (blockId: string, newPoints: number[]) => void;
  draggable: boolean;
}

export function BlockLayer({
  blocks,
  selectedBlockId,
  showLabels,
  onClick,
  onDragEnd,
  draggable,
}: BlockLayerProps) {
  return (
    <Group>
      {blocks.map((block) => (
        <BlockShape
          key={block.id}
          block={block}
          isSelected={block.id === selectedBlockId}
          showLabel={showLabels}
          onClick={() => onClick(block.id)}
          onDragEnd={(newPoints) => onDragEnd(block.id, newPoints)}
          draggable={draggable}
        />
      ))}
    </Group>
  );
}

interface BlockShapeProps {
  block: CastBlock;
  isSelected: boolean;
  showLabel: boolean;
  onClick: () => void;
  onDragEnd: (newPoints: number[]) => void;
  draggable: boolean;
}

function BlockShape({
  block,
  isSelected,
  showLabel,
  onClick,
  onDragEnd,
  draggable,
}: BlockShapeProps) {
  const points = flatPointsToPoints(block.points);
  const centroid = calculatePolygonCentroid(points);
  const area = calculateFlatPolygonArea(block.points);

  // 선택 시 하이라이트 색상
  const fillColor = isSelected
    ? adjustColorOpacity(block.color, 0.5)
    : adjustColorOpacity(block.color, 0.3);
  const strokeColor = isSelected ? '#FFFFFF' : block.color;
  const strokeWidth = isSelected ? 3 : 2;

  return (
    <Group
      draggable={draggable}
      onClick={onClick}
      onTap={onClick}
      onDragEnd={(e) => {
        const node = e.target;
        const dx = node.x();
        const dy = node.y();
        // 새 좌표 계산
        const newPoints = block.points.map((coord, i) =>
          i % 2 === 0 ? coord + dx : coord + dy
        );
        // 드래그 후 그룹 위치 초기화
        node.position({ x: 0, y: 0 });
        onDragEnd(newPoints);
      }}
    >
      {/* 블록 폴리곤 */}
      <Line
        points={block.points}
        fill={fillColor}
        stroke={strokeColor}
        strokeWidth={strokeWidth}
        closed={true}
        shadowColor={isSelected ? '#3B82F6' : undefined}
        shadowBlur={isSelected ? 10 : 0}
        shadowOpacity={isSelected ? 0.5 : 0}
      />

      {/* 블록 라벨 */}
      {showLabel && (
        <Group x={centroid.x} y={centroid.y}>
          {/* 배경 */}
          <Line
            points={[-30, -12, 30, -12, 30, 12, -30, 12]}
            fill="rgba(0, 0, 0, 0.7)"
            closed={true}
          />
          {/* 블록명 */}
          <Text
            text={block.name}
            fontSize={14}
            fontStyle="bold"
            fill="#FFFFFF"
            align="center"
            verticalAlign="middle"
            offsetX={25}
            offsetY={6}
            width={50}
          />
          {/* 면적 */}
          <Text
            text={`${area.toFixed(1)}㎡`}
            fontSize={10}
            fill="#CCCCCC"
            align="center"
            offsetX={25}
            offsetY={-4}
            width={50}
          />
        </Group>
      )}

      {/* 타설 순서 표시 */}
      {block.sequence > 0 && (
        <Group x={centroid.x + 30} y={centroid.y - 20}>
          <Line
            points={[0, -10, 10, -10, 10, 10, 0, 10]}
            fill="#EF4444"
            closed={true}
          />
          <Text
            text={String(block.sequence)}
            fontSize={12}
            fontStyle="bold"
            fill="#FFFFFF"
            align="center"
            offsetX={-3}
            offsetY={6}
          />
        </Group>
      )}
    </Group>
  );
}

/**
 * HEX 색상에 투명도 적용
 */
function adjustColorOpacity(hexColor: string, opacity: number): string {
  // HEX를 RGB로 변환
  const hex = hexColor.replace('#', '');
  const r = parseInt(hex.substring(0, 2), 16);
  const g = parseInt(hex.substring(2, 4), 16);
  const b = parseInt(hex.substring(4, 6), 16);
  return `rgba(${r}, ${g}, ${b}, ${opacity})`;
}
