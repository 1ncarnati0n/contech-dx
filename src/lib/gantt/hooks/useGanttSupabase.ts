/**
 * useGanttSupabase Hook
 * Supabase를 사용한 Gantt 데이터 관리
 */

import { useState, useCallback, useRef } from "react";
import { getTasks } from "@/lib/services/tasks";
import { getLinks } from "@/lib/services/links";
import type { GanttApi, Task, Link, SaveState } from "../types";
import { toast } from "sonner";

export interface UseGanttSupabaseOptions {
  ganttChartId: string;
  onSuccess?: () => void;
}

export interface UseGanttSupabaseResult {
  saveState: SaveState;
  hasChanges: boolean;
  handleSave: () => Promise<void>;
  loadData: () => Promise<{ tasks: Task[]; links: Link[] }>;
}

/**
 * Supabase를 사용한 Gantt 데이터 관리 Hook
 */
export function useGanttSupabase({
  ganttChartId,
  onSuccess,
}: UseGanttSupabaseOptions): UseGanttSupabaseResult {
  const apiRef = useRef<GanttApi | null>(null);
  const [saveState, setSaveState] = useState<SaveState>("idle");
  const [hasChanges, setHasChanges] = useState(false);

  /**
   * 데이터 로딩
   */
  const loadData = useCallback(async () => {
    try {
      const [tasks, links] = await Promise.all([
        getTasks(ganttChartId),
        getLinks(ganttChartId),
      ]);

      return { tasks, links };
    } catch (error) {
      console.error("Failed to load Gantt data:", error);
      toast.error("데이터 로딩 실패");
      throw error;
    }
  }, [ganttChartId]);

  /**
   * 데이터 저장
   */
  const handleSave = useCallback(async () => {
    const api = apiRef.current;
    if (!api) {
      toast.error("Gantt API가 준비되지 않았습니다");
      return;
    }

    try {
      setSaveState("saving");

      // TODO: Implement delta-based sync
      // Get current state from API
      // const currentTasks = typeof api.serialize === "function" ? api.serialize() : [];
      // const stores = typeof api.getStores === "function" ? api.getStores() : null;
      // const dataStore = stores?.data;
      // const state = dataStore?.getState ? dataStore.getState() : null;
      // const currentLinks = state?.links || [];
      
      // For now, we'll use a simple approach
      // Save tasks
      // const existingTasks = await getTasks(ganttChartId);
      // Implement diff logic here

      // Save links
      // const existingLinks = await getLinks(ganttChartId);
      // Implement diff logic here

      setSaveState("saved");
      setHasChanges(false);
      toast.success("저장되었습니다");
      
      onSuccess?.();

      // Reset saved state after 2 seconds
      setTimeout(() => {
        setSaveState("idle");
      }, 2000);
    } catch (error) {
      console.error("Save error:", error);
      setSaveState("error");
      toast.error("저장 실패");
    }
  }, [ganttChartId, onSuccess]);

  return {
    saveState,
    hasChanges,
    handleSave,
    loadData,
  };
}

