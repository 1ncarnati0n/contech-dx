'use client';

import { CATEGORY_STYLES, LEGEND_ORDER } from '../constants';

export function StructureLegend() {
  return (
    <div className="flex items-center gap-3 flex-wrap">
      {LEGEND_ORDER.map(category => {
        const config = CATEGORY_STYLES[category];
        return (
          <div key={category} className="flex items-center gap-1.5">
            <div className={`w-4 h-3 rounded-sm border ${config.legend}`} />
            <span className="text-xs text-slate-600 dark:text-slate-400">{config.label}</span>
          </div>
        );
      })}
    </div>
  );
}
