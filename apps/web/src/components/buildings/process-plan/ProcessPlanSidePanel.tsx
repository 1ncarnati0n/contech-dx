import type { ReactNode } from 'react';

interface ProcessPlanSidePanelProps {
  children: ReactNode;
}

export function ProcessPlanSidePanel({ children }: ProcessPlanSidePanelProps) {
  return (
    <div className="w-[320px] flex-shrink-0 rounded-lg shadow-lg border-2 border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-950 overflow-hidden">
      <div className="bg-zinc-100 dark:bg-zinc-900 px-4 py-3 border-b border-zinc-200 dark:border-zinc-800">
        <h3 className="font-semibold text-sm text-zinc-900 dark:text-zinc-100">세부공정 정보</h3>
      </div>

      <div className="p-4">
        <div className="sticky top-4 overflow-y-auto space-y-4 text-xs" style={{ maxHeight: 'calc(100vh - 260px)', minHeight: '300px' }}>
          {children}
        </div>
      </div>
    </div>
  );
}
