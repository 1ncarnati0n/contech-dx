'use client';

import type { GridData } from '../types';
import { StructureCell } from './StructureCell';

interface StructureGridProps {
  gridData: GridData;
}

export function StructureGrid({ gridData }: StructureGridProps) {
  const { rows, totalColumns, coreColumns } = gridData;

  if (totalColumns === 0 || rows.length === 0) {
    return (
      <div className="flex items-center justify-center h-40 text-sm text-slate-400 dark:text-slate-500">
        코어를 추가하면 골구조도가 생성됩니다.
      </div>
    );
  }

  // 열 너비: 층 라벨(60px) + 셀들(균등)
  const gridTemplateColumns = `60px repeat(${totalColumns}, minmax(40px, 1fr))`;

  return (
    <div className="overflow-x-auto">
      {/* 코어 헤더 */}
      <div
        className="grid gap-0 mb-1"
        style={{ gridTemplateColumns }}
      >
        <div /> {/* 빈 라벨 칸 */}
        {coreColumns.map(col => {
          const span = col.endCol - col.startCol;
          return (
            <div
              key={col.coreId}
              className="text-center text-xs font-semibold text-slate-600 dark:text-slate-400 py-1 border-b-2 border-slate-400 dark:border-slate-500"
              style={{ gridColumn: `span ${span}` }}
            >
              코어{col.coreId}
            </div>
          );
        })}
      </div>

      {/* 그리드 본체 */}
      <div className="relative">
        {rows.map((row) => {
          const isFoundation = row.category === 'foundation';
          // 지상/지하 경계선
          const isBoundary = row.floorNumber === -1;

          return (
            <div key={row.floorLabel}>
              {isBoundary && (
                <div
                  className="grid gap-0"
                  style={{ gridTemplateColumns }}
                >
                  <div />
                  <div
                    className="h-1 bg-slate-500 dark:bg-slate-400 my-0.5"
                    style={{ gridColumn: `span ${totalColumns}` }}
                  />
                </div>
              )}
              <div
                className="grid gap-0"
                style={{ gridTemplateColumns }}
              >
                {/* 층 라벨 */}
                <div className="flex items-center justify-end pr-2 text-xs font-medium text-slate-500 dark:text-slate-400">
                  {row.floorLabel}
                </div>

                {/* 셀들 */}
                {isFoundation ? (
                  <StructureCell cell={row.cells[0]} />
                ) : (
                  row.cells.map((cell, cellIdx) => (
                    <StructureCell key={cellIdx} cell={cell} />
                  ))
                )}
              </div>
            </div>
          );
        })}

        {/* 코어 경계 오버레이 */}
        {coreColumns.map(col => {
          const span = col.endCol - col.startCol;
          const startGridCol = col.startCol + 2; // +1 for label col, +1 for 1-based
          return (
            <div
              key={`border-${col.coreId}`}
              className="absolute pointer-events-none border-2 border-slate-400 dark:border-slate-500 rounded"
              style={{
                gridColumn: `${startGridCol} / span ${span}`,
                top: 0,
                bottom: 0,
                left: `calc(60px + ${(col.startCol / totalColumns) * 100}% * (1 - 60px / 100%))`,
                width: `calc(${(span / totalColumns) * 100}% * (1 - 60px / 100%))`,
              }}
            />
          );
        })}
      </div>
    </div>
  );
}
