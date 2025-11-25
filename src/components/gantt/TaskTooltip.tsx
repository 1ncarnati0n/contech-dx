"use client";

import type { FC } from "react";

interface TaskTooltipProps {
  data?: Record<string, unknown>;
}

const dateFormatter = new Intl.DateTimeFormat("ko-KR", {
  year: "numeric",
  month: "2-digit",
  day: "2-digit",
});

const formatDate = (value: unknown): string => {
  const date = value instanceof Date ? value : new Date(value as string | number);
  return Number.isNaN(date.getTime()) ? "-" : dateFormatter.format(date);
};

const TaskTooltip: FC<TaskTooltipProps> = ({ data }) => {
  if (!data) {
    return null;
  }

  const isMilestone = data.type === "milestone";
  const progress =
    typeof data.progress === "number" && Number.isFinite(data.progress)
      ? `${Math.round(data.progress)}%`
      : null;
  const exclusiveEnd = data.end instanceof Date ? data.end : data.end ? new Date(data.end as string) : undefined;
  const startDate = data.start instanceof Date ? data.start : data.start ? new Date(data.start as string) : undefined;
  let inclusiveEnd: Date | undefined;
  if (exclusiveEnd && !Number.isNaN(exclusiveEnd.getTime())) {
    inclusiveEnd = new Date(exclusiveEnd.getTime() - 24 * 60 * 60 * 1000);
    if (startDate && !Number.isNaN(startDate.getTime()) && inclusiveEnd < startDate) {
      inclusiveEnd = new Date(startDate);
    }
  }

  return (
    <div className="wx-task-tooltip">
      <div className="tooltip-header">
        {String(data.text ?? "작업 상세")}
      </div>

      <div className="tooltip-row">
        <span className="tooltip-label">유형</span>
        <span className="tooltip-value">{String(data.type ?? "일반")}</span>
      </div>

      <div className="tooltip-row">
        <span className="tooltip-label">기간</span>
        <span className="tooltip-value">
          {formatDate(data.start)} ~ {isMilestone ? "" : formatDate(inclusiveEnd)}
        </span>
      </div>

      {progress && (
        <div className="tooltip-row">
          <span className="tooltip-label">진행률</span>
          <span className="tooltip-value" style={{ color: "var(--color-primary)" }}>
            {progress}
          </span>
        </div>
      )}

      {/* 담당자 정보가 있다면 표시 (예시) */}
      {!!data.assigned && (
        <div className="tooltip-row">
          <span className="tooltip-label">담당자</span>
          <span className="tooltip-value">{String(data.assigned)}</span>
        </div>
      )}
    </div>
  );
};

export default TaskTooltip;

