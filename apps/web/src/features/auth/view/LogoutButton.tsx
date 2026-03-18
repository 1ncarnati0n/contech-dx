'use client';

import { useRouter } from 'next/navigation';
import { useState } from 'react';
import { LogOut, Loader2 } from 'lucide-react';
import { logout } from '../service/auth.service';

export default function LogoutButton() {
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  const handleLogout = async () => {
    setLoading(true);

    try {
      const result = await logout();

      if (!result.success) {
        alert(result.error);
        return;
      }

      router.push('/');
      router.refresh();
    } finally {
      setLoading(false);
    }
  };

  return (
    <button
      onClick={handleLogout}
      disabled={loading}
      className="flex items-center gap-2 text-slate-700 hover:text-red-600 hover:bg-red-50 px-3 py-2 rounded-lg text-sm font-medium transition-all disabled:opacity-50 disabled:cursor-not-allowed"
    >
      {loading ? (
        <>
          <Loader2 className="w-4 h-4 animate-spin" />
          <span className="hidden sm:inline">로그아웃 중...</span>
        </>
      ) : (
        <>
          <LogOut className="w-4 h-4" />
          <span className="hidden sm:inline">로그아웃</span>
        </>
      )}
    </button>
  );
}
