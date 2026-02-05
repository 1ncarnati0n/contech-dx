# 공정 모듈 업데이트 검증 보고서
**날짜**: 2026-02-05
**작업**: basement-high-ceiling 수정 및 basement-with-pit 추가

## ✅ basement-high-ceiling 모듈 수정 완료

### 항목 개수
- ✅ **이전**: 9개 항목
- ✅ **현재**: 8개 항목 (타설 항목 통합으로 1개 감소)

### 수정된 생산성 값
1. ✅ **bhc-wall-rebar** (라인 1703)
   - `dailyProductivity: 0.70` → `0.8` ✓

2. ✅ **bhc-slab-rebar** (라인 1742)
   - `dailyProductivity: 0.70` → `0.8` ✓

3. ✅ **bhc-finishing** (라인 1755)
   - `dailyProductivity: 10.0` → `11` ✓

### 타설 항목 통합
4. ✅ **타설 항목** (라인 1765-1778)
   - **이전**: `bhc-concrete-1st`, `bhc-concrete-2nd` (2개)
   - **현재**: `bhc-concrete` (1개 통합)
   - `quantityReference: 'G_B1B2_COMBINED'` ✓
   - `equipmentCalculationBase: 500` ✓

### 간접일 수정
5. ✅ **bhc-formwork-dismantle** (라인 1788)
   - `indirectDays: 22` → `16` ✓

---

## ✅ basement-with-pit 모듈 추가 완료

### 위치
- ✅ `basement-high-ceiling` 모듈 다음 (라인 1797)
- ✅ `일반층` 모듈 이전

### 항목 구성
- ✅ **총 항목**: 18개
- ✅ **B2 층**: 7개 항목 (floorLabel: 'B2')
- ✅ **B1 층**: 6개 항목 (floorLabel: 'B1')
- ✅ **B1 피트층**: 5개 항목 (floorLabel: 'B1')

### B2 층 항목 (7개)
1. ✅ `bwp-meokmaekim-b2` - 먹매김
2. ✅ `bwp-wall-rebar-b2` - 벽 철근조립 (dailyProductivity: 0.8)
3. ✅ `bwp-formwork-b2` - 지하2층 거푸집 설치 (dailyProductivity: 11)
4. ✅ `bwp-slab-rebar-b2` - 보슬라브 철근조립 (dailyProductivity: 0.8)
5. ✅ `bwp-finish-b2` - 마감작업 (dailyProductivity: 11)
6. ✅ `bwp-concrete-b2` - 타설 (equipmentCalculationBase: 500)
7. ✅ `bwp-stripclean-b2` - 거푸집 해체/정리 (indirectDays: 16)

### B1 층 항목 (6개)
8. ✅ `bwp-meokmaekim-b1` - 먹매김
9. ✅ `bwp-wall-rebar-b1` - 벽 철근조립 (dailyProductivity: 0.7)
10. ✅ `bwp-formwork-b1` - 지하1층 거푸집 설치 (dailyProductivity: 9)
11. ✅ `bwp-slab-rebar-b1` - 보슬라브 철근조립 (dailyProductivity: 0.7)
12. ✅ `bwp-finish-1st` - 마감작업 (dailyProductivity: 10)
13. ✅ `bwp-concrete-1st` - 타설 (equipmentCalculationBase: 500)

### B1 피트층 항목 (5개)
14. ✅ `bwp-wall-rebar-pit` - 벽 철근조립 (dailyProductivity: 0.7)
15. ✅ `bwp-formwork-pit` - 피트층 거푸집 설치 (dailyProductivity: 10)
16. ✅ `bwp-slab-rebar-pit` - 보슬라브 철근조립 (dailyProductivity: 0.7)
17. ✅ `bwp-concrete-pit` - 피트층 타설 (equipmentCalculationBase: 500)
18. ✅ `bwp-stripclean-b1` - 거푸집 해체/정리 (indirectDays: 22)

---

## 🔧 빌드 테스트

```bash
cd apps/web
npm run build
```

**결과**: ✅ 빌드 성공
- TypeScript 컴파일 오류 없음
- 모든 라우트 정상 생성 (29개)
- 최적화된 프로덕션 빌드 완료

---

## 📊 주요 확인 사항

### equipmentCalculationBase 일관성
✅ 모든 지하층 타설 항목의 `equipmentCalculationBase: 500`
- `bhc-concrete` (basement-high-ceiling)
- `bwp-concrete-b2` (basement-with-pit B2)
- `bwp-concrete-1st` (basement-with-pit B1)
- `bwp-concrete-pit` (basement-with-pit 피트)

### 거푸집 해체/정리 간접일
✅ B2 단독: 16일
- `bhc-formwork-dismantle` (basement-high-ceiling)
- `bwp-stripclean-b2` (basement-with-pit B2)

✅ B1 (피트포함): 22일
- `bwp-stripclean-b1` (basement-with-pit B1)

### quantityReference 패턴
✅ 백분율 계산 활용:
- `F8*0.45` (B2 벽 철근 45%)
- `F8*0.55` (B2 슬라브 철근 55%)
- `D8*0.95` (B2 거푸집 95%)
- `D8*0.05` (B2 마감 5%)
- `G9*0.6` (B1 타설 60%)
- `G9*0.4` (피트 타설 40%)

---

## 📝 변경 파일

### 수정된 파일
- `apps/web/src/lib/data/process-modules.ts`
  - basement-high-ceiling 모듈 수정 (5개 항목)
  - basement-with-pit 모듈 추가 (18개 항목)

### 참조 파일
- `apps/web/src/lib/types.ts` - ProcessItem, ProcessModule 타입 정의
- `docs/260205_logic.xlsx` - 엑셀 데이터 원본

---

## ✅ 최종 검증 체크리스트

- [x] basement-high-ceiling 항목 개수: 8개
- [x] 벽 철근조립 생산성: 0.8
- [x] 보슬라브 철근조립 생산성: 0.8
- [x] 마감작업 생산성: 11
- [x] 타설 항목 통합: 1개
- [x] 거푸집 해체/정리 간접일: 16
- [x] basement-with-pit 항목 개수: 18개
- [x] B2 항목: 7개
- [x] B1 항목: 11개 (일반 6개 + 피트 5개)
- [x] 모든 타설 equipmentCalculationBase: 500
- [x] B2 해체/정리 간접일: 16
- [x] B1 해체/정리 간접일: 22
- [x] TypeScript 빌드 성공
- [x] basement-standard 모듈 유지 (수정 안 함)

---

## 🎯 구현 완료

모든 계획된 변경 사항이 성공적으로 구현되었으며, 빌드 테스트를 통과했습니다.
