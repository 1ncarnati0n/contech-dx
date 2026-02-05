'use client';

import { useEffect, useState, useCallback } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
  Input,
  Textarea,
} from '@/components/ui';
import { toast } from 'sonner';
import { updateProject } from '@/lib/services/projects';
import type { Project, UpdateProjectDTO } from '@/lib/types';
import { logger } from '@/lib/utils/logger';
import { CheckCircle2, Loader2 } from 'lucide-react';

const projectSettingsSchema = z.object({
  name: z.string().min(1, '프로젝트명을 입력해주세요'),
  description: z.string().optional(),
  location: z.string().optional(),
  client: z.string().optional(),
  contract_amount: z.number().positive('계약금액은 양수여야 합니다').optional().nullable(),
  start_date: z.string().min(1, '시작일을 선택해주세요'),
  end_date: z.string().optional(),
  status: z.enum(['announcement', 'bidding', 'award', 'construction_start', 'completion']),
});

type ProjectSettingsFormValues = z.infer<typeof projectSettingsSchema>;

interface ProjectSettingsFormProps {
  project: Project;
  canEdit: boolean;
  onUpdate: () => void;
}

export function ProjectSettingsForm({ project, canEdit, onUpdate }: ProjectSettingsFormProps) {
  const [isSaving, setIsSaving] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);
  const [saveTimeout, setSaveTimeout] = useState<NodeJS.Timeout | null>(null);

  const form = useForm<ProjectSettingsFormValues>({
    resolver: zodResolver(projectSettingsSchema),
    defaultValues: {
      name: project.name,
      description: project.description || '',
      location: project.location || '',
      client: project.client || '',
      contract_amount: project.contract_amount ?? null,
      start_date: project.start_date.split('T')[0],
      end_date: project.end_date ? project.end_date.split('T')[0] : '',
      status: project.status,
    },
  });

  // Reset form when project changes
  useEffect(() => {
    form.reset({
      name: project.name,
      description: project.description || '',
      location: project.location || '',
      client: project.client || '',
      contract_amount: project.contract_amount ?? null,
      start_date: project.start_date.split('T')[0],
      end_date: project.end_date ? project.end_date.split('T')[0] : '',
      status: project.status,
    });
  }, [project, form]);

  // Cleanup timeout on unmount
  useEffect(() => {
    return () => {
      if (saveTimeout) {
        clearTimeout(saveTimeout);
      }
    };
  }, [saveTimeout]);

  const handleAutoSave = useCallback(
    async (data: ProjectSettingsFormValues) => {
      if (!canEdit) return;

      // Clear any existing timeout
      if (saveTimeout) {
        clearTimeout(saveTimeout);
      }

      // Set new timeout for debounced save
      const timeout = setTimeout(async () => {
        setIsSaving(true);
        setSaveSuccess(false);

        try {
          // Format data before sending
          const formattedData: UpdateProjectDTO = {
            name: data.name,
            description: data.description?.trim() || undefined,
            location: data.location?.trim() || undefined,
            client: data.client?.trim() || undefined,
            contract_amount: data.contract_amount && !Number.isNaN(data.contract_amount)
              ? data.contract_amount
              : undefined,
            start_date: data.start_date,
            end_date: data.end_date?.trim() || undefined,
            status: data.status,
          };

          await updateProject(project.id, formattedData);

          setSaveSuccess(true);
          onUpdate();

          // Hide success indicator after 2 seconds
          setTimeout(() => {
            setSaveSuccess(false);
          }, 2000);
        } catch (error) {
          logger.error('Auto-save failed:', error);
          toast.error('저장 실패', {
            description: error instanceof Error ? error.message : '다시 시도해주세요.',
          });
          // Revert to original values on error
          form.reset({
            name: project.name,
            description: project.description || '',
            location: project.location || '',
            client: project.client || '',
            contract_amount: project.contract_amount ?? null,
            start_date: project.start_date.split('T')[0],
            end_date: project.end_date ? project.end_date.split('T')[0] : '',
            status: project.status,
          });
        } finally {
          setIsSaving(false);
        }
      }, 500); // 500ms debounce

      setSaveTimeout(timeout);
    },
    [canEdit, project, saveTimeout, onUpdate, form]
  );

  const handleFieldBlur = () => {
    if (!canEdit) return;

    const values = form.getValues();
    const isValid = form.formState.isValid;

    if (isValid) {
      handleAutoSave(values);
    }
  };

  const getStatusBadgeColor = (status: string) => {
    switch (status) {
      case 'announcement':
        return 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400';
      case 'bidding':
        return 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400';
      case 'award':
        return 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400';
      case 'construction_start':
        return 'bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400';
      case 'completion':
        return 'bg-gray-100 text-gray-700 dark:bg-gray-900/30 dark:text-gray-400';
      default:
        return 'bg-gray-100 text-gray-700 dark:bg-gray-900/30 dark:text-gray-400';
    }
  };

  const getStatusLabel = (status: string) => {
    switch (status) {
      case 'announcement': return '공모';
      case 'bidding': return '입찰';
      case 'award': return '수주';
      case 'construction_start': return '착공';
      case 'completion': return '준공';
      default: return status;
    }
  };

  return (
    <div className="space-y-6">
      {/* Save indicator */}
      {canEdit && (
        <div className="flex items-center gap-2 text-sm">
          {isSaving && (
            <>
              <Loader2 className="w-4 h-4 animate-spin text-blue-600" />
              <span className="text-zinc-600 dark:text-zinc-400">저장 중...</span>
            </>
          )}
          {saveSuccess && (
            <>
              <CheckCircle2 className="w-4 h-4 text-green-600" />
              <span className="text-green-600 dark:text-green-400">저장됨</span>
            </>
          )}
        </div>
      )}

      <Form {...form}>
        <form className="space-y-6">
          <FormField
            control={form.control}
            name="name"
            render={({ field }) => (
              <FormItem>
                <FormLabel>프로젝트명 *</FormLabel>
                <FormControl>
                  <Input
                    placeholder="프로젝트명 입력"
                    disabled={!canEdit}
                    {...field}
                    onBlur={handleFieldBlur}
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="status"
            render={({ field }) => (
              <FormItem>
                <FormLabel>상태 *</FormLabel>
                <FormControl>
                  <div className="space-y-2">
                    <select
                      className="flex h-10 w-full items-center justify-between rounded-md border border-slate-200 bg-white px-3 py-2 text-sm ring-offset-white placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-slate-950 focus:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 dark:border-slate-800 dark:bg-slate-950 dark:ring-offset-slate-950 dark:placeholder:text-slate-400 dark:focus:ring-slate-300"
                      disabled={!canEdit}
                      {...field}
                      onBlur={handleFieldBlur}
                    >
                      <option value="announcement">공모</option>
                      <option value="bidding">입찰</option>
                      <option value="award">수주</option>
                      <option value="construction_start">착공</option>
                      <option value="completion">준공</option>
                    </select>
                    <div className="flex items-center gap-2">
                      <span className="text-xs text-zinc-500">현재 상태:</span>
                      <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${getStatusBadgeColor(field.value)}`}>
                        {getStatusLabel(field.value)}
                      </span>
                    </div>
                  </div>
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          <div className="grid grid-cols-2 gap-4">
            <FormField
              control={form.control}
              name="client"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>발주처</FormLabel>
                  <FormControl>
                    <Input
                      placeholder="발주처 입력"
                      disabled={!canEdit}
                      {...field}
                      value={field.value || ''}
                      onBlur={handleFieldBlur}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="contract_amount"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>계약금액 (원)</FormLabel>
                  <FormControl>
                    <Input
                      type="number"
                      placeholder="0"
                      disabled={!canEdit}
                      {...field}
                      value={field.value ?? ''}
                      onChange={(e) => field.onChange(e.target.value ? Number(e.target.value) : null)}
                      onBlur={handleFieldBlur}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
          </div>

          <FormField
            control={form.control}
            name="location"
            render={({ field }) => (
              <FormItem>
                <FormLabel>위치</FormLabel>
                <FormControl>
                  <Input
                    placeholder="현장 위치 입력"
                    disabled={!canEdit}
                    {...field}
                    value={field.value || ''}
                    onBlur={handleFieldBlur}
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          <div className="grid grid-cols-2 gap-4">
            <FormField
              control={form.control}
              name="start_date"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>시작일 *</FormLabel>
                  <FormControl>
                    <Input
                      type="date"
                      disabled={!canEdit}
                      {...field}
                      onBlur={handleFieldBlur}
                    />
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
                  <FormLabel>종료일</FormLabel>
                  <FormControl>
                    <Input
                      type="date"
                      disabled={!canEdit}
                      {...field}
                      value={field.value || ''}
                      onBlur={handleFieldBlur}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
          </div>

          <FormField
            control={form.control}
            name="description"
            render={({ field }) => (
              <FormItem>
                <FormLabel>설명</FormLabel>
                <FormControl>
                  <Textarea
                    placeholder="프로젝트에 대한 설명을 입력하세요"
                    className="resize-none h-24"
                    disabled={!canEdit}
                    {...field}
                    value={field.value || ''}
                    onBlur={handleFieldBlur}
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
        </form>
      </Form>
    </div>
  );
}
