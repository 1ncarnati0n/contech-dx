---
name: svar-react-gantt
description: SVAR React Gantt v2.3.3 전문 스킬. 프로젝트 관리, 간트 차트, 작업 스케줄링, 의존성 관리, 타임라인 시각화를 구현할 때 사용합니다. TypeScript 지원, REST API 연동, 커스텀 에디터, 동적 데이터 로딩 등 프로덕션급 간트 차트 기능을 제공합니다.
license: GNU GPLv3
---

# SVAR React Gantt Expert Skill (v2.3.3)

SVAR React Gantt는 TypeScript를 완벽 지원하는 프로덕션 레디 React 컴포넌트로, 프로젝트 관리와 작업 스케줄링을 위한 포괄적인 기능을 제공합니다.

## 언제 이 스킬을 사용하나요?

다음과 같은 경우에 이 스킬이 자동으로 활성화됩니다:

- 프로젝트 관리 또는 스케줄링 애플리케이션 구축
- 작업 의존성이 있는 간트 차트 구현
- 드래그 앤 드롭 기능의 인터랙티브 타임라인 제작
- 작업 타입, 마일스톤, 요약 작업 설정
- REST API와 간트 차트 통합
- 스케일, 컬럼, 툴팁, 컨텍스트 메뉴 커스터마이징
- 프로젝트 뷰에서 역할 기반 권한 구현
- SVAR Gantt 설정 문제 해결
- 대규모 데이터셋의 동적 로딩 구현

## Version 2.3.3 주요 변경사항

**v2.3에서 추가된 기능:**
- ✅ TypeScript 타입 정의 내장
- ✅ `hour` duration unit 지원
- ✅ `minute` length unit 지원
- ✅ 커스텀 scale unit 생성 가능
- ✅ `autoScale` property로 scale 자동 조정
- ✅ Standalone Editor (sidebar/modal)
- ✅ Editor 필드 검증 기능
- ✅ Hotkeys (단축키) 지원
- ✅ Multi-sorting (다중 정렬)
- ✅ Header menu로 컬럼 숨기기
- ✅ Inline editors for table cells
- ✅ Grid/Chart 영역 확장/축소 버튼

**Breaking Change:**
- 패키지명이 `wx-react-gantt`에서 `@svar-ui/react-gantt`로 변경

## Quick Start

### 설치

```bash
npm install @svar-ui/react-gantt

# 또는 yarn
yarn add @svar-ui/react-gantt
```

### 기본 구현

```tsx
import { Gantt, Willow } from "@svar-ui/react-gantt";
import "@svar-ui/react-gantt/all.css";

const tasks = [
  {
    id: 1,
    text: "프로젝트 킥오프",
    start: new Date(2024, 5, 1),
    end: new Date(2024, 5, 15),
    duration: 14,
    progress: 50,
    type: "task",
  },
  {
    id: 2,
    text: "디자인 단계",
    start: new Date(2024, 5, 16),
    end: new Date(2024, 6, 1),
    duration: 15,
    progress: 30,
    parent: 1,
    type: "summary",
  }
];

const links = [
  { id: 1, source: 1, target: 2, type: "e2s" }
];

const scales = [
  { unit: "month", step: 1, format: "MMMM yyyy" },
  { unit: "day", step: 1, format: "d" },
];

export default function App() {
  return (
    <Willow>
      <Gantt 
        tasks={tasks} 
        links={links} 
        scales={scales}
      />
    </Willow>
  );
}
```

## Core Architecture

### 세 가지 주요 컴포넌트

**1. Grid Area (Tasks Tree)**
- 작업 계층 구조 표시
- 작업 상세 정보 (이름, 시작일, 기간) 표시
- 작업 관리를 위한 액션 버튼 제공

**2. Chart Area**
- 타임스케일 시각화
- 드래그 앤 드롭 가능한 작업 바
- 작업 간 의존성 링크
- 진행률 표시

**3. Editor & Context Menu**
- 우클릭 컨텍스트 메뉴
- 상세 작업 편집을 위한 모달 에디터
- 커스터마이징 가능한 폼과 다이얼로그

### Task Types (작업 타입)

**내장 타입:**
- **task** - 기본 작업 (파란색 직사각형 바)
- **milestone** - 마일스톤 (다이아몬드 모양, duration 없음)
- **summary** - 요약 작업 (녹색 바, 하위 작업 그룹화)

**커스텀 타입 생성:**
```tsx
const taskTypes = [
  {
    id: "custom",
    label: "커스텀 타입",
    color: "#FF5733"
  }
];

<Gantt taskTypes={taskTypes} />
```

### Link Types (의존성 타입)

4가지 의존성 링크 지원:
- **e2s** (End-to-Start): A 종료 → B 시작
- **s2s** (Start-to-Start): A 시작 → B 시작
- **e2e** (End-to-End): A 종료 → B 종료
- **s2e** (Start-to-End): A 시작 → B 종료

## API 접근 및 메서드

### API 접근 방법

```tsx
import { useCallback } from "react";

const init = useCallback((api) => {
  // API 사용 가능
  console.log(api.getState());
}, []);

<Gantt init={init} />
```

### 핵심 API 메서드

**api.exec()** - 액션 실행
```tsx
api.exec("add-task", {
  task: { 
    id: 3, 
    text: "새 작업",
    start: new Date(),
    end: new Date(),
    type: "task"
  }
});
```

**api.on()** - 이벤트 리스닝
```tsx
api.on("update-task", (ev) => {
  console.log("작업 업데이트됨:", ev);
});
```

**api.intercept()** - 액션 가로채기/수정
```tsx
api.intercept("delete-task", (data) => {
  if (!confirm("정말 삭제하시겠습니까?")) {
    return false; // 액션 취소
  }
});
```

**api.getState()** - 현재 상태 조회
```tsx
const state = api.getState();
console.log(state.tasks, state.links);
```

**api.getTask(id)** - 특정 작업 조회
```tsx
const task = api.getTask(5);
console.log(task.text, task.progress);
```

**api.getStores()** - 데이터 스토어 접근
```tsx
const { tasks, links } = api.getStores();
tasks.add({ 
  id: 10, 
  text: "새 작업",
  start: new Date(),
  end: new Date(),
  type: "task"
});
```

**api.getReactiveState()** - Reactive 상태 객체 조회
```tsx
const reactiveState = api.getReactiveState();
// reactive properties 접근
```

**api.setNext()** - Event Bus에 핸들러 추가
```tsx
api.setNext(restDataProvider); // 백엔드 연동
```

**api.detach()** - 이벤트 핸들러 제거
```tsx
const detach = api.on("update-task", handler);
detach(); // 리스너 제거
```

## Backend Integration (백엔드 연동)

### RestDataProvider 설정

```bash
npm install @svar-ui/gantt-data-provider
```

```tsx
import { useState, useEffect, useCallback } from "react";
import { Gantt } from "@svar-ui/react-gantt";
import { RestDataProvider } from "@svar-ui/gantt-data-provider";

const server = new RestDataProvider("https://api.example.com");

function App() {
  const [tasks, setTasks] = useState([]);
  const [links, setLinks] = useState([]);

  useEffect(() => {
    server.getData().then(data => {
      setTasks(data.tasks);
      setLinks(data.links);
    });
  }, []);

  const init = useCallback((api) => {
    api.setNext(server); // 자동 백엔드 동기화
  }, []);

  return <Gantt tasks={tasks} links={links} init={init} />;
}
```

### Batch Mode (대량 작업 최적화)

여러 API 호출을 하나의 HTTP 요청으로 묶어서 전송:

```tsx
const server = new RestDataProvider(
  "https://api.example.com",
  { batchURL: "batch" }
);
```

### 백엔드 REST 엔드포인트

RestDataProvider가 예상하는 엔드포인트:

**Tasks:**
- `GET /tasks` - 작업 목록 조회
- `POST /tasks` - 작업 생성
- `PUT /tasks/:id` - 작업 수정
- `DELETE /tasks/:id` - 작업 삭제

**Links:**
- `GET /links` - 링크 목록 조회
- `POST /links` - 링크 생성
- `PUT /links/:id` - 링크 수정
- `DELETE /links/:id` - 링크 삭제

**Batch (선택사항):**
- `POST /batch` - 배치 요청 처리

## Configuration (설정)

### Scales (타임스케일) - v2.3 업데이트

```tsx
const scales = [
  { unit: "year", step: 1, format: "yyyy" },
  { unit: "month", step: 1, format: "MMMM" },
  { unit: "day", step: 1, format: "d" }
];

<Gantt scales={scales} />
```

**사용 가능한 Units:** minute, hour, day, week, month, quarter, year

**v2.3 신규:** 커스텀 scale unit 생성 가능 - `registerScaleUnit()` 사용

### AutoScale (v2.3 신규)

```tsx
<Gantt autoScale={true} />
// 타임스케일이 자동으로 start/end 날짜 조정
```

### Columns (그리드 컬럼)

```tsx
const columns = [
  {
    id: "text",
    label: "작업 이름",
    width: 250,
    resize: true,
    sort: true // v1.1+ 정렬 가능
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
    editor: "number" // v2.3+ inline editor
  }
];

<Gantt columns={columns} />
```

### Cell Sizes

```tsx
<Gantt 
  cellWidth={100}
  cellHeight={40}
  scaleHeight={50}
/>
```

### Duration Unit (v2.3 신규)

```tsx
<Gantt durationUnit="hour" />
// "day" (기본) 또는 "hour"
```

### Length Unit (v2.3 신규)

```tsx
<Gantt lengthUnit="minute" />
// minute, hour, day, week, month, quarter, year
```

### Cell Borders

```tsx
<Gantt cellBorders="full" />
// "none", "vertical", "horizontal", "full"
```

### Zoom Levels

```tsx
const zoom = {
  levels: [
    [
      { unit: "year", step: 1, format: "yyyy" },
      { unit: "month", step: 1, format: "MMMM" }
    ],
    [
      { unit: "month", step: 1, format: "MMMM yyyy" },
      { unit: "day", step: 1, format: "d" }
    ],
    [
      { unit: "day", step: 1, format: "d MMM" },
      { unit: "hour", step: 1, format: "HH" }
    ]
  ],
  minCellWidth: 100, // v1.1+
  maxCellWidth: 200  // v1.1+
};

<Gantt zoom={zoom} />
```

### Readonly Mode

```tsx
<Gantt readonly={true} />
```

### Highlight Time Ranges

```tsx
const highlightTime = [
  { 
    from: new Date(2024, 5, 1), 
    to: new Date(2024, 5, 7) 
  } // 주말 강조
];

<Gantt highlightTime={highlightTime} />
```

### Selected Tasks

```tsx
const selected = [1, 2, 3]; // 선택된 작업 ID들

<Gantt selected={selected} />
```

### Active Task (Editor 열린 작업)

```tsx
const [activeTask, setActiveTask] = useState(null);

<Gantt 
  activeTask={activeTask}
  onUpdate={(ev) => {
    if (ev.action === "open-editor") {
      setActiveTask(ev.id);
    }
  }}
/>
```

## Customization (커스터마이징)

### Custom Task Template

```tsx
const taskTemplate = (task) => {
  return `
    <div class="custom-task">
      <span>${task.text}</span>
      <span>${task.progress}%</span>
    </div>
  `;
};

<Gantt taskTemplate={taskTemplate} />
```

### Custom Tooltip

```tsx
import { Tooltip } from "@svar-ui/react-gantt";

<Tooltip api={api}>
  <Gantt init={init} />
</Tooltip>
```

### Custom Context Menu

```tsx
import { ContextMenu } from "@svar-ui/react-gantt";

const menuOptions = {
  items: [
    { id: "add", text: "작업 추가" },
    { id: "edit", text: "작업 편집" },
    { id: "delete", text: "작업 삭제" }
  ]
};

<ContextMenu api={api} options={menuOptions}>
  <Gantt init={init} />
</ContextMenu>
```

### Custom Toolbar

```tsx
import { Toolbar } from "@svar-ui/react-gantt";

<Toolbar api={api}>
  <Gantt init={init} />
</Toolbar>
```

### Editor (v2.3 업데이트)

```tsx
import { Editor, registerEditorItem } from "@svar-ui/react-gantt";

// 커스텀 필드 추가
registerEditorItem("priority", {
  type: "select",
  label: "우선순위",
  options: [
    { id: "high", label: "높음" },
    { id: "medium", label: "보통" },
    { id: "low", label: "낮음" }
  ],
  validate: (value) => {
    if (!value) return "우선순위를 선택하세요";
    return null;
  }
});

<Editor api={api}>
  <Gantt init={init} />
</Editor>
```

### Fullscreen Mode

```tsx
import { Fullscreen } from "@svar-ui/react-gantt";

<Fullscreen api={api}>
  <Gantt init={init} />
</Fullscreen>
```

## Advanced Features (고급 기능)

### Dynamic Task Loading (Lazy Loading)

```tsx
const tasks = [
  {
    id: 1,
    text: "부모 작업",
    lazy: true, // 하위 작업 동적 로드
    open: false,
    type: "summary"
  }
];

const init = useCallback((api) => {
  // request-data 액션 리스닝
  api.on("request-data", (ev) => {
    // 서버에서 하위 작업 조회
    fetch(`/api/tasks/${ev.id}/children`)
      .then(res => res.json())
      .then(({ tasks, links }) => {
        api.exec("provide-data", {
          id: ev.id,
          data: { tasks, links }
        });
      });
  });
}, []);

<Gantt tasks={tasks} init={init} />
```

### Multi-Sorting (v2.3 신규)

```tsx
// Ctrl + 클릭으로 다중 컬럼 정렬
// 또는 프로그래매틱하게:
api.exec("sort-tasks", {
  key: ["start", "progress"],
  dir: ["asc", "desc"]
});
```

### Hotkeys (v2.3 신규)

**내장 단축키:**
- **Arrow Up/Down**: 작업 간 이동
- **Arrow Left/Right**: 셀 간 이동  
- **Ctrl + C**: 복사
- **Ctrl + X**: 잘라내기
- **Ctrl + V**: 붙여넣기
- **Ctrl + D / Backspace**: 삭제
- **Enter**: 셀 액션 실행

**커스텀 단축키:**
```tsx
api.on("hotkey", (ev) => {
  if (ev.key === "ctrl+s") {
    // 저장 로직
    ev.preventDefault();
  }
});
```

### Header Menu (v2.3 신규)

컬럼 숨기기/표시하기 기능:

```tsx
import { HeaderMenu } from "@svar-ui/react-gantt";

<HeaderMenu api={api}>
  <Gantt init={init} />
</HeaderMenu>
```

### Inline Editors (v2.3 신규)

```tsx
const columns = [
  {
    id: "text",
    label: "작업명",
    editor: "text" // 인라인 편집 가능
  },
  {
    id: "duration",
    label: "기간",
    editor: "number"
  }
];
```

### Expand/Collapse Grid & Chart (v2.3 신규)

UI 버튼으로 Grid와 Chart 영역 확장/축소 가능 (자동 제공)

## Data Structure (데이터 구조)

### Task Object

```tsx
interface Task {
  id: number | string;
  text: string;
  start: Date;
  end?: Date;
  duration?: number;
  progress?: number;
  type?: "task" | "milestone" | "summary" | string;
  parent?: number | string;
  open?: boolean;
  lazy?: boolean;
  [key: string]: any; // 커스텀 필드
}
```

### Link Object

```tsx
interface Link {
  id: number | string;
  source: number | string;
  target: number | string;
  type: "e2s" | "s2s" | "e2e" | "s2e";
}
```

### Scale Object

```tsx
interface Scale {
  unit: "minute" | "hour" | "day" | "week" | "month" | "quarter" | "year";
  step: number;
  format: string;
  css?: (date: Date) => string;
}
```

### Column Object

```tsx
interface Column {
  id: string;
  label?: string;
  width?: number;
  flexgrow?: number;
  align?: "left" | "center" | "right";
  resize?: boolean;
  sort?: boolean; // v1.1+
  editor?: "text" | "number" | "date"; // v2.3+
  template?: (task: Task) => string;
}
```

## Theming & Styling

### 내장 테마

```tsx
import { Gantt, Willow, WillowDark } from "@svar-ui/react-gantt";

// Light theme
<Willow>
  <Gantt tasks={tasks} />
</Willow>

// Dark theme
<WillowDark>
  <Gantt tasks={tasks} />
</WillowDark>

// 폰트 비활성화
<Willow fonts={false}>
  <Gantt tasks={tasks} />
</Willow>
```

### CSS Variables

```css
:root {
  /* Task colors */
  --wx-gantt-task-color: #3983eb;
  --wx-gantt-task-font-color: #fff;
  --wx-gantt-project-color: #00ba94;
  --wx-gantt-milestone-color: #ad44ab;
  
  /* Borders */
  --wx-gantt-border: 1px solid #1d1e261a;
  --wx-gantt-bar-border-radius: 3px;
  
  /* Grid */
  --wx-grid-header-font-color: #333;
  --wx-grid-body-font-color: #666;
  
  /* Scale */
  --wx-timescale-font-color: #333;
  --wx-gantt-holiday-background: #f0f6fa;
  
  /* Links */
  --wx-gantt-link-color: #9fa1ae;
  --wx-gantt-select-color: #eaedf5;
}
```

### 커스텀 스타일링

```tsx
<div className="custom-gantt-wrapper">
  <Gantt tasks={tasks} />
</div>
```

```css
.custom-gantt-wrapper {
  --wx-gantt-task-color: #ff6b6b;
  --wx-gantt-project-color: #4ecdc4;
  --wx-gantt-milestone-color: #ffe66d;
}
```

## Actions (액션 목록)

**Task Actions:**
- `add-task` - 작업 추가
- `update-task` - 작업 수정
- `delete-task` - 작업 삭제
- `copy-task` - 작업 복사
- `move-task` - 작업 이동
- `indent-task` - 작업 들여쓰기
- `drag-task` - 작업 드래그
- `open-task` - 작업 브랜치 확장
- `select-task` - 작업 선택
- `sort-tasks` - 작업 정렬

**Link Actions:**
- `add-link` - 링크 추가
- `update-link` - 링크 수정
- `delete-link` - 링크 삭제

**Scale Actions:**
- `expand-scale` - 스케일 확장
- `zoom-scale` - 스케일 줌
- `scroll-chart` - 차트 스크롤

**Data Actions:**
- `provide-data` - 데이터 제공 (lazy loading)
- `request-data` - 데이터 요청
- `render-data` - 데이터 렌더링

**Editor Actions:**
- `show-editor` - 에디터 열기 (v2.3+)

**Keyboard Actions:**
- `hotkey` - 단축키 실행 (v2.3+)

## Common Use Cases (일반적인 사용 사례)

### 프로젝트 관리 대시보드

```tsx
function ProjectDashboard() {
  const [tasks, setTasks] = useState([]);
  const [filter, setFilter] = useState("all");

  const filteredTasks = useMemo(() => {
    if (filter === "active") return tasks.filter(t => t.progress < 100);
    if (filter === "completed") return tasks.filter(t => t.progress === 100);
    return tasks;
  }, [tasks, filter]);

  return (
    <div>
      <FilterBar onFilterChange={setFilter} />
      <Gantt tasks={filteredTasks} />
    </div>
  );
}
```

### 리소스 할당 뷰

```tsx
interface TaskWithResources extends Task {
  assignee?: string;
  resources?: string[];
}

const columns = [
  { id: "text", label: "작업" },
  { id: "assignee", label: "담당자" },
  { 
    id: "resources", 
    label: "리소스",
    template: (task: TaskWithResources) => {
      return task.resources?.join(", ") || "";
    }
  }
];
```

### Critical Path 강조

```tsx
const init = useCallback((api) => {
  api.intercept("update-task", (data) => {
    // Critical path 계산 로직
    const isCritical = calculateCriticalPath(data.task);
    if (isCritical) {
      data.task.color = "#FF0000";
    }
  });
}, []);
```

### 실시간 협업 기능

```tsx
const init = useCallback((api) => {
  // WebSocket 연결
  const ws = new WebSocket("wss://api.example.com/gantt");
  
  ws.onmessage = (event) => {
    const update = JSON.parse(event.data);
    api.exec("update-task", update);
  };
  
  api.on("update-task", (ev) => {
    // 다른 사용자에게 업데이트 전송
    ws.send(JSON.stringify(ev));
  });
}, []);
```

## Troubleshooting (문제 해결)

### Issue: 작업이 렌더링되지 않음

**원인**: 날짜 형식 또는 데이터 구조 문제

**해결책**:
```tsx
// ❌ 잘못된 예
const tasks = [{ start: "2024-01-01", end: "2024-01-15" }];

// ✅ 올바른 예
const tasks = [{
  id: 1,
  text: "작업",
  start: new Date(2024, 0, 1),
  end: new Date(2024, 0, 15),
  type: "task"
}];
```

### Issue: 링크가 표시되지 않음

**원인**: source/target ID 불일치

**해결책**:
```tsx
// link의 source와 target은 존재하는 task의 id여야 함
const links = [
  { id: 1, source: 1, target: 2, type: "e2s" }
];
```

### Issue: API 메서드가 작동하지 않음

**원인**: init 콜백 누락

**해결책**:
```tsx
const init = useCallback((api) => {
  // API는 init 콜백 내에서만 사용 가능
  api.on("update-task", handler);
}, []); // dependency 배열 주의

<Gantt init={init} />
```

### Issue: RestDataProvider 동기화 안됨

**원인**: api.setNext() 호출 누락

**해결책**:
```tsx
const init = useCallback((api) => {
  api.setNext(server); // 필수!
}, []);
```

### Issue: 대규모 데이터셋 성능 문제

**해결책**:
1. Lazy loading 사용
2. Batch mode 활성화
3. React.memo, useMemo 활용

```tsx
const MemoizedGantt = React.memo(Gantt);

const scales = useMemo(() => [
  { unit: "month", step: 1, format: "MMMM yyyy" },
  { unit: "day", step: 1, format: "d" }
], []);
```

### Issue: v1.x에서 v2.3 마이그레이션

**변경사항**:
```tsx
// ❌ v1.x
import { Gantt } from "wx-react-gantt";

// ✅ v2.3
import { Gantt } from "@svar-ui/react-gantt";
```

## Best Practices (모범 사례)

### 1. State Management

```tsx
// ✅ 권장: 상태를 App 레벨에서 관리
const [tasks, setTasks] = useState([]);
const [links, setLinks] = useState([]);

// React state와 Gantt 동기화
const init = useCallback((api) => {
  api.on("update-task", (ev) => {
    setTasks(prevTasks => 
      prevTasks.map(t => 
        t.id === ev.id ? { ...t, ...ev.task } : t
      )
    );
  });
}, []);
```

### 2. Error Handling

```tsx
api.intercept("delete-task", (data) => {
  try {
    if (hasChildren(data.id)) {
      throw new Error("하위 작업이 있는 작업은 삭제할 수 없습니다");
    }
  } catch (error) {
    alert(error.message);
    return false; // 액션 취소
  }
});
```

### 3. TypeScript Support

```tsx
import { Gantt } from "@svar-ui/react-gantt";

interface CustomTask {
  id: number;
  text: string;
  start: Date;
  end: Date;
  type: "task" | "milestone" | "summary";
  assignee?: string;
  priority?: "high" | "medium" | "low";
}

const tasks: CustomTask[] = [
  {
    id: 1,
    text: "작업",
    start: new Date(),
    end: new Date(),
    type: "task",
    assignee: "홍길동",
    priority: "high"
  }
];
```

### 4. Performance Optimization

```tsx
// useMemo로 불필요한 재계산 방지
const scales = useMemo(() => [
  { unit: "month", step: 1, format: "MMMM yyyy" },
  { unit: "day", step: 1, format: "d" }
], []);

// useCallback으로 함수 참조 안정화
const init = useCallback((api) => {
  api.on("update-task", handleUpdate);
}, [handleUpdate]);

// React.memo로 불필요한 리렌더링 방지
const MemoizedGantt = React.memo(Gantt);
```

### 5. Cleanup

```tsx
const init = useCallback((api) => {
  const unsubscribe = api.on("update-task", handler);
  
  // Cleanup
  return () => {
    unsubscribe();
  };
}, []);
```

## Localization (한국어 지원)

```tsx
const locale = {
  // Actions
  "Add": "추가",
  "Edit": "편집",
  "Delete": "삭제",
  "Copy": "복사",
  "Paste": "붙여넣기",
  
  // Fields
  "Task name": "작업 이름",
  "Start date": "시작일",
  "End date": "종료일",
  "Duration": "기간",
  "Progress": "진행률",
  "Type": "타입",
  "Predecessors": "선행 작업",
  "Successors": "후속 작업",
  
  // Types
  "Task": "작업",
  "Milestone": "마일스톤",
  "Summary": "요약",
  
  // Buttons
  "Save": "저장",
  "Cancel": "취소",
};

<Gantt locale={locale} />
```

## Quick Reference Card

**설치**:
```bash
npm install @svar-ui/react-gantt
```

**기본 구성**:
```tsx
import { Gantt, Willow } from "@svar-ui/react-gantt";
import "@svar-ui/react-gantt/all.css";

<Willow><Gantt /></Willow>
```

**API 접근**:
```tsx
const init = useCallback((api) => { ... }, []);
<Gantt init={init} />
```

**작업 타입**: task, milestone, summary

**링크 타입**: e2s, s2s, e2e, s2e

**주요 Props**:
- `tasks` - 작업 배열
- `links` - 링크 배열
- `scales` - 타임스케일 설정
- `columns` - 컬럼 설정
- `readonly` - 읽기 전용 모드
- `zoom` - 줌 설정
- `autoScale` - 자동 스케일 (v2.3+)
- `durationUnit` - 기간 단위 (v2.3+)
- `lengthUnit` - 길이 단위 (v2.3+)

**핵심 API 메서드**:
- `api.exec()` - 액션 실행
- `api.on()` - 이벤트 리스닝
- `api.intercept()` - 액션 가로채기
- `api.getState()` - 상태 조회
- `api.getTask(id)` - 작업 조회
- `api.setNext()` - 백엔드 연결
- `api.getStores()` - 스토어 접근 (v2.3+)
- `api.detach()` - 핸들러 제거

**헬퍼 컴포넌트**:
- `RestDataProvider` - 백엔드 연동
- `ContextMenu` - 컨텍스트 메뉴
- `Toolbar` - 툴바
- `Tooltip` - 툴팁
- `Editor` - 에디터 (v2.3+)
- `Fullscreen` - 전체화면
- `HeaderMenu` - 헤더 메뉴 (v2.3+)

**v2.3 신규 기능**:
- TypeScript 지원
- Hour duration unit
- Minute length unit
- AutoScale property
- Hotkeys
- Multi-sorting
- Inline editors
- Custom scale units

## Reference Links

- **Official Docs**: https://docs.svar.dev/react/gantt/
- **GitHub**: https://github.com/svar-widgets/gantt
- **Demos**: https://docs.svar.dev/react/gantt/samples
- **Backend Example**: https://github.com/svar-widgets/gantt-backend-go
- **NPM**: https://www.npmjs.com/package/@svar-ui/react-gantt
- **License**: GNU GPLv3

## 🌐 실시간 문서 참조

이 스킬은 Claude의 웹 검색 기능을 활용하여 항상 최신 공식 문서를 참조할 수 있습니다.

### 최신 정보 확인 방법

다음과 같이 질문하면 자동으로 최신 공식 문서를 검색합니다:

```
"SVAR Gantt 최신 버전 확인해줘"
"공식 문서에서 scales 설정 방법 찾아줘"
"v2.3.4 변경사항 알려줘"
```

### 주요 공식 문서 URL

**핵심 문서:**
- Overview: https://docs.svar.dev/react/gantt/overview
- Getting Started: https://docs.svar.dev/react/gantt/getting_started
- What's New: https://docs.svar.dev/react/gantt/whats_new
- API Reference: https://docs.svar.dev/react/gantt/api/overview/api_overview
- Configuration Guides: https://docs.svar.dev/react/gantt/guides/configuration

**업데이트 확인:**
- GitHub Releases: https://github.com/svar-widgets/gantt/releases
- Changelog: https://docs.svar.dev/react/gantt/whats_new

### 자동 업데이트

이 스킬은 더 이상 로컬 문서 파일이 필요 없습니다:
- ✅ 실시간으로 공식 문서 참조
- ✅ 항상 최신 정보 제공
- ✅ 자동으로 새 기능 감지
- ✅ Breaking changes 자동 확인

자세한 업데이트 방법은 `scripts/update-skill.md` 참조

---

*Based on SVAR React Gantt v2.3.3 Official Documentation*  
*With real-time web search capability for latest updates*

