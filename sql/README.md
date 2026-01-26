# SQL 파일 구조 및 실행 가이드

> **Contech-DX 프로젝트 데이터베이스 설정 가이드**
> 작성일: 2025-01-26
> 버전: 2.0.0 (SA-Gantt 통합)

---

## 폴더 구조

```
sql/
├── schema/                    # 메인 데이터베이스 스키마
│   ├── schema-roles.sql       # 사용자 권한 및 프로필
│   ├── schema-projects.sql    # 프로젝트 및 멤버 관리
│   └── schema-gantt.sql       # SA-Gantt 차트 데이터
├── migrations/                # 스키마 수정/업데이트
│   ├── add_project_number.sql           # 프로젝트 번호 시퀀스
│   ├── fix-date-type-issue.sql          # 날짜 타입 수정 (선택)
│   ├── update-project-status-values.sql # 상태값 업데이트
│   └── add-admin-policy-project-members.sql # 관리자 정책
└── seeds/                     # 샘플 데이터
    └── (필요시 추가)
```

---

## 테이블 구조

### Core Tables
| 테이블 | 설명 | 스키마 파일 |
|--------|------|-------------|
| `profiles` | 사용자 프로필 및 권한 | schema-roles.sql |
| `projects` | 건축 프로젝트 정보 (project_number로 짧은 URL 지원) | schema-projects.sql |
| `project_members` | 프로젝트 팀원 | schema-projects.sql |

### Project ID 체계
- `id`: UUID (내부 관계용, 외래키)
- `project_number`: INTEGER (URL용, `/projects/1` 형태)

### SA-Gantt Tables
| 테이블 | 설명 | 스키마 파일 |
|--------|------|-------------|
| `gantt_tasks` | 태스크 (GROUP/CP/TASK) | schema-gantt.sql |
| `gantt_milestones` | 마일스톤 (MASTER/DETAIL) | schema-gantt.sql |
| `gantt_dependencies` | 앵커 기반 종속성 | schema-gantt.sql |

---

## 초기 설정 (처음 시작할 때)

### Step 1: 스키마 생성 (순서대로 실행)

```bash
# Supabase SQL Editor에서 순서대로 실행

1. schema/schema-roles.sql        # 사용자 권한 (필수)
2. schema/schema-projects.sql     # 프로젝트 관리 (필수)
3. schema/schema-gantt.sql        # SA-Gantt 테이블 (필수)
```

### Step 2: 마이그레이션 (선택)

```bash
# 필요한 경우에만 실행

4. migrations/add_project_number.sql  # 프로젝트 번호 추가 (권장)
```

---

## 스키마 상세

### 1. schema-roles.sql

사용자 프로필 및 권한 시스템

```sql
-- profiles 테이블
-- 역할: admin, main_user, vip_user, user
-- 자동 생성: 회원가입 시 트리거로 프로필 자동 생성
```

### 2. schema-projects.sql

프로젝트 및 팀원 관리

```sql
-- projects 테이블
-- 상태: announcement, bidding, award, construction_start, completion

-- project_members 테이블
-- 역할: pm, engineer, supervisor, worker, member
```

### 3. schema-gantt.sql (SA-Gantt 전용)

SA-Gantt 라이브러리용 테이블

```sql
-- gantt_tasks 테이블
-- WBS 레벨: 1(상위), 2(하위)
-- 타입: GROUP(그룹), CP(공정), TASK(작업)
-- JSONB 필드: cp_data, task_data, group_data

-- gantt_milestones 테이블
-- 타입: MASTER(주요), DETAIL(세부)

-- gantt_dependencies 테이블
-- 앵커 기반 종속성 (소수점 day_index 지원)
```

---

## RLS (Row Level Security) 정책

### Projects
- 모든 사용자: 조회 가능
- 인증된 사용자: 생성 가능
- 생성자/PM/Engineer: 수정 가능
- 생성자: 삭제 가능
- Admin: 전체 권한

### Gantt Tables
- 프로젝트 소유자: 전체 권한
- 프로젝트 멤버: 조회/수정 가능

---

## 검증 쿼리

### 테이블 존재 확인

```sql
SELECT tablename
FROM pg_tables
WHERE schemaname = 'public'
  AND tablename IN (
    'profiles', 'projects', 'project_members',
    'gantt_tasks', 'gantt_milestones', 'gantt_dependencies'
  )
ORDER BY tablename;
```

### SA-Gantt 테이블 컬럼 확인

```sql
SELECT table_name, column_name, data_type
FROM information_schema.columns
WHERE table_name LIKE 'gantt_%'
ORDER BY table_name, ordinal_position;
```

### RLS 정책 확인

```sql
SELECT tablename, policyname, cmd
FROM pg_policies
WHERE schemaname = 'public'
ORDER BY tablename, policyname;
```

---

## 트러블슈팅

### 문제 1: "relation already exists"
**원인**: 테이블이 이미 존재
**해결**: `DROP TABLE IF EXISTS` 후 재생성 또는 기존 테이블 사용

### 문제 2: RLS 권한 오류
**원인**: RLS 정책 미설정
**해결**: 해당 스키마 파일의 RLS 섹션 재실행

### 문제 3: "foreign key constraint" 오류
**원인**: 참조 테이블 미존재
**해결**: 스키마 파일을 순서대로 실행 (roles → projects → gantt)

---

## 애플리케이션 연동

SA-Gantt와 Supabase 연동은 `SupabaseGanttDataService` 클래스를 통해 이루어집니다.

**파일 위치**: `src/lib/services/SupabaseGanttDataService.ts`

```typescript
import { createSupabaseGanttDataService } from '@/lib/services/SupabaseGanttDataService';

// 사용 예시
const dataService = createSupabaseGanttDataService(projectId, { debug: true });
const ganttData = await dataService.loadAll();
```

---

**작성자**: AI Assistant
**버전**: 2.0.0
**최종 업데이트**: 2025-01-26
