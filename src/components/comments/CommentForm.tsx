'use client';

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
import { Textarea } from '@/components/ui/Input';

// ============================================
// Zod 스키마 정의
// ============================================
const commentSchema = z.object({
  content: z
    .string()
    .min(1, '댓글을 입력해주세요')
    .min(2, '댓글은 최소 2자 이상이어야 합니다')
    .max(1000, '댓글은 1,000자를 초과할 수 없습니다'),
});

type CommentFormValues = z.infer<typeof commentSchema>;

// ============================================
// Props 타입 정의
// ============================================
interface CommentFormProps {
  postId: string;
}

// ============================================
// 컴포넌트
// ============================================
export default function CommentForm({ postId }: CommentFormProps) {
  const router = useRouter();
  const supabase = createClient();

  const form = useForm<CommentFormValues>({
    resolver: zodResolver(commentSchema),
    defaultValues: {
      content: '',
    },
  });

  const onSubmit = async (data: CommentFormValues) => {
    try {
      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (!user) {
        toast.error('로그인이 필요합니다.');
        router.push('/login');
        return;
      }

      const { error } = await supabase.from('comments').insert({
        post_id: postId,
        content: data.content,
        author_id: user.id,
      });

      if (error) {
        toast.error('댓글 작성 실패', { description: error.message });
        return;
      }

      toast.success('댓글이 작성되었습니다.');
      form.reset();
      router.refresh();
    } catch {
      toast.error('댓글 작성 중 오류가 발생했습니다.');
    }
  };

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
        <FormField
          control={form.control}
          name="content"
          render={({ field }) => (
            <FormItem>
              <FormLabel>댓글 작성</FormLabel>
              <FormControl>
                <Textarea
                  placeholder="댓글을 입력하세요..."
                  rows={3}
                  className="resize-none"
                  {...field}
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <Button
          type="submit"
          disabled={form.formState.isSubmitting}
          loading={form.formState.isSubmitting}
        >
          댓글 작성
        </Button>
      </form>
    </Form>
  );
}
