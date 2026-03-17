/**
 * Gantt Mapper — DB Row ↔ 도메인 모델 변환
 */

import { format } from 'date-fns';
import { logger } from '@/shared/utils/logger';
import type {
  ConstructionTask,
  Milestone,
  GroupDependency,
  WbsLevel,
  TaskType,
} from 'sa-gantt-lib';
import type {
  GanttTaskRow,
  GanttMilestoneRow,
  GanttDependencyRow,
} from '../repository/gantt.repository';

type MilestoneType = 'MASTER' | 'DETAIL';

// ─── Date Parsing ───

/**
 * 'YYYY-MM-DD' 형식을 로컬 시간대 자정으로 파싱
 *
 * new Date('2025-01-26')는 UTC 자정으로 파싱되어 timezone에 따라
 * 날짜가 하루 밀릴 수 있음. 이 함수는 로컬 시간대 자정으로 파싱하여
 * 어떤 timezone에서도 동일한 날짜(요일)를 보장합니다.
 */
export function parseLocalDate(dateStr: string | null | undefined): Date {
  if (!dateStr) {
    logger.warn('[parseLocalDate] Empty date string, using current date');
    return new Date();
  }

  const datePart = String(dateStr).split('T')[0];
  const parts = datePart.split('-');

  if (parts.length !== 3) {
    logger.warn('[parseLocalDate] Invalid date format:', dateStr);
    return new Date();
  }

  const [year, month, day] = parts.map(Number);

  if (isNaN(year) || isNaN(month) || isNaN(day)) {
    logger.warn('[parseLocalDate] Invalid date numbers:', dateStr);
    return new Date();
  }

  return new Date(year, month - 1, day);
}

/**
 * Date 객체 또는 문자열을 'yyyy-MM-dd' 형식 문자열로 변환
 */
export function formatDateToString(date: Date | string): string {
  return date instanceof Date
    ? format(date, 'yyyy-MM-dd')
    : String(date).split('T')[0];
}

// ─── Task Mappers ───

export function rowToTask(row: GanttTaskRow): ConstructionTask {
  return {
    id: row.id,
    parentId: row.parent_id,
    wbsLevel: row.wbs_level as WbsLevel,
    type: row.type as TaskType,
    name: row.name,
    startDate: parseLocalDate(row.start_date),
    endDate: parseLocalDate(row.end_date),
    cp: row.cp_data as ConstructionTask['cp'],
    task: row.task_data as ConstructionTask['task'],
    group: row.group_data as ConstructionTask['group'],
    dependencies: (row.dependencies || []) as ConstructionTask['dependencies'],
    isExpanded: row.is_expanded,
  };
}

export function taskToRow(
  task: ConstructionTask,
  projectId: string,
): Omit<GanttTaskRow, 'created_at' | 'updated_at'> {
  return {
    id: task.id,
    project_id: projectId,
    parent_id: task.parentId,
    wbs_level: task.wbsLevel,
    type: task.type,
    name: task.name,
    start_date: formatDateToString(task.startDate),
    end_date: formatDateToString(task.endDate),
    cp_data: task.cp || null,
    task_data: task.task || null,
    group_data: task.group || null,
    dependencies: task.dependencies || [],
    is_expanded: task.isExpanded ?? true,
    sort_order: 0,
  };
}

/**
 * ConstructionTask의 partial updates를 DB 컬럼명으로 변환
 */
export function taskUpdatesToRow(
  updates: Partial<ConstructionTask>,
): Record<string, unknown> {
  const data: Record<string, unknown> = {};

  if (updates.name !== undefined) data.name = updates.name;
  if (updates.startDate !== undefined) data.start_date = formatDateToString(updates.startDate);
  if (updates.endDate !== undefined) data.end_date = formatDateToString(updates.endDate);
  if (updates.parentId !== undefined) data.parent_id = updates.parentId;
  if (updates.wbsLevel !== undefined) data.wbs_level = updates.wbsLevel;
  if (updates.type !== undefined) data.type = updates.type;
  if (updates.cp !== undefined) data.cp_data = updates.cp;
  if (updates.task !== undefined) data.task_data = updates.task;
  if (updates.group !== undefined) data.group_data = updates.group;
  if (updates.dependencies !== undefined) data.dependencies = updates.dependencies;
  if (updates.isExpanded !== undefined) data.is_expanded = updates.isExpanded;

  return data;
}

// ─── Milestone Mappers ───

export function rowToMilestone(row: GanttMilestoneRow): Milestone {
  return {
    id: row.id,
    date: parseLocalDate(row.date),
    name: row.name,
    description: row.description || undefined,
    milestoneType: row.milestone_type as MilestoneType,
  };
}

export function milestoneToRow(
  milestone: Milestone,
  projectId: string,
): Omit<GanttMilestoneRow, 'created_at' | 'updated_at'> {
  return {
    id: milestone.id,
    project_id: projectId,
    date: formatDateToString(milestone.date),
    name: milestone.name,
    description: milestone.description || null,
    milestone_type: milestone.milestoneType || 'MASTER',
  };
}

/**
 * Milestone의 partial updates를 DB 컬럼명으로 변환
 */
export function milestoneUpdatesToRow(
  updates: Partial<Milestone>,
): Record<string, unknown> {
  const data: Record<string, unknown> = {};

  if (updates.name !== undefined) data.name = updates.name;
  if (updates.date !== undefined) data.date = formatDateToString(updates.date);
  if (updates.description !== undefined) data.description = updates.description;
  if (updates.milestoneType !== undefined) data.milestone_type = updates.milestoneType;

  return data;
}

// ─── Dependency Mappers ───

export function rowToDependency(row: GanttDependencyRow): GroupDependency {
  return {
    id: row.id,
    sourceGroupId: row.source_group_id,
    targetGroupId: row.target_group_id,
    type: row.type as 'FS',
    lag: row.lag,
  };
}

export function dependencyToRow(
  dep: GroupDependency,
  projectId: string,
): Omit<GanttDependencyRow, 'created_at'> {
  return {
    id: dep.id,
    project_id: projectId,
    source_group_id: dep.sourceGroupId,
    target_group_id: dep.targetGroupId,
    type: dep.type,
    lag: dep.lag || 0,
  };
}
