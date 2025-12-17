import { createClient } from '@/lib/supabase/server';
import { getCurrentUserProfile, isSystemAdmin } from '@/lib/permissions/server';
import { redirect } from 'next/navigation';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
import {
  CheckCircle2,
  XCircle,
  Database,
  Key,
  Globe,
  ShieldCheck,
  Activity,
  Table as TableIcon,
  AlertTriangle,
  ExternalLink
} from 'lucide-react';

interface ConnectionTestResult {
  success: boolean;
  message: string;
  error: unknown | null;
}

export default async function TestConnectionPage() {
  // Admin만 접근 가능
  const profile = await getCurrentUserProfile();
  if (!profile || !isSystemAdmin(profile)) {
    redirect('/');
  }

  const supabase = await createClient();

  // 환경변수 확인 (보안상 일부만 표시)
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const hasAnonKey = !!process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  // URL 표시용 (프로토콜 제외 및 단축)
  const displayUrl = supabaseUrl
    ? supabaseUrl.replace(/^https?:\/\//, '')
    : '설정되지 않음';

  // 연결 테스트
  let connectionTest: ConnectionTestResult = {
    success: false,
    message: '',
    error: null,
  };

  try {
    const { error } = await supabase.from('posts').select('count');

    if (error) {
      connectionTest = {
        success: false,
        message: 'Supabase 연결 실패',
        error: error,
      };
    } else {
      connectionTest = {
        success: true,
        message: '정상 연결됨',
        error: null,
      };
    }
  } catch (err) {
    connectionTest = {
      success: false,
      message: '연결 시도 중 에러 발생',
      error: err,
    };
  }

  // 모든 테이블 목록 가져오기
  const { data: tables, error: tablesError } = await supabase
    .from('information_schema.tables')
    .select('table_name')
    .eq('table_schema', 'public');

  // 만약 information_schema 접근 권한이 없다면 (Supabase 기본 설정상 안될 수 있음),
  // 대안으로 주요 테이블들만 직접 쿼리해서 확인
  let allTables: string[] = [];

  if (!tablesError && tables) {
    allTables = tables.map((t: { table_name: string }) => t.table_name);
  } else {
    // 권한 문제 등으로 실패 시 기본 테이블 확인 시도
    const checkTables = ['posts', 'comments', 'profiles', 'projects'];
    for (const table of checkTables) {
      const { error } = await supabase.from(table).select('count').limit(1);
      if (!error) allTables.push(table);
    }
  }

  // 테이블 정보 매핑
  const tableTests = allTables.sort().map(name => ({
    name,
    exists: true,
    error: null
  }));

  const allTablesExist = tableTests.length > 0;

  return (
    <div className="max-w-3xl mx-auto py-10 px-4">
      <div className="mb-8 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="p-3 bg-white rounded-xl shadow-sm border border-slate-200 dark:bg-slate-900 dark:border-slate-800">
            <ShieldCheck className="w-6 h-6 text-slate-700 dark:text-slate-300" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-slate-900 dark:text-white">시스템 상태 진단</h1>
            <p className="text-slate-500 dark:text-slate-400 text-sm">Supabase 연결 및 데이터베이스 상태를 점검합니다.</p>
          </div>
        </div>
      </div>

      <div className="space-y-6">
        {/* 1. 연결 상태 카드 */}
        <Card className={connectionTest.success ? "border-green-200 bg-green-50/50 dark:bg-green-900/10 dark:border-green-900" : "border-red-200 bg-red-50/50 dark:bg-red-900/10 dark:border-red-900"}>
          <CardContent className="p-6 flex flex-col md:flex-row md:items-center gap-5">
            <div className={`p-3 w-fit rounded-full ${connectionTest.success ? "bg-green-100 text-green-600 dark:bg-green-900/50 dark:text-green-400" : "bg-red-100 text-red-600 dark:bg-red-900/50 dark:text-red-400"}`}>
              {connectionTest.success ? <CheckCircle2 className="w-8 h-8" /> : <XCircle className="w-8 h-8" />}
            </div>
            <div className="flex-1">
              <div className="flex items-center gap-3 mb-1">
                <h2 className={`text-lg font-bold ${connectionTest.success ? "text-green-800 dark:text-green-400" : "text-red-800 dark:text-red-400"}`}>
                  {connectionTest.success ? "Supabase 연결 성공" : "연결 실패"}
                </h2>
                <Badge variant={connectionTest.success ? "success" : "error"}>
                  {connectionTest.success ? "Operational" : "Critical"}
                </Badge>
              </div>
              <p className={`text-sm ${connectionTest.success ? "text-green-600 dark:text-green-300/80" : "text-red-600 dark:text-red-300/80"}`}>
                {connectionTest.message}
              </p>
            </div>
          </CardContent>
          {!connectionTest.success && connectionTest.error !== null && (
            <div className="px-6 pb-6">
              <div className="bg-red-100/50 dark:bg-red-950/50 rounded-lg p-4 text-xs font-mono text-red-800 dark:text-red-300 overflow-x-auto border border-red-200 dark:border-red-900">
                {JSON.stringify(connectionTest.error, null, 2)}
              </div>
            </div>
          )}
        </Card>

        {/* 2. 상세 설정 정보 그리드 */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* 환경 변수 */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base flex items-center gap-2">
                <Activity className="w-4 h-4 text-slate-500" />
                환경 설정
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center justify-between p-3 bg-slate-50 dark:bg-slate-900 rounded-lg border border-slate-100 dark:border-slate-800">
                <div className="flex items-center gap-3">
                  <Globe className="w-4 h-4 text-slate-400" />
                  <div className="flex flex-col">
                    <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">URL Endpoint</span>
                    <span className="text-sm font-mono text-slate-700 dark:text-slate-300 truncate max-w-[150px]" title={supabaseUrl}>
                      {displayUrl}
                    </span>
                  </div>
                </div>
                <div className={`w-2 h-2 rounded-full ${supabaseUrl ? 'bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.4)]' : 'bg-red-500'}`} />
              </div>

              <div className="flex items-center justify-between p-3 bg-slate-50 dark:bg-slate-900 rounded-lg border border-slate-100 dark:border-slate-800">
                <div className="flex items-center gap-3">
                  <Key className="w-4 h-4 text-slate-400" />
                  <div className="flex flex-col">
                    <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Anon Key</span>
                    <span className="text-sm text-slate-700 dark:text-slate-300">
                      {hasAnonKey ? 'Key 설정 완료' : 'Key 미설정'}
                    </span>
                  </div>
                </div>
                <Badge variant={hasAnonKey ? "outline" : "error"}>
                  {hasAnonKey ? "Configured" : "Missing"}
                </Badge>
              </div>
            </CardContent>
          </Card>

          {/* 데이터베이스 스키마 */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base flex items-center gap-2">
                <Database className="w-4 h-4 text-slate-500" />
                스키마 상태
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {tableTests.map((table) => (
                  <div key={table.name} className="flex items-center justify-between group py-1">
                    <div className="flex items-center gap-3">
                      <TableIcon className={`w-4 h-4 ${table.exists ? 'text-slate-400' : 'text-red-400'}`} />
                      <span className={`text-sm font-medium ${table.exists ? 'text-slate-700 dark:text-slate-300' : 'text-red-600 dark:text-red-400'}`}>
                        {table.name}
                      </span>
                    </div>
                    {table.exists ? (
                      <Badge variant="success" className="h-5 px-2 text-[10px]">
                        Found
                      </Badge>
                    ) : (
                      <Badge variant="error" className="h-5 px-2 text-[10px] gap-1">
                        Missing
                      </Badge>
                    )}
                  </div>
                ))}

                <div className="pt-3 mt-3 border-t border-slate-100 dark:border-slate-800">
                  <div className="flex items-center justify-between text-xs text-slate-500">
                    <span>전체 상태</span>
                    <span className={allTablesExist ? "text-emerald-600 font-medium" : "text-amber-600 font-medium"}>
                      {allTablesExist ? "정상" : "테이블 생성 필요"}
                    </span>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* 3. 문제 해결 가이드 (이슈가 있을 때만 표시) */}
        {(!connectionTest.success || !allTablesExist) && (
          <Card className="bg-amber-50 border-amber-200 dark:bg-amber-900/10 dark:border-amber-900/50">
            <CardContent className="p-6">
              <div className="flex items-start gap-3">
                <AlertTriangle className="w-5 h-5 text-amber-600 dark:text-amber-500 shrink-0 mt-0.5" />
                <div className="space-y-3 w-full">
                  <div>
                    <h3 className="font-bold text-amber-800 dark:text-amber-500">문제 해결 가이드</h3>
                    <p className="text-sm text-amber-700 dark:text-amber-400 mt-1">
                      시스템이 정상적으로 작동하지 않을 경우 다음 단계를 확인해주세요.
                    </p>
                  </div>

                  <div className="grid gap-2 md:grid-cols-2">
                    <a
                      href="https://supabase.com/dashboard"
                      target="_blank"
                      rel="noreferrer"
                      className="flex items-center justify-between p-3 bg-white dark:bg-amber-950/30 rounded border border-amber-200 dark:border-amber-800 hover:border-amber-300 transition-colors group"
                    >
                      <span className="text-sm font-medium text-amber-900 dark:text-amber-100">Supabase 대시보드 접속</span>
                      <ExternalLink className="w-4 h-4 text-amber-500 group-hover:text-amber-600" />
                    </a>
                    <div className="p-3 bg-white dark:bg-amber-950/30 rounded border border-amber-200 dark:border-amber-800">
                      <span className="text-xs font-medium text-amber-900 dark:text-amber-100 block mb-1">SQL Editor 실행</span>
                      <span className="text-xs text-amber-600 dark:text-amber-400">schema.sql 파일의 내용을 실행하여 테이블을 생성하세요.</span>
                    </div>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}