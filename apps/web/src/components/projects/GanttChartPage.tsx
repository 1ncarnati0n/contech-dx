'use client';

import { useEffect, useState, useCallback, useMemo } from 'react';
import { createSupabaseGanttDataService, SupabaseGanttDataService } from '@/lib/services/SupabaseGanttDataService';
import { getBuildings } from '@/lib/services/buildings';
import { getProject } from '@/lib/services/projects';
import { convertProcessPlansToGanttTasks } from '@/lib/utils/process-to-gantt-converter';
import type { Building, BuildingProcessPlan } from '@/lib/types';
import { toast } from 'sonner';
import {
  Loader2,
  ListTodo,
  Flag,
  CalendarDays,
  Clock,
  Rocket,
  Workflow,
  Link2,
  Undo2,
  Upload,
} from 'lucide-react';
import type { ConstructionTask, Milestone, GroupDependency } from 'sa-gantt-lib';

interface GanttChartPageProps {
  projectId: string;
  projectNumber: number;
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
      <span className="text-accent-500">{icon}</span>
      <span>{text}</span>
    </div>
  );
}

export function GanttChartPage({ projectId, projectNumber }: GanttChartPageProps) {
  const [isLoading, setIsLoading] = useState(true);
  const [isImporting, setIsImporting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [tasks, setTasks] = useState<ConstructionTask[]>([]);
  const [milestones, setMilestones] = useState<Milestone[]>([]);
  const [dependencies, setDependencies] = useState<GroupDependency[]>([]);

  // Supabase DataService 생성 (projectId 기반)
  const dataService = useMemo(
    () => createSupabaseGanttDataService(projectId, { debug: false }),
    [projectId]
  );

  // 간트차트 데이터 로드 함수
  const loadGanttData = useCallback(async () => {
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
  }, [dataService]);

  // 초기 데이터 로드
  useEffect(() => {
    loadGanttData();
  }, [loadGanttData]);

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
    window.open(`/projects/${projectNumber}/gantt`, '_blank', 'noopener,noreferrer');
  }, [projectNumber]);

  // 공정계획에서 가져오기 핸들러
  const handleImportFromProcessPlan = useCallback(async () => {
    try {
      // 1. 동 목록 로드
      const buildings = await getBuildings(projectId);
      if (buildings.length === 0) {
        toast.error('등록된 동이 없습니다. 먼저 동을 추가해주세요.');
        return;
      }

      // 2. 각 동의 localStorage에서 공정계획 로드
      const processPlans = new Map<string, BuildingProcessPlan>();
      for (const building of buildings) {
        const storageKey = `contech_process_plan_${building.id}`;
        const storedJson = localStorage.getItem(storageKey);
        if (storedJson) {
          try {
            const plan = JSON.parse(storedJson) as BuildingProcessPlan;
            if (plan.totalDays > 0) {
              processPlans.set(building.id, plan);
            }
          } catch {
            // 파싱 실패한 항목은 건너뜀
          }
        }
      }

      if (processPlans.size === 0) {
        toast.error('가져올 공정계획이 없습니다. 먼저 공정계획을 작성해주세요.');
        return;
      }

      // 3. 프로젝트 시작일 가져오기
      const project = await getProject(projectId);
      if (!project) {
        toast.error('프로젝트 정보를 불러올 수 없습니다.');
        return;
      }

      const projectStartDate = new Date(project.start_date + 'T00:00:00');

      // 4. 변환 미리보기 (태스크 수 계산)
      const { summary } = convertProcessPlansToGanttTasks({
        buildings,
        processPlans,
        projectStartDate,
      });

      // 5. 확인 다이얼로그
      const buildingSummary = Object.entries(summary.taskCountByBuilding)
        .map(([name, count]) => `  ${name}: ${count}개`)
        .join('\n');

      const confirmed = window.confirm(
        `공정계획에서 가져오기\n\n` +
        `대상 동: ${summary.buildingCount}개\n` +
        `생성될 태스크: ${summary.totalTaskCount}개\n` +
        `프로젝트 시작일: ${project.start_date}\n\n` +
        `동별 태스크 수:\n${buildingSummary}\n\n` +
        `기존 간트차트 데이터에 추가됩니다. 계속하시겠습니까?`
      );

      if (!confirmed) return;

      setIsImporting(true);

      // 6. 실제 변환 + 저장
      const { tasks: newTasks } = convertProcessPlansToGanttTasks({
        buildings,
        processPlans,
        projectStartDate,
      });

      const service = new SupabaseGanttDataService(projectId);
      await service.appendTasks(newTasks);

      toast.success(`${summary.totalTaskCount}개 태스크가 간트차트에 추가되었습니다.`);

      // 7. 간트차트 데이터 리로드 (stats 업데이트)
      await loadGanttData();
    } catch (error) {
      console.error('Import from process plan failed:', error);
      toast.error('공정계획 가져오기에 실패했습니다.');
    } finally {
      setIsImporting(false);
    }
  }, [projectId, loadGanttData]);

  // 날짜 포맷팅 헬퍼
  const formatShortDate = (date: Date | null) => {
    if (!date) return '-';
    return date.toLocaleDateString('ko-KR', { month: '2-digit', day: '2-digit' });
  };

  if (isLoading) {
    return (
      <div className="w-full h-full flex items-center justify-center min-h-[400px]">
        <div className="flex flex-col items-center gap-4">
          <Loader2 className="w-8 h-8 animate-spin text-accent-500" />
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
    <div className="space-y-6">
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
          <div className="w-16 h-16 bg-accent-100 dark:bg-accent-900/20 rounded-full flex items-center justify-center">
            <Rocket className="w-8 h-8 text-accent-600 dark:text-accent-400" />
          </div>

          <div className="space-y-2">
            <h3 className="text-lg font-semibold text-zinc-900 dark:text-white">
              전체 공정 관리를 위해 간트앱을 실행하세요
            </h3>
            <p className="text-sm text-zinc-500 dark:text-zinc-400 max-w-md">
              간트앱에서 태스크 생성, 일정 조정, 의존성 관리 등 모든 기능을 사용할 수 있습니다.
            </p>
          </div>

          <div className="flex flex-row items-center gap-3">
            <button
              onClick={handleOpenFullscreen}
              className="flex items-center gap-2 px-8 py-3 bg-zinc-900 hover:bg-black text-white dark:bg-white dark:hover:bg-zinc-200 dark:text-zinc-900 font-semibold rounded-xl transition-all shadow-lg hover:shadow-xl hover:scale-[1.02]"
            >
              <Rocket className="w-5 h-5" />
              간트앱 열기
            </button>
            <button
              onClick={handleImportFromProcessPlan}
              disabled={isImporting}
              className="flex items-center gap-2 px-6 py-3 bg-blue-600 hover:bg-blue-700 text-white font-semibold rounded-xl transition-all shadow-md hover:shadow-lg hover:scale-[1.02] disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <Upload className="w-5 h-5" />
              {isImporting ? '가져오는 중...' : '공정계획에서 가져오기'}
            </button>
          </div>

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
