/**
 * Project Members Service
 * 프로젝트 멤버 관리 작업을 담당합니다.
 */

import { createClient } from '@/lib/supabase/client';
import type {
  ProjectMember,
  ProjectMemberRole,
  AddProjectMemberDTO,
  UpdateProjectMemberRoleDTO,
} from '@/lib/types';

// Database record type with joined profile data
interface ProjectMemberRecord {
  id: string;
  project_id: string;
  user_id: string;
  role: ProjectMemberRole;
  created_at: string;
  user?: {
    email: string;
    display_name: string;
    avatar_url?: string;
  };
}

// Check if Supabase is configured
const USE_MOCK =
  !process.env.NEXT_PUBLIC_SUPABASE_URL ||
  !process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ||
  process.env.NEXT_PUBLIC_USE_MOCK === 'true';

// Mock Storage Keys
const STORAGE_KEY_MEMBERS = 'contech_dx_project_members';

// ============================================
// Mock Storage Functions
// ============================================

function getMockMembers(): ProjectMember[] {
  if (typeof window === 'undefined') return [];
  const data = localStorage.getItem(STORAGE_KEY_MEMBERS);
  return data ? JSON.parse(data) : [];
}

function saveMockMembers(members: ProjectMember[]): void {
  if (typeof window === 'undefined') return;
  localStorage.setItem(STORAGE_KEY_MEMBERS, JSON.stringify(members));
}

function initializeMockMembers(): void {
  const existing = getMockMembers();
  if (existing.length > 0) return;

  const mockMembers: ProjectMember[] = [
    {
      id: 'mock-member-1',
      project_id: 'mock-project-1',
      user_id: 'mock-user-1',
      role: 'pm',
      created_at: new Date().toISOString(),
      user: {
        email: 'pm@example.com',
        display_name: '김프로',
        avatar_url: undefined,
      },
    },
    {
      id: 'mock-member-2',
      project_id: 'mock-project-1',
      user_id: 'mock-user-2',
      role: 'engineer',
      created_at: new Date().toISOString(),
      user: {
        email: 'engineer@example.com',
        display_name: '박엔지',
        avatar_url: undefined,
      },
    },
  ];

  saveMockMembers(mockMembers);
  console.log('✅ Mock Project Members initialized:', mockMembers.length);
}

// ============================================
// Service Functions
// ============================================

/**
 * Get all members of a project
 */
export async function getProjectMembers(
  projectId: string
): Promise<ProjectMember[]> {
  if (USE_MOCK) {
    initializeMockMembers();
    const members = getMockMembers();
    return members.filter((m) => m.project_id === projectId);
  }

  const supabase = createClient();

  const { data, error } = await supabase
    .from('project_members')
    .select(
      `
      *,
      user:profiles(email, display_name, avatar_url)
    `
    )
    .eq('project_id', projectId)
    .order('created_at', { ascending: true });

  if (error) {
    console.error('Error fetching project members:', error);
    initializeMockMembers();
    const members = getMockMembers();
    return members.filter((m) => m.project_id === projectId);
  }

  // Transform the joined data
  return (data as ProjectMemberRecord[]).map((item) => ({
    id: item.id,
    project_id: item.project_id,
    user_id: item.user_id,
    role: item.role,
    created_at: item.created_at,
    user: item.user ? {
      email: item.user.email,
      display_name: item.user.display_name,
      avatar_url: item.user.avatar_url,
    } : undefined,
  }));
}

/**
 * Add a member to a project
 */
export async function addProjectMember(
  memberData: AddProjectMemberDTO
): Promise<ProjectMember> {
  if (USE_MOCK) {
    const newMember: ProjectMember = {
      id: `mock-member-${Date.now()}`,
      project_id: memberData.project_id,
      user_id: memberData.user_id,
      role: memberData.role || 'member',
      created_at: new Date().toISOString(),
      user: {
        email: `user-${memberData.user_id}@example.com`,
        display_name: `사용자 ${memberData.user_id}`,
      },
    };

    const members = getMockMembers();
    members.push(newMember);
    saveMockMembers(members);

    console.log('✅ Mock Project Member added:', newMember.id);
    return newMember;
  }

  const supabase = createClient();

  // 현재 사용자 확인
  const {
    data: { user: authUser },
  } = await supabase.auth.getUser();

  if (!authUser) {
    throw new Error('로그인이 필요합니다.');
  }

  const { data, error } = await supabase
    .from('project_members')
    .insert({
      project_id: memberData.project_id,
      user_id: memberData.user_id,
      role: memberData.role || 'member',
    })
    .select(
      `
      *,
      user:profiles(email, display_name, avatar_url)
    `
    )
    .single();

  if (error) {
    // 상세 에러 정보 로깅
    console.error('Error adding project member:', {
      message: error.message,
      code: error.code,
      details: error.details,
      hint: error.hint,
      memberData,
    });

    // 구체적인 에러 메시지 제공
    let errorMessage = '멤버 추가에 실패했습니다.';
    
    if (error.code === '23505') {
      // Unique constraint violation
      errorMessage = '이미 프로젝트 멤버로 등록된 사용자입니다.';
    } else if (error.code === '42501') {
      // Insufficient privilege (RLS policy violation)
      errorMessage = '멤버를 추가할 권한이 없습니다. 프로젝트 생성자 또는 PM만 멤버를 추가할 수 있습니다.';
    } else if (error.code === '23503') {
      // Foreign key violation
      errorMessage = '유효하지 않은 프로젝트 또는 사용자입니다.';
    } else if (error.message) {
      errorMessage = error.message;
    }

    throw new Error(errorMessage);
  }

  // Transform the joined data
  const item = data as ProjectMemberRecord;
  return {
    id: item.id,
    project_id: item.project_id,
    user_id: item.user_id,
    role: item.role,
    created_at: item.created_at,
    user: item.user ? {
      email: item.user.email,
      display_name: item.user.display_name,
      avatar_url: item.user.avatar_url,
    } : undefined,
  };
}

/**
 * Update a member's role
 */
export async function updateProjectMemberRole(
  memberId: string,
  updates: UpdateProjectMemberRoleDTO
): Promise<ProjectMember> {
  if (USE_MOCK) {
    const members = getMockMembers();
    const index = members.findIndex((m) => m.id === memberId);

    if (index === -1) {
      throw new Error('Project member not found');
    }

    members[index] = {
      ...members[index],
      role: updates.role,
    };

    saveMockMembers(members);
    console.log('✅ Mock Project Member role updated:', memberId);
    return members[index];
  }

  const supabase = createClient();

  const { data, error } = await supabase
    .from('project_members')
    .update({ role: updates.role })
    .eq('id', memberId)
    .select(
      `
      *,
      user:profiles(email, display_name, avatar_url)
    `
    )
    .single();

  if (error) {
    // 상세 에러 정보 로깅
    console.error('Error updating member role:', {
      message: error.message,
      code: error.code,
      details: error.details,
      hint: error.hint,
      memberId,
      updates,
    });

    let errorMessage = '역할 변경에 실패했습니다.';
    
    if (error.code === '42501') {
      errorMessage = '역할을 변경할 권한이 없습니다. 프로젝트 생성자 또는 PM만 역할을 변경할 수 있습니다.';
    } else if (error.message) {
      errorMessage = error.message;
    }

    throw new Error(errorMessage);
  }

  // Transform the joined data
  const item = data as ProjectMemberRecord;
  return {
    id: item.id,
    project_id: item.project_id,
    user_id: item.user_id,
    role: item.role,
    created_at: item.created_at,
    user: item.user ? {
      email: item.user.email,
      display_name: item.user.display_name,
      avatar_url: item.user.avatar_url,
    } : undefined,
  };
}

/**
 * Remove a member from a project
 */
export async function removeProjectMember(memberId: string): Promise<void> {
  if (USE_MOCK) {
    const members = getMockMembers();
    const filtered = members.filter((m) => m.id !== memberId);
    saveMockMembers(filtered);
    console.log('✅ Mock Project Member removed:', memberId);
    return;
  }

  const supabase = createClient();

  const { error } = await supabase
    .from('project_members')
    .delete()
    .eq('id', memberId);

  if (error) {
    // 상세 에러 정보 로깅
    console.error('Error removing project member:', {
      message: error.message,
      code: error.code,
      details: error.details,
      hint: error.hint,
      memberId,
    });

    let errorMessage = '멤버 제거에 실패했습니다.';
    
    if (error.code === '42501') {
      errorMessage = '멤버를 제거할 권한이 없습니다. 프로젝트 생성자 또는 PM만 멤버를 제거할 수 있습니다.';
    } else if (error.message) {
      errorMessage = error.message;
    }

    throw new Error(errorMessage);
  }
}

/**
 * Check if a user is a member of a project
 */
export async function isProjectMember(
  projectId: string,
  userId: string
): Promise<boolean> {
  if (USE_MOCK) {
    const members = getMockMembers();
    return members.some(
      (m) => m.project_id === projectId && m.user_id === userId
    );
  }

  const supabase = createClient();

  const { data, error } = await supabase
    .from('project_members')
    .select('id')
    .eq('project_id', projectId)
    .eq('user_id', userId)
    .single();

  if (error) {
    if (error.code === 'PGRST116') {
      // Not found
      return false;
    }
    console.error('Error checking project membership:', error);
    return false;
  }

  return !!data;
}

/**
 * Get a user's role in a project
 */
export async function getUserRoleInProject(
  projectId: string,
  userId: string
): Promise<string | null> {
  if (USE_MOCK) {
    const members = getMockMembers();
    const member = members.find(
      (m) => m.project_id === projectId && m.user_id === userId
    );
    return member?.role || null;
  }

  const supabase = createClient();

  const { data, error } = await supabase
    .from('project_members')
    .select('role')
    .eq('project_id', projectId)
    .eq('user_id', userId)
    .single();

  if (error) {
    if (error.code === 'PGRST116') {
      // Not found
      return null;
    }
    console.error('Error fetching user role:', error);
    return null;
  }

  return data.role;
}

