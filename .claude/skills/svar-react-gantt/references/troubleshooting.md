# SVAR React Gantt Troubleshooting Guide

이 문서는 SVAR React Gantt 사용 시 자주 발생하는 문제와 해결 방법을 정리합니다.

## 목차

1. [설치 및 초기화 문제](#설치-및-초기화-문제)
2. [데이터 렌더링 문제](#데이터-렌더링-문제)
3. [API 및 이벤트 문제](#api-및-이벤트-문제)
4. [백엔드 연동 문제](#백엔드-연동-문제)
5. [성능 문제](#성능-문제)
6. [스타일링 문제](#스타일링-문제)
7. [TypeScript 문제](#typescript-문제)
8. [마이그레이션 문제](#마이그레이션-문제)

---

## 설치 및 초기화 문제

### ❌ 문제: 패키지 설치 오류

**증상:**
```bash
npm ERR! Cannot find module '@svar-ui/react-gantt'
```

**원인:**
- 잘못된 패키지명 사용
- npm/yarn 캐시 문제

**해결책:**
```bash
# v2.x 설치 (최신)
npm install @svar-ui/react-gantt

# 또는 캐시 클리어 후 재설치
npm cache clean --force
npm install @svar-ui/react-gantt
```

---

### ❌ 문제: CSS가 적용되지 않음

**증상:**
- Gantt 차트가 스타일 없이 표시됨
- 레이아웃이 깨짐

**원인:**
- CSS import 누락

**해결책:**
```tsx
// ✅ 올바른 import
import { Gantt } from "@svar-ui/react-gantt";
import "@svar-ui/react-gantt/all.css";  // 필수!
```

---

### ❌ 문제: 빈 차트만 표시됨

**증상:**
- Gantt 컴포넌트는 렌더링되지만 데이터가 없음

**원인:**
- tasks, links 데이터 전달 안 됨
- 비동기 데이터 로딩 문제

**해결책:**
```tsx
// ❌ 잘못된 예
function App() {
  const [tasks, setTasks] = useState();  // undefined!
  return <Gantt tasks={tasks} />;
}

// ✅ 올바른 예
function App() {
  const [tasks, setTasks] = useState([]);  // 빈 배열
  
  useEffect(() => {
    // 데이터 로딩
    fetchTasks().then(setTasks);
  }, []);
  
  return <Gantt tasks={tasks} />;
}
```

---

## 데이터 렌더링 문제

### ❌ 문제: 작업(Task)이 렌더링되지 않음

**증상:**
- 데이터는 있지만 차트에 작업 바가 표시 안 됨

**원인 1:** 잘못된 날짜 형식

```tsx
// ❌ 문자열 날짜
const tasks = [{
  id: 1,
  text: "Task",
  start: "2024-01-01",  // 잘못됨!
  end: "2024-01-15"
}];

// ✅ Date 객체
const tasks = [{
  id: 1,
  text: "Task",
  start: new Date(2024, 0, 1),  // 올바름
  end: new Date(2024, 0, 15),
  type: "task"
}];
```

**원인 2:** 필수 필드 누락

```tsx
// ❌ type 필드 누락
const tasks = [{
  id: 1,
  text: "Task",
  start: new Date(),
  end: new Date()
  // type 필드 없음!
}];

// ✅ 모든 필수 필드 포함
const tasks = [{
  id: 1,
  text: "Task",
  start: new Date(),
  end: new Date(),
  type: "task"  // 필수!
}];
```

**원인 3:** Scale 범위 밖

```tsx
// 작업 날짜가 scale 범위 밖에 있음
const tasks = [{
  start: new Date(2024, 0, 1),
  end: new Date(2024, 0, 15)
}];

// Scale은 2023년만 표시
<Gantt 
  tasks={tasks}
  start={new Date(2023, 0, 1)}
  end={new Date(2023, 11, 31)}
/>

// ✅ 해결: autoScale 사용
<Gantt tasks={tasks} autoScale={true} />
```

---

### ❌ 문제: 링크가 표시되지 않음

**증상:**
- 작업은 표시되지만 의존성 링크가 안 보임

**원인:** source/target ID 불일치

```tsx
const tasks = [
  { id: 1, text: "Task 1", ... },
  { id: 2, text: "Task 2", ... }
];

// ❌ 존재하지 않는 ID
const links = [
  { id: 1, source: 1, target: 999, type: "e2s" }  // target 999 없음!
];

// ✅ 올바른 ID
const links = [
  { id: 1, source: 1, target: 2, type: "e2s" }  // OK
];
```

---

### ❌ 문제: Milestone이 다이아몬드 모양이 아님

**증상:**
- Milestone이 일반 작업처럼 표시됨

**원인:** duration이 0이 아님

```tsx
// ❌ duration이 있음
const tasks = [{
  id: 1,
  text: "Milestone",
  type: "milestone",
  start: new Date(),
  duration: 1  // Milestone은 duration 없어야 함!
}];

// ✅ duration 없음
const tasks = [{
  id: 1,
  text: "Milestone",
  type: "milestone",
  start: new Date()
  // duration 없음
}];
```

---

## API 및 이벤트 문제

### ❌ 문제: API 메서드가 작동하지 않음

**증상:**
- `api.exec()`, `api.on()` 등이 에러 발생

**원인:** init 콜백 누락

```tsx
// ❌ init 없이 API 사용 시도
function App() {
  const apiRef = useRef(null);
  
  useEffect(() => {
    // API 접근 불가!
    apiRef.current?.exec("add-task", { ... });
  }, []);
  
  return <Gantt ref={apiRef} />;
}

// ✅ init 콜백 사용
function App() {
  const init = useCallback((api) => {
    // 여기서 API 사용
    api.on("update-task", handler);
    api.intercept("delete-task", validator);
  }, []);
  
  return <Gantt init={init} />;
}
```

---

### ❌ 문제: 이벤트 핸들러가 여러 번 실행됨

**증상:**
- `api.on()` 핸들러가 중복 실행됨

**원인:** dependency 배열 문제로 재등록

```tsx
// ❌ 매 렌더링마다 재등록
function App() {
  const [data, setData] = useState([]);
  
  const init = (api) => {  // dependency 없음!
    api.on("update-task", (ev) => {
      console.log(data);  // 클로저 문제
    });
  };
  
  return <Gantt init={init} />;
}

// ✅ useCallback 사용
function App() {
  const [data, setData] = useState([]);
  
  const init = useCallback((api) => {
    const unsubscribe = api.on("update-task", (ev) => {
      console.log(ev);
    });
    
    // Cleanup
    return () => {
      unsubscribe();
    };
  }, []); // 빈 배열
  
  return <Gantt init={init} />;
}
```

---

### ❌ 문제: intercept가 동작하지 않음

**증상:**
- `api.intercept()`로 액션을 취소해도 실행됨

**원인:** false를 반환하지 않음

```tsx
// ❌ 반환값 없음
api.intercept("delete-task", (data) => {
  if (!canDelete(data.id)) {
    console.log("Cannot delete");
    // false를 반환 안 함!
  }
});

// ✅ false 반환
api.intercept("delete-task", (data) => {
  if (!canDelete(data.id)) {
    alert("삭제할 수 없습니다");
    return false;  // 액션 취소
  }
});
```

---

## 백엔드 연동 문제

### ❌ 문제: RestDataProvider가 동기화 안 됨

**증상:**
- 작업 추가/수정/삭제가 서버에 반영 안 됨

**원인:** `api.setNext()` 호출 누락

```tsx
// ❌ setNext 호출 안 함
const server = new RestDataProvider("https://api.example.com");

const init = (api) => {
  api.on("update-task", handler);
  // setNext 없음!
};

// ✅ setNext 호출
const init = useCallback((api) => {
  api.setNext(server);  // 필수!
}, []);
```

---

### ❌ 문제: 백엔드 요청이 실패함

**증상:**
- 콘솔에 네트워크 에러 표시

**원인 1:** CORS 문제

```tsx
// 백엔드에서 CORS 헤더 설정 필요
// Express.js 예시:
app.use(cors({
  origin: 'http://localhost:3000',
  credentials: true
}));
```

**원인 2:** 잘못된 엔드포인트 URL

```tsx
// ❌ 잘못된 URL
const server = new RestDataProvider("api.example.com");  // http:// 없음!

// ✅ 올바른 URL
const server = new RestDataProvider("https://api.example.com");
```

**원인 3:** 예상하는 데이터 형식 불일치

```tsx
// RestDataProvider가 기대하는 형식:
// GET /tasks → { tasks: Task[], links: Link[] }
// POST /tasks → { id: number, ... }

// 백엔드 응답 예시 (올바름):
{
  "tasks": [
    { "id": 1, "text": "Task", ... }
  ],
  "links": []
}
```

---

### ❌ 문제: Lazy loading이 작동하지 않음

**증상:**
- 하위 작업이 로딩되지 않음

**원인:** `request-data` 이벤트 핸들러 누락

```tsx
// ❌ request-data 핸들러 없음
const tasks = [
  { id: 1, text: "Parent", lazy: true }
];

<Gantt tasks={tasks} />

// ✅ request-data 핸들러 추가
const init = useCallback((api) => {
  api.on("request-data", (ev) => {
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

---

## 성능 문제

### ❌ 문제: 대규모 데이터셋에서 느림

**증상:**
- 1000개 이상 작업 시 렌더링 지연
- 스크롤이 버벅거림

**해결책 1:** Lazy loading 사용

```tsx
const tasks = bigTasks.map(task => ({
  ...task,
  lazy: task.children?.length > 0  // 하위 작업 동적 로드
}));
```

**해결책 2:** React.memo 사용

```tsx
const MemoizedGantt = React.memo(Gantt);

function App() {
  const [tasks, setTasks] = useState([]);
  
  return <MemoizedGantt tasks={tasks} />;
}
```

**해결책 3:** useMemo로 데이터 메모이제이션

```tsx
const scales = useMemo(() => [
  { unit: "month", step: 1, format: "MMMM yyyy" },
  { unit: "day", step: 1, format: "d" }
], []);

const columns = useMemo(() => [
  { id: "text", label: "Task" },
  { id: "start", label: "Start" }
], []);
```

**해결책 4:** Batch mode 활성화

```tsx
const server = new RestDataProvider(
  "https://api.example.com",
  { batchURL: "batch" }  // 여러 요청을 하나로 묶음
);
```

---

### ❌ 문제: 불필요한 리렌더링

**증상:**
- 작은 변경에도 전체 차트 리렌더링

**해결책:** useCallback으로 함수 안정화

```tsx
// ❌ 매번 새 함수 생성
function App() {
  const [tasks, setTasks] = useState([]);
  
  const init = (api) => {  // 매 렌더링마다 새 함수
    api.on("update-task", handler);
  };
  
  return <Gantt tasks={tasks} init={init} />;
}

// ✅ useCallback 사용
function App() {
  const [tasks, setTasks] = useState([]);
  
  const init = useCallback((api) => {
    api.on("update-task", handler);
  }, []); // 안정화된 함수
  
  return <Gantt tasks={tasks} init={init} />;
}
```

---

## 스타일링 문제

### ❌ 문제: 테마가 적용되지 않음

**증상:**
- Willow/WillowDark 컴포넌트를 사용해도 스타일 변경 안 됨

**원인:** 테마로 감싸지 않음

```tsx
// ❌ 테마 없음
<Gantt tasks={tasks} />

// ✅ 테마로 감싸기
import { Willow } from "@svar-ui/react-gantt";

<Willow>
  <Gantt tasks={tasks} />
</Willow>
```

---

### ❌ 문제: CSS variables가 적용되지 않음

**증상:**
- CSS variable을 변경해도 스타일이 안 바뀜

**원인:** 우선순위 문제

```css
/* ❌ 우선순위 낮음 */
.gantt-wrapper {
  --wx-gantt-task-color: red;
}

/* ✅ 더 구체적인 셀렉터 */
.gantt-wrapper .wx-gantt {
  --wx-gantt-task-color: red;
}

/* 또는 !important (최후의 수단) */
.gantt-wrapper {
  --wx-gantt-task-color: red !important;
}
```

---

### ❌ 문제: 커스텀 폰트가 적용되지 않음

**증상:**
- 테마의 폰트가 계속 사용됨

**해결책:** fonts prop을 false로 설정

```tsx
<Willow fonts={false}>
  <Gantt tasks={tasks} />
</Willow>
```

```css
/* 커스텀 폰트 적용 */
.gantt-wrapper {
  font-family: 'Noto Sans KR', sans-serif;
}
```

---

## TypeScript 문제

### ❌ 문제: 타입 에러 발생

**증상:**
```
Property 'assignee' does not exist on type 'Task'
```

**해결책:** 타입 확장

```tsx
import type { Task } from "@svar-ui/react-gantt";

interface CustomTask extends Task {
  assignee?: string;
  priority?: "low" | "medium" | "high";
  tags?: string[];
}

const tasks: CustomTask[] = [
  {
    id: 1,
    text: "Task",
    start: new Date(),
    end: new Date(),
    type: "task",
    assignee: "홍길동",
    priority: "high"
  }
];
```

---

### ❌ 문제: API 타입 추론 안 됨

**해결책:** 명시적 타입 지정

```tsx
import type { GanttAPI } from "@svar-ui/react-gantt";

const init = useCallback((api: GanttAPI) => {
  // api 자동완성 작동
  api.exec("add-task", { ... });
}, []);
```

---

## 마이그레이션 문제

### ❌ 문제: v1.x에서 v2.3 업그레이드 시 에러

**증상:**
```
Cannot find module 'wx-react-gantt'
```

**해결책:** 패키지명 변경

```tsx
// ❌ v1.x
import { Gantt } from "wx-react-gantt";
import "wx-react-gantt/dist/gantt.css";

// ✅ v2.3
import { Gantt } from "@svar-ui/react-gantt";
import "@svar-ui/react-gantt/all.css";
```

**Breaking Changes:**
1. 패키지명 변경: `wx-react-gantt` → `@svar-ui/react-gantt`
2. CSS import 경로 변경
3. 일부 API 변경 (문서 참조)

---

## 일반적인 디버깅 팁

### 1. 콘솔 로그 확인

```tsx
const init = useCallback((api) => {
  // 상태 확인
  console.log("State:", api.getState());
  
  // 이벤트 로깅
  api.on("update-task", (ev) => {
    console.log("Task updated:", ev);
  });
  
  // 액션 가로채기로 디버깅
  api.intercept("*", (data) => {
    console.log("Action:", data);
  });
}, []);
```

### 2. React DevTools 사용

- React DevTools로 props 확인
- 리렌더링 하이라이트 활성화
- Profiler로 성능 측정

### 3. Network 탭 확인

- RestDataProvider 사용 시 네트워크 요청 확인
- 요청/응답 데이터 형식 검증

### 4. 브라우저 호환성

지원 브라우저:
- Chrome 90+
- Firefox 88+
- Safari 14+
- Edge 90+

---

## 추가 도움말

문제가 해결되지 않으면:

1. **공식 문서**: https://docs.svar.dev/react/gantt/
2. **GitHub Issues**: https://github.com/svar-widgets/gantt/issues
3. **Forum**: https://forum.svar.dev/
4. **Examples**: https://docs.svar.dev/react/gantt/samples

---

이 가이드는 계속 업데이트됩니다. 새로운 문제를 발견하시면 GitHub에 이슈를 등록해 주세요.

