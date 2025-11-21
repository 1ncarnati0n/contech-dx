import { createClient } from '@/lib/supabase/server';
import { getCurrentUserProfile, isSystemAdmin, getRoleDisplayName, getRoleBadgeColor } from '@/lib/permissions/server';
import { redirect } from 'next/navigation';
import { formatDistanceToNow } from 'date-fns';
import { ko } from 'date-fns/locale';
import type { Profile } from '@/lib/types';
import UpdateRoleButton from '@/components/admin/UpdateRoleButton';

export default async function AdminUsersPage() {
  const profile = await getCurrentUserProfile();

  // Admin만 접근 가능
  if (!profile || !isSystemAdmin(profile)) {
    redirect('/');
  }

  const supabase = await createClient();

  // 모든 사용자 목록 가져오기
  const { data: users, error } = await supabase
    .from('profiles')
    .select('*')
    .order('created_at', { ascending: false });

  if (error) {
    return (
      <div className="max-w-7xl mx-auto">
        <div className="bg-red-50 border border-red-200 rounded-lg p-6">
          <h2 className="text-red-800 font-bold mb-2">데이터 조회 오류</h2>
          <p className="text-red-600">사용자 목록을 불러오는 중 오류가 발생했습니다.</p>
          <pre className="mt-2 text-xs bg-red-100 p-2 rounded overflow-auto">
            {JSON.stringify(error, null, 2)}
          </pre>
        </div>
      </div>
    );
  }

  // 등급별 통계
  const stats = {
    total: users?.length || 0,
    admin: users?.filter((u) => u.role === 'admin').length || 0,
    main_user: users?.filter((u) => u.role === 'main_user').length || 0,
    vip_user: users?.filter((u) => u.role === 'vip_user').length || 0,
    user: users?.filter((u) => u.role === 'user').length || 0,
  };

  return (
    <div className="max-w-7xl mx-auto">
      <div className="mb-8">
        <h1 className="text-3xl font-bold mb-2">회원 관리</h1>
        <p className="text-gray-600">관리자 전용 페이지</p>
      </div>

      {/* 통계 카드 */}
      <div className="grid grid-cols-1 md:grid-cols-5 gap-4 mb-8">
        <div className="bg-white rounded-lg shadow-md p-6">
          <p className="text-sm text-gray-600 mb-1">전체 회원</p>
          <p className="text-3xl font-bold text-gray-900">{stats.total}</p>
        </div>
        <div className="bg-purple-50 rounded-lg shadow-md p-6 border-2 border-purple-200">
          <p className="text-sm text-purple-600 mb-1">관리자</p>
          <p className="text-3xl font-bold text-purple-900">{stats.admin}</p>
        </div>
        <div className="bg-blue-50 rounded-lg shadow-md p-6 border-2 border-blue-200">
          <p className="text-sm text-blue-600 mb-1">주요 사용자</p>
          <p className="text-3xl font-bold text-blue-900">{stats.main_user}</p>
        </div>
        <div className="bg-yellow-50 rounded-lg shadow-md p-6 border-2 border-yellow-200">
          <p className="text-sm text-yellow-600 mb-1">VIP 사용자</p>
          <p className="text-3xl font-bold text-yellow-900">{stats.vip_user}</p>
        </div>
        <div className="bg-gray-50 rounded-lg shadow-md p-6 border-2 border-gray-200">
          <p className="text-sm text-gray-600 mb-1">일반 사용자</p>
          <p className="text-3xl font-bold text-gray-900">{stats.user}</p>
        </div>
      </div>

      {/* 회원 목록 테이블 */}
      <div className="bg-white rounded-lg shadow-md overflow-hidden">
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  이메일
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  등급
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  표시 이름
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  가입일
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  관리
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {users && users.length > 0 ? (
                users.map((user: Profile) => (
                  <tr key={user.id} className="hover:bg-gray-50">
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm font-medium text-gray-900">{user.email}</div>
                      <div className="text-xs text-gray-500">{user.id}</div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span
                        className={`inline-flex text-xs px-2 py-1 rounded-full border font-medium ${getRoleBadgeColor(
                          user.role
                        )}`}
                      >
                        {getRoleDisplayName(user.role)}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {user.display_name || '-'}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {formatDistanceToNow(new Date(user.created_at), {
                        addSuffix: true,
                        locale: ko,
                      })}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm">
                      <UpdateRoleButton userId={user.id} currentRole={user.role} />
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={5} className="px-6 py-4 text-center text-gray-500">
                    등록된 회원이 없습니다.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
