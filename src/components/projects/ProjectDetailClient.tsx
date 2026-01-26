'use client';

import { useState, useCallback, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import {
  Calendar,
  DollarSign,
  MapPin,
  Building2,
  Edit,
  Trash2,
  Settings,
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

export function ProjectDetailClient({ project: initialProject }: Props) {
  const router = useRouter();
  const [project, setProject] = useState<Project>(initialProject);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [activeTab, setActiveTab] = useState('overview');

  const handleTabChange = useCallback((tab: string) => {
    setActiveTab(tab);
  }, []);

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

  const handleToggleCollapse = useCallback(() => {
    setSidebarCollapsed(prev => !prev);
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
        onToggleCollapse={handleToggleCollapse}
        project={project}
        activeTab={activeTab}
        onTabChange={handleTabChange}
      />

      <div
        className={`flex-1 flex flex-col h-full transition-all duration-300 ${
          sidebarCollapsed ? 'ml-16' : 'ml-72'
        }`}
      >
        {/* Main Content */}
        <main className="flex-1 overflow-y-auto">
          {/* Page Title */}
          <div className="px-4 sm:px-6 lg:px-8 pt-6 pb-2">
            <h1 className="text-2xl font-bold text-slate-900 dark:text-white">
              {TAB_TITLES[activeTab] || ''}
            </h1>
          </div>
          {activeTab === 'overview' && (
            <div className="space-y-6 max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 pb-4 sm:pb-6 lg:pb-8">
              {/* Project Header Card */}
              <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-center justify-between">
                <div>
                  <div className="flex items-center gap-3 mb-2">
                    <h2 className="text-2xl font-bold text-gray-900 dark:text-white">
                      {project.name}
                    </h2>
                    <span
                      className={`px-3 py-1 text-sm font-medium rounded-full ${getStatusColors(project.status)}`}
                    >
                      {getStatusLabel(project.status)}
                    </span>
                  </div>
                  {project.description && (
                    <p className="text-gray-600 dark:text-gray-400">{project.description}</p>
                  )}
                </div>
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
              </div>

              {/* Project Info Cards */}
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                <Card className="p-4 flex items-start gap-3">
                  <div className="p-2 bg-blue-50 dark:bg-blue-900/20 rounded-lg">
                    <MapPin className="w-5 h-5 text-blue-600 dark:text-blue-400" />
                  </div>
                  <div>
                    <div className="text-xs font-medium text-slate-500 dark:text-slate-400 mb-1">위치</div>
                    <div className="text-sm font-semibold text-slate-900 dark:text-white break-words">
                      {project.location || '-'}
                    </div>
                  </div>
                </Card>

                <Card className="p-4 flex items-start gap-3">
                  <div className="p-2 bg-purple-50 dark:bg-purple-900/20 rounded-lg">
                    <Building2 className="w-5 h-5 text-purple-600 dark:text-purple-400" />
                  </div>
                  <div>
                    <div className="text-xs font-medium text-slate-500 dark:text-slate-400 mb-1">발주처</div>
                    <div className="text-sm font-semibold text-slate-900 dark:text-white truncate">
                      {project.client || '-'}
                    </div>
                  </div>
                </Card>

                <Card className="p-4 flex items-start gap-3">
                  <div className="p-2 bg-emerald-50 dark:bg-emerald-900/20 rounded-lg">
                    <DollarSign className="w-5 h-5 text-emerald-600 dark:text-emerald-400" />
                  </div>
                  <div>
                    <div className="text-xs font-medium text-slate-500 dark:text-slate-400 mb-1">계약금액</div>
                    <div className="text-sm font-semibold text-slate-900 dark:text-white">
                      {formatCurrency(project.contract_amount, { notation: 'standard' })}
                    </div>
                  </div>
                </Card>

                <Card className="p-4 flex items-start gap-3">
                  <div className="p-2 bg-orange-50 dark:bg-orange-900/20 rounded-lg">
                    <Calendar className="w-5 h-5 text-orange-600 dark:text-orange-400" />
                  </div>
                  <div>
                    <div className="text-xs font-medium text-slate-500 dark:text-slate-400 mb-1">공사기간</div>
                    <div className="text-sm font-semibold text-slate-900 dark:text-white">
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
            <div className="space-y-6 w-full px-4 sm:px-6 lg:px-8 pb-4 sm:pb-6 lg:pb-8">
              <BuildingBasicInfoPage projectId={project.id} />
            </div>
          )}

          {activeTab === 'quantity_input' && (
            <div className="space-y-6 w-full px-4 sm:px-6 lg:px-8 pb-4 sm:pb-6 lg:pb-8">
              <QuantityInputPage projectId={project.id} />
            </div>
          )}

          {activeTab === 'detailed_quantity_input' && (
            <div className="space-y-6 w-full px-4 sm:px-6 lg:px-8 pb-4 sm:pb-6 lg:pb-8">
              <DetailedQuantityInputPage projectId={project.id} />
            </div>
          )}

          {activeTab === 'geological_data' && (
            <div className="space-y-6 w-full px-4 sm:px-6 lg:px-8 pb-4 sm:pb-6 lg:pb-8">
              <GeologicalDataPage projectId={project.id} />
            </div>
          )}

          {activeTab === 'planned_unit_rate' && (
            <div className="space-y-6 max-w-full mx-auto px-4 sm:px-6 lg:px-8 pb-4 sm:pb-6 lg:pb-8">
              <div className="flex flex-col items-center justify-center h-[60vh] text-slate-400">
                <div className="w-16 h-16 bg-slate-100 dark:bg-slate-800 rounded-full flex items-center justify-center mb-4">
                  <DollarSign className="w-8 h-8 text-slate-300 dark:text-slate-600" />
                </div>
                <h3 className="text-lg font-medium text-slate-900 dark:text-white mb-1">단가 입력</h3>
                <p className="text-sm">단가 입력 기능은 준비 중입니다.</p>
              </div>
            </div>
          )}

          {activeTab === 'executed_unit_rate' && (
            <div className="space-y-6 max-w-full mx-auto px-4 sm:px-6 lg:px-8 pb-4 sm:pb-6 lg:pb-8">
              <div className="flex flex-col items-center justify-center h-[60vh] text-slate-400">
                <div className="w-16 h-16 bg-slate-100 dark:bg-slate-800 rounded-full flex items-center justify-center mb-4">
                  <DollarSign className="w-8 h-8 text-slate-300 dark:text-slate-600" />
                </div>
                <h3 className="text-lg font-medium text-slate-900 dark:text-white mb-1">실행 단가</h3>
                <p className="text-sm">실행 단가 기능은 준비 중입니다.</p>
              </div>
            </div>
          )}

          {activeTab === 'building_process_plan' && (
            <div className="space-y-6 w-full px-4 sm:px-6 lg:px-8 pb-4 sm:pb-6 lg:pb-8">
              <BuildingProcessPlanPage projectId={project.id} />
            </div>
          )}

          {activeTab === 'basement_process_plan' && (
            <div className="space-y-6 w-full px-4 sm:px-6 lg:px-8 pb-4 sm:pb-6 lg:pb-8">
              <BasementProcessPlanPage projectId={project.id} />
            </div>
          )}

          {activeTab === 'gantt_chart' && (
            <GanttChartPage projectId={project.id} />
          )}

          {activeTab === 'team' && (
            <ProjectTeamPage projectId={project.id} projectCreatedBy={project.created_by} />
          )}

          {activeTab !== 'overview' && activeTab !== 'pouring_section_review' && activeTab !== 'data_input' && activeTab !== 'quantity_input' && activeTab !== 'detailed_quantity_input' && activeTab !== 'geological_data' && activeTab !== 'planned_unit_rate' && activeTab !== 'executed_unit_rate' && activeTab !== 'building_process_plan' && activeTab !== 'basement_process_plan' && activeTab !== 'gantt_chart' && activeTab !== 'team' && (
            <div className="flex flex-col items-center justify-center h-[60vh] text-slate-400 px-4 sm:px-6 lg:px-8 pb-4 sm:pb-6 lg:pb-8">
              <div className="w-16 h-16 bg-slate-100 dark:bg-slate-800 rounded-full flex items-center justify-center mb-4">
                <Settings className="w-8 h-8 text-slate-300 dark:text-slate-600" />
              </div>
              <h3 className="text-lg font-medium text-slate-900 dark:text-white mb-1">준비 중인 기능입니다</h3>
              <p className="text-sm">해당 메뉴는 아직 개발 중입니다.</p>
            </div>
          )}
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
