'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import {
  ArrowLeft,
  Calendar,
  DollarSign,
  MapPin,
  Building2,
  Edit,
  Trash2,
  Menu,
  Settings,
} from 'lucide-react';
import { Button, Card } from '@/components/ui';
import type { Project } from '@/lib/types';
import { deleteProject } from '@/lib/services/projects';
import { ProjectSidebar } from './ProjectSidebar';
import { formatCurrency, formatDate, getStatusLabel, getStatusColors, logger } from '@/lib/utils/index';

interface Props {
  project: Project;
}

export function ProjectDetailClient({ project }: Props) {
  const router = useRouter();
  const [isDeleting, setIsDeleting] = useState(false);
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [activeTab, setActiveTab] = useState('overview');

  const handleDelete = async () => {
    if (typeof window === 'undefined') return;
    if (!window.confirm('정말 이 프로젝트를 삭제하시겠습니까?')) return;

    try {
      setIsDeleting(true);
      await deleteProject(project.id);
      router.push('/projects');
    } catch (error) {
      logger.error('Failed to delete project:', error);
      window.alert('프로젝트 삭제에 실패했습니다.');
    } finally {
      setIsDeleting(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950">
      <ProjectSidebar
        isOpen={sidebarOpen}
        onClose={() => setSidebarOpen(false)}
        project={project}
        activeTab={activeTab}
        onTabChange={setActiveTab}
      />

      <div
        className={`transition-all duration-300 ${sidebarOpen ? 'lg:ml-72' : 'lg:ml-0'
          } min-h-screen flex flex-col`}
      >
        {/* Header */}
        <header className="h-16 bg-white dark:bg-slate-900 border-b border-slate-200 dark:border-slate-800 px-4 sm:px-6 flex items-center justify-between sticky top-0 z-10">
          <div className="flex items-center gap-4">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setSidebarOpen(!sidebarOpen)}
              className="text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-200"
            >
              <Menu className="w-5 h-5" />
            </Button>

            <div className="flex items-center gap-3">
              <h1 className="text-xl font-bold text-slate-900 dark:text-white truncate max-w-[200px] sm:max-w-md">
                {activeTab === 'overview' && '프로젝트 개요'}
                {activeTab === 'tasks' && '작업 관리'}
                {activeTab === 'team' && '팀 관리'}
                {activeTab === 'documents' && '문서 관리'}
                {activeTab === 'settings' && '설정'}
              </h1>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <Link href="/projects">
              <Button variant="ghost" size="sm" className="gap-2 text-slate-500">
                <ArrowLeft className="w-4 h-4" />
                <span className="hidden sm:inline">목록으로</span>
              </Button>
            </Link>
          </div>
        </header>

        {/* Main Content */}
        <main className="flex-1 p-4 sm:p-6 lg:p-8 overflow-y-auto">
          {activeTab === 'overview' && (
            <div className="space-y-6 max-w-5xl mx-auto">
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
                  <Button variant="outline" size="sm" className="gap-2">
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
                    </div>
                  </div>
                </Card>
              </div>

              {/* Additional Details Section (Placeholder) */}
              <Card className="p-6">
                <h3 className="text-lg font-semibold text-slate-900 dark:text-white mb-4">상세 정보</h3>
                <div className="prose dark:prose-invert max-w-none">
                  <p className="text-slate-600 dark:text-slate-400">
                    프로젝트에 대한 추가적인 상세 정보가 이곳에 표시됩니다. 공정률 차트, 최근 활동 내역, 이슈 현황 등을 대시보드 형태로 구성할 수 있습니다.
                  </p>
                </div>
              </Card>
            </div>
          )}

          {activeTab !== 'overview' && (
            <div className="flex flex-col items-center justify-center h-[60vh] text-slate-400">
              <div className="w-16 h-16 bg-slate-100 dark:bg-slate-800 rounded-full flex items-center justify-center mb-4">
                <Settings className="w-8 h-8 text-slate-300 dark:text-slate-600" />
              </div>
              <h3 className="text-lg font-medium text-slate-900 dark:text-white mb-1">준비 중인 기능입니다</h3>
              <p className="text-sm">해당 메뉴는 아직 개발 중입니다.</p>
            </div>
          )}
        </main>
      </div>
    </div>
  );
}
