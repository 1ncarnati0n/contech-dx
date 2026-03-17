'use client';

import {
  Calendar,
  DollarSign,
  MapPin,
  Building2,
} from 'lucide-react';
import { Card } from '@/shared/components/ui';
import type { Project } from '@/shared/types';
import { ConstructionDashboard } from '@/features/dashboard/view/ConstructionDashboard';
import { formatCurrency, formatDate, getStatusLabel, getStatusColors } from '@/shared/utils/index';

interface Props {
  project: Project;
}

export function ProjectOverview({ project }: Props) {
  return (
    <div className="space-y-6">
      {/* Status Badge */}
      <div className="-mt-4 mb-2">
        <span className={`px-3 py-1 text-sm font-medium rounded-full ${getStatusColors(project.status)}`}>
          {getStatusLabel(project.status)}
        </span>
      </div>

      {/* Project Info Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card className="p-4 flex items-start gap-3">
          <div className="p-2 bg-accent-50 dark:bg-accent-900/20 rounded-lg">
            <MapPin className="w-5 h-5 text-accent-600 dark:text-accent-400" />
          </div>
          <div>
            <div className="text-xs font-medium text-zinc-500 dark:text-zinc-400 mb-1">위치</div>
            <div className="text-sm font-semibold text-zinc-900 dark:text-white break-words">
              {project.location || '-'}
            </div>
          </div>
        </Card>

        <Card className="p-4 flex items-start gap-3">
          <div className="p-2 bg-zinc-100 dark:bg-zinc-800 rounded-lg">
            <Building2 className="w-5 h-5 text-zinc-600 dark:text-zinc-400" />
          </div>
          <div>
            <div className="text-xs font-medium text-zinc-500 dark:text-zinc-400 mb-1">발주처</div>
            <div className="text-sm font-semibold text-zinc-900 dark:text-white truncate">
              {project.client || '-'}
            </div>
          </div>
        </Card>

        <Card className="p-4 flex items-start gap-3">
          <div className="p-2 bg-success-50 dark:bg-success-900/20 rounded-lg">
            <DollarSign className="w-5 h-5 text-success-600 dark:text-success-400" />
          </div>
          <div>
            <div className="text-xs font-medium text-zinc-500 dark:text-zinc-400 mb-1">계약금액</div>
            <div className="text-sm font-semibold text-zinc-900 dark:text-white">
              {formatCurrency(project.contract_amount, { notation: 'standard' })}
            </div>
          </div>
        </Card>

        <Card className="p-4 flex items-start gap-3">
          <div className="p-2 bg-admin-50 dark:bg-admin-900/20 rounded-lg">
            <Calendar className="w-5 h-5 text-admin-600 dark:text-admin-400" />
          </div>
          <div>
            <div className="text-xs font-medium text-zinc-500 dark:text-zinc-400 mb-1">공사기간</div>
            <div className="text-sm font-semibold text-zinc-900 dark:text-white">
              {formatDate(project.start_date, 'long')}
              {project.end_date && (
                <>
                  {' ~ '}
                  {formatDate(project.end_date, 'long')}
                </>
              )}
            </div>
          </div>
        </Card>
      </div>

      {/* Construction Dashboard */}
      <ConstructionDashboard projectId={project.id} />
    </div>
  );
}
