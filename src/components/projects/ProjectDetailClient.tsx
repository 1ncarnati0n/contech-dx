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
  Edit,
  Trash2,
} from 'lucide-react';
import { Button, Card } from '@/components/ui';
import type { Project } from '@/lib/types';
import { deleteProject } from '@/lib/services/projects';

interface Props {
  project: Project;
}

const STATUS_COLORS = {
  planning: 'bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300',
  active: 'bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-300',
  completed: 'bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300',
  on_hold: 'bg-yellow-100 dark:bg-yellow-900/30 text-yellow-700 dark:text-yellow-300',
  cancelled: 'bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-300',
  dummy: 'bg-purple-100 dark:bg-purple-900/30 text-purple-700 dark:text-purple-300 border-2 border-dashed border-purple-400',
};

const STATUS_LABELS = {
  planning: '기획',
  active: '진행중',
  completed: '완료',
  on_hold: '보류',
  cancelled: '취소',
  dummy: '🧪 테스트',
};

export function ProjectDetailClient({ project }: Props) {
  const router = useRouter();
  const [isDeleting, setIsDeleting] = useState(false);

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
    if (typeof window === 'undefined') return;
    if (!window.confirm('정말 이 프로젝트를 삭제하시겠습니까?')) return;

    try {
      setIsDeleting(true);
      await deleteProject(project.id);
      router.push('/projects');
    } catch (error) {
      console.error('Failed to delete project:', error);
      window.alert('프로젝트 삭제에 실패했습니다.');
    } finally {
      setIsDeleting(false);
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
              <MapPin className="w-5 h-5 text-gray-400 mt-0.5" />
              <div>
                <div className="text-sm text-gray-500 dark:text-gray-400">위치</div>
                <div className="text-gray-900 dark:text-white">{project.location}</div>
              </div>
            </div>
          )}

          {/* Client */}
          {project.client && (
            <div className="flex items-start gap-3">
              <Building2 className="w-5 h-5 text-gray-400 mt-0.5" />
              <div>
                <div className="text-sm text-gray-500 dark:text-gray-400">발주처</div>
                <div className="text-gray-900 dark:text-white">{project.client}</div>
              </div>
            </div>
          )}

          {/* Contract Amount */}
          <div className="flex items-start gap-3">
            <DollarSign className="w-5 h-5 text-gray-400 mt-0.5" />
            <div>
              <div className="text-sm text-gray-500 dark:text-gray-400">계약금액</div>
              <div className="text-gray-900 dark:text-white font-semibold">
                {formatCurrency(project.contract_amount)}
              </div>
            </div>
          </div>

          {/* Dates */}
          <div className="flex items-start gap-3">
            <Calendar className="w-5 h-5 text-gray-400 mt-0.5" />
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

    </div>
  );
}

