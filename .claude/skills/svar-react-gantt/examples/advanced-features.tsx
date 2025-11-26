/**
 * Advanced Features Example
 * 
 * 고급 기능을 포함한 예제:
 * - Lazy loading (동적 데이터 로딩)
 * - Multi-sorting (다중 정렬)
 * - Hotkeys (단축키)
 * - Custom task types (커스텀 작업 타입)
 * - Zoom levels (줌 레벨)
 * - AutoScale (자동 스케일)
 */

import { useState, useCallback, useMemo } from "react";
import { Gantt, Willow, HeaderMenu } from "@svar-ui/react-gantt";
import "@svar-ui/react-gantt/all.css";

export default function AdvancedFeatures() {
  const [tasks, setTasks] = useState(getInitialTasks());
  const [links, setLinks] = useState(getInitialLinks());

  // 커스텀 작업 타입
  const taskTypes = useMemo(() => [
    {
      id: "bug",
      label: "버그",
      color: "#f44336"
    },
    {
      id: "feature",
      label: "기능",
      color: "#4caf50"
    },
    {
      id: "research",
      label: "리서치",
      color: "#2196f3"
    },
    {
      id: "meeting",
      label: "회의",
      color: "#ff9800"
    }
  ], []);

  // 줌 레벨 설정
  const zoom = useMemo(() => ({
    levels: [
      // 레벨 0: 년/월
      [
        { unit: "year", step: 1, format: "yyyy" },
        { unit: "month", step: 1, format: "MMM" }
      ],
      // 레벨 1: 월/주
      [
        { unit: "month", step: 1, format: "MMMM yyyy" },
        { unit: "week", step: 1, format: "w" }
      ],
      // 레벨 2: 월/일 (기본)
      [
        { unit: "month", step: 1, format: "MMMM yyyy" },
        { unit: "day", step: 1, format: "d" }
      ],
      // 레벨 3: 일/시간 (v2.3+)
      [
        { unit: "day", step: 1, format: "d MMM" },
        { unit: "hour", step: 1, format: "HH:mm" }
      ]
    ],
    minCellWidth: 80,
    maxCellWidth: 200
  }), []);

  // 컬럼 설정 (정렬 가능)
  const columns = useMemo(() => [
    {
      id: "text",
      label: "작업",
      width: 200,
      resize: true,
      sort: true
    },
    {
      id: "type",
      label: "타입",
      width: 100,
      align: "center",
      sort: true,
      template: (task) => {
        const typeLabels = {
          bug: "🐛 버그",
          feature: "✨ 기능",
          research: "🔬 리서치",
          meeting: "📅 회의",
          task: "📝 작업"
        };
        return typeLabels[task.type] || task.type;
      }
    },
    {
      id: "start",
      label: "시작일",
      width: 120,
      align: "center",
      sort: true
    },
    {
      id: "duration",
      label: "기간",
      width: 80,
      align: "center",
      sort: true
    },
    {
      id: "progress",
      label: "진행률",
      width: 80,
      align: "center",
      sort: true
    }
  ], []);

  // API 초기화
  const init = useCallback((api) => {
    // Lazy Loading 구현
    api.on("request-data", (ev) => {
      console.log("Requesting child tasks for:", ev.id);
      
      // 서버에서 하위 작업 가져오기 (시뮬레이션)
      setTimeout(() => {
        const childTasks = generateChildTasks(ev.id);
        const childLinks = generateChildLinks(ev.id);
        
        api.exec("provide-data", {
          id: ev.id,
          data: {
            tasks: childTasks,
            links: childLinks
          }
        });
      }, 500);
    });

    // Hotkeys 커스터마이징
    api.on("hotkey", (ev) => {
      console.log("Hotkey pressed:", ev.key);
      
      // Ctrl + S: 저장
      if (ev.key === "ctrl+s") {
        ev.preventDefault();
        handleSave();
      }
      
      // Ctrl + E: 내보내기
      if (ev.key === "ctrl+e") {
        ev.preventDefault();
        handleExport();
      }
      
      // Ctrl + Z: 실행 취소 (커스텀)
      if (ev.key === "ctrl+z") {
        ev.preventDefault();
        handleUndo();
      }
    });

    // Multi-sorting 이벤트
    api.on("sort-tasks", (ev) => {
      console.log("Tasks sorted by:", ev.key, ev.dir);
    });

    // 작업 타입별 검증
    api.intercept("update-task", (data) => {
      const task = api.getTask(data.id);
      
      // 버그는 진행률 100%여야 종료 가능
      if (task.type === "bug" && data.task.progress === 100) {
        if (!confirm("버그 수정이 완료되었습니까?")) {
          data.task.progress = task.progress;
        }
      }
      
      // 회의는 duration이 4시간을 초과할 수 없음
      if (task.type === "meeting" && data.task.duration > 4) {
        alert("회의는 4시간을 초과할 수 없습니다.");
        data.task.duration = 4;
      }
    });

    // 작업 추가 시 기본값 설정
    api.intercept("add-task", (data) => {
      // 기본 타입 설정
      if (!data.task.type) {
        data.task.type = "feature";
      }
      
      // 기본 duration 설정
      if (!data.task.duration) {
        data.task.duration = 1;
      }
    });

    // Scale 확장 이벤트
    api.on("expand-scale", (ev) => {
      console.log("Scale expanded:", ev.direction);
    });

    // Zoom 변경 이벤트
    api.on("zoom-scale", (ev) => {
      console.log("Zoom level:", ev.level);
    });

  }, []);

  // 헬퍼 함수들
  const handleSave = () => {
    console.log("Saving Gantt data...");
    // 서버에 저장 로직
  };

  const handleExport = () => {
    console.log("Exporting Gantt data...");
    // 내보내기 로직
  };

  const handleUndo = () => {
    console.log("Undo last action...");
    // 실행 취소 로직
  };

  return (
    <div>
      <div style={{ marginBottom: "10px", padding: "10px", background: "#f5f5f5" }}>
        <h3>고급 기능 데모</h3>
        <ul style={{ fontSize: "14px", margin: "10px 0" }}>
          <li>📌 Ctrl + 마우스 휠: 줌 인/아웃</li>
          <li>📌 Ctrl + Click (컬럼 헤더): 다중 정렬</li>
          <li>📌 Ctrl + S: 저장 (커스텀 단축키)</li>
          <li>📌 Ctrl + E: 내보내기 (커스텀 단축키)</li>
          <li>📌 Lazy 아이콘(▶️) 클릭: 하위 작업 동적 로드</li>
        </ul>
      </div>

      <div style={{ height: "600px" }}>
        <Willow>
          <HeaderMenu api={null}>
            <Gantt 
              tasks={tasks}
              links={links}
              columns={columns}
              taskTypes={taskTypes}
              zoom={zoom}
              autoScale={true}
              durationUnit="day"
              lengthUnit="hour"
              init={init}
            />
          </HeaderMenu>
        </Willow>
      </div>
    </div>
  );
}

// 초기 작업 데이터
function getInitialTasks() {
  return [
    {
      id: 1,
      text: "버그 수정",
      start: new Date(2024, 0, 1),
      end: new Date(2024, 0, 5),
      duration: 4,
      progress: 100,
      type: "bug"
    },
    {
      id: 2,
      text: "신규 기능 개발",
      start: new Date(2024, 0, 6),
      end: new Date(2024, 0, 20),
      duration: 14,
      progress: 60,
      type: "feature",
      lazy: true,  // 하위 작업 동적 로드
      open: false
    },
    {
      id: 3,
      text: "기술 리서치",
      start: new Date(2024, 0, 21),
      end: new Date(2024, 0, 25),
      duration: 4,
      progress: 30,
      type: "research"
    },
    {
      id: 4,
      text: "주간 회의",
      start: new Date(2024, 0, 8),
      end: new Date(2024, 0, 8),
      duration: 2,
      progress: 0,
      type: "meeting"
    }
  ];
}

function getInitialLinks() {
  return [
    { id: 1, source: 1, target: 2, type: "e2s" }
  ];
}

// 하위 작업 생성 (시뮬레이션)
function generateChildTasks(parentId) {
  return [
    {
      id: `${parentId}-1`,
      text: "UI 디자인",
      start: new Date(2024, 0, 6),
      end: new Date(2024, 0, 10),
      duration: 4,
      progress: 80,
      parent: parentId,
      type: "feature"
    },
    {
      id: `${parentId}-2`,
      text: "API 개발",
      start: new Date(2024, 0, 11),
      end: new Date(2024, 0, 15),
      duration: 4,
      progress: 50,
      parent: parentId,
      type: "feature"
    },
    {
      id: `${parentId}-3`,
      text: "테스트",
      start: new Date(2024, 0, 16),
      end: new Date(2024, 0, 20),
      duration: 4,
      progress: 30,
      parent: parentId,
      type: "feature"
    }
  ];
}

function generateChildLinks(parentId) {
  return [
    { id: `${parentId}-l1`, source: `${parentId}-1`, target: `${parentId}-2`, type: "e2s" },
    { id: `${parentId}-l2`, source: `${parentId}-2`, target: `${parentId}-3`, type: "e2s" }
  ];
}

