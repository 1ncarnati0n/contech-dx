'use client';

import { Grid3X3, Square } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { useIfcViewerContext } from '../../context/IfcViewerContext';
import { useIfcViewerStore } from '../../stores/useIfcViewerStore';
import { useEdgeRendering } from '../../hooks/useEdgeRendering';

/**
 * 렌더링 컨트롤 컴포넌트
 *
 * 투영 모드, 엣지 라인 토글 등을 제공합니다.
 */
export function RenderingControls() {
  const { toggleProjection } = useIfcViewerContext();
  const { projectionMode, setProjectionMode } = useIfcViewerStore();
  const { edgesEnabled, toggleEdges } = useEdgeRendering();

  const handleProjectionToggle = async () => {
    const newMode = await toggleProjection();
    if (newMode) {
      setProjectionMode(newMode);
    }
  };

  return (
    <div className="bg-white/90 dark:bg-slate-800/90 backdrop-blur-sm rounded-lg p-1 border border-zinc-300 dark:border-slate-600 flex flex-col gap-1">
      {/* 투영 모드 토글 */}
      <Button
        variant="ghost"
        size="sm"
        className={`w-full justify-start gap-2 text-xs ${
          projectionMode === 'Orthographic' ? 'text-primary' : 'text-zinc-600 dark:text-slate-300'
        }`}
        onClick={handleProjectionToggle}
        title="투영 모드 전환"
      >
        <Grid3X3 className="h-4 w-4" />
        {projectionMode === 'Perspective' ? '원근' : '정사영'}
      </Button>

      {/* 엣지 라인 토글 */}
      <Button
        variant="ghost"
        size="sm"
        className={`w-full justify-start gap-2 text-xs ${
          edgesEnabled ? 'text-primary' : 'text-zinc-600 dark:text-slate-300'
        }`}
        onClick={toggleEdges}
        title="엣지 라인 토글"
      >
        <Square className="h-4 w-4" />
        엣지 {edgesEnabled ? 'ON' : 'OFF'}
      </Button>
    </div>
  );
}
