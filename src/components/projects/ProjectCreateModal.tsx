'use client';

import { useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { X } from 'lucide-react';
import { toast } from 'sonner';
import { Button, Card } from '@/components/ui';
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/Form';
import { Input, Textarea } from '@/components/ui/Input';
import { createProject } from '@/lib/services/projects';
import type { ProjectStatus } from '@/lib/types';
import { logger } from '@/lib/utils/logger';

// ============================================
// Zod 스키마 정의
// ============================================
const projectSchema = z.object({
  name: z
    .string()
    .min(1, '프로젝트명을 입력하세요')
    .max(200, '프로젝트명은 200자를 초과할 수 없습니다'),
  description: z
    .string()
    .max(2000, '설명은 2,000자를 초과할 수 없습니다'),
  location: z
    .string()
    .max(200, '위치는 200자를 초과할 수 없습니다'),
  client: z
    .string()
    .max(200, '발주처는 200자를 초과할 수 없습니다'),
  contract_amount: z
    .union([z.number().min(0, '계약금액은 0 이상이어야 합니다'), z.nan()])
    .nullable(),
  start_date: z.string().min(1, '시작일을 선택하세요'),
  end_date: z.string(),
  status: z.enum(['announcement', 'bidding', 'award', 'construction_start', 'completion'] as const),
});

type ProjectFormData = z.infer<typeof projectSchema>;

// ============================================
// Props 타입 정의
// ============================================
interface ProjectCreateModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess?: () => void;
}

// ============================================
// 컴포넌트
// ============================================
export function ProjectCreateModal({
  isOpen,
  onClose,
  onSuccess,
}: ProjectCreateModalProps) {
  const router = useRouter();

  const form = useForm<ProjectFormData>({
    resolver: zodResolver(projectSchema),
    defaultValues: {
      name: '',
      description: '',
      location: '',
      client: '',
      contract_amount: null,
      start_date: new Date().toISOString().split('T')[0],
      end_date: '',
      status: 'announcement',
    },
  });

  const onSubmit = useCallback(async (data: ProjectFormData) => {
    try {
      logger.debug('Creating project:', { name: data.name, status: data.status });

      // 빈 문자열을 undefined로 변환
      const projectData = {
        ...data,
        description: data.description?.trim() || undefined,
        location: data.location?.trim() || undefined,
        client: data.client?.trim() || undefined,
        contract_amount: data.contract_amount && !Number.isNaN(data.contract_amount) ? data.contract_amount : undefined,
        end_date: data.end_date?.trim() || undefined,
      };

      const newProject = await createProject(projectData);

      logger.info('Project created:', newProject.id);

      form.reset();
      onClose();

      if (onSuccess) {
        onSuccess();
      }

      toast.success('프로젝트가 생성되었습니다.');

      router.push(`/projects/${newProject.project_number || newProject.id}`);
      router.refresh();
    } catch (error) {
      logger.error('Failed to create project:', error);
      const errorMessage = error instanceof Error ? error.message : '알 수 없는 오류';

      if (errorMessage.includes('status') || errorMessage.includes('CHECK') || errorMessage.includes('check constraint')) {
        toast.error('데이터베이스 스키마 업데이트 필요', {
          description: '프로젝트 상태 값이 변경되었습니다. Supabase SQL Editor에서 마이그레이션을 실행해주세요.',
          duration: 10000,
        });
      } else {
        toast.error('프로젝트 생성 실패', {
          description: errorMessage || '프로젝트 생성에 실패했습니다. 다시 시도해주세요.',
        });
      }
    }
  }, [form, onClose, onSuccess, router]);

  const handleClose = useCallback(() => {
    if (!form.formState.isSubmitting) {
      form.reset();
      onClose();
    }
  }, [form, onClose]);

  if (!isOpen) return null;

  const isSubmitting = form.formState.isSubmitting;

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
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
              {/* 프로젝트명 */}
              <FormField
                control={form.control}
                name="name"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>
                      프로젝트명 <span className="text-red-500">*</span>
                    </FormLabel>
                    <FormControl>
                      <Input placeholder="예: 서울 강남 오피스 빌딩" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              {/* 설명 */}
              <FormField
                control={form.control}
                name="description"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>설명</FormLabel>
                    <FormControl>
                      <Textarea
                        placeholder="프로젝트 상세 설명"
                        rows={3}
                        className="resize-none"
                        {...field}
                        value={field.value || ''}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              {/* 위치 & 발주처 */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <FormField
                  control={form.control}
                  name="location"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>위치</FormLabel>
                      <FormControl>
                        <Input placeholder="예: 서울 강남구" {...field} value={field.value || ''} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="client"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>발주처</FormLabel>
                      <FormControl>
                        <Input placeholder="예: ABC 건설(주)" {...field} value={field.value || ''} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              {/* 계약금액 */}
              <FormField
                control={form.control}
                name="contract_amount"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>계약금액 (원)</FormLabel>
                    <FormControl>
                      <Input
                        type="number"
                        placeholder="예: 15000000000"
                        {...field}
                        value={field.value ?? ''}
                        onChange={(e) => field.onChange(e.target.value ? Number(e.target.value) : null)}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              {/* 날짜 범위 */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <FormField
                  control={form.control}
                  name="start_date"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>
                        시작일 <span className="text-red-500">*</span>
                      </FormLabel>
                      <FormControl>
                        <Input type="date" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="end_date"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>종료일 (예정)</FormLabel>
                      <FormControl>
                        <Input type="date" {...field} value={field.value || ''} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              {/* 상태 */}
              <FormField
                control={form.control}
                name="status"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>
                      상태 <span className="text-red-500">*</span>
                    </FormLabel>
                    <FormControl>
                      <select
                        {...field}
                        className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                      >
                        <option value="announcement">공모</option>
                        <option value="bidding">입찰</option>
                        <option value="award">수주</option>
                        <option value="construction_start">착공</option>
                        <option value="completion">준공</option>
                      </select>
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              {/* 버튼 */}
              <div className="flex items-center justify-end gap-3 pt-4 border-t border-gray-200 dark:border-gray-700">
                <Button
                  type="button"
                  variant="outline"
                  onClick={handleClose}
                  disabled={isSubmitting}
                >
                  취소
                </Button>
                <Button
                  type="submit"
                  disabled={isSubmitting}
                  loading={isSubmitting}
                >
                  {isSubmitting ? '생성 중...' : '생성'}
                </Button>
              </div>
            </form>
          </Form>
        </div>
      </Card>
    </div>
  );
}

