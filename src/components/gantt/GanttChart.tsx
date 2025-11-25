"use client";

import { useState, useCallback } from "react";
import {
  Editor,
  Toolbar,
  ContextMenu,
  Tooltip,
  defaultToolbarButtons,
} from "@svar-ui/react-gantt";
import "@/styles/svar-gantt-fixed.css";
import "@/styles/gantt.css";

import { GanttControls } from "./GanttControls";
import { WillowTheme } from "./WillowTheme";
import { editorItems } from "./editorItems";
import TaskTooltip from "./TaskTooltip";
import { useGanttSchedule } from "./useGanttSchedule";
import type { ViewType } from "./types";
import type { Task, Link } from "@/lib/gantt/types";
import { GanttCore } from "./GanttChart/GanttCore";

interface GanttChartProps {
  ganttChartId: string;
  tasks?: Task[];
  links?: Link[];
  scales?: any[];
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  onGanttReady?: (api: any) => void;
}

/**
 * GanttChart 메인 컴포넌트
 * 데이터 로딩, 상태 관리, UI 조합을 담당
 */
export function GanttChart({
  ganttChartId,
  tasks,
  links,
  scales: _scales,
  onGanttReady
}: GanttChartProps) {
  const [viewType, setViewType] = useState<ViewType>("day");
  const [showBaselines, setShowBaselines] = useState(false);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const [ganttApi, setGanttApi] = useState<any | null>(null);

  const {
    schedule,
    isLoading,
    saveState,
    hasChanges,
    handleSave,
    initGantt,
  } = useGanttSchedule(ganttChartId);

  // API 초기화 핸들러
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const handleInit = useCallback((api: any) => {
    initGantt(api);
    setGanttApi(api);
    if (onGanttReady) {
      onGanttReady(api);
    }
  }, [initGantt, onGanttReady]);

  // Props 사용 (unused-vars 방지)
  if (tasks || links || _scales) {
    // TODO: Implement data injection from props
  }

  // Toolbar 버튼 설정 - 한글화
  const toolbarItems = defaultToolbarButtons.map((button) => {
    const translations: Record<string, string> = {
      "add-task": "새 작업",
      "edit-task": "편집",
      "delete-task": "삭제",
      "move-task:up": "위로 이동",
      "move-task:down": "아래로 이동",
      "copy-task": "복사",
      "cut-task": "잘라내기",
      "paste-task": "붙여넣기",
      "indent-task:add": "들여쓰기",
      "indent-task:remove": "내어쓰기",
    };

    const text = button.id ? translations[button.id] : undefined;
    return text ? { ...button, text } : button;
  });

  // Editor topBar 설정
  const editorTopBar = {
    items: [
      { comp: "button", text: "닫기", id: "close" },
      { comp: "spacer", icon: "", id: "spacer" },
      { comp: "button", type: "danger", text: "삭제", id: "delete" },
      { comp: "button", type: "primary", text: "저장", id: "save" },
    ],
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
  } as any;

  return (
    <section className="flex flex-col h-full">
      <GanttControls
        viewType={viewType}
        onViewTypeChange={setViewType}
        showBaselines={showBaselines}
        onToggleBaselines={() => setShowBaselines((prev) => !prev)}
        onSave={() => { void handleSave(); }}
        hasChanges={hasChanges}
        saveState={saveState}
      />

      {ganttApi && <Toolbar api={ganttApi} items={toolbarItems} />}

      <div className="gantt-wrapper flex-1 relative" role="group" aria-label="프로젝트 간트 차트">
        {isLoading ? (
          <div className="absolute inset-0 flex items-center justify-center bg-white dark:bg-gray-900 bg-opacity-80 z-50">
            <div className="text-center">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
              <p className="text-gray-700 dark:text-gray-300">데이터를 불러오는 중...</p>
            </div>
          </div>
        ) : !schedule || !Array.isArray(schedule.tasks) || !Array.isArray(schedule.links) ? (
          <div className="absolute inset-0 flex items-center justify-center bg-gray-50 dark:bg-gray-900">
            <div className="text-center text-gray-600 dark:text-gray-400">
              <p>스케줄 데이터를 초기화하는 중...</p>
            </div>
          </div>
        ) : schedule.tasks.length === 0 && schedule.links.length === 0 ? (
          <div className="absolute inset-0 flex items-center justify-center bg-gray-50 dark:bg-gray-900">
            <div className="text-center text-gray-600 dark:text-gray-400">
              <p className="text-lg font-medium mb-2">작업 데이터가 없습니다</p>
              <p className="text-sm">샘플 데이터가 자동으로 생성됩니다...</p>
            </div>
          </div>
        ) : (
          <>
            <ContextMenu api={ganttApi}>
              <WillowTheme>
                <Tooltip api={ganttApi ?? undefined} content={TaskTooltip}>
                  <GanttCore
                    schedule={schedule}
                    viewType={viewType}
                    showBaselines={showBaselines}
                    onApiReady={handleInit}
                  />
                </Tooltip>
              </WillowTheme>
            </ContextMenu>
            {ganttApi && (
              <Editor
                api={ganttApi}
                items={editorItems}
                topBar={editorTopBar}
              />
            )}
          </>
        )}
      </div>
    </section>
  );
}
