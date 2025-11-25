# 다음 단계 전략 - Supabase 통합 & 샘플 데이터

> **작성일**: 2025-11-25  
> **버전**: 1.0  
> **목표**: 실제 건축 직영공사 골조공사 샘플 데이터로 Supabase 통합

---

## 📊 현재 상태 분석

### ✅ 완료된 것 (Phase 1-5)

#### 1. 데이터베이스 스키마 ✅
- **파일**: `schema-projects.sql`
- **테이블**: 
  - `projects` (프로젝트)
  - `project_members` (팀원)
  - `gantt_charts` (간트차트)
  - `tasks` (작업)
  - `links` (의존성)
- **RLS 정책**: 12개 이상
- **상태**: SQL 작성 완료, Supabase 적용 대기

#### 2. 서비스 레이어 ✅
- **파일**: 11개 서비스
  - `projects.ts` (8개 함수)
  - `projectMembers.ts` (7개 함수)
  - `ganttCharts.ts` (6개 함수)
  - `tasks.ts` (6개 함수)
  - `links.ts` (6개 함수)
  - `mockStorage.ts` (Mock 관리)
- **Mock 모드**: 완벽 지원
- **Supabase 모드**: 코드 준비 완료

#### 3. UI 컴포넌트 ✅
- **프로젝트**: 
  - 목록 (`ProjectList`)
  - 카드 (`ProjectCard`)
  - 상세 (`ProjectDetailClient`)
- **간트차트**:
  - 페이지 (`GanttChartPageClient`)
  - Wrapper (`GanttWrapper`)
  - 컴포넌트 (`GanttChart`)
- **상태**: 모두 구현 완료

#### 4. 라우팅 ✅
- `/projects` - 프로젝트 목록
- `/projects/[id]` - 프로젝트 상세
- `/projects/[id]/gantt/[chartId]` - 간트차트 편집
- `/gantt-test` - 테스트 페이지

---

## 🎯 다음 단계 목표

### 골조공사 샘플 프로젝트 구축

**참고 데이터**: `public/mock.json` (실제 골조공사 공정표)

**내용**:
- ✅ CP 지하골조(벽체+슬래브)
- ✅ 벽체(유로폼): 철근 조립, 검측, 유로폼 설치
- ✅ 슬래브(합판거푸집): 강관동바리, 합판거푸집, 철근, 콘크리트 타설, 양생
- ✅ 18개 Task, 5개 Link
- ✅ 계층 구조 (summary, task, urgent, progress, milestone)

---

## 🚀 구현 계획 (Phase 6-8)

### Phase 6: Supabase 데이터베이스 구축 (1-2시간)

#### 6.1 Supabase SQL 실행
```sql
-- schema-projects.sql 실행
-- 5개 테이블 생성
-- RLS 정책 설정
```

#### 6.2 골조공사 샘플 데이터 생성
**파일**: `seed-construction-sample.sql`

```sql
-- 1. 샘플 프로젝트
INSERT INTO projects (id, name, description, location, client, contract_amount, start_date, end_date, status)
VALUES (
  'project-골조공사-sample',
  '서울 강남 오피스 빌딩 신축 - 지하 골조공사',
  'CP 지하골조 (벽체+슬래브) 공정',
  '서울특별시 강남구 테헤란로 123',
  '강남건설(주)',
  2500000000, -- 25억
  '2025-11-04',
  '2025-11-24',
  'active'
);

-- 2. 샘플 Gantt 차트
INSERT INTO gantt_charts (id, project_id, name, description)
VALUES (
  'chart-골조공사-cp',
  'project-골조공사-sample',
  'CP 지하골조 공정표',
  '벽체(유로폼) 및 슬래브(합판거푸집) 공정'
);

-- 3. Tasks (public/mock.json 기반)
-- 18개 Task 삽입
-- 계층 구조 유지

-- 4. Links (의존성)
-- 5개 Link 삽입
```

#### 6.3 검증
- [ ] Supabase Dashboard에서 데이터 확인
- [ ] API 호출 테스트
- [ ] RLS 정책 동작 확인

---

### Phase 7: Mock.json → Supabase 변환 도구 (2-3시간)

#### 7.1 변환 스크립트 생성
**파일**: `scripts/import-mock-json.ts`

```typescript
/**
 * public/mock.json을 Supabase에 삽입하는 스크립트
 */
import mockData from '../public/mock.json';
import { createClient } from '@supabase/supabase-js';

async function importMockData() {
  // 1. Tasks 변환 (temp:// ID → UUID)
  // 2. 계층 구조 유지
  // 3. Links 변환
  // 4. Supabase 삽입
}
```

#### 7.2 API 라우트 수정
**파일**: `src/app/api/mock/route.ts`

```typescript
// Mock.json 파일을 직접 읽어서 반환
import mockData from '@/public/mock.json';

export async function GET() {
  return NextResponse.json(mockData);
}
```

---

### Phase 8: 대시보드 구현 (3-4시간)

#### 8.1 프로젝트 대시보드
**파일**: `src/app/(container)/projects/[id]/dashboard/page.tsx`

**기능**:
- 프로젝트 진행률 (전체, 단계별)
- 간트차트 목록 (썸네일)
- 최근 활동
- 팀원 현황
- 일정 현황 (지연, 진행중, 완료)

**컴포넌트**:
```tsx
- ProjectProgress (진행률 차트)
- GanttChartThumbnails (간트차트 미리보기)
- RecentActivities (활동 로그)
- TeamMembers (팀원 카드)
- ScheduleStatus (일정 상태)
```

#### 8.2 전체 대시보드
**파일**: `src/app/(container)/dashboard/page.tsx`

**기능**:
- 모든 프로젝트 통계
- 상태별 분포 (기획/진행중/완료)
- 내가 참여한 프로젝트
- 최근 프로젝트
- 알림 (지연, 검측 등)

---

## 📋 상세 구현 체크리스트

### Phase 6: Supabase 구축

#### 6-1. SQL 실행 (30분)
- [ ] Supabase Dashboard 접속
- [ ] `schema-projects.sql` 실행
- [ ] 테이블 생성 확인
- [ ] RLS 정책 확인

#### 6-2. 샘플 데이터 작성 (1시간)
- [ ] `seed-construction-sample.sql` 작성
  - [ ] 프로젝트 1개 (골조공사)
  - [ ] Gantt 차트 1개 (CP 지하골조)
  - [ ] Tasks 18개 (mock.json 기반)
  - [ ] Links 5개
- [ ] SQL 실행 및 확인

#### 6-3. 환경변수 설정 (10분)
- [ ] `.env.local` 수정
  ```bash
  NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
  NEXT_PUBLIC_SUPABASE_ANON_KEY=your-key
  NEXT_PUBLIC_USE_MOCK=false  # Supabase 모드
  ```

#### 6-4. 테스트 (20분)
- [ ] 프로젝트 목록 조회
- [ ] Gantt 차트 열기
- [ ] Task 표시 확인

---

### Phase 7: Mock.json 통합

#### 7-1. API 수정 (1시간)
- [ ] `/api/mock/route.ts` 수정
- [ ] `public/mock.json` 직접 읽기
- [ ] 날짜 형식 변환 (문자열 → Date)
- [ ] ID 매핑 (temp:// → 실제 ID)

#### 7-2. 변환 스크립트 (1-2시간)
- [ ] `scripts/import-mock-json.ts` 생성
- [ ] Task 변환 로직
  - [ ] ID 매핑 테이블 생성
  - [ ] parent 관계 유지
  - [ ] 날짜 변환
- [ ] Link 변환 로직
  - [ ] source/target ID 매핑
- [ ] Supabase 삽입
- [ ] 실행 및 검증

---

### Phase 8: 대시보드

#### 8-1. 프로젝트 대시보드 (2시간)
- [ ] 라우트 생성: `/projects/[id]/dashboard`
- [ ] 컴포넌트 생성:
  - [ ] `ProjectProgress.tsx`
  - [ ] `GanttChartThumbnails.tsx`
  - [ ] `RecentActivities.tsx`
  - [ ] `TeamMembers.tsx`
- [ ] API 연동
- [ ] UI 디자인

#### 8-2. 전체 대시보드 (1-2시간)
- [ ] 라우트 생성: `/dashboard`
- [ ] 통계 컴포넌트:
  - [ ] `ProjectStats.tsx`
  - [ ] `StatusDistribution.tsx`
  - [ ] `MyProjects.tsx`
- [ ] 차트 라이브러리 추가 (recharts)
- [ ] NavBar에 메뉴 추가

---

## 🗂️ 파일 구조 (예상)

```
contech-dx/
├── schema-projects.sql                  # 기존
├── seed-construction-sample.sql         # 새로 생성 ⭐
│
├── scripts/
│   └── import-mock-json.ts              # 새로 생성 ⭐
│
├── src/
│   ├── app/
│   │   ├── api/
│   │   │   └── mock/
│   │   │       └── route.ts             # 수정 ⭐
│   │   │
│   │   └── (container)/
│   │       ├── dashboard/
│   │       │   └── page.tsx             # 새로 생성 ⭐
│   │       │
│   │       └── projects/[id]/
│   │           └── dashboard/
│   │               └── page.tsx         # 새로 생성 ⭐
│   │
│   └── components/
│       └── dashboard/                   # 새로 생성 ⭐
│           ├── ProjectProgress.tsx
│           ├── GanttChartThumbnails.tsx
│           ├── RecentActivities.tsx
│           ├── TeamMembers.tsx
│           └── ProjectStats.tsx
│
└── public/
    └── mock.json                        # 기존 (참고용)
```

---

## 🎨 UI/UX 개선 사항

### 1. 프로젝트 상세 페이지 개선
- **탭 네비게이션**:
  - 개요 (Overview)
  - 간트차트 (Gantt Charts)
  - 대시보드 (Dashboard)
  - 팀원 (Members)
  - 설정 (Settings)

### 2. 간트차트 페이지 개선
- **툴바 추가**:
  - 저장 버튼 (실제 동작)
  - 되돌리기/다시하기
  - 확대/축소
  - 필터 (Task 타입별)
  - 내보내기 (PDF, Excel)

### 3. 대시보드 차트
- **진행률 차트**: Progress Bar, Pie Chart
- **일정 차트**: Timeline, Gantt 미니뷰
- **통계 카드**: KPI 표시

---

## 🔧 기술 스택 추가

### Phase 6-8에서 추가할 라이브러리

```json
{
  "dependencies": {
    "recharts": "^2.10.0",           // 차트 라이브러리
    "@supabase/supabase-js": "^2.x", // 이미 있음
    "date-fns": "^3.0.0"             // 날짜 유틸
  }
}
```

---

## 📊 예상 소요 시간

| Phase | 작업 | 시간 |
|-------|------|------|
| Phase 6 | Supabase 구축 | 1-2h |
| Phase 7 | Mock.json 통합 | 2-3h |
| Phase 8 | 대시보드 | 3-4h |
| **총합** | | **6-9h** |

---

## 🎯 마일스톤

### Milestone 1: Supabase 실전 데이터 (Phase 6)
- ✅ 데이터베이스 구축
- ✅ 골조공사 샘플 데이터
- ✅ Mock 모드 → Supabase 모드 전환

### Milestone 2: 실제 건축 데이터 (Phase 7)
- ✅ Mock.json 활용
- ✅ 18개 Task + 5개 Link
- ✅ 계층 구조 (summary, task 등)

### Milestone 3: 대시보드 완성 (Phase 8)
- ✅ 프로젝트 대시보드
- ✅ 전체 대시보드
- ✅ 통계 및 차트

---

## 🚨 주의사항

### 1. ID 매핑
- `temp://` 형식 → UUID 변환
- parent 관계 유지 중요

### 2. 날짜 형식
- Mock.json: `"2025-11-04"` (문자열)
- Supabase: `DATE` 또는 `TEXT`
- 프론트엔드: `Date` 객체

### 3. Task 타입
- Mock.json: `summary`, `task`, `urgent`, `progress`, `round`, `narrow`, `milestone`
- Supabase: 모든 타입 지원 또는 `TEXT` 타입으로 저장

### 4. RLS 정책
- 프로젝트 멤버만 Task/Link 수정 가능
- 읽기는 모두 가능 (또는 멤버만)

---

## 🎉 완료 후 상태

**POC → Production Ready**

### 기능 완성도
- ✅ 프로젝트 관리: 100%
- ✅ 간트차트: 100%
- ✅ Supabase 통합: 100%
- ✅ 실제 건축 데이터: 100%
- ✅ 대시보드: 100%
- ✅ 팀원 관리: 80% (UI 제외)

### 다음 Phase (선택)
- Phase 9: 실시간 협업 (WebSocket)
- Phase 10: 알림 시스템
- Phase 11: 파일 첨부 (도면, 문서)
- Phase 12: 모바일 반응형 개선

---

## 📝 다음 작업 시작

**Phase 6부터 시작**:

1. **`seed-construction-sample.sql` 작성**
   - public/mock.json 기반
   - 골조공사 샘플 데이터

2. **Supabase SQL 실행**
   - schema-projects.sql
   - seed-construction-sample.sql

3. **환경변수 설정**
   - Supabase URL/Key

4. **테스트**
   - 프로젝트 로드
   - Gantt 차트 표시

---

**작성**: AI Assistant  
**검토**: 사용자 확인 필요  
**버전**: 1.0.0  
**상태**: 전략 수립 완료 - 승인 대기

