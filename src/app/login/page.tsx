import LoginForm from '@/components/auth/LoginForm';
import Link from 'next/link';

export default function LoginPage() {
  return (
    <div className="max-w-md mx-auto">
      <div className="bg-white rounded-lg shadow-md p-8">
        <h1 className="text-2xl font-bold text-center mb-6">로그인</h1>
        <LoginForm />
        <p className="mt-4 text-center text-sm text-gray-600">
          계정이 없으신가요?{' '}
          <Link href="/signup" className="text-blue-600 hover:text-blue-800">
            회원가입
          </Link>
        </p>
      </div>
    </div>
  );
}
