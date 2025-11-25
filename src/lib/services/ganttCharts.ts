/**
 * Gantt Charts Service
 * Gantt 차트 CRUD 작업을 담당합니다.
 */

import { createClient } from "@/lib/supabase/client";
import {
  getMockGanttCharts,
  getMockGanttChart,
  createMockGanttChart,
  updateMockGanttChart,
  deleteMockGanttChart,
} from "./mockStorage";

// Check if Supabase is configured
const USE_MOCK =
  !process.env.NEXT_PUBLIC_SUPABASE_URL ||
  !process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ||
  process.env.NEXT_PUBLIC_USE_MOCK === "true";

export interface GanttChart {
  id: string;
  project_id: string;
  name: string;
  description?: string;
  start_date: string;
  end_date?: string;
  created_at: string;
  updated_at: string;
}

export interface CreateGanttChartDTO {
  project_id: string;
  name: string;
  description?: string;
  start_date: string;
  end_date?: string;
}

export interface UpdateGanttChartDTO {
  name?: string;
  description?: string;
  start_date?: string;
  end_date?: string;
}

/**
 * Get all Gantt charts for a project
 */
export async function getGanttCharts(projectId: string): Promise<GanttChart[]> {
  if (USE_MOCK) {
    return getMockGanttCharts(projectId);
  }

  const supabase = createClient();

  const { data, error } = await supabase
    .from("gantt_charts")
    .select("*")
    .eq("project_id", projectId)
    .order("created_at", { ascending: false });

  if (error) {
    console.error("Error fetching Gantt charts:", error);
    return getMockGanttCharts(projectId);
  }

  return data as GanttChart[];
}

/**
 * Get all Gantt charts for a project (alias for consistency)
 */
export async function getGanttChartsByProject(projectId: string): Promise<GanttChart[]> {
  return getGanttCharts(projectId);
}

/**
 * Get a single Gantt chart by ID
 */
export async function getGanttChart(id: string): Promise<GanttChart | null> {
  if (USE_MOCK) {
    return getMockGanttChart(id);
  }

  const supabase = createClient();

  const { data, error } = await supabase
    .from("gantt_charts")
    .select("*")
    .eq("id", id)
    .single();

  if (error) {
    if (error.code === "PGRST116") {
      return getMockGanttChart(id);
    }
    console.error("Error fetching Gantt chart:", error);
    return getMockGanttChart(id);
  }

  return data as GanttChart;
}

/**
 * Create a new Gantt chart
 */
export async function createGanttChart(
  chart: CreateGanttChartDTO
): Promise<GanttChart> {
  if (USE_MOCK) {
    return createMockGanttChart(chart);
  }

  const supabase = createClient();

  const { data, error } = await supabase
    .from("gantt_charts")
    .insert(chart)
    .select()
    .single();

  if (error) {
    console.error("Error creating Gantt chart:", error);
    return createMockGanttChart(chart);
  }

  return data as GanttChart;
}

/**
 * Update a Gantt chart
 */
export async function updateGanttChart(
  id: string,
  updates: UpdateGanttChartDTO
): Promise<GanttChart> {
  if (USE_MOCK) {
    return updateMockGanttChart(id, updates);
  }

  const supabase = createClient();

  const { data, error } = await supabase
    .from("gantt_charts")
    .update(updates)
    .eq("id", id)
    .select()
    .single();

  if (error) {
    console.error("Error updating Gantt chart:", error);
    return updateMockGanttChart(id, updates);
  }

  return data as GanttChart;
}

/**
 * Delete a Gantt chart
 */
export async function deleteGanttChart(id: string): Promise<void> {
  if (USE_MOCK) {
    deleteMockGanttChart(id);
    return;
  }

  const supabase = createClient();

  const { error } = await supabase.from("gantt_charts").delete().eq("id", id);

  if (error) {
    console.error("Error deleting Gantt chart:", error);
    deleteMockGanttChart(id);
  }
}

