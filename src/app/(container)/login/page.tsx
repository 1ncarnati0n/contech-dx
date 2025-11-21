import LoginForm from '@/components/auth/LoginForm';
import Link from 'next/link';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui';
import { LogIn } from 'lucide-react';

export default function LoginPage() {
  return (
    <div className="max-w-md mx-auto mt-8">
      <Card>
        <CardHeader>
          <div className="flex items-center justify-center gap-2 mb-2">
            <div className="p-2 bg-slate-100 dark:bg-slate-800 rounded-lg">
              <LogIn className="w-6 h-6 text-slate-700 dark:text-slate-300" />
            </div>
          </div>
          <CardTitle className="text-center text-2xl">로그인</CardTitle>
        </CardHeader>
        <CardContent>
          <LoginForm />
          <p className="mt-6 text-center text-sm text-slate-600 dark:text-slate-400">
            계정이 없으신가요?{' '}
            <Link
              href="/signup"
              className="text-slate-700 dark:text-slate-300 font-medium hover:text-slate-900 dark:hover:text-slate-100 underline underline-offset-2"
            >
              회원가입
            </Link>
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
