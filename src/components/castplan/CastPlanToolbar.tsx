'use client';

import {
  MousePointer,
  Move,
  Scissors,
  DoorOpen,
  Truck,
  Route,
  Ruler,
  ZoomIn,
  ZoomOut,
  Maximize,
  Eye,
  EyeOff,
  Grid3X3,
} from 'lucide-react';
import { Button } from '@/components/ui';
import type { CastPlanTool, CastPlanState } from '@/lib/types';

interface CastPlanToolbarProps {
  activeTool: CastPlanTool;
  onToolChange: (tool: CastPlanTool) => void;
  state: CastPlanState;
  onStateChange: (updates: Partial<CastPlanState>) => void;
  onZoomIn: () => void;
  onZoomOut: () => void;
  onFitToScreen: () => void;
}

export function CastPlanToolbar({
  activeTool,
  onToolChange,
  state,
  onStateChange,
  onZoomIn,
  onZoomOut,
  onFitToScreen,
}: CastPlanToolbarProps) {
  const tools: { id: CastPlanTool; icon: React.ReactNode; label: string }[] = [
    { id: 'select', icon: <MousePointer className="w-4 h-4" />, label: '선택' },
    { id: 'pan', icon: <Move className="w-4 h-4" />, label: '이동' },
    { id: 'split', icon: <Scissors className="w-4 h-4" />, label: '분할' },
    { id: 'gate', icon: <DoorOpen className="w-4 h-4" />, label: '게이트' },
    { id: 'pumpcar', icon: <Truck className="w-4 h-4" />, label: '펌프카' },
    { id: 'route', icon: <Route className="w-4 h-4" />, label: '동선' },
    { id: 'measure', icon: <Ruler className="w-4 h-4" />, label: '측정' },
  ];

  return (
    <div className="flex items-center gap-2 p-2 bg-slate-100 dark:bg-slate-800 rounded-lg">
      {/* 편집 도구 */}
      <div className="flex items-center gap-1 border-r border-slate-300 dark:border-slate-600 pr-2">
        {tools.map((tool) => (
          <Button
            key={tool.id}
            variant={activeTool === tool.id ? 'primary' : 'ghost'}
            size="sm"
            onClick={() => onToolChange(tool.id)}
            title={tool.label}
            className="px-2"
          >
            {tool.icon}
          </Button>
        ))}
      </div>

      {/* 줌 컨트롤 */}
      <div className="flex items-center gap-1 border-r border-slate-300 dark:border-slate-600 pr-2">
        <Button
          variant="ghost"
          size="sm"
          onClick={onZoomIn}
          title="확대"
          className="px-2"
        >
          <ZoomIn className="w-4 h-4" />
        </Button>
        <Button
          variant="ghost"
          size="sm"
          onClick={onZoomOut}
          title="축소"
          className="px-2"
        >
          <ZoomOut className="w-4 h-4" />
        </Button>
        <Button
          variant="ghost"
          size="sm"
          onClick={onFitToScreen}
          title="화면 맞춤"
          className="px-2"
        >
          <Maximize className="w-4 h-4" />
        </Button>
      </div>

      {/* 표시 옵션 */}
      <div className="flex items-center gap-1">
        <Button
          variant={state.showReachCircles ? 'primary' : 'ghost'}
          size="sm"
          onClick={() =>
            onStateChange({ showReachCircles: !state.showReachCircles })
          }
          title="도달 범위 표시"
          className="px-2"
        >
          {state.showReachCircles ? (
            <Eye className="w-4 h-4" />
          ) : (
            <EyeOff className="w-4 h-4" />
          )}
        </Button>
        <Button
          variant={state.showLabels ? 'primary' : 'ghost'}
          size="sm"
          onClick={() => onStateChange({ showLabels: !state.showLabels })}
          title="라벨 표시"
          className="px-2 text-xs"
        >
          Aa
        </Button>
        <Button
          variant={state.showGrid ? 'primary' : 'ghost'}
          size="sm"
          onClick={() => onStateChange({ showGrid: !state.showGrid })}
          title="그리드 표시"
          className="px-2"
        >
          <Grid3X3 className="w-4 h-4" />
        </Button>
      </div>
    </div>
  );
}
