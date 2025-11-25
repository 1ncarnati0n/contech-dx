/**
 * useGanttEvents Hook
 * Gantt 이벤트 리스너를 관리합니다.
 */

import { useCallback } from "react";
import { SYNC_EVENT_TAG, UI_EVENT_TAG, SUMMARY_EVENT_TAG } from "../constants";
import type { GanttApi, TaskEvent, TaskId } from "../types";

interface UseGanttEventsProps {
  onDataChange?: () => void;
  onMarkChanged?: () => void;
  recalcSummaryProgress?: (taskId: TaskId, treatAsSummary?: boolean) => void;
}

export function useGanttEvents({
  onDataChange,
  onMarkChanged,
  recalcSummaryProgress,
}: UseGanttEventsProps) {
  /**
   * 데이터 변경 이벤트 리스너 등록
   */
  const attachDataListeners = useCallback(
    (api: GanttApi) => {
      // Remove existing listeners
      api.detach(SYNC_EVENT_TAG);

      const events = [
        "add-task",
        "update-task",
        "delete-task",
        "move-task",
        "copy-task",
        "indent-task",
        "add-link",
        "update-link",
        "delete-link",
      ];

      events.forEach((eventName) => {
        api.on(
          eventName,
          (payload: unknown) => {
            const event = payload as TaskEvent;
            // Skip in-progress updates (e.g., progress bar dragging)
            if (event?.inProgress) {
              return;
            }
            onDataChange?.();
            onMarkChanged?.();
          },
          { tag: SYNC_EVENT_TAG }
        );
      });
    },
    [onDataChange, onMarkChanged]
  );

  /**
   * Summary task 진행률 자동 업데이트 리스너 등록
   */
  const attachSummaryListeners = useCallback(
    (api: GanttApi) => {
      if (!recalcSummaryProgress) {
        return;
      }

      // Remove existing listeners
      api.detach(SUMMARY_EVENT_TAG);

      const registerSummaryHandler = (action: string, handler: (payload: unknown) => void) => {
        api.on(action, handler, { tag: SUMMARY_EVENT_TAG });
      };

      registerSummaryHandler("add-task", (payload) => {
        const { id } = payload as TaskEvent;
        recalcSummaryProgress(id);
      });

      registerSummaryHandler("update-task", (payload) => {
        const event = payload as TaskEvent;
        if (event?.inProgress) {
          return;
        }
        recalcSummaryProgress(event.id);
      });

      registerSummaryHandler("copy-task", (payload) => {
        const { id } = payload as TaskEvent;
        recalcSummaryProgress(id);
      });

      registerSummaryHandler("delete-task", (payload) => {
        const { source } = payload as TaskEvent;
        if (source !== undefined && source !== null) {
          recalcSummaryProgress(source, true);
        }
      });

      registerSummaryHandler("move-task", (payload) => {
        const event = payload as TaskEvent;
        if (event?.inProgress) {
          return;
        }
        recalcSummaryProgress(event.id);
        if (event?.source !== undefined && event?.source !== null) {
          recalcSummaryProgress(event.source, true);
        }
      });
    },
    [recalcSummaryProgress]
  );

  /**
   * UI 이벤트 리스너 등록 (예: 작업 추가 시 에디터 열기)
   */
  const attachUIListeners = useCallback((api: GanttApi) => {
    // Remove existing listeners
    api.detach(UI_EVENT_TAG);

    // Open editor when a new task is added
    api.on(
      "add-task",
      (payload: unknown) => {
        const { id } = payload as { id: string | number };
        api.exec("show-editor", { id });
      },
      { tag: UI_EVENT_TAG }
    );
  }, []);

  /**
   * 모든 이벤트 리스너 제거
   */
  const detachAllListeners = useCallback((api: GanttApi | null) => {
    if (!api) {
      return;
    }
    api.detach(SYNC_EVENT_TAG);
    api.detach(UI_EVENT_TAG);
    api.detach(SUMMARY_EVENT_TAG);
  }, []);

  return {
    attachDataListeners,
    attachSummaryListeners,
    attachUIListeners,
    detachAllListeners,
  };
}

