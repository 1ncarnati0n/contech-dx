import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import LoginForm from '@/components/auth/LoginForm';
import Link from 'next/link';
import { LogIn, ArrowRight, KeyRound, CheckCircle2 } from 'lucide-react';

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ reset?: string }>;
}) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  const { reset } = await searchParams;

  // 로그인된 사용자는 /home으로 리다이렉트
  if (user) {
    redirect('/home');
  }
  return (
    <div className="relative min-h-[calc(100vh-4rem)] flex flex-col items-center justify-center overflow-hidden transition-colors duration-300">
      {/* Background Effects */}
      <div className="absolute inset-0 -z-10">
        <div className="absolute inset-0 bg-[linear-gradient(to_right,#80808030_1px,transparent_1px),linear-gradient(to_bottom,#80808030_1px,transparent_1px)] dark:bg-[linear-gradient(to_right,#6f6f6f40_1px,transparent_1px),linear-gradient(to_bottom,#6f6f6f40_1px,transparent_1px)] bg-[size:4rem_4rem] [mask-image:radial-gradient(ellipse_80%_70%_at_50%_0%,#000_70%,transparent_100%)]" />
        <div className="absolute top-0 left-0 right-0 h-[500px] from-primary-200/40 via-transparent to-transparent dark:from-primary-900/20 dark:via-transparent dark:to-transparent blur-3xl" />
      </div>

      <div className="relative max-w-md w-full px-4">
        {/* Badge */}
        <div className="mb-8 flex justify-center">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white/50 dark:bg-white/5 border border-primary-200 dark:border-white/10 backdrop-blur-md text-sm text-primary-600 dark:text-primary-200 shadow-sm">
            <LogIn className="w-4 h-4" />
            Member Access
          </div>
        </div>

        {/* Title */}
        <h1 className="text-3xl md:text-4xl font-bold tracking-tight text-zinc-900 dark:text-white mb-2 text-center">
          로그인
        </h1>
        <p className="text-zinc-500 dark:text-zinc-400 text-center mb-8">
          계정에 로그인하여 서비스를 이용하세요
        </p>

        {/* Success Alert */}
        {reset === 'success' && (
          <div className="mb-6 flex items-start gap-3 p-3 rounded-lg bg-green-50 dark:bg-green-950/50 border border-green-200 dark:border-green-800/50 text-sm text-green-700 dark:text-green-300">
            <CheckCircle2 className="w-4 h-4 mt-0.5 flex-shrink-0" />
            <span>비밀번호가 성공적으로 변경되었습니다. 새 비밀번호로 로그인해주세요.</span>
          </div>
        )}

        {/* Login Card */}
        <div className="p-1 rounded-2xl bg-gradient-to-b from-white/50 to-white/20 dark:from-white/10 dark:to-white/5 backdrop-blur-xl border border-white/20 dark:border-white/10 shadow-xl dark:shadow-2xl">
          <div className="bg-white/60 dark:bg-zinc-950/80 rounded-xl p-6 backdrop-blur-sm">
            <LoginForm />

            <div className="mt-6 pt-6 border-t border-zinc-200/50 dark:border-zinc-700/50">
              <div className="flex items-center justify-between mb-3">
                <p className="text-sm text-zinc-500 dark:text-zinc-400">
                  로그인에 문제가 있으면 
                </p>
              <div>
                <Link
                  href="/reset-password"
                  className="w-full flex items-center justify-center gap-2 px-4 py-2.5 rounded-lg text-sm font-medium text-zinc-700 dark:text-zinc-300 bg-zinc-100/50 dark:bg-zinc-800/50 hover:bg-zinc-200/50 dark:hover:bg-zinc-700/50 transition-colors"
                >
                  <KeyRound className="w-3.5 h-3.5" />
                  비밀번호 재설정
                </Link>  
              </div>  

              </div>
                <p className="text-sm text-zinc-500 dark:text-zinc-400">
                  계정이 없으시면 
                </p>
              <Link
                href="/signup"
                className="w-full flex items-center justify-center gap-2 px-4 py-2.5 rounded-lg text-sm font-medium text-zinc-700 dark:text-zinc-300 bg-zinc-100/50 dark:bg-zinc-800/50 hover:bg-zinc-200/50 dark:hover:bg-zinc-700/50 transition-colors"
              >
                회원가입
                <ArrowRight className="w-4 h-4" />
              </Link>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
