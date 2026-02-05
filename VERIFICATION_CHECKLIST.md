# 주동 지하층 모듈 구조 리팩토링 검증 체크리스트

## 날짜: 2026-02-05

## ✅ Phase 1: 핵심 데이터 구조 변경

### process-modules.ts
- [x] `basement-standard` 모듈 완전 삭제 (Line 145-362)
- [x] `basement-with-pit` 모듈 이름 변경: '피트층포함' → '표준공정' (Line 1799)
- [x] basement 카테고리 모듈 개수: 3개 → 2개 확인
- [x] basement-high-ceiling 모듈 변경 없음 확인

**검증 결과:**
```bash
# basement-standard 검색 결과: 0개
# category: '주동 지하층' 모듈 개수: 2개
# - basement-with-pit (name: '표준공정')
# - basement-high-ceiling (name: '층고6.5m이상')
```

## ✅ Phase 2: UI 레이어 업데이트

### ProcessModuleSection.tsx
- [x] TabId 타입 수정: '지하층(피트층포함)' 제거 (Line 126)
- [x] CATEGORY_TABS 배열 수정:
  - [x] '주동 지하층' 탭: processType='표준공정' 추가
  - [x] '지하층(피트층포함)' 탭 제거
  - [x] 탭 순서: 버림 → 기초 → 주동 지하층 → 지하층(층고6.5m이상) → 지하주차장 → ...

### BasementProcessPlanPage.tsx
- [x] PROCESS_TYPE_OPTIONS['주동 지하층']: ['표준공정', '층고6.5m이상'] (Line 57)
- [x] DEFAULT_PROCESS_TYPES['주동 지하층']: '표준공정' 확인 (Line 64)

### BuildingProcessPlanPage.tsx
- [x] PROCESS_TYPE_OPTIONS['주동 지하층']: ['표준공정', '층고6.5m이상'] (Line 36)
- [x] DEFAULT_PROCESS_TYPES['주동 지하층']: '표준공정' 확인 (Line 50)

### useProcessPlans.ts
- [x] DEFAULT_PROCESS_TYPES['주동 지하층']: '표준공정' 확인 (Line 8)
- [x] 변경 불필요 확인

## ✅ 빌드 및 타입 검증

### 빌드 검증
```bash
cd apps/web && npm run build
```
- [x] TypeScript 컴파일 성공
- [x] Next.js 빌드 성공
- [x] 에러/경고 없음

### 코드 검증
```bash
# basement-standard 완전 제거 확인
grep -r "basement-standard" apps/web/src
# 결과: 0개

# 피트층포함 제거 확인 (types.ts 제외)
grep -r "피트층포함" apps/web/src
# 결과: 2개 (types.ts의 union type, process-modules.ts 주석 - 의도적 유지)
```

## ✅ 문서 업데이트

### README.md
- [x] Changelog 섹션에 변경사항 기록 (2026-02-05)
- [x] Architecture 섹션으로 분류
- [x] 모듈 통합, UI 개선, 영향 범위, 데이터 호환성, 리스크 명시
- [x] 최종 결과 요약

## 📋 수동 테스트 계획 (런타임 검증)

유저가 `npm run dev`로 실행 후 다음 항목 테스트:

### 공정로직 페이지 (ProcessModuleSection)
- [ ] 탭 순서: 버림 → 기초 → **주동 지하층** → 지하층(층고6.5m이상) → 지하주차장 → ...
- [ ] "주동 지하층" 탭 클릭 → '표준공정' 모듈 데이터 표시
- [ ] "지하층(층고6.5m이상)" 탭 클릭 → '층고6.5m이상' 모듈 데이터 표시
- [ ] 콘솔 에러 없음

### 지하층 공정계획 페이지 (BasementProcessPlanPage)
- [ ] processType 드롭다운: ['표준공정', '층고6.5m이상'] 2개만 표시
- [ ] 기본값: '표준공정' 선택됨
- [ ] '표준공정' 선택 → basement-with-pit 모듈 항목 표시
- [ ] '층고6.5m이상' 선택 → basement-high-ceiling 모듈 항목 표시
- [ ] 계산 로직 정상 작동

### 지상층 공정계획 페이지 (BuildingProcessPlanPage)
- [ ] processType 드롭다운: ['표준공정', '층고6.5m이상'] 2개만 표시
- [ ] 기본값: '표준공정' 선택됨
- [ ] 주동 지하층 섹션 정상 표시

### 데이터 영속성
- [ ] 새 빌딩 생성 → processType='표준공정' 자동 설정
- [ ] localStorage 저장/로드 정상 작동
- [ ] 페이지 새로고침 후 상태 유지

### 브라우저 테스트
- [ ] Chrome 정상 작동
- [ ] 다크모드 정상 작동
- [ ] 콘솔 경고/에러 없음

## 📊 최종 결과

### 변경 파일 (5개)
1. ✅ `/apps/web/src/lib/data/process-modules.ts` - 모듈 삭제 및 이름 변경
2. ✅ `/apps/web/src/components/buildings/process-logic/ProcessModuleSection.tsx` - 탭 구조 변경
3. ✅ `/apps/web/src/components/buildings/BasementProcessPlanPage.tsx` - PROCESS_TYPE_OPTIONS 업데이트
4. ✅ `/apps/web/src/components/buildings/BuildingProcessPlanPage.tsx` - PROCESS_TYPE_OPTIONS 업데이트
5. ✅ `/apps/web/src/components/buildings/hooks/useProcessPlans.ts` - 확인만 (변경 불필요)
6. ✅ `/README.md` - 문서 업데이트

### 모듈 구조 변경
- **변경 전**: 3개 모듈 (basement-standard, basement-with-pit, basement-high-ceiling)
- **변경 후**: 2개 모듈 (basement-with-pit[표준공정], basement-high-ceiling[층고6.5m이상])

### 탭 구조 변경
- **변경 전**: 독립 "주동 지하층" 탭 + "지하층(층고6.5m이상)" 탭 + "주동 지하층(피트)" 탭
- **변경 후**: "주동 지하층" 탭(processType='표준공정') + "지하층(층고6.5m이상)" 탭

### 데이터 호환성
- **전략**: No Migration (자동 폴백)
- **메커니즘**:
  - 기존 '표준공정' 또는 '피트층포함' → 새로운 '표준공정'으로 자동 폴백
  - getProcessModule에서 undefined 반환 시 DEFAULT_PROCESS_TYPES 사용
  - 사용자는 자동으로 새로운 모듈 데이터 사용

### 위험도 평가
- **리스크 레벨**: 중간
- **완화 요소**:
  - ID 유지 (basement-with-pit)
  - 자동 폴백 메커니즘
  - TypeScript 타입 시스템 보호
  - 빌드 검증 완료

---

## 구현 완료 ✅
- 날짜: 2026-02-05
- 구현자: Claude Code
- 빌드 상태: ✅ Success
- 런타임 테스트: 🔄 Pending (유저 확인 필요)
