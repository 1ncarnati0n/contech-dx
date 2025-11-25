# Phase 1: 데이터베이스 스키마 설정 가이드

> **목표**: 프로젝트 관리 시스템을 위한 데이터베이스 스키마 구축

## 📋 Phase 1 체크리스트

- [ ] 1. SQL 파일 실행
- [ ] 2. 테이블 생성 확인
- [ ] 3. RLS 정책 확인
- [ ] 4. 샘플 데이터 확인
- [ ] 5. 권한 테스트

---

## 🗄️ 생성되는 테이블

### 1. `projects` - 프로젝트 정보
```
┌─────────────────────────────────────────────┐
│ projects                                    │
├─────────────────────────────────────────────┤
│ id                UUID (PK)                 │
│ name              TEXT                      │
│ description       TEXT                      │
│ location          TEXT                      │
│ client            TEXT                      │
│ contract_amount   NUMERIC(15,2)            │
│ start_date        DATE                      │
│ end_date          DATE                      │
│ status            TEXT                      │
│ created_by        UUID (FK → profiles)     │
│ created_at        TIMESTAMPTZ              │
│ updated_at        TIMESTAMPTZ              │
└─────────────────────────────────────────────┘
```

**상태 값**:
- `planning`: 기획 단계
- `active`: 진행 중
- `completed`: 완료
- `on_hold`: 보류
- `cancelled`: 취소

### 2. `project_members` - 프로젝트 팀원
```
┌─────────────────────────────────────────────┐
│ project_members                             │
├─────────────────────────────────────────────┤
│ id                UUID (PK)                 │
│ project_id        UUID (FK → projects)     │
│ user_id           UUID (FK → profiles)     │
│ role              TEXT                      │
│ created_at        TIMESTAMPTZ              │
└─────────────────────────────────────────────┘
UNIQUE(project_id, user_id)
```

**역할 값**:
- `pm`: 프로젝트 매니저
- `engineer`: 엔지니어
- `supervisor`: 감독자
- `worker`: 작업자
- `member`: 일반 멤버

### 3. `gantt_charts` - 간트차트 (기존 수정)
```
project_id에 FK 제약 조건 추가
→ projects(id) ON DELETE CASCADE
```

### 4. `tasks`, `links` - Task/Link (확인)
```
기존 테이블 유지, 인덱스 추가
```

---

## 🚀 설정 방법

### 옵션 A: Supabase에서 직접 실행 (권장)

1. **Supabase Dashboard 접속**
   ```
   https://supabase.com/dashboard
   ```

2. **프로젝트 선택**
   - ConTech-DX 프로젝트 선택

3. **SQL Editor 열기**
   - 왼쪽 메뉴: `SQL Editor` 클릭
   - 또는 `Database` → `SQL Editor`

4. **SQL 파일 복사**
   - `schema-projects.sql` 내용 전체 복사
   - SQL Editor에 붙여넣기

5. **실행**
   - 우측 하단 `Run` 버튼 클릭
   - 또는 `Ctrl/Cmd + Enter`

6. **결과 확인**
   ```sql
   -- 마지막 SELECT 쿼리 결과 확인
   -- projects 테이블에 3개 샘플 데이터가 보여야 함
   ```

### 옵션 B: Mock 모드로 개발 (로컬)

Supabase 설정 없이 개발하려면:

1. `.env.local` 수정
   ```bash
   # Supabase 환경변수 주석 처리
   # NEXT_PUBLIC_SUPABASE_URL=...
   # NEXT_PUBLIC_SUPABASE_ANON_KEY=...
   
   # Mock 모드 활성화
   NEXT_PUBLIC_USE_MOCK=true
   ```

2. Mock 데이터는 LocalStorage에 저장됨
3. 나중에 Supabase로 마이그레이션 가능

---

## ✅ 검증 방법

### 1. 테이블 생성 확인

Supabase Dashboard에서:

```sql
-- 테이블 목록 확인
SELECT tablename 
FROM pg_tables 
WHERE schemaname = 'public' 
  AND tablename IN ('projects', 'project_members', 'gantt_charts', 'tasks', 'links');
```

**예상 결과**:
```
 tablename       
-----------------
 gantt_charts
 links
 project_members
 projects
 tasks
```

### 2. 샘플 데이터 확인

```sql
-- 프로젝트 목록 확인
SELECT 
  name,
  status,
  location,
  to_char(contract_amount, 'FM999,999,999,999') as contract_amount
FROM projects
ORDER BY created_at DESC;
```

**예상 결과**:
```
name                        | status    | location                    | contract_amount
----------------------------+-----------+-----------------------------+------------------
인천 첨단 물류센터           | completed | 인천광역시 연수구...         | 8,500,000,000
부산 해운대 아파트 단지      | planning  | 부산광역시 해운대구...       | 45,000,000,000
서울 강남 오피스 빌딩 신축   | active    | 서울특별시 강남구...         | 15,000,000,000
```

### 3. 외래키 확인

```sql
-- projects → gantt_charts 관계 확인
SELECT 
  tc.table_name, 
  kcu.column_name,
  ccu.table_name AS foreign_table_name,
  ccu.column_name AS foreign_column_name
FROM information_schema.table_constraints AS tc
JOIN information_schema.key_column_usage AS kcu
  ON tc.constraint_name = kcu.constraint_name
JOIN information_schema.constraint_column_usage AS ccu
  ON ccu.constraint_name = tc.constraint_name
WHERE tc.table_name = 'gantt_charts'
  AND tc.constraint_type = 'FOREIGN KEY';
```

**예상 결과**:
```
table_name   | column_name | foreign_table_name | foreign_column_name
-------------+-------------+--------------------+--------------------
gantt_charts | project_id  | projects           | id
```

### 4. RLS 정책 확인

```sql
-- 정책 목록 확인
SELECT 
  schemaname,
  tablename,
  policyname,
  permissive,
  roles,
  cmd
FROM pg_policies
WHERE tablename IN ('projects', 'project_members')
ORDER BY tablename, policyname;
```

**예상 결과**: 10개 이상의 정책이 표시되어야 함

---

## 🔐 권한 테스트

### 테스트 시나리오

#### 1. 프로젝트 조회 (모든 사용자)
```sql
-- 로그인 안 해도 조회 가능
SELECT * FROM projects;
```
✅ 성공해야 함

#### 2. 프로젝트 생성 (인증된 사용자만)
```sql
-- 로그인 후 실행
INSERT INTO projects (name, start_date, created_by, status)
VALUES ('테스트 프로젝트', '2024-01-01', auth.uid(), 'planning');
```
- 로그인 안 함: ❌ 실패
- 로그인 함: ✅ 성공

#### 3. 멤버 추가 (프로젝트 생성자만)
```sql
-- 프로젝트 생성자만 실행 가능
INSERT INTO project_members (project_id, user_id, role)
VALUES ('프로젝트ID', '유저ID', 'engineer');
```
- 프로젝트 생성자: ✅ 성공
- 다른 사용자: ❌ 실패

---

## 🐛 트러블슈팅

### 문제 1: `profiles` 테이블이 없다는 에러

**증상**:
```
ERROR: relation "profiles" does not exist
```

**해결**:
1. `schema.sql` 먼저 실행
2. `schema-roles.sql` 실행
3. `schema-projects.sql` 다시 실행

### 문제 2: RLS 정책 충돌 에러

**증상**:
```
ERROR: policy "..." for table "projects" already exists
```

**해결**:
```sql
-- 기존 정책 삭제
DROP POLICY IF EXISTS "정책이름" ON projects;
```
그리고 다시 실행

### 문제 3: 외래키 제약 조건 에러

**증상**:
```
ERROR: foreign key violation
```

**해결**:
- 샘플 데이터의 `created_by`가 실제 존재하는 user인지 확인
- `profiles` 테이블에 최소 1명의 사용자가 있어야 함

---

## 📊 데이터 관계도

```
profiles (사용자)
    │
    ├─── creates ───────→ projects (프로젝트)
    │                         │
    │                         ├─── has ───→ gantt_charts (간트차트)
    │                         │                 │
    │                         │                 ├─→ tasks (작업)
    │                         │                 └─→ links (연결)
    │                         │
    └─── joins ──→ project_members ←─── belongs to ─── projects
```

---

## 🎯 Phase 1 완료 조건

다음 항목이 모두 체크되면 Phase 2로 진행:

- [x] `projects` 테이블 생성
- [x] `project_members` 테이블 생성
- [x] `gantt_charts` FK 추가
- [x] RLS 정책 12개 이상 설정
- [x] 샘플 데이터 3개 삽입
- [ ] 테이블 생성 확인 쿼리 성공
- [ ] 샘플 데이터 조회 성공
- [ ] 권한 테스트 통과

---

## 🚀 다음 단계

Phase 1 완료 후:

**→ Phase 2: 서비스 레이어 구현**
- `src/lib/services/projects.ts` 생성
- `src/lib/services/projectMembers.ts` 생성
- TypeScript 타입 정의
- Mock 데이터 생성

---

**작성일**: 2025-11-24  
**버전**: 1.0.0  
**상태**: Phase 1 구현 완료

