"use client";

import dynamic from "next/dynamic";

import type { Task, Link } from "@/lib/gantt/types";

interface GanttWrapperProps {
  ganttChartId: string;
  tasks?: Task[];
  links?: Link[];
  scales?: any[];
  onGanttReady?: (api: any) => void;
}

const GanttChart = dynamic(() => import("./GanttChart").then((mod) => mod.GanttChart), {
  ssr: false,
  loading: () => <div className="flex h-full items-center justify-center">Loading Gantt Chart...</div>,
});

export function GanttWrapper(props: GanttWrapperProps) {
  return <GanttChart {...props} />;
}






