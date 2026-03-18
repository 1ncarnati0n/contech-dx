'use client';

import { useState, useEffect, useCallback } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { formatDistanceToNow } from 'date-fns';
import { ko } from 'date-fns/locale';
import { Card, CardContent } from '@/shared/components/ui/Card';
import { Badge } from '@/shared/components/ui/Badge';
import {
  Building2,
  Layers,
  ClipboardList,
  CalendarDays,
  Box,
  FolderKanban,
  Calendar,
  MapPin,
  ChevronDown,
  Loader2,
  RefreshCw,
} from 'lucide-react';
import type { Project } from '@/shared/types';

// 통계 데이터 타입
export interface AdminStats {
  totalBuildings: number;
  totalFloors: number;
  totalFloorTrades: number;
  totalProcessPlans: number;
  totalPouringSections: number;
  activeProjects: number;
}

// 최근 동 데이터 타입
export interface RecentBuilding {
  id: string;
  projectId: string;
  projectName: string;
  buildingName: string;
  buildingNumber: number;
  floorCount: number;
  coreType: string;
  slabType: string;
  createdAt: string;
}

interface AdminBuildingsClientProps {
  projects: Pick<Project, 'id' | 'name'>[];
  initialStats: AdminStats;
  initialBuildings: RecentBuilding[];
}

export default function AdminBuildingsClient({
  projects,
  initialStats,
  initialBuildings,
}: AdminBuildingsClientProps) {
  const router = useRouter();
  const searchParams = useSearchParams();

  // URL 쿼리 파라미터에서 초기 프로젝트 ID 복원
  const initialProjectId = searchParams.get('project');

  const [selectedProjectId, setSelectedProjectId] = useState<string | null>(initialProjectId);
  const [stats, setStats] = useState<AdminStats>(initialStats);
  const [buildings, setBuildings] = useState<RecentBuilding[]>(initialBuildings);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // 프로젝트별 데이터 조회
  const fetchProjectData = useCallback(async (projectId: string) => {
    setLoading(true);
    setError(null);

    try {
      const response = await fetch(`/api/admin/buildings?projectId=${projectId}`);
      if (!response.ok) {
        throw new Error('데이터 조회 실패');
      }

      const data = await response.json();
      setStats(data.stats);
      setBuildings(data.buildings);
    } catch (e) {
      setError(e instanceof Error ? e.message : '알 수 없는 오류');
    } finally {
      setLoading(false);
    }
  }, []);

  // 프로젝트 선택 변경 핸들러 (URL 업데이트 포함)
  const handleProjectChange = useCallback((projectId: string | null) => {
    setSelectedProjectId(projectId);

    // URL 쿼리 파라미터 업데이트
    const params = new URLSearchParams(searchParams.toString());
    if (projectId) {
      params.set('project', projectId);
    } else {
      params.delete('project');
    }
    router.replace(`?${params.toString()}`, { scroll: false });
  }, [router, searchParams]);

  // 프로젝트 선택 변경 시 데이터 재조회
  useEffect(() => {
    if (selectedProjectId) {
      fetchProjectData(selectedProjectId);
    } else {
      // 전체 선택 시 초기 데이터 복원
      setStats(initialStats);
      setBuildings(initialBuildings);
      setError(null);
    }
  }, [selectedProjectId, fetchProjectData, initialStats, initialBuildings]);

  // 재시도 핸들러
  const handleRetry = useCallback(() => {
    if (selectedProjectId) {
      fetchProjectData(selectedProjectId);
    }
  }, [selectedProjectId, fetchProjectData]);

  const selectedProject = projects.find(p => p.id === selectedProjectId);

  return (
    <div className="max-w-7xl mx-auto py-10 px-4 sm:px-6 lg:px-8">
      {/* 헤더 */}
      <div className="mb-8 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="p-3 bg-white rounded-xl shadow-sm border border-slate-200 dark:bg-slate-900 dark:border-slate-800">
            <Building2 className="w-6 h-6 text-slate-700 dark:text-slate-300" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-slate-900 dark:text-white">건물 데이터 모니터링</h1>
            <p className="text-slate-500 dark:text-slate-400 text-sm">
              {selectedProject ? `${selectedProject.name} 프로젝트` : '전체 프로젝트'}의 동/층/공종 데이터 현황
            </p>
          </div>
        </div>

        {/* 프로젝트 선택 드롭다운 */}
        <div className="relative">
          <select
            value={selectedProjectId || ''}
            onChange={(e) => handleProjectChange(e.target.value || null)}
            className="appearance-none w-full sm:w-64 px-4 py-2.5 pr-10 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg text-sm font-medium text-slate-700 dark:text-slate-300 shadow-sm hover:border-slate-300 dark:hover:border-slate-600 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors cursor-pointer"
            disabled={loading}
          >
            <option value="">전체 프로젝트</option>
            {projects.map((project) => (
              <option key={project.id} value={project.id}>
                {project.name}
              </option>
            ))}
          </select>
          <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 pointer-events-none" />
        </div>
      </div>

      {/* 로딩 인디케이터 */}
      {loading && (
        <div className="flex items-center justify-center py-8">
          <Loader2 className="w-6 h-6 animate-spin text-blue-500" />
          <span className="ml-2 text-slate-500">데이터 로딩 중...</span>
        </div>
      )}

      {/* 에러 메시지 + 재시도 버튼 */}
      {error && (
        <Card className="mb-6 border-red-200 bg-red-50 dark:border-red-900 dark:bg-red-900/20">
          <CardContent className="p-4 flex items-center justify-between">
            <p className="text-red-600 dark:text-red-400 text-sm">{error}</p>
            <button
              onClick={handleRetry}
              disabled={loading}
              className="inline-flex items-center gap-2 px-3 py-1.5 text-sm font-medium text-red-600 dark:text-red-400 bg-white dark:bg-slate-800 border border-red-200 dark:border-red-800 rounded-lg hover:bg-red-50 dark:hover:bg-red-900/30 focus:outline-none focus:ring-2 focus:ring-red-500 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
              다시 시도
            </button>
          </CardContent>
        </Card>
      )}

      {/* 통계 카드 섹션 */}
      <div className={`grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-6 gap-4 mb-8 transition-opacity ${loading ? 'opacity-50' : ''}`}>
        <Card>
          <CardContent className="p-4 flex items-center justify-between">
            <div>
              <p className="text-xs font-medium text-slate-500 dark:text-slate-400 uppercase">총 동 수</p>
              <p className="text-2xl font-bold text-slate-900 dark:text-white mt-1">{stats.totalBuildings}</p>
            </div>
            <div className="p-2 bg-blue-100 dark:bg-blue-900/30 rounded-lg text-blue-600 dark:text-blue-400">
              <Building2 className="w-5 h-5" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4 flex items-center justify-between">
            <div>
              <p className="text-xs font-medium text-slate-500 dark:text-slate-400 uppercase">총 층 수</p>
              <p className="text-2xl font-bold text-slate-900 dark:text-white mt-1">{stats.totalFloors}</p>
            </div>
            <div className="p-2 bg-green-100 dark:bg-green-900/30 rounded-lg text-green-600 dark:text-green-400">
              <Layers className="w-5 h-5" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4 flex items-center justify-between">
            <div>
              <p className="text-xs font-medium text-slate-500 dark:text-slate-400 uppercase">층별 공종</p>
              <p className="text-2xl font-bold text-slate-900 dark:text-white mt-1">{stats.totalFloorTrades}</p>
            </div>
            <div className="p-2 bg-orange-100 dark:bg-orange-900/30 rounded-lg text-orange-600 dark:text-orange-400">
              <ClipboardList className="w-5 h-5" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4 flex items-center justify-between">
            <div>
              <p className="text-xs font-medium text-slate-500 dark:text-slate-400 uppercase">공정 계획</p>
              <p className="text-2xl font-bold text-slate-900 dark:text-white mt-1">{stats.totalProcessPlans}</p>
            </div>
            <div className="p-2 bg-purple-100 dark:bg-purple-900/30 rounded-lg text-purple-600 dark:text-purple-400">
              <CalendarDays className="w-5 h-5" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4 flex items-center justify-between">
            <div>
              <p className="text-xs font-medium text-slate-500 dark:text-slate-400 uppercase">타설 구간</p>
              <p className="text-2xl font-bold text-slate-900 dark:text-white mt-1">{stats.totalPouringSections}</p>
            </div>
            <div className="p-2 bg-cyan-100 dark:bg-cyan-900/30 rounded-lg text-cyan-600 dark:text-cyan-400">
              <Box className="w-5 h-5" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4 flex items-center justify-between">
            <div>
              <p className="text-xs font-medium text-slate-500 dark:text-slate-400 uppercase">
                {selectedProjectId ? '선택된 프로젝트' : '전체 프로젝트'}
              </p>
              <p className="text-2xl font-bold text-slate-900 dark:text-white mt-1">
                {selectedProjectId ? 1 : stats.activeProjects}
              </p>
            </div>
            <div className="p-2 bg-slate-100 dark:bg-slate-800 rounded-lg text-slate-600 dark:text-slate-300">
              <FolderKanban className="w-5 h-5" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* 최근 생성된 동 테이블 */}
      <Card className={`overflow-hidden border-0 shadow-md transition-opacity ${loading ? 'opacity-50' : ''}`}>
        <div className="px-6 py-4 border-b border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-900/50">
          <h2 className="text-lg font-semibold text-slate-900 dark:text-white">
            {selectedProject ? `${selectedProject.name} - 동 목록` : '최근 생성된 동'}
          </h2>
          <p className="text-sm text-slate-500 dark:text-slate-400">
            {selectedProject
              ? `${buildings.length}개의 동 정보입니다.`
              : `최근 20개의 동 정보입니다.`}
          </p>
        </div>
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-slate-200 dark:divide-slate-800">
            <thead className="bg-slate-50 dark:bg-slate-900/50">
              <tr>
                {/* 전체 프로젝트 선택 시에만 프로젝트 컬럼 표시 */}
                {!selectedProjectId && (
                  <th className="px-6 py-4 text-left text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
                    프로젝트
                  </th>
                )}
                <th className="px-6 py-4 text-left text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
                  동 정보
                </th>
                <th className="px-6 py-4 text-left text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
                  층수
                </th>
                <th className="px-6 py-4 text-left text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
                  구조 타입
                </th>
                <th className="px-6 py-4 text-left text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
                  생성일
                </th>
              </tr>
            </thead>
            <tbody className="bg-white dark:bg-slate-900 divide-y divide-slate-200 dark:divide-slate-800">
              {buildings.map((building) => (
                <tr key={building.id} className="hover:bg-slate-50 dark:hover:bg-slate-900/50 transition-colors">
                  {!selectedProjectId && (
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center gap-2">
                        <FolderKanban className="w-4 h-4 text-slate-400" />
                        <span className="text-sm font-medium text-slate-900 dark:text-slate-200">
                          {building.projectName}
                        </span>
                      </div>
                    </td>
                  )}
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="flex flex-col">
                      <span className="text-sm font-medium text-slate-900 dark:text-slate-200">
                        {building.buildingName}
                      </span>
                      <span className="text-xs text-slate-500 dark:text-slate-400">
                        #{building.buildingNumber}번 동
                      </span>
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <Badge variant="secondary" className="text-xs">
                      지상 {building.floorCount}층
                    </Badge>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="flex flex-col gap-1">
                      <span className="text-xs text-slate-600 dark:text-slate-400">{building.coreType}</span>
                      <span className="text-xs text-slate-500 dark:text-slate-500">{building.slabType}</span>
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="flex items-center gap-2 text-sm text-slate-600 dark:text-slate-400">
                      <Calendar className="w-4 h-4 text-slate-400" />
                      {formatDistanceToNow(new Date(building.createdAt), {
                        addSuffix: true,
                        locale: ko,
                      })}
                    </div>
                  </td>
                </tr>
              ))}
              {buildings.length === 0 && (
                <tr>
                  <td colSpan={selectedProjectId ? 4 : 5} className="px-6 py-12 text-center text-slate-500">
                    <Building2 className="w-12 h-12 mx-auto mb-3 text-slate-300" />
                    <p>
                      {selectedProject
                        ? `${selectedProject.name} 프로젝트에 등록된 건물이 없습니다.`
                        : '등록된 건물 데이터가 없습니다.'}
                    </p>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </Card>

      {/* 안내 메시지 */}
      <div className="mt-6 p-4 bg-slate-50 dark:bg-slate-900/50 rounded-lg border border-slate-200 dark:border-slate-800">
        <div className="flex items-start gap-3">
          <MapPin className="w-5 h-5 text-slate-400 mt-0.5" />
          <div>
            <p className="text-sm text-slate-600 dark:text-slate-400">
              건물 데이터의 수정/삭제는 각 프로젝트의 상세 페이지에서 가능합니다.
            </p>
            <p className="text-xs text-slate-500 dark:text-slate-500 mt-1">
              이 페이지는 전체 데이터 현황을 모니터링하는 읽기 전용 페이지입니다.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
