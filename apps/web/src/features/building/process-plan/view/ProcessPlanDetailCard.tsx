import type { ReactNode } from 'react';
import { Info } from 'lucide-react';

interface ProcessPlanDetailCardProps<TRow> {
  expandedRow: TRow | null;
  getCategoryDisplayName: (row: TRow) => string;
  description?: string;
  emptyMessage?: ReactNode;
  children: (row: TRow) => ReactNode;
}

export function ProcessPlanDetailCard<TRow>({
  expandedRow,
  getCategoryDisplayName,
  description = '세부 공종별 계획 정보',
  emptyMessage,
  children,
}: ProcessPlanDetailCardProps<TRow>) {
  if (!expandedRow) {
    return (
      <div className="flex flex-col items-center justify-center h-full text-zinc-400 dark:text-zinc-500">
        <Info className="w-6 h-6 mb-2" />
        <p className="text-xs text-center">
          {emptyMessage ?? (
            <>
              세부공정 버튼을 클릭하여
              <br />
              상세 정보를 확인하세요
            </>
          )}
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="border-l-4 border-accent-500 pl-4 bg-accent-50 dark:bg-accent-900/20 py-3 rounded">
        <div className="flex items-center gap-2 mb-2">
          <h4 className="text-sm font-bold text-zinc-900 dark:text-white">
            {getCategoryDisplayName(expandedRow)} 상세 공정
          </h4>
        </div>
        <p className="text-xs text-zinc-600 dark:text-zinc-400">
          {description}
        </p>
      </div>

      {children(expandedRow)}
    </div>
  );
}
