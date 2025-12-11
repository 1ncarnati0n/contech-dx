'use client';

import { useState, useEffect, useMemo, useCallback } from 'react';
import { Plus, Search, Filter } from 'lucide-react';
import { Button, Card } from '@/components/ui';
import { Skeleton } from '@/components/ui/Skeleton';
import { ProjectCard } from './ProjectCard';
import { ProjectCreateModal } from './ProjectCreateModal';
import type { Project, ProjectStatus } from '@/lib/types';
import { getProjects } from '@/lib/services/projects';
import { logger, getStatusOptions } from '@/lib/utils/index';

interface ProjectListProps {
  isAdmin?: boolean;
}

export function ProjectList({ isAdmin = false }: ProjectListProps) {
  const [projects, setProjects] = useState<Project[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<ProjectStatus | 'all'>('all');
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);

  // 프로젝트 로드
  const loadProjects = useCallback(async () => {
    try {
      setLoading(true);
      const data = await getProjects();
      setProjects(data);
    } catch (error) {
      logger.error('Failed to load projects:', error);
    } finally {
      setLoading(false);
    }
  }, []);

  // 초기 로드
  useEffect(() => {
    loadProjects();
  }, [loadProjects]);

  // 필터링된 프로젝트 (useMemo로 최적화)
  const filteredProjects = useMemo(() => {
    let filtered = [...projects];

    logger.debug('🔍 ProjectList Filter:', {
      isAdmin,
      totalProjects: projects.length,
    });


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

    logger.debug('  - Filtered projects:', filtered.length);
    return filtered;
  }, [projects, searchQuery, statusFilter, isAdmin]);

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
    <div className="space-y-6">
      {/* Header & Controls */}
      <div className="flex flex-col md:flex-row gap-6 items-start md:items-end justify-between">
        <div>
          <h1 className="text-3xl font-bold text-slate-900 dark:text-white tracking-tight">
            프로젝트
          </h1>
          <p className="mt-2 text-slate-600 dark:text-slate-400">
            진행 중인 프로젝트 현황과 공정률을 한눈에 확인하세요.
          </p>
        </div>

        <Button onClick={handleCreateClick} className="gap-2 shadow-lg shadow-primary-500/20 hover:shadow-primary-500/30 transition-all">
          <Plus className="w-4 h-4" />
          새 프로젝트
        </Button>
      </div>

      {/* Filter Bar */}
      <div className="flex flex-col sm:flex-row gap-4 p-1">
        {/* Search */}
        <div className="flex-1 relative group">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 group-focus-within:text-primary-500 transition-colors" />
          <input
            type="text"
            placeholder="프로젝트명, 위치, 발주처 검색..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-10 pr-4 py-2.5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-primary-500/20 focus:border-primary-500 transition-all shadow-sm"
          />
        </div>

        {/* Status Filter */}
        <div className="relative min-w-[160px]">
          <Filter className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 pointer-events-none" />
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value as ProjectStatus | 'all')}
            className="w-full pl-10 pr-8 py-2.5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl text-sm appearance-none focus:outline-none focus:ring-2 focus:ring-primary-500/20 focus:border-primary-500 transition-all shadow-sm cursor-pointer"
          >
            <option value="all">모든 상태</option>
            {statusOptions.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
          <div className="absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none">
            <svg className="w-4 h-4 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
            </svg>
          </div>
        </div>
      </div>

      {/* Project Grid */}
      {loading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {[1, 2, 3, 4, 5, 6].map((i) => (
            <Card key={i} className="h-64">
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
        <Card className="p-12 text-center">
          <p className="text-gray-600 dark:text-gray-400">
            {searchQuery || statusFilter !== 'all'
              ? '검색 결과가 없습니다.'
              : '프로젝트가 없습니다. 첫 프로젝트를 생성해보세요!'}
          </p>
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
        isAdmin={isAdmin}
      />
    </div>
  );
}
