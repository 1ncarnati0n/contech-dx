'use client';

import { useState } from 'react';
import { promoteCurrentUserToAdmin } from '@/lib/services/users.client';
import { useRouter } from 'next/navigation';

export default function PromoteToAdminPage() {
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<{
    success: boolean;
    message: string;
  } | null>(null);
  const router = useRouter();

  const handlePromote = async () => {
    if (!confirm('현재 로그인된 사용자를 관리자로 승격시키시겠습니까?')) {
      return;
    }

    setLoading(true);
    setResult(null);

    try {
      const response = await promoteCurrentUserToAdmin();

      if (response.success) {
        setResult({
          success: true,
          message: '사용자 권한이 관리자로 변경되었습니다. 페이지를 새로고침합니다.',
        });
        // 2초 후 페이지 새로고침
        setTimeout(() => {
          router.refresh();
          window.location.href = '/home';
        }, 2000);
      } else {
        setResult({
          success: false,
          message: response.error || '권한 업데이트에 실패했습니다.',
        });
      }
    } catch (error) {
      setResult({
        success: false,
        message: error instanceof Error ? error.message : '알 수 없는 오류가 발생했습니다.',
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="container mx-auto px-4 py-8 max-w-2xl">
      <div className="bg-white rounded-lg shadow-md p-6">
        <h1 className="text-2xl font-bold mb-4">사용자 권한 승격</h1>
        <p className="text-gray-600 mb-6">
          현재 로그인된 사용자를 관리자 권한으로 승격시킵니다.
          <br />
          <span className="text-sm text-red-600 font-semibold">
            ⚠️ 개발/테스트 목적으로만 사용하세요.
          </span>
        </p>

        <button
          onClick={handlePromote}
          disabled={loading}
          className="w-full bg-blue-600 hover:bg-blue-700 disabled:bg-gray-400 text-white font-semibold py-2 px-4 rounded-lg transition-colors"
        >
          {loading ? '처리 중...' : '관리자로 승격'}
        </button>

        {result && (
          <div
            className={`mt-4 p-4 rounded-lg ${
              result.success
                ? 'bg-green-50 text-green-800 border border-green-200'
                : 'bg-red-50 text-red-800 border border-red-200'
            }`}
          >
            <p className="font-semibold">{result.success ? '✓ 성공' : '✗ 실패'}</p>
            <p className="mt-1">{result.message}</p>
          </div>
        )}

        <div className="mt-6 p-4 bg-gray-50 rounded-lg">
          <p className="text-sm text-gray-600 font-semibold mb-2">브라우저 콘솔에서 실행:</p>
          <code className="text-xs bg-gray-800 text-green-400 p-2 rounded block overflow-x-auto">
            {`await fetch('/api/users/promote-to-admin', { method: 'POST' }).then(r => r.json()).then(console.log)`}
          </code>
        </div>
      </div>
    </div>
  );
}

