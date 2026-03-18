'use client';

import { useState, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { createClient } from '@/shared/lib/supabase/client';
import { useRouter } from 'next/navigation';
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
  Input,
  Button,
} from '@/shared/components/ui';
import { AlertCircle, Loader2 } from 'lucide-react';

const schema = z
  .object({
    password: z
      .string()
      .min(6, '비밀번호는 최소 6자 이상이어야 합니다')
      .max(100, '비밀번호가 너무 깁니다'),
    confirmPassword: z.string().min(1, '비밀번호 확인을 입력해주세요'),
  })
  .refine((data) => data.password === data.confirmPassword, {
    message: '비밀번호가 일치하지 않습니다.',
    path: ['confirmPassword'],
  });

type FormValues = z.infer<typeof schema>;

export default function ResetPasswordForm() {
  const router = useRouter();
  const supabase = createClient();
  const [authError, setAuthError] = useState<string | null>(null);
  const [formError, setFormError] = useState<string | null>(null);
  const [isReady, setIsReady] = useState(false);

  useEffect(() => {
    // URL에 에러 파라미터가 있는 경우 (링크 만료 등)
    const params = new URLSearchParams(window.location.search);
    if (params.get('error_code') === 'otp_expired') {
      setAuthError('인증 링크가 만료되었습니다. 비밀번호 재설정을 다시 요청해주세요.');
      return;
    }
    if (params.get('error')) {
      setAuthError('인증 링크가 유효하지 않습니다. 비밀번호 재설정을 다시 요청해주세요.');
      return;
    }

    // 콜백에서 세션이 설정되었는지 확인
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session) {
        setIsReady(true);
      } else {
        setAuthError('인증 세션이 없습니다. 비밀번호 재설정을 다시 요청해주세요.');
      }
    });
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const form = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: { password: '', confirmPassword: '' },
  });

  const onSubmit = async (data: FormValues) => {
    setFormError(null);

    try {
      const { error } = await supabase.auth.updateUser({
        password: data.password,
      });

      if (error) {
        if (error.message.includes('same as your old password')) {
          setFormError('기존 비밀번호와 동일합니다. 다른 비밀번호를 입력해주세요.');
        } else {
          setFormError('비밀번호 변경에 실패했습니다. 다시 시도해주세요.');
        }
        return;
      }

      await supabase.auth.signOut();
      router.push('/login?reset=success');
    } catch {
      setFormError('오류가 발생했습니다. 다시 시도해주세요.');
    }
  };

  if (authError) {
    return (
      <div className="flex flex-col items-center gap-4 py-4">
        <div className="flex items-start gap-3 w-full p-3 rounded-lg bg-red-50 dark:bg-red-950/50 border border-red-200 dark:border-red-800/50 text-sm text-red-700 dark:text-red-300">
          <AlertCircle className="w-4 h-4 mt-0.5 flex-shrink-0" />
          <span>{authError}</span>
        </div>
        <Button
          variant="primary"
          size="lg"
          className="w-full"
          onClick={() => router.push('/reset-password')}
        >
          다시 요청하기
        </Button>
      </div>
    );
  }

  if (!isReady) {
    return (
      <div className="flex flex-col items-center gap-3 py-8">
        <Loader2 className="w-6 h-6 animate-spin text-zinc-400" />
        <p className="text-sm text-zinc-500 dark:text-zinc-400">인증 확인 중...</p>
      </div>
    );
  }

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-5">
        {formError && (
          <div className="flex items-start gap-3 p-3 rounded-lg bg-red-50 dark:bg-red-950/50 border border-red-200 dark:border-red-800/50 text-sm text-red-700 dark:text-red-300">
            <AlertCircle className="w-4 h-4 mt-0.5 flex-shrink-0" />
            <span>{formError}</span>
          </div>
        )}
        <FormField
          control={form.control}
          name="password"
          render={({ field }) => (
            <FormItem>
              <FormLabel>새 비밀번호</FormLabel>
              <FormControl>
                <Input type="password" placeholder="••••••••" {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        <FormField
          control={form.control}
          name="confirmPassword"
          render={({ field }) => (
            <FormItem>
              <FormLabel>비밀번호 확인</FormLabel>
              <FormControl>
                <Input type="password" placeholder="••••••••" {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        <Button
          type="submit"
          disabled={form.formState.isSubmitting}
          loading={form.formState.isSubmitting}
          variant="primary"
          size="lg"
          className="w-full"
        >
          비밀번호 변경
        </Button>
      </form>
    </Form>
  );
}
