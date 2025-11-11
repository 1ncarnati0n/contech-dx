import SignupForm from '@/components/auth/SignupForm';
import Link from 'next/link';

export default function SignupPage() {
  return (
    <div className="max-w-md mx-auto">
      <div className="bg-white rounded-lg shadow-md p-8">
        <h1 className="text-2xl font-bold text-center mb-6">회원가입</h1>
        <SignupForm />
        <p className="mt-4 text-center text-sm text-gray-600">
          이미 계정이 있으신가요?{' '}
          <Link href="/login" className="text-blue-600 hover:text-blue-800">
            로그인
          </Link>
        </p>
      </div>
    </div>
  );
}
