'use client';

import React from 'react';
import type { GridData } from '../types';
import { StructureCell } from './StructureCell';
import { GRID_LABEL_COL_WIDTH, GRID_CELL_MIN_WIDTH, CELL_LABELS, SECTION_STYLES } from '../constants';

interface StructureGridProps {
  gridData: GridData;
  /** 코어별 세대 타입 배열 (예: [["59A", "84A"], ["59A"]]) */
  coreUnitTypes?: string[][];
}

const TYPE_HEADER_CELL = `flex items-center justify-center text-[10px] font-medium text-blue-600 dark:text-blue-400 ${SECTION_STYLES.blue} rounded-sm py-0.5`;

export function StructureGrid({ gridData, coreUnitTypes }: StructureGridProps) {
  const { rows, totalColumns, coreColumns } = gridData;

  if (totalColumns === 0 || rows.length === 0) {
    return (
      <div className="flex items-center justify-center h-40 text-sm text-slate-400 dark:text-slate-500">
        코어를 추가하면 골구조도가 생성됩니다.
      </div>
    );
  }

  const gridTemplateColumns = `${GRID_LABEL_COL_WIDTH}px repeat(${totalColumns}, minmax(${GRID_CELL_MIN_WIDTH}px, 1fr))`;

  return (
    <div className="overflow-x-auto">
      {/* 코어 헤더 */}
      <div
        className="grid gap-0 mb-1"
        style={{ gridTemplateColumns }}
      >
        <div />
        {coreColumns.map(col => {
          const span = col.endCol - col.startCol;
          return (
            <div
              key={col.coreId}
              className="text-center text-xs font-semibold text-slate-600 dark:text-slate-400 py-1 border-b-2 border-slate-400 dark:border-slate-500"
              style={{ gridColumn: `span ${span}` }}
            >
              {CELL_LABELS.CORE(col.coreId)}
            </div>
          );
        })}
      </div>

      {/* 세대 타입 헤더 */}
      {coreUnitTypes && coreUnitTypes.some(types => types.some(Boolean)) && (
        <div
          className="grid gap-0 mb-1"
          style={{ gridTemplateColumns }}
        >
          <div className="flex items-center justify-end pr-2 text-[10px] text-slate-400">
            타입
          </div>
          {coreColumns.map((col, coreIdx) => {
            const types = coreUnitTypes[coreIdx] ?? [];
            return (
              <React.Fragment key={`type-${col.coreId}`}>
                {Array.from({ length: col.leftUnitCols }, (_, u) => (
                  <div key={`left-${u}`} className={TYPE_HEADER_CELL}>
                    {types[u] || '-'}
                  </div>
                ))}
                <div />
                {Array.from({ length: col.rightUnitCols }, (_, u) => (
                  <div key={`right-${u}`} className={TYPE_HEADER_CELL}>
                    {types[col.leftUnitCols + u] || '-'}
                  </div>
                ))}
              </React.Fragment>
            );
          })}
        </div>
      )}

      {/* 그리드 본체 */}
      <div className="relative">
        {rows.map((row) => {
          const isFoundation = row.category === 'foundation';
          const isBoundary = row.floorNumber === -1;

          return (
            <div key={row.floorLabel}>
              {isBoundary && (
                <div className="grid gap-0" style={{ gridTemplateColumns }}>
                  <div />
                  <div
                    className="h-1 bg-slate-500 dark:bg-slate-400 my-0.5"
                    style={{ gridColumn: `span ${totalColumns}` }}
                  />
                </div>
              )}
              <div className="grid gap-0" style={{ gridTemplateColumns }}>
                <div className="flex items-center justify-end pr-2 text-xs font-medium text-slate-500 dark:text-slate-400">
                  {row.floorLabel}
                </div>
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
          const startGridCol = col.startCol + 2;
          return (
            <div
              key={`border-${col.coreId}`}
              className="absolute pointer-events-none border-2 border-slate-400 dark:border-slate-500 rounded"
              style={{
                gridColumn: `${startGridCol} / span ${span}`,
                top: 0,
                bottom: 0,
                left: `calc(${GRID_LABEL_COL_WIDTH}px + ${(col.startCol / totalColumns) * 100}% * (1 - ${GRID_LABEL_COL_WIDTH}px / 100%))`,
                width: `calc(${(span / totalColumns) * 100}% * (1 - ${GRID_LABEL_COL_WIDTH}px / 100%))`,
              }}
            />
          );
        })}
      </div>
    </div>
  );
}
