import type { ConstructionTask, Milestone, GroupDependency } from 'sa-gantt-lib';
import type { ProcessCategory } from '@/shared/types';
import { CATEGORY_ORDER } from '@/features/gantt/service/process-to-gantt-converter';

// ── 타입 ──

export interface CategoryDurationBreakdown {
  netDays: number;
  indirectDays: number;
  totalDays: number;
}

export type BuildingCategoryDurations = Map<string, Map<ProcessCategory, CategoryDurationBreakdown>>;

export interface GanttStats {
  totalTasks: number;
  cpTaskCount: number;
  totalMilestones: number;
  masterMilestoneCount: number;
  dependencyCount: number;
  nextMilestone: Milestone | null;
  dDay: number | null;
  minDate: Date | null;
  maxDate: Date | null;
  totalDays: number;
}

// ── 층 라벨 압축 ──

/**
 * 층 라벨 배열을 연속 범위로 압축
 * ['4F','5F','6F',...,'15F'] → '4F~15F'
 * ['B2','B1'] → 'B2, B1'
 */
export function compressFloorLabels(labels: string[]): string {
  if (labels.length === 0 || (labels.length === 1 && labels[0] === '')) return '';

  const parsed = labels.map((label) => {
    const match = label.match(/^([A-Za-z]*)(\d+)([A-Za-z]*)$/);
    if (!match) return { raw: label, prefix: '', num: NaN, suffix: '' };
    return { raw: label, prefix: match[1], num: parseInt(match[2], 10), suffix: match[3] };
  });

  const parts: string[] = [];
  let i = 0;
  while (i < parsed.length) {
    const cur = parsed[i];
    if (isNaN(cur.num)) {
      parts.push(cur.raw);
      i++;
      continue;
    }

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

// ── 카테고리별 공기 집계 ──

export function aggregateCategoryDurations(tasks: ConstructionTask[]): BuildingCategoryDurations {
  const taskMap = new Map<string, ConstructionTask>();
  tasks.forEach((task) => taskMap.set(task.id, task));

  const categorySet = new Set<ProcessCategory>(CATEGORY_ORDER);
  const durationsByBuilding: BuildingCategoryDurations = new Map();

  for (const task of tasks) {
    if (task.type !== 'TASK' || !task.task) continue;

    let currentParentId: string | null = task.parentId;
    let cpTask: ConstructionTask | null = null;
    let blockTask: ConstructionTask | null = null;

    while (currentParentId) {
      const parent = taskMap.get(currentParentId);
      if (!parent) break;
      if (!cpTask && parent.type === 'CP') cpTask = parent;
      if (parent.type === 'BLOCK') { blockTask = parent; break; }
      currentParentId = parent.parentId;
    }

    if (!cpTask || !blockTask) continue;

    const category = cpTask.name as ProcessCategory;
    if (!categorySet.has(category)) continue;

    const buildingName = blockTask.name;
    const netDays = task.task.netWorkDays ?? 0;
    const indirectDays = (task.task.indirectWorkDaysPre ?? 0) + (task.task.indirectWorkDaysPost ?? 0);

    const categoryDurations = durationsByBuilding.get(buildingName) || new Map<ProcessCategory, CategoryDurationBreakdown>();
    const current = categoryDurations.get(category) || { netDays: 0, indirectDays: 0, totalDays: 0 };

    current.netDays += netDays;
    current.indirectDays += indirectDays;
    current.totalDays = current.netDays + current.indirectDays;
    categoryDurations.set(category, current);
    durationsByBuilding.set(buildingName, categoryDurations);
  }

  return durationsByBuilding;
}

// ── 통계 계산 ──

export function calculateGanttStats(
  tasks: ConstructionTask[],
  milestones: Milestone[],
  dependencies: GroupDependency[],
): GanttStats {
  const cpTasks = tasks.filter((t) => t.type === 'CP');
  const masterMilestones = milestones.filter((m) => m.milestoneType === 'MASTER');

  const now = new Date();
  const futureMilestones = milestones
    .filter((m) => new Date(m.date) > now)
    .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
  const nextMilestone = futureMilestones[0] || null;

  let dDay: number | null = null;
  if (nextMilestone) {
    dDay = Math.ceil((new Date(nextMilestone.date).getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
  }

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
    nextMilestone, dDay, minDate, maxDate, totalDays,
  };
}

// ── 날짜 포맷 ──

export function formatShortDate(date: Date | null): string {
  if (!date) return '-';
  return date.toLocaleDateString('ko-KR', { month: '2-digit', day: '2-digit' });
}
