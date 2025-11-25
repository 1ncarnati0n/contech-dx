'use client';

import Link from 'next/link';
import { Building2, Calendar, DollarSign, MapPin, Users } from 'lucide-react';
import { Card } from '@/components/ui';
import type { Project } from '@/lib/types';

interface ProjectCardProps {
  project: Project;
}

const STATUS_COLORS = {
  planning: 'bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300',
  active: 'bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-300',
  completed: 'bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300',
  on_hold: 'bg-yellow-100 dark:bg-yellow-900/30 text-yellow-700 dark:text-yellow-300',
  cancelled: 'bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-300',
};

const STATUS_LABELS = {
  planning: '기획',
  active: '진행중',
  completed: '완료',
  on_hold: '보류',
  cancelled: '취소',
};

export function ProjectCard({ project }: ProjectCardProps) {
  const formatCurrency = (amount?: number) => {
    if (!amount) return '-';
    return new Intl.NumberFormat('ko-KR', {
      style: 'currency',
      currency: 'KRW',
      notation: 'compact',
      maximumFractionDigits: 1,
    }).format(amount);
  };

  const formatDate = (dateStr: string) => {
    return new Date(dateStr).toLocaleDateString('ko-KR', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    });
  };

  return (
    <Link href={`/projects/${project.id}`}>
      <Card hover className="h-full">
        <div className="p-6 space-y-4">
          {/* Header */}
          <div className="flex items-start justify-between gap-4">
            <div className="flex-1 min-w-0">
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white truncate">
                {project.name}
              </h3>
              {project.description && (
                <p className="mt-1 text-sm text-gray-600 dark:text-gray-400 line-clamp-2">
                  {project.description}
                </p>
              )}
            </div>
            <span
              className={`px-2.5 py-0.5 text-xs font-medium rounded-full whitespace-nowrap ${STATUS_COLORS[project.status]}`}
            >
              {STATUS_LABELS[project.status]}
            </span>
          </div>

          {/* Details Grid */}
          <div className="grid grid-cols-2 gap-3 text-sm">
            {/* Location */}
            {project.location && (
              <div className="flex items-start gap-2">
                <MapPin className="w-4 h-4 text-gray-400 dark:text-gray-500 flex-shrink-0 mt-0.5" />
                <span className="text-gray-700 dark:text-gray-300 line-clamp-2">
                  {project.location}
                </span>
              </div>
            )}

            {/* Client */}
            {project.client && (
              <div className="flex items-start gap-2">
                <Building2 className="w-4 h-4 text-gray-400 dark:text-gray-500 flex-shrink-0 mt-0.5" />
                <span className="text-gray-700 dark:text-gray-300 truncate">
                  {project.client}
                </span>
              </div>
            )}

            {/* Contract Amount */}
            <div className="flex items-center gap-2">
              <DollarSign className="w-4 h-4 text-gray-400 dark:text-gray-500 flex-shrink-0" />
              <span className="text-gray-700 dark:text-gray-300 font-medium">
                {formatCurrency(project.contract_amount)}
              </span>
            </div>

            {/* Dates */}
            <div className="flex items-center gap-2">
              <Calendar className="w-4 h-4 text-gray-400 dark:text-gray-500 flex-shrink-0" />
              <span className="text-gray-700 dark:text-gray-300 truncate">
                {formatDate(project.start_date)}
              </span>
            </div>
          </div>

          {/* Footer */}
          <div className="pt-3 border-t border-gray-200 dark:border-gray-700">
            <div className="flex items-center justify-between text-xs text-gray-500 dark:text-gray-400">
              <div className="flex items-center gap-1">
                <Users className="w-3.5 h-3.5" />
                <span>팀원 -명</span>
              </div>
              <span>
                생성일: {formatDate(project.created_at)}
              </span>
            </div>
          </div>
        </div>
      </Card>
    </Link>
  );
}

