'use client';

import { Group, Rect, Arrow, Text } from 'react-konva';
import type { Gate } from '@/lib/types';

interface GateLayerProps {
  gates: Gate[];
  selectedGateId: string | null;
  onClick: (gateId: string) => void;
}

export function GateLayer({ gates, selectedGateId, onClick }: GateLayerProps) {
  return (
    <Group>
      {gates.map((gate) => (
        <GateShape
          key={gate.id}
          gate={gate}
          isSelected={gate.id === selectedGateId}
          onClick={() => onClick(gate.id)}
        />
      ))}
    </Group>
  );
}

interface GateShapeProps {
  gate: Gate;
  isSelected: boolean;
  onClick: () => void;
}

function GateShape({ gate, isSelected, onClick }: GateShapeProps) {
  const gateColor = gate.type === 'main' ? '#22C55E' : '#F59E0B';
  const selectedColor = '#3B82F6';
  const fillColor = isSelected ? selectedColor : gateColor;

  // 게이트 폭과 깊이
  const gateWidth = gate.width * 10; // 스케일 조정
  const gateDepth = 20;

  // 방향에 따른 화살표 계산
  const arrowLength = 30;
  const dirRad = (gate.direction * Math.PI) / 180;
  const arrowEndX = gate.position.x + Math.cos(dirRad) * arrowLength;
  const arrowEndY = gate.position.y + Math.sin(dirRad) * arrowLength;

  return (
    <Group onClick={onClick} onTap={onClick}>
      {/* 게이트 표시 (사각형) */}
      <Rect
        x={gate.position.x - gateWidth / 2}
        y={gate.position.y - gateDepth / 2}
        width={gateWidth}
        height={gateDepth}
        fill={fillColor}
        stroke={isSelected ? '#FFFFFF' : '#000000'}
        strokeWidth={isSelected ? 2 : 1}
        rotation={gate.direction}
        offsetX={0}
        offsetY={0}
        cornerRadius={3}
        shadowColor={isSelected ? selectedColor : undefined}
        shadowBlur={isSelected ? 10 : 0}
        shadowOpacity={isSelected ? 0.5 : 0}
      />

      {/* 진입 방향 화살표 */}
      <Arrow
        points={[gate.position.x, gate.position.y, arrowEndX, arrowEndY]}
        pointerLength={8}
        pointerWidth={8}
        fill={fillColor}
        stroke={fillColor}
        strokeWidth={2}
      />

      {/* 게이트 이름 */}
      <Text
        x={gate.position.x}
        y={gate.position.y - 25}
        text={gate.name}
        fontSize={12}
        fontStyle="bold"
        fill="#FFFFFF"
        align="center"
        offsetX={20}
        width={40}
        shadowColor="#000000"
        shadowBlur={2}
        shadowOpacity={0.8}
      />

      {/* 게이트 타입 표시 */}
      <Text
        x={gate.position.x}
        y={gate.position.y + 15}
        text={gate.type === 'main' ? '정문' : '가설'}
        fontSize={10}
        fill="#CCCCCC"
        align="center"
        offsetX={15}
        width={30}
      />
    </Group>
  );
}
