'use client';

import { useMemo } from 'react';
import Link from 'next/link';
import { Building2, Calendar, DollarSign, MapPin } from 'lucide-react';
import type { Project } from '@/lib/types';
import { formatCurrency, formatDate, getStatusLabel, getStatusColors } from '@/lib/utils/index';

interface ProjectCardProps {
  project: Project;
}

/**
 * 프로젝트 ID를 기반으로 결정론적 해시값 생성
 * 매 렌더링마다 동일한 값을 반환하여 UI 안정성 보장
 */
function generateStableHash(id: string): number {
  const hash = id.split('').reduce((acc, char) => {
    acc = ((acc << 5) - acc) + char.charCodeAt(0);
    return acc & acc;
  }, 0);
  return Math.abs(hash);
}

export function ProjectCard({ project }: ProjectCardProps) {
  // 프로젝트 ID 기반 결정론적 값 생성 (매 렌더링마다 동일)
  const stableValues = useMemo(() => {
    const hash = generateStableHash(project.id);
    return {
      progress: hash % 100,
      teamCount: (hash % 10) + 2,
    };
  }, [project.id]);

  const mockImage = `https://source.unsplash.com/800x600/?construction,building,architecture&sig=${project.id}`;

  return (
    <Link href={`/projects/${project.project_number || project.id}`} className="block h-full group">
      <div className="h-full bg-white dark:bg-zinc-900 rounded-xl border border-zinc-200 dark:border-zinc-800 overflow-hidden hover:shadow-lg hover:border-cyan-400 dark:hover:border-cyan-600 transition-all duration-300 flex flex-col">
        {/* Project Image */}
        <div className="relative h-48 bg-zinc-100 dark:bg-zinc-800 overflow-hidden">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={mockImage}
            alt={project.name}
            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
          />
          <div className="absolute top-3 right-3">
            <span
              className={`px-2.5 py-1 text-xs font-semibold rounded-lg shadow-sm backdrop-blur-md ${getStatusColors(project.status)}`}
            >
              {getStatusLabel(project.status)}
            </span>
          </div>
        </div>

        <div className="p-5 flex flex-col flex-1 gap-4">
          {/* Header */}
          <div>
            <h3 className="text-lg font-bold text-zinc-900 dark:text-white truncate group-hover:text-cyan-600 dark:group-hover:text-cyan-400 transition-colors">
              {project.name}
            </h3>
            <div className="flex items-center gap-1.5 mt-1.5 text-sm text-zinc-500 dark:text-zinc-400">
              <MapPin className="w-3.5 h-3.5" />
              <span className="truncate">{project.location || '위치 미정'}</span>
            </div>
          </div>

          {/* Progress Bar */}
          <div className="space-y-1.5">
            <div className="flex justify-between text-xs font-medium">
              <span className="text-zinc-600 dark:text-zinc-400">공정률</span>
              <span className="text-cyan-600 dark:text-cyan-400">{stableValues.progress}%</span>
            </div>
            <div className="h-2 w-full bg-zinc-100 dark:bg-zinc-800 rounded-full overflow-hidden">
              <div
                className="h-full bg-cyan-500 rounded-full transition-all duration-1000 ease-out"
                style={{ width: `${stableValues.progress}%` }}
              />
            </div>
          </div>

          {/* Details Grid */}
          <div className="grid grid-cols-2 gap-3 pt-2 mt-auto border-t border-zinc-100 dark:border-zinc-800">
            <div className="space-y-0.5">
              <span className="text-xs text-zinc-400 dark:text-zinc-500">계약금액</span>
              <div className="flex items-center gap-1.5 text-sm font-medium text-zinc-700 dark:text-zinc-300">
                <DollarSign className="w-3.5 h-3.5 text-zinc-400" />
                {formatCurrency(project.contract_amount)}
              </div>
            </div>
            <div className="space-y-0.5">
              <span className="text-xs text-zinc-400 dark:text-zinc-500">착공일</span>
              <div className="flex items-center gap-1.5 text-sm font-medium text-zinc-700 dark:text-zinc-300">
                <Calendar className="w-3.5 h-3.5 text-zinc-400" />
                {formatDate(project.start_date)}
              </div>
            </div>
          </div>

          {/* Footer: Team & Client */}
          <div className="flex items-center justify-between pt-2">
            <div className="flex -space-x-2">
              {[...Array(3)].map((_, i) => (
                <div key={i} className="w-7 h-7 rounded-full bg-zinc-200 dark:bg-zinc-700 border-2 border-white dark:border-zinc-900 flex items-center justify-center text-[10px] text-zinc-500 font-medium">
                  {String.fromCharCode(65 + i)}
                </div>
              ))}
              <div className="w-7 h-7 rounded-full bg-zinc-100 dark:bg-zinc-800 border-2 border-white dark:border-zinc-900 flex items-center justify-center text-[10px] text-zinc-500 font-medium">
                +{stableValues.teamCount}
              </div>
            </div>

            {project.client && (
              <div className="flex items-center gap-1.5 text-xs text-zinc-500 dark:text-zinc-400 bg-zinc-50 dark:bg-zinc-800/50 px-2 py-1 rounded-md">
                <Building2 className="w-3 h-3" />
                <span className="max-w-[80px] truncate">{project.client}</span>
              </div>
            )}
          </div>
        </div>
      </div>
    </Link>
  );
}
