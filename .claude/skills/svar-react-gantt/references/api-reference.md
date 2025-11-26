# SVAR React Gantt API Reference (v2.3.3)

이 문서는 SVAR React Gantt의 전체 API를 정리한 레퍼런스입니다.

## API 메서드

### api.exec()

액션을 프로그래매틱하게 실행합니다.

```tsx
api.exec(action: string, config: object): void;
```

**Parameters:**
- `action` - 실행할 액션 이름
- `config` - 액션에 필요한 파라미터 객체

**Example:**
```tsx
api.exec("add-task", {
  task: {
    id: 10,
    text: "새 작업",
    start: new Date(),
    end: new Date(),
    type: "task"
  }
});

api.exec("update-task", { 
  id: 5, 
  task: { progress: 75 } 
});

api.exec("delete-task", { id: 3 });
```

---

### api.on()

이벤트 리스너를 등록합니다 (읽기 전용).

```tsx
api.on(event: string, handler: function): function;
```

**Parameters:**
- `event` - 리스닝할 이벤트/액션 이름
- `handler` - 이벤트 핸들러 함수

**Returns:** 언등록 함수

**Example:**
```tsx
const unsubscribe = api.on("update-task", (ev) => {
  console.log("Task updated:", ev.id, ev.task);
});

// 나중에 언등록
unsubscribe();
```

---

### api.intercept()

액션을 가로채고 수정하거나 취소합니다.

```tsx
api.intercept(action: string, callback: function): void;
```

**Parameters:**
- `action` - 가로챌 액션 이름
- `callback` - 콜백 함수 (false 반환 시 액션 취소)

**Example:**
```tsx
api.intercept("delete-task", (data) => {
  if (!confirm("정말 삭제하시겠습니까?")) {
    return false; // 액션 취소
  }
  // 데이터 수정 가능
  data.custom = "추가 정보";
});

api.intercept("update-task", (data) => {
  // 진행률을 100% 이상으로 설정 방지
  if (data.task.progress > 100) {
    data.task.progress = 100;
  }
});
```

---

### api.getState()

현재 Gantt 상태를 조회합니다.

```tsx
api.getState(): object;
```

**Returns:** 상태 객체

**Example:**
```tsx
const state = api.getState();
console.log(state.tasks);
console.log(state.links);
console.log(state.scales);
console.log(state.columns);
console.log(state.zoom);
console.log(state.readonly);
```

---

### api.getReactiveState()

Reactive 상태 객체를 조회합니다 (v2.3+).

```tsx
api.getReactiveState(): object;
```

**Returns:** Reactive 상태 객체

**Example:**
```tsx
const reactiveState = api.getReactiveState();
// reactive properties 사용
```

---

### api.getTask()

특정 작업의 정보를 조회합니다.

```tsx
api.getTask(id: number | string): object;
```

**Parameters:**
- `id` - 작업 ID

**Returns:** 작업 객체

**Example:**
```tsx
const task = api.getTask(5);
console.log(task.text);
console.log(task.progress);
console.log(task.start);
console.log(task.duration);
```

---

### api.getStores()

데이터 스토어 객체를 조회합니다.

```tsx
api.getStores(): { tasks: DataStore, links: DataStore };
```

**Returns:** tasks와 links DataStore 객체

**Example:**
```tsx
const { tasks, links } = api.getStores();

// 작업 추가
tasks.add({
  id: 100,
  text: "새 작업",
  start: new Date(),
  end: new Date(),
  type: "task"
});

// 작업 업데이트
tasks.update(100, { progress: 50 });

// 작업 삭제
tasks.delete(100);
```

---

### api.setNext()

Event Bus에 다음 핸들러를 추가합니다 (주로 백엔드 연동용).

```tsx
api.setNext(handler: object): void;
```

**Parameters:**
- `handler` - 핸들러 객체 (보통 RestDataProvider)

**Example:**
```tsx
import { RestDataProvider } from "@svar-ui/gantt-data-provider";

const server = new RestDataProvider("https://api.example.com");

const init = (api) => {
  api.setNext(server);
};

<Gantt init={init} />
```

---

### api.detach()

이벤트 핸들러를 제거합니다.

```tsx
api.detach(event: string): void;
```

**Parameters:**
- `event` - 제거할 이벤트 이름

**Example:**
```tsx
// 또는 api.on()의 반환값 사용
const unsubscribe = api.on("update-task", handler);
unsubscribe();
```

---

## Actions (액션)

### Task Actions

**add-task**
```tsx
api.exec("add-task", {
  task: {
    id: number,
    text: string,
    start: Date,
    end: Date,
    type: "task" | "milestone" | "summary",
    parent?: number,
    progress?: number
  },
  mode?: "before" | "after" | "child",
  target?: number
});
```

**update-task**
```tsx
api.exec("update-task", {
  id: number,
  task: Partial<Task>
});
```

**delete-task**
```tsx
api.exec("delete-task", {
  id: number
});
```

**copy-task**
```tsx
api.exec("copy-task", {
  id: number,
  target?: number
});
```

**move-task**
```tsx
api.exec("move-task", {
  id: number,
  parent?: number,
  mode: "before" | "after" | "child",
  target: number
});
```

**indent-task**
```tsx
api.exec("indent-task", {
  id: number,
  mode: "increase" | "decrease"
});
```

**drag-task**
```tsx
api.exec("drag-task", {
  id: number,
  start: Date,
  end: Date
});
```

**open-task**
```tsx
api.exec("open-task", {
  id: number,
  open: boolean
});
```

**select-task**
```tsx
api.exec("select-task", {
  id: number,
  toggle?: boolean
});
```

**sort-tasks** (v1.1+)
```tsx
api.exec("sort-tasks", {
  key: string | string[],
  dir: "asc" | "desc" | ("asc" | "desc")[]
});
```

---

### Link Actions

**add-link**
```tsx
api.exec("add-link", {
  link: {
    id: number,
    source: number,
    target: number,
    type: "e2s" | "s2s" | "e2e" | "s2e"
  }
});
```

**update-link**
```tsx
api.exec("update-link", {
  id: number,
  link: Partial<Link>
});
```

**delete-link**
```tsx
api.exec("delete-link", {
  id: number
});
```

---

### Scale Actions

**expand-scale**
```tsx
api.exec("expand-scale", {
  direction: "left" | "right" | "both"
});
```

**zoom-scale**
```tsx
api.exec("zoom-scale", {
  level: number
});
```

**scroll-chart**
```tsx
api.exec("scroll-chart", {
  date: Date
});
```

---

### Data Actions

**request-data**

하위 작업 데이터를 요청합니다 (lazy loading).

```tsx
api.on("request-data", (ev) => {
  console.log("Requesting data for task:", ev.id);
});
```

**provide-data**

요청된 데이터를 제공합니다.

```tsx
api.exec("provide-data", {
  id: number,
  data: {
    tasks: Task[],
    links: Link[]
  }
});
```

**render-data**

데이터 렌더링 시 발생합니다.

```tsx
api.on("render-data", (ev) => {
  console.log("Data rendered");
});
```

---

### Editor Actions (v2.3+)

**show-editor**
```tsx
api.exec("show-editor", {
  id: number
});

// 또는 에디터 닫기
api.exec("show-editor", {
  id: null
});
```

---

### Hotkey Actions (v2.3+)

**hotkey**
```tsx
api.on("hotkey", (ev) => {
  console.log("Hotkey pressed:", ev.key);
  if (ev.key === "ctrl+s") {
    // 커스텀 로직
    ev.preventDefault();
  }
});
```

---

## Properties (속성)

Gantt 컴포넌트에 전달 가능한 props:

### tasks
작업 목록

```tsx
tasks?: Task[]

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
  [key: string]: any;
}
```

### links
링크 목록

```tsx
links?: Link[]

interface Link {
  id: number | string;
  source: number | string;
  target: number | string;
  type: "e2s" | "s2s" | "e2e" | "s2e";
}
```

### scales
타임스케일 설정

```tsx
scales?: Scale[]

interface Scale {
  unit: "minute" | "hour" | "day" | "week" | "month" | "quarter" | "year";
  step: number;
  format: string;
  css?: (date: Date) => string;
}
```

### columns
그리드 컬럼 설정

```tsx
columns?: Column[]

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

### readonly
읽기 전용 모드

```tsx
readonly?: boolean
```

### zoom
줌 설정

```tsx
zoom?: {
  levels: Scale[][];
  minCellWidth?: number; // v1.1+
  maxCellWidth?: number; // v1.1+
}
```

### cellWidth
셀 너비 (픽셀)

```tsx
cellWidth?: number
```

### cellHeight
셀 높이 (픽셀)

```tsx
cellHeight?: number
```

### scaleHeight
스케일 높이 (픽셀)

```tsx
scaleHeight?: number
```

### cellBorders
셀 테두리 스타일

```tsx
cellBorders?: "none" | "vertical" | "horizontal" | "full"
```

### start
타임스케일 시작 날짜

```tsx
start?: Date
```

### end
타임스케일 종료 날짜

```tsx
end?: Date
```

### autoScale (v2.3+)
자동 스케일 조정

```tsx
autoScale?: boolean
```

### durationUnit (v2.3+)
기간 단위

```tsx
durationUnit?: "day" | "hour"
```

### lengthUnit (v2.3+)
길이 단위

```tsx
lengthUnit?: "minute" | "hour" | "day" | "week" | "month" | "quarter" | "year"
```

### highlightTime
시간 범위 강조

```tsx
highlightTime?: Array<{
  from: Date;
  to: Date;
}>
```

### selected
선택된 작업 목록

```tsx
selected?: (number | string)[]
```

### activeTask
활성 작업 (에디터 열림)

```tsx
activeTask?: number | string | null
```

### taskTypes
커스텀 작업 타입

```tsx
taskTypes?: Array<{
  id: string;
  label: string;
  color?: string;
}>
```

### taskTemplate
작업 바 템플릿

```tsx
taskTemplate?: (task: Task) => string
```

### locale
로케일 설정

```tsx
locale?: Record<string, string>
```

### init
초기화 콜백

```tsx
init?: (api: GanttAPI) => void
```

---

## Helper Components

### RestDataProvider

```tsx
import { RestDataProvider } from "@svar-ui/gantt-data-provider";

new RestDataProvider(url: string, config?: {
  batchURL?: string;
  debounce?: number;
})
```

**Methods:**
- `getData(id?: number): Promise<{ tasks: Task[], links: Link[] }>`
- `send(url: string, method: string, data: any): Promise<any>`

---

### ContextMenu

```tsx
import { ContextMenu } from "@svar-ui/react-gantt";

<ContextMenu api={api} options={menuOptions}>
  <Gantt init={init} />
</ContextMenu>
```

---

### Toolbar

```tsx
import { Toolbar } from "@svar-ui/react-gantt";

<Toolbar api={api}>
  <Gantt init={init} />
</Toolbar>
```

---

### Tooltip

```tsx
import { Tooltip } from "@svar-ui/react-gantt";

<Tooltip api={api}>
  <Gantt init={init} />
</Tooltip>
```

---

### Editor (v2.3+)

```tsx
import { Editor } from "@svar-ui/react-gantt";

<Editor api={api}>
  <Gantt init={init} />
</Editor>
```

---

### Fullscreen

```tsx
import { Fullscreen } from "@svar-ui/react-gantt";

<Fullscreen api={api}>
  <Gantt init={init} />
</Fullscreen>
```

---

### HeaderMenu (v2.3+)

```tsx
import { HeaderMenu } from "@svar-ui/react-gantt";

<HeaderMenu api={api}>
  <Gantt init={init} />
</HeaderMenu>
```

---

## Helper Functions

### registerEditorItem() (v2.3+)

커스텀 에디터 필드 등록

```tsx
import { registerEditorItem } from "@svar-ui/react-gantt";

registerEditorItem("priority", {
  type: "select",
  label: "우선순위",
  options: [
    { id: "high", label: "높음" },
    { id: "medium", label: "보통" },
    { id: "low", label: "낮음" }
  ],
  validate: (value) => {
    if (!value) return "필수 항목입니다";
    return null;
  }
});
```

### registerScaleUnit() (v2.3+)

커스텀 스케일 단위 등록

```tsx
import { registerScaleUnit } from "@svar-ui/react-gantt";

registerScaleUnit("custom", {
  format: (date) => { /* ... */ },
  next: (date) => { /* ... */ },
  prev: (date) => { /* ... */ }
});
```

---

## TypeScript Types

```tsx
import type { 
  Task, 
  Link, 
  Scale, 
  Column,
  GanttAPI 
} from "@svar-ui/react-gantt";
```

---

이 레퍼런스는 SVAR React Gantt v2.3.3 공식 문서를 기반으로 작성되었습니다.

