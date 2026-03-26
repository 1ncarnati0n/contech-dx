'use client';

import {
  Loader2,
  RefreshCw,
  ListTodo,
  Flag,
  CalendarDays,
  Clock,
  Rocket,
  Workflow,
  Link2,
  Undo2,
  Upload,
  X,
  ChevronDown,
  ChevronRight,
} from 'lucide-react';
import { useGanttChartPage } from '@/features/gantt/service/useGanttChartPage';

interface GanttChartPageProps {
  projectId: string;
  projectNumber: number;
}

// ── 프레젠테이션 서브 컴포넌트 ──

interface StatCardProps {
  icon: React.ReactNode;
  title: string;
  value: string | number;
  subValue?: string;
  iconBgColor: string;
}

function StatCard({ icon, title, value, subValue, iconBgColor }: StatCardProps) {
  return (
    <div className="bg-white dark:bg-zinc-900 rounded-xl border border-zinc-200 dark:border-zinc-800 p-5 flex items-start gap-4">
      <div className={`p-3 rounded-lg ${iconBgColor}`}>{icon}</div>
      <div className="flex-1 min-w-0">
        <p className="text-sm text-zinc-500 dark:text-zinc-400">{title}</p>
        <p className="text-2xl font-bold text-zinc-900 dark:text-white mt-1">{value}</p>
        {subValue && <p className="text-xs text-zinc-400 dark:text-zinc-500 mt-1 truncate">{subValue}</p>}
      </div>
    </div>
  );
}

function FeatureItem({ icon, text }: { icon: React.ReactNode; text: string }) {
  return (
    <div className="flex items-center gap-2 text-sm text-zinc-600 dark:text-zinc-400">
      <span className="text-accent-500">{icon}</span>
      <span>{text}</span>
    </div>
  );
}

// ── 메인 컴포넌트 ──

export function GanttChartPage({ projectId, projectNumber }: GanttChartPageProps) {
  const {
    isLoading, isImporting, isRefreshingPreview, error,
    stats,
    showImportModal, importStartDate, importPreview,
    expandedBuildings, buildingPreviews,
    setImportStartDate,
    handleOpenFullscreen,
    handleImportFromProcessPlan,
    handleAutoGenerateAndImport,
    handleConfirmImport,
    loadImportPreview,
    toggleBuildingExpanded,
    closeImportModal,
    formatShortDate,
  } = useGanttChartPage(projectId, projectNumber);

  if (isLoading) {
    return (
      <div className="w-full h-full flex items-center justify-center min-h-[400px]">
        <div className="flex flex-col items-center gap-4">
          <Loader2 className="w-8 h-8 animate-spin text-accent-500" />
          <span className="text-zinc-500 dark:text-zinc-400">간트차트 데이터 로딩 중...</span>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="w-full h-full flex items-center justify-center min-h-[400px]">
        <div className="flex flex-col items-center gap-4 text-center">
          <div className="w-16 h-16 bg-red-50 dark:bg-red-900/20 rounded-full flex items-center justify-center">
            <span className="text-2xl">⚠️</span>
          </div>
          <h3 className="text-lg font-medium text-zinc-900 dark:text-white">오류 발생</h3>
          <p className="text-sm text-zinc-500 dark:text-zinc-400">{error}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* 통계 카드 */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          icon={<ListTodo className="w-5 h-5 text-blue-600" />}
          iconBgColor="bg-blue-50 dark:bg-blue-900/20"
          title="총 태스크"
          value={`${stats.totalTasks}개`}
          subValue={stats.cpTaskCount > 0 ? `CP: ${stats.cpTaskCount}개` : undefined}
        />
        <StatCard
          icon={<Flag className="w-5 h-5 text-orange-600" />}
          iconBgColor="bg-orange-50 dark:bg-orange-900/20"
          title="마일스톤"
          value={`${stats.totalMilestones}개`}
          subValue={stats.masterMilestoneCount > 0 ? `주요: ${stats.masterMilestoneCount}개` : undefined}
        />
        <StatCard
          icon={<CalendarDays className="w-5 h-5 text-green-600" />}
          iconBgColor="bg-green-50 dark:bg-green-900/20"
          title="공사기간"
          value={stats.totalDays > 0 ? `${stats.totalDays}일` : '-'}
          subValue={
            stats.minDate && stats.maxDate
              ? `${formatShortDate(stats.minDate)} ~ ${formatShortDate(stats.maxDate)}`
              : '데이터 없음'
          }
        />
        <StatCard
          icon={<Clock className="w-5 h-5 text-purple-600" />}
          iconBgColor="bg-purple-50 dark:bg-purple-900/20"
          title="다음 마일스톤"
          value={stats.dDay !== null ? `D-${stats.dDay}` : '-'}
          subValue={stats.nextMilestone?.name || '예정된 마일스톤 없음'}
        />
      </div>

      {/* CTA 영역 */}
      <div className="bg-gradient-to-br from-zinc-50 to-zinc-100 dark:from-zinc-800/50 dark:to-zinc-900/50 rounded-xl border border-zinc-200 dark:border-zinc-700 p-8">
        <div className="flex flex-col items-center text-center space-y-6">
          <div className="w-16 h-16 bg-accent-100 dark:bg-accent-900/20 rounded-full flex items-center justify-center">
            <Rocket className="w-8 h-8 text-accent-600 dark:text-accent-400" />
          </div>

          <div className="space-y-2">
            <h3 className="text-lg font-semibold text-zinc-900 dark:text-white">
              전체 공정 관리를 위해 간트앱을 실행하세요
            </h3>
            <p className="text-sm text-zinc-500 dark:text-zinc-400 max-w-md">
              간트앱에서 태스크 생성, 일정 조정, 의존성 관리 등 모든 기능을 사용할 수 있습니다.
            </p>
          </div>

          <div className="flex flex-row items-center gap-3">
            <button
              onClick={handleAutoGenerateAndImport}
              disabled={isImporting || isRefreshingPreview}
              className="flex items-center gap-2 px-6 py-3 bg-emerald-600 hover:bg-emerald-700 text-white font-semibold rounded-xl transition-all shadow-md hover:shadow-lg hover:scale-[1.02] disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <Workflow className="w-5 h-5" />
              {isImporting ? '생성 중...' : '공정계획 자동 생성'}
            </button>
            <button
              onClick={handleImportFromProcessPlan}
              disabled={isImporting || isRefreshingPreview}
              className="flex items-center gap-2 px-6 py-3 bg-blue-600 hover:bg-blue-700 text-white font-semibold rounded-xl transition-all shadow-md hover:shadow-lg hover:scale-[1.02] disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <Upload className="w-5 h-5" />
              {isRefreshingPreview ? '불러오는 중...' : isImporting ? '가져오는 중...' : '공정계획에서 가져오기'}
            </button>
            <button
              onClick={handleOpenFullscreen}
              className="flex items-center gap-2 px-8 py-3 bg-zinc-900 hover:bg-black text-white dark:bg-white dark:hover:bg-zinc-200 dark:text-zinc-900 font-semibold rounded-xl transition-all shadow-lg hover:shadow-xl hover:scale-[1.02]"
            >
              <Rocket className="w-5 h-5" />
              간트앱 열기
            </button>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 pt-4 border-t border-zinc-200 dark:border-zinc-700 w-full max-w-2xl">
            <FeatureItem icon={<ListTodo className="w-4 h-4" />} text="태스크 관리" />
            <FeatureItem icon={<Flag className="w-4 h-4" />} text="마일스톤 관리" />
            <FeatureItem icon={<Link2 className="w-4 h-4" />} text="의존성 연결" />
            <FeatureItem icon={<Undo2 className="w-4 h-4" />} text="Undo/Redo" />
          </div>
        </div>
      </div>

      {/* 의존성 요약 */}
      {stats.dependencyCount > 0 && (
        <div className="flex items-center gap-2 text-sm text-zinc-500 dark:text-zinc-400">
          <Workflow className="w-4 h-4" />
          <span>현재 {stats.dependencyCount}개의 태스크 간 의존성이 설정되어 있습니다.</span>
        </div>
      )}

      {/* 가져오기 모달 */}
      {showImportModal && importPreview && (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
          <div className="absolute inset-0 bg-black/50" onClick={closeImportModal} />

          <div className="relative bg-white dark:bg-zinc-900 rounded-2xl border border-zinc-200 dark:border-zinc-700 shadow-2xl w-full max-w-2xl mx-4 max-h-[90vh] flex flex-col">
            {/* 헤더 */}
            <div className="flex items-center justify-between p-6 pb-4 border-b border-zinc-200 dark:border-zinc-700">
              <h2 className="text-lg font-semibold text-zinc-900 dark:text-white">공정계획에서 가져오기</h2>
              <button
                onClick={closeImportModal}
                className="p-1.5 rounded-lg hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors"
                disabled={isImporting || isRefreshingPreview}
              >
                <X className="w-5 h-5 text-zinc-500" />
              </button>
            </div>

            {/* 바디 */}
            <div className="p-6 space-y-5 overflow-y-auto flex-1 min-h-0">
              {/* 시작일 + 요약 */}
              <div className="flex items-end gap-4">
                <div className="flex-1">
                  <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-2">시작일</label>
                  <input
                    type="date"
                    value={importStartDate}
                    onChange={(e) => setImportStartDate(e.target.value)}
                    className="w-full px-3 py-2.5 border border-zinc-300 dark:border-zinc-600 rounded-lg bg-white dark:bg-zinc-800 text-zinc-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-colors"
                  />
                </div>
                <button
                  type="button"
                  onClick={() => { void loadImportPreview({ openModal: false, preserveStartDate: true, notifyOnSuccess: true }); }}
                  disabled={isImporting || isRefreshingPreview}
                  className="h-[42px] inline-flex items-center gap-2 px-3.5 rounded-lg border border-zinc-300 dark:border-zinc-600 text-sm font-medium text-zinc-700 dark:text-zinc-300 bg-white dark:bg-zinc-800 hover:bg-zinc-50 dark:hover:bg-zinc-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {isRefreshingPreview ? <><Loader2 className="w-4 h-4 animate-spin" />재생성 중...</> : <><RefreshCw className="w-4 h-4" />세부공정 재생성</>}
                </button>
                <div className="flex gap-3">
                  <div className="bg-zinc-50 dark:bg-zinc-800 rounded-lg px-4 py-2.5 text-center">
                    <p className="text-xs text-zinc-500 dark:text-zinc-400">대상 동</p>
                    <p className="text-lg font-bold text-zinc-900 dark:text-white">{importPreview.summary.buildingCount}개</p>
                  </div>
                  <div className="bg-zinc-50 dark:bg-zinc-800 rounded-lg px-4 py-2.5 text-center">
                    <p className="text-xs text-zinc-500 dark:text-zinc-400">총 태스크</p>
                    <p className="text-lg font-bold text-zinc-900 dark:text-white">{importPreview.summary.totalTaskCount}개</p>
                  </div>
                </div>
              </div>

              {/* 동별 카테고리 상세 */}
              {buildingPreviews.length > 0 && (
                <div className="border border-zinc-200 dark:border-zinc-700 rounded-lg divide-y divide-zinc-200 dark:divide-zinc-700">
                  {buildingPreviews.map((bp) => {
                    const isExpanded = expandedBuildings.has(bp.name);
                    const undergroundCats = bp.categories.filter(c => c.group === 'underground');
                    const abovegroundCats = bp.categories.filter(c => c.group === 'aboveground');

                    return (
                      <div key={bp.name}>
                        <button
                          type="button"
                          onClick={() => toggleBuildingExpanded(bp.name)}
                          className="w-full flex items-center justify-between px-4 py-3 hover:bg-zinc-50 dark:hover:bg-zinc-800/50 transition-colors text-left"
                        >
                          <div className="flex items-center gap-2">
                            {isExpanded ? <ChevronDown className="w-4 h-4 text-zinc-400" /> : <ChevronRight className="w-4 h-4 text-zinc-400" />}
                            <span className="text-sm font-semibold text-zinc-900 dark:text-white">{bp.name}</span>
                          </div>
                          <span className="text-xs text-zinc-500 dark:text-zinc-400">{bp.taskCount}개 태스크</span>
                        </button>

                        {isExpanded && (
                          <div className="px-4 pb-4 space-y-3">
                            <div className="text-xs text-zinc-500 dark:text-zinc-400 space-y-0.5 pl-6">
                              <p>구조체 시작: <span className="font-medium text-zinc-700 dark:text-zinc-300">{bp.structureStartDate.toLocaleDateString('ko-KR', { year: 'numeric', month: '2-digit', day: '2-digit' })}</span></p>
                              <p>가설+흙막이+토공사: {bp.preWorkDays}일 <span className="text-zinc-400 dark:text-zinc-500 ml-1">({bp.temporaryWorkDays}+{bp.earthRetentionWorkDays}+{bp.earthworkWorkDays})</span></p>
                            </div>

                            {undergroundCats.length > 0 && (
                              <div className="pl-6">
                                <div className="flex items-center gap-1.5 mb-1.5">
                                  <span className="w-2 h-2 rounded-sm bg-blue-500" />
                                  <span className="text-xs font-medium text-zinc-600 dark:text-zinc-400">지하 공정</span>
                                </div>
                                <div className="space-y-1">
                                  {undergroundCats.map(cat => (
                                    <div key={cat.category} className="flex items-center text-xs text-zinc-700 dark:text-zinc-300 gap-2">
                                      <span className="min-w-[100px] truncate">{cat.category}</span>
                                      <span className="tabular-nums w-14 text-right font-medium">{cat.totalDays}일</span>
                                      <span className="tabular-nums w-20 text-right text-[11px] text-zinc-500 dark:text-zinc-400">순 {cat.netDays} / 간 {cat.indirectDays}</span>
                                      <span className="text-zinc-500 dark:text-zinc-400 w-20 truncate">{cat.processType}</span>
                                      {cat.floorLabelsDisplay && <span className="ml-auto text-zinc-400 dark:text-zinc-500 truncate">{cat.floorLabelsDisplay}</span>}
                                    </div>
                                  ))}
                                </div>
                              </div>
                            )}

                            {abovegroundCats.length > 0 && (
                              <div className="pl-6">
                                <div className="flex items-center gap-1.5 mb-1.5">
                                  <span className="w-2 h-2 rounded-sm bg-green-500" />
                                  <span className="text-xs font-medium text-zinc-600 dark:text-zinc-400">지상 공정</span>
                                </div>
                                <div className="space-y-1">
                                  {abovegroundCats.map(cat => (
                                    <div key={cat.category} className="flex items-center text-xs text-zinc-700 dark:text-zinc-300 gap-2">
                                      <span className="min-w-[100px] truncate">{cat.category}</span>
                                      <span className="tabular-nums w-14 text-right font-medium">{cat.totalDays}일</span>
                                      <span className="tabular-nums w-20 text-right text-[11px] text-zinc-500 dark:text-zinc-400">순 {cat.netDays} / 간 {cat.indirectDays}</span>
                                      <span className="text-zinc-500 dark:text-zinc-400 w-20 truncate">{cat.processType}</span>
                                      {cat.floorLabelsDisplay && <span className="ml-auto text-zinc-400 dark:text-zinc-500 truncate">{cat.floorLabelsDisplay}</span>}
                                    </div>
                                  ))}
                                </div>
                              </div>
                            )}
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}

              <p className="text-xs text-amber-600 dark:text-amber-400 bg-amber-50 dark:bg-amber-900/20 px-3 py-2 rounded-lg">
                기존 간트차트 데이터에 추가됩니다.
              </p>
            </div>

            {/* 푸터 */}
            <div className="flex items-center justify-end gap-3 p-6 pt-4 border-t border-zinc-200 dark:border-zinc-700">
              <button
                onClick={closeImportModal}
                disabled={isImporting || isRefreshingPreview}
                className="px-4 py-2.5 text-sm font-medium text-zinc-700 dark:text-zinc-300 bg-zinc-100 dark:bg-zinc-800 hover:bg-zinc-200 dark:hover:bg-zinc-700 rounded-lg transition-colors disabled:opacity-50"
              >
                취소
              </button>
              <button
                onClick={handleConfirmImport}
                disabled={isImporting || isRefreshingPreview || !importStartDate}
                className="flex items-center gap-2 px-5 py-2.5 text-sm font-semibold text-white bg-blue-600 hover:bg-blue-700 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isImporting ? <><Loader2 className="w-4 h-4 animate-spin" />가져오는 중...</> : <><Upload className="w-4 h-4" />가져오기</>}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
