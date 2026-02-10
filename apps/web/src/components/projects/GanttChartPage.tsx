'use client';

import { useEffect, useState, useCallback, useMemo } from 'react';
import { addDays } from 'date-fns';
import { createSupabaseGanttDataService, SupabaseGanttDataService } from '@/lib/services/SupabaseGanttDataService';
import { getBuildings } from '@/lib/services/buildings';
import { getProject } from '@/lib/services/projects';
import {
  convertProcessPlansToGanttTasks,
  CATEGORY_ORDER,
  getImportFloorLabelsForCategory,
} from '@/lib/utils/process-to-gantt-converter';
import type { ConversionResult } from '@/lib/utils/process-to-gantt-converter';
import type { Building, BuildingProcessPlan, ProcessCategory, ProcessType } from '@/lib/types';
import { getProcessModule } from '@/lib/data/process-modules';
import { calculateModuleWorkDays, calculateModuleWorkDaysForFloor } from '@/lib/utils/process-days-calculator';
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
  X,
  ChevronDown,
  ChevronRight,
} from 'lucide-react';
import type { ConstructionTask, Milestone, GroupDependency } from 'sa-gantt-lib';
import { logger } from '@/lib/utils/logger';

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

// 지하 공정 카테고리 Set
const UNDERGROUND_CATEGORIES = new Set<ProcessCategory>([
  '버림', '기초', '주동 지하층', '지하층(층고6.5m이상)', '지하주차장',
]);

interface CategoryPreview {
  category: ProcessCategory;
  days: number;
  processType: ProcessType;
  floorLabelsDisplay: string;
  group: 'underground' | 'aboveground';
}

/**
 * 층 라벨 배열을 연속 범위로 압축
 * ['4F','5F','6F',...,'15F'] → '4F~15F'
 * ['B2','B1'] → 'B2, B1'
 * [''] → ''
 */
function compressFloorLabels(labels: string[]): string {
  if (labels.length === 0 || (labels.length === 1 && labels[0] === '')) return '';

  // 라벨을 prefix + 숫자 + suffix로 파싱
  const parsed = labels.map((label) => {
    const match = label.match(/^([A-Za-z]*)(\d+)([A-Za-z]*)$/);
    if (!match) return { raw: label, prefix: '', num: NaN, suffix: '' };
    return { raw: label, prefix: match[1], num: parseInt(match[2], 10), suffix: match[3] };
  });

  // 같은 prefix+suffix 그룹 내 연속 숫자를 범위로 묶기
  const parts: string[] = [];
  let i = 0;
  while (i < parsed.length) {
    const cur = parsed[i];
    if (isNaN(cur.num)) {
      parts.push(cur.raw);
      i++;
      continue;
    }

    // 같은 그룹의 연속 숫자 찾기
    let j = i + 1;
    while (
      j < parsed.length &&
      parsed[j].prefix === cur.prefix &&
      parsed[j].suffix === cur.suffix &&
      parsed[j].num === parsed[j - 1].num + 1
    ) {
      j++;
    }

    const rangeLen = j - i;
    if (rangeLen >= 3) {
      const last = parsed[j - 1];
      parts.push(`${cur.prefix}${cur.num}${cur.suffix}~${last.prefix}${last.num}${last.suffix}`);
    } else {
      for (let k = i; k < j; k++) parts.push(parsed[k].raw);
    }
    i = j;
  }

  return parts.join(', ');
}

export function GanttChartPage({ projectId, projectNumber }: GanttChartPageProps) {
  const [isLoading, setIsLoading] = useState(true);
  const [isImporting, setIsImporting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [tasks, setTasks] = useState<ConstructionTask[]>([]);
  const [milestones, setMilestones] = useState<Milestone[]>([]);
  const [dependencies, setDependencies] = useState<GroupDependency[]>([]);

  // 가져오기 모달 상태
  const [showImportModal, setShowImportModal] = useState(false);
  const [importStartDate, setImportStartDate] = useState('');
  const [importPreview, setImportPreview] = useState<{
    buildings: Building[];
    processPlans: Map<string, BuildingProcessPlan>;
    summary: ConversionResult['summary'];
  } | null>(null);
  const [expandedBuildings, setExpandedBuildings] = useState<Set<string>>(new Set());

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
      logger.error('Failed to load gantt data:', err);
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

  // 동별 미리보기 계산 (날짜 변경 시 재계산)
  const buildingPreviews = useMemo(() => {
    if (!importPreview || !importStartDate) return [];

    const selectedDate = new Date(importStartDate + 'T00:00:00');

    return importPreview.buildings
      .filter(b => importPreview.processPlans.has(b.id))
      .map(building => {
        const plan = importPreview.processPlans.get(building.id)!;
        const preWorkDays =
          (plan.temporaryWorkDays || 0) +
          (plan.earthRetentionWorkDays || 0) +
          (plan.earthworkWorkDays || 0);
        const structureStartDate = preWorkDays > 0
          ? addDays(selectedDate, preWorkDays)
          : selectedDate;

        // 카테고리별 상세 정보 추출
        const categories: CategoryPreview[] = [];
        for (const category of CATEGORY_ORDER) {
          const processInfo = plan.processes[category];
          const floorLabels = getImportFloorLabelsForCategory(building, plan, category);
          const hasFloors = floorLabels.length > 0
            && !(floorLabels.length === 1 && floorLabels[0] === '');
          const allowSpecialFallback =
            (category === '지하주차장' || category === '지하층(층고6.5m이상)') &&
            hasFloors;
          if (!processInfo && !allowSpecialFallback) continue;

          const processType = processInfo?.processType || '표준공정';
          const mod = getProcessModule(category, processType);
          let days = processInfo?.days || 0;

          // 저장된 days가 0이면 on-the-fly 계산 (특수행 카테고리는 processInfo.days 우선)
          if (days === 0 && mod) {
            if (
              hasFloors &&
              category !== '지하주차장' &&
              category !== '지하층(층고6.5m이상)'
            ) {
              days = floorLabels.reduce((sum, fl) =>
                sum + calculateModuleWorkDaysForFloor(building, mod, category, fl), 0);
            } else if (!hasFloors) {
              days = calculateModuleWorkDays(building, mod, category);
            }
          }

          const displayLabels = compressFloorLabels(floorLabels.filter(l => l !== ''));
          categories.push({
            category, days, processType, floorLabelsDisplay: displayLabels,
            group: UNDERGROUND_CATEGORIES.has(category) ? 'underground' : 'aboveground',
          });
        }

        return {
          name: building.buildingName,
          taskCount: importPreview.summary.taskCountByBuilding[building.buildingName] || 0,
          preWorkDays,
          temporaryWorkDays: plan.temporaryWorkDays || 0,
          earthRetentionWorkDays: plan.earthRetentionWorkDays || 0,
          earthworkWorkDays: plan.earthworkWorkDays || 0,
          structureStartDate,
          categories,
        };
      });
  }, [importPreview, importStartDate]);

  // 공정계획에서 가져오기 핸들러 (모달 오픈)
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

      // 4. 변환 미리보기 계산
      const projectStartDate = new Date(project.start_date + 'T00:00:00');
      const { summary } = convertProcessPlansToGanttTasks({
        buildings,
        processPlans,
        projectStartDate,
      });

      // 5. 모달 상태 설정 + 오픈
      setImportStartDate(project.start_date);
      setImportPreview({ buildings, processPlans, summary });
      setExpandedBuildings(new Set(buildings.map(b => b.buildingName)));
      setShowImportModal(true);
    } catch (err) {
      logger.error('Import preview failed:', err);
      toast.error('공정계획 데이터를 불러오는데 실패했습니다.');
    }
  }, [projectId]);

  // 가져오기 확인 핸들러 (실제 변환 + 저장)
  const handleConfirmImport = useCallback(async () => {
    if (!importPreview || !importStartDate) return;

    try {
      setIsImporting(true);
      const selectedDate = new Date(importStartDate + 'T00:00:00');

      const { tasks: newTasks, summary } = convertProcessPlansToGanttTasks({
        buildings: importPreview.buildings,
        processPlans: importPreview.processPlans,
        projectStartDate: selectedDate,
      });

      const service = new SupabaseGanttDataService(projectId);
      await service.appendTasks(newTasks);

      toast.success(`${summary.totalTaskCount}개 태스크가 간트차트에 추가되었습니다.`);

      // 모달 닫기 + 상태 초기화
      setShowImportModal(false);
      setImportPreview(null);
      setImportStartDate('');

      // 간트차트 데이터 리로드
      await loadGanttData();
    } catch (err) {
      logger.error('Import from process plan failed:', err);
      toast.error('공정계획 가져오기에 실패했습니다.');
    } finally {
      setIsImporting(false);
    }
  }, [importPreview, importStartDate, projectId, loadGanttData]);

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
              onClick={handleImportFromProcessPlan}
              disabled={isImporting}
              className="flex items-center gap-2 px-6 py-3 bg-blue-600 hover:bg-blue-700 text-white font-semibold rounded-xl transition-all shadow-md hover:shadow-lg hover:scale-[1.02] disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <Upload className="w-5 h-5" />
              {isImporting ? '가져오는 중...' : '공정계획에서 가져오기'}
            </button>
            <button
              onClick={handleOpenFullscreen}
              className="flex items-center gap-2 px-8 py-3 bg-zinc-900 hover:bg-black text-white dark:bg-white dark:hover:bg-zinc-200 dark:text-zinc-900 font-semibold rounded-xl transition-all shadow-lg hover:shadow-xl hover:scale-[1.02]"
            >
              <Rocket className="w-5 h-5" />
              간트앱 열기
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

      {/* 가져오기 모달 */}
      {showImportModal && importPreview && (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
          {/* 오버레이 */}
          <div
            className="absolute inset-0 bg-black/50"
            onClick={() => !isImporting && setShowImportModal(false)}
          />

          {/* 모달 */}
          <div className="relative bg-white dark:bg-zinc-900 rounded-2xl border border-zinc-200 dark:border-zinc-700 shadow-2xl w-full max-w-2xl mx-4 max-h-[90vh] flex flex-col">
            {/* 헤더 */}
            <div className="flex items-center justify-between p-6 pb-4 border-b border-zinc-200 dark:border-zinc-700">
              <h2 className="text-lg font-semibold text-zinc-900 dark:text-white">
                공정계획에서 가져오기
              </h2>
              <button
                onClick={() => !isImporting && setShowImportModal(false)}
                className="p-1.5 rounded-lg hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors"
                disabled={isImporting}
              >
                <X className="w-5 h-5 text-zinc-500" />
              </button>
            </div>

            {/* 바디 */}
            <div className="p-6 space-y-5 overflow-y-auto flex-1 min-h-0">
              {/* 시작일 선택 + 요약 */}
              <div className="flex items-end gap-4">
                <div className="flex-1">
                  <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-2">
                    시작일
                  </label>
                  <input
                    type="date"
                    value={importStartDate}
                    onChange={(e) => setImportStartDate(e.target.value)}
                    className="w-full px-3 py-2.5 border border-zinc-300 dark:border-zinc-600 rounded-lg bg-white dark:bg-zinc-800 text-zinc-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-colors"
                  />
                </div>
                <div className="flex gap-3">
                  <div className="bg-zinc-50 dark:bg-zinc-800 rounded-lg px-4 py-2.5 text-center">
                    <p className="text-xs text-zinc-500 dark:text-zinc-400">대상 동</p>
                    <p className="text-lg font-bold text-zinc-900 dark:text-white">
                      {importPreview.summary.buildingCount}개
                    </p>
                  </div>
                  <div className="bg-zinc-50 dark:bg-zinc-800 rounded-lg px-4 py-2.5 text-center">
                    <p className="text-xs text-zinc-500 dark:text-zinc-400">총 태스크</p>
                    <p className="text-lg font-bold text-zinc-900 dark:text-white">
                      {importPreview.summary.totalTaskCount}개
                    </p>
                  </div>
                </div>
              </div>

              {/* 동별 카테고리 상세 */}
              {buildingPreviews.length > 0 && (
                <div className="border border-zinc-200 dark:border-zinc-700 rounded-lg divide-y divide-zinc-200 dark:divide-zinc-700">
                  {buildingPreviews.map((bp) => {
                    const isExpanded = expandedBuildings.has(bp.name);
                    const undergroundCats = bp.categories.filter(c => c.group === 'underground');
                    const abovegroundCats = bp.categories.filter(c => c.group === 'aboveground');

                    return (
                      <div key={bp.name}>
                        {/* 동 헤더 — 클릭으로 펼치기/접기 */}
                        <button
                          type="button"
                          onClick={() => {
                            setExpandedBuildings(prev => {
                              const next = new Set(prev);
                              if (next.has(bp.name)) next.delete(bp.name);
                              else next.add(bp.name);
                              return next;
                            });
                          }}
                          className="w-full flex items-center justify-between px-4 py-3 hover:bg-zinc-50 dark:hover:bg-zinc-800/50 transition-colors text-left"
                        >
                          <div className="flex items-center gap-2">
                            {isExpanded
                              ? <ChevronDown className="w-4 h-4 text-zinc-400" />
                              : <ChevronRight className="w-4 h-4 text-zinc-400" />
                            }
                            <span className="text-sm font-semibold text-zinc-900 dark:text-white">
                              {bp.name}
                            </span>
                          </div>
                          <span className="text-xs text-zinc-500 dark:text-zinc-400">
                            {bp.taskCount}개 태스크
                          </span>
                        </button>

                        {/* 펼친 상태 — 상세 내용 */}
                        {isExpanded && (
                          <div className="px-4 pb-4 space-y-3">
                            {/* 기본 정보 */}
                            <div className="text-xs text-zinc-500 dark:text-zinc-400 space-y-0.5 pl-6">
                              <p>
                                구조체 시작:{' '}
                                <span className="font-medium text-zinc-700 dark:text-zinc-300">
                                  {bp.structureStartDate.toLocaleDateString('ko-KR', {
                                    year: 'numeric',
                                    month: '2-digit',
                                    day: '2-digit',
                                  })}
                                </span>
                              </p>
                              <p>
                                가설+흙막이+토공사: {bp.preWorkDays}일
                                <span className="text-zinc-400 dark:text-zinc-500 ml-1">
                                  ({bp.temporaryWorkDays}+{bp.earthRetentionWorkDays}+{bp.earthworkWorkDays})
                                </span>
                              </p>
                            </div>

                            {/* 지하 공정 */}
                            {undergroundCats.length > 0 && (
                              <div className="pl-6">
                                <div className="flex items-center gap-1.5 mb-1.5">
                                  <span className="w-2 h-2 rounded-sm bg-blue-500" />
                                  <span className="text-xs font-medium text-zinc-600 dark:text-zinc-400">
                                    지하 공정
                                  </span>
                                </div>
                                <div className="space-y-1">
                                  {undergroundCats.map(cat => (
                                    <div
                                      key={cat.category}
                                      className="flex items-center text-xs text-zinc-700 dark:text-zinc-300 gap-2"
                                    >
                                      <span className="min-w-[100px] truncate">{cat.category}</span>
                                      <span className="tabular-nums w-12 text-right">{cat.days}일</span>
                                      <span className="text-zinc-500 dark:text-zinc-400 w-20 truncate">
                                        {cat.processType}
                                      </span>
                                      {cat.floorLabelsDisplay && (
                                        <span className="ml-auto text-zinc-400 dark:text-zinc-500 truncate">
                                          {cat.floorLabelsDisplay}
                                        </span>
                                      )}
                                    </div>
                                  ))}
                                </div>
                              </div>
                            )}

                            {/* 지상 공정 */}
                            {abovegroundCats.length > 0 && (
                              <div className="pl-6">
                                <div className="flex items-center gap-1.5 mb-1.5">
                                  <span className="w-2 h-2 rounded-sm bg-green-500" />
                                  <span className="text-xs font-medium text-zinc-600 dark:text-zinc-400">
                                    지상 공정
                                  </span>
                                </div>
                                <div className="space-y-1">
                                  {abovegroundCats.map(cat => (
                                    <div
                                      key={cat.category}
                                      className="flex items-center text-xs text-zinc-700 dark:text-zinc-300 gap-2"
                                    >
                                      <span className="min-w-[100px] truncate">{cat.category}</span>
                                      <span className="tabular-nums w-12 text-right">{cat.days}일</span>
                                      <span className="text-zinc-500 dark:text-zinc-400 w-20 truncate">
                                        {cat.processType}
                                      </span>
                                      {cat.floorLabelsDisplay && (
                                        <span className="ml-auto text-zinc-400 dark:text-zinc-500 truncate">
                                          {cat.floorLabelsDisplay}
                                        </span>
                                      )}
                                    </div>
                                  ))}
                                </div>
                              </div>
                            )}
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}

              {/* 안내 */}
              <p className="text-xs text-amber-600 dark:text-amber-400 bg-amber-50 dark:bg-amber-900/20 px-3 py-2 rounded-lg">
                기존 간트차트 데이터에 추가됩니다.
              </p>
            </div>

            {/* 푸터 */}
            <div className="flex items-center justify-end gap-3 p-6 pt-4 border-t border-zinc-200 dark:border-zinc-700">
              <button
                onClick={() => setShowImportModal(false)}
                disabled={isImporting}
                className="px-4 py-2.5 text-sm font-medium text-zinc-700 dark:text-zinc-300 bg-zinc-100 dark:bg-zinc-800 hover:bg-zinc-200 dark:hover:bg-zinc-700 rounded-lg transition-colors disabled:opacity-50"
              >
                취소
              </button>
              <button
                onClick={handleConfirmImport}
                disabled={isImporting || !importStartDate}
                className="flex items-center gap-2 px-5 py-2.5 text-sm font-semibold text-white bg-blue-600 hover:bg-blue-700 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isImporting ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    가져오는 중...
                  </>
                ) : (
                  <>
                    <Upload className="w-4 h-4" />
                    가져오기
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
