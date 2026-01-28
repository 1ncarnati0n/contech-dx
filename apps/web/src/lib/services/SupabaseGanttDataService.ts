/**
 * SupabaseGanttDataService
 *
 * sa-gantt-lib의 DataService 인터페이스를 구현하여
 * Supabase 테이블(gantt_tasks, gantt_milestones, gantt_dependencies)과 연동
 */

import { createClient } from '@/lib/supabase/client';
import { format } from 'date-fns';
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
function parseLocalDate(dateStr: string | null | undefined): Date {
  if (!dateStr) {
    console.warn('[parseLocalDate] Empty date string, using current date');
    return new Date();
  }

  // ISO 문자열에서 날짜 부분만 추출 (T 이전 부분)
  const datePart = String(dateStr).split('T')[0];
  const parts = datePart.split('-');

  if (parts.length !== 3) {
    console.warn('[parseLocalDate] Invalid date format:', dateStr);
    return new Date();
  }

  const [year, month, day] = parts.map(Number);

  if (isNaN(year) || isNaN(month) || isNaN(day)) {
    console.warn('[parseLocalDate] Invalid date numbers:', dateStr);
    return new Date();
  }

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
  // format()은 로컬 시간대 기준으로 날짜를 출력
  // toISOString()은 UTC 기준이라 timezone에 따라 날짜가 밀릴 수 있음
  // Date 객체가 아닌 경우도 안전하게 처리
  const startDateStr = task.startDate instanceof Date
    ? format(task.startDate, 'yyyy-MM-dd')
    : String(task.startDate).split('T')[0];
  const endDateStr = task.endDate instanceof Date
    ? format(task.endDate, 'yyyy-MM-dd')
    : String(task.endDate).split('T')[0];

  return {
    id: task.id,
    project_id: projectId,
    parent_id: task.parentId,
    wbs_level: task.wbsLevel,
    type: task.type,
    name: task.name,
    start_date: startDateStr,
    end_date: endDateStr,
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
  // Date 객체가 아닌 경우도 안전하게 처리
  const dateStr = milestone.date instanceof Date
    ? format(milestone.date, 'yyyy-MM-dd')
    : String(milestone.date).split('T')[0];

  return {
    id: milestone.id,
    project_id: projectId,
    date: dateStr,
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
    // TODO: 디버깅 완료 후 false로 변경
    this.debug = options?.debug ?? true;
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

    this.log('loadTasks raw data count:', data?.length || 0);

    const tasks = (data || []).map((row, index) => {
      try {
        return rowToTask(row);
      } catch (e) {
        console.error(`Failed to parse task at index ${index}:`, row, e);
        return null;
      }
    }).filter((t): t is ConstructionTask => t !== null);

    this.log('loadTasks parsed count:', tasks.length);
    return tasks;
  }

  async saveTasks(tasks: ConstructionTask[]): Promise<void> {
    this.log('saveTasks', tasks.length);

    // 안전 장치: 빈 배열로 저장하려고 하면 경고 후 중단
    // (실수로 데이터를 삭제하는 것을 방지)
    if (tasks.length === 0) {
      console.warn('[saveTasks] Attempted to save empty tasks array. Skipping to prevent data loss.');
      console.warn('[saveTasks] If you really want to delete all tasks, use a dedicated delete method.');
      return;
    }

    // 먼저 삽입할 데이터 준비 (에러 발생 시 삭제 전에 실패)
    const rows = tasks.map((task, index) => ({
      ...taskToRow(task, this.projectId),
      sort_order: index,
    }));

    this.log('saveTasks rows prepared:', rows.length);

    // 기존 태스크 삭제
    this.log('saveTasks deleting existing tasks for project:', this.projectId);
    const { data: deletedData, error: deleteError } = await this.supabase
      .from('gantt_tasks')
      .delete()
      .eq('project_id', this.projectId)
      .select('id');

    if (deleteError) {
      console.error('Failed to delete existing tasks:', {
        message: deleteError.message,
        code: deleteError.code,
        details: deleteError.details,
        hint: deleteError.hint,
      });
      throw deleteError;
    }
    this.log('saveTasks deleted count:', deletedData?.length ?? 0);

    // 새 태스크 삽입
    this.log('saveTasks inserting tasks:', rows.length, 'for project:', this.projectId);
    const { data: insertedData, error: insertError } = await this.supabase
      .from('gantt_tasks')
      .insert(rows)
      .select();

    if (insertError) {
      console.error('Failed to insert tasks:', {
        message: insertError.message,
        code: insertError.code,
        details: insertError.details,
        hint: insertError.hint,
      });
      throw insertError;
    }

    this.log('saveTasks inserted count:', insertedData?.length || 0);
    this.log('saveTasks completed successfully');
  }

  async updateTask(
    id: string,
    updates: Partial<ConstructionTask>
  ): Promise<ConstructionTask | null> {
    this.log('updateTask', id, updates);

    const updateData: Record<string, unknown> = {};

    if (updates.name !== undefined) updateData.name = updates.name;
    // Date 객체인 경우에만 format 호출 (문자열이 전달될 수 있음)
    if (updates.startDate !== undefined) {
      updateData.start_date = updates.startDate instanceof Date
        ? format(updates.startDate, 'yyyy-MM-dd')
        : String(updates.startDate).split('T')[0];
    }
    if (updates.endDate !== undefined) {
      updateData.end_date = updates.endDate instanceof Date
        ? format(updates.endDate, 'yyyy-MM-dd')
        : String(updates.endDate).split('T')[0];
    }
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

    this.log('updateTask updateData:', updateData);

    const { data, error } = await this.supabase
      .from('gantt_tasks')
      .update(updateData)
      .eq('id', id)
      .eq('project_id', this.projectId)
      .select()
      .single();

    if (error) {
      console.error('Failed to update task:', error.message, error.code, error.details, error.hint);
      return null;
    }

    return rowToTask(data);
  }

  async createTask(
    task: Omit<ConstructionTask, 'id'> & { id?: string; sortOrder?: number }
  ): Promise<ConstructionTask> {
    this.log('createTask', task);

    // Phase 2: 인증 상태 사전 검증
    const { data: { user }, error: authError } = await this.supabase.auth.getUser();
    if (authError) {
      console.error('[createTask] Auth error:', {
        message: authError.message,
        code: authError.code,
        status: authError.status,
      });
      throw new Error(`Authentication error: ${authError.message}`);
    }
    if (!user) {
      console.error('[createTask] No authenticated user session');
      throw new Error('Authentication required: No user session. Please log in again.');
    }
    this.log('createTask auth verified:', { userId: user.id, email: user.email });

    // 전달된 ID가 있으면 사용 (복사/붙여넣기 시 부모-자식 관계 유지), 없으면 새로 생성
    const newId = task.id || crypto.randomUUID();
    const { sortOrder, ...taskWithoutSortOrder } = task;
    const newTask: ConstructionTask = { ...taskWithoutSortOrder, id: newId };
    const row = {
      ...taskToRow(newTask, this.projectId),
      sort_order: sortOrder ?? 0,  // 전달된 sortOrder 사용, 없으면 0
    };

    // 디버그: DB에 전송되는 데이터 확인
    this.log('createTask row data:', row);

    const { data, error } = await this.supabase
      .from('gantt_tasks')
      .insert(row)
      .select()
      .single();

    if (error) {
      // Phase 1: 향상된 에러 디버깅
      // Next.js 에러 오버레이는 중첩 객체를 표시 못함 → 문자열로 출력
      console.log('═══════════════════════════════════════════════════════════');
      console.log('[createTask] ❌ TASK CREATION FAILED');
      console.log('═══════════════════════════════════════════════════════════');
      console.log(`[createTask] error.message: "${error.message}"`);
      console.log(`[createTask] error.code: "${error.code}"`);
      console.log(`[createTask] error.details: "${error.details}"`);
      console.log(`[createTask] error.hint: "${error.hint}"`);
      console.log(`[createTask] error type: ${error.constructor?.name}`);
      console.log(`[createTask] error keys: ${Object.keys(error).join(', ') || '(none)'}`);
      console.log(`[createTask] error own props: ${Object.getOwnPropertyNames(error).join(', ') || '(none)'}`);

      // 전체 에러 객체를 문자열로 덤프
      try {
        console.log('[createTask] Full error (JSON):', JSON.stringify(error, null, 2));
      } catch {
        console.log('[createTask] Full error (cannot stringify):', String(error));
      }

      // console.dir로 전체 객체 탐색 (브라우저 콘솔에서만 유효)
      console.dir(error, { depth: 5 });

      // 에러 발생 시 인증 상태 재확인
      const { data: { user: currentUser } } = await this.supabase.auth.getUser();
      console.log(`[createTask] Auth state - userId: ${currentUser?.id}, email: ${currentUser?.email}, hasUser: ${!!currentUser}`);

      // 전송 시도한 데이터
      console.log(`[createTask] Failed row - projectId: ${row.project_id}, taskId: ${row.id}, name: ${row.name}`);
      console.log('═══════════════════════════════════════════════════════════');

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
    this.log('saveMilestones', milestones.length, 'for project:', this.projectId);

    const { error: deleteError } = await this.supabase
      .from('gantt_milestones')
      .delete()
      .eq('project_id', this.projectId);

    if (deleteError) {
      console.error('Failed to delete existing milestones:', {
        message: deleteError.message,
        code: deleteError.code,
        details: deleteError.details,
        hint: deleteError.hint,
      });
      throw deleteError;
    }

    if (milestones.length === 0) {
      this.log('saveMilestones: no milestones to save');
      return;
    }

    const rows = milestones.map((m) => milestoneToRow(m, this.projectId));
    this.log('saveMilestones inserting rows:', rows.length);

    const { data: insertedData, error: insertError } = await this.supabase
      .from('gantt_milestones')
      .insert(rows)
      .select();

    if (insertError) {
      console.error('Failed to insert milestones:', {
        message: insertError.message,
        code: insertError.code,
        details: insertError.details,
        hint: insertError.hint,
      });
      throw insertError;
    }

    this.log('saveMilestones inserted count:', insertedData?.length || 0);
  }

  async updateMilestone(
    id: string,
    updates: Partial<Milestone>
  ): Promise<Milestone | null> {
    this.log('updateMilestone', id, updates);

    const updateData: Record<string, unknown> = {};

    if (updates.name !== undefined) updateData.name = updates.name;
    if (updates.date !== undefined) {
      updateData.date = updates.date instanceof Date
        ? format(updates.date, 'yyyy-MM-dd')
        : String(updates.date).split('T')[0];
    }
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
      console.error('Failed to update milestone:', error.message, error.code, error.details, error.hint);
      return null;
    }

    return rowToMilestone(data);
  }

  async createMilestone(milestone: Omit<Milestone, 'id'>): Promise<Milestone> {
    this.log('createMilestone', milestone);

    // 인증 상태 사전 검증
    const { data: { user }, error: authError } = await this.supabase.auth.getUser();
    if (authError || !user) {
      const msg = authError?.message || 'No user session';
      console.error('[createMilestone] Auth check failed:', msg);
      throw new Error(`Authentication required: ${msg}`);
    }

    const newId = crypto.randomUUID();
    const newMilestone: Milestone = { ...milestone, id: newId };
    const row = milestoneToRow(newMilestone, this.projectId);

    const { data, error } = await this.supabase
      .from('gantt_milestones')
      .insert(row)
      .select()
      .single();

    if (error) {
      console.error('[createMilestone] Failed:', {
        message: error.message,
        code: error.code,
        details: error.details,
        hint: error.hint,
        fullError: JSON.stringify(error, Object.getOwnPropertyNames(error)),
      });
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
    this.log('saveDependencies', dependencies.length, 'for project:', this.projectId);

    const { error: deleteError } = await this.supabase
      .from('gantt_dependencies')
      .delete()
      .eq('project_id', this.projectId);

    if (deleteError) {
      console.error('Failed to delete existing dependencies:', {
        message: deleteError.message,
        code: deleteError.code,
        details: deleteError.details,
        hint: deleteError.hint,
      });
      throw deleteError;
    }

    if (dependencies.length === 0) {
      this.log('saveDependencies: no dependencies to save');
      return;
    }

    const rows = dependencies.map((d) => dependencyToRow(d, this.projectId));
    this.log('saveDependencies inserting rows:', rows.length);

    const { data: insertedData, error: insertError } = await this.supabase
      .from('gantt_dependencies')
      .insert(rows)
      .select();

    if (insertError) {
      console.error('Failed to insert dependencies:', {
        message: insertError.message,
        code: insertError.code,
        details: insertError.details,
        hint: insertError.hint,
        fullError: JSON.stringify(insertError, Object.getOwnPropertyNames(insertError)),
        rowsAttempted: rows.length,
        sampleRow: rows[0],
      });
      throw insertError;
    }

    this.log('saveDependencies inserted count:', insertedData?.length || 0);
  }

  async createDependency(dependency: AnchorDependency): Promise<AnchorDependency> {
    this.log('createDependency', dependency);

    // 인증 상태 사전 검증
    const { data: { user }, error: authError } = await this.supabase.auth.getUser();
    if (authError || !user) {
      const msg = authError?.message || 'No user session';
      console.error('[createDependency] Auth check failed:', msg);
      throw new Error(`Authentication required: ${msg}`);
    }

    const row = dependencyToRow(dependency, this.projectId);

    const { data, error } = await this.supabase
      .from('gantt_dependencies')
      .insert(row)
      .select()
      .single();

    if (error) {
      console.error('[createDependency] Failed:', {
        message: error.message,
        code: error.code,
        details: error.details,
        hint: error.hint,
        fullError: JSON.stringify(error, Object.getOwnPropertyNames(error)),
      });
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

    // Tasks와 Milestones는 병렬 저장 가능 (서로 의존성 없음)
    // Dependencies는 tasks의 FK를 참조하므로 tasks 저장 완료 후 실행해야 함
    await Promise.all([
      this.saveTasks(data.tasks),
      this.saveMilestones(data.milestones),
    ]);

    // Tasks 저장 후 Dependencies 저장 (FK 제약 조건 충족)
    await this.saveDependencies(data.dependencies);
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

    // Date 문자열을 Date 객체로 변환 (로컬 시간대 자정으로 파싱)
    // new Date('2025-01-26')는 UTC 자정으로 파싱되어 timezone에 따라 날짜가 밀릴 수 있음
    data.tasks = data.tasks.map((t) => ({
      ...t,
      startDate: parseLocalDate(String(t.startDate).split('T')[0]),
      endDate: parseLocalDate(String(t.endDate).split('T')[0]),
    }));
    data.milestones = data.milestones.map((m) => ({
      ...m,
      date: parseLocalDate(String(m.date).split('T')[0]),
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
