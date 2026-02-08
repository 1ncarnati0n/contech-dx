# Next Work — ConTech-DX 개발 로드맵

> 최종 업데이트: 2026-02-07
>
> 이전 완료 작업: Phase 1~6 물량 해석 시스템 마이그레이션 (SemanticQuantityReference + resolveProcessQuantity)

---

## 우선순위 범례

- 🔴 **High** — 사용자 경험/데이터 안정성에 직접 영향
- 🟡 **Medium** — 코드 품질/유지보수성 개선
- 🟢 **Low** — 장기적 개선 사항

---

## 🔴 High Priority

### 1. Buildings 데이터 Supabase 이관

**현황:** 동/층/물량 데이터가 localStorage에 저장되어 다중 기기/브라우저 간 공유 불가

**영향 범위:** 19개 파일 (components/buildings/*, lib/services/buildings.ts 등)

**준비 상태:**
- ✅ `sql/schema/schema-buildings.sql` 스키마 준비 완료
- ✅ `SupabaseBuildingDataService.ts` 서비스 레이어 존재
- ⚠️ mockStorage.ts 마이그레이션 중간 레이어 존재

**작업 항목:**
- [ ] Supabase 테이블 생성 (buildings, floors, floor_trades)
- [ ] RLS 정책 설정 (프로젝트별 접근 제어)
- [ ] localStorage → Supabase 데이터 마이그레이션 스크립트
- [ ] Service Layer 전환 (mockStorage → Supabase)
- [ ] 오프라인 폴백 전략 결정

---

### 2. 대형 컴포넌트 리팩토링 (buildings/)

**현황:** 상위 4개 파일이 8,389 LOC (유지보수·테스트 어려움)

| 파일 | LOC | 리팩토링 전략 |
|------|-----|-------------|
| `BasementProcessPlanPage.tsx` | 2,289 | 훅/서브컴포넌트 추출 |
| `BuildingProcessPlanPage.tsx` | 2,122 | 동일 패턴 |
| `DetailedFloorTradeTable.tsx` | 2,001 | 셀 렌더러/검증 로직 추출 |
| `FloorTradeTable.tsx` | 1,977 | 공통 로직 공유 |

**추천 구조:**
```
BuildingProcessPlanPage.tsx (현재 2,122 LOC)
  → hooks/
      ├── useProcessPlanData.ts      (데이터 로딩/상태)
      ├── useProcessCalculations.ts  (계산 로직)
      └── useModuleExpansion.ts      (확장 패널 상태)
  → components/
      ├── ProcessSummaryTable.tsx     (요약 테이블)
      ├── ProcessDetailPanel.tsx      (확장 상세)
      └── CategorySection.tsx         (구분 섹션)
```

---

### 3. 타입 안전성 강화

**현황:** `as any` 12건 잔존

| 위치 | 건수 | 원인 |
|------|------|------|
| BuildingProcessPlanPage.tsx | 2 | resolveQty 동적 필드 |
| BasementProcessPlanPage.tsx | 5 | resolveBasementQty 동적 필드 |
| IfcViewer.tsx | 1 | 외부 라이브러리 타입 |
| MarkdownRenderer/ChatArea | 2 | react-markdown props |
| quantity-reference.ts | 1 | 동적 프로퍼티 접근 |

**해결 방안:** `tradeField`/`subField` 파라미터를 유니온 타입으로 제한하여 `as any` 제거

---

## 🟡 Medium Priority

### 4. Quantity Reference 마이그레이션 완료 (Phase 7)

**현황:**
- `process-modules.ts`에서 61개 항목이 아직 레거시 `quantityReference`만 보유
- 60개 항목은 `quantityRef` 적용 완료
- `parseLegacyReference` 폴백이 11곳에서 사용 중

**작업 항목:**
- [ ] 나머지 61개 항목에 `quantityRef` 추가
- [ ] `parseLegacyReference` 폴백 패턴 제거
- [ ] 레거시 `quantityReference` 필드 deprecate
- [ ] `quantity-reference-migration.ts` 브릿지 제거

**완료 기준:** `parseLegacyReference` import가 0건

---

### 5. TODO 항목 해결

| 위치 | 내용 | 작업 |
|------|------|------|
| `SupabaseGanttDataService.ts:221` | 디버깅 플래그 | false로 변경 |
| `FullscreenGanttPage.tsx:459` | 태스크 순서 Supabase 저장 | order 컬럼 추가 |
| `usePresetManager.ts:218` | 사용자 정보 교체 | Auth에서 userId 가져오기 |

---

### 6. 테스트 커버리지 확대

**현황:**
- ✅ quantity-reference 시스템: 48 테스트, 79.44% 커버리지
- ⚠️ 컴포넌트 테스트 부족
- ❌ E2E 테스트 없음

**추천:**
- [ ] BuildingProcessPlanPage 워크플로우 통합 테스트
- [ ] localStorage → Supabase 마이그레이션 경로 테스트
- [ ] 핵심 사용자 시나리오 E2E 테스트 (Playwright)

---

## 🟢 Low Priority

### 7. sa-gantt-lib 추가 모듈화

- GanttTimeline (703 LOC), GanttSidebar (688 LOC) 서브컴포넌트 분리
- 현재 안정적으로 동작 중이므로 필요시 진행

### 8. 문서화 개선

- [ ] CONTRIBUTING.md 작성
- [ ] API 라우트 문서화 (10개 Gemini 엔드포인트)
- [ ] 테스트 전략 가이드

### 9. 레거시 코드 정리

- 미사용 import 제거
- 유틸리티 함수 통합 (중복 제거)
- 네이밍 컨벤션 표준화

---

## 완료된 작업 이력

### Phase 1~6: 물량 해석 시스템 마이그레이션 ✅

| Phase | 내용 | 상태 |
|-------|------|------|
| Phase 1 | SemanticQuantityReference 타입 정의 | ✅ |
| Phase 2 | resolveProcessQuantity 통합 해석기 | ✅ |
| Phase 3 | parseLegacyReference 브릿지 유틸 | ✅ |
| Phase 4 | 계산 레이어 통합 (process-days-calculator) | ✅ |
| Phase 5 | process-modules.ts quantityRef 적용 (60건) | ✅ |
| Phase 6 | UI 디스플레이 레이어 마이그레이션 (~74건) | ✅ |

**성과:** 레거시 함수 호출 167건 → 내부 전용으로 격리, 단일 진입점 `resolveProcessQuantity` 확립

### 성능 최적화 (Feb 5, 2026) ✅

- Serial Queries 캐싱 (350ms 개선)
- Overview 탭 데이터 필터링 (400ms 개선)
- localStorage 스로틀링 (30ms 개선)
- 클라이언트사이드 탭 전환 (500ms 개선)
- **총 1,280ms 개선**

---

## 현재 코드베이스 지표

| 지표 | 값 | 상태 |
|------|-----|------|
| 소스 파일 (web) | ~282 | - |
| 소스 파일 (lib) | ~280 | - |
| TODO/FIXME | 3건 | ✅ |
| console.* | 8건 (169건 정리 완료) | ✅ |
| `as any` 사용 | 12건 | ⚠️ |
| 1,000+ LOC 파일 | 12개 | ⚠️ |
| localStorage 의존 | 19개 파일 | ⚠️ |
| 레거시 함수 | 내부 전용으로 격리 | ✅ |
| 테스트 | 7 suites, 161 tests | ✅ |
