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
<<<<<<< HEAD
  // Mock data for UI visualization (since these fields don't exist in DB yet)
  const mockImage = `https://source.unsplash.com/800x600/?construction,building,architecture&sig=${project.id}`;
  const mockProgress = Math.floor(Math.random() * 100);
  const mockTeamCount = Math.floor(Math.random() * 10) + 2;

  const formatCurrency = (amount?: number) => {
    if (!amount) return '-';
    return new Intl.NumberFormat('ko-KR', {
      style: 'currency',
      currency: 'KRW',
      notation: 'compact',
      maximumFractionDigits: 1,
    }).format(amount);
  };
=======
  // 프로젝트 ID 기반 결정론적 값 생성 (매 렌더링마다 동일)
  const stableValues = useMemo(() => {
    const hash = generateStableHash(project.id);
    return {
      progress: hash % 100,
      teamCount: (hash % 10) + 2,
    };
  }, [project.id]);
>>>>>>> staging

  const mockImage = `https://source.unsplash.com/800x600/?construction,building,architecture&sig=${project.id}`;

  return (
    <Link href={`/projects/${project.project_number || project.id}`} className="block h-full group">
      <div className="h-full bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 overflow-hidden hover:shadow-lg hover:border-primary-300 dark:hover:border-primary-700 transition-all duration-300 flex flex-col">
        {/* Project Image */}
        <div className="relative h-48 bg-slate-100 dark:bg-slate-800 overflow-hidden">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={mockImage}
            alt={project.name}
            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
          />
          <div className="absolute top-3 right-3">
            <span
<<<<<<< HEAD
              className={`px-2.5 py-1 text-xs font-semibold rounded-lg shadow-sm backdrop-blur-md ${STATUS_COLORS[project.status]}`}
=======
              className={`px-2.5 py-1 text-xs font-semibold rounded-lg shadow-sm backdrop-blur-md ${getStatusColors(project.status)}`}
>>>>>>> staging
            >
              {getStatusLabel(project.status)}
            </span>
          </div>
        </div>

        <div className="p-5 flex flex-col flex-1 gap-4">
          {/* Header */}
          <div>
            <h3 className="text-lg font-bold text-slate-900 dark:text-white truncate group-hover:text-primary-600 dark:group-hover:text-primary-400 transition-colors">
              {project.name}
            </h3>
            <div className="flex items-center gap-1.5 mt-1.5 text-sm text-slate-500 dark:text-slate-400">
              <MapPin className="w-3.5 h-3.5" />
              <span className="truncate">{project.location || '위치 미정'}</span>
            </div>
          </div>

          {/* Progress Bar */}
          <div className="space-y-1.5">
            <div className="flex justify-between text-xs font-medium">
              <span className="text-slate-600 dark:text-slate-400">공정률</span>
<<<<<<< HEAD
              <span className="text-primary-600 dark:text-primary-400">{mockProgress}%</span>
=======
              <span className="text-primary-600 dark:text-primary-400">{stableValues.progress}%</span>
>>>>>>> staging
            </div>
            <div className="h-2 w-full bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden">
              <div
                className="h-full bg-primary-500 rounded-full transition-all duration-1000 ease-out"
<<<<<<< HEAD
                style={{ width: `${mockProgress}%` }}
=======
                style={{ width: `${stableValues.progress}%` }}
>>>>>>> staging
              />
            </div>
          </div>

          {/* Details Grid */}
          <div className="grid grid-cols-2 gap-3 pt-2 mt-auto border-t border-slate-100 dark:border-slate-800">
            <div className="space-y-0.5">
              <span className="text-xs text-slate-400 dark:text-slate-500">계약금액</span>
              <div className="flex items-center gap-1.5 text-sm font-medium text-slate-700 dark:text-slate-300">
                <DollarSign className="w-3.5 h-3.5 text-slate-400" />
                {formatCurrency(project.contract_amount)}
              </div>
            </div>
            <div className="space-y-0.5">
              <span className="text-xs text-slate-400 dark:text-slate-500">착공일</span>
              <div className="flex items-center gap-1.5 text-sm font-medium text-slate-700 dark:text-slate-300">
                <Calendar className="w-3.5 h-3.5 text-slate-400" />
                {formatDate(project.start_date)}
              </div>
            </div>
          </div>

          {/* Footer: Team & Client */}
          <div className="flex items-center justify-between pt-2">
            <div className="flex -space-x-2">
              {[...Array(3)].map((_, i) => (
                <div key={i} className="w-7 h-7 rounded-full bg-slate-200 dark:bg-slate-700 border-2 border-white dark:border-slate-900 flex items-center justify-center text-[10px] text-slate-500 font-medium">
                  {String.fromCharCode(65 + i)}
                </div>
              ))}
              <div className="w-7 h-7 rounded-full bg-slate-100 dark:bg-slate-800 border-2 border-white dark:border-slate-900 flex items-center justify-center text-[10px] text-slate-500 font-medium">
<<<<<<< HEAD
                +{mockTeamCount}
=======
                +{stableValues.teamCount}
>>>>>>> staging
              </div>
            </div>

            {project.client && (
              <div className="flex items-center gap-1.5 text-xs text-slate-500 dark:text-slate-400 bg-slate-50 dark:bg-slate-800/50 px-2 py-1 rounded-md">
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
