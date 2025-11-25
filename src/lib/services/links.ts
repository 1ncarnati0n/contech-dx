/**
 * Links Service
 * Link CRUD 작업을 담당합니다.
 */

import { createClient } from "@/lib/supabase/client";
import type { Link, LinkType } from "@/lib/gantt/types";
import { getMockLinks } from "./mockStorage";

// Database schema for links (different from storage DTO)
interface LinkRecord {
  id: string;
  gantt_chart_id: string;
  source: string;
  target: string;
  type: string;
}

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

  return (data as LinkRecord[]).map(linkDtoToLink);
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

  const linkDto: Partial<LinkRecord> = {};
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

  return (data as LinkRecord[]).map(linkDtoToLink);
}

/**
 * Convert DTO to Link
 */
function linkDtoToLink(linkDto: LinkRecord): Link {
  return {
    id: linkDto.id,
    source: linkDto.source,
    target: linkDto.target,
    type: (linkDto.type as LinkType) || "e2s",
  };
}

/**
 * Batch upsert links
 */
export async function upsertLinksBatch(
  links: Array<Partial<Link>>,
  ganttChartId: string
): Promise<Link[]> {
  const supabase = createClient();

  const linkDtos = links.map((link) => ({
    id: typeof link.id === "string" && link.id.length > 10 ? link.id : undefined,
    gantt_chart_id: ganttChartId,
    source: String(link.source),
    target: String(link.target),
    type: link.type || "e2s",
  }));

  const { data, error } = await supabase
    .from("links")
    .upsert(linkDtos, { onConflict: "id" })
    .select();

  if (error) {
    console.error("Error upserting links batch:", error);
    throw new Error("Failed to upsert links batch");
  }

  return (data as LinkRecord[]).map(linkDtoToLink);
}

/**
 * Batch delete links
 */
export async function deleteLinksBatch(ids: string[]): Promise<void> {
  if (ids.length === 0) return;

  const supabase = createClient();
  const { error } = await supabase.from("links").delete().in("id", ids);

  if (error) {
    console.error("Error deleting links batch:", error);
    throw new Error("Failed to delete links batch");
  }
}
