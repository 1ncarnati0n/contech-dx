# SVAR React Gantt Configuration Guide

이 문서는 SVAR React Gantt의 다양한 설정 옵션을 상세히 설명합니다.

## Table of Contents

1. [Scales 설정](#scales-설정)
2. [Columns 설정](#columns-설정)
3. [Task Types 설정](#task-types-설정)
4. [Summary Tasks 설정](#summary-tasks-설정)
5. [Context Menu 설정](#context-menu-설정)
6. [Toolbar 설정](#toolbar-설정)
7. [Editor 설정](#editor-설정)
8. [Tooltip 설정](#tooltip-설정)
9. [Zoom 설정](#zoom-설정)
10. [Styling 설정](#styling-설정)

---

## Scales 설정

타임스케일은 차트 영역의 시간 축을 정의합니다.

### 기본 설정

```tsx
const scales = [
  { 
    unit: "month", 
    step: 1, 
    format: "MMMM yyyy" 
  },
  { 
    unit: "day", 
    step: 1, 
    format: "d" 
  }
];

<Gantt scales={scales} />
```

### 사용 가능한 Units

- `minute` (v2.3+)
- `hour` (v2.3+)
- `day`
- `week`
- `month`
- `quarter`
- `year`

### Format 옵션

Date-fns 포맷 문자열 사용:
- `yyyy` - 4자리 년도
- `yy` - 2자리 년도
- `MMMM` - 전체 월 이름
- `MMM` - 축약 월 이름
- `MM` - 2자리 월
- `M` - 월
- `dd` - 2자리 일
- `d` - 일
- `HH` - 24시간 형식
- `hh` - 12시간 형식
- `mm` - 분

### CSS 스타일링

특정 날짜에 커스텀 스타일 적용:

```tsx
const dayStyle = (date) => {
  const day = date.getDay();
  if (day === 0 || day === 6) {
    return "holiday"; // CSS 클래스명
  }
  return "";
};

const scales = [
  { 
    unit: "month", 
    step: 1, 
    format: "MMMM yyyy" 
  },
  { 
    unit: "day", 
    step: 1, 
    format: "d",
    css: dayStyle 
  }
];
```

### AutoScale (v2.3+)

타임스케일이 자동으로 조정되도록 설정:

```tsx
<Gantt 
  scales={scales}
  autoScale={true}
/>
```

### 고정 Scale 범위

```tsx
<Gantt 
  scales={scales}
  start={new Date(2024, 0, 1)}
  end={new Date(2024, 11, 31)}
/>
```

### 커스텀 Scale Unit (v2.3+)

```tsx
import { registerScaleUnit } from "@svar-ui/react-gantt";

registerScaleUnit("biweek", {
  format: (date) => {
    const week = Math.ceil(date.getDate() / 14);
    return `Week ${week}`;
  },
  next: (date) => {
    const newDate = new Date(date);
    newDate.setDate(date.getDate() + 14);
    return newDate;
  },
  prev: (date) => {
    const newDate = new Date(date);
    newDate.setDate(date.getDate() - 14);
    return newDate;
  }
});

const scales = [
  { unit: "biweek", step: 1, format: "custom" }
];
```

---

## Columns 설정

Grid 영역의 컬럼을 설정합니다.

### 기본 컬럼

```tsx
const columns = [
  {
    id: "text",
    label: "작업 이름",
    width: 250,
    flexgrow: 2,
    resize: true
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
    align: "center"
  },
  {
    id: "add-task",
    label: "",
    width: 50,
    align: "center"
  }
];

<Gantt columns={columns} />
```

### 사용 가능한 Column IDs

- `text` - 작업 이름
- `start` - 시작일
- `end` - 종료일
- `duration` - 기간
- `progress` - 진행률
- `type` - 작업 타입
- `add-task` - 작업 추가 버튼
- 커스텀 필드명

### Column 속성

```tsx
interface Column {
  id: string;              // 필드 ID
  label?: string;          // 헤더 레이블
  width?: number;          // 고정 너비 (픽셀)
  flexgrow?: number;       // 비율 너비
  align?: "left" | "center" | "right";
  resize?: boolean;        // 크기 조절 가능 여부
  sort?: boolean;          // 정렬 가능 여부 (v1.1+)
  editor?: "text" | "number" | "date"; // 인라인 에디터 (v2.3+)
  template?: (task: Task) => string;   // 커스텀 템플릿
}
```

### 정렬 가능 컬럼 (v1.1+)

```tsx
const columns = [
  {
    id: "text",
    label: "작업",
    sort: true  // 헤더 클릭으로 정렬
  },
  {
    id: "start",
    label: "시작일",
    sort: true
  }
];
```

### 인라인 에디터 (v2.3+)

```tsx
const columns = [
  {
    id: "text",
    label: "작업명",
    editor: "text"  // 더블클릭으로 편집
  },
  {
    id: "duration",
    label: "기간",
    editor: "number"
  },
  {
    id: "start",
    label: "시작일",
    editor: "date"
  }
];
```

### 커스텀 템플릿

```tsx
const columns = [
  {
    id: "progress",
    label: "진행률",
    template: (task) => {
      const color = task.progress > 50 ? "green" : "red";
      return `<span style="color: ${color}">${task.progress}%</span>`;
    }
  },
  {
    id: "assignee",
    label: "담당자",
    template: (task) => {
      return task.assignee || "미지정";
    }
  }
];
```

### Header Menu (v2.3+)

컬럼 숨기기/표시하기:

```tsx
import { HeaderMenu } from "@svar-ui/react-gantt";

<HeaderMenu api={api}>
  <Gantt columns={columns} init={init} />
</HeaderMenu>
```

---

## Task Types 설정

작업 타입을 정의하고 커스터마이징합니다.

### 기본 타입

- `task` - 일반 작업 (파란색)
- `milestone` - 마일스톤 (보라색 다이아몬드)
- `summary` - 요약 작업 (녹색)

### 커스텀 타입 추가

```tsx
const taskTypes = [
  {
    id: "bug",
    label: "버그 수정",
    color: "#ff0000"
  },
  {
    id: "feature",
    label: "기능 개발",
    color: "#00ff00"
  },
  {
    id: "research",
    label: "리서치",
    color: "#0000ff"
  }
];

<Gantt taskTypes={taskTypes} />
```

### Task Type 사용

```tsx
const tasks = [
  {
    id: 1,
    text: "버그 수정 작업",
    type: "bug",  // 커스텀 타입 사용
    start: new Date(),
    end: new Date()
  }
];
```

---

## Summary Tasks 설정

Summary task(요약 작업)의 동작을 설정합니다.

### 기본 동작

- 하위 작업의 시작/종료일에 따라 자동 조정
- 하위 작업 진행률의 평균으로 진행률 계산
- 드래그 시 하위 작업도 함께 이동

### 자동 Summary 변환 비활성화

```tsx
const init = (api) => {
  api.intercept("update-task", (data) => {
    // 하위 작업이 있어도 자동으로 summary로 변환 안 함
    if (data.task.type !== "summary") {
      return data;
    }
  });
};
```

### Summary 진행률 커스터마이징

```tsx
const init = (api) => {
  api.intercept("update-task", (data) => {
    if (data.task.type === "summary") {
      // 커스텀 진행률 계산 로직
      const children = getChildTasks(data.id);
      const avgProgress = calculateCustomProgress(children);
      data.task.progress = avgProgress;
    }
  });
};
```

---

## Context Menu 설정

우클릭 컨텍스트 메뉴를 커스터마이징합니다.

### 기본 사용

```tsx
import { ContextMenu } from "@svar-ui/react-gantt";

<ContextMenu api={api}>
  <Gantt init={init} />
</ContextMenu>
```

### 커스텀 메뉴 옵션

```tsx
import { ContextMenu, defaultMenuOptions } from "@svar-ui/react-gantt";

const customMenuOptions = {
  ...defaultMenuOptions,
  items: [
    { id: "add", text: "작업 추가" },
    { id: "edit", text: "작업 편집" },
    { id: "delete", text: "작업 삭제" },
    { id: "separator" },
    { 
      id: "custom", 
      text: "커스텀 액션",
      handler: (id) => {
        console.log("Custom action for task:", id);
      }
    }
  ]
};

<ContextMenu api={api} options={customMenuOptions}>
  <Gantt init={init} />
</ContextMenu>
```

### 메뉴 아이템 동적 표시/숨김

```tsx
const customMenuOptions = {
  items: (task) => {
    const items = [
      { id: "edit", text: "편집" }
    ];
    
    // 조건부 메뉴
    if (task.type !== "milestone") {
      items.push({ id: "progress", text: "진행률 수정" });
    }
    
    if (canDelete(task)) {
      items.push({ id: "delete", text: "삭제" });
    }
    
    return items;
  }
};
```

---

## Toolbar 설정

툴바 버튼을 설정합니다.

### 기본 사용

```tsx
import { Toolbar } from "@svar-ui/react-gantt";

<Toolbar api={api}>
  <Gantt init={init} />
</Toolbar>
```

### 커스텀 버튼

```tsx
import { Toolbar, defaultToolbarButtons } from "@svar-ui/react-gantt";

const customButtons = [
  ...defaultToolbarButtons,
  {
    id: "export",
    text: "내보내기",
    icon: "download",
    handler: () => {
      exportGantt();
    }
  }
];

<Toolbar api={api} buttons={customButtons}>
  <Gantt init={init} />
</Toolbar>
```

---

## Editor 설정

작업 편집 다이얼로그를 설정합니다 (v2.3+).

### 기본 사용

```tsx
import { Editor } from "@svar-ui/react-gantt";

<Editor api={api}>
  <Gantt init={init} />
</Editor>
```

### 커스텀 필드 추가

```tsx
import { Editor, registerEditorItem } from "@svar-ui/react-gantt";

registerEditorItem("priority", {
  type: "select",
  label: "우선순위",
  options: [
    { id: "low", label: "낮음" },
    { id: "medium", label: "보통" },
    { id: "high", label: "높음" },
    { id: "critical", label: "긴급" }
  ]
});

registerEditorItem("assignee", {
  type: "text",
  label: "담당자",
  validate: (value) => {
    if (!value) return "담당자를 지정하세요";
    return null;
  }
});

registerEditorItem("tags", {
  type: "multiselect",
  label: "태그",
  options: [
    { id: "frontend", label: "프론트엔드" },
    { id: "backend", label: "백엔드" },
    { id: "design", label: "디자인" }
  ]
});
```

### 필드 검증

```tsx
registerEditorItem("budget", {
  type: "number",
  label: "예산",
  validate: (value) => {
    if (value < 0) {
      return "예산은 0 이상이어야 합니다";
    }
    if (value > 1000000) {
      return "예산이 너무 큽니다";
    }
    return null;
  }
});
```

### Sidebar vs Modal

```tsx
// Sidebar 모드 (기본)
<Editor api={api} mode="sidebar">
  <Gantt init={init} />
</Editor>

// Modal 모드
<Editor api={api} mode="modal">
  <Gantt init={init} />
</Editor>
```

---

## Tooltip 설정

작업 바에 마우스 오버 시 툴팁을 설정합니다.

### 기본 사용

```tsx
import { Tooltip } from "@svar-ui/react-gantt";

<Tooltip api={api}>
  <Gantt init={init} />
</Tooltip>
```

### 커스텀 툴팁 템플릿

```tsx
const customTooltipTemplate = (task) => {
  return `
    <div class="custom-tooltip">
      <h3>${task.text}</h3>
      <p>시작: ${formatDate(task.start)}</p>
      <p>종료: ${formatDate(task.end)}</p>
      <p>진행률: ${task.progress}%</p>
      ${task.assignee ? `<p>담당: ${task.assignee}</p>` : ''}
    </div>
  `;
};

<Tooltip api={api} template={customTooltipTemplate}>
  <Gantt init={init} />
</Tooltip>
```

---

## Zoom 설정

차트 줌 레벨을 설정합니다.

### 기본 줌 레벨

```tsx
const zoom = {
  levels: [
    // 레벨 0 - 년/월
    [
      { unit: "year", step: 1, format: "yyyy" },
      { unit: "month", step: 1, format: "MMM" }
    ],
    // 레벨 1 - 월/주
    [
      { unit: "month", step: 1, format: "MMMM yyyy" },
      { unit: "week", step: 1, format: "w" }
    ],
    // 레벨 2 - 월/일
    [
      { unit: "month", step: 1, format: "MMMM yyyy" },
      { unit: "day", step: 1, format: "d" }
    ],
    // 레벨 3 - 일/시간
    [
      { unit: "day", step: 1, format: "d MMM" },
      { unit: "hour", step: 1, format: "HH" }
    ]
  ],
  minCellWidth: 100,  // v1.1+
  maxCellWidth: 200   // v1.1+
};

<Gantt zoom={zoom} />
```

### 마우스 휠 줌

기본적으로 활성화되어 있습니다. 차트 영역에서 Ctrl + 마우스 휠로 줌 가능.

### 프로그래매틱 줌

```tsx
// 특정 레벨로 줌
api.exec("zoom-scale", { level: 2 });

// 줌 인
api.exec("zoom-scale", { level: currentLevel + 1 });

// 줌 아웃
api.exec("zoom-scale", { level: currentLevel - 1 });
```

---

## Styling 설정

Gantt 차트의 스타일을 커스터마이징합니다.

### 테마 적용

```tsx
import { Gantt, Willow, WillowDark } from "@svar-ui/react-gantt";

// Light 테마
<Willow>
  <Gantt tasks={tasks} />
</Willow>

// Dark 테마
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
.gantt-wrapper {
  /* Task colors */
  --wx-gantt-task-color: #3983eb;
  --wx-gantt-task-font-color: #fff;
  --wx-gantt-task-fill-color: #1f6bd9;
  --wx-gantt-task-border-color: #1f6bd9;
  
  /* Project/Summary colors */
  --wx-gantt-project-color: #00ba94;
  --wx-gantt-project-font-color: #ffffff;
  --wx-gantt-project-fill-color: #099f81;
  --wx-gantt-project-border-color: #099f81;
  
  /* Milestone colors */
  --wx-gantt-milestone-color: #ad44ab;
  
  /* Borders */
  --wx-gantt-border: 1px solid #1d1e261a;
  --wx-gantt-bar-border-radius: 3px;
  --wx-gantt-milestone-border-radius: 3px;
  
  /* Grid */
  --wx-grid-header-font-color: #333;
  --wx-grid-body-font-color: #666;
  --wx-grid-body-row-border: 1px solid #eee;
  
  /* Timescale */
  --wx-timescale-font-color: #333;
  --wx-timescale-border: 1px solid #eee;
  
  /* Holiday */
  --wx-gantt-holiday-background: #f0f6fa;
  --wx-gantt-holiday-color: #9fa1ae;
  
  /* Selection */
  --wx-gantt-select-color: #eaedf5;
  
  /* Links */
  --wx-gantt-link-color: #9fa1ae;
  --wx-gantt-link-marker-background: #eaedf5;
  --wx-gantt-link-marker-color: #9fa1ae;
  
  /* Progress */
  --wx-gantt-progress-marker-height: 26px;
  --wx-gantt-progress-border-color: #c0c3ce;
}
```

### 커스텀 CSS 클래스

```tsx
<div className="custom-gantt">
  <Gantt tasks={tasks} />
</div>
```

```css
.custom-gantt {
  --wx-gantt-task-color: #ff6b6b;
  --wx-gantt-project-color: #4ecdc4;
  --wx-gantt-milestone-color: #ffe66d;
}

.custom-gantt .wx-gantt-task {
  box-shadow: 0 2px 4px rgba(0,0,0,0.1);
}
```

### Task Template

```tsx
const taskTemplate = (task) => {
  return `
    <div class="custom-task-bar" style="background: ${task.color || '#3983eb'}">
      <span class="task-text">${task.text}</span>
      <span class="task-progress">${task.progress}%</span>
    </div>
  `;
};

<Gantt taskTemplate={taskTemplate} />
```

---

## 추가 설정

### Highlight Time

특정 시간 범위 강조:

```tsx
const highlightTime = [
  {
    from: new Date(2024, 5, 1),
    to: new Date(2024, 5, 7)  // 주말 강조
  },
  {
    from: new Date(2024, 6, 15),
    to: new Date(2024, 6, 15)  // 특정 날짜
  }
];

<Gantt highlightTime={highlightTime} />
```

### Cell Borders

```tsx
<Gantt cellBorders="full" />
// "none" | "vertical" | "horizontal" | "full"
```

### Cell Sizes

```tsx
<Gantt 
  cellWidth={100}
  cellHeight={40}
  scaleHeight={50}
/>
```

### Duration & Length Units (v2.3+)

```tsx
<Gantt 
  durationUnit="hour"  // "day" | "hour"
  lengthUnit="minute"  // "minute" | "hour" | "day" | ...
/>
```

---

이 가이드는 SVAR React Gantt v2.3.3을 기준으로 작성되었습니다.

