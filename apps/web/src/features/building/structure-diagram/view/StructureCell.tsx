'use client';

import type { GridCell } from '../types';
import { CATEGORY_STYLES, CELL_LABELS } from '../constants';

interface StructureCellProps {
  cell: GridCell;
}

export function StructureCell({ cell }: StructureCellProps) {
  if (cell.type === 'empty') {
    return (
      <div className="border border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900/50" />
    );
  }

  const style = CATEGORY_STYLES[cell.category].cell;

  if (cell.type === 'foundation') {
    return (
      <div
        className={`${style} border flex items-center justify-center font-semibold text-sm py-2`}
        style={cell.colSpan ? { gridColumn: `span ${cell.colSpan}` } : undefined}
      >
        {CELL_LABELS.FOUNDATION}
      </div>
    );
  }

  if (cell.type === 'core') {
    return (
      <div className={`${style} border flex items-center justify-center text-[10px] font-medium opacity-60`}>
        {cell.unitLabel}
      </div>
    );
  }

  return (
    <div className={`${style} border flex items-center justify-center text-xs font-medium min-h-7`}>
      {cell.unitLabel || ''}
    </div>
  );
}
