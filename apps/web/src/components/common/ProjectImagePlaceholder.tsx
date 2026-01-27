'use client';

import { Building2 } from 'lucide-react';
import { cn } from '@/lib/utils';

interface ProjectImagePlaceholderProps {
  projectName: string;
  projectNumber?: number;
  className?: string;
}

export function ProjectImagePlaceholder({
  projectName,
  projectNumber,
  className,
}: ProjectImagePlaceholderProps) {
  return (
    <div
      className={cn(
        'w-full h-full flex flex-col items-center justify-center',
        'bg-gradient-to-br from-zinc-100 via-zinc-50 to-zinc-100',
        'dark:from-zinc-800 dark:via-zinc-900 dark:to-zinc-800',
        'group-hover:scale-105 transition-transform duration-500',
        className
      )}
    >
      <div className="p-4 rounded-full bg-white/60 dark:bg-zinc-700/50 shadow-inner">
        <Building2 className="w-10 h-10 text-cyan-500 dark:text-cyan-400" />
      </div>
      {projectNumber && (
        <span className="mt-2 text-xs font-medium text-zinc-400 dark:text-zinc-500">
          P{projectNumber}
        </span>
      )}
    </div>
  );
}
