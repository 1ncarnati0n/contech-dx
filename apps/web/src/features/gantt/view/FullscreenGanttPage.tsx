'use client';

import { GanttChart } from 'sa-gantt-lib';
import 'sa-gantt-lib/style.css';
import { Loader2 } from 'lucide-react';
import { FullscreenGanttHeader } from '@/features/gantt/view/fullscreen-gantt/FullscreenGanttHeader';
import { useFullscreenGantt } from '@/features/gantt/service/useFullscreenGantt';

interface FullscreenGanttPageProps {
  projectId: string;
  projectName: string;
}

export function FullscreenGanttPage({ projectId, projectName }: FullscreenGanttPageProps) {
  const {
    tasks, milestones, groupDependencies,
    isLoading, error,
    hasUnsavedChanges, saveStatus, loadedFileName,
    canUndo, canRedo, historyLength,
    calendarSettings,
    undo, redo,
    handleSave, handleReset,
    handleExport, handleExportExcel, handleImport,
    handleTaskUpdate, handleTaskCreate, handleTaskDelete,
    handleTaskReorder, handleTaskMove,
    handleTaskGroup, handleTaskUngroup, handleTaskBlockify,
    handleGroupDrag,
    handleGroupDependencyCreate, handleGroupDependencyDelete, handleGroupCycleDetected,
    handleMilestoneCreate, handleMilestoneUpdate, handleMilestoneDelete,
    handleViewChange,
    handleClose,
  } = useFullscreenGantt(projectId, projectName);

  if (isLoading) {
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-white dark:bg-zinc-900">
        <div className="flex flex-col items-center gap-4">
          <Loader2 className="w-8 h-8 animate-spin text-blue-500" />
          <span className="text-slate-500 dark:text-slate-400">간트차트 로딩 중...</span>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-white dark:bg-zinc-900">
        <div className="flex flex-col items-center gap-4 text-center">
          <div className="w-16 h-16 bg-red-50 dark:bg-red-900/20 rounded-full flex items-center justify-center">
            <span className="text-2xl">⚠️</span>
          </div>
          <h3 className="text-lg font-medium text-slate-900 dark:text-white">오류 발생</h3>
          <p className="text-sm text-slate-500">{error}</p>
          <button
            onClick={handleClose}
            className="px-4 py-2 bg-slate-900 text-white rounded-md hover:bg-slate-800"
          >
            닫기
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 z-50 flex flex-col overflow-hidden sa-gantt-root"
         style={{ backgroundColor: 'var(--gantt-bg-secondary)' }}>
      <FullscreenGanttHeader
        projectName={projectName}
        canUndo={canUndo}
        canRedo={canRedo}
        historyLength={historyLength}
        hasUnsavedChanges={hasUnsavedChanges}
        saveStatus={saveStatus}
        onUndo={undo}
        onRedo={redo}
        onClose={handleClose}
      />

      <div className="flex-1 overflow-hidden">
        <GanttChart
          tasks={tasks}
          milestones={milestones}
          calendarSettings={calendarSettings}
          onTaskUpdate={handleTaskUpdate}
          onTaskCreate={handleTaskCreate}
          onTaskDelete={handleTaskDelete}
          onTaskReorder={handleTaskReorder}
          onTaskMove={handleTaskMove}
          onTaskGroup={handleTaskGroup}
          onTaskUngroup={handleTaskUngroup}
          onTaskBlockify={handleTaskBlockify}
          onViewChange={handleViewChange}
          onGroupDrag={handleGroupDrag}
          onMilestoneCreate={handleMilestoneCreate}
          onMilestoneUpdate={handleMilestoneUpdate}
          onMilestoneDelete={handleMilestoneDelete}
          groupDependencies={groupDependencies}
          onGroupDependencyCreate={handleGroupDependencyCreate}
          onGroupDependencyDelete={handleGroupDependencyDelete}
          onGroupCycleDetected={handleGroupCycleDetected}
          onSave={handleSave}
          onReset={handleReset}
          hasUnsavedChanges={hasUnsavedChanges}
          saveStatus={saveStatus}
          onExport={handleExport}
          onExportExcel={handleExportExcel}
          onImport={handleImport}
          loadedFileName={loadedFileName}
        />
      </div>
    </div>
  );
}
