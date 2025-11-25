/**
 * useGanttData Hook
 * Gantt 데이터 로딩, 저장, 동기화를 담당합니다.
 */

import { useState, useCallback, useRef, useEffect } from "react";
import { toast } from "sonner";
import { decorateTask } from "../utils/decorators";
import type { Schedule, SaveState, Task, Link, GanttApi } from "../types";
import { getTasks, upsertTasksBatch, deleteTasksBatch } from "@/lib/services/tasks";
import { getLinks, upsertLinksBatch, deleteLinksBatch } from "@/lib/services/links";
import { convertMockTasksToSupabase, convertMockLinksToSupabase } from "../utils/mockDataConverter";

interface UseGanttDataResult {
  schedule: Schedule | null;
  isLoading: boolean;
  saveState: SaveState;
  hasChanges: boolean;
  handleSave: () => Promise<void>;
  syncFromApi: () => void;
  markAsChanged: () => void;
}

export function useGanttData(
  apiRef: React.MutableRefObject<GanttApi | null>,
  ganttChartId: string
): UseGanttDataResult {
  const currentTasksRef = useRef<Task[]>([]);
  const currentLinksRef = useRef<Link[]>([]);
  const scalesRef = useRef<Array<Record<string, unknown>>>([]);

  const [schedule, setSchedule] = useState<Schedule | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [saveState, setSaveState] = useState<SaveState>("idle");
  const [hasChanges, setHasChanges] = useState<boolean>(false);

  /**
   * 변경사항 표시
   */
  const markAsChanged = useCallback(() => {
    setHasChanges(true);
    setSaveState((prev) => (prev === "saved" ? "idle" : prev));
  }, []);

  /**
   * API로부터 데이터 동기화
   */
  const syncFromApi = useCallback(() => {
    const api = apiRef.current;
    if (!api) {
      return;
    }

    let rawTasks: Array<Partial<Task>> = [];
    try {
      const serialized = typeof api.serialize === "function" ? api.serialize() : [];
      if (Array.isArray(serialized)) {
        rawTasks = serialized as Array<Partial<Task>>;
      }
    } catch (error) {
      console.warn("Failed to serialize tasks from API:", error);
    }

    const decoratedTasks = rawTasks.map((task) => decorateTask(task));

    let links = currentLinksRef.current;
    try {
      const stores = typeof api.getStores === "function" ? api.getStores() : null;
      const dataStore = stores?.data;
      const state = dataStore?.getState ? dataStore.getState() : null;
      if (state?.links) {
        links = state.links.map((link) => ({ ...link })) as Link[];
      }
    } catch (error) {
      console.warn("Failed to extract links from API:", error);
    }

    currentTasksRef.current = decoratedTasks;
    currentLinksRef.current = links;

    setSchedule((prev) =>
      prev
        ? {
          ...prev,
          tasks: decoratedTasks,
          links,
        }
        : prev
    );
  }, [apiRef]);

  /**
   * 데이터 저장
   */
  const handleSave = useCallback(async () => {
    const api = apiRef.current;
    if (!api || !ganttChartId) {
      console.error("Gantt API is not ready or ID is missing");
      toast.error("저장할 수 없습니다: API 미준비 또는 ID 누락");
      return;
    }

    try {
      setSaveState("saving");
      syncFromApi();

      const tasksToSave = currentTasksRef.current;
      const linksToSave = currentLinksRef.current;

      // 1. Get existing IDs to handle deletions
      const existingTasks = await getTasks(ganttChartId);
      const existingLinks = await getLinks(ganttChartId);

      const existingTaskIds = new Set(existingTasks.map((t) => t.id));
      const existingLinkIds = new Set(existingLinks.map((l) => l.id));

      const currentTaskIds = new Set(tasksToSave.map((t) => t.id));
      const currentLinkIds = new Set(linksToSave.map((l) => l.id));

      // 2. Calculate IDs to delete
      const tasksToDelete = [...existingTaskIds].filter((id) => !currentTaskIds.has(id));
      const linksToDelete = [...existingLinkIds].filter((id) => !currentLinkIds.has(id));

      // 3. Perform batch operations
      await Promise.all([
        deleteTasksBatch(tasksToDelete.map(String)),
        deleteLinksBatch(linksToDelete.map(String)),
        upsertTasksBatch(tasksToSave, ganttChartId),
        upsertLinksBatch(linksToSave, ganttChartId),
      ]);

      setSaveState("saved");
      setHasChanges(false);
      toast.success("저장되었습니다");

      window.setTimeout(() => {
        setSaveState("idle");
      }, 1500);
    } catch (error) {
      console.error("Save error:", error);
      setSaveState("error");
      toast.error("저장 중 오류가 발생했습니다");
    }
  }, [apiRef, ganttChartId, syncFromApi]);

  /**
   * 초기 데이터 로딩
   */
  useEffect(() => {
    let isMounted = true;

    const loadData = async () => {
      if (!ganttChartId) return;

      setIsLoading(true);

      try {
        let [tasks, links] = await Promise.all([
          getTasks(ganttChartId),
          getLinks(ganttChartId),
        ]);

        if (tasks.length === 0 && links.length === 0) {
          console.log("Seeding mock data for Gantt Chart:", ganttChartId);
          try {
            const { tasks: mockTasks, idMapping } = convertMockTasksToSupabase(ganttChartId);
            const mockLinks = convertMockLinksToSupabase(ganttChartId, idMapping);

            // Upsert to DB
            const [seededTasks, seededLinks] = await Promise.all([
              upsertTasksBatch(mockTasks, ganttChartId),
              upsertLinksBatch(mockLinks, ganttChartId),
            ]);

            tasks = seededTasks;
            links = seededLinks;
            toast.success("샘플 데이터가 로드되었습니다");
          } catch (seedError) {
            console.error("Failed to seed mock data:", seedError);
            toast.error("샘플 데이터 로딩 실패");
          }
        }

        if (!isMounted) {
          return;
        }

        // Mock scales for now (or fetch from DB if we store them)
        const scales = [
          { unit: "month" as const, step: 1, format: "M월" },
          { unit: "day" as const, step: 1, format: "d" },
        ];

        scalesRef.current = scales;
        currentTasksRef.current = tasks;
        currentLinksRef.current = links;

        setSchedule({ tasks, links, scales });
        setHasChanges(false);
        setSaveState("idle");
      } catch (error) {
        console.error("Error loading data:", error);
        if (isMounted) {
          setSchedule(null);
        }
        toast.error("데이터 로딩 실패");
      } finally {
        if (isMounted) {
          setIsLoading(false);
        }
      }
    };

    void loadData();

    return () => {
      isMounted = false;
    };
  }, [ganttChartId]);

  return {
    schedule,
    isLoading,
    saveState,
    hasChanges,
    handleSave,
    syncFromApi,
    markAsChanged,
  };
}
