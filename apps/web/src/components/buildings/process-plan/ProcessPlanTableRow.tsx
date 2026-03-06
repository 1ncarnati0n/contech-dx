import type { CSSProperties, ReactNode } from 'react';

interface ProcessPlanTableRowProps {
  children: ReactNode;
  isExpanded: boolean;
  style?: CSSProperties;
}

export function ProcessPlanTableRow({ children, isExpanded, style }: ProcessPlanTableRowProps) {
  return (
    <tr
      className={`border-b border-zinc-200 dark:border-zinc-800 hover:bg-zinc-50 dark:hover:bg-zinc-900/50 transition-colors duration-200 border-l-4 border-l-transparent ${isExpanded ? 'bg-accent-50 dark:bg-accent-900/20 border-l-accent-500 shadow-sm' : ''}`}
      style={{ height: '32px', ...style }}
    >
      {children}
    </tr>
  );
}
