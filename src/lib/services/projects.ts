/**
 * Projects Service
 * 프로젝트 CRUD 작업을 담당합니다.
 */

import { createClient } from '@/lib/supabase/client';
import type {
  Project,
  CreateProjectDTO,
  UpdateProjectDTO,
} from '@/lib/types';

// Check if Supabase is configured
const USE_MOCK =
  !process.env.NEXT_PUBLIC_SUPABASE_URL ||
  !process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ||
  process.env.NEXT_PUBLIC_USE_MOCK === 'true';

// Mock Storage Keys
const STORAGE_KEY_PROJECTS = 'contech_dx_projects';

// ============================================
// Mock Storage Functions
// ============================================

function getMockProjects(): Project[] {
  if (typeof window === 'undefined') return [];
  const data = localStorage.getItem(STORAGE_KEY_PROJECTS);
  return data ? JSON.parse(data) : [];
}

function saveMockProjects(projects: Project[]): void {
  if (typeof window === 'undefined') return;
  localStorage.setItem(STORAGE_KEY_PROJECTS, JSON.stringify(projects));
}

function initializeMockProjects(): void {
  const existing = getMockProjects();
  if (existing.length > 0) return;

  const mockProjects: Project[] = [
    {
      id: 'mock-project-1',
      name: '서울 강남 오피스 빌딩 신축',
      description: '지상 20층 규모의 오피스 빌딩 신축 공사',
      location: '서울특별시 강남구 테헤란로 123',
      client: '강남건설(주)',
      contract_amount: 15000000000,
      start_date: '2024-01-01',
      end_date: '2025-12-31',
      status: 'active',
      created_by: 'mock-user-1',
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    },
    {
      id: 'mock-project-2',
      name: '부산 해운대 아파트 단지',
      description: '15개동 1,200세대 규모의 아파트 단지 건설',
      location: '부산광역시 해운대구 센텀동로 456',
      client: '해운대개발(주)',
      contract_amount: 45000000000,
      start_date: '2024-03-01',
      end_date: '2026-06-30',
      status: 'planning',
      created_by: 'mock-user-1',
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    },
    {
      id: 'mock-project-3',
      name: '인천 첨단 물류센터',
      description: '스마트 물류 시스템이 적용된 대규모 물류센터',
      location: '인천광역시 연수구 송도국제도시 789',
      client: '글로벌물류(주)',
      contract_amount: 8500000000,
      start_date: '2023-06-01',
      end_date: '2024-05-31',
      status: 'completed',
      created_by: 'mock-user-1',
      created_at: new Date(Date.now() - 86400000 * 30).toISOString(),
      updated_at: new Date(Date.now() - 86400000 * 30).toISOString(),
    },
  ];

  saveMockProjects(mockProjects);
  console.log('✅ Mock Projects initialized:', mockProjects.length);
}

// ============================================
// Service Functions
// ============================================

/**
 * Get all projects
 */
export async function getProjects(): Promise<Project[]> {
  if (USE_MOCK) {
    initializeMockProjects();
    return getMockProjects();
  }

  const supabase = createClient();

  const { data, error } = await supabase
    .from('projects')
    .select('*')
    .order('created_at', { ascending: false });

  if (error) {
    console.error('Error fetching projects:', error);
    initializeMockProjects();
    return getMockProjects();
  }

  return data as Project[];
}

/**
 * Get a single project by ID
 */
export async function getProject(id: string): Promise<Project | null> {
  if (USE_MOCK) {
    const projects = getMockProjects();
    return projects.find((p) => p.id === id) || null;
  }

  const supabase = createClient();

  const { data, error } = await supabase
    .from('projects')
    .select('*')
    .eq('id', id)
    .single();

  if (error) {
    if (error.code === 'PGRST116') {
      // Not found - try mock
      const projects = getMockProjects();
      return projects.find((p) => p.id === id) || null;
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
  if (USE_MOCK) {
    const newProject: Project = {
      id: `mock-project-${Date.now()}`,
      ...project,
      status: project.status || 'planning',
      created_by: 'mock-user-1',
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };

    const projects = getMockProjects();
    projects.unshift(newProject);
    saveMockProjects(projects);

    console.log('✅ Mock Project created:', newProject.id);
    return newProject;
  }

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
  if (USE_MOCK) {
    const projects = getMockProjects();
    const index = projects.findIndex((p) => p.id === id);

    if (index === -1) {
      throw new Error('Project not found');
    }

    projects[index] = {
      ...projects[index],
      ...updates,
      updated_at: new Date().toISOString(),
    };

    saveMockProjects(projects);
    console.log('✅ Mock Project updated:', id);
    return projects[index];
  }

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
  if (USE_MOCK) {
    const projects = getMockProjects();
    const filtered = projects.filter((p) => p.id !== id);
    saveMockProjects(filtered);
    console.log('✅ Mock Project deleted:', id);
    return;
  }

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
  if (USE_MOCK) {
    const projects = getMockProjects();
    return projects.filter((p) => p.created_by === userId);
  }

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

