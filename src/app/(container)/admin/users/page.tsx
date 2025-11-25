import { createClient } from '@/lib/supabase/server';
import { getCurrentUserProfile, isSystemAdmin, getRoleDisplayName, getRoleBadgeColor } from '@/lib/permissions/server';
import { redirect } from 'next/navigation';
import { formatDistanceToNow } from 'date-fns';
import { ko } from 'date-fns/locale';
import UpdateRoleButton from '@/components/admin/UpdateRoleButton';
import { Card, CardContent } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
import {
  Shield,
  Users,
  UserCheck,
  Crown,
  Calendar,
  Mail,
  User as UserIcon,
  ShieldCheck
} from 'lucide-react';

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
      <div className="max-w-7xl mx-auto py-8 px-4">
        <Card className="border-red-200 bg-red-50">
          <CardContent className="p-8 text-center">
            <h2 className="text-red-800 font-bold mb-2 text-lg">데이터 조회 오류</h2>
            <p className="text-red-600 mb-4">사용자 목록을 불러오는 중 오류가 발생했습니다.</p>
            <pre className="text-xs bg-red-100 p-4 rounded-lg overflow-auto text-left inline-block max-w-full">
              {JSON.stringify(error, null, 2)}
            </pre>
          </CardContent>
        </Card>
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
    <div className="max-w-7xl mx-auto py-10 px-4 sm:px-6 lg:px-8">
      <div className="mb-8 flex items-center gap-3">
        <div className="p-3 bg-white rounded-xl shadow-sm border border-slate-200 dark:bg-slate-900 dark:border-slate-800">
          <ShieldCheck className="w-6 h-6 text-slate-700 dark:text-slate-300" />
        </div>
        <div>
          <h1 className="text-2xl font-bold text-slate-900 dark:text-white">회원 관리</h1>
          <p className="text-slate-500 dark:text-slate-400 text-sm">전체 사용자 현황을 파악하고 권한을 관리합니다.</p>
        </div>
      </div>

      {/* 통계 카드 섹션 */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4 mb-8">
        <Card>
          <CardContent className="p-4 flex items-center justify-between">
            <div>
              <p className="text-xs font-medium text-slate-500 dark:text-slate-400 uppercase">전체 사용자</p>
              <p className="text-2xl font-bold text-slate-900 dark:text-white mt-1">{stats.total}</p>
            </div>
            <div className="p-2 bg-slate-100 dark:bg-slate-800 rounded-lg text-slate-600 dark:text-slate-300">
              <Users className="w-5 h-5" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4 flex items-center justify-between">
            <div>
              <p className="text-xs font-medium text-slate-500 dark:text-slate-400 uppercase">관리자</p>
              <p className="text-2xl font-bold text-slate-900 dark:text-white mt-1">{stats.admin}</p>
            </div>
            <div className="p-2 bg-orange-100 dark:bg-orange-900/30 rounded-lg text-orange-600 dark:text-orange-400">
              <Shield className="w-5 h-5" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4 flex items-center justify-between">
            <div>
              <p className="text-xs font-medium text-slate-500 dark:text-slate-400 uppercase">VIP 사용자</p>
              <p className="text-2xl font-bold text-slate-900 dark:text-white mt-1">{stats.vip_user}</p>
            </div>
            <div className="p-2 bg-purple-100 dark:bg-purple-900/30 rounded-lg text-purple-600 dark:text-purple-400">
              <Crown className="w-5 h-5" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4 flex items-center justify-between">
            <div>
              <p className="text-xs font-medium text-slate-500 dark:text-slate-400 uppercase">주요 사용자</p>
              <p className="text-2xl font-bold text-slate-900 dark:text-white mt-1">{stats.main_user}</p>
            </div>
            <div className="p-2 bg-blue-100 dark:bg-blue-900/30 rounded-lg text-blue-600 dark:text-blue-400">
              <UserCheck className="w-5 h-5" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4 flex items-center justify-between">
            <div>
              <p className="text-xs font-medium text-slate-500 dark:text-slate-400 uppercase">일반 사용자</p>
              <p className="text-2xl font-bold text-slate-900 dark:text-white mt-1">{stats.user}</p>
            </div>
            <div className="p-2 bg-green-100 dark:bg-green-900/30 rounded-lg text-green-600 dark:text-green-400">
              <UserIcon className="w-5 h-5" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* 회원 목록 테이블 */}
      <Card className="overflow-hidden border-0 shadow-md">
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-slate-200 dark:divide-slate-800">
            <thead className="bg-slate-50 dark:bg-slate-900/50">
              <tr>
                <th className="px-6 py-4 text-left text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
                  사용자 정보
                </th>
                <th className="px-6 py-4 text-left text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
                  등급
                </th>
                <th className="px-6 py-4 text-left text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
                  가입일
                </th>
                <th className="px-6 py-4 text-right text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
                  권한 관리
                </th>
              </tr>
            </thead>
            <tbody className="bg-white dark:bg-slate-950 divide-y divide-slate-200 dark:divide-slate-800">
              {users?.map((user) => (
                <tr key={user.id} className="hover:bg-slate-50 dark:hover:bg-slate-900/50 transition-colors">
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="flex flex-col">
                      <div className="flex items-center gap-2">
                        <Mail className="w-3.5 h-3.5 text-slate-400" />
                        <span className="text-sm font-medium text-slate-900 dark:text-slate-200">
                          {user.email}
                        </span>
                      </div>
                      <div className="flex items-center gap-2 mt-1 ml-0.5">
                        <UserIcon className="w-3 h-3 text-slate-400" />
                        <span className="text-xs text-slate-500 dark:text-slate-400">
                          {user.display_name || '이름 없음'}
                        </span>
                        <span className="text-[10px] text-slate-400 font-mono bg-slate-100 dark:bg-slate-900 px-1 rounded">
                          {user.id.substring(0, 8)}
                        </span>
                      </div>
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    {/* eslint-disable-next-line @typescript-eslint/no-explicit-any */}
                    <Badge variant={getRoleBadgeColor(user.role) as any} className="capitalize">
                      {getRoleDisplayName(user.role)}
                    </Badge>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="flex items-center gap-2 text-sm text-slate-600 dark:text-slate-400">
                      <Calendar className="w-3.5 h-3.5 text-slate-400" />
                      {formatDistanceToNow(new Date(user.created_at), {
                        addSuffix: true,
                        locale: ko,
                      })}
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-right">
                    <UpdateRoleButton
                      userId={user.id}
                      currentRole={user.role}
                    />
                  </td>
                </tr>
              ))}
              {(!users || users.length === 0) && (
                <tr>
                  <td colSpan={4} className="px-6 py-12 text-center text-slate-500">
                    가입된 사용자가 없습니다.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </Card>
    </div>
  );
}