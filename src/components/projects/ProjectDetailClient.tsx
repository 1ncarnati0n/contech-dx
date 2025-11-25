'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import {
  ArrowLeft,
  Calendar,
  DollarSign,
  MapPin,
  Building2,
  Plus,
  GanttChart as GanttChartIcon,
  Edit,
  Trash2,
} from 'lucide-react';
import { Button, Card } from '@/components/ui';
import type { Project } from '@/lib/types';
import type { GanttChart } from '@/lib/services/ganttCharts';
import { deleteProject } from '@/lib/services/projects';
import { createGanttChart } from '@/lib/services/ganttCharts';

interface Props {
  project: Project;
  ganttCharts: GanttChart[];
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

export function ProjectDetailClient({ project, ganttCharts: initialCharts }: Props) {
  const router = useRouter();
  const [ganttCharts, setGanttCharts] = useState(initialCharts);
  const [isDeleting, setIsDeleting] = useState(false);
  const [isCreating, setIsCreating] = useState(false);

  const formatCurrency = (amount?: number) => {
    if (!amount) return '-';
    return new Intl.NumberFormat('ko-KR', {
      style: 'currency',
      currency: 'KRW',
      maximumFractionDigits: 0,
    }).format(amount);
  };

  const formatDate = (dateStr: string) => {
    return new Date(dateStr).toLocaleDateString('ko-KR', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    });
  };

  const handleDelete = async () => {
    if (!confirm('정말 이 프로젝트를 삭제하시겠습니까?')) return;

    try {
      setIsDeleting(true);
      await deleteProject(project.id);
      router.push('/projects');
    } catch (error) {
      console.error('Failed to delete project:', error);
      alert('프로젝트 삭제에 실패했습니다.');
    } finally {
      setIsDeleting(false);
    }
  };

  const handleCreateGanttChart = async () => {
    const name = prompt('Gantt 차트 이름을 입력하세요:');
    if (!name) return;

    try {
      setIsCreating(true);
      const newChart = await createGanttChart({
        project_id: project.id,
        name,
        start_date: project.start_date,
        end_date: project.end_date || undefined,
      });
      setGanttCharts([newChart, ...ganttCharts]);
      router.push(`/projects/${project.id}/gantt/${newChart.id}`);
    } catch (error) {
      console.error('Failed to create gantt chart:', error);
      alert('Gantt 차트 생성에 실패했습니다.');
    } finally {
      setIsCreating(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Back Button */}
      <Link
        href="/projects"
        className="inline-flex items-center gap-2 text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white transition-colors"
      >
        <ArrowLeft className="w-4 h-4" />
        프로젝트 목록으로
      </Link>

      {/* Header */}
      <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-center justify-between">
        <div>
          <div className="flex items-center gap-3 mb-2">
            <h1 className="text-3xl font-bold text-gray-900 dark:text-white">
              {project.name}
            </h1>
            <span
              className={`px-3 py-1 text-sm font-medium rounded-full ${STATUS_COLORS[project.status]}`}
            >
              {STATUS_LABELS[project.status]}
            </span>
          </div>
          {project.description && (
            <p className="text-gray-600 dark:text-gray-400">{project.description}</p>
          )}
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" className="gap-2">
            <Edit className="w-4 h-4" />
            수정
          </Button>
          <Button
            variant="outline"
            size="sm"
            className="gap-2 text-red-600 hover:text-red-700 hover:bg-red-50 dark:hover:bg-red-900/20"
            onClick={handleDelete}
            disabled={isDeleting}
          >
            <Trash2 className="w-4 h-4" />
            {isDeleting ? '삭제 중...' : '삭제'}
          </Button>
        </div>
      </div>

      {/* Project Info */}
      <Card className="p-6">
        <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
          프로젝트 정보
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Location */}
          {project.location && (
            <div className="flex items-start gap-3">
              <MapPin className="w-5 h-5 text-gray-400 flex-shrink-0 mt-0.5" />
              <div>
                <div className="text-sm text-gray-500 dark:text-gray-400">위치</div>
                <div className="text-gray-900 dark:text-white">{project.location}</div>
              </div>
            </div>
          )}

          {/* Client */}
          {project.client && (
            <div className="flex items-start gap-3">
              <Building2 className="w-5 h-5 text-gray-400 flex-shrink-0 mt-0.5" />
              <div>
                <div className="text-sm text-gray-500 dark:text-gray-400">발주처</div>
                <div className="text-gray-900 dark:text-white">{project.client}</div>
              </div>
            </div>
          )}

          {/* Contract Amount */}
          <div className="flex items-start gap-3">
            <DollarSign className="w-5 h-5 text-gray-400 flex-shrink-0 mt-0.5" />
            <div>
              <div className="text-sm text-gray-500 dark:text-gray-400">계약금액</div>
              <div className="text-gray-900 dark:text-white font-semibold">
                {formatCurrency(project.contract_amount)}
              </div>
            </div>
          </div>

          {/* Dates */}
          <div className="flex items-start gap-3">
            <Calendar className="w-5 h-5 text-gray-400 flex-shrink-0 mt-0.5" />
            <div>
              <div className="text-sm text-gray-500 dark:text-gray-400">공사기간</div>
              <div className="text-gray-900 dark:text-white">
                {formatDate(project.start_date)}
                {project.end_date && (
                  <>
                    <span className="mx-2 text-gray-400">~</span>
                    {formatDate(project.end_date)}
                  </>
                )}
              </div>
            </div>
          </div>
        </div>
      </Card>

      {/* Gantt Charts */}
      <Card className="p-6">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-semibold text-gray-900 dark:text-white">
            Gantt 차트 ({ganttCharts.length})
          </h2>
          <Button
            onClick={handleCreateGanttChart}
            disabled={isCreating}
            size="sm"
            className="gap-2"
          >
            <Plus className="w-4 h-4" />
            {isCreating ? '생성 중...' : '새 차트'}
          </Button>
        </div>

        {ganttCharts.length === 0 ? (
          <div className="text-center py-12 border-2 border-dashed border-gray-300 dark:border-gray-700 rounded-lg">
            <GanttChartIcon className="w-12 h-12 text-gray-400 mx-auto mb-3" />
            <p className="text-gray-600 dark:text-gray-400 mb-4">
              아직 Gantt 차트가 없습니다
            </p>
            <Button onClick={handleCreateGanttChart} disabled={isCreating} size="sm">
              첫 Gantt 차트 만들기
            </Button>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {ganttCharts.map((chart) => (
              <Link
                key={chart.id}
                href={`/projects/${project.id}/gantt/${chart.id}`}
                className="block p-4 border border-gray-200 dark:border-gray-700 rounded-lg hover:border-blue-500 dark:hover:border-blue-500 hover:shadow-md transition-all"
              >
                <div className="flex items-start gap-3">
                  <GanttChartIcon className="w-5 h-5 text-blue-600 dark:text-blue-400 flex-shrink-0 mt-0.5" />
                  <div className="flex-1 min-w-0">
                    <h3 className="font-medium text-gray-900 dark:text-white truncate">
                      {chart.name}
                    </h3>
                    {chart.description && (
                      <p className="text-sm text-gray-600 dark:text-gray-400 line-clamp-2 mt-1">
                        {chart.description}
                      </p>
                    )}
                    <p className="text-xs text-gray-500 dark:text-gray-500 mt-2">
                      생성일: {new Date(chart.created_at).toLocaleDateString('ko-KR')}
                    </p>
                  </div>
                </div>
              </Link>
            ))}
          </div>
        )}
      </Card>
    </div>
  );
}

