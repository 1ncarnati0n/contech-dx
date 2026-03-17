'use client';

import { Stage, Layer } from 'react-konva';
import type { CastPlanState } from '@/shared/types';
import { DxfLayer } from './layers/DxfLayer';
import { BlockLayer } from './layers/BlockLayer';
import { GateLayer } from './layers/GateLayer';
import { PumpCarLayer } from './layers/PumpCarLayer';
import { useCastPlanCanvas } from '@/features/castplan/service/useCastPlanCanvas';
import { getCursorStyle } from '@/features/castplan/service/castplan-helpers';

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
  const {
    stageRef,
    isDragging,
    handleWheel,
    handleDragStart,
    handleDragEnd,
    handleStageClick,
    handleBlockClick,
    handleGateClick,
    handlePumpCarClick,
    handleBlockDragEnd,
    handlePumpCarDragEnd,
  } = useCastPlanCanvas({
    state,
    onStateChange,
    onBlockSelect,
    onGateSelect,
    onPumpCarSelect,
  });

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
