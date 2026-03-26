'use client';

import { useEffect, useState, useCallback, useMemo } from 'react';
import { addDays } from 'date-fns';
import { createSupabaseGanttDataService, SupabaseGanttDataService } from '@/features/gantt/service/gantt-data.service';
import { getBuildings } from '@/features/building/shared/repository/buildings';
import { getProcessPlan } from '@/features/building/shared/repository/SupabaseBuildingDataService';
import { autoGenerateAllProcessPlans } from '@/features/building/process-plan/service/autoGenerateProcessPlans';
import { getProject } from '@/features/project/repository/projects';
import {
  convertProcessPlansToGanttTasks,
  CATEGORY_ORDER,
  getImportFloorLabelsForCategory,
} from '@/features/gantt/service/process-to-gantt-converter';
import type { ConversionResult } from '@/features/gantt/service/process-to-gantt-converter';
import type { Building, BuildingProcessPlan, ProcessCategory, ProcessType } from '@/shared/types';
import { getProcessModule } from '@/features/building/data/process-modules';
import { calculateModuleWorkDays, calculateModuleWorkDaysForFloor } from '@/features/building/process-plan/service/process-days-calculator';
import { toast } from 'sonner';
import type { ConstructionTask, Milestone, GroupDependency } from 'sa-gantt-lib';
import { logger } from '@/shared/utils/logger';
import {
  calculateGanttStats,
  aggregateCategoryDurations,
  compressFloorLabels,
  formatShortDate,
  type BuildingCategoryDurations,
} from './gantt-chart-helpers';

// ── 타입 ──

const UNDERGROUND_CATEGORIES = new Set<ProcessCategory>([
  '버림', '기초', '주동 지하층', '지하층(층고6.5m이상)', '지하주차장',
]);

export interface CategoryPreview {
  category: ProcessCategory;
  netDays: number;
  indirectDays: number;
  totalDays: number;
  processType: ProcessType;
  floorLabelsDisplay: string;
  group: 'underground' | 'aboveground';
}

export interface BuildingPreview {
  name: string;
  taskCount: number;
  preWorkDays: number;
  temporaryWorkDays: number;
  earthRetentionWorkDays: number;
  earthworkWorkDays: number;
  structureStartDate: Date;
  categories: CategoryPreview[];
}

// ── 훅 ──

export function useGanttChartPage(projectId: string, projectNumber: number) {
  const [isLoading, setIsLoading] = useState(true);
  const [isImporting, setIsImporting] = useState(false);
  const [isRefreshingPreview, setIsRefreshingPreview] = useState(false);
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
    categoryDurations: BuildingCategoryDurations;
  } | null>(null);
  const [expandedBuildings, setExpandedBuildings] = useState<Set<string>>(new Set());

  const dataService = useMemo(
    () => createSupabaseGanttDataService(projectId, { debug: false }),
    [projectId]
  );

  // ── 데이터 로드 ──
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
      toast.error('데이터 로드 실패', { description: '간트차트 데이터를 불러오는데 실패했습니다.' });
    } finally {
      setIsLoading(false);
    }
  }, [dataService]);

  useEffect(() => { loadGanttData(); }, [loadGanttData]);

  // ── 통계 ──
  const stats = useMemo(
    () => calculateGanttStats(tasks, milestones, dependencies),
    [tasks, milestones, dependencies]
  );

  // ── 전체 화면 열기 ──
  const handleOpenFullscreen = useCallback(() => {
    window.open(`/projects/${projectNumber}/gantt`, '_blank', 'noopener,noreferrer');
  }, [projectNumber]);

  // ── 동별 미리보기 계산 ──
  const buildingPreviews = useMemo((): BuildingPreview[] => {
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
        const structureStartDate = preWorkDays > 0 ? addDays(selectedDate, preWorkDays) : selectedDate;

        const categories: CategoryPreview[] = [];
        for (const category of CATEGORY_ORDER) {
          const processInfo = plan.processes[category];
          const floorLabels = getImportFloorLabelsForCategory(building, plan, category);
          const hasFloors = floorLabels.length > 0 && !(floorLabels.length === 1 && floorLabels[0] === '');

          if ((category === '지하주차장' || category === '지하층(층고6.5m이상)') && !hasFloors) continue;

          const allowSpecialFallback =
            (category === '지하주차장' || category === '지하층(층고6.5m이상)') && hasFloors;
          if (!processInfo && !allowSpecialFallback) continue;

          const processType = processInfo?.processType || '표준공정';
          const computed = importPreview.categoryDurations.get(building.buildingName)?.get(category);

          let netDays = computed?.netDays ?? 0;
          let indirectDays = computed?.indirectDays ?? 0;
          let totalDays = computed?.totalDays ?? 0;

          if (!computed) {
            const mod = getProcessModule(category, processType);
            let days = processInfo?.days || 0;
            if (days === 0 && mod) {
              if (hasFloors && category !== '지하주차장' && category !== '지하층(층고6.5m이상)') {
                days = floorLabels.reduce((sum, fl) =>
                  sum + calculateModuleWorkDaysForFloor(building, mod, category, fl), 0);
              } else if (!hasFloors) {
                days = calculateModuleWorkDays(building, mod, category);
              }
            }
            netDays = days;
            indirectDays = 0;
            totalDays = days;
          }

          const mod = getProcessModule(category, processType);
          if (!mod && totalDays === 0) continue;

          categories.push({
            category, netDays, indirectDays, totalDays, processType,
            floorLabelsDisplay: compressFloorLabels(floorLabels.filter(l => l !== '')),
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

  // ── Import 미리보기 로드 ──
  const loadImportPreview = useCallback(async (options?: {
    openModal?: boolean;
    preserveStartDate?: boolean;
    notifyOnSuccess?: boolean;
  }) => {
    const { openModal = false, preserveStartDate = false, notifyOnSuccess = false } = options || {};

    try {
      setIsRefreshingPreview(true);

      const buildings = await getBuildings(projectId);
      if (buildings.length === 0) { toast.error('등록된 동이 없습니다. 먼저 동을 추가해주세요.'); return; }

      const processPlans = new Map<string, BuildingProcessPlan>();
      for (const building of buildings) {
        try {
          const plan = await getProcessPlan(building.id);
          if (plan && plan.totalDays > 0) processPlans.set(building.id, plan);
        } catch { /* skip */ }
      }

      if (processPlans.size === 0) { toast.error('가져올 공정계획이 없습니다. 먼저 공정계획을 작성해주세요.'); return; }

      const project = await getProject(projectId);
      if (!project) { toast.error('프로젝트 정보를 불러올 수 없습니다.'); return; }

      const defaultStartDate = project.start_date;
      const effectiveStartDate = preserveStartDate && importStartDate ? importStartDate : defaultStartDate;
      const projectStartDate = new Date(effectiveStartDate + 'T00:00:00');

      const { tasks: convertedTasks, summary } = convertProcessPlansToGanttTasks({
        buildings, processPlans, projectStartDate,
      });
      const categoryDurations = aggregateCategoryDurations(convertedTasks);

      setImportStartDate(effectiveStartDate);
      setImportPreview({ buildings, processPlans, summary, categoryDurations });
      setExpandedBuildings(new Set(buildings.map(b => b.buildingName)));
      if (openModal) setShowImportModal(true);
      if (notifyOnSuccess) toast.success('세부공정을 재생성하여 최신 공정계획을 불러왔습니다.');
    } catch (err) {
      logger.error('Import preview reload failed:', err);
      toast.error('최신 공정계획 데이터를 불러오는데 실패했습니다.');
    } finally {
      setIsRefreshingPreview(false);
    }
  }, [projectId, importStartDate]);

  // ── Import 실행 ──
  const handleImportFromProcessPlan = useCallback(async () => {
    await loadImportPreview({ openModal: true, preserveStartDate: false, notifyOnSuccess: false });
  }, [loadImportPreview]);

  // ── 자동 생성 후 가져오기 (원클릭) ──
  const handleAutoGenerateAndImport = useCallback(async () => {
    try {
      setIsImporting(true);
      toast.info('공정계획 자동 생성 중...');

      const result = await autoGenerateAllProcessPlans(projectId);

      if (result.generatedCount === 0) {
        toast.error(`공정계획을 생성할 수 없습니다. 동 기본정보(물량)를 먼저 입력해주세요. (${result.skippedCount}개 동 건너뜀)`);
        return;
      }

      if (result.errors.length > 0) {
        toast.warning(`${result.generatedCount}개 동 생성 완료, ${result.errors.length}개 오류 발생`);
      } else {
        toast.success(`${result.generatedCount}개 동의 공정계획이 자동 생성되었습니다.`);
      }

      // 생성 후 바로 가져오기 모달 열기
      await loadImportPreview({ openModal: true, preserveStartDate: false });
    } catch (err) {
      logger.error('Auto-generate process plans failed:', err);
      toast.error('공정계획 자동 생성에 실패했습니다.');
    } finally {
      setIsImporting(false);
    }
  }, [projectId, loadImportPreview]);

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

      setShowImportModal(false);
      setImportPreview(null);
      setImportStartDate('');
      await loadGanttData();
    } catch (err) {
      logger.error('Import from process plan failed:', err);
      toast.error('공정계획 가져오기에 실패했습니다.');
    } finally {
      setIsImporting(false);
    }
  }, [importPreview, importStartDate, projectId, loadGanttData]);

  // ── 모달 토글 ──
  const toggleBuildingExpanded = useCallback((name: string) => {
    setExpandedBuildings(prev => {
      const next = new Set(prev);
      if (next.has(name)) next.delete(name); else next.add(name);
      return next;
    });
  }, []);

  const closeImportModal = useCallback(() => {
    if (!isImporting && !isRefreshingPreview) setShowImportModal(false);
  }, [isImporting, isRefreshingPreview]);

  return {
    // state
    isLoading, isImporting, isRefreshingPreview, error,
    stats,
    // import modal
    showImportModal, importStartDate, importPreview,
    expandedBuildings, buildingPreviews,
    setImportStartDate,
    // handlers
    handleOpenFullscreen,
    handleImportFromProcessPlan,
    handleAutoGenerateAndImport,
    handleConfirmImport,
    loadImportPreview,
    toggleBuildingExpanded,
    closeImportModal,
    // utils
    formatShortDate,
  };
}
