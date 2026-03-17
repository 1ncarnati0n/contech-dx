import { useRef, useCallback, useState } from 'react';
import type Konva from 'konva';
import type { CastPlanState } from '@/shared/types';

interface UseCastPlanCanvasParams {
  state: CastPlanState;
  onStateChange: (updates: Partial<CastPlanState>) => void;
  onBlockSelect: (blockId: string | null) => void;
  onGateSelect: (gateId: string | null) => void;
  onPumpCarSelect: (pumpCarId: string | null) => void;
}

export function useCastPlanCanvas({
  state,
  onStateChange,
  onBlockSelect,
  onGateSelect,
  onPumpCarSelect,
}: UseCastPlanCanvasParams) {
  const stageRef = useRef<Konva.Stage>(null);
  const [isDragging, setIsDragging] = useState(false);

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
      const clampedScale = Math.max(0.01, Math.min(10, newScale));

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

  const handleDragStart = useCallback(() => {
    if (state.activeTool === 'pan' || state.activeTool === 'select') {
      setIsDragging(true);
    }
  }, [state.activeTool]);

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

  const handleStageClick = useCallback(
    (e: Konva.KonvaEventObject<MouseEvent>) => {
      if (e.target === e.currentTarget) {
        onBlockSelect(null);
        onGateSelect(null);
        onPumpCarSelect(null);
      }
    },
    [onBlockSelect, onGateSelect, onPumpCarSelect]
  );

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

  const handleBlockDragEnd = useCallback(
    (blockId: string, newPoints: number[]) => {
      const updatedBlocks = state.blocks.map((block) =>
        block.id === blockId ? { ...block, points: newPoints } : block
      );
      onStateChange({ blocks: updatedBlocks });
    },
    [state.blocks, onStateChange]
  );

  const handlePumpCarDragEnd = useCallback(
    (pumpCarId: string, newPosition: { x: number; y: number }) => {
      const updatedPumpCars = state.pumpCars.map((pc) =>
        pc.id === pumpCarId ? { ...pc, position: newPosition } : pc
      );
      onStateChange({ pumpCars: updatedPumpCars });
    },
    [state.pumpCars, onStateChange]
  );

  return {
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
  };
}
