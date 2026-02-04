'use client';

import { FlipHorizontal } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import type { ClippingAxis, ClippingPlaneState } from '../../types';

interface ClippingPlaneSliderProps {
  axis: ClippingAxis;
  state: ClippingPlaneState;
  onValueChange: (axis: ClippingAxis, value: number) => void;
  onFlip: (axis: ClippingAxis) => void;
  onToggle: (axis: ClippingAxis) => void;
}

const axisLabels: Record<ClippingAxis, string> = {
  x: 'X축 (좌우)',
  y: 'Y축 (상하)',
  z: 'Z축 (전후)',
};

const axisColors: Record<ClippingAxis, string> = {
  x: 'bg-red-500',
  y: 'bg-green-500',
  z: 'bg-blue-500',
};

/**
 * 클리핑 플레인 슬라이더 컴포넌트
 *
 * 개별 축의 클리핑 플레인을 제어합니다.
 */
export function ClippingPlaneSlider({
  axis,
  state,
  onValueChange,
  onFlip,
  onToggle,
}: ClippingPlaneSliderProps) {
  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className={`w-3 h-3 rounded-full ${axisColors[axis]}`} />
          <span className="text-xs font-medium text-zinc-700 dark:text-slate-300">
            {axisLabels[axis]}
          </span>
        </div>
        <div className="flex items-center gap-1">
          <Button
            variant="ghost"
            size="icon"
            className={`h-6 w-6 ${state.enabled ? 'text-primary' : 'text-zinc-400 dark:text-slate-500'}`}
            onClick={() => onToggle(axis)}
            title={state.enabled ? '비활성화' : '활성화'}
          >
            <div className={`w-3 h-3 rounded-sm border-2 ${
              state.enabled ? 'bg-primary border-primary' : 'border-current'
            }`} />
          </Button>
          {state.enabled && (
            <Button
              variant="ghost"
              size="icon"
              className={`h-6 w-6 ${state.flipped ? 'text-primary' : 'text-zinc-400 dark:text-slate-500'}`}
              onClick={() => onFlip(axis)}
              title="방향 뒤집기"
            >
              <FlipHorizontal className="h-3 w-3" />
            </Button>
          )}
        </div>
      </div>

      {state.enabled && (
        <div className="flex items-center gap-2">
          <input
            type="range"
            min={0}
            max={100}
            value={state.value}
            onChange={(e) => onValueChange(axis, Number(e.target.value))}
            className="w-full h-1.5 bg-zinc-200 dark:bg-slate-600 rounded-full appearance-none cursor-pointer
              [&::-webkit-slider-thumb]:appearance-none
              [&::-webkit-slider-thumb]:w-3
              [&::-webkit-slider-thumb]:h-3
              [&::-webkit-slider-thumb]:rounded-full
              [&::-webkit-slider-thumb]:bg-primary
              [&::-webkit-slider-thumb]:cursor-pointer
              [&::-moz-range-thumb]:w-3
              [&::-moz-range-thumb]:h-3
              [&::-moz-range-thumb]:rounded-full
              [&::-moz-range-thumb]:bg-primary
              [&::-moz-range-thumb]:border-0
              [&::-moz-range-thumb]:cursor-pointer"
          />
          <span className="text-xs text-zinc-500 dark:text-slate-400 w-8 text-right">
            {state.value}%
          </span>
        </div>
      )}
    </div>
  );
}
