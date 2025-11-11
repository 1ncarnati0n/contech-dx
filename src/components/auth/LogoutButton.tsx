'use client';

import { createClient } from '@/lib/supabase/client';
import { useRouter } from 'next/navigation';
import { useState } from 'react';

export default function LogoutButton() {
  const [loading, setLoading] = useState(false);
  const router = useRouter();
  const supabase = createClient();

  const handleLogout = async () => {
    setLoading(true);

    try {
      const { error } = await supabase.auth.signOut();

      if (error) {
        alert('로그아웃 중 오류가 발생했습니다.');
        return;
      }

      router.push('/');
      router.refresh();
    } catch (err) {
      alert('로그아웃 중 오류가 발생했습니다.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <button
      onClick={handleLogout}
      disabled={loading}
      className="text-gray-700 hover:text-gray-900 px-3 py-2 rounded-md text-sm font-medium disabled:opacity-50"
    >
      {loading ? '로그아웃 중...' : '로그아웃'}
    </button>
  );
}
