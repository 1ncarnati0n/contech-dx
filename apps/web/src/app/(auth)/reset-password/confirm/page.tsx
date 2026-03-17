import ResetPasswordForm from '@/features/auth/view/ResetPasswordForm';
import { KeyRound } from 'lucide-react';

export default function ResetPasswordConfirmPage() {
  return (
    <div className="relative min-h-screen flex flex-col items-center justify-center overflow-hidden transition-colors duration-300">
      {/* Background Effects */}
      <div className="absolute inset-0 -z-10">
        <div className="absolute inset-0 bg-[linear-gradient(to_right,#80808030_1px,transparent_1px),linear-gradient(to_bottom,#80808030_1px,transparent_1px)] dark:bg-[linear-gradient(to_right,#6f6f6f40_1px,transparent_1px),linear-gradient(to_bottom,#6f6f6f40_1px,transparent_1px)] bg-[size:4rem_4rem] [mask-image:radial-gradient(ellipse_80%_70%_at_50%_0%,#000_70%,transparent_100%)]" />
        <div className="absolute top-0 left-0 right-0 h-[500px] from-primary-200/40 via-transparent to-transparent dark:from-primary-900/20 dark:via-transparent dark:to-transparent blur-3xl" />
      </div>

      <div className="relative max-w-md w-full px-4">
        {/* Badge */}
        <div className="mb-8 flex justify-center">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white/50 dark:bg-white/5 border border-primary-200 dark:border-white/10 backdrop-blur-md text-sm text-primary-600 dark:text-primary-200 shadow-sm">
            <KeyRound className="w-4 h-4" />
            New Password
          </div>
        </div>

        {/* Title */}
        <h1 className="text-3xl md:text-4xl font-bold tracking-tight text-zinc-900 dark:text-white mb-2 text-center">
          새 비밀번호 설정
        </h1>
        <p className="text-zinc-500 dark:text-zinc-400 text-center mb-8">
          새로운 비밀번호를 입력해주세요
        </p>

        {/* Card */}
        <div className="p-1 rounded-2xl bg-gradient-to-b from-white/50 to-white/20 dark:from-white/10 dark:to-white/5 backdrop-blur-xl border border-white/20 dark:border-white/10 shadow-xl dark:shadow-2xl">
          <div className="bg-white/60 dark:bg-zinc-950/80 rounded-xl p-6 backdrop-blur-sm">
            <ResetPasswordForm />
          </div>
        </div>
      </div>
    </div>
  );
}
