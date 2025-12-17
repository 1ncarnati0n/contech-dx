'use client';

import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { createClient } from '@/lib/supabase/client';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';
import { Button } from '@/components/ui';
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/Form';
import { Input, Textarea } from '@/components/ui/Input';
import MarkdownRenderer from '@/components/common/MarkdownRenderer';

// ============================================
// Zod 스키마 정의
// ============================================
const postSchema = z.object({
  title: z
    .string()
    .min(1, '제목을 입력해주세요')
    .min(2, '제목은 최소 2자 이상이어야 합니다')
    .max(200, '제목은 200자를 초과할 수 없습니다'),
  content: z
    .string()
    .min(1, '내용을 입력해주세요')
    .min(10, '내용은 최소 10자 이상이어야 합니다')
    .max(10000, '내용은 10,000자를 초과할 수 없습니다'),
});

type PostFormValues = z.infer<typeof postSchema>;

// ============================================
// Props 타입 정의
// ============================================
interface PostFormProps {
  initialData?: {
    id: string;
    title: string;
    content: string;
  };
  mode: 'create' | 'edit';
}

// ============================================
// 컴포넌트
// ============================================
export default function PostForm({ initialData, mode }: PostFormProps) {
  const router = useRouter();
  const supabase = createClient();
  const [activeTab, setActiveTab] = useState<'write' | 'preview'>('write');

  const form = useForm<PostFormValues>({
    resolver: zodResolver(postSchema),
    defaultValues: {
      title: initialData?.title || '',
      content: initialData?.content || '',
    },
  });

  const onSubmit = async (data: PostFormValues) => {
    try {
      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (!user) {
        toast.error('로그인이 필요합니다.');
        router.push('/login');
        return;
      }

      if (mode === 'create') {
        const { data: post, error } = await supabase
          .from('posts')
          .insert({
            title: data.title,
            content: data.content,
            author_id: user.id,
          })
          .select()
          .single();

        if (error) {
          toast.error('게시글 작성 실패', { description: error.message });
          return;
        }

        toast.success('게시글이 작성되었습니다.');
        router.push(`/posts/${post.id}`);
      } else {
        const { error } = await supabase
          .from('posts')
          .update({
            title: data.title,
            content: data.content,
          })
          .eq('id', initialData!.id)
          .eq('author_id', user.id);

        if (error) {
          toast.error('게시글 수정 실패', { description: error.message });
          return;
        }

        toast.success('게시글이 수정되었습니다.');
        router.push(`/posts/${initialData!.id}`);
      }

      router.refresh();
    } catch {
      toast.error('게시글 저장 중 오류가 발생했습니다.');
    }
  };

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
        <FormField
          control={form.control}
          name="title"
          render={({ field }) => (
            <FormItem>
              <FormLabel>제목</FormLabel>
              <FormControl>
                <Input placeholder="게시글 제목을 입력하세요" {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="content"
          render={({ field }) => (
            <FormItem>
              <FormLabel>내용</FormLabel>
              {/* Write/Preview 탭 */}
              <div className="border border-zinc-200 dark:border-zinc-700 rounded-lg overflow-hidden">
                <div className="flex border-b border-zinc-200 dark:border-zinc-700 bg-zinc-50 dark:bg-zinc-800/50">
                  <button
                    type="button"
                    onClick={() => setActiveTab('write')}
                    className={`px-4 py-2 text-sm font-medium transition-colors ${
                      activeTab === 'write'
                        ? 'text-zinc-900 dark:text-white bg-white dark:bg-zinc-900 border-b-2 border-cyan-500'
                        : 'text-zinc-500 dark:text-zinc-400 hover:text-zinc-700 dark:hover:text-zinc-300'
                    }`}
                  >
                    Write
                  </button>
                  <button
                    type="button"
                    onClick={() => setActiveTab('preview')}
                    className={`px-4 py-2 text-sm font-medium transition-colors ${
                      activeTab === 'preview'
                        ? 'text-zinc-900 dark:text-white bg-white dark:bg-zinc-900 border-b-2 border-cyan-500'
                        : 'text-zinc-500 dark:text-zinc-400 hover:text-zinc-700 dark:hover:text-zinc-300'
                    }`}
                  >
                    Preview
                  </button>
                </div>

                {activeTab === 'write' ? (
                  <FormControl>
                    <Textarea
                      placeholder="게시글 내용을 입력하세요 (마크다운 지원)"
                      className="resize-none border-0 rounded-none focus-visible:ring-0 focus-visible:ring-offset-0 min-h-[600px]"
                      {...field}
                    />
                  </FormControl>
                ) : (
                  <div className="min-h-[600px] p-4 bg-white dark:bg-zinc-900 prose dark:prose-invert max-w-none">
                    {field.value ? (
                      <MarkdownRenderer content={field.value} />
                    ) : (
                      <p className="text-zinc-400 dark:text-zinc-500 italic">
                        작성된 내용이 없습니다. Write 탭에서 내용을 입력해주세요.
                      </p>
                    )}
                  </div>
                )}
              </div>
              <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-1">
                마크다운 문법을 지원합니다. **굵게**, *기울임*, `코드`, [링크](url) 등을 사용할 수 있습니다.
              </p>
              <FormMessage />
            </FormItem>
          )}
        />

        <div className="flex gap-2">
          <Button
            type="submit"
            disabled={form.formState.isSubmitting}
            loading={form.formState.isSubmitting}
          >
            {mode === 'create' ? '작성하기' : '수정하기'}
          </Button>
          <Button
            type="button"
            variant="secondary"
            onClick={() => router.back()}
          >
            취소
          </Button>
        </div>
      </form>
    </Form>
  );
}
