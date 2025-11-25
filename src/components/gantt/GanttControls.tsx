"use client";

import type { SaveState, ViewType } from "./types";

interface GanttControlsProps {
  viewType: ViewType;
  onViewTypeChange: (viewType: ViewType) => void;
  showBaselines: boolean;
  onToggleBaselines: () => void;
  onSave: () => void;
  hasChanges: boolean;
  saveState: SaveState;
}

const VIEW_OPTIONS: Array<{ id: ViewType; label: string }> = [
  { id: "day", label: "일" },
  { id: "week", label: "주" },
  { id: "month", label: "월" },
];

export function GanttControls({
  viewType,
  onViewTypeChange,
  showBaselines,
  onToggleBaselines,
  onSave,
  hasChanges,
  saveState,
}: GanttControlsProps) {
  return (
    <div className="p-2 bg-gray-100 flex items-center gap-2 rounded-md mb-2">
      {VIEW_OPTIONS.map((option) => (
        <button
          key={option.id}
          type="button"
          onClick={() => onViewTypeChange(option.id)}
          className={`px-3 py-1 rounded text-sm ${
            viewType === option.id
              ? "bg-blue-500 text-white"
              : "bg-white text-gray-700 border border-gray-300 hover:bg-gray-50"
          }`}
          aria-pressed={viewType === option.id}
        >
          {option.label}
        </button>
      ))}
      <div className="h-6 w-px bg-gray-300 mx-2" />
      <button
        type="button"
        onClick={onToggleBaselines}
        className={`px-3 py-1 rounded text-sm ${
          showBaselines
            ? "bg-gray-700 text-white"
            : "bg-white text-gray-700 border border-gray-300 hover:bg-gray-50"
        }`}
        aria-pressed={showBaselines}
      >
        계획 일정 {showBaselines ? "숨기기" : "표시"}
      </button>
      <div className="flex-1" />
      <button
        type="button"
        onClick={onSave}
        disabled={!hasChanges || saveState === "saving"}
        className={`px-4 py-1 rounded text-sm font-medium transition-colors ${
          !hasChanges || saveState === "saving"
            ? "bg-gray-200 text-gray-400 cursor-not-allowed"
            : "bg-green-600 text-white hover:bg-green-700"
        }`}
        title={`hasChanges: ${hasChanges}, saveState: ${saveState}`}
      >
        {saveState === "saving" ? "저장 중..." : "저장"}
      </button>
      <span className="ml-2 text-sm text-gray-600" role="status">
        {hasChanges && saveState === "idle" && "변경 사항이 있습니다."}
        {saveState === "saved" && "저장되었습니다."}
        {saveState === "error" && "저장 실패."}
      </span>
    </div>
  );
}






