// Database types

// 회원 등급 타입
export type UserRole = 'admin' | 'main_user' | 'vip_user' | 'user';

export interface Post {
  id: string;
  title: string;
  content: string;
  author_id: string;
  author?: {
    email: string;
    role?: UserRole;
  };
  created_at: string;
  updated_at: string;
}

export interface Comment {
  id: string;
  post_id: string;
  content: string;
  author_id: string;
  author?: {
    email: string;
    role?: UserRole;
  };
  created_at: string;
}

export interface Profile {
  id: string;
  email: string;
  role: UserRole;
  display_name?: string | null;
  avatar_url?: string | null;
  bio?: string | null;
  created_at: string;
  updated_at?: string;
}

export interface PaginationParams {
  page: number;
  perPage: number;
}

export interface PaginatedResponse<T> {
  data: T[];
  count: number;
  page: number;
  perPage: number;
  totalPages: number;
}
