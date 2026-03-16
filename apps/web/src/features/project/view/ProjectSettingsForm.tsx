'use client';

import { useEffect, useCallback, useState } from 'react';
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
} from '@/shared/components/ui';
import { toast } from 'sonner';
import { updateProject } from '@/features/project/repository/projects';
import type { Project, UpdateProjectDTO } from '@/shared/types';
import { logger } from '@/shared/utils/logger';
import { SaveStatusBar } from '@/features/building/shared/view/SaveStatusBar';
import { formatKoreanCurrency, parseFormattedNumber, formatWithCommas } from '@/features/project/service/number-formatting.utils';
import { STATUS_OPTIONS } from '@/features/project/service/project.constants';

const projectSettingsSchema = z.object({
  name: z.string().min(1, '프로젝트명을 입력해주세요'),
  description: z.string().optional(),
  location: z.string().optional(),
  client: z.string().optional(),
  contract_amount: z.number().nonnegative('계약금액은 0 이상이어야 합니다').nullable().optional(),
  start_date: z.string().min(1, '시작일을 선택해주세요'),
  end_date: z.string().optional(),
  status: z.enum(['announcement', 'bidding', 'award', 'construction_start', 'completion']),
});

type ProjectSettingsFormValues = z.infer<typeof projectSettingsSchema>;

interface ProjectSettingsFormProps {
  project: Project;
  canEdit: boolean;
  onUpdate: (updated: Project) => void;
}

export function ProjectSettingsForm({ project, canEdit, onUpdate }: ProjectSettingsFormProps) {
  const [isSaving, setIsSaving] = useState(false);

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

  const { isDirty } = form.formState;

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

  // Warn before leaving with unsaved changes
  useEffect(() => {
    const handleBeforeUnload = (e: BeforeUnloadEvent) => {
      if (isDirty) {
        e.preventDefault();
      }
    };

    window.addEventListener('beforeunload', handleBeforeUnload);
    return () => window.removeEventListener('beforeunload', handleBeforeUnload);
  }, [isDirty]);

  const onSubmit = useCallback(async (data: ProjectSettingsFormValues) => {
    setIsSaving(true);
    try {
      const formattedData: UpdateProjectDTO = {
        name: data.name,
        description: data.description?.trim() || undefined,
        location: data.location?.trim() || undefined,
        client: data.client?.trim() || undefined,
        contract_amount:
          data.contract_amount != null && !Number.isNaN(data.contract_amount)
            ? data.contract_amount
            : undefined,
        start_date: data.start_date,
        end_date: data.end_date?.trim() || undefined,
        status: data.status,
      };

      const saved = await updateProject(project.id, formattedData);
      form.reset({
        name: saved.name,
        description: saved.description || '',
        location: saved.location || '',
        client: saved.client || '',
        contract_amount: saved.contract_amount ?? null,
        start_date: saved.start_date.split('T')[0],
        end_date: saved.end_date ? saved.end_date.split('T')[0] : '',
        status: saved.status,
      });
      onUpdate(saved);
    } catch (error) {
      logger.error('Save failed:', error);
      toast.error('저장 실패', {
        description: error instanceof Error ? error.message : '다시 시도해주세요.',
      });
    } finally {
      setIsSaving(false);
    }
  }, [project.id, form, onUpdate]);

  const handleDiscard = useCallback(() => {
    form.reset();
  }, [form]);

  return (
    <div className="space-y-6">
      {/* Save status bar */}
      {canEdit && (
        <SaveStatusBar
          hasUnsavedChanges={isDirty}
          isSaving={isSaving}
          onSave={form.handleSubmit(onSubmit)}
          onDiscard={handleDiscard}
        />
      )}

      <Form {...form}>
        <form className="space-y-8">
          {/* 기본 정보 */}
          <div className="space-y-4">
            <p className="text-xs font-medium text-slate-500 dark:text-slate-400 uppercase tracking-wider">
              기본 정보
            </p>
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
                      className="h-11"
                      {...field}
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
                  <FormLabel>프로젝트 상태 *</FormLabel>
                  <FormControl>
                    <div className="grid grid-cols-2 sm:grid-cols-5 gap-2">
                      {STATUS_OPTIONS.map((option) => {
                        const Icon = option.icon;
                        const isActive = field.value === option.value;
                        return (
                          <button
                            key={option.value}
                            type="button"
                            disabled={!canEdit}
                            onClick={() => canEdit && field.onChange(option.value)}
                            className={`
                              flex flex-col items-center gap-1.5 p-3 rounded-lg border transition-all
                              ${isActive
                                ? `${option.bgColor} border-transparent ring-2 ${option.activeRing}`
                                : 'bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-700 hover:border-slate-300 dark:hover:border-slate-600'
                              }
                              ${!canEdit ? 'cursor-not-allowed opacity-60' : 'cursor-pointer'}
                            `}
                          >
                            <div className={`p-1.5 rounded-md ${option.bgColor}`}>
                              <Icon className={`w-4 h-4 ${option.iconColor}`} />
                            </div>
                            <span className={`text-xs font-medium ${isActive ? 'text-slate-900 dark:text-white' : 'text-slate-600 dark:text-slate-400'}`}>
                              {option.label}
                            </span>
                          </button>
                        );
                      })}
                    </div>
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
          </div>

          {/* 계약 정보 */}
          <div className="space-y-4">
            <p className="text-xs font-medium text-slate-500 dark:text-slate-400 uppercase tracking-wider">
              계약 정보
            </p>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
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
                        className="h-11"
                        {...field}
                        value={field.value || ''}
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
                    <FormLabel>계약금액</FormLabel>
                    <FormControl>
                      <div className="space-y-2">
                        <div className="relative">
                          <Input
                            type="text"
                            inputMode="numeric"
                            placeholder="0"
                            disabled={!canEdit}
                            className="h-11 pr-8"
                            value={formatWithCommas(field.value)}
                            onChange={(e) => {
                              const parsed = parseFormattedNumber(e.target.value);
                              field.onChange(parsed);
                            }}
                          />
                          <span className="absolute right-3 top-1/2 -translate-y-1/2 text-sm text-zinc-400 dark:text-zinc-500">
                            원
                          </span>
                        </div>
                        {field.value != null && field.value > 0 && (
                          <div className="flex items-center gap-2 px-3 py-2 bg-zinc-50 dark:bg-zinc-800/50 rounded-lg border border-zinc-200 dark:border-zinc-700">
                            <span className="text-xs text-zinc-500 dark:text-zinc-400">읽기:</span>
                            <span className="text-sm font-medium text-zinc-700 dark:text-zinc-300">
                              {formatKoreanCurrency(field.value)}
                            </span>
                          </div>
                        )}
                      </div>
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
                  <FormLabel>현장 위치</FormLabel>
                  <FormControl>
                    <Input
                      placeholder="현장 위치 입력"
                      disabled={!canEdit}
                      className="h-11"
                      {...field}
                      value={field.value || ''}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
          </div>

          {/* 일정 */}
          <div className="space-y-4">
            <p className="text-xs font-medium text-slate-500 dark:text-slate-400 uppercase tracking-wider">
              일정
            </p>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
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
                        className="h-11"
                        {...field}
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
                        className="h-11"
                        {...field}
                        value={field.value || ''}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>
          </div>

          {/* 설명 */}
          <div className="space-y-4">
            <p className="text-xs font-medium text-slate-500 dark:text-slate-400 uppercase tracking-wider">
              추가 정보
            </p>
            <FormField
              control={form.control}
              name="description"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>프로젝트 설명</FormLabel>
                  <FormControl>
                    <Textarea
                      placeholder="프로젝트에 대한 설명을 입력하세요"
                      className="resize-none min-h-[120px] leading-relaxed"
                      disabled={!canEdit}
                      {...field}
                      value={field.value || ''}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
          </div>
        </form>
      </Form>
    </div>
  );
}
