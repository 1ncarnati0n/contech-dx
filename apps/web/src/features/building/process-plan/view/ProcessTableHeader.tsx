/**
 * Process Table Header Component
 *
 * 🎯 Stage 2 Task 4: Component Separation
 * Extracted from BuildingProcessPlanPage (lines 1543-1592)
 *
 * 📦 Features:
 * - Table column headers (구분, 층수, 형틀, 철근, 콘크리트)
 * - Process column headers (순작업일수, 공정타입, 세부공정)
 * - Spanning cell for 세부공정 상세
 * - React.memo for performance (pure presentation)
 *
 * 💡 Usage:
 * <ProcessTableHeader
 *   processColumns={PROCESS_CATEGORIES.map(...)}
 *   totalRows={processRows.length}
 * />
 */

import { memo, Fragment } from 'react';
import type { ProcessCategory } from '@/shared/types';

interface ProcessColumn {
  category: ProcessCategory;
  colIndex: number;
}

interface ProcessTableHeaderProps {
  processColumns: ProcessColumn[];
  totalRows: number;
}

export const ProcessTableHeader = memo(function ProcessTableHeader({
  processColumns,
  totalRows,
}: ProcessTableHeaderProps) {
  return (
    <thead className="bg-zinc-50 dark:bg-zinc-900/50">
      <tr className="border-b border-zinc-200 dark:border-zinc-800" style={{ height: '24px' }}>
        {/* 첫 번째 열: 구분 항목 */}
        <th
          className="px-2 py-1 text-center text-xs font-semibold text-zinc-500 dark:text-zinc-400 uppercase tracking-wider border-r border-zinc-200 dark:border-zinc-800"
          style={{ height: '24px', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}
        >
          구분
        </th>
        {/* 두 번째 열: 층수 */}
        <th
          className="px-2 py-1 text-center text-xs font-semibold text-zinc-500 dark:text-zinc-400 uppercase tracking-wider border-r border-zinc-200 dark:border-zinc-800"
          style={{ height: '24px', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}
        >
          층수
        </th>
        {/* 세 번째 열: 형틀 */}
        <th
          className="px-1 py-1 text-center text-xs font-semibold text-zinc-500 dark:text-zinc-400 uppercase tracking-wider border-r border-zinc-200 dark:border-zinc-800"
          style={{ height: '24px', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}
        >
          형틀
        </th>
        {/* 네 번째 열: 철근 */}
        <th
          className="px-1 py-1 text-center text-xs font-semibold text-zinc-500 dark:text-zinc-400 uppercase tracking-wider border-r border-zinc-200 dark:border-zinc-800"
          style={{ height: '24px', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}
        >
          철근
        </th>
        {/* 다섯 번째 열: 콘크리트 */}
        <th
          className="px-1 py-1 text-center text-xs font-semibold text-zinc-500 dark:text-zinc-400 uppercase tracking-wider border-r-2 border-zinc-200 dark:border-zinc-800"
          style={{ height: '24px', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}
        >
          콘크리트
        </th>

        {/* 첫 번째 공정 열만 헤더 표시 (일수, 셀렉트박스, 버튼) */}
        {processColumns.length > 0 && (
          <Fragment key={`header-${processColumns[0].category}-${processColumns[0].colIndex}`}>
            {/* 일수 열 */}
            <th
              className="px-1 py-1 text-center text-xs font-semibold text-zinc-500 dark:text-zinc-400 uppercase tracking-wider border-r border-zinc-200 dark:border-zinc-800"
              style={{ height: '24px', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}
            >
              순작업일수
            </th>
            {/* 셀렉트박스 열 */}
            <th
              className="px-1 py-1 text-center text-xs font-semibold text-zinc-500 dark:text-zinc-400 uppercase tracking-wider border-r border-zinc-200 dark:border-zinc-800"
              style={{ height: '24px', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}
            >
              공정타입
            </th>
            {/* 버튼 열 */}
            <th
              className="px-1 py-1 text-center text-xs font-semibold text-zinc-500 dark:text-zinc-400 uppercase tracking-wider border-r border-zinc-200 dark:border-zinc-800"
              style={{ height: '24px', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}
            >
              세부공정
            </th>
          </Fragment>
        )}

        {/* 마지막 열: 세부공정 확장 영역 (모든 행에 걸친 넓은 칸) */}
        <th
          className="px-4 py-2 text-center text-xs font-semibold text-zinc-500 dark:text-zinc-400 uppercase tracking-wider"
          rowSpan={totalRows}
          style={{ height: '30px', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', width: '100%', maxWidth: '218px' }}
        >
          세부공정 상세
        </th>
      </tr>
    </thead>
  );
});
