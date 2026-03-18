/**
 * GanttDataService — sa-gantt-lib DataService 구현
 *
 * Repository(순수 CRUD)와 Mapper(Row↔도메인 변환)를 조합하여
 * sa-gantt-lib가 요구하는 DataService 인터페이스를 구현합니다.
 */

import { logger } from '@/shared/utils/logger';
import type {
  DataService,
  GanttData,
  ConstructionTask,
  Milestone,
  GroupDependency,
} from 'sa-gantt-lib';
import { GanttRepository } from '../repository/gantt.repository';
import {
  rowToTask,
  taskToRow,
  taskUpdatesToRow,
  rowToMilestone,
  milestoneToRow,
  milestoneUpdatesToRow,
  rowToDependency,
  dependencyToRow,
  parseLocalDate,
} from './gantt-mapper';

export class GanttDataService implements DataService {
  private repo: GanttRepository;
  private projectId: string;
  private debug: boolean;

  constructor(projectId: string, options?: { debug?: boolean }) {
    this.projectId = projectId;
    this.debug = options?.debug ?? false;
    this.repo = new GanttRepository(projectId);
  }

  private log(...args: unknown[]) {
    if (this.debug) {
      logger.debug('[GanttDataService]', ...args);
    }
  }

  // ── Tasks ──

  async loadTasks(): Promise<ConstructionTask[]> {
    this.log('loadTasks');
    const rows = await this.repo.loadTaskRows();
    this.log('loadTasks raw count:', rows.length);

    const tasks = rows.map((row, index) => {
      try {
        return rowToTask(row);
      } catch (e) {
        logger.error(`Failed to parse task at index ${index}:`, row, e);
        return null;
      }
    }).filter((t): t is ConstructionTask => t !== null);

    this.log('loadTasks parsed count:', tasks.length);
    return tasks;
  }

  async saveTasks(tasks: ConstructionTask[]): Promise<void> {
    this.log('saveTasks', tasks.length);

    if (tasks.length === 0) {
      logger.warn('[saveTasks] Attempted to save empty tasks array. Skipping to prevent data loss.');
      return;
    }

    const rows = tasks.map((task, index) => ({
      ...taskToRow(task, this.projectId),
      sort_order: index,
    }));

    this.log('saveTasks rows prepared:', rows.length);

    const deletedCount = await this.repo.deleteAllTaskRows();
    this.log('saveTasks deleted count:', deletedCount);

    const insertedCount = await this.repo.insertTaskRows(rows);
    this.log('saveTasks inserted count:', insertedCount);
  }

  async updateTask(
    id: string,
    updates: Partial<ConstructionTask>,
  ): Promise<ConstructionTask | null> {
    this.log('updateTask', id, updates);

    const updateData = taskUpdatesToRow(updates);
    this.log('updateTask updateData:', updateData);

    const row = await this.repo.updateTaskRow(id, updateData);
    return row ? rowToTask(row) : null;
  }

  async createTask(
    task: Omit<ConstructionTask, 'id'> & { id?: string; sortOrder?: number },
  ): Promise<ConstructionTask> {
    this.log('createTask', task);

    const user = await this.repo.checkAuth();
    this.log('createTask auth verified:', { userId: user.id, email: user.email });

    const newId = task.id || crypto.randomUUID();
    const { sortOrder, ...taskWithoutSortOrder } = task;
    const newTask: ConstructionTask = { ...taskWithoutSortOrder, id: newId };
    const row = {
      ...taskToRow(newTask, this.projectId),
      sort_order: sortOrder ?? 0,
    };

    this.log('createTask row data:', row);

    const insertedRow = await this.repo.insertTaskRow(row);
    return rowToTask(insertedRow);
  }

  async deleteTask(id: string): Promise<boolean> {
    this.log('deleteTask', id);
    return this.repo.deleteTaskRow(id);
  }

  // ── Milestones ──

  async loadMilestones(): Promise<Milestone[]> {
    this.log('loadMilestones');
    const rows = await this.repo.loadMilestoneRows();
    return rows.map(rowToMilestone);
  }

  async saveMilestones(milestones: Milestone[]): Promise<void> {
    this.log('saveMilestones', milestones.length);

    await this.repo.deleteAllMilestoneRows();

    if (milestones.length === 0) {
      this.log('saveMilestones: no milestones to save');
      return;
    }

    const rows = milestones.map((m) => milestoneToRow(m, this.projectId));
    this.log('saveMilestones inserting rows:', rows.length);

    const insertedCount = await this.repo.insertMilestoneRows(rows);
    this.log('saveMilestones inserted count:', insertedCount);
  }

  async updateMilestone(
    id: string,
    updates: Partial<Milestone>,
  ): Promise<Milestone | null> {
    this.log('updateMilestone', id, updates);

    const updateData = milestoneUpdatesToRow(updates);
    const row = await this.repo.updateMilestoneRow(id, updateData);
    return row ? rowToMilestone(row) : null;
  }

  async createMilestone(milestone: Omit<Milestone, 'id'>): Promise<Milestone> {
    this.log('createMilestone', milestone);

    await this.repo.checkAuth();

    const candidateId = (milestone as Partial<Milestone>).id;
    const newId = typeof candidateId === 'string' && candidateId.trim().length > 0
      ? candidateId
      : crypto.randomUUID();
    const newMilestone: Milestone = { ...milestone, id: newId };
    const row = milestoneToRow(newMilestone, this.projectId);

    const insertedRow = await this.repo.insertMilestoneRow(row);
    return rowToMilestone(insertedRow);
  }

  async deleteMilestone(id: string): Promise<boolean> {
    this.log('deleteMilestone', id);
    return this.repo.deleteMilestoneRow(id);
  }

  // ── Dependencies ──

  async loadDependencies(): Promise<GroupDependency[]> {
    this.log('loadDependencies');
    const rows = await this.repo.loadDependencyRows();
    return rows.map(rowToDependency);
  }

  async saveDependencies(dependencies: GroupDependency[]): Promise<void> {
    this.log('saveDependencies', dependencies.length);

    await this.repo.deleteAllDependencyRows();

    if (dependencies.length === 0) {
      this.log('saveDependencies: no dependencies to save');
      return;
    }

    const rows = dependencies.map((d) => dependencyToRow(d, this.projectId));
    this.log('saveDependencies inserting rows:', rows.length);

    const insertedCount = await this.repo.insertDependencyRows(rows);
    this.log('saveDependencies inserted count:', insertedCount);
  }

  async createDependency(dependency: GroupDependency): Promise<GroupDependency> {
    this.log('createDependency', dependency);

    await this.repo.checkAuth();

    const row = dependencyToRow(dependency, this.projectId);
    const insertedRow = await this.repo.insertDependencyRow(row);
    return rowToDependency(insertedRow);
  }

  async deleteDependency(id: string): Promise<boolean> {
    this.log('deleteDependency', id);
    return this.repo.deleteDependencyRow(id);
  }

  // ── Bulk Operations ──

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
    ]);

    await this.saveDependencies(data.dependencies);
  }

  // ── Append ──

  async appendTasks(newTasks: ConstructionTask[]): Promise<ConstructionTask[]> {
    this.log('appendTasks', newTasks.length);

    if (newTasks.length === 0) {
      this.log('appendTasks: no tasks to append');
      return [];
    }

    const existingTasks = await this.loadTasks();
    this.log('appendTasks existing count:', existingTasks.length);

    const mergedTasks = [...existingTasks, ...newTasks];
    await this.saveTasks(mergedTasks);
    this.log('appendTasks merged count:', mergedTasks.length);

    return mergedTasks;
  }

  // ── Import/Export ──

  async exportToJSON(): Promise<string> {
    const data = await this.loadAll();
    return JSON.stringify(data, null, 2);
  }

  async importFromJSON(json: string): Promise<GanttData> {
    const data = JSON.parse(json) as GanttData;

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

// ── Factory (하위 호환성 유지) ──

export function createSupabaseGanttDataService(
  projectId: string,
  options?: { debug?: boolean },
): DataService {
  return new GanttDataService(projectId, options);
}

// 클래스 직접 참조용 alias
export { GanttDataService as SupabaseGanttDataService };
