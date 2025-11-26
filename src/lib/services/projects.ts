/**
 * Projects Service
 * 프로젝트 CRUD 작업을 담당합니다.
 */

import { createClient } from '@/lib/supabase/client';
import type { SupabaseClient } from "@supabase/supabase-js";
import type {
  Project,
  CreateProjectDTO,
  UpdateProjectDTO,
} from '@/lib/types';

// ============================================
// Service Functions
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
    console.error('Error fetching projects:', error);
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
    console.error('Error fetching project:', error);
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
    status: project.status || 'planning',
    created_by: user?.id,
  };

  // Clean data: Remove undefined values and empty strings
  const cleanedProject = Object.fromEntries(
    Object.entries(projectData).filter(([_, v]) => v !== undefined && v !== '')
  );

  console.log('🔧 Cleaned project data for Supabase:', cleanedProject);

  const { data, error } = await supabase
    .from('projects')
    .insert(cleanedProject)
    .select()
    .single();

  if (error) {
    console.error('❌ Error creating project:', error);
    throw new Error('Failed to create project');
  }

  console.log('✅ Project created successfully:', data.id);
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
    .single();

  if (error) {
    console.error('Error updating project:', error);
    throw new Error('Failed to update project');
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
    console.error('Error deleting project:', error);
    throw new Error('Failed to delete project');
  }
}

/**
 * Get projects by status
 */
export async function getProjectsByStatus(
  status: string
): Promise<Project[]> {
  const allProjects = await getProjects();
  return allProjects.filter((p) => p.status === status);
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
    console.error('Error fetching user projects:', error);
    return [];
  }

  return data as Project[];
}

