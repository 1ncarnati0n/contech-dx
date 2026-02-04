'use client';

import {
  ArrowUp,
  ArrowDown,
  ArrowLeft,
  ArrowRight,
  Eye,
} from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { useIfcViewerContext } from '../../context/IfcViewerContext';
import type { ViewOrientation } from '../../types';

/**
 * 뷰 방향 컨트롤 컴포넌트
 *
 * 6방향 뷰 프리셋을 제공합니다.
 */
export function ViewControls() {
  const { setViewOrientation } = useIfcViewerContext();

  const handleViewChange = async (orientation: ViewOrientation) => {
    await setViewOrientation(orientation);
  };

  return (
    <div className="bg-white/90 dark:bg-slate-800/90 backdrop-blur-sm rounded-lg p-1 flex flex-col gap-1 border border-zinc-300 dark:border-slate-600">
      <div className="text-xs text-zinc-600 dark:text-slate-400 px-2 py-1 font-medium">뷰</div>
      <div className="grid grid-cols-3 gap-1">
        <Button
          variant="ghost"
          size="icon"
          className="h-8 w-8 text-zinc-600 dark:text-slate-300 hover:text-zinc-900 dark:hover:text-white hover:bg-zinc-200 dark:hover:bg-slate-700"
          onClick={() => handleViewChange('top')}
          title="위에서 보기"
        >
          <ArrowDown className="h-4 w-4" />
        </Button>
        <Button
          variant="ghost"
          size="icon"
          className="h-8 w-8 text-zinc-600 dark:text-slate-300 hover:text-zinc-900 dark:hover:text-white hover:bg-zinc-200 dark:hover:bg-slate-700"
          onClick={() => handleViewChange('front')}
          title="앞에서 보기"
        >
          <Eye className="h-4 w-4" />
        </Button>
        <Button
          variant="ghost"
          size="icon"
          className="h-8 w-8 text-zinc-600 dark:text-slate-300 hover:text-zinc-900 dark:hover:text-white hover:bg-zinc-200 dark:hover:bg-slate-700"
          onClick={() => handleViewChange('right')}
          title="오른쪽에서 보기"
        >
          <ArrowLeft className="h-4 w-4" />
        </Button>
        <Button
          variant="ghost"
          size="icon"
          className="h-8 w-8 text-zinc-600 dark:text-slate-300 hover:text-zinc-900 dark:hover:text-white hover:bg-zinc-200 dark:hover:bg-slate-700"
          onClick={() => handleViewChange('bottom')}
          title="아래에서 보기"
        >
          <ArrowUp className="h-4 w-4" />
        </Button>
        <Button
          variant="ghost"
          size="icon"
          className="h-8 w-8 text-zinc-600 dark:text-slate-300 hover:text-zinc-900 dark:hover:text-white hover:bg-zinc-200 dark:hover:bg-slate-700"
          onClick={() => handleViewChange('back')}
          title="뒤에서 보기"
        >
          <ArrowDown className="h-4 w-4 rotate-180" />
        </Button>
        <Button
          variant="ghost"
          size="icon"
          className="h-8 w-8 text-zinc-600 dark:text-slate-300 hover:text-zinc-900 dark:hover:text-white hover:bg-zinc-200 dark:hover:bg-slate-700"
          onClick={() => handleViewChange('left')}
          title="왼쪽에서 보기"
        >
          <ArrowRight className="h-4 w-4" />
        </Button>
      </div>
    </div>
  );
}
