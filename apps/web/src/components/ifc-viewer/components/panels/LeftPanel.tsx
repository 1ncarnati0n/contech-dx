'use client';

import { FolderTree, Search } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useIfcViewerStore } from '../../stores/useIfcViewerStore';
import { ModelTreePanel } from './ModelTreePanel';
import { SearchPanel } from './SearchPanel';

/**
 * 좌측 패널 컴포넌트
 *
 * 모델 트리와 검색 탭을 제공합니다.
 */
interface LeftPanelProps {
  className?: string;
}

export function LeftPanel({ className }: LeftPanelProps) {
  const { leftPanelTab, setLeftPanelTab } = useIfcViewerStore();

  return (
    <div className={cn(
      "bg-white/50 dark:bg-slate-800/50 rounded-lg overflow-hidden flex flex-col border border-zinc-300 dark:border-slate-600",
      className
    )}>
      {/* 탭 헤더 */}
      <div className="flex border-b border-zinc-300 dark:border-slate-600">
        <button
          className={`flex-1 px-4 py-2 text-sm font-medium flex items-center justify-center gap-2 transition-colors ${
            leftPanelTab === 'tree'
              ? 'bg-zinc-100 dark:bg-slate-700 text-primary'
              : 'text-zinc-600 dark:text-slate-400 hover:bg-zinc-50 dark:hover:bg-slate-700/50'
          }`}
          onClick={() => setLeftPanelTab('tree')}
        >
          <FolderTree className="h-4 w-4" />
          트리
        </button>
        <button
          className={`flex-1 px-4 py-2 text-sm font-medium flex items-center justify-center gap-2 transition-colors ${
            leftPanelTab === 'search'
              ? 'bg-zinc-100 dark:bg-slate-700 text-primary'
              : 'text-zinc-600 dark:text-slate-400 hover:bg-zinc-50 dark:hover:bg-slate-700/50'
          }`}
          onClick={() => setLeftPanelTab('search')}
        >
          <Search className="h-4 w-4" />
          검색
        </button>
      </div>

      {/* 탭 컨텐츠 */}
      <div className="flex-1 overflow-hidden">
        {leftPanelTab === 'tree' && <ModelTreePanel />}
        {leftPanelTab === 'search' && <SearchPanel />}
      </div>
    </div>
  );
}
