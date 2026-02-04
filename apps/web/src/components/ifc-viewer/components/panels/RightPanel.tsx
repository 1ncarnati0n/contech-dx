'use client';

import { FileText, MessageSquare } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useIfcViewerStore } from '../../stores/useIfcViewerStore';
import { PropertiesPanel } from './PropertiesPanel';
import { AnnotationsPanel } from './AnnotationsPanel';

/**
 * 우측 패널 컴포넌트
 *
 * 속성 정보와 주석 탭을 제공합니다.
 */
interface RightPanelProps {
  className?: string;
}

export function RightPanel({ className }: RightPanelProps) {
  const { rightPanelTab, setRightPanelTab } = useIfcViewerStore();

  return (
    <div className={cn(
      "bg-white/50 dark:bg-slate-800/50 rounded-lg overflow-hidden flex flex-col border border-zinc-300 dark:border-slate-600",
      className
    )}>
      {/* 탭 헤더 */}
      <div className="flex border-b border-zinc-300 dark:border-slate-600">
        <button
          className={`flex-1 px-4 py-2 text-sm font-medium flex items-center justify-center gap-2 transition-colors ${
            rightPanelTab === 'properties'
              ? 'bg-zinc-100 dark:bg-slate-700 text-primary'
              : 'text-zinc-600 dark:text-slate-400 hover:bg-zinc-50 dark:hover:bg-slate-700/50'
          }`}
          onClick={() => setRightPanelTab('properties')}
        >
          <FileText className="h-4 w-4" />
          속성
        </button>
        <button
          className={`flex-1 px-4 py-2 text-sm font-medium flex items-center justify-center gap-2 transition-colors ${
            rightPanelTab === 'annotations'
              ? 'bg-zinc-100 dark:bg-slate-700 text-primary'
              : 'text-zinc-600 dark:text-slate-400 hover:bg-zinc-50 dark:hover:bg-slate-700/50'
          }`}
          onClick={() => setRightPanelTab('annotations')}
        >
          <MessageSquare className="h-4 w-4" />
          주석
        </button>
      </div>

      {/* 탭 컨텐츠 */}
      <div className="flex-1 overflow-hidden">
        {rightPanelTab === 'properties' && <PropertiesPanel />}
        {rightPanelTab === 'annotations' && <AnnotationsPanel />}
      </div>
    </div>
  );
}
