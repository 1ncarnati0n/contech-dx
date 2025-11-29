'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useForm } from 'react-hook-form';
import { X, Loader2 } from 'lucide-react';
import { Button, Card } from '@/components/ui';
import { createProject } from '@/lib/services/projects';
import type { ProjectStatus } from '@/lib/types';
import { logger } from '@/lib/utils/logger';

interface ProjectFormData {
  name: string;
  description?: string;
  location?: string;
  client?: string;
  contract_amount?: number;
  start_date: string;
  end_date?: string;
  status: ProjectStatus;
}

interface ProjectCreateModalProps {
  isOpen: boolean;
  onClose: () => void;
  isAdmin?: boolean;
  onSuccess?: () => void;
}

export function ProjectCreateModal({
  isOpen,
  onClose,
  isAdmin = false,
  onSuccess,
}: ProjectCreateModalProps) {
  const router = useRouter();
  const [isSubmitting, setIsSubmitting] = useState(false);

  const {
    register,
    handleSubmit,
    formState: { errors },
    reset,
  } = useForm<ProjectFormData>({
    defaultValues: {
      status: 'planning',
      start_date: new Date().toISOString().split('T')[0],
    },
  });

  if (!isOpen) return null;

  const onSubmit = async (data: ProjectFormData) => {
    try {
      setIsSubmitting(true);

      // Clean data: Convert empty strings to undefined
      const cleanedData = {
        ...data,
        description: data.description?.trim() || undefined,
        location: data.location?.trim() || undefined,
        client: data.client?.trim() || undefined,
        contract_amount: data.contract_amount || undefined,
        end_date: data.end_date?.trim() || undefined, // Empty string → undefined
      };

      logger.debug('📝 Creating project with cleaned data:', cleanedData);

      // Create project
      const newProject = await createProject(cleanedData);

      logger.info('✅ Project created:', newProject.id);

      // Reset form
      reset();

      // Close modal
      onClose();

      // Call success callback
      if (onSuccess) {
        onSuccess();
      }

      // Navigate to project detail
      router.push(`/projects/${newProject.project_number || newProject.id}`);
      router.refresh();
    } catch (error) {
      logger.error('Failed to create project:', error);
      if (typeof window !== 'undefined') {
        window.alert('프로젝트 생성에 실패했습니다.');
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleClose = () => {
    if (!isSubmitting) {
      reset();
      onClose();
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
      <Card className="w-full max-w-2xl max-h-[90vh] overflow-y-auto">
        <div className="p-6 space-y-6">
          {/* Header */}
          <div className="flex items-center justify-between">
            <h2 className="text-2xl font-bold text-gray-900 dark:text-white">
              새 프로젝트 생성
            </h2>
            <button
              onClick={handleClose}
              disabled={isSubmitting}
              className="p-2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors disabled:opacity-50"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Form */}
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
            {/* Project Name */}
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                프로젝트명 <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                {...register('name', { required: '프로젝트명을 입력하세요' })}
                className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="예: 서울 강남 오피스 빌딩"
              />
              {errors.name && (
                <p className="mt-1 text-sm text-red-500">{errors.name.message}</p>
              )}
            </div>

            {/* Description */}
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                설명
              </label>
              <textarea
                {...register('description')}
                rows={3}
                className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
                placeholder="프로젝트 상세 설명"
              />
            </div>

            {/* Location & Client */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* Location */}
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  위치
                </label>
                <input
                  type="text"
                  {...register('location')}
                  className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="예: 서울 강남구"
                />
              </div>

              {/* Client */}
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  클라이언트
                </label>
                <input
                  type="text"
                  {...register('client')}
                  className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="예: ABC 건설(주)"
                />
              </div>
            </div>

            {/* Contract Amount */}
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                계약금액 (원)
              </label>
              <input
                type="number"
                {...register('contract_amount', { valueAsNumber: true })}
                className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="예: 15000000000"
              />
            </div>

            {/* Date Range */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* Start Date */}
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  시작일 <span className="text-red-500">*</span>
                </label>
                <input
                  type="date"
                  {...register('start_date', { required: '시작일을 선택하세요' })}
                  className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
                {errors.start_date && (
                  <p className="mt-1 text-sm text-red-500">{errors.start_date.message}</p>
                )}
              </div>

              {/* End Date */}
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  종료일 (예정)
                </label>
                <input
                  type="date"
                  {...register('end_date')}
                  className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
            </div>

            {/* Status */}
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                상태 <span className="text-red-500">*</span>
              </label>
              <select
                {...register('status', { required: true })}
                className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="planning">기획</option>
                <option value="active">진행중</option>
                <option value="completed">완료</option>
                <option value="on_hold">보류</option>
                <option value="cancelled">취소</option>
                {isAdmin && (
                  <option value="dummy">🧪 테스트 (관리자 전용)</option>
                )}
              </select>
            </div>

            {/* Buttons */}
            <div className="flex items-center justify-end gap-3 pt-4 border-t border-gray-200 dark:border-gray-700">
              <Button
                type="button"
                variant="outline"
                onClick={handleClose}
                disabled={isSubmitting}
              >
                취소
              </Button>
              <Button type="submit" disabled={isSubmitting} className="gap-2">
                {isSubmitting && <Loader2 className="w-4 h-4 animate-spin" />}
                {isSubmitting ? '생성 중...' : '생성'}
              </Button>
            </div>
          </form>
        </div>
      </Card>
    </div>
  );
}

