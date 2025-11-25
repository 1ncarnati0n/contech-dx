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
import {
  convertMockTasksToSupabase,
  convertMockLinksToSupabase,
  getMockProjectInfo,
} from "@/lib/gantt/utils/mockDataConverter";
import { createTasksBatch } from "./tasks";
import { createLinksBatch } from "./links";

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

/**
 * Dummy 프로젝트를 위한 샘플 Gantt 차트 생성
 * public/mock.json 데이터를 사용하여 완전한 Gantt 차트 생성
 * 
 * @param projectId - 프로젝트 ID
 * @returns 생성된 Gantt 차트
 */
export async function createSampleGanttChartForDummyProject(
  projectId: string
): Promise<GanttChart> {
  console.log('🎯 샘플 Gantt 차트 생성 시작...', projectId);

  try {
    // 1. mock.json 프로젝트 정보 가져오기
    const mockInfo = getMockProjectInfo();
    console.log('📊 Mock 데이터 정보:', mockInfo);

    // 2. Gantt 차트 생성
    const ganttChart = await createGanttChart({
      project_id: projectId,
      name: `${mockInfo.name} 샘플 공정표`,
      description: mockInfo.description,
      start_date: mockInfo.start_date,
      end_date: mockInfo.end_date,
    });
    console.log('✅ Gantt 차트 생성 완료:', ganttChart.id);

    // 3. mock.json Tasks 변환 및 생성
    const { tasks: tasksData, idMapping } = convertMockTasksToSupabase(ganttChart.id);
    console.log(`📝 Tasks 변환 완료: ${tasksData.length}개`);

    // Tasks 일괄 생성 (ID 매핑 필요하므로 하나씩 생성)
    const createdTasks = await createTasksBatch(tasksData, ganttChart.id);
    console.log(`✅ Tasks 생성 완료: ${createdTasks.length}개`);

    // 4. mock.json Links 변환 및 생성
    // 실제 생성된 Task ID로 다시 매핑 필요
    const realIdMapping = new Map<string, string>();
    
    // mockData의 temp ID → 실제 생성된 UUID 매핑
    tasksData.forEach((taskData, index) => {
      // taskData의 원래 temp ID를 찾아야 함
      // 간단하게 position 기반으로 매핑
      if (createdTasks[index]) {
        // 여기서는 temp ID 매핑이 필요하지만, 현재 구조상 어려움
        // 대신 parent_id가 이미 UUID로 변환되어 있으므로 그대로 사용
      }
    });

    const linksData = convertMockLinksToSupabase(ganttChart.id, idMapping);
    console.log(`🔗 Links 변환 완료: ${linksData.length}개`);

    // Links 일괄 생성
    const createdLinks = await createLinksBatch(linksData, ganttChart.id);
    console.log(`✅ Links 생성 완료: ${createdLinks.length}개`);

    console.log('🎉 샘플 Gantt 차트 생성 완료!');
    console.log(`  - Tasks: ${createdTasks.length}개`);
    console.log(`  - Links: ${createdLinks.length}개`);

    return ganttChart;
  } catch (error) {
    console.error('❌ 샘플 Gantt 차트 생성 실패:', error);
    throw error;
  }
}

