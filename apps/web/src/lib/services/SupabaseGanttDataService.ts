/**
 * SupabaseGanttDataService
 *
 * sa-gantt-lib의 DataService 인터페이스를 구현하여
 * Supabase 테이블(gantt_tasks, gantt_milestones, gantt_dependencies)과 연동
 */

import { createClient } from '@/lib/supabase/client';
import type {
  DataService,
  GanttData,
  ConstructionTask,
  Milestone,
  AnchorDependency,
  WbsLevel,
  TaskType,
} from 'sa-gantt-lib';

// MilestoneType은 sa-gantt-lib에서 export하지 않으므로 로컬 정의
type MilestoneType = 'MASTER' | 'DETAIL';

// ============================================
// Supabase Row Types (DB 스키마와 매핑)
// ============================================

interface GanttTaskRow {
  id: string;
  project_id: string;
  parent_id: string | null;
  wbs_level: number;
  type: string;
  name: string;
  start_date: string;
  end_date: string;
  cp_data: object | null;
  task_data: object | null;
  group_data: object | null;
  dependencies: object[];
  is_expanded: boolean;
  sort_order: number;
  created_at: string;
  updated_at: string;
}

interface GanttMilestoneRow {
  id: string;
  project_id: string;
  date: string;
  name: string;
  description: string | null;
  milestone_type: string;
  created_at: string;
  updated_at: string;
}

interface GanttDependencyRow {
  id: string;
  project_id: string;
  source_task_id: string;
  target_task_id: string;
  source_day_index: number;
  target_day_index: number;
  lag: number;
  created_at: string;
}

// ============================================
// 날짜 파싱 유틸리티
// ============================================

/**
 * 'YYYY-MM-DD' 형식을 로컬 시간대 자정으로 파싱
 *
 * new Date('2025-01-26')는 UTC 자정으로 파싱되어 timezone에 따라
 * 날짜가 하루 밀릴 수 있음. 이 함수는 로컬 시간대 자정으로 파싱하여
 * 어떤 timezone에서도 동일한 날짜(요일)를 보장합니다.
 */
function parseLocalDate(dateStr: string): Date {
  const [year, month, day] = dateStr.split('-').map(Number);
  return new Date(year, month - 1, day); // 월은 0-based
}

// ============================================
// 변환 함수: Supabase Row ↔ sa-gantt-lib Type
// ============================================

function rowToTask(row: GanttTaskRow): ConstructionTask {
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

function taskToRow(
  task: ConstructionTask,
  projectId: string
): Omit<GanttTaskRow, 'created_at' | 'updated_at'> {
  return {
    id: task.id,
    project_id: projectId,
    parent_id: task.parentId,
    wbs_level: task.wbsLevel,
    type: task.type,
    name: task.name,
    start_date: task.startDate.toISOString().split('T')[0],
    end_date: task.endDate.toISOString().split('T')[0],
    cp_data: task.cp || null,
    task_data: task.task || null,
    group_data: task.group || null,
    dependencies: task.dependencies || [],
    is_expanded: task.isExpanded ?? true,
    sort_order: 0,
  };
}

function rowToMilestone(row: GanttMilestoneRow): Milestone {
  return {
    id: row.id,
    date: parseLocalDate(row.date),
    name: row.name,
    description: row.description || undefined,
    milestoneType: row.milestone_type as MilestoneType,
  };
}

function milestoneToRow(
  milestone: Milestone,
  projectId: string
): Omit<GanttMilestoneRow, 'created_at' | 'updated_at'> {
  return {
    id: milestone.id,
    project_id: projectId,
    date: milestone.date.toISOString().split('T')[0],
    name: milestone.name,
    description: milestone.description || null,
    milestone_type: milestone.milestoneType || 'MASTER',
  };
}

function rowToDependency(row: GanttDependencyRow): AnchorDependency {
  return {
    id: row.id,
    sourceTaskId: row.source_task_id,
    targetTaskId: row.target_task_id,
    sourceDayIndex: row.source_day_index,
    targetDayIndex: row.target_day_index,
    lag: row.lag,
  };
}

function dependencyToRow(
  dep: AnchorDependency,
  projectId: string
): Omit<GanttDependencyRow, 'created_at'> {
  return {
    id: dep.id,
    project_id: projectId,
    source_task_id: dep.sourceTaskId,
    target_task_id: dep.targetTaskId,
    source_day_index: dep.sourceDayIndex,
    target_day_index: dep.targetDayIndex,
    lag: dep.lag || 0,
  };
}

// ============================================
// SupabaseGanttDataService 클래스
// ============================================

export class SupabaseGanttDataService implements DataService {
  private supabase = createClient();
  private projectId: string;
  private debug: boolean;

  constructor(projectId: string, options?: { debug?: boolean }) {
    this.projectId = projectId;
    this.debug = options?.debug ?? false;
  }

  private log(...args: unknown[]) {
    if (this.debug) {
      console.log('[SupabaseGanttDataService]', ...args);
    }
  }

  // ============================================
  // Tasks CRUD
  // ============================================

  async loadTasks(): Promise<ConstructionTask[]> {
    this.log('loadTasks');
    const { data, error } = await this.supabase
      .from('gantt_tasks')
      .select('*')
      .eq('project_id', this.projectId)
      .order('sort_order', { ascending: true });

    if (error) {
      console.error('Failed to load tasks:', error);
      throw error;
    }

    return (data || []).map(rowToTask);
  }

  async saveTasks(tasks: ConstructionTask[]): Promise<void> {
    this.log('saveTasks', tasks.length);

    // 기존 태스크 삭제 후 새로 삽입 (전체 교체)
    const { error: deleteError } = await this.supabase
      .from('gantt_tasks')
      .delete()
      .eq('project_id', this.projectId);

    if (deleteError) {
      console.error('Failed to delete existing tasks:', deleteError);
      throw deleteError;
    }

    if (tasks.length === 0) return;

    const rows = tasks.map((task, index) => ({
      ...taskToRow(task, this.projectId),
      sort_order: index,
    }));

    const { error: insertError } = await this.supabase
      .from('gantt_tasks')
      .insert(rows);

    if (insertError) {
      console.error('Failed to insert tasks:', insertError);
      throw insertError;
    }
  }

  async updateTask(
    id: string,
    updates: Partial<ConstructionTask>
  ): Promise<ConstructionTask | null> {
    this.log('updateTask', id, updates);

    const updateData: Record<string, unknown> = {};

    if (updates.name !== undefined) updateData.name = updates.name;
    if (updates.startDate !== undefined)
      updateData.start_date = updates.startDate.toISOString().split('T')[0];
    if (updates.endDate !== undefined)
      updateData.end_date = updates.endDate.toISOString().split('T')[0];
    if (updates.parentId !== undefined) updateData.parent_id = updates.parentId;
    if (updates.wbsLevel !== undefined) updateData.wbs_level = updates.wbsLevel;
    if (updates.type !== undefined) updateData.type = updates.type;
    if (updates.cp !== undefined) updateData.cp_data = updates.cp;
    if (updates.task !== undefined) updateData.task_data = updates.task;
    if (updates.group !== undefined) updateData.group_data = updates.group;
    if (updates.dependencies !== undefined)
      updateData.dependencies = updates.dependencies;
    if (updates.isExpanded !== undefined)
      updateData.is_expanded = updates.isExpanded;

    const { data, error } = await this.supabase
      .from('gantt_tasks')
      .update(updateData)
      .eq('id', id)
      .eq('project_id', this.projectId)
      .select()
      .single();

    if (error) {
      console.error('Failed to update task:', error);
      return null;
    }

    return rowToTask(data);
  }

  async createTask(
    task: Omit<ConstructionTask, 'id'>
  ): Promise<ConstructionTask> {
    this.log('createTask', task);

    const newId = crypto.randomUUID();
    const newTask: ConstructionTask = { ...task, id: newId };
    const row = taskToRow(newTask, this.projectId);

    const { data, error } = await this.supabase
      .from('gantt_tasks')
      .insert(row)
      .select()
      .single();

    if (error) {
      console.error('Failed to create task:', error);
      throw error;
    }

    return rowToTask(data);
  }

  async deleteTask(id: string): Promise<boolean> {
    this.log('deleteTask', id);

    const { error } = await this.supabase
      .from('gantt_tasks')
      .delete()
      .eq('id', id)
      .eq('project_id', this.projectId);

    if (error) {
      console.error('Failed to delete task:', error);
      return false;
    }

    return true;
  }

  // ============================================
  // Milestones CRUD
  // ============================================

  async loadMilestones(): Promise<Milestone[]> {
    this.log('loadMilestones');

    const { data, error } = await this.supabase
      .from('gantt_milestones')
      .select('*')
      .eq('project_id', this.projectId)
      .order('date', { ascending: true });

    if (error) {
      console.error('Failed to load milestones:', error);
      throw error;
    }

    return (data || []).map(rowToMilestone);
  }

  async saveMilestones(milestones: Milestone[]): Promise<void> {
    this.log('saveMilestones', milestones.length);

    const { error: deleteError } = await this.supabase
      .from('gantt_milestones')
      .delete()
      .eq('project_id', this.projectId);

    if (deleteError) {
      console.error('Failed to delete existing milestones:', deleteError);
      throw deleteError;
    }

    if (milestones.length === 0) return;

    const rows = milestones.map((m) => milestoneToRow(m, this.projectId));

    const { error: insertError } = await this.supabase
      .from('gantt_milestones')
      .insert(rows);

    if (insertError) {
      console.error('Failed to insert milestones:', insertError);
      throw insertError;
    }
  }

  async updateMilestone(
    id: string,
    updates: Partial<Milestone>
  ): Promise<Milestone | null> {
    this.log('updateMilestone', id, updates);

    const updateData: Record<string, unknown> = {};

    if (updates.name !== undefined) updateData.name = updates.name;
    if (updates.date !== undefined)
      updateData.date = updates.date.toISOString().split('T')[0];
    if (updates.description !== undefined)
      updateData.description = updates.description;
    if (updates.milestoneType !== undefined)
      updateData.milestone_type = updates.milestoneType;

    const { data, error } = await this.supabase
      .from('gantt_milestones')
      .update(updateData)
      .eq('id', id)
      .eq('project_id', this.projectId)
      .select()
      .single();

    if (error) {
      console.error('Failed to update milestone:', error);
      return null;
    }

    return rowToMilestone(data);
  }

  async createMilestone(milestone: Omit<Milestone, 'id'>): Promise<Milestone> {
    this.log('createMilestone', milestone);

    const newId = crypto.randomUUID();
    const newMilestone: Milestone = { ...milestone, id: newId };
    const row = milestoneToRow(newMilestone, this.projectId);

    const { data, error } = await this.supabase
      .from('gantt_milestones')
      .insert(row)
      .select()
      .single();

    if (error) {
      console.error('Failed to create milestone:', error);
      throw error;
    }

    return rowToMilestone(data);
  }

  async deleteMilestone(id: string): Promise<boolean> {
    this.log('deleteMilestone', id);

    const { error } = await this.supabase
      .from('gantt_milestones')
      .delete()
      .eq('id', id)
      .eq('project_id', this.projectId);

    if (error) {
      console.error('Failed to delete milestone:', error);
      return false;
    }

    return true;
  }

  // ============================================
  // Dependencies CRUD
  // ============================================

  async loadDependencies(): Promise<AnchorDependency[]> {
    this.log('loadDependencies');

    const { data, error } = await this.supabase
      .from('gantt_dependencies')
      .select('*')
      .eq('project_id', this.projectId);

    if (error) {
      console.error('Failed to load dependencies:', error);
      throw error;
    }

    return (data || []).map(rowToDependency);
  }

  async saveDependencies(dependencies: AnchorDependency[]): Promise<void> {
    this.log('saveDependencies', dependencies.length);

    const { error: deleteError } = await this.supabase
      .from('gantt_dependencies')
      .delete()
      .eq('project_id', this.projectId);

    if (deleteError) {
      console.error('Failed to delete existing dependencies:', deleteError);
      throw deleteError;
    }

    if (dependencies.length === 0) return;

    const rows = dependencies.map((d) => dependencyToRow(d, this.projectId));

    const { error: insertError } = await this.supabase
      .from('gantt_dependencies')
      .insert(rows);

    if (insertError) {
      console.error('Failed to insert dependencies:', insertError);
      throw insertError;
    }
  }

  async createDependency(dependency: AnchorDependency): Promise<AnchorDependency> {
    this.log('createDependency', dependency);

    const row = dependencyToRow(dependency, this.projectId);

    const { data, error } = await this.supabase
      .from('gantt_dependencies')
      .insert(row)
      .select()
      .single();

    if (error) {
      console.error('Failed to create dependency:', error);
      throw error;
    }

    return rowToDependency(data);
  }

  async deleteDependency(id: string): Promise<boolean> {
    this.log('deleteDependency', id);

    const { error } = await this.supabase
      .from('gantt_dependencies')
      .delete()
      .eq('id', id)
      .eq('project_id', this.projectId);

    if (error) {
      console.error('Failed to delete dependency:', error);
      return false;
    }

    return true;
  }

  // ============================================
  // Bulk Operations
  // ============================================

  async loadAll(): Promise<GanttData> {
    this.log('loadAll');

    const [tasks, milestones, dependencies] = await Promise.all([
      this.loadTasks(),
      this.loadMilestones(),
      this.loadDependencies(),
    ]);

    return { tasks, milestones, dependencies };
  }

  async saveAll(data: GanttData): Promise<void> {
    this.log('saveAll');

    await Promise.all([
      this.saveTasks(data.tasks),
      this.saveMilestones(data.milestones),
      this.saveDependencies(data.dependencies),
    ]);
  }

  // ============================================
  // Import/Export
  // ============================================

  async exportToJSON(): Promise<string> {
    const data = await this.loadAll();
    return JSON.stringify(data, null, 2);
  }

  async importFromJSON(json: string): Promise<GanttData> {
    const data = JSON.parse(json) as GanttData;

    // Date 문자열을 Date 객체로 변환
    data.tasks = data.tasks.map((t) => ({
      ...t,
      startDate: new Date(t.startDate),
      endDate: new Date(t.endDate),
    }));
    data.milestones = data.milestones.map((m) => ({
      ...m,
      date: new Date(m.date),
    }));

    await this.saveAll(data);
    return data;
  }

  async reset(): Promise<void> {
    this.log('reset');
    await this.saveAll({ tasks: [], milestones: [], dependencies: [] });
  }
}

// ============================================
// Factory 함수
// ============================================

export function createSupabaseGanttDataService(
  projectId: string,
  options?: { debug?: boolean }
): DataService {
  return new SupabaseGanttDataService(projectId, options);
}
