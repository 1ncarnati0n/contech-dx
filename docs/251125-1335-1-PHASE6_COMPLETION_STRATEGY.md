# Phase 6 완료 전략

> **목표**: Supabase 통합 완료 + 4가지 핵심 개선사항 구현  
> **예상 시간**: 3-4시간

---

## 📊 현재 코드 분석 결과

### ✅ 완료된 사항

#### 1. **데이터베이스 (Supabase)**
- ✅ `projects` 테이블 (9개 컬럼)
- ✅ `gantt_charts` 테이블
- ✅ `tasks` 테이블 (18개 샘플 데이터)
- ✅ `links` 테이블 (5개 샘플 데이터)
- ✅ RLS 정책 완료

#### 2. **서비스 레이어**
- ✅ `projects.ts` (CRUD + Mock 모드)
- ✅ `ganttCharts.ts` (CRUD + Mock 모드)
- ✅ `tasks.ts` (CRUD + Mock 모드)
- ✅ `links.ts` (CRUD + Mock 모드)
- ✅ `mockStorage.ts` (LocalStorage 기반)

#### 3. **UI 컴포넌트**
- ✅ `ProjectList` (검색/필터 기능)
- ✅ `ProjectCard` (프로젝트 카드)
- ✅ `ProjectDetailClient` (프로젝트 상세)
- ✅ `GanttChartPageClient` (Gantt 차트 표시)
- ✅ `AdminDropdown` (관리자 드롭다운)
- ✅ `NavBar` (내비게이션)

#### 4. **데이터**
- ✅ `public/mock.json` (18개 Tasks, 5개 Links)
  - 다양한 Task Type: summary, task, urgent, progress, round, milestone, narrow
  - 계층 구조 (parent 관계)
  - CP 지하골조 실제 공정 데이터

---

## 🎯 4가지 핵심 작업

### **Task 1**: Gantt 테스트 링크를 AdminDropdown으로 이동

**현재 문제**:
```tsx
// NavBar.tsx (라인 56-61)
<Link href="/gantt-test" ...>
  <GanttChart className="w-4 h-4" />
  Gantt 차트
</Link>
```
→ 일반 메뉴에 노출 중

**해결 방안**:
```tsx
// AdminDropdown.tsx에 추가
<Link href="/gantt-test" className="...">
  <TestTube className="w-4 h-4" />
  Gantt 테스트
</Link>
```

**파일 수정**:
- `src/components/layout/NavBar.tsx` (제거)
- `src/components/layout/AdminDropdown.tsx` (추가)

---

### **Task 2**: 프로젝트 생성 모달 구현

**현재 상태**:
```tsx
// ProjectList.tsx (라인 59-62)
const handleCreateClick = () => {
  alert('프로젝트 생성 모달 구현 예정');
};
```

**구현 계획**:

#### 2-1. 모달 컴포넌트 생성
**파일**: `src/components/projects/ProjectCreateModal.tsx`

**기능**:
- React Hook Form + Zod 검증
- 필드:
  - 프로젝트명 (필수)
  - 설명
  - 위치
  - 클라이언트
  - 계약금액
  - 시작일 (필수)
  - 종료일
  - 상태 (planning, active, dummy 등)
- 제출 시 `createProject()` 호출
- 생성 후 프로젝트 상세 페이지로 이동

#### 2-2. UI 패턴
```tsx
<Dialog open={isOpen} onOpenChange={setIsOpen}>
  <DialogContent>
    <DialogHeader>새 프로젝트 생성</DialogHeader>
    <form onSubmit={handleSubmit(onSubmit)}>
      <Input label="프로젝트명" {...register('name')} />
      <Textarea label="설명" {...register('description')} />
      <Input label="위치" {...register('location')} />
      <Input label="클라이언트" {...register('client')} />
      <Input type="number" label="계약금액" {...register('contract_amount')} />
      <Input type="date" label="시작일" {...register('start_date')} />
      <Input type="date" label="종료일" {...register('end_date')} />
      <Select label="상태" {...register('status')}>
        <option value="planning">기획</option>
        <option value="active">진행중</option>
        {isAdmin && <option value="dummy">테스트 (관리자 전용)</option>}
      </Select>
      <Button type="submit">생성</Button>
    </form>
  </DialogContent>
</Dialog>
```

#### 2-3. 파일 수정
- `src/components/projects/ProjectCreateModal.tsx` (신규)
- `src/components/projects/ProjectList.tsx` (모달 연동)
- `src/components/projects/index.ts` (export)

---

### **Task 3**: 'dummy' 상태 추가 (관리자 전용)

**현재 상태**:
```tsx
// ProjectDetailClient.tsx (라인 28-34)
const STATUS_COLORS = {
  planning: 'bg-blue-100...',
  active: 'bg-green-100...',
  completed: 'bg-gray-100...',
  on_hold: 'bg-yellow-100...',
  cancelled: 'bg-red-100...',
};
```

**추가 사항**:

#### 3-1. 타입 정의
**파일**: `src/lib/types.ts`
```typescript
export type ProjectStatus = 
  | 'planning' 
  | 'active' 
  | 'completed' 
  | 'on_hold' 
  | 'cancelled'
  | 'dummy';  // 추가
```

#### 3-2. UI 업데이트
```tsx
const STATUS_COLORS = {
  // ... 기존 ...
  dummy: 'bg-purple-100 dark:bg-purple-900/30 text-purple-700 dark:text-purple-300 border-2 border-purple-400',
};

const STATUS_LABELS = {
  // ... 기존 ...
  dummy: '🧪 테스트',
};
```

#### 3-3. 필터링 로직
```tsx
// ProjectList.tsx
const filteredProjects = useMemo(() => {
  let filtered = projects;
  
  // 관리자가 아니면 dummy 프로젝트 숨김
  if (!isAdmin) {
    filtered = filtered.filter(p => p.status !== 'dummy');
  }
  
  // ... 기존 필터 로직 ...
  
  return filtered;
}, [projects, isAdmin, searchQuery, statusFilter]);
```

#### 3-4. 데이터베이스 스키마
**파일**: `schema-projects.sql`
```sql
-- 라인 36 수정
status TEXT DEFAULT 'planning' CHECK (
  status IN ('planning', 'active', 'completed', 'on_hold', 'cancelled', 'dummy')
),
```

#### 3-5. 파일 수정
- `src/lib/types.ts` (타입 추가)
- `src/components/projects/ProjectDetailClient.tsx` (색상/레이블 추가)
- `src/components/projects/ProjectCard.tsx` (색상/레이블 추가)
- `src/components/projects/ProjectList.tsx` (필터링 추가)
- `schema-projects.sql` (CHECK 제약 조건 수정)

---

### **Task 4**: Dummy 프로젝트에 mock.json 데이터 자동 생성

**목표**: 
- dummy 상태 프로젝트 생성 시 `public/mock.json`의 전체 데이터를 자동으로 Gantt 차트로 생성

**구현 계획**:

#### 4-1. mock.json 변환 유틸리티
**파일**: `src/lib/gantt/utils/mockDataConverter.ts`

```typescript
import mockData from '@/../public/mock.json';
import type { Task, Link } from '@/lib/gantt/types';

/**
 * mock.json의 tasks를 Supabase tasks 형식으로 변환
 */
export function convertMockTasksToSupabase(ganttChartId: string): Omit<Task, 'id'>[] {
  return mockData.tasks.map(task => {
    // temp:// ID를 UUID 형식으로 매핑 필요
    // 또는 Supabase 삽입 시 자동 생성
    
    return {
      gantt_chart_id: ganttChartId,
      text: task.text,
      type: task.type,
      start_date: task.start, // 'YYYY-MM-DD' 형식
      end_date: task.end || null,
      progress: task.progress || 0,
      parent_id: task.parent === 0 ? null : String(task.parent),
      position: mockData.tasks.indexOf(task),
      open: task.open !== undefined ? task.open : true,
    };
  });
}

/**
 * mock.json의 links를 Supabase links 형식으로 변환
 */
export function convertMockLinksToSupabase(ganttChartId: string): Omit<Link, 'id'>[] {
  return mockData.links.map(link => ({
    gantt_chart_id: ganttChartId,
    source: String(link.source),
    target: String(link.target),
    type: link.type,
  }));
}
```

#### 4-2. 샘플 Gantt 차트 생성 함수
**파일**: `src/lib/services/ganttCharts.ts` (추가)

```typescript
/**
 * Dummy 프로젝트를 위한 샘플 Gantt 차트 생성
 * public/mock.json 데이터를 사용하여 완전한 Gantt 차트 생성
 */
export async function createSampleGanttChartForDummyProject(
  projectId: string
): Promise<GanttChart> {
  // 1. Gantt 차트 생성
  const ganttChart = await createGanttChart({
    project_id: projectId,
    name: 'CP 지하골조 샘플 공정표',
    description: 'mock.json 기반 골조공사 샘플 데이터',
    start_date: '2025-11-04',
    end_date: '2025-12-30',
  });

  // 2. Tasks 일괄 생성
  const tasksData = convertMockTasksToSupabase(ganttChart.id);
  await createTasksBatch(tasksData, ganttChart.id);

  // 3. Links 일괄 생성
  const linksData = convertMockLinksToSupabase(ganttChart.id);
  await createLinksBatch(linksData, ganttChart.id);

  return ganttChart;
}
```

#### 4-3. 프로젝트 생성 시 자동 호출
**파일**: `src/components/projects/ProjectCreateModal.tsx`

```typescript
const onSubmit = async (data: ProjectFormData) => {
  try {
    setIsSubmitting(true);
    
    // 1. 프로젝트 생성
    const newProject = await createProject({
      ...data,
      created_by: user.id,
    });

    // 2. dummy 프로젝트면 샘플 Gantt 차트 자동 생성
    if (data.status === 'dummy') {
      await createSampleGanttChartForDummyProject(newProject.id);
      toast.success('테스트 프로젝트와 샘플 Gantt 차트가 생성되었습니다!');
    } else {
      toast.success('프로젝트가 생성되었습니다!');
    }

    // 3. 프로젝트 상세 페이지로 이동
    router.push(`/projects/${newProject.id}`);
    
    onClose();
  } catch (error) {
    console.error('Failed to create project:', error);
    toast.error('프로젝트 생성에 실패했습니다.');
  } finally {
    setIsSubmitting(false);
  }
};
```

#### 4-4. ID 매핑 전략

**문제**: `mock.json`의 ID는 `"temp://1761624298866"` 형식이고, Supabase는 UUID

**해결 방법 1** (권장): Supabase에서 자동 생성
```typescript
// tasks 삽입 시 id는 제외하고, parent_id는 temp ID 그대로 사용
// 삽입 후 반환된 UUID와 temp ID를 매핑 테이블에 저장
const idMapping = new Map<string, string>();

for (const taskData of tasksData) {
  const insertedTask = await createTask(taskData, ganttChartId);
  idMapping.set(taskData.original_temp_id, insertedTask.id);
}

// Links 삽입 시 temp ID를 UUID로 변환
for (const linkData of linksData) {
  await createLink({
    ...linkData,
    source: idMapping.get(linkData.source)!,
    target: idMapping.get(linkData.target)!,
  }, ganttChartId);
}
```

**해결 방법 2**: temp ID를 그대로 parent_id로 사용 (간단하지만 비표준)

#### 4-5. 파일 수정/생성
- `src/lib/gantt/utils/mockDataConverter.ts` (신규)
- `src/lib/services/ganttCharts.ts` (함수 추가)
- `src/lib/services/tasks.ts` (createTasksBatch 확인)
- `src/lib/services/links.ts` (createLinksBatch 확인)
- `src/components/projects/ProjectCreateModal.tsx` (자동 생성 로직)

---

## 📋 전체 구현 순서

### **Phase 6-A**: UI 정리 (30분)
- [x] Task 1: Gantt 테스트 링크를 AdminDropdown으로 이동
  - NavBar.tsx 수정
  - AdminDropdown.tsx 수정

### **Phase 6-B**: Dummy 상태 추가 (30분)
- [ ] Task 3-1: 타입 정의 (`src/lib/types.ts`)
- [ ] Task 3-2: UI 컬러/레이블 추가
- [ ] Task 3-3: 필터링 로직 추가
- [ ] Task 3-4: 데이터베이스 스키마 수정

### **Phase 6-C**: 프로젝트 생성 모달 (1시간)
- [ ] Task 2-1: `ProjectCreateModal.tsx` 컴포넌트 생성
- [ ] Task 2-2: Form 검증 (React Hook Form + Zod)
- [ ] Task 2-3: `ProjectList.tsx` 연동
- [ ] Task 2-4: 테스트

### **Phase 6-D**: Mock 데이터 자동 생성 (1-1.5시간)
- [ ] Task 4-1: `mockDataConverter.ts` 유틸리티 작성
- [ ] Task 4-2: `createSampleGanttChartForDummyProject()` 함수
- [ ] Task 4-3: ID 매핑 로직 구현
- [ ] Task 4-4: 프로젝트 생성 모달에서 자동 호출
- [ ] Task 4-5: 테스트 (dummy 프로젝트 생성 → Gantt 차트 확인)

---

## 🎯 예상 결과

### 완료 후 기능

1. **관리자 전용 메뉴**:
   - AdminDropdown → "Gantt 테스트" 링크
   - 일반 사용자는 볼 수 없음

2. **프로젝트 생성**:
   - "새 프로젝트" 버튼 → 모달 팝업
   - 모든 필드 입력 가능
   - 검증 후 생성

3. **Dummy 프로젝트**:
   - 관리자만 생성 가능
   - 프로젝트 목록에서 🧪 테스트 뱃지 표시
   - 일반 사용자는 목록에서 숨김

4. **자동 샘플 데이터**:
   - Dummy 프로젝트 생성 시
   - mock.json의 18개 Task 자동 생성
   - mock.json의 5개 Link 자동 생성
   - 즉시 Gantt 차트 사용 가능

---

## 📁 파일 구조

```
contech-dx/
├── schema-projects.sql                     # 수정 (dummy 상태 추가)
├── src/
│   ├── lib/
│   │   ├── types.ts                        # 수정 (ProjectStatus에 dummy 추가)
│   │   ├── gantt/
│   │   │   └── utils/
│   │   │       └── mockDataConverter.ts   # 신규 (mock.json 변환)
│   │   └── services/
│   │       └── ganttCharts.ts              # 수정 (샘플 생성 함수)
│   └── components/
│       ├── layout/
│       │   ├── NavBar.tsx                  # 수정 (Gantt 테스트 링크 제거)
│       │   └── AdminDropdown.tsx           # 수정 (Gantt 테스트 링크 추가)
│       └── projects/
│           ├── ProjectCreateModal.tsx      # 신규 (생성 모달)
│           ├── ProjectList.tsx             # 수정 (모달 연동, 필터링)
│           ├── ProjectCard.tsx             # 수정 (dummy 색상/레이블)
│           ├── ProjectDetailClient.tsx     # 수정 (dummy 색상/레이블)
│           └── index.ts                    # 수정 (export 추가)
```

---

## 🚀 다음 단계 제안

**Phase 6 완료 후**:
1. Phase 7: Gantt 차트 편집 기능 강화
2. Phase 8: 대시보드 구현
3. Phase 9: 권한 관리 UI 개선
4. Phase 10: WBS/EVMS 개념 도입

---

**작성**: AI Assistant  
**버전**: 1.0  
**상태**: Phase 6-A ~ 6-D 실행 대기

