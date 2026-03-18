'use client';

import { Group, Rect, Circle, Text, Arrow } from 'react-konva';
import type { PumpCar } from '@/shared/types';

interface PumpCarLayerProps {
  pumpCars: PumpCar[];
  selectedPumpCarId: string | null;
  showReachCircles: boolean;
  onClick: (pumpCarId: string) => void;
  onDragEnd: (pumpCarId: string, newPosition: { x: number; y: number }) => void;
  draggable: boolean;
}

export function PumpCarLayer({
  pumpCars,
  selectedPumpCarId,
  showReachCircles,
  onClick,
  onDragEnd,
  draggable,
}: PumpCarLayerProps) {
  return (
    <Group>
      {/* 도달 범위 원 (먼저 그려서 뒤에 배치) */}
      {showReachCircles &&
        pumpCars.map((pumpCar) => (
          <ReachCircle
            key={`reach-${pumpCar.id}`}
            pumpCar={pumpCar}
            isSelected={pumpCar.id === selectedPumpCarId}
          />
        ))}

      {/* 펌프카 본체 */}
      {pumpCars.map((pumpCar) => (
        <PumpCarShape
          key={pumpCar.id}
          pumpCar={pumpCar}
          isSelected={pumpCar.id === selectedPumpCarId}
          onClick={() => onClick(pumpCar.id)}
          onDragEnd={(newPos) => onDragEnd(pumpCar.id, newPos)}
          draggable={draggable}
        />
      ))}
    </Group>
  );
}

interface ReachCircleProps {
  pumpCar: PumpCar;
  isSelected: boolean;
}

function ReachCircle({ pumpCar, isSelected }: ReachCircleProps) {
  const maxReach = pumpCar.spec.horizontalReach;
  const safeReach = maxReach - 5; // 5m 여유

  return (
    <Group>
      {/* 최대 도달 범위 */}
      <Circle
        x={pumpCar.position.x}
        y={pumpCar.position.y}
        radius={maxReach}
        stroke={isSelected ? '#EF4444' : '#F87171'}
        strokeWidth={isSelected ? 2 : 1}
        dash={[10, 5]}
        listening={false}
      />

      {/* 권장 작업 범위 */}
      <Circle
        x={pumpCar.position.x}
        y={pumpCar.position.y}
        radius={safeReach}
        fill="rgba(34, 197, 94, 0.1)"
        stroke={isSelected ? '#22C55E' : '#4ADE80'}
        strokeWidth={isSelected ? 2 : 1}
        listening={false}
      />

      {/* 아웃트리거 범위 */}
      <Circle
        x={pumpCar.position.x}
        y={pumpCar.position.y}
        radius={pumpCar.spec.outriggerWidth / 2}
        fill="rgba(251, 191, 36, 0.3)"
        stroke="#F59E0B"
        strokeWidth={1}
        listening={false}
      />
    </Group>
  );
}

interface PumpCarShapeProps {
  pumpCar: PumpCar;
  isSelected: boolean;
  onClick: () => void;
  onDragEnd: (newPosition: { x: number; y: number }) => void;
  draggable: boolean;
}

function PumpCarShape({
  pumpCar,
  isSelected,
  onClick,
  onDragEnd,
  draggable,
}: PumpCarShapeProps) {
  const vehicleWidth = pumpCar.spec.vehicleWidth * 4; // 스케일
  const vehicleLength = 12 * 4; // 대략 12m

  // 펌프카 색상
  const bodyColor = isSelected ? '#3B82F6' : '#F97316';
  const strokeColor = isSelected ? '#FFFFFF' : '#000000';

  return (
    <Group
      x={pumpCar.position.x}
      y={pumpCar.position.y}
      rotation={pumpCar.rotation}
      draggable={draggable}
      onClick={onClick}
      onTap={onClick}
      onDragEnd={(e) => {
        const node = e.target;
        onDragEnd({ x: node.x(), y: node.y() });
      }}
    >
      {/* 차량 본체 */}
      <Rect
        x={-vehicleLength / 2}
        y={-vehicleWidth / 2}
        width={vehicleLength}
        height={vehicleWidth}
        fill={bodyColor}
        stroke={strokeColor}
        strokeWidth={isSelected ? 2 : 1}
        cornerRadius={3}
        shadowColor={isSelected ? '#3B82F6' : undefined}
        shadowBlur={isSelected ? 15 : 0}
        shadowOpacity={isSelected ? 0.6 : 0}
      />

      {/* 운전석 표시 */}
      <Rect
        x={vehicleLength / 2 - 12}
        y={-vehicleWidth / 2 + 2}
        width={10}
        height={vehicleWidth - 4}
        fill="#1F2937"
        cornerRadius={2}
      />

      {/* 붐 방향 화살표 */}
      <Arrow
        points={[0, 0, -30, 0]}
        pointerLength={8}
        pointerWidth={6}
        fill="#FFFFFF"
        stroke="#FFFFFF"
        strokeWidth={2}
      />

      {/* 펌프카 이름 */}
      <Text
        x={-30}
        y={-vehicleWidth / 2 - 20}
        text={pumpCar.name}
        fontSize={11}
        fontStyle="bold"
        fill="#FFFFFF"
        align="center"
        width={60}
        shadowColor="#000000"
        shadowBlur={2}
        shadowOpacity={0.8}
      />

      {/* 타입 표시 */}
      <Text
        x={-20}
        y={vehicleWidth / 2 + 5}
        text={pumpCar.type}
        fontSize={10}
        fill="#FBBF24"
        align="center"
        width={40}
      />
    </Group>
  );
}
