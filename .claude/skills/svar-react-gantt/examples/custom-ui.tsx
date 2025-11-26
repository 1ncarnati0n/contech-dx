/**
 * Custom UI Example
 * 
 * 커스텀 컬럼, 에디터, 컨텍스트 메뉴, 툴팁을 포함한
 * 고급 UI 커스터마이징 예제입니다.
 */

import { useState, useCallback } from "react";
import { 
  Gantt, 
  Willow,
  ContextMenu,
  Toolbar,
  Tooltip,
  Editor,
  registerEditorItem
} from "@svar-ui/react-gantt";
import "@svar-ui/react-gantt/all.css";
import "./custom-styles.css";

// 커스텀 에디터 필드 등록
registerEditorItem("priority", {
  type: "select",
  label: "우선순위",
  options: [
    { id: "low", label: "낮음" },
    { id: "medium", label: "보통" },
    { id: "high", label: "높음" },
    { id: "critical", label: "긴급" }
  ],
  validate: (value) => {
    if (!value) return "우선순위를 선택하세요";
    return null;
  }
});

registerEditorItem("assignee", {
  type: "text",
  label: "담당자",
  validate: (value) => {
    if (!value) return "담당자를 지정하세요";
    if (value.length < 2) return "이름이 너무 짧습니다";
    return null;
  }
});

registerEditorItem("estimatedHours", {
  type: "number",
  label: "예상 시간 (h)",
  validate: (value) => {
    if (value < 0) return "시간은 0 이상이어야 합니다";
    if (value > 1000) return "시간이 너무 큽니다";
    return null;
  }
});

export default function CustomUI() {
  const [api, setApi] = useState(null);

  // 확장된 작업 데이터
  const tasks = [
    {
      id: 1,
      text: "프로젝트 시작",
      start: new Date(2024, 0, 1),
      end: new Date(2024, 0, 10),
      duration: 9,
      progress: 100,
      type: "task",
      priority: "high",
      assignee: "김철수",
      estimatedHours: 40,
      status: "completed"
    },
    {
      id: 2,
      text: "디자인",
      start: new Date(2024, 0, 11),
      end: new Date(2024, 0, 20),
      duration: 9,
      progress: 75,
      type: "task",
      priority: "medium",
      assignee: "이영희",
      estimatedHours: 60,
      status: "in-progress"
    },
    {
      id: 3,
      text: "개발",
      start: new Date(2024, 0, 21),
      end: new Date(2024, 1, 15),
      duration: 25,
      progress: 30,
      type: "task",
      priority: "critical",
      assignee: "박민수",
      estimatedHours: 120,
      status: "in-progress"
    }
  ];

  const links = [
    { id: 1, source: 1, target: 2, type: "e2s" },
    { id: 2, source: 2, target: 3, type: "e2s" }
  ];

  // 커스텀 컬럼 설정
  const columns = [
    {
      id: "text",
      label: "작업 이름",
      width: 200,
      resize: true,
      editor: "text"
    },
    {
      id: "assignee",
      label: "담당자",
      width: 100,
      align: "center",
      template: (task) => {
        return task.assignee || "-";
      }
    },
    {
      id: "priority",
      label: "우선순위",
      width: 100,
      align: "center",
      template: (task) => {
        const colors = {
          low: "#4caf50",
          medium: "#ff9800",
          high: "#f44336",
          critical: "#9c27b0"
        };
        const labels = {
          low: "낮음",
          medium: "보통",
          high: "높음",
          critical: "긴급"
        };
        const color = colors[task.priority] || "#999";
        const label = labels[task.priority] || "-";
        return `<span style="color: ${color}; font-weight: bold;">${label}</span>`;
      }
    },
    {
      id: "progress",
      label: "진행률",
      width: 80,
      align: "center",
      template: (task) => {
        const color = task.progress > 50 ? "#4caf50" : "#f44336";
        return `<span style="color: ${color};">${task.progress}%</span>`;
      }
    },
    {
      id: "start",
      label: "시작일",
      width: 120,
      align: "center"
    },
    {
      id: "duration",
      label: "기간",
      width: 80,
      align: "center",
      editor: "number"
    },
    {
      id: "add-task",
      label: "",
      width: 50,
      align: "center"
    }
  ];

  // 커스텀 컨텍스트 메뉴
  const menuOptions = {
    items: [
      { id: "add", text: "작업 추가", icon: "add" },
      { id: "edit", text: "작업 편집", icon: "edit" },
      { id: "separator" },
      { id: "copy", text: "복사", icon: "copy" },
      { id: "paste", text: "붙여넣기", icon: "paste" },
      { id: "separator" },
      { 
        id: "set-priority", 
        text: "우선순위 설정",
        submenu: [
          { id: "priority-low", text: "낮음" },
          { id: "priority-medium", text: "보통" },
          { id: "priority-high", text: "높음" },
          { id: "priority-critical", text: "긴급" }
        ]
      },
      { id: "separator" },
      { id: "delete", text: "삭제", icon: "delete" }
    ]
  };

  // 커스텀 툴팁 템플릿
  const tooltipTemplate = useCallback((task) => {
    const priorityColors = {
      low: "#4caf50",
      medium: "#ff9800",
      high: "#f44336",
      critical: "#9c27b0"
    };
    
    return `
      <div class="custom-tooltip">
        <div class="tooltip-header">
          <strong>${task.text}</strong>
        </div>
        <div class="tooltip-body">
          <div class="tooltip-row">
            <span>담당자:</span>
            <span>${task.assignee || "-"}</span>
          </div>
          <div class="tooltip-row">
            <span>우선순위:</span>
            <span style="color: ${priorityColors[task.priority] || '#999'}">
              ${task.priority || "-"}
            </span>
          </div>
          <div class="tooltip-row">
            <span>진행률:</span>
            <span>${task.progress}%</span>
          </div>
          <div class="tooltip-row">
            <span>예상 시간:</span>
            <span>${task.estimatedHours || 0}시간</span>
          </div>
          <div class="tooltip-row">
            <span>기간:</span>
            <span>${task.duration}일</span>
          </div>
        </div>
      </div>
    `;
  }, []);

  // 커스텀 작업 바 템플릿
  const taskTemplate = useCallback((task) => {
    const priorityColors = {
      low: "#4caf50",
      medium: "#ff9800",
      high: "#f44336",
      critical: "#9c27b0"
    };
    
    const bgColor = priorityColors[task.priority] || "#3983eb";
    
    return `
      <div class="custom-task-bar" style="background-color: ${bgColor}">
        <span class="task-text">${task.text}</span>
        <span class="task-info">${task.assignee || ""}</span>
      </div>
    `;
  }, []);

  const scales = [
    { unit: "month", step: 1, format: "MMMM yyyy" },
    { unit: "day", step: 1, format: "d" }
  ];

  const init = useCallback((api) => {
    setApi(api);

    // 커스텀 메뉴 핸들러
    api.on("menu-click", (ev) => {
      if (ev.id.startsWith("priority-")) {
        const priority = ev.id.replace("priority-", "");
        api.exec("update-task", {
          id: ev.taskId,
          task: { priority }
        });
      }
    });

    // 상태별 색상 적용
    api.intercept("update-task", (data) => {
      const task = api.getTask(data.id);
      
      // 진행률 100%면 상태를 completed로
      if (data.task.progress === 100) {
        data.task.status = "completed";
      } else if (data.task.progress > 0) {
        data.task.status = "in-progress";
      }
    });
  }, []);

  return (
    <div style={{ height: "600px" }}>
      <Willow>
        <ContextMenu api={api} options={menuOptions}>
          <Toolbar api={api}>
            <Tooltip api={api} template={tooltipTemplate}>
              <Editor api={api}>
                <Gantt 
                  tasks={tasks}
                  links={links}
                  columns={columns}
                  scales={scales}
                  taskTemplate={taskTemplate}
                  init={init}
                />
              </Editor>
            </Tooltip>
          </Toolbar>
        </ContextMenu>
      </Willow>
    </div>
  );
}

