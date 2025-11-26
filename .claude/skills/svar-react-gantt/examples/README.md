# SVAR React Gantt Examples

이 폴더에는 SVAR React Gantt v2.3.3의 다양한 사용 예제가 포함되어 있습니다.

## 예제 목록

### 1. basic-gantt.tsx

**기본 간트 차트 구현**

가장 간단한 SVAR React Gantt 구현 예제입니다. 다음 내용을 포함합니다:

- 작업(Tasks) 정의
- 링크(Links) 정의
- 스케일(Scales) 설정
- 테마 적용

**사용 사례:**
- 간트 차트 시작하기
- 기본 프로젝트 타임라인 표시

---

### 2. backend-integration.tsx

**백엔드 연동 예제**

RestDataProvider를 사용한 서버 연동 예제입니다:

- RestDataProvider 설정
- 자동 CRUD 동기화
- Lazy loading (동적 데이터 로딩)
- Batch mode (배치 모드)
- 에러 핸들링

**사용 사례:**
- 서버와 연동되는 프로젝트 관리 시스템
- 대규모 데이터의 동적 로딩
- 실시간 협업 도구

**필요한 백엔드 엔드포인트:**
```
GET  /tasks
GET  /tasks/:id
POST /tasks
PUT  /tasks/:id
DELETE /tasks/:id
GET  /links
POST /links
PUT  /links/:id
DELETE /links/:id
POST /batch (선택사항)
```

---

### 3. custom-ui.tsx

**커스텀 UI 예제**

고급 UI 커스터마이징을 보여주는 예제입니다:

- 커스텀 컬럼 (담당자, 우선순위 등)
- 커스텀 에디터 필드 (registerEditorItem)
- 커스텀 컨텍스트 메뉴
- 커스텀 툴팁
- 커스텀 작업 바 템플릿

**사용 사례:**
- 프로젝트 관리 대시보드
- 리소스 할당 시스템
- 작업 추적 도구

---

### 4. advanced-features.tsx

**고급 기능 예제**

SVAR React Gantt의 고급 기능들을 보여주는 예제입니다:

- Lazy loading (동적 데이터 로딩)
- Multi-sorting (다중 정렬)
- Hotkeys (커스텀 단축키)
- Custom task types (커스텀 작업 타입)
- Zoom levels (줌 레벨)
- AutoScale (자동 스케일)
- HeaderMenu (컬럼 숨기기/표시)

**사용 사례:**
- 복잡한 프로젝트 관리
- 다양한 작업 타입이 있는 시스템
- 키보드 중심 워크플로우

---

## 예제 사용 방법

### 1. 프로젝트에 복사

원하는 예제를 프로젝트의 `src/components/` 폴더에 복사합니다:

```bash
cp basic-gantt.tsx your-project/src/components/
```

### 2. 필요한 패키지 설치

```bash
npm install @svar-ui/react-gantt

# 백엔드 연동 시
npm install @svar-ui/gantt-data-provider
```

### 3. 컴포넌트 import 및 사용

```tsx
import BasicGantt from './components/basic-gantt';

function App() {
  return (
    <div>
      <h1>My Gantt Chart</h1>
      <BasicGantt />
    </div>
  );
}
```

### 4. CSS import 확인

메인 파일(App.tsx 또는 index.tsx)에서 CSS를 import 했는지 확인:

```tsx
import "@svar-ui/react-gantt/all.css";
```

---

## 예제 커스터마이징

### 데이터 변경

각 예제의 `tasks`, `links`, `scales` 데이터를 수정하여 원하는 프로젝트에 맞게 조정할 수 있습니다.

```tsx
const tasks = [
  {
    id: 1,
    text: "내 작업",
    start: new Date(2024, 0, 1),
    end: new Date(2024, 0, 10),
    type: "task"
  }
];
```

### 컬럼 추가

```tsx
const columns = [
  ...defaultColumns,
  {
    id: "customField",
    label: "커스텀 필드",
    width: 120,
    template: (task) => task.customField || "-"
  }
];
```

### 이벤트 핸들러 추가

```tsx
const init = useCallback((api) => {
  api.on("update-task", (ev) => {
    console.log("Task updated:", ev);
    // 커스텀 로직
  });
}, []);
```

---

## TypeScript 지원

모든 예제는 TypeScript와 호환됩니다. 타입을 확장하여 사용할 수 있습니다:

```tsx
import type { Task } from "@svar-ui/react-gantt";

interface CustomTask extends Task {
  assignee?: string;
  priority?: "low" | "medium" | "high";
  customField?: string;
}

const tasks: CustomTask[] = [
  {
    id: 1,
    text: "Task",
    start: new Date(),
    end: new Date(),
    type: "task",
    assignee: "홍길동",
    priority: "high",
    customField: "값"
  }
];
```

---

## 문제 해결

예제 실행 시 문제가 발생하면 다음을 확인하세요:

1. **패키지 버전 확인**
   ```bash
   npm list @svar-ui/react-gantt
   # v2.3.3 이상이어야 함
   ```

2. **CSS import 확인**
   ```tsx
   import "@svar-ui/react-gantt/all.css";
   ```

3. **날짜 형식 확인**
   - 문자열이 아닌 `Date` 객체 사용
   - `new Date(2024, 0, 1)` (월은 0부터 시작)

4. **필수 필드 확인**
   - 모든 작업에 `id`, `text`, `start`, `type` 필드 필요

자세한 문제 해결은 `references/troubleshooting.md` 참조

---

## 추가 리소스

- **API Reference**: `../references/api-reference.md`
- **Configuration Guide**: `../references/configuration-guide.md`
- **Troubleshooting**: `../references/troubleshooting.md`
- **Official Docs**: https://docs.svar.dev/react/gantt/
- **GitHub**: https://github.com/svar-widgets/gantt

---

## 라이선스

SVAR React Gantt는 GNU GPLv3 라이선스로 배포됩니다.
오픈소스가 아닌 프로젝트에서 사용하려면 별도 라이선스가 필요합니다.

Contact: support@svar.dev

