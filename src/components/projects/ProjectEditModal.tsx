'use client';

import { useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogFooter,
    Form,
    FormControl,
    FormField,
    FormItem,
    FormLabel,
    FormMessage,
    Input,
    Button,
    Textarea,
} from '@/components/ui';
import { toast } from 'sonner';
import { updateProject } from '@/lib/services/projects';
import type { Project } from '@/lib/types';
import { logger } from '@/lib/utils/logger';

const projectSchema = z.object({
    name: z.string().min(1, '프로젝트명을 입력해주세요'),
    description: z.string(),
    status: z.enum(['announcement', 'bidding', 'award', 'construction_start', 'completion']),
    location: z.string().optional(),
    client: z.string().optional(),
    contract_amount: z.number().optional(),
    start_date: z.string().min(1, '시작일을 선택해주세요'),
    end_date: z.string(),
});

type ProjectFormValues = z.infer<typeof projectSchema>;

interface Props {
    project: Project;
    isOpen: boolean;
    onClose: () => void;
    onUpdate: () => void;
}

export function ProjectEditModal({ project, isOpen, onClose, onUpdate }: Props) {
    const form = useForm<ProjectFormValues>({
        resolver: zodResolver(projectSchema),
        defaultValues: {
            name: project.name,
            description: project.description || '',
            status: project.status,
            location: project.location || '',
            client: project.client || '',
            contract_amount: project.contract_amount ?? undefined,
            start_date: project.start_date.split('T')[0],
            end_date: project.end_date ? project.end_date.split('T')[0] : '',
        },
    });

    // Reset form when project changes or modal opens
    useEffect(() => {
        if (isOpen) {
            form.reset({
                name: project.name,
                description: project.description || '',
                status: project.status,
                location: project.location || '',
                client: project.client || '',
                contract_amount: project.contract_amount ?? undefined,
                start_date: project.start_date.split('T')[0],
                end_date: project.end_date ? project.end_date.split('T')[0] : '',
            });
        }
    }, [project, isOpen, form]);

    const onSubmit = async (data: ProjectFormValues) => {
        logger.debug('Submitting project update:', data);
        try {
            // 빈 문자열을 undefined로, NaN을 undefined로 변환
            const formattedData = {
                ...data,
                description: data.description?.trim() || undefined,
                location: data.location?.trim() || undefined,
                client: data.client?.trim() || undefined,
                contract_amount: data.contract_amount && !Number.isNaN(data.contract_amount) ? data.contract_amount : undefined,
                end_date: data.end_date?.trim() || undefined,
            };

            await updateProject(project.id, formattedData);
            toast.success('프로젝트가 수정되었습니다.');
            onUpdate();
            onClose();
        } catch (error: unknown) {
            logger.error('Failed to update project:', error);
            const errorMessage = error instanceof Error ? error.message : '프로젝트 정보를 수정하는 중 오류가 발생했습니다.';
            toast.error('프로젝트 수정 실패', {
                description: errorMessage,
            });
        }
    };

    return (
        <Dialog open={isOpen} onOpenChange={onClose}>
            <DialogContent className="sm:max-w-[600px] max-h-[90vh] overflow-y-auto">
                <DialogHeader>
                    <DialogTitle>프로젝트 수정</DialogTitle>
                </DialogHeader>

                <Form {...form}>
                    <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
                        <FormField
                            control={form.control}
                            name="name"
                            render={({ field }) => (
                                <FormItem>
                                    <FormLabel>프로젝트명</FormLabel>
                                    <FormControl>
                                        <Input placeholder="프로젝트명 입력" {...field} />
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
                                    <FormLabel>상태</FormLabel>
                                    <FormControl>
                                        <select
                                            className="flex h-10 w-full items-center justify-between rounded-md border border-slate-200 bg-white px-3 py-2 text-sm ring-offset-white placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-slate-950 focus:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 dark:border-slate-800 dark:bg-slate-950 dark:ring-offset-slate-950 dark:placeholder:text-slate-400 dark:focus:ring-slate-300"
                                            {...field}
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

                        <div className="grid grid-cols-2 gap-4">
                            <FormField
                                control={form.control}
                                name="client"
                                render={({ field }) => (
                                    <FormItem>
                                        <FormLabel>발주처</FormLabel>
                                        <FormControl>
                                            <Input placeholder="발주처 입력" {...field} />
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
                                            <Input
                                                type="number"
                                                placeholder="0"
                                                {...field}
                                                value={field.value ?? ''}
                                                onChange={(e) => field.onChange(e.target.value ? Number(e.target.value) : null)}
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
                                        <Input placeholder="현장 위치 입력" {...field} />
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
                                        <FormLabel>시작일</FormLabel>
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
                                        <FormLabel>종료일</FormLabel>
                                        <FormControl>
                                            <Input type="date" {...field} />
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
                                            {...field}
                                        />
                                    </FormControl>
                                    <FormMessage />
                                </FormItem>
                            )}
                        />

                        <DialogFooter>
                            <Button type="button" variant="outline" onClick={onClose}>
                                취소
                            </Button>
                            <Button type="submit" disabled={form.formState.isSubmitting}>
                                {form.formState.isSubmitting ? '수정 중...' : '수정 완료'}
                            </Button>
                        </DialogFooter>
                    </form>
                </Form>
            </DialogContent>
        </Dialog>
    );
}
