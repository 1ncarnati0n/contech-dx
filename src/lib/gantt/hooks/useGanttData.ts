/**
 * useGanttData Hook
 * Gantt 데이터 로딩, 저장, 동기화를 담당합니다.
 */

import { useState, useCallback, useRef, useEffect } from "react";
import axios from "axios";
import { decorateTask } from "../utils/decorators";
import { serializeSchedule } from "../utils/serializers";
import type { Schedule, SaveState, Task, Link, GanttApi } from "../types";

interface UseGanttDataResult {
  schedule: Schedule | null;
  isLoading: boolean;
  saveState: SaveState;
  hasChanges: boolean;
  handleSave: () => Promise<void>;
  syncFromApi: () => void;
  markAsChanged: () => void;
}

export function useGanttData(apiRef: React.MutableRefObject<GanttApi | null>): UseGanttDataResult {
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
    if (!api) {
      console.error("Gantt API is not ready");
      return;
    }

    try {
      setSaveState("saving");
      syncFromApi();

      const tasksToSave = currentTasksRef.current;
      if (tasksToSave.length === 0) {
        throw new Error("No tasks to save");
      }

      let linksToSave = currentLinksRef.current;
      try {
        const stores = typeof api.getStores === "function" ? api.getStores() : null;
        const dataStore = stores?.data;
        const state = dataStore?.getState ? dataStore.getState() : null;
        if (state?.links) {
          linksToSave = state.links.map((link) => ({ ...link })) as Link[];
          currentLinksRef.current = linksToSave;
        }
      } catch (error) {
        console.warn("Falling back to cached links while saving:", error);
      }

      const payload = serializeSchedule(
        tasksToSave,
        linksToSave,
        (schedule?.scales ?? scalesRef.current) as Array<Record<string, unknown>>
      );

      // API call to Next.js route
      await axios.post("/api/mock", payload, {
        headers: {
          "Content-Type": "application/json",
        },
      });

      setSaveState("saved");
      setHasChanges(false);
      window.setTimeout(() => {
        setSaveState("idle");
      }, 1500);
    } catch (error) {
      console.error("Save error:", error);
      setSaveState("error");
      alert("저장 중 오류가 발생했습니다: " + (error as Error).message);
    }
  }, [apiRef, schedule?.scales, syncFromApi]);

  /**
   * 초기 데이터 로딩
   */
  useEffect(() => {
    let isMounted = true;

    const loadData = async () => {
      setIsLoading(true);

      try {
        // API call to Next.js route
        const response = await axios.get("/api/mock");
        const data = response.data;
        if (!isMounted) {
          return;
        }

        const tasks = (data.tasks ?? []).map((task: unknown) => decorateTask(task as Partial<Task>));
        const links = (data.links ?? []).map((link: unknown) => link as Link);
        const scales = (data.scales ?? []).map((scale: unknown) => scale as Record<string, unknown>);

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
  }, []);

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

