'use client';

import { useState } from 'react';
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
import { AlertCircle } from 'lucide-react';
import { Spinner } from '@/shared/components/ui/Spinner';

function getLoginErrorMessage(error: string): string {
  if (error.includes('Invalid login credentials')) {
    return '이메일 또는 비밀번호가 올바르지 않습니다.';
  }
  if (error.includes('Email not confirmed')) {
    return '이메일 인증이 완료되지 않았습니다. 메일함을 확인해주세요.';
  }
  if (error.includes('too many requests') || error.includes('rate limit')) {
    return '로그인 시도가 너무 많습니다. 잠시 후 다시 시도해주세요.';
  }
  if (error.includes('network') || error.includes('fetch')) {
    return '네트워크 연결을 확인해주세요.';
  }
  return '로그인에 실패했습니다. 다시 시도해주세요.';
}

const loginSchema = z.object({
  email: z
    .string()
    .min(1, '이메일을 입력해주세요')
    .email('올바른 이메일 형식이 아닙니다'),
  password: z
    .string()
    .min(6, '비밀번호는 최소 6자 이상이어야 합니다')
    .max(100, '비밀번호가 너무 깁니다'),
});

type LoginFormValues = z.infer<typeof loginSchema>;

export default function LoginForm() {
  const router = useRouter();
  const supabase = createClient();
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const form = useForm<LoginFormValues>({
    resolver: zodResolver(loginSchema),
    defaultValues: {
      email: '',
      password: '',
    },
  });

  const onSubmit = async (data: LoginFormValues) => {
    setErrorMessage(null);

    try {
      const { error } = await supabase.auth.signInWithPassword({
        email: data.email,
        password: data.password,
      });

      if (error) {
        setErrorMessage(getLoginErrorMessage(error.message));
        return;
      }

      router.push('/home');
      router.refresh();
    } catch {
      setErrorMessage('로그인 중 오류가 발생했습니다. 다시 시도해주세요.');
    }
  };

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="relative space-y-5">
        {form.formState.isSubmitting && (
          <div className="absolute inset-0 z-10 flex items-center justify-center rounded-xl bg-white/80 dark:bg-zinc-950/80 backdrop-blur-sm">
            <Spinner size="lg" text="로그인 중..." />
          </div>
        )}
        {errorMessage && (
          <div className="flex items-start gap-3 p-3 rounded-lg bg-red-50 dark:bg-red-950/50 border border-red-200 dark:border-red-800/50 text-sm text-red-700 dark:text-red-300">
            <AlertCircle className="w-4 h-4 mt-0.5 flex-shrink-0" />
            <span>{errorMessage}</span>
          </div>
        )}
        <FormField
          control={form.control}
          name="email"
          render={({ field }) => (
            <FormItem>
              <FormLabel>이메일</FormLabel>
              <FormControl>
                <Input
                  type="email"
                  placeholder="사번@gumgwang.co.kr"
                  {...field}
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="password"
          render={({ field }) => (
            <FormItem>
              <FormLabel>비밀번호</FormLabel>
              <FormControl>
                <Input
                  type="password"
                  placeholder="••••••••"
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
          variant="primary"
          size="lg"
          className="w-full"
        >
          로그인
        </Button>
      </form>
    </Form>
  );
}
