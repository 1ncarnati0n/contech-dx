'use client';

const LEGEND_ITEMS = [
  { label: '셋팅층', color: 'bg-yellow-100 dark:bg-yellow-900/40 border-yellow-300 dark:border-yellow-700' },
  { label: '기준층', color: 'bg-yellow-50 dark:bg-yellow-900/20 border-yellow-200 dark:border-yellow-800' },
  { label: '최상층', color: 'bg-green-100 dark:bg-green-900/40 border-green-300 dark:border-green-700' },
  { label: '옥탑', color: 'bg-purple-100 dark:bg-purple-900/40 border-purple-300 dark:border-purple-700' },
  { label: '지하층', color: 'bg-slate-200 dark:bg-slate-700 border-slate-300 dark:border-slate-600' },
  { label: '기초', color: 'bg-slate-400 dark:bg-slate-600 border-slate-500 dark:border-slate-500' },
  { label: '필로티', color: 'bg-teal-100 dark:bg-teal-900/40 border-teal-300 dark:border-teal-700' },
];

export function StructureLegend() {
  return (
    <div className="flex items-center gap-3 flex-wrap">
      {LEGEND_ITEMS.map(item => (
        <div key={item.label} className="flex items-center gap-1.5">
          <div className={`w-4 h-3 rounded-sm border ${item.color}`} />
          <span className="text-xs text-slate-600 dark:text-slate-400">{item.label}</span>
        </div>
      ))}
    </div>
  );
}
