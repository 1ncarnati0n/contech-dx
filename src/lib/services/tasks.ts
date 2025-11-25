/**
 * Tasks Service
 * Task CRUD 작업을 담당합니다.
 */

import { createClient } from "@/lib/supabase/client";
import type { SupabaseClient } from "@supabase/supabase-js";
import type { TaskDTO, Task } from "@/lib/gantt/types";
import { decorateTask } from "@/lib/gantt/utils";
import { getMockTasks } from "./mockStorage";

// Check if Supabase is configured
const USE_MOCK =
  !process.env.NEXT_PUBLIC_SUPABASE_URL ||
  !process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ||
  process.env.NEXT_PUBLIC_USE_MOCK === "true";

/**
 * Get all tasks for a Gantt chart
 */
export async function getTasks(ganttChartId: string, supabaseClient?: SupabaseClient): Promise<Task[]> {
  if (USE_MOCK) {
    return getMockTasks(ganttChartId);
  }

  const supabase = supabaseClient || createClient();

  const { data, error } = await supabase
    .from("tasks")
    .select("*")
    .eq("gantt_chart_id", ganttChartId)
    .order("position", { ascending: true });

  if (error) {
    console.error("Error fetching tasks:", error);
    return getMockTasks(ganttChartId);
  }

  // Convert DTO to Task with decorated properties
  return (data as TaskDTO[]).map((taskDto) => {
    const task: Partial<Task> = {
      id: taskDto.id,
      text: taskDto.text,
      type: taskDto.type,
      start: taskDto.start_date,
      end: taskDto.end_date,
      progress: taskDto.progress,
      parent: taskDto.parent_id,
      position: taskDto.position,
      open: taskDto.open,
      assigned: taskDto.assigned_to,
      category: taskDto.category,
      workType: taskDto.work_type,
    };

    return decorateTask(task);
  });
}

/**
 * Get a single task by ID
 */
export async function getTask(id: string | number, supabaseClient?: SupabaseClient): Promise<Task | null> {
  const supabase = supabaseClient || createClient();

  const { data, error } = await supabase
    .from("tasks")
    .select("*")
    .eq("id", id)
    .single();

  if (error) {
    if (error.code === "PGRST116") {
      // Not found
      return null;
    }
    console.error("Error fetching task:", error);
    throw new Error("Failed to fetch task");
  }

  const taskDto = data as TaskDTO;
  const task: Partial<Task> = {
    id: taskDto.id,
    text: taskDto.text,
    type: taskDto.type,
    start: taskDto.start_date,
    end: taskDto.end_date,
    progress: taskDto.progress,
    parent: taskDto.parent_id,
    position: taskDto.position,
    open: taskDto.open,
    assigned: taskDto.assigned_to,
    category: taskDto.category,
    workType: taskDto.work_type,
  };

  return decorateTask(task);
}

/**
 * Create a new task
 */
export async function createTask(task: Partial<Task>, ganttChartId: string): Promise<Task> {
  const supabase = createClient();

  const taskDto: Partial<TaskDTO> = {
    gantt_chart_id: ganttChartId,
    text: task.text,
    type: task.type,
    start_date: typeof task.start === "string" ? task.start : task.start?.toISOString().split("T")[0],
    end_date: task.end ? (typeof task.end === "string" ? task.end : task.end.toISOString().split("T")[0]) : undefined,
    progress: task.progress ?? 0,
    parent_id: task.parent !== undefined ? String(task.parent) : undefined,
    position: task.position ?? 0,
    open: task.open ?? true,
    assigned_to: task.assigned !== undefined ? String(task.assigned) : undefined,
    category: task.category,
    work_type: task.workType,
  };

  const { data, error } = await supabase
    .from("tasks")
    .insert(taskDto)
    .select()
    .single();

  if (error) {
    console.error("Error creating task:", error);
    throw new Error("Failed to create task");
  }

  const createdDto = data as TaskDTO;
  const createdTask: Partial<Task> = {
    id: createdDto.id,
    text: createdDto.text,
    type: createdDto.type,
    start: createdDto.start_date,
    end: createdDto.end_date,
    progress: createdDto.progress,
    parent: createdDto.parent_id,
    position: createdDto.position,
    open: createdDto.open,
    assigned: createdDto.assigned_to,
    category: createdDto.category,
    workType: createdDto.work_type,
  };

  return decorateTask(createdTask);
}

/**
 * Update a task
 */
export async function updateTask(
  id: string | number,
  updates: Partial<Task>
): Promise<Task> {
  const supabase = createClient();

  const taskDto: Partial<TaskDTO> = {};
  if (updates.text !== undefined) taskDto.text = updates.text;
  if (updates.type !== undefined) taskDto.type = updates.type;
  if (updates.start !== undefined) {
    taskDto.start_date = typeof updates.start === "string" ? updates.start : updates.start.toISOString().split("T")[0];
  }
  if (updates.end !== undefined) {
    taskDto.end_date = updates.end ? (typeof updates.end === "string" ? updates.end : updates.end.toISOString().split("T")[0]) : undefined;
  }
  if (updates.progress !== undefined) taskDto.progress = updates.progress;
  if (updates.parent !== undefined) taskDto.parent_id = String(updates.parent);
  if (updates.position !== undefined) taskDto.position = updates.position;
  if (updates.open !== undefined) taskDto.open = updates.open;
  if (updates.assigned !== undefined) taskDto.assigned_to = String(updates.assigned);
  if (updates.category !== undefined) taskDto.category = updates.category;
  if (updates.workType !== undefined) taskDto.work_type = updates.workType;

  const { data, error } = await supabase
    .from("tasks")
    .update(taskDto)
    .eq("id", id)
    .select()
    .single();

  if (error) {
    console.error("Error updating task:", error);
    throw new Error("Failed to update task");
  }

  const updatedDto = data as TaskDTO;
  const updatedTask: Partial<Task> = {
    id: updatedDto.id,
    text: updatedDto.text,
    type: updatedDto.type,
    start: updatedDto.start_date,
    end: updatedDto.end_date,
    progress: updatedDto.progress,
    parent: updatedDto.parent_id,
    position: updatedDto.position,
    open: updatedDto.open,
    assigned: updatedDto.assigned_to,
    category: updatedDto.category,
    workType: updatedDto.work_type,
  };

  return decorateTask(updatedTask);
}

/**
 * Delete a task
 */
export async function deleteTask(id: string | number): Promise<void> {
  const supabase = createClient();

  const { error } = await supabase.from("tasks").delete().eq("id", id);

  if (error) {
    console.error("Error deleting task:", error);
    throw new Error("Failed to delete task");
  }
}

/**
 * Batch create tasks
 */
export async function createTasksBatch(
  tasks: Array<Partial<Task>>,
  ganttChartId: string
): Promise<Task[]> {
  const supabase = createClient();

  const taskDtos: Array<Partial<TaskDTO>> = tasks.map((task) => ({
    gantt_chart_id: ganttChartId,
    text: task.text,
    type: task.type,
    start_date: typeof task.start === "string" ? task.start : task.start?.toISOString().split("T")[0],
    end_date: task.end ? (typeof task.end === "string" ? task.end : task.end.toISOString().split("T")[0]) : undefined,
    progress: task.progress ?? 0,
    parent_id: task.parent !== undefined ? String(task.parent) : undefined,
    position: task.position ?? 0,
    open: task.open ?? true,
    assigned_to: task.assigned !== undefined ? String(task.assigned) : undefined,
    category: task.category,
    work_type: task.workType,
  }));

  const { data, error } = await supabase
    .from("tasks")
    .insert(taskDtos)
    .select();

  if (error) {
    console.error("Error creating tasks batch:", JSON.stringify(error, null, 2));
    throw new Error("Failed to create tasks batch");
  }

  return (data as TaskDTO[]).map((taskDto) => {
    const task: Partial<Task> = {
      id: taskDto.id,
      text: taskDto.text,
      type: taskDto.type,
      start: taskDto.start_date,
      end: taskDto.end_date,
      progress: taskDto.progress,
      parent: taskDto.parent_id,
      position: taskDto.position,
      open: taskDto.open,
      assigned: taskDto.assigned_to,
      category: taskDto.category,
      workType: taskDto.work_type,
    };

    return decorateTask(task);
  });
}

/**
 * Batch upsert tasks
 */
export async function upsertTasksBatch(
  tasks: Array<Partial<Task>>,
  ganttChartId: string
): Promise<Task[]> {
  const supabase = createClient();

  const taskDtos: Array<Partial<TaskDTO>> = tasks.map((task) => ({
    id: typeof task.id === "string" && task.id.length > 10 ? task.id : undefined, // Only use ID if it looks like a UUID
    gantt_chart_id: ganttChartId,
    text: task.text,
    type: task.type,
    start_date: typeof task.start === "string" ? task.start : task.start?.toISOString().split("T")[0],
    end_date: task.end ? (typeof task.end === "string" ? task.end : task.end.toISOString().split("T")[0]) : undefined,
    progress: task.progress ?? 0,
    parent_id: task.parent !== undefined ? String(task.parent) : undefined,
    position: task.position ?? 0,
    open: task.open ?? true,
    assigned_to: task.assigned !== undefined ? String(task.assigned) : undefined,
    category: task.category,
    work_type: task.workType,
  }));

  const { data, error } = await supabase
    .from("tasks")
    .upsert(taskDtos, { onConflict: "id" })
    .select();

  if (error) {
    console.error("Error upserting tasks batch:", JSON.stringify(error, null, 2));
    throw new Error("Failed to upsert tasks batch");
  }

  return (data as TaskDTO[]).map((taskDto) => {
    const task: Partial<Task> = {
      id: taskDto.id,
      text: taskDto.text,
      type: taskDto.type,
      start: taskDto.start_date,
      end: taskDto.end_date,
      progress: taskDto.progress,
      parent: taskDto.parent_id,
      position: taskDto.position,
      open: taskDto.open,
      assigned: taskDto.assigned_to,
      category: taskDto.category,
      workType: taskDto.work_type,
    };

    return decorateTask(task);
  });
}

/**
 * Batch delete tasks
 */
export async function deleteTasksBatch(ids: string[]): Promise<void> {
  if (ids.length === 0) return;

  const supabase = createClient();
  const { error } = await supabase.from("tasks").delete().in("id", ids);

  if (error) {
    console.error("Error deleting tasks batch:", error);
    throw new Error("Failed to delete tasks batch");
  }
}

