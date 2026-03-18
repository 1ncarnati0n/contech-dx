'use client';

import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { createClient } from '@/lib/supabase/client';
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
  Input,
  Button,
} from '@/components/ui';
import { AlertCircle, CheckCircle2 } from 'lucide-react';

const schema = z.object({
  email: z
    .string()
    .min(1, '이메일을 입력해주세요')
    .email('올바른 이메일 형식이 아닙니다'),
});

type FormValues = z.infer<typeof schema>;

export default function ResetPasswordRequestForm() {
  const supabase = createClient();
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [sent, setSent] = useState(false);

  const form = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: { email: '' },
  });

  const onSubmit = async (data: FormValues) => {
    setErrorMessage(null);

    try {
      // 이메일이 가입된 계정인지 확인
      const { data: profile, error: profileError } = await supabase
        .from('profiles')
        .select('id')
        .eq('email', data.email)
        .maybeSingle();

      if (profileError) {
        setErrorMessage('이메일 확인 중 오류가 발생했습니다. 다시 시도해주세요.');
        return;
      }

      if (!profile) {
        setErrorMessage('가입되지 않은 이메일입니다. 이메일을 확인해주세요.');
        return;
      }

      const { error } = await supabase.auth.resetPasswordForEmail(data.email, {
        redirectTo: `${window.location.origin}/auth/callback?next=/reset-password/confirm`,
      });

      if (error) {
        if (error.message.includes('rate limit') || error.message.includes('Rate limit')) {
          setErrorMessage('요청이 너무 많습니다. 잠시 후 다시 시도해주세요.');
        } else {
          setErrorMessage('비밀번호 재설정 요청에 실패했습니다. 다시 시도해주세요.');
        }
        return;
      }

      setSent(true);
    } catch {
      setErrorMessage('오류가 발생했습니다. 다시 시도해주세요.');
    }
  };

  if (sent) {
    return (
      <div className="flex flex-col items-center gap-3 py-4 text-center">
        <div className="w-12 h-12 rounded-full bg-green-100 dark:bg-green-900/30 flex items-center justify-center">
          <CheckCircle2 className="w-6 h-6 text-green-600 dark:text-green-400" />
        </div>
        <h3 className="text-lg font-semibold text-zinc-900 dark:text-white">
          이메일을 확인해주세요
        </h3>
        <p className="text-sm text-zinc-500 dark:text-zinc-400">
          입력하신 이메일로 비밀번호 재설정 링크를 보냈습니다.
          <br />
          메일함을 확인해주세요.
        </p>
      </div>
    );
  }

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-5">
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
        <Button
          type="submit"
          disabled={form.formState.isSubmitting}
          loading={form.formState.isSubmitting}
          variant="primary"
          size="lg"
          className="w-full"
        >
          재설정 링크 보내기
        </Button>
      </form>
    </Form>
  );
}
