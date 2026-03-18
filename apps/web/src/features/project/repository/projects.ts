/**
 * Projects Service
 * 프로젝트 CRUD 작업을 담당합니다.
 */

import { createClient } from '@/shared/lib/supabase/client';
import type { SupabaseClient } from "@supabase/supabase-js";
import type {
  Project,
  CreateProjectDTO,
  UpdateProjectDTO,
} from '@/shared/types';
import { logger } from '@/shared/utils/logger';

// ============================================
// Repository Functions
// ============================================

/**
 * Get all projects
 */
export async function getProjects(supabaseClient?: SupabaseClient): Promise<Project[]> {
  const supabase = supabaseClient || createClient();

  const { data, error } = await supabase
    .from('projects')
    .select('*')
    .order('created_at', { ascending: false });

  if (error) {
    logger.error('Error fetching projects:', error);
    return [];
  }

  return data as Project[];
}

/**
 * Get a single project by ID or Project Number
 */
export async function getProject(idOrNumber: string, supabaseClient?: SupabaseClient): Promise<Project | null> {
  const supabase = supabaseClient || createClient();
  const isNumber = !isNaN(Number(idOrNumber));

  let query = supabase.from('projects').select('*');

  if (isNumber) {
    query = query.eq('project_number', Number(idOrNumber));
  } else {
    query = query.eq('id', idOrNumber);
  }

  const { data, error } = await query.single();

  if (error) {
    if (error.code === 'PGRST116') {
      return null;
    }
    logger.error('Error fetching project:', error);
    return null;
  }

  return data as Project;
}

/**
 * Create a new project
 */
export async function createProject(
  project: CreateProjectDTO
): Promise<Project> {
  const supabase = createClient();

  // Get current user
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const projectData = {
    ...project,
    status: project.status || 'announcement',
    created_by: user?.id,
  };

  // Clean data: Remove undefined values and empty strings
  const cleanedProject = Object.fromEntries(
    Object.entries(projectData).filter(([, v]) => v !== undefined && v !== '')
  );

  logger.debug('🔧 Cleaned project data for Supabase:', cleanedProject);

  const { data, error } = await supabase
    .from('projects')
    .insert(cleanedProject)
    .select()
    .single();

  if (error) {
    logger.error('❌ Error creating project:', error);
    logger.error('❌ Error details:', {
      message: error.message,
      code: error.code,
      details: error.details,
      hint: error.hint,
      cleanedProject,
    });
    throw new Error(`Failed to create project: ${error.message || error.code || 'Unknown error'}`);
  }

  // 프로젝트 생성자를 PM으로 자동 추가 (RLS 정책을 위해 필수)
  if (data && user?.id) {
    const { error: memberError } = await supabase
      .from('project_members')
      .insert({
        project_id: data.id,
        user_id: user.id,
        role: 'pm'
      });

    if (memberError) {
      logger.warn('⚠️ Failed to add creator as project member:', memberError);
      // 프로젝트 생성은 성공했으므로 에러를 throw하지 않음
    }
  }


  logger.info('✅ Project created successfully:', data.id);
  return data as Project;
}

/**
 * Update a project
 */
export async function updateProject(
  id: string,
  updates: UpdateProjectDTO
): Promise<Project> {
  const supabase = createClient();

  const { data, error } = await supabase
    .from('projects')
    .update({
      ...updates,
      updated_at: new Date().toISOString(),
    })
    .eq('id', id)
    .select()
    .maybeSingle();

  if (error) {
    logger.error('Error updating project:', error);
    throw new Error('Failed to update project');
  }

  if (!data) {
    throw new Error('Project not found or permission denied');
  }


  return data as Project;
}

/**
 * Delete a project
 */
export async function deleteProject(id: string): Promise<void> {
  const supabase = createClient();

  const { error } = await supabase.from('projects').delete().eq('id', id);

  if (error) {
    logger.error('Error deleting project:', error);
    throw new Error('Failed to delete project');
  }

}

/**
 * Get projects by status (서버 사이드 필터링)
 */
export async function getProjectsByStatus(
  status: string,
  supabaseClient?: SupabaseClient
): Promise<Project[]> {
  const supabase = supabaseClient || createClient();

  const { data, error } = await supabase
    .from('projects')
    .select('*')
    .eq('status', status)
    .order('created_at', { ascending: false });

  if (error) {
    logger.error('Error fetching projects by status:', error);
    return [];
  }

  return data as Project[];
}

/**
 * Get projects created by a user
 */
export async function getProjectsByUser(userId: string): Promise<Project[]> {
  const supabase = createClient();

  const { data, error } = await supabase
    .from('projects')
    .select('*')
    .eq('created_by', userId)
    .order('created_at', { ascending: false });

  if (error) {
    logger.error('Error fetching user projects:', error);
    return [];
  }

  return data as Project[];
}
