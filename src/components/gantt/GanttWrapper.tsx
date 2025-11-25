"use client";

import dynamic from "next/dynamic";

const GanttChart = dynamic(() => import("./GanttChart").then((mod) => mod.GanttChart), {
  ssr: false,
  loading: () => <div className="flex h-full items-center justify-center">Loading Gantt Chart...</div>,
});

export function GanttWrapper() {
  return <GanttChart />;
}






