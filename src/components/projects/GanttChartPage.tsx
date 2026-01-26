'use client';

import { useEffect, useState, useCallback, useMemo } from 'react';
import { createSupabaseGanttDataService } from '@/lib/services/SupabaseGanttDataService';
import { toast } from 'sonner';
import {
  Loader2,
  ListTodo,
  Flag,
  CalendarDays,
  Clock,
  Rocket,
  ChevronRight,
  Workflow,
  Link2,
  Undo2,
} from 'lucide-react';
import type { ConstructionTask, Milestone, AnchorDependency } from 'sa-gantt-lib';

interface GanttChartPageProps {
  projectId: string;
}

// 통계 카드 컴포넌트
interface StatCardProps {
  icon: React.ReactNode;
  title: string;
  value: string | number;
  subValue?: string;
  iconBgColor: string;
}

function StatCard({ icon, title, value, subValue, iconBgColor }: StatCardProps) {
  return (
    <div className="bg-white dark:bg-zinc-900 rounded-xl border border-zinc-200 dark:border-zinc-800 p-5 flex items-start gap-4">
      <div className={`p-3 rounded-lg ${iconBgColor}`}>{icon}</div>
      <div className="flex-1 min-w-0">
        <p className="text-sm text-zinc-500 dark:text-zinc-400">{title}</p>
        <p className="text-2xl font-bold text-zinc-900 dark:text-white mt-1">{value}</p>
        {subValue && (
          <p className="text-xs text-zinc-400 dark:text-zinc-500 mt-1 truncate">{subValue}</p>
        )}
      </div>
    </div>
  );
}

// 기능 항목 컴포넌트
interface FeatureItemProps {
  icon: React.ReactNode;
  text: string;
}

function FeatureItem({ icon, text }: FeatureItemProps) {
  return (
    <div className="flex items-center gap-2 text-sm text-zinc-600 dark:text-zinc-400">
      <span className="text-cyan-500">{icon}</span>
      <span>{text}</span>
    </div>
  );
}

export function GanttChartPage({ projectId }: GanttChartPageProps) {
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [tasks, setTasks] = useState<ConstructionTask[]>([]);
  const [milestones, setMilestones] = useState<Milestone[]>([]);
  const [dependencies, setDependencies] = useState<AnchorDependency[]>([]);

  // Supabase DataService 생성 (projectId 기반)
  const dataService = useMemo(
    () => createSupabaseGanttDataService(projectId, { debug: false }),
    [projectId]
  );

  // 초기 데이터 로드
  useEffect(() => {
    async function loadData() {
      try {
        setIsLoading(true);
        setError(null);
        const data = await dataService.loadAll();
        setTasks(data.tasks);
        setMilestones(data.milestones);
        setDependencies(data.dependencies);
      } catch (err) {
        console.error('Failed to load gantt data:', err);
        setError('간트차트 데이터를 불러오는데 실패했습니다.');
        toast.error('데이터 로드 실패', {
          description: '간트차트 데이터를 불러오는데 실패했습니다.',
        });
      } finally {
        setIsLoading(false);
      }
    }

    loadData();
  }, [dataService]);

  // 요약 통계 계산
  const stats = useMemo(() => {
    // CP 태스크 수
    const cpTasks = tasks.filter((t) => t.type === 'CP');

    // 마스터 마일스톤 수
    const masterMilestones = milestones.filter((m) => m.milestoneType === 'MASTER');

    // 다음 마일스톤 (현재 날짜 이후 가장 가까운 마일스톤)
    const now = new Date();
    const futureMilestones = milestones
      .filter((m) => new Date(m.date) > now)
      .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
    const nextMilestone = futureMilestones[0] || null;

    // D-day 계산
    let dDay: number | null = null;
    if (nextMilestone) {
      const diffTime = new Date(nextMilestone.date).getTime() - now.getTime();
      dDay = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    }

    // 공사기간 계산 (모든 태스크의 시작/종료일 기반)
    let minDate: Date | null = null;
    let maxDate: Date | null = null;
    let totalDays = 0;

    if (tasks.length > 0) {
      const allDates = tasks.flatMap((t) => [new Date(t.startDate), new Date(t.endDate)]);
      const validDates = allDates.filter((d) => !isNaN(d.getTime()));

      if (validDates.length > 0) {
        minDate = new Date(Math.min(...validDates.map((d) => d.getTime())));
        maxDate = new Date(Math.max(...validDates.map((d) => d.getTime())));
        totalDays = Math.ceil((maxDate.getTime() - minDate.getTime()) / (1000 * 60 * 60 * 24));
      }
    }

    return {
      totalTasks: tasks.length,
      cpTaskCount: cpTasks.length,
      totalMilestones: milestones.length,
      masterMilestoneCount: masterMilestones.length,
      dependencyCount: dependencies.length,
      nextMilestone,
      dDay,
      minDate,
      maxDate,
      totalDays,
    };
  }, [tasks, milestones, dependencies]);

  // 전체 화면에서 열기 핸들러
  const handleOpenFullscreen = useCallback(() => {
    window.open(`/projects/${projectId}/gantt`, '_blank', 'noopener,noreferrer');
  }, [projectId]);

  // 날짜 포맷팅 헬퍼
  const formatShortDate = (date: Date | null) => {
    if (!date) return '-';
    return date.toLocaleDateString('ko-KR', { month: '2-digit', day: '2-digit' });
  };

  if (isLoading) {
    return (
      <div className="w-full h-full flex items-center justify-center min-h-[400px]">
        <div className="flex flex-col items-center gap-4">
          <Loader2 className="w-8 h-8 animate-spin text-cyan-500" />
          <span className="text-zinc-500 dark:text-zinc-400">간트차트 데이터 로딩 중...</span>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="w-full h-full flex items-center justify-center min-h-[400px]">
        <div className="flex flex-col items-center gap-4 text-center">
          <div className="w-16 h-16 bg-red-50 dark:bg-red-900/20 rounded-full flex items-center justify-center">
            <span className="text-2xl">⚠️</span>
          </div>
          <h3 className="text-lg font-medium text-zinc-900 dark:text-white">오류 발생</h3>
          <p className="text-sm text-zinc-500 dark:text-zinc-400">{error}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="w-full h-full p-6 space-y-6 overflow-auto">
      {/* 헤더 */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-bold text-zinc-900 dark:text-white">📊 간트차트</h2>
          <p className="text-sm text-zinc-500 dark:text-zinc-400 mt-1">
            프로젝트 공정 현황을 한눈에 확인하세요
          </p>
        </div>
        <button
          onClick={handleOpenFullscreen}
          className="flex items-center gap-2 px-5 py-2.5 bg-cyan-600 hover:bg-cyan-700 text-white text-sm font-medium rounded-lg transition-colors shadow-sm"
        >
          <Rocket className="w-4 h-4" />
          간트앱 열기
          <ChevronRight className="w-4 h-4" />
        </button>
      </div>

      {/* 통계 카드 그리드 */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          icon={<ListTodo className="w-5 h-5 text-blue-600" />}
          iconBgColor="bg-blue-50 dark:bg-blue-900/20"
          title="총 태스크"
          value={`${stats.totalTasks}개`}
          subValue={stats.cpTaskCount > 0 ? `CP: ${stats.cpTaskCount}개` : undefined}
        />
        <StatCard
          icon={<Flag className="w-5 h-5 text-orange-600" />}
          iconBgColor="bg-orange-50 dark:bg-orange-900/20"
          title="마일스톤"
          value={`${stats.totalMilestones}개`}
          subValue={stats.masterMilestoneCount > 0 ? `주요: ${stats.masterMilestoneCount}개` : undefined}
        />
        <StatCard
          icon={<CalendarDays className="w-5 h-5 text-green-600" />}
          iconBgColor="bg-green-50 dark:bg-green-900/20"
          title="공사기간"
          value={stats.totalDays > 0 ? `${stats.totalDays}일` : '-'}
          subValue={
            stats.minDate && stats.maxDate
              ? `${formatShortDate(stats.minDate)} ~ ${formatShortDate(stats.maxDate)}`
              : '데이터 없음'
          }
        />
        <StatCard
          icon={<Clock className="w-5 h-5 text-purple-600" />}
          iconBgColor="bg-purple-50 dark:bg-purple-900/20"
          title="다음 마일스톤"
          value={stats.dDay !== null ? `D-${stats.dDay}` : '-'}
          subValue={stats.nextMilestone?.name || '예정된 마일스톤 없음'}
        />
      </div>

      {/* CTA 영역 */}
      <div className="bg-gradient-to-br from-zinc-50 to-zinc-100 dark:from-zinc-800/50 dark:to-zinc-900/50 rounded-xl border border-zinc-200 dark:border-zinc-700 p-8">
        <div className="flex flex-col items-center text-center space-y-6">
          <div className="w-16 h-16 bg-cyan-100 dark:bg-cyan-900/30 rounded-full flex items-center justify-center">
            <Rocket className="w-8 h-8 text-cyan-600 dark:text-cyan-400" />
          </div>

          <div className="space-y-2">
            <h3 className="text-lg font-semibold text-zinc-900 dark:text-white">
              전체 공정 관리를 위해 간트앱을 실행하세요
            </h3>
            <p className="text-sm text-zinc-500 dark:text-zinc-400 max-w-md">
              간트앱에서 태스크 생성, 일정 조정, 의존성 관리 등 모든 기능을 사용할 수 있습니다.
            </p>
          </div>

          <button
            onClick={handleOpenFullscreen}
            className="flex items-center gap-2 px-8 py-3 bg-cyan-600 hover:bg-cyan-700 text-white font-semibold rounded-xl transition-all shadow-lg hover:shadow-xl hover:scale-[1.02]"
          >
            <Rocket className="w-5 h-5" />
            간트앱 열기
          </button>

          {/* 기능 안내 */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 pt-4 border-t border-zinc-200 dark:border-zinc-700 w-full max-w-2xl">
            <FeatureItem icon={<ListTodo className="w-4 h-4" />} text="태스크 관리" />
            <FeatureItem icon={<Flag className="w-4 h-4" />} text="마일스톤 관리" />
            <FeatureItem icon={<Link2 className="w-4 h-4" />} text="의존성 연결" />
            <FeatureItem icon={<Undo2 className="w-4 h-4" />} text="Undo/Redo" />
          </div>
        </div>
      </div>

      {/* 데이터 요약 (선택적) */}
      {stats.dependencyCount > 0 && (
        <div className="flex items-center gap-2 text-sm text-zinc-500 dark:text-zinc-400">
          <Workflow className="w-4 h-4" />
          <span>
            현재 {stats.dependencyCount}개의 태스크 간 의존성이 설정되어 있습니다.
          </span>
        </div>
      )}
    </div>
  );
}
