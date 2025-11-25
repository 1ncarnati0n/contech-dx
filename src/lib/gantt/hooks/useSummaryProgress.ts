/**
 * useSummaryProgress Hook
 * Summary task의 진행률을 자동으로 계산하고 업데이트합니다.
 */

import { useCallback } from "react";
import { calculateTaskDuration, clamp } from "../utils/taskCalculations";
import type { GanttApi, TaskId, Task } from "../types";

export function useSummaryProgress(apiRef: React.MutableRefObject<GanttApi | null>) {
  /**
   * Summary task의 진행률을 자식 task들의 가중 평균으로 계산
   */
  const getSummaryProgress = useCallback((summaryId: TaskId): number => {
    const api = apiRef.current;
    if (!api) {
      return 0;
    }

    const collect = (taskId: TaskId): [number, number] => {
      const task = api.getTask(taskId);
      const children = task?.data;

      if (!children || !children.length) {
        return [0, 0];
      }

      let totalProgress = 0;
      let totalDuration = 0;

      children.forEach((child: Task) => {
        const childTask = api.getTask(child.id);
        if (!childTask) {
          return;
        }

        // Skip milestones and summary tasks for direct progress calculation
        if (childTask.type !== "milestone" && childTask.type !== "summary") {
          const duration = calculateTaskDuration(childTask);
          if (duration > 0) {
            const progressValue =
              typeof childTask.progress === "number"
                ? childTask.progress
                : Number(childTask.progress ?? 0);
            const boundedProgress = Number.isFinite(progressValue)
              ? clamp(progressValue, 0, 100)
              : 0;
            totalDuration += duration;
            totalProgress += duration * boundedProgress;
          }
        }

        // Recursively collect from nested summary tasks
        const [childProgress, childDuration] = collect(childTask.id);
        totalProgress += childProgress;
        totalDuration += childDuration;
      });

      return [totalProgress, totalDuration];
    };

    const [totalProgress, totalDuration] = collect(summaryId);
    if (!totalDuration) {
      return 0;
    }

    const average = totalProgress / totalDuration;
    if (!Number.isFinite(average)) {
      return 0;
    }

    const rounded = Math.round(average);
    return clamp(rounded, 0, 100);
  }, [apiRef]);

  /**
   * Summary task의 진행률을 다시 계산하고 업데이트
   */
  const recalcSummaryProgress = useCallback(
    (taskId: TaskId, treatAsSummary = false) => {
      const api = apiRef.current;
      if (!api) {
        return;
      }

      if (taskId === undefined || taskId === null) {
        return;
      }

      const task = api.getTask(taskId);
      if (!task || task.type === "milestone") {
        return;
      }

      const state = api.getState?.();
      const tasksStore = state?.tasks;

      // Get the summary ID (either this task if it's a summary, or its parent summary)
      const summaryId =
        treatAsSummary && task.type === "summary"
          ? taskId
          : tasksStore?.getSummaryId?.(taskId);

      if (!summaryId) {
        return;
      }

      const summaryTask = api.getTask(summaryId);
      if (!summaryTask) {
        return;
      }

      const nextProgress = getSummaryProgress(summaryId);
      const currentProgress =
        typeof summaryTask.progress === "number"
          ? summaryTask.progress
          : Number(summaryTask.progress ?? 0);

      if (!Number.isFinite(nextProgress) || nextProgress === currentProgress) {
        return;
      }

      api.exec("update-task", {
        id: summaryId,
        task: { progress: nextProgress },
      });
    },
    [apiRef, getSummaryProgress]
  );

  /**
   * 모든 Summary task의 진행률을 재계산
   */
  const recalcAllSummaryTasks = useCallback(() => {
    const api = apiRef.current;
    if (!api) {
      return;
    }

    try {
      const state = api.getState?.();
      const tasksStore = state?.tasks;
      tasksStore?.forEach?.((task: Task) => {
        if (task.type === "summary") {
          recalcSummaryProgress(task.id, true);
        }
      });
    } catch (error) {
      console.warn("Failed to recalculate summary progress:", error);
    }
  }, [apiRef, recalcSummaryProgress]);

  return {
    getSummaryProgress,
    recalcSummaryProgress,
    recalcAllSummaryTasks,
  };
}

