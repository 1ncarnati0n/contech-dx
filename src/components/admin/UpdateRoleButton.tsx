'use client';

import { useState } from 'react';
import { createClient } from '@/lib/supabase/client';
import { useRouter } from 'next/navigation';
import type { UserRole } from '@/lib/types';
import { getRoleDisplayName } from '@/lib/permissions-client';

interface UpdateRoleButtonProps {
  userId: string;
  currentRole: UserRole;
}

export default function UpdateRoleButton({ userId, currentRole }: UpdateRoleButtonProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const router = useRouter();
  const supabase = createClient();

  const roles: UserRole[] = ['admin', 'main_user', 'vip_user', 'user'];

  const handleRoleChange = async (newRole: UserRole) => {
    if (newRole === currentRole) {
      setIsOpen(false);
      return;
    }

    if (!confirm(`등급을 "${getRoleDisplayName(newRole)}"(으)로 변경하시겠습니까?`)) {
      return;
    }

    setLoading(true);

    try {
      const { error } = await supabase
        .from('profiles')
        .update({ role: newRole })
        .eq('id', userId);

      if (error) {
        alert('등급 변경 실패: ' + error.message);
        return;
      }

      alert('등급이 성공적으로 변경되었습니다.');
      setIsOpen(false);
      router.refresh();
    } catch (err) {
      alert('등급 변경 중 오류가 발생했습니다.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="relative inline-block text-left">
      <button
        onClick={() => setIsOpen(!isOpen)}
        disabled={loading}
        className="inline-flex justify-center w-full px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50"
      >
        등급 변경
        <svg
          className="-mr-1 ml-2 h-5 w-5"
          xmlns="http://www.w3.org/2000/svg"
          viewBox="0 0 20 20"
          fill="currentColor"
        >
          <path
            fillRule="evenodd"
            d="M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z"
            clipRule="evenodd"
          />
        </svg>
      </button>

      {isOpen && (
        <div className="origin-top-right absolute right-0 mt-2 w-56 rounded-md shadow-lg bg-white ring-1 ring-black ring-opacity-5 z-10">
          <div className="py-1">
            {roles.map((role) => (
              <button
                key={role}
                onClick={() => handleRoleChange(role)}
                disabled={loading}
                className={`block w-full text-left px-4 py-2 text-sm ${
                  role === currentRole
                    ? 'bg-blue-50 text-blue-900 font-medium'
                    : 'text-gray-700 hover:bg-gray-100'
                } disabled:opacity-50`}
              >
                {getRoleDisplayName(role)}
                {role === currentRole && ' (현재)'}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* 배경 클릭 시 닫기 */}
      {isOpen && (
        <div
          className="fixed inset-0 z-0"
          onClick={() => setIsOpen(false)}
        />
      )}
    </div>
  );
}
