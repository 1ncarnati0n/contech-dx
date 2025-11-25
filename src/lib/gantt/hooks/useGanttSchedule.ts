/**
 * useGanttSchedule Hook (Orchestrator)
 * 모든 Gantt 관련 hooks를 통합하여 관리합니다.
 */

import { useRef, useCallback } from "react";
import { useGanttData } from "./useGanttData";
import { useGanttEvents } from "./useGanttEvents";
import { useSummaryProgress } from "./useSummaryProgress";
import type { GanttApi, Schedule, SaveState } from "../types";

export interface UseGanttScheduleResult {
  schedule: Schedule; // null 제거
  isLoading: boolean;
  saveState: SaveState;
  hasChanges: boolean;
  handleSave: () => Promise<void>;
  initGantt: (api: GanttApi) => void;
}

/**
 * Gantt Schedule Hook
 * 데이터 로딩, 저장, 이벤트 처리, Summary 진행률 계산을 통합 관리
 */
export function useGanttSchedule(ganttChartId: string): UseGanttScheduleResult {
  const apiRef = useRef<GanttApi | null>(null);

  // Data Hook
  const {
    schedule,
    isLoading,
    saveState,
    hasChanges,
    handleSave,
    syncFromApi,
    markAsChanged,
  } = useGanttData(apiRef, ganttChartId);

  // Summary Progress Hook
  const { recalcSummaryProgress, recalcAllSummaryTasks } = useSummaryProgress(apiRef);

  // Events Hook
  const {
    attachDataListeners,
    attachSummaryListeners,
    attachUIListeners,
  } = useGanttEvents({
    onDataChange: syncFromApi,
    onMarkChanged: markAsChanged,
    recalcSummaryProgress,
  });

  /**
   * Gantt API 초기화
   */
  const initGantt = useCallback(
    (api: GanttApi) => {
      apiRef.current = api;

      // Attach event listeners
      attachDataListeners(api);
      attachSummaryListeners(api);
      attachUIListeners(api);

      // Initial summary calculation
      recalcAllSummaryTasks();
      syncFromApi();
    },
    [attachDataListeners, attachSummaryListeners, attachUIListeners, recalcAllSummaryTasks, syncFromApi]
  );

  return {
    schedule,
    isLoading,
    saveState,
    hasChanges,
    handleSave,
    initGantt,
  };
}

