'use client';

import type { GridCell, FloorCategory } from '../types';

const CATEGORY_STYLES: Record<FloorCategory, string> = {
  setting: 'bg-yellow-100 dark:bg-yellow-900/40 border-yellow-300 dark:border-yellow-700 text-yellow-800 dark:text-yellow-200',
  standard: 'bg-yellow-50 dark:bg-yellow-900/20 border-yellow-200 dark:border-yellow-800 text-yellow-700 dark:text-yellow-300',
  top: 'bg-green-100 dark:bg-green-900/40 border-green-300 dark:border-green-700 text-green-800 dark:text-green-200',
  rooftop: 'bg-purple-100 dark:bg-purple-900/40 border-purple-300 dark:border-purple-700 text-purple-800 dark:text-purple-200',
  basement: 'bg-slate-200 dark:bg-slate-700 border-slate-300 dark:border-slate-600 text-slate-600 dark:text-slate-300',
  foundation: 'bg-slate-400 dark:bg-slate-600 border-slate-500 dark:border-slate-500 text-white',
  piloti: 'bg-teal-100 dark:bg-teal-900/40 border-teal-300 dark:border-teal-700 text-teal-800 dark:text-teal-200',
};

interface StructureCellProps {
  cell: GridCell;
}

export function StructureCell({ cell }: StructureCellProps) {
  if (cell.type === 'empty') {
    return (
      <div className="border border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900/50" />
    );
  }

  const style = CATEGORY_STYLES[cell.category];

  if (cell.type === 'foundation') {
    return (
      <div
        className={`${style} border flex items-center justify-center font-semibold text-sm py-2`}
        style={cell.colSpan ? { gridColumn: `span ${cell.colSpan}` } : undefined}
      >
        기초
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
    <div className={`${style} border flex items-center justify-center text-xs font-medium min-h-[28px]`}>
      {cell.unitLabel || ''}
    </div>
  );
}
