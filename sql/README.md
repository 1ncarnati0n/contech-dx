# SQL 파일 구조 및 실행 가이드

> **Contech-DX 프로젝트 데이터베이스 설정 가이드**  
> 작성일: 2025-11-25

---

## 📁 폴더 구조

```
sql/
├── schema/              # 메인 데이터베이스 스키마
│   ├── schema-roles.sql
│   └── schema-projects.sql
├── migrations/          # 스키마 수정/업데이트
│   ├── fix-existing-tables.sql
│   ├── fix-date-type-issue.sql
│   └── update-schema-for-dummy.sql
└── seeds/               # 샘플 데이터
    └── seed-construction-sample.sql
```

---

## 🚀 초기 설정 (처음 시작할 때)

### **Step 1: 기본 스키마 생성** (필수)

#### 1-1. 사용자 권한 스키마
**파일**: `schema/schema-roles.sql`

```sql
-- profiles 테이블 (사용자 정보)
-- 역할: viewer, member, creator, moderator, admin, system_admin
```

**실행**:
```bash
Supabase SQL Editor → schema/schema-roles.sql 내용 복사 → Run
```

#### 1-2. 프로젝트 관리 스키마
**파일**: `schema/schema-projects.sql`

```sql
-- projects 테이블 (프로젝트 정보)
-- project_members 테이블 (프로젝트 멤버)
-- gantt_charts 테이블 (Gantt 차트)
-- tasks 테이블 (작업)
-- links 테이블 (작업 연결)
-- RLS 정책 (Row Level Security)
```

**실행**:
```bash
Supabase SQL Editor → schema/schema-projects.sql 내용 복사 → Run
```

---

## 🔧 스키마 수정 (이미 테이블이 있는 경우)

### **Migration 1: 기존 테이블 제거 및 재생성**
**파일**: `migrations/fix-existing-tables.sql`

**목적**: 구버전 테이블 삭제 후 새 스키마로 재생성

**주의**: ⚠️ **모든 데이터가 삭제됩니다!**

**실행**:
```bash
Supabase SQL Editor → migrations/fix-existing-tables.sql → Run
↓
schema/schema-projects.sql 다시 실행
```

### **Migration 2: 날짜 타입 수정**
**파일**: `migrations/fix-date-type-issue.sql`

**목적**: DATE 타입 → TEXT 타입 변경

**문제**:
- Supabase: `DATE` 타입 (PostgreSQL)
- 애플리케이션: `TEXT` (문자열 'YYYY-MM-DD')
- 충돌: 빈 문자열 `""` → DATE 변환 실패

**해결**:
```sql
ALTER TABLE projects 
  ALTER COLUMN start_date TYPE TEXT;
ALTER TABLE projects 
  ALTER COLUMN end_date TYPE TEXT;
```

**실행**:
```bash
Supabase SQL Editor → migrations/fix-date-type-issue.sql → Run
```

### **Migration 3: Dummy 상태 추가**
**파일**: `migrations/update-schema-for-dummy.sql`

**목적**: 프로젝트 상태에 'dummy' 추가 (테스트용)

**변경**:
```sql
-- 기존: 'planning', 'active', 'completed', 'on_hold', 'cancelled'
-- 추가: 'dummy'
```

**실행**:
```bash
Supabase SQL Editor → migrations/update-schema-for-dummy.sql → Run
```

---

## 🌱 샘플 데이터 삽입

### **Seed 1: 골조공사 샘플 데이터**
**파일**: `seeds/seed-construction-sample.sql`

**내용**:
- 프로젝트 1개: "서울 강남 오피스 빌딩 신축"
- Gantt 차트 1개: "CP 지하골조 공정표"
- Tasks 18개: 벽체(유로폼), 슬래브(합판거푸집)
- Links 5개: 작업 간 의존성

**실행**:
```bash
Supabase SQL Editor → seeds/seed-construction-sample.sql → Run
```

**확인**:
```sql
SELECT * FROM projects WHERE id = 'a0000000-0000-0000-0000-000000000100';
SELECT * FROM tasks WHERE gantt_chart_id = 'b0000000-0000-0000-0000-000000000100';
```

---

## 📋 실행 순서 요약

### **시나리오 1: 완전 새로 시작** (권장)

```
1. schema/schema-roles.sql           (필수)
2. schema/schema-projects.sql        (필수)
3. migrations/fix-date-type-issue.sql    (필수!)
4. migrations/update-schema-for-dummy.sql (권장)
5. seeds/seed-construction-sample.sql    (선택)
```

### **시나리오 2: 기존 테이블이 있는 경우**

```
1. migrations/fix-existing-tables.sql     (테이블 삭제)
   ↓
2. schema/schema-roles.sql
3. schema/schema-projects.sql
4. migrations/fix-date-type-issue.sql
5. migrations/update-schema-for-dummy.sql
6. seeds/seed-construction-sample.sql
```

### **시나리오 3: 날짜 타입 오류만 수정**

```
현재 상태에서:
1. migrations/fix-date-type-issue.sql (DATE → TEXT)
2. migrations/update-schema-for-dummy.sql (dummy 상태)
```

---

## 🐛 트러블슈팅

### **문제 1: "relation already exists"**
**원인**: 테이블이 이미 존재  
**해결**: `migrations/fix-existing-tables.sql` 실행 후 다시 시도

### **문제 2: "invalid input syntax for type date"**
**원인**: DATE 타입에 빈 문자열 전송  
**해결**: `migrations/fix-date-type-issue.sql` 실행 (DATE → TEXT)

### **문제 3: "status" does not exist in CHECK constraint**
**원인**: dummy 상태가 CHECK 제약 조건에 없음  
**해결**: `migrations/update-schema-for-dummy.sql` 실행

### **문제 4: RLS 정책 에러**
**원인**: RLS 정책이 제대로 설정 안 됨  
**해결**: `schema/schema-projects.sql` 다시 실행

---

## ✅ 검증 쿼리

### **테이블 존재 확인**
```sql
SELECT tablename 
FROM pg_tables 
WHERE schemaname = 'public' 
  AND tablename IN ('projects', 'gantt_charts', 'tasks', 'links')
ORDER BY tablename;
```

### **컬럼 타입 확인**
```sql
SELECT 
  table_name, 
  column_name, 
  data_type 
FROM information_schema.columns
WHERE table_name IN ('projects', 'gantt_charts')
  AND column_name IN ('start_date', 'end_date')
ORDER BY table_name, column_name;
```
**예상 결과**: 모두 `text` 타입

### **CHECK 제약 조건 확인**
```sql
SELECT 
  conname AS constraint_name, 
  pg_get_constraintdef(oid) AS constraint_definition
FROM pg_constraint
WHERE conrelid = 'projects'::regclass
  AND conname = 'projects_status_check';
```
**예상 결과**: `dummy` 포함

### **샘플 데이터 확인**
```sql
-- 프로젝트 개수
SELECT COUNT(*) FROM projects;

-- Tasks 개수
SELECT COUNT(*) FROM tasks;

-- Links 개수
SELECT COUNT(*) FROM links;
```

---

## 📝 참고 사항

### **DATE vs TEXT 타입**
- **DATE**: PostgreSQL 네이티브 날짜 타입
  - 장점: 날짜 연산, 검증, 인덱싱
  - 단점: 빈 문자열 불가, 엄격한 형식
- **TEXT**: 문자열 타입 ('YYYY-MM-DD')
  - 장점: 유연함, 빈 문자열 허용, Next.js와 호환
  - 단점: 날짜 검증 없음, 수동 형식 관리

**선택**: TEXT (애플리케이션과의 일관성)

### **RLS (Row Level Security)**
- 프로젝트 생성자만 삭제 가능
- PM/Engineer만 Gantt 차트 수정 가능
- 프로젝트 멤버만 데이터 조회 가능

---

**작성자**: AI Assistant  
**버전**: 1.0  
**최종 업데이트**: 2025-11-25
