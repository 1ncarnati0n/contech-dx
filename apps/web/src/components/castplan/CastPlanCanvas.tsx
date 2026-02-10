'use client';

import { useRef, useCallback, useState } from 'react';
import { Stage, Layer } from 'react-konva';
import type Konva from 'konva';
import type {
  CastPlanState,
  CastPlanTool,
} from '@/lib/types';
import { DxfLayer } from './layers/DxfLayer';
import { BlockLayer } from './layers/BlockLayer';
import { GateLayer } from './layers/GateLayer';
import { PumpCarLayer } from './layers/PumpCarLayer';

interface CastPlanCanvasProps {
  state: CastPlanState;
  onStateChange: (updates: Partial<CastPlanState>) => void;
  onBlockSelect: (blockId: string | null) => void;
  onGateSelect: (gateId: string | null) => void;
  onPumpCarSelect: (pumpCarId: string | null) => void;
  width: number;
  height: number;
}

export function CastPlanCanvas({
  state,
  onStateChange,
  onBlockSelect,
  onGateSelect,
  onPumpCarSelect,
  width,
  height,
}: CastPlanCanvasProps) {
  const stageRef = useRef<Konva.Stage>(null);
  const [isDragging, setIsDragging] = useState(false);

  // 줌 핸들러
  const handleWheel = useCallback(
    (e: Konva.KonvaEventObject<WheelEvent>) => {
      e.evt.preventDefault();

      const stage = stageRef.current;
      if (!stage) return;

      const oldScale = state.scale;
      const pointer = stage.getPointerPosition();
      if (!pointer) return;

      const scaleBy = 1.1;
      const direction = e.evt.deltaY > 0 ? -1 : 1;
      const newScale = direction > 0 ? oldScale * scaleBy : oldScale / scaleBy;

      // 줌 제한 (0.01 ~ 10)
      const clampedScale = Math.max(0.01, Math.min(10, newScale));

      // 포인터 위치 기준 줌
      const mousePointTo = {
        x: (pointer.x - state.offsetX) / oldScale,
        y: (pointer.y - state.offsetY) / oldScale,
      };

      const newPos = {
        x: pointer.x - mousePointTo.x * clampedScale,
        y: pointer.y - mousePointTo.y * clampedScale,
      };

      onStateChange({
        scale: clampedScale,
        offsetX: newPos.x,
        offsetY: newPos.y,
      });
    },
    [state.scale, state.offsetX, state.offsetY, onStateChange]
  );

  // 드래그 시작 핸들러
  const handleDragStart = useCallback(() => {
    if (state.activeTool === 'pan' || state.activeTool === 'select') {
      setIsDragging(true);
    }
  }, [state.activeTool]);

  // 드래그 종료 핸들러
  const handleDragEnd = useCallback(
    (e: Konva.KonvaEventObject<DragEvent>) => {
      setIsDragging(false);
      const stage = e.target as Konva.Stage;
      onStateChange({
        offsetX: stage.x(),
        offsetY: stage.y(),
      });
    },
    [onStateChange]
  );

  // 스테이지 클릭 핸들러 (선택 해제)
  const handleStageClick = useCallback(
    (e: Konva.KonvaEventObject<MouseEvent>) => {
      // 스테이지 자체를 클릭한 경우에만 선택 해제
      if (e.target === e.currentTarget) {
        onBlockSelect(null);
        onGateSelect(null);
        onPumpCarSelect(null);
      }
    },
    [onBlockSelect, onGateSelect, onPumpCarSelect]
  );

  // 블록 클릭 핸들러
  const handleBlockClick = useCallback(
    (blockId: string) => {
      if (state.activeTool === 'select') {
        onBlockSelect(blockId);
        onGateSelect(null);
        onPumpCarSelect(null);
      }
    },
    [state.activeTool, onBlockSelect, onGateSelect, onPumpCarSelect]
  );

  // 게이트 클릭 핸들러
  const handleGateClick = useCallback(
    (gateId: string) => {
      if (state.activeTool === 'select') {
        onGateSelect(gateId);
        onBlockSelect(null);
        onPumpCarSelect(null);
      }
    },
    [state.activeTool, onGateSelect, onBlockSelect, onPumpCarSelect]
  );

  // 펌프카 클릭 핸들러
  const handlePumpCarClick = useCallback(
    (pumpCarId: string) => {
      if (state.activeTool === 'select') {
        onPumpCarSelect(pumpCarId);
        onBlockSelect(null);
        onGateSelect(null);
      }
    },
    [state.activeTool, onPumpCarSelect, onBlockSelect, onGateSelect]
  );

  // 블록 드래그 핸들러
  const handleBlockDragEnd = useCallback(
    (blockId: string, newPoints: number[]) => {
      const updatedBlocks = state.blocks.map((block) =>
        block.id === blockId ? { ...block, points: newPoints } : block
      );
      onStateChange({ blocks: updatedBlocks });
    },
    [state.blocks, onStateChange]
  );

  // 펌프카 드래그 핸들러
  const handlePumpCarDragEnd = useCallback(
    (pumpCarId: string, newPosition: { x: number; y: number }) => {
      const updatedPumpCars = state.pumpCars.map((pc) =>
        pc.id === pumpCarId ? { ...pc, position: newPosition } : pc
      );
      onStateChange({ pumpCars: updatedPumpCars });
    },
    [state.pumpCars, onStateChange]
  );

  return (
    <div className="relative bg-slate-900 rounded-lg overflow-hidden">
      <Stage
        ref={stageRef}
        width={width}
        height={height}
        scaleX={state.scale}
        scaleY={state.scale}
        x={state.offsetX}
        y={state.offsetY}
        draggable={state.activeTool === 'pan' || state.activeTool === 'select'}
        onWheel={handleWheel}
        onDragStart={handleDragStart}
        onDragEnd={handleDragEnd}
        onClick={handleStageClick}
        style={{ cursor: getCursorStyle(state.activeTool, isDragging) }}
      >
        {/* DXF 배경 레이어 */}
        <Layer>
          {state.dxfData && (
            <DxfLayer
              dxfData={state.dxfData}
              scale={state.scale}
            />
          )}
        </Layer>

        {/* 블록 레이어 */}
        <Layer>
          <BlockLayer
            blocks={state.blocks}
            selectedBlockId={state.selectedBlockId}
            showLabels={state.showLabels}
            onClick={handleBlockClick}
            onDragEnd={handleBlockDragEnd}
            draggable={state.activeTool === 'select'}
          />
        </Layer>

        {/* 게이트 레이어 */}
        <Layer>
          <GateLayer
            gates={state.gates}
            selectedGateId={state.selectedGateId}
            onClick={handleGateClick}
          />
        </Layer>

        {/* 펌프카 레이어 */}
        <Layer>
          <PumpCarLayer
            pumpCars={state.pumpCars}
            selectedPumpCarId={state.selectedPumpCarId}
            showReachCircles={state.showReachCircles}
            onClick={handlePumpCarClick}
            onDragEnd={handlePumpCarDragEnd}
            draggable={state.activeTool === 'select'}
          />
        </Layer>
      </Stage>

      {/* 줌 레벨 표시 */}
      <div className="absolute bottom-4 right-4 bg-slate-800/80 text-white text-sm px-3 py-1 rounded">
        {Math.round(state.scale * 100)}%
      </div>
    </div>
  );
}

/**
 * 도구에 따른 커서 스타일
 */
function getCursorStyle(tool: CastPlanTool, isDragging: boolean): string {
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
