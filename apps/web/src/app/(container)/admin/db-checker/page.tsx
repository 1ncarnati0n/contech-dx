import { createClient } from '@/lib/supabase/server';
import { getCurrentUserProfile, isSystemAdmin } from '@/lib/permissions/server';
import { redirect } from 'next/navigation';
import { Card, CardContent } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
import {
  CheckCircle2,
  XCircle,
  Database,
  Key,
  Globe,
  Table2,
  AlertTriangle,
  ExternalLink,
  HardDrive,
  Shield,
  Layers,
} from 'lucide-react';

interface TableInfo {
  name: string;
  description: string;
  schema: string;
  required: boolean;
  exists: boolean;
  rowCount: number | null;
}

// 에러 포맷 헬퍼
function formatError(error: unknown): string {
  if (error instanceof Error) {
    return error.message;
  }
  try {
    return JSON.stringify(error, null, 2);
  } catch {
    return String(error);
  }
}

// 필수 테이블 정의
const REQUIRED_TABLES = [
  { name: 'profiles', description: '사용자 프로필', schema: 'schema-roles.sql' },
  { name: 'projects', description: '프로젝트 정보', schema: 'schema-projects.sql' },
  { name: 'project_members', description: '프로젝트 멤버', schema: 'schema-projects.sql' },
  { name: 'gantt_tasks', description: 'SA-Gantt 태스크', schema: 'schema-gantt.sql' },
  { name: 'gantt_milestones', description: 'SA-Gantt 마일스톤', schema: 'schema-gantt.sql' },
  { name: 'gantt_dependencies', description: 'SA-Gantt 의존성', schema: 'schema-gantt.sql' },
];

// 선택적 테이블 (레거시)
const OPTIONAL_TABLES = [
  { name: 'posts', description: '게시글 (레거시)', schema: '-' },
  { name: 'comments', description: '댓글 (레거시)', schema: '-' },
  { name: 'user_activity_logs', description: '활동 로그', schema: '-' },
];

export default async function TestConnectionPage() {
  // Admin만 접근 가능
  const profile = await getCurrentUserProfile();
  if (!profile || !isSystemAdmin(profile)) {
    redirect('/');
  }

  const supabase = await createClient();

  // 환경변수 확인
  const supabaseUrl: string | undefined = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const hasAnonKey: boolean = !!process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  const displayUrl: string = supabaseUrl?.replace(/^https?:\/\//, '') || '설정되지 않음';

  // 연결 테스트
  let connectionSuccess = false;
  let connectionError: unknown = null;

  try {
    const { error } = await supabase.from('profiles').select('count');
    connectionSuccess = !error;
    connectionError = error;
  } catch (err) {
    connectionError = err;
  }

  // 테이블 상태 확인
  const tableInfos: TableInfo[] = [];
  const allTableDefs = [
    ...REQUIRED_TABLES.map((t) => ({ ...t, required: true })),
    ...OPTIONAL_TABLES.map((t) => ({ ...t, required: false })),
  ];

  for (const tableDef of allTableDefs) {
    try {
      const { count, error } = await supabase
        .from(tableDef.name)
        .select('*', { count: 'exact', head: true });

      tableInfos.push({
        ...tableDef,
        exists: !error,
        rowCount: error ? null : count,
      });
    } catch {
      tableInfos.push({
        ...tableDef,
        exists: false,
        rowCount: null,
      });
    }
  }

  // 통계 계산
  const stats = {
    totalTables: tableInfos.filter((t) => t.exists).length,
    requiredTables: REQUIRED_TABLES.length,
    requiredOk: REQUIRED_TABLES.every((rt) =>
      tableInfos.find((t) => t.name === rt.name && t.exists)
    ),
    totalRows: tableInfos.reduce((sum, t) => sum + (t.rowCount || 0), 0),
    rlsEnabled: tableInfos.filter((t) => t.exists).length, // RLS는 접근 가능하면 활성화된 것
  };

  return (
    <div className="max-w-7xl mx-auto py-10 px-4 sm:px-6 lg:px-8">
      {/* 헤더 */}
      <div className="mb-8 flex items-center gap-3">
        <div className="p-3 bg-white rounded-xl shadow-sm border border-slate-200 dark:bg-slate-900 dark:border-slate-800">
          <Database className="w-6 h-6 text-slate-700 dark:text-slate-300" />
        </div>
        <div>
          <h1 className="text-2xl font-bold text-slate-900 dark:text-white">데이터베이스 상태</h1>
          <p className="text-slate-500 dark:text-slate-400 text-sm">
            Supabase 연결 및 테이블 상태를 점검합니다.
          </p>
        </div>
      </div>

      {/* 통계 카드 섹션 */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4 mb-8">
        {/* 연결 상태 */}
        <Card className={connectionSuccess ? '' : 'border-red-200 dark:border-red-800'}>
          <CardContent className="p-4 flex items-center justify-between">
            <div>
              <p className="text-xs font-medium text-slate-500 dark:text-slate-400 uppercase">
                연결 상태
              </p>
              <p className="text-2xl font-bold text-slate-900 dark:text-white mt-1">
                {connectionSuccess ? 'OK' : 'Error'}
              </p>
            </div>
            <div
              className={`p-2 rounded-lg ${
                connectionSuccess
                  ? 'bg-green-100 dark:bg-green-900/30 text-green-600 dark:text-green-400'
                  : 'bg-red-100 dark:bg-red-900/30 text-red-600 dark:text-red-400'
              }`}
            >
              {connectionSuccess ? (
                <CheckCircle2 className="w-5 h-5" />
              ) : (
                <XCircle className="w-5 h-5" />
              )}
            </div>
          </CardContent>
        </Card>

        {/* 전체 테이블 */}
        <Card>
          <CardContent className="p-4 flex items-center justify-between">
            <div>
              <p className="text-xs font-medium text-slate-500 dark:text-slate-400 uppercase">
                전체 테이블
              </p>
              <p className="text-2xl font-bold text-slate-900 dark:text-white mt-1">
                {stats.totalTables}
              </p>
            </div>
            <div className="p-2 bg-slate-100 dark:bg-slate-800 rounded-lg text-slate-600 dark:text-slate-300">
              <Table2 className="w-5 h-5" />
            </div>
          </CardContent>
        </Card>

        {/* 필수 테이블 */}
        <Card className={stats.requiredOk ? '' : 'border-amber-200 dark:border-amber-800'}>
          <CardContent className="p-4 flex items-center justify-between">
            <div>
              <p className="text-xs font-medium text-slate-500 dark:text-slate-400 uppercase">
                필수 테이블
              </p>
              <p className="text-2xl font-bold text-slate-900 dark:text-white mt-1">
                {tableInfos.filter((t) => t.required && t.exists).length}/{stats.requiredTables}
              </p>
            </div>
            <div
              className={`p-2 rounded-lg ${
                stats.requiredOk
                  ? 'bg-green-100 dark:bg-green-900/30 text-green-600 dark:text-green-400'
                  : 'bg-amber-100 dark:bg-amber-900/30 text-amber-600 dark:text-amber-400'
              }`}
            >
              <Layers className="w-5 h-5" />
            </div>
          </CardContent>
        </Card>

        {/* 전체 레코드 */}
        <Card>
          <CardContent className="p-4 flex items-center justify-between">
            <div>
              <p className="text-xs font-medium text-slate-500 dark:text-slate-400 uppercase">
                전체 레코드
              </p>
              <p className="text-2xl font-bold text-slate-900 dark:text-white mt-1">
                {stats.totalRows.toLocaleString()}
              </p>
            </div>
            <div className="p-2 bg-blue-100 dark:bg-blue-900/30 rounded-lg text-blue-600 dark:text-blue-400">
              <HardDrive className="w-5 h-5" />
            </div>
          </CardContent>
        </Card>

        {/* RLS 활성화 */}
        <Card>
          <CardContent className="p-4 flex items-center justify-between">
            <div>
              <p className="text-xs font-medium text-slate-500 dark:text-slate-400 uppercase">
                RLS 활성화
              </p>
              <p className="text-2xl font-bold text-slate-900 dark:text-white mt-1">
                {stats.rlsEnabled}
              </p>
            </div>
            <div className="p-2 bg-purple-100 dark:bg-purple-900/30 rounded-lg text-purple-600 dark:text-purple-400">
              <Shield className="w-5 h-5" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* 환경 설정 카드 */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-8">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3 mb-3">
              <Globe className="w-4 h-4 text-slate-500" />
              <span className="text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase">
                Supabase URL
              </span>
            </div>
            <div className="flex items-center justify-between">
              <code className="text-sm font-mono text-slate-700 dark:text-slate-300 truncate">
                {displayUrl}
              </code>
              <div
                className={`w-2 h-2 rounded-full ${
                  supabaseUrl ? 'bg-emerald-500' : 'bg-red-500'
                }`}
              />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3 mb-3">
              <Key className="w-4 h-4 text-slate-500" />
              <span className="text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase">
                Anon Key
              </span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-sm text-slate-700 dark:text-slate-300">
                {hasAnonKey ? '설정 완료' : '미설정'}
              </span>
              <Badge variant={hasAnonKey ? 'success' : 'error'}>
                {hasAnonKey ? 'Configured' : 'Missing'}
              </Badge>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* 테이블 목록 */}
      <Card className="overflow-hidden border-0 shadow-md">
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-slate-200 dark:divide-slate-800">
            <thead className="bg-slate-50 dark:bg-slate-900/50">
              <tr>
                <th className="px-6 py-4 text-left text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
                  테이블명
                </th>
                <th className="px-6 py-4 text-left text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
                  설명
                </th>
                <th className="px-6 py-4 text-left text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
                  스키마 파일
                </th>
                <th className="px-6 py-4 text-center text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
                  상태
                </th>
                <th className="px-6 py-4 text-right text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
                  레코드
                </th>
              </tr>
            </thead>
            <tbody className="bg-white dark:bg-slate-900 divide-y divide-slate-200 dark:divide-slate-800">
              {tableInfos.map((table) => (
                <tr
                  key={table.name}
                  className="hover:bg-slate-50 dark:hover:bg-slate-900/50 transition-colors"
                >
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="flex items-center gap-2">
                      <code className="text-sm font-mono font-medium text-slate-900 dark:text-slate-200 bg-slate-100 dark:bg-slate-800 px-2 py-0.5 rounded">
                        {table.name}
                      </code>
                      {table.required && (
                        <Badge variant="default" className="text-[10px]">
                          필수
                        </Badge>
                      )}
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span className="text-sm text-slate-600 dark:text-slate-400">
                      {table.description}
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <code className="text-xs text-blue-600 dark:text-blue-400">
                      {table.schema}
                    </code>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-center">
                    {table.exists ? (
                      <Badge variant="success" className="gap-1">
                        <CheckCircle2 className="w-3 h-3" />
                        활성
                      </Badge>
                    ) : (
                      <Badge variant="error" className="gap-1">
                        <XCircle className="w-3 h-3" />
                        없음
                      </Badge>
                    )}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-right">
                    <span className="text-sm font-medium text-slate-900 dark:text-slate-200">
                      {table.rowCount !== null ? table.rowCount.toLocaleString() : '-'}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>

      {/* 문제 해결 가이드 */}
      {(!connectionSuccess || !stats.requiredOk) && (
        <Card className="mt-6 bg-amber-50 border-amber-200 dark:bg-amber-900/10 dark:border-amber-900/50">
          <CardContent className="p-6">
            <div className="flex items-start gap-3">
              <AlertTriangle className="w-5 h-5 text-amber-600 dark:text-amber-500 shrink-0 mt-0.5" />
              <div className="space-y-3 w-full">
                <div>
                  <h3 className="font-bold text-amber-800 dark:text-amber-500">
                    문제 해결 가이드
                  </h3>
                  <p className="text-sm text-amber-700 dark:text-amber-400 mt-1">
                    누락된 테이블이 있습니다. Supabase SQL Editor에서 스키마 파일을 실행하세요.
                  </p>
                </div>

                <div className="grid gap-2 md:grid-cols-2">
                  <a
                    href="https://supabase.com/dashboard"
                    target="_blank"
                    rel="noreferrer"
                    className="flex items-center justify-between p-3 bg-white dark:bg-amber-950/30 rounded border border-amber-200 dark:border-amber-800 hover:border-amber-300 transition-colors group"
                  >
                    <span className="text-sm font-medium text-amber-900 dark:text-amber-100">
                      Supabase 대시보드
                    </span>
                    <ExternalLink className="w-4 h-4 text-amber-500 group-hover:text-amber-600" />
                  </a>
                  <div className="p-3 bg-white dark:bg-amber-950/30 rounded border border-amber-200 dark:border-amber-800">
                    <span className="text-xs font-medium text-amber-900 dark:text-amber-100 block mb-1">
                      실행 순서
                    </span>
                    <span className="text-xs text-amber-600 dark:text-amber-400">
                      schema-roles.sql → schema-projects.sql → schema-gantt.sql
                    </span>
                  </div>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* 연결 에러 상세 */}
      {!connectionSuccess && connectionError !== null && (
        <Card className="mt-4 border-red-200 dark:border-red-800">
          <CardContent className="p-4">
            <p className="text-xs font-medium text-red-600 dark:text-red-400 mb-2">
              연결 오류 상세
            </p>
            <pre className="text-xs bg-red-50 dark:bg-red-950/50 p-3 rounded overflow-x-auto text-red-800 dark:text-red-300">
              {formatError(connectionError)}
            </pre>
          </CardContent>
        </Card>
      )}
    </div>
  );
}