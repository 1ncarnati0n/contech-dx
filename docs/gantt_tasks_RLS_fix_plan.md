# gantt_tasks RLS 정책 수정 계획

## 1. 문제 요약

### 증상
새 CP(Control Point) 태스크 생성 시 RLS(Row-Level Security) 정책 위반 오류 발생

### 에러 메시지
```
"new row violates row-level security policy for table "gantt_tasks""
error.code: "42501"
```

### 영향받는 사용자 정보
- userId: `ebb4dd59-196d-4f6c-b336-6a4f42453d96`
- email: `23224014@laonarctec.co.kr`
- projectId: `7a0ed4bc-5c25-43fc-ab9e-d6aeda365e1b`

---

## 2. 원인 분석

### 2.1 현재 RLS 정책

**파일 위치**: `apps/web/sql/schema/schema-gantt.sql` (150-161줄)

```sql
DROP POLICY IF EXISTS "Users can access their project tasks" ON gantt_tasks;
CREATE POLICY "Users can access their project tasks"
    ON gantt_tasks FOR ALL
    USING (
        project_id IN (
            SELECT id FROM projects WHERE created_by = auth.uid()
        )
        OR
        project_id IN (
            SELECT project_id FROM project_members WHERE user_id = auth.uid()
        )
    );
```

### 2.2 정책의 접근 권한 체크 로직

사용자가 다음 조건 중 하나를 만족해야 접근 가능:
1. **프로젝트 소유자**: `projects` 테이블에서 `created_by = auth.uid()`
2. **프로젝트 멤버**: `project_members` 테이블에 `user_id = auth.uid()` 레코드 존재

### 2.3 핵심 문제점

| 문제 | 설명 |
|------|------|
| **`WITH CHECK` 절 누락** | `FOR ALL` 정책에 `USING` 절만 있고 `WITH CHECK` 절이 없음 |
| **INSERT 차단** | PostgreSQL에서 INSERT 시 새 행 검증을 위해 `WITH CHECK` 절 필요 |
| **UPDATE 차단** | UPDATE 시 변경된 행 검증도 `WITH CHECK` 절 필요 |

### 2.4 PostgreSQL RLS 동작 원리

```
┌─────────────────────────────────────────────────────────────────┐
│ FOR ALL 정책의 절(clause)별 동작                                  │
├─────────────────┬────────┬────────┬────────┬────────────────────┤
│ 절(Clause)      │ SELECT │ INSERT │ UPDATE │ DELETE             │
├─────────────────┼────────┼────────┼────────┼────────────────────┤
│ USING only      │   ✅   │   ❌   │ △ 기존행│   ✅               │
│ WITH CHECK only │   -    │   ✅   │ △ 새행 │   -                │
│ 둘 다 있음       │   ✅   │   ✅   │   ✅   │   ✅               │
└─────────────────┴────────┴────────┴────────┴────────────────────┘

현재 상태: USING만 있음 → SELECT/DELETE만 가능, INSERT/UPDATE 불가
```

### 2.5 createTask 메서드가 삽입하는 데이터

**파일**: `apps/web/src/lib/services/SupabaseGanttDataService.ts` (125-155줄)

```typescript
// taskToRow() 함수에서 생성하는 행 데이터
{
  id: string;           // UUID
  project_id: string;   // ← RLS 정책이 이 필드를 체크
  parent_id: string | null;
  wbs_level: number;
  type: string;         // 'CP', 'GROUP', 'TASK' 등
  name: string;
  start_date: string;   // YYYY-MM-DD
  end_date: string;     // YYYY-MM-DD
  cp_data: object | null;
  task_data: object | null;
  group_data: object | null;
  dependencies: object[];
  is_expanded: boolean;
  sort_order: number;
}
```

**참고**: `created_by` 또는 `user_id` 필드는 gantt_tasks 테이블에 없음. 권한은 오직 `project_id`를 통해 체크됨.

---

## 3. 해결 방안

### 3.1 수정할 파일

```
apps/web/sql/schema/schema-gantt.sql
```

### 3.2 변경 내용

**기존 코드 (150-161줄)**:
```sql
DROP POLICY IF EXISTS "Users can access their project tasks" ON gantt_tasks;
CREATE POLICY "Users can access their project tasks"
    ON gantt_tasks FOR ALL
    USING (
        project_id IN (
            SELECT id FROM projects WHERE created_by = auth.uid()
        )
        OR
        project_id IN (
            SELECT project_id FROM project_members WHERE user_id = auth.uid()
        )
    );
```

**수정 후**:
```sql
DROP POLICY IF EXISTS "Users can access their project tasks" ON gantt_tasks;
CREATE POLICY "Users can access their project tasks"
    ON gantt_tasks FOR ALL
    USING (
        project_id IN (
            SELECT id FROM projects WHERE created_by = auth.uid()
        )
        OR
        project_id IN (
            SELECT project_id FROM project_members WHERE user_id = auth.uid()
        )
    )
    WITH CHECK (
        project_id IN (
            SELECT id FROM projects WHERE created_by = auth.uid()
        )
        OR
        project_id IN (
            SELECT project_id FROM project_members WHERE user_id = auth.uid()
        )
    );
```

### 3.3 변경 사항 요약

| 변경 전 | 변경 후 |
|---------|---------|
| `USING` 절만 존재 | `USING` + `WITH CHECK` 절 추가 |
| SELECT/DELETE만 허용 | SELECT/INSERT/UPDATE/DELETE 모두 허용 |

---

## 4. Supabase 대시보드에서 실행할 SQL

아래 SQL을 Supabase 대시보드의 **SQL Editor**에서 실행:

```sql
-- =====================================================
-- gantt_tasks RLS 정책 수정
-- 문제: FOR ALL + USING만 있어서 INSERT/UPDATE 불가
-- 해결: WITH CHECK 절 추가
-- =====================================================

-- 기존 정책 삭제
DROP POLICY IF EXISTS "Users can access their project tasks" ON gantt_tasks;

-- 새 정책 생성 (WITH CHECK 포함)
CREATE POLICY "Users can access their project tasks"
    ON gantt_tasks FOR ALL
    USING (
        project_id IN (
            SELECT id FROM projects WHERE created_by = auth.uid()
        )
        OR
        project_id IN (
            SELECT project_id FROM project_members WHERE user_id = auth.uid()
        )
    )
    WITH CHECK (
        project_id IN (
            SELECT id FROM projects WHERE created_by = auth.uid()
        )
        OR
        project_id IN (
            SELECT project_id FROM project_members WHERE user_id = auth.uid()
        )
    );

-- 정책 확인
SELECT
    schemaname,
    tablename,
    policyname,
    permissive,
    roles,
    cmd,
    qual,
    with_check
FROM pg_policies
WHERE tablename = 'gantt_tasks';
```

---

## 5. 검증 방법

### 5.1 SQL 실행 후 정책 확인
위 SQL의 마지막 SELECT 쿼리 결과에서:
- `with_check` 컬럼에 값이 있어야 함 (NULL이 아님)

### 5.2 기능 테스트
1. **CP 생성 테스트**: 간트 차트에서 새 CP 생성 → 성공해야 함
2. **태스크 수정 테스트**: 기존 태스크 날짜/이름 수정 → 성공해야 함
3. **권한 없는 사용자 테스트**: 프로젝트 멤버가 아닌 사용자 → 여전히 차단되어야 함

---

## 6. 추가 고려사항

### 6.1 다른 테이블도 동일한 문제가 있을 수 있음
`gantt_milestones`, `gantt_dependencies` 등 다른 간트 관련 테이블의 RLS 정책도 확인 필요

### 6.2 롤백 방법
문제 발생 시 기존 정책으로 롤백:
```sql
DROP POLICY IF EXISTS "Users can access their project tasks" ON gantt_tasks;
CREATE POLICY "Users can access their project tasks"
    ON gantt_tasks FOR ALL
    USING (
        project_id IN (
            SELECT id FROM projects WHERE created_by = auth.uid()
        )
        OR
        project_id IN (
            SELECT project_id FROM project_members WHERE user_id = auth.uid()
        )
    );
```
