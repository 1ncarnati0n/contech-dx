'use client';

import { useState } from 'react';
import { Scissors, ChevronDown, ChevronUp, X } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { useClipperPlanes } from '../../hooks/useClipperPlanes';
import { ClippingPlaneSlider } from '../clipping/ClippingPlaneSlider';

/**
 * 클리핑 컨트롤 컴포넌트
 *
 * X, Y, Z축 단면도 기능을 제공합니다.
 */
export function ClippingControls() {
  const [isExpanded, setIsExpanded] = useState(false);

  const {
    clippingPlanes,
    toggleClipperPlane,
    updateClipperPlane,
    flipClipperPlane,
    clearAllClipperPlanes,
  } = useClipperPlanes();

  const hasActiveClipping = Object.values(clippingPlanes).some((p) => p.enabled);

  return (
    <div className="bg-white/90 dark:bg-slate-800/90 backdrop-blur-sm rounded-lg border border-zinc-300 dark:border-slate-600 overflow-hidden">
      {/* 헤더 */}
      <button
        className="w-full px-3 py-2 flex items-center justify-between text-zinc-700 dark:text-slate-300 hover:bg-zinc-100 dark:hover:bg-slate-700/50 transition-colors"
        onClick={() => setIsExpanded(!isExpanded)}
      >
        <div className="flex items-center gap-2">
          <Scissors className={`h-4 w-4 ${hasActiveClipping ? 'text-primary' : ''}`} />
          <span className="text-xs font-medium">단면도</span>
        </div>
        {isExpanded ? (
          <ChevronUp className="h-4 w-4" />
        ) : (
          <ChevronDown className="h-4 w-4" />
        )}
      </button>

      {/* 확장된 컨트롤 */}
      {isExpanded && (
        <div className="p-3 pt-0 space-y-3 border-t border-zinc-200 dark:border-slate-600">
          <ClippingPlaneSlider
            axis="x"
            state={clippingPlanes.x}
            onValueChange={updateClipperPlane}
            onFlip={flipClipperPlane}
            onToggle={toggleClipperPlane}
          />
          <ClippingPlaneSlider
            axis="y"
            state={clippingPlanes.y}
            onValueChange={updateClipperPlane}
            onFlip={flipClipperPlane}
            onToggle={toggleClipperPlane}
          />
          <ClippingPlaneSlider
            axis="z"
            state={clippingPlanes.z}
            onValueChange={updateClipperPlane}
            onFlip={flipClipperPlane}
            onToggle={toggleClipperPlane}
          />

          {/* 모든 클리핑 제거 버튼 */}
          {hasActiveClipping && (
            <Button
              variant="outline"
              size="sm"
              className="w-full text-xs gap-1"
              onClick={clearAllClipperPlanes}
            >
              <X className="h-3 w-3" />
              모든 단면 해제
            </Button>
          )}
        </div>
      )}
    </div>
  );
}
