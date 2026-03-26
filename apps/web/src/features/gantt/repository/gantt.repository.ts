/**
 * Gantt Repository — 순수 Supabase CRUD
 *
 * Row 타입 기반으로 gantt_tasks, gantt_milestones, gantt_dependencies 테이블과 통신.
 * 도메인 타입(ConstructionTask 등)은 모르며, 매핑은 Service 레이어가 담당합니다.
 */

import { createClient } from '@/shared/lib/supabase/client';
import { logger } from '@/shared/utils/logger';

// ─── Row Types (DB 스키마) ───

export interface GanttTaskRow {
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

export interface GanttMilestoneRow {
  id: string;
  project_id: string;
  date: string;
  name: string;
  description: string | null;
  milestone_type: string;
  created_at: string;
  updated_at: string;
}

export interface GanttDependencyRow {
  id: string;
  project_id: string;
  source_group_id: string;
  target_group_id: string;
  type: string;
  lag: number;
  created_at: string;
}

// ─── Repository Class ───

export class GanttRepository {
  private supabase = createClient();
  private projectId: string;

  constructor(projectId: string) {
    this.projectId = projectId;
  }

  // ── Auth ──

  async checkAuth() {
    const { data: { user }, error } = await this.supabase.auth.getUser();
    if (error) {
      logger.error('[GanttRepository] Auth error:', {
        message: error.message,
        code: error.code,
        status: error.status,
      });
      throw new Error(`Authentication error: ${error.message}`);
    }
    if (!user) {
      logger.error('[GanttRepository] No authenticated user session');
      throw new Error('Authentication required: No user session. Please log in again.');
    }
    return user;
  }

  // ── Tasks ──

  async loadTaskRows(): Promise<GanttTaskRow[]> {
    const PAGE_SIZE = 1000;
    const allRows: GanttTaskRow[] = [];
    let offset = 0;

    while (true) {
      const { data, error } = await this.supabase
        .from('gantt_tasks')
        .select('*')
        .eq('project_id', this.projectId)
        .order('sort_order', { ascending: true })
        .range(offset, offset + PAGE_SIZE - 1);

      if (error) {
        logger.error('Failed to load tasks:', error);
        throw error;
      }

      if (!data || data.length === 0) break;
      allRows.push(...data);
      if (data.length < PAGE_SIZE) break;
      offset += PAGE_SIZE;
    }

    return allRows;
  }

  async deleteAllTaskRows(): Promise<number> {
    const { data, error } = await this.supabase
      .from('gantt_tasks')
      .delete()
      .eq('project_id', this.projectId)
      .select('id');

    if (error) {
      logger.error('Failed to delete existing tasks:', {
        message: error.message,
        code: error.code,
        details: error.details,
        hint: error.hint,
      });
      throw error;
    }

    return data?.length ?? 0;
  }

  async insertTaskRows(rows: Omit<GanttTaskRow, 'created_at' | 'updated_at'>[]): Promise<number> {
    const BATCH_SIZE = 500;
    let totalInserted = 0;

    for (let i = 0; i < rows.length; i += BATCH_SIZE) {
      const batch = rows.slice(i, i + BATCH_SIZE);
      const { data, error } = await this.supabase
        .from('gantt_tasks')
        .insert(batch)
        .select('id');

      if (error) {
        logger.error('Failed to insert tasks batch:', {
          message: error.message,
          code: error.code,
          details: error.details,
          hint: error.hint,
          batchStart: i,
          batchSize: batch.length,
        });
        throw error;
      }

      totalInserted += data?.length || 0;
    }

    return totalInserted;
  }

  async updateTaskRow(
    id: string,
    updateData: Record<string, unknown>,
  ): Promise<GanttTaskRow | null> {
    const { data, error } = await this.supabase
      .from('gantt_tasks')
      .update(updateData)
      .eq('id', id)
      .eq('project_id', this.projectId)
      .select()
      .single();

    if (error) {
      logger.error('Failed to update task:', error.message, error.code, error.details, error.hint);
      return null;
    }

    return data;
  }

  async insertTaskRow(
    row: Omit<GanttTaskRow, 'created_at' | 'updated_at'>,
  ): Promise<GanttTaskRow> {
    const { data, error } = await this.supabase
      .from('gantt_tasks')
      .insert(row)
      .select()
      .single();

    if (error) {
      logger.error('═══════════════════════════════════════════════════════════');
      logger.error('[insertTaskRow] TASK CREATION FAILED');
      logger.error(`[insertTaskRow] error.message: "${error.message}"`);
      logger.error(`[insertTaskRow] error.code: "${error.code}"`);
      logger.error(`[insertTaskRow] error.details: "${error.details}"`);
      logger.error(`[insertTaskRow] error.hint: "${error.hint}"`);
      try {
        logger.error('[insertTaskRow] Full error (JSON):', JSON.stringify(error, null, 2));
      } catch {
        logger.error('[insertTaskRow] Full error (cannot stringify):', String(error));
      }
      logger.error('═══════════════════════════════════════════════════════════');
      throw error;
    }

    return data;
  }

  async deleteTaskRow(id: string): Promise<boolean> {
    const { error } = await this.supabase
      .from('gantt_tasks')
      .delete()
      .eq('id', id)
      .eq('project_id', this.projectId);

    if (error) {
      logger.error('Failed to delete task:', error);
      return false;
    }

    return true;
  }

  // ── Milestones ──

  async loadMilestoneRows(): Promise<GanttMilestoneRow[]> {
    const { data, error } = await this.supabase
      .from('gantt_milestones')
      .select('*')
      .eq('project_id', this.projectId)
      .order('date', { ascending: true });

    if (error) {
      logger.error('Failed to load milestones:', error);
      throw error;
    }

    return data || [];
  }

  async deleteAllMilestoneRows(): Promise<void> {
    const { error } = await this.supabase
      .from('gantt_milestones')
      .delete()
      .eq('project_id', this.projectId);

    if (error) {
      logger.error('Failed to delete existing milestones:', {
        message: error.message,
        code: error.code,
        details: error.details,
        hint: error.hint,
      });
      throw error;
    }
  }

  async insertMilestoneRows(
    rows: Omit<GanttMilestoneRow, 'created_at' | 'updated_at'>[],
  ): Promise<number> {
    const { data, error } = await this.supabase
      .from('gantt_milestones')
      .insert(rows)
      .select();

    if (error) {
      logger.error('Failed to insert milestones:', {
        message: error.message,
        code: error.code,
        details: error.details,
        hint: error.hint,
      });
      throw error;
    }

    return data?.length || 0;
  }

  async updateMilestoneRow(
    id: string,
    updateData: Record<string, unknown>,
  ): Promise<GanttMilestoneRow | null> {
    const { data, error } = await this.supabase
      .from('gantt_milestones')
      .update(updateData)
      .eq('id', id)
      .eq('project_id', this.projectId)
      .select();

    if (error) {
      logger.error('Failed to update milestone:', error.message, error.code, error.details, error.hint);
      return null;
    }

    if (!data || data.length === 0) {
      logger.warn('[updateMilestoneRow] No row matched:', { milestoneId: id, projectId: this.projectId });
      return null;
    }

    if (data.length > 1) {
      logger.warn('[updateMilestoneRow] Multiple rows updated:', { milestoneId: id, rowCount: data.length });
    }

    return data[0] as GanttMilestoneRow;
  }

  async insertMilestoneRow(
    row: Omit<GanttMilestoneRow, 'created_at' | 'updated_at'>,
  ): Promise<GanttMilestoneRow> {
    const { data, error } = await this.supabase
      .from('gantt_milestones')
      .insert(row)
      .select()
      .single();

    if (error) {
      logger.error('[insertMilestoneRow] Failed:', {
        message: error.message,
        code: error.code,
        details: error.details,
        hint: error.hint,
        fullError: JSON.stringify(error, Object.getOwnPropertyNames(error)),
      });
      throw error;
    }

    return data;
  }

  async deleteMilestoneRow(id: string): Promise<boolean> {
    const { error } = await this.supabase
      .from('gantt_milestones')
      .delete()
      .eq('id', id)
      .eq('project_id', this.projectId);

    if (error) {
      logger.error('Failed to delete milestone:', error);
      return false;
    }

    return true;
  }

  // ── Dependencies ──

  async loadDependencyRows(): Promise<GanttDependencyRow[]> {
    const { data, error } = await this.supabase
      .from('gantt_dependencies')
      .select('*')
      .eq('project_id', this.projectId);

    if (error) {
      logger.error('Failed to load dependencies:', error);
      throw error;
    }

    return data || [];
  }

  async deleteAllDependencyRows(): Promise<void> {
    const { error } = await this.supabase
      .from('gantt_dependencies')
      .delete()
      .eq('project_id', this.projectId);

    if (error) {
      logger.error('Failed to delete existing dependencies:', {
        message: error.message,
        code: error.code,
        details: error.details,
        hint: error.hint,
      });
      throw error;
    }
  }

  async insertDependencyRows(
    rows: Omit<GanttDependencyRow, 'created_at'>[],
  ): Promise<number> {
    const { data, error } = await this.supabase
      .from('gantt_dependencies')
      .insert(rows)
      .select();

    if (error) {
      logger.error('Failed to insert dependencies:', {
        message: error.message,
        code: error.code,
        details: error.details,
        hint: error.hint,
        fullError: JSON.stringify(error, Object.getOwnPropertyNames(error)),
        rowsAttempted: rows.length,
        sampleRow: rows[0],
      });
      throw error;
    }

    return data?.length || 0;
  }

  async insertDependencyRow(
    row: Omit<GanttDependencyRow, 'created_at'>,
  ): Promise<GanttDependencyRow> {
    const { data, error } = await this.supabase
      .from('gantt_dependencies')
      .insert(row)
      .select()
      .single();

    if (error) {
      logger.error('[insertDependencyRow] Failed:', {
        message: error.message,
        code: error.code,
        details: error.details,
        hint: error.hint,
        fullError: JSON.stringify(error, Object.getOwnPropertyNames(error)),
      });
      throw error;
    }

    return data;
  }

  async deleteDependencyRow(id: string): Promise<boolean> {
    const { error } = await this.supabase
      .from('gantt_dependencies')
      .delete()
      .eq('id', id)
      .eq('project_id', this.projectId);

    if (error) {
      logger.error('Failed to delete dependency:', error);
      return false;
    }

    return true;
  }
}
