# sa-gantt-lib → contech-dx 간트차트 통합 계획

> 작성일: 2025-12-17
> 상태: 계획 완료, 구현 대기

## 개요
contech-dx 공정관리의 "간트차트" 탭에 sa-gantt-lib을 통합하여 BuildingProcessPlan 데이터를 시각화합니다.

## 결정 사항
| 항목 | 결정 |
|------|------|
| 설치 방식 | `npm pack` 후 tarball 설치 |
| 데이터 계층 | 동(Building) → 공정(Process) 2단계 |
| 의존성 처리 | 자동 순차 (버림→기초→지하층→셋팅층→기준층→옥탑층) |

---

## 구현 단계

### 1단계: sa-gantt-lib 빌드 및 패키징
```bash
cd /Users/1ncarnati0n/Desktop/tsxPJT/sa-gantt-lib
npm run build
npm pack  # sa-gantt-lib-0.1.0-beta.tgz 생성
```

### 2단계: contech-dx에 설치
```bash
cd /Users/1ncarnati0n/Desktop/tsxPJT/contech-dx
npm install ../sa-gantt-lib/sa-gantt-lib-0.1.0-beta.tgz
```

### 3단계: CSS 임포트
**파일**: `src/app/layout.tsx`
```typescript
import 'sa-gantt-lib/dist/style.css';  // globals.css 뒤에 추가
```

### 4단계: 컴포넌트 생성

#### 디렉토리 구조
```
src/components/gantt/
├── index.ts                    # 배럴 익스포트
├── ProcessGanttChart.tsx       # 메인 래퍼 컴포넌트
├── ProcessDataAdapter.ts       # 데이터 변환 레이어
├── useProcessGanttData.ts      # 데이터 로드/저장 훅
└── types.ts                    # 통합용 타입 정의
```

#### ProcessDataAdapter.ts 핵심 기능
- `transformBuildingProcessPlanToTasks()`: BuildingProcessPlan → ConstructionTask[]
  - Level 1 (CP): 각 동(Building)
  - Level 2 (TASK): 공정 카테고리
  - 순차 의존성: 이전 공정 종료일 = 다음 공정 시작일
- `updateProcessPlanFromTask()`: 간트 수정 → BuildingProcessPlan 역변환

#### useProcessGanttData.ts 핵심 기능
- `getBuildings(projectId)` 호출로 동 목록 로드
- localStorage에서 공정계획 로드 (키: `contech_process_plan_${building.id}`)
- 상태 관리 및 저장 핸들러 제공

#### ProcessGanttChart.tsx 핵심 기능
- 프로젝트 ID로 동 데이터 로드
- 데이터 변환 후 GanttChart에 전달
- onTaskUpdate 콜백으로 수정 사항 저장

### 5단계: ProjectDetailClient 업데이트
**파일**: `src/components/projects/ProjectDetailClient.tsx`
- 플레이스홀더 (lines ~402-411) → ProcessGanttChart 컴포넌트로 교체
- import 추가

---

## 파일 목록

### 수정할 파일
| 파일 | 변경 내용 |
|------|----------|
| `package.json` | sa-gantt-lib 의존성 추가 |
| `src/app/layout.tsx` | CSS 임포트 추가 |
| `src/components/projects/ProjectDetailClient.tsx` | 플레이스홀더 교체 |

### 생성할 파일
| 파일 | 역할 |
|------|------|
| `src/components/gantt/index.ts` | 배럴 익스포트 |
| `src/components/gantt/types.ts` | 통합용 타입 |
| `src/components/gantt/ProcessDataAdapter.ts` | 데이터 변환 |
| `src/components/gantt/useProcessGanttData.ts` | 데이터 훅 |
| `src/components/gantt/ProcessGanttChart.tsx` | 메인 컴포넌트 |

### 참조할 파일
| 파일 | 참조 이유 |
|------|----------|
| `src/lib/types.ts` | BuildingProcessPlan, ProcessCategory 타입 |
| `src/components/buildings/BuildingProcessPlanPage.tsx` | localStorage 패턴 |
| `../sa-gantt-lib/src/lib/types/core.ts` | ConstructionTask 구조 |
| `../sa-gantt-lib/src/App.tsx` | GanttChart 사용 예시 |

---

## 데이터 흐름

```
localStorage (contech_process_plan_${buildingId})
       ↓ 로드
BuildingProcessPlan
       ↓ transformBuildingProcessPlanToTasks()
ConstructionTask[] (Level 1: 동, Level 2: 공정)
       ↓
GanttChart 렌더링
       ↓ 사용자 편집 (드래그/리사이즈)
onTaskUpdate 콜백
       ↓ updateProcessPlanFromTask()
BuildingProcessPlan
       ↓ 저장
localStorage
```

---

## WBS 구조 예시

```
├── 101동 (Level 1, type: CP)
│   ├── 버림 (Level 2, type: TASK) - 5일
│   ├── 기초 (Level 2, type: TASK) - 10일
│   ├── 지하층 (Level 2, type: TASK) - 15일
│   ├── 셋팅층 (Level 2, type: TASK) - 8일
│   ├── 기준층 (Level 2, type: TASK) - 90일
│   └── 옥탑층 (Level 2, type: TASK) - 12일
└── 102동 (Level 1, type: CP)
    ├── 버림 - 5일
    └── ...
```

---

## 기술 호환성

| 항목 | contech-dx | sa-gantt-lib | 호환 |
|------|------------|--------------|------|
| React | 19.2.0 | ^18 \|\| ^19 | ✓ |
| TailwindCSS | v4 | v4 | ✓ |
| 다크모드 | `.dark` 클래스 | `.dark` 클래스 | ✓ |
| date-fns | 4.x | 4.x | ✓ |

---

## 참고: sa-gantt-lib 주요 API

### GanttChart Props
```typescript
<GanttChart
  tasks={tasks}                    // ConstructionTask[]
  milestones={milestones}          // Milestone[]
  initialView="MASTER"             // 'MASTER' | 'DETAIL'
  initialZoomLevel="MONTH"         // 'DAY' | 'WEEK' | 'MONTH'
  onTaskUpdate={handleUpdate}      // (task: ConstructionTask) => void
  onViewChange={handleViewChange}  // (view, cpId) => void
/>
```

### ConstructionTask 구조
```typescript
interface ConstructionTask {
  id: string;
  parentId: string | null;
  wbsLevel: 1 | 2;
  type: 'GROUP' | 'CP' | 'TASK';
  name: string;
  startDate: Date;
  endDate: Date;
  cp?: CPData;      // Level 1용
  task?: TaskData;  // Level 2용
  dependencies: Dependency[];
}
```

---

## 체크리스트

- [ ] sa-gantt-lib 빌드 및 패키징
- [ ] contech-dx에 패키지 설치
- [ ] CSS 임포트 추가
- [ ] gantt/ 컴포넌트 폴더 생성
- [ ] types.ts 작성
- [ ] ProcessDataAdapter.ts 작성
- [ ] useProcessGanttData.ts 작성
- [ ] ProcessGanttChart.tsx 작성
- [ ] index.ts 배럴 익스포트 작성
- [ ] ProjectDetailClient.tsx 업데이트
- [ ] 테스트 및 검증
