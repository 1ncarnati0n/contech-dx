/**
 * Links Service
 * Link CRUD 작업을 담당합니다.
 */

import { createClient } from "@/lib/supabase/client";
import type { Link } from "@/lib/gantt/types";
import { getMockLinks } from "./mockStorage";

// Check if Supabase is configured
const USE_MOCK =
  !process.env.NEXT_PUBLIC_SUPABASE_URL ||
  !process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ||
  process.env.NEXT_PUBLIC_USE_MOCK === "true";

/**
 * Get all links for a Gantt chart
 */
export async function getLinks(ganttChartId: string): Promise<Link[]> {
  if (USE_MOCK) {
    const mockLinks = getMockLinks(ganttChartId);
    return mockLinks.map(linkDtoToLink);
  }

  const supabase = createClient();

  const { data, error } = await supabase
    .from("links")
    .select("*")
    .eq("gantt_chart_id", ganttChartId);

  if (error) {
    console.error("Error fetching links:", error);
    const mockLinks = getMockLinks(ganttChartId);
    return mockLinks.map(linkDtoToLink);
  }

  return (data as any[]).map(linkDtoToLink);
}

/**
 * Get a single link by ID
 */
export async function getLink(id: string | number): Promise<Link | null> {
  const supabase = createClient();

  const { data, error } = await supabase
    .from("links")
    .select("*")
    .eq("id", id)
    .single();

  if (error) {
    if (error.code === "PGRST116") {
      // Not found
      return null;
    }
    console.error("Error fetching link:", error);
    throw new Error("Failed to fetch link");
  }

  return linkDtoToLink(data);
}

/**
 * Create a new link
 */
export async function createLink(
  link: Partial<Link>,
  ganttChartId: string
): Promise<Link> {
  const supabase = createClient();

  const linkDto = {
    gantt_chart_id: ganttChartId,
    source: String(link.source),
    target: String(link.target),
    type: link.type || "e2s",
  };

  const { data, error } = await supabase
    .from("links")
    .insert(linkDto)
    .select()
    .single();

  if (error) {
    console.error("Error creating link:", error);
    throw new Error("Failed to create link");
  }

  return linkDtoToLink(data);
}

/**
 * Update a link
 */
export async function updateLink(
  id: string | number,
  updates: Partial<Link>
): Promise<Link> {
  const supabase = createClient();

  const linkDto: any = {};
  if (updates.source !== undefined) linkDto.source = String(updates.source);
  if (updates.target !== undefined) linkDto.target = String(updates.target);
  if (updates.type !== undefined) linkDto.type = updates.type;

  const { data, error } = await supabase
    .from("links")
    .update(linkDto)
    .eq("id", id)
    .select()
    .single();

  if (error) {
    console.error("Error updating link:", error);
    throw new Error("Failed to update link");
  }

  return linkDtoToLink(data);
}

/**
 * Delete a link
 */
export async function deleteLink(id: string | number): Promise<void> {
  const supabase = createClient();

  const { error } = await supabase.from("links").delete().eq("id", id);

  if (error) {
    console.error("Error deleting link:", error);
    throw new Error("Failed to delete link");
  }
}

/**
 * Batch create links
 */
export async function createLinksBatch(
  links: Array<Partial<Link>>,
  ganttChartId: string
): Promise<Link[]> {
  const supabase = createClient();

  const linkDtos = links.map((link) => ({
    gantt_chart_id: ganttChartId,
    source: String(link.source),
    target: String(link.target),
    type: link.type || "e2s",
  }));

  const { data, error } = await supabase
    .from("links")
    .insert(linkDtos)
    .select();

  if (error) {
    console.error("Error creating links batch:", error);
    throw new Error("Failed to create links batch");
  }

  return (data as any[]).map(linkDtoToLink);
}

/**
 * Convert DTO to Link
 */
function linkDtoToLink(linkDto: any): Link {
  return {
    id: linkDto.id,
    source: linkDto.source,
    target: linkDto.target,
    type: linkDto.type || "e2s",
  };
}
