'use client';

import { useState, useMemo, useEffect, useRef } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import { Plus, Search, Filter, FolderKanban } from 'lucide-react';
import { toast } from 'sonner';
import { Button, Card } from '@/components/ui';
import { Skeleton } from '@/components/ui/Skeleton';
import { ProjectCard } from './ProjectCard';
import { ProjectCreateModal } from './ProjectCreateModal';
import type { Project, ProjectStatus } from '@/lib/types';
import { getProjects } from '@/lib/services/projects';
import { useAsyncList } from '@/lib/hooks';
import { getStatusOptions } from '@/lib/utils/index';

interface ProjectListProps {
  isAdmin?: boolean;
}

export function ProjectList({ isAdmin = false }: ProjectListProps) {
  const searchParams = useSearchParams();
  const router = useRouter();

  // useAsyncList 훅으로 데이터 fetching 단순화
  const { data: projects, loading, refetch: loadProjects } = useAsyncList<Project>(getProjects);

  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<ProjectStatus | 'all'>('all');
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);

  // 접근 거부 toast 중복 실행 방지 (React Strict Mode 대응)
  const hasShownAccessDenied = useRef(false);

  // 접근 거부 메시지 처리
  useEffect(() => {
    if (searchParams.get('access') === 'denied' && !hasShownAccessDenied.current) {
      hasShownAccessDenied.current = true;
      toast.warning('프로젝트 접근 권한이 없습니다', {
        description: '프로젝트 멤버로 등록되어 있지 않습니다. 관리자에게 멤버 등록을 요청해주세요.',
        duration: 5000,
      });
      // URL에서 쿼리 파라미터 제거
      router.replace('/projects', { scroll: false });
    }
  }, [searchParams, router]);

  // 필터링된 프로젝트 (useMemo로 최적화)
  const filteredProjects = useMemo(() => {
    if (!projects) return [];
    let filtered = [...projects];

    // 검색 필터
    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter(
        (p) =>
          p.name.toLowerCase().includes(query) ||
          p.description?.toLowerCase().includes(query) ||
          p.location?.toLowerCase().includes(query) ||
          p.client?.toLowerCase().includes(query)
      );
    }

    // 상태 필터
    if (statusFilter !== 'all') {
      filtered = filtered.filter((p) => p.status === statusFilter);
    }

    return filtered;
  }, [projects, searchQuery, statusFilter]);

  // 상태 옵션 (관리자는 테스트 상태 포함)
  const statusOptions = useMemo(() => {
    return getStatusOptions(isAdmin);
  }, [isAdmin]);

  const handleCreateClick = () => {
    setIsCreateModalOpen(true);
  };

  const handleModalClose = () => {
    setIsCreateModalOpen(false);
  };

  const handleCreateSuccess = () => {
    loadProjects();
  };

  return (
    <div className="max-w-7xl mx-auto py-10 px-4 sm:px-6 lg:px-8">
      {/* Header - 아이콘 배지 스타일 */}
      <div className="mb-8 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="p-3 bg-white rounded-xl shadow-sm border border-zinc-200 dark:bg-zinc-900 dark:border-zinc-800">
            <FolderKanban className="w-6 h-6 text-zinc-700 dark:text-zinc-300" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-zinc-900 dark:text-white">프로젝트</h1>
            <p className="text-zinc-500 dark:text-zinc-400 text-sm">
              진행 중인 프로젝트 현황과 공정률을 한눈에 확인하세요.
            </p>
          </div>
        </div>

        <Button
          onClick={handleCreateClick}
          className="gap-2 bg-zinc-900 hover:bg-black dark:bg-white dark:text-zinc-900 dark:hover:bg-zinc-100 shadow-lg shadow-zinc-900/20 hover:shadow-zinc-900/30 transition-all"
        >
          <Plus className="w-4 h-4" />
          새 프로젝트
        </Button>
      </div>

      {/* Filter Bar */}
      <div className="flex flex-col sm:flex-row gap-4 mb-6">
        {/* Search */}
        <div className="flex-1 relative group">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-400 group-focus-within:text-zinc-900 dark:group-focus-within:text-white transition-colors" />
          <input
            type="text"
            placeholder="프로젝트명, 위치, 발주처 검색..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-11 pr-4 py-3 bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-zinc-900/10 focus:border-zinc-900 dark:focus:ring-white/20 dark:focus:border-white transition-all shadow-sm"
          />
        </div>

        {/* Status Filter */}
        <div className="relative min-w-[180px]">
          <Filter className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-400 pointer-events-none" />
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value as ProjectStatus | 'all')}
            className="w-full pl-11 pr-10 py-3 bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-xl text-sm appearance-none focus:outline-none focus:ring-2 focus:ring-zinc-900/10 focus:border-zinc-900 dark:focus:ring-white/20 dark:focus:border-white transition-all shadow-sm cursor-pointer"
          >
            <option value="all">모든 상태</option>
            {statusOptions.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
          <div className="absolute right-4 top-1/2 -translate-y-1/2 pointer-events-none">
            <svg className="w-4 h-4 text-zinc-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
            </svg>
          </div>
        </div>
      </div>

      {/* 검색 결과 카운트 */}
      {!loading && (
        <div className="mb-4 text-sm text-zinc-500 dark:text-zinc-400">
          총 <span className="font-semibold text-zinc-700 dark:text-zinc-300">{filteredProjects.length}</span>개의 프로젝트
          {(searchQuery || statusFilter !== 'all') && projects && (
            <span className="ml-1">(전체 {projects.length}개 중)</span>
          )}
        </div>
      )}

      {/* Project Grid */}
      {loading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {[1, 2, 3, 4, 5, 6].map((i) => (
            <Card key={i} className="h-64 overflow-hidden">
              <div className="p-6 space-y-4">
                <Skeleton className="h-6 w-3/4" />
                <Skeleton className="h-4 w-1/2" />
                <div className="space-y-2 pt-4">
                  <Skeleton className="h-4 w-full" />
                  <Skeleton className="h-4 w-2/3" />
                </div>
              </div>
            </Card>
          ))}
        </div>
      ) : filteredProjects.length === 0 ? (
        <Card className="p-16 text-center border-dashed border-2">
          <div className="flex flex-col items-center gap-3">
            <div className="p-4 bg-zinc-100 dark:bg-zinc-800 rounded-full">
              <FolderKanban className="w-8 h-8 text-zinc-400" />
            </div>
            <p className="text-zinc-600 dark:text-zinc-400 font-medium">
              {searchQuery || statusFilter !== 'all'
                ? '검색 결과가 없습니다.'
                : '프로젝트가 없습니다.'}
            </p>
            <p className="text-zinc-400 dark:text-zinc-500 text-sm">
              {searchQuery || statusFilter !== 'all'
                ? '다른 검색어나 필터를 시도해보세요.'
                : '새 프로젝트를 생성해서 시작하세요!'}
            </p>
          </div>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredProjects.map((project) => (
            <ProjectCard key={project.id} project={project} />
          ))}
        </div>
      )}

      {/* Create Modal */}
      <ProjectCreateModal
        isOpen={isCreateModalOpen}
        onClose={handleModalClose}
        onSuccess={handleCreateSuccess}
      />
    </div>
  );
}
