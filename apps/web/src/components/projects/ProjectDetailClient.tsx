'use client';

import { useState, useCallback, useEffect, useRef } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import {
  Calendar,
  DollarSign,
  MapPin,
  Building2,
  Edit,
  Trash2,
  Settings,
  LayoutDashboard,
  Calculator,
  Database,
  Package,
  Layers,
  BarChart3,
  Users,
  FileText,
  type LucideIcon,
} from 'lucide-react';
import { toast } from 'sonner';
import { Button, Card } from '@/components/ui';
import type { Project } from '@/lib/types';
import { deleteProject, getProject } from '@/lib/services/projects';
import { ProjectSidebar } from './ProjectSidebar';
import { ProjectEditModal } from './ProjectEditModal';
import { ConstructionDashboard } from '@/components/dashboard/ConstructionDashboard';
import { DataInputPage, BuildingBasicInfoPage, QuantityInputPage, DetailedQuantityInputPage, GeologicalDataPage, BuildingProcessPlanPage, BasementProcessPlanPage, PouringSectionReviewPage } from '@/components/buildings';
import { ProjectTeamPage } from './ProjectTeamPage';
import { GanttChartPage } from './GanttChartPage';
import { formatCurrency, formatDate, getStatusLabel, getStatusColors, logger } from '@/lib/utils/index';

interface Props {
  project: Project;
}

// 탭별 제목 매핑
const TAB_TITLES: Record<string, string> = {
  overview: '프로젝트 개요',
  pouring_section_review: '타설구간 개략검토',
  data_input: '동 기본 정보',
  quantity_input: '물량 입력',
  detailed_quantity_input: '상세물량입력',
  geological_data: '지질 데이터 입력',
  planned_unit_rate: '단가 입력',
  executed_unit_rate: '실행 단가',
  building_process_plan: '동별 공정계획',
  basement_process_plan: '지하층 공정계획',
  gantt_chart: '간트차트',
  team: '팀 관리',
  documents: '문서 관리',
  settings: '설정',
};

// 탭별 설명 매핑
const TAB_DESCRIPTIONS: Record<string, string> = {
  overview: '',
  pouring_section_review: '콘크리트 물량과 동수를 기반으로 타설구간을 개략 검토합니다.',
  data_input: '각 동의 기본 정보와 층 구성을 입력합니다.',
  quantity_input: '층별/공종별 물량 데이터를 입력합니다.',
  detailed_quantity_input: '동별·층별·공종별 물량을 입력합니다.',
  geological_data: '지질 조사 데이터를 입력합니다.',
  planned_unit_rate: '계획 단가를 입력합니다.',
  executed_unit_rate: '실행 단가를 입력합니다.',
  building_process_plan: '동별 공정계획을 수립하고 일수를 계산합니다.',
  basement_process_plan: '지하층 공정계획을 수립하고 일수를 계산합니다.',
  gantt_chart: '프로젝트 공정 현황을 한눈에 확인하세요.',
  team: '프로젝트에 참여하는 팀원을 관리합니다.',
  documents: '프로젝트 문서를 관리합니다.',
  settings: '프로젝트 설정을 관리합니다.',
};

// 유효한 탭 목록
const VALID_TABS = Object.keys(TAB_TITLES);

function isValidTab(tab: string | null): tab is string {
  return tab !== null && VALID_TABS.includes(tab);
}

// 탭별 아이콘 매핑
const TAB_ICONS: Record<string, LucideIcon> = {
  overview: LayoutDashboard,
  pouring_section_review: Calculator,
  data_input: Database,
  quantity_input: Package,
  detailed_quantity_input: Package,
  geological_data: Layers,
  planned_unit_rate: DollarSign,
  executed_unit_rate: DollarSign,
  building_process_plan: Calendar,
  basement_process_plan: Calendar,
  gantt_chart: BarChart3,
  team: Users,
  documents: FileText,
  settings: Settings,
};

export function ProjectDetailClient({ project: initialProject }: Props) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [project, setProject] = useState<Project>(initialProject);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [sidebarCollapsed, setSidebarCollapsed] = useState(true);
  const [sidebarPinned, setSidebarPinned] = useState(false);

  // URL에서 탭 초기값 읽기
  const tabFromUrl = searchParams.get('tab');
  const initialTab = isValidTab(tabFromUrl) ? tabFromUrl : 'overview';
  const [activeTab, setActiveTab] = useState(initialTab);

  const handleTabChange = useCallback((tab: string) => {
    if (!isValidTab(tab)) return;

    setActiveTab(tab);

    // URL 쿼리 파라미터 업데이트
    const params = new URLSearchParams(searchParams.toString());
    if (tab === 'overview') {
      params.delete('tab');
    } else {
      params.set('tab', tab);
    }

    const newUrl = params.toString() ? `?${params.toString()}` : window.location.pathname;
    router.replace(newUrl, { scroll: false });
  }, [searchParams, router]);

  // 브라우저 뒤로가기/앞으로가기 시 탭 상태 동기화
  useEffect(() => {
    const tabFromUrl = searchParams.get('tab');
    const validTab = isValidTab(tabFromUrl) ? tabFromUrl : 'overview';

    if (validTab !== activeTab) {
      setActiveTab(validTab);
    }
  }, [searchParams, activeTab]);

  // 프로젝트 데이터 동기화 (서버에서 업데이트된 데이터 반영)
  useEffect(() => {
    setProject(initialProject);
  }, [initialProject]);

  const handleDelete = useCallback(async () => {
    if (typeof window === 'undefined') return;
    if (!window.confirm('정말 이 프로젝트를 삭제하시겠습니까?')) return;

    try {
      setIsDeleting(true);
      await deleteProject(project.id);
      toast.success('프로젝트가 삭제되었습니다.');
      router.push('/projects');
    } catch (error) {
      logger.error('Failed to delete project:', error);
      toast.error('프로젝트 삭제 실패', {
        description: '프로젝트 삭제에 실패했습니다. 다시 시도해주세요.',
      });
    } finally {
      setIsDeleting(false);
    }
  }, [project.id, router]);

  const handleTogglePin = useCallback(() => {
    setSidebarPinned(prev => {
      const newPinned = !prev;
      // 고정 해제 시 사이드바 접기
      if (!newPinned) {
        setSidebarCollapsed(true);
      }
      return newPinned;
    });
  }, []);

  const handleBodyClick = useCallback(() => {
    // 고정된 상태가 아닐 때만 접기
    if (!sidebarCollapsed && !sidebarPinned) {
      setSidebarCollapsed(true);
    }
  }, [sidebarCollapsed, sidebarPinned]);

  // Hover 자동 펼침/접힘 기능
  const hoverTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  const handleSidebarMouseEnter = useCallback(() => {
    if (hoverTimeoutRef.current) {
      clearTimeout(hoverTimeoutRef.current);
      hoverTimeoutRef.current = null;
    }
    // 고정되지 않았을 때만 hover로 펼침
    if (!sidebarPinned) {
      setSidebarCollapsed(false);
    }
  }, [sidebarPinned]);

  const handleSidebarMouseLeave = useCallback(() => {
    // 고정된 상태면 자동 접힘 비활성화
    if (sidebarPinned) return;

    hoverTimeoutRef.current = setTimeout(() => {
      setSidebarCollapsed(true);
    }, 300); // 300ms 딜레이로 부드러운 UX
  }, [sidebarPinned]);

  // 컴포넌트 언마운트 시 타임아웃 정리
  useEffect(() => {
    return () => {
      if (hoverTimeoutRef.current) {
        clearTimeout(hoverTimeoutRef.current);
      }
    };
  }, []);

  const handleProjectUpdate = useCallback(async () => {
    try {
      // 프로젝트 데이터 다시 로드
      const updatedProject = await getProject(project.id);
      if (updatedProject) {
        setProject(updatedProject);
        toast.success('프로젝트 정보가 업데이트되었습니다.');
      }
      router.refresh();
      setIsEditModalOpen(false);
    } catch (error) {
      logger.error('Failed to reload project:', error);
      // 에러가 발생해도 모달은 닫기
      router.refresh();
      setIsEditModalOpen(false);
    }
  }, [project.id, router]);

  return (
    <div className="fixed inset-0 top-16 flex bg-background overflow-hidden">
      <ProjectSidebar
        isCollapsed={sidebarCollapsed}
        isPinned={sidebarPinned}
        onTogglePin={handleTogglePin}
        project={project}
        activeTab={activeTab}
        onTabChange={handleTabChange}
        onMouseEnter={handleSidebarMouseEnter}
        onMouseLeave={handleSidebarMouseLeave}
      />

      <div className="flex-1 flex flex-col h-full ml-16" onClick={handleBodyClick}>
        {/* Main Content */}
        <main className="flex-1 overflow-y-auto">
          <div className="max-w-7xl mx-auto py-10 px-4 sm:px-6 lg:px-8">
            {/* 공통 헤더 - 아이콘 배지 스타일 */}
            <div className="mb-8 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
              <div className="flex items-center gap-3">
                <div className="p-3 bg-white rounded-xl shadow-sm border border-zinc-200 dark:bg-zinc-900 dark:border-zinc-800">
                  {(() => {
                    const Icon = TAB_ICONS[activeTab] || LayoutDashboard;
                    return <Icon className="w-6 h-6 text-zinc-700 dark:text-zinc-300" />;
                  })()}
                </div>
                <div>
                  <div className="flex items-center gap-3">
                    <h1 className="text-2xl font-bold text-zinc-900 dark:text-white">
                      {TAB_TITLES[activeTab] || ''}
                    </h1>
                    {activeTab === 'overview' && (
                      <span
                        className={`px-3 py-1 text-sm font-medium rounded-full ${getStatusColors(project.status)}`}
                      >
                        {getStatusLabel(project.status)}
                      </span>
                    )}
                  </div>
                  <p className="text-zinc-500 dark:text-zinc-400 text-sm">
                    {activeTab === 'overview' && project.description
                      ? project.description
                      : TAB_DESCRIPTIONS[activeTab] || ''}
                  </p>
                </div>
              </div>
              {activeTab === 'overview' && (
                <div className="flex items-center gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    className="gap-2"
                    onClick={() => setIsEditModalOpen(true)}
                  >
                    <Edit className="w-4 h-4" />
                    수정
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    className="gap-2 text-red-600 hover:text-red-700 hover:bg-red-50 dark:hover:bg-red-900/20"
                    onClick={handleDelete}
                    disabled={isDeleting}
                  >
                    <Trash2 className="w-4 h-4" />
                    {isDeleting ? '삭제 중...' : '삭제'}
                  </Button>
                </div>
              )}
            </div>

            {/* 탭별 콘텐츠 */}
            {activeTab === 'overview' && (
              <div className="space-y-6">
                {/* Project Info Cards */}
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                <Card className="p-4 flex items-start gap-3">
                  <div className="p-2 bg-accent-50 dark:bg-accent-900/20 rounded-lg">
                    <MapPin className="w-5 h-5 text-accent-600 dark:text-accent-400" />
                  </div>
                  <div>
                    <div className="text-xs font-medium text-zinc-500 dark:text-zinc-400 mb-1">위치</div>
                    <div className="text-sm font-semibold text-zinc-900 dark:text-white break-words">
                      {project.location || '-'}
                    </div>
                  </div>
                </Card>

                <Card className="p-4 flex items-start gap-3">
                  <div className="p-2 bg-zinc-100 dark:bg-zinc-800 rounded-lg">
                    <Building2 className="w-5 h-5 text-zinc-600 dark:text-zinc-400" />
                  </div>
                  <div>
                    <div className="text-xs font-medium text-zinc-500 dark:text-zinc-400 mb-1">발주처</div>
                    <div className="text-sm font-semibold text-zinc-900 dark:text-white truncate">
                      {project.client || '-'}
                    </div>
                  </div>
                </Card>

                <Card className="p-4 flex items-start gap-3">
                  <div className="p-2 bg-success-50 dark:bg-success-900/20 rounded-lg">
                    <DollarSign className="w-5 h-5 text-success-600 dark:text-success-400" />
                  </div>
                  <div>
                    <div className="text-xs font-medium text-zinc-500 dark:text-zinc-400 mb-1">계약금액</div>
                    <div className="text-sm font-semibold text-zinc-900 dark:text-white">
                      {formatCurrency(project.contract_amount, { notation: 'standard' })}
                    </div>
                  </div>
                </Card>

                <Card className="p-4 flex items-start gap-3">
                  <div className="p-2 bg-admin-50 dark:bg-admin-900/20 rounded-lg">
                    <Calendar className="w-5 h-5 text-admin-600 dark:text-admin-400" />
                  </div>
                  <div>
                    <div className="text-xs font-medium text-zinc-500 dark:text-zinc-400 mb-1">공사기간</div>
                    <div className="text-sm font-semibold text-zinc-900 dark:text-white">
                      {formatDate(project.start_date, 'long')}
                      {project.end_date && (
                        <>
                          {' ~ '}
                          {formatDate(project.end_date, 'long')}
                        </>
                      )}
                    </div>
                  </div>
                </Card>
              </div>


              {/* Construction Dashboard */}
              <ConstructionDashboard projectId={project.id} />
            </div>
          )}


            {activeTab === 'pouring_section_review' && (
              <PouringSectionReviewPage projectId={project.id} />
            )}

            {activeTab === 'data_input' && (
              <BuildingBasicInfoPage projectId={project.id} />
            )}

            {activeTab === 'quantity_input' && (
              <QuantityInputPage projectId={project.id} />
            )}

            {activeTab === 'detailed_quantity_input' && (
              <DetailedQuantityInputPage projectId={project.id} />
            )}

            {activeTab === 'geological_data' && (
              <GeologicalDataPage projectId={project.id} />
            )}

            {activeTab === 'planned_unit_rate' && (
              <div className="flex flex-col items-center justify-center h-[60vh] text-zinc-400">
                <div className="w-16 h-16 bg-zinc-100 dark:bg-zinc-800 rounded-full flex items-center justify-center mb-4">
                  <DollarSign className="w-8 h-8 text-zinc-300 dark:text-zinc-600" />
                </div>
                <p className="text-sm">단가 입력 기능은 준비 중입니다.</p>
              </div>
            )}

            {activeTab === 'executed_unit_rate' && (
              <div className="flex flex-col items-center justify-center h-[60vh] text-zinc-400">
                <div className="w-16 h-16 bg-zinc-100 dark:bg-zinc-800 rounded-full flex items-center justify-center mb-4">
                  <DollarSign className="w-8 h-8 text-zinc-300 dark:text-zinc-600" />
                </div>
                <p className="text-sm">실행 단가 기능은 준비 중입니다.</p>
              </div>
            )}

            {activeTab === 'building_process_plan' && (
              <BuildingProcessPlanPage projectId={project.id} />
            )}

            {activeTab === 'basement_process_plan' && (
              <BasementProcessPlanPage projectId={project.id} />
            )}

            {activeTab === 'gantt_chart' && (
              <GanttChartPage projectId={project.id} projectNumber={project.project_number} />
            )}

            {activeTab === 'team' && (
              <ProjectTeamPage projectId={project.id} projectCreatedBy={project.created_by} />
            )}

            {activeTab !== 'overview' && activeTab !== 'pouring_section_review' && activeTab !== 'data_input' && activeTab !== 'quantity_input' && activeTab !== 'detailed_quantity_input' && activeTab !== 'geological_data' && activeTab !== 'planned_unit_rate' && activeTab !== 'executed_unit_rate' && activeTab !== 'building_process_plan' && activeTab !== 'basement_process_plan' && activeTab !== 'gantt_chart' && activeTab !== 'team' && (
              <div className="flex flex-col items-center justify-center h-[60vh] text-zinc-400">
                <div className="w-16 h-16 bg-zinc-100 dark:bg-zinc-800 rounded-full flex items-center justify-center mb-4">
                  <Settings className="w-8 h-8 text-zinc-300 dark:text-zinc-600" />
                </div>
                <h3 className="text-lg font-medium text-zinc-900 dark:text-white mb-1">준비 중인 기능입니다</h3>
                <p className="text-sm">해당 메뉴는 아직 개발 중입니다.</p>
              </div>
            )}
          </div>
        </main>
      </div>

      <ProjectEditModal
        project={project}
        isOpen={isEditModalOpen}
        onClose={() => setIsEditModalOpen(false)}
        onUpdate={handleProjectUpdate}
      />
    </div>
  );
}
