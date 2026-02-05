# 공정계획 계산 로직 Quick Reference

**빠른 참조 가이드** - 핵심 정보만 1페이지에

---

## 🎯 핵심 발견 (Top 3)

| 우선순위 | 문제 | 위치 | 해결 시간 |
|---------|------|------|----------|
| 🔴 #1 | 반올림 불일치 (Math.floor vs Math.ceil) | process-days-calculator.ts:98 | 4-5시간 |
| 🔴 #2 | 타입 안전성 부족 (any 타입 사용) | quantity-reference.ts:224, 575 | 6-7시간 |
| 🟡 #3 | 에러 로깅 부재 (디버깅 불가) | quantity-reference.ts 전체 | 4-6시간 |

---

## 📊 계산 흐름 (30초 이해)

```
물량입력 → Building.floorTrades → quantity-reference.ts
  ↓
엑셀 참조 (D6, F7*0.45, E14+E16)
  ↓
계산 우선순위: 고정값 → 장비기반 → 수량기반
  ↓
반올림: Math.ceil (대부분) / Math.floor (모듈 총일수만!)
  ↓
UI 표시
```

---

## 🔧 주요 함수

| 함수 | 역할 | 반올림 | 파일 |
|------|------|--------|------|
| `getQuantityByReference` | 엑셀 참조 → 물량 | - | quantity-reference.ts |
| `getQuantityFromFloor` | 층별 물량 조회 | - | quantity-reference.ts |
| `calculateTotalWorkers` | 총 작업인원 | `Math.ceil` | process-calculation.ts |
| `calculateWorkDaysWithRounding` | 순작업일 | 조건부 (0.5 기준) | process-calculation.ts |
| `calculateModuleWorkDays` | 모듈 총일수 | **`Math.floor`** ⚠️ | process-days-calculator.ts |
| `useProcessCalculation` | 통합 계산 | - | hooks/useProcessCalculation.ts |

---

## 📐 엑셀 참조 패턴

### 열(Column)
```
B → gangForm (갱폼) → areaM2
C → alForm (알폼) → areaM2
D → formwork (형틀) → areaM2
E → stripClean (해체) → areaM2
F → rebar (철근) → ton
G → concrete (콘크리트) → volumeM3
```

### 행(Row)
```
6  → 버림
7  → 기초
8  → B2
9  → B1
11 → 1F (셋팅층 → 일반층)
12 → 2F (셋팅층 → 일반층 → 기준층)
13-25 → 3-15F (기준층)
26 → PH1
27 → PH2
28 → PH3
```

### 특수 패턴
```typescript
'D6'              // 단순: 버림 형틀
'F7*0.45'         // 비율: 기초 철근 45%
'E14+E16'         // 복합: 4F + 6F 해체
'F_B1B2_COMBINED' // 지하합산: B1+B2 철근
```

---

## 🐛 일반적인 문제 & 해결

### 문제 1: 물량이 0으로 나옴
```typescript
// 원인: Floor not found
// 확인: building.floors에 해당 층이 있는지
console.log(building.floors.map(f => f.floorLabel));

// 해결: FloorTradeTable에서 층 추가
```

### 문제 2: Trade not found
```typescript
// 원인: FloorTrade 없음
// 확인: building.floorTrades에 데이터 있는지
console.log(building.floorTrades.filter(ft => ft.floorId === 'target-id'));

// 해결: 물량입력 페이지에서 데이터 입력
```

### 문제 3: 계산 결과 이상
```typescript
// 원인: 반올림 불일치
// 확인: calculateModuleWorkDays가 Math.floor 사용 중
// 해결: 비즈니스 로직 확인 후 Math.ceil로 변경 고려
```

---

## 🧪 즉시 테스트할 항목

### Division by Zero
```typescript
calculateTotalWorkers(100, 0)  // → 0 (안전)
calculateDailyInputWorkers(50, 0)  // → 0 (안전)
calculateWorkDaysWithRounding(100, 0, 10)  // → 1 (안전)
```

### 옥탑층 정규화
```typescript
normalizeFloorLabel('옥탑1')    // → "PH1" ✓
normalizeFloorLabel('ph1')      // → "PH1" ✓
normalizeFloorLabel('코어1-PH1') // → "PH1" ✓
```

### 범위 기준층
```typescript
// "2~14F 기준층"에서 7F 조회
getQuantityFromFloor(building, '7F', 'formwork', 'areaM2', 'range-uuid');
// → individualFloorId = "range-uuid-7F"
```

---

## 🚀 1주 액션 아이템

### Day 1-2: 반올림 불일치
- [ ] 엑셀 수식 확인
- [ ] 비즈니스 담당자 논의
- [ ] 테스트 작성
- [ ] 수정 구현

### Day 3-4: 타입 안전성
- [ ] Type Guard 추가
- [ ] quantity-reference.ts 수정
- [ ] 테스트 작성
- [ ] 영향 범위 수정

### Day 5: 회귀 테스트
- [ ] 기존 프로젝트 검증
- [ ] 변경 전/후 비교
- [ ] 문서 업데이트

---

## 📚 상세 문서 위치

1. **PROCESS_CALCULATION_ANALYSIS.md** - 전체 분석 (상세)
2. **IMPROVEMENT_ROADMAP.md** - 개선 계획 (단계별)
3. **ANALYSIS_EXECUTIVE_SUMMARY.md** - 경영진 요약
4. **calculation-consistency-check.md** - 계산 일관성 검증
5. **edge-cases-analysis.md** - 엣지 케이스 분석

---

## 🔍 핵심 코드 위치

```
apps/web/src/
├── lib/utils/
│   ├── quantity-reference.ts (583 라인) ⭐ 물량 조회 핵심
│   ├── process-calculation.ts (125 라인) ⭐ 기본 계산 함수
│   ├── process-days-calculator.ts (122 라인) ⚠️ 반올림 불일치
│   └── floorIdUtils.ts (183 라인) 층 ID 관리
├── components/buildings/
│   ├── BasementProcessPlanPage.tsx 지하층 UI
│   ├── BuildingProcessPlanPage.tsx 지상층 UI
│   └── process-plan/hooks/
│       └── useProcessCalculation.ts (420 라인) ⭐ 통합 계산
└── lib/data/
    └── process-modules.ts 공정 모듈 정의
```

---

## ⚡ 긴급 연락처

**버그 발견 시:**
1. 개발자 콘솔 확인 (F12)
2. `building.floors`, `building.floorTrades` 덤프
3. 재현 가능한 최소 케이스 작성
4. 팀에 보고

**질문:**
- 개발팀: _[이메일]_
- 기술 지원: _[이메일]_

---

**문서 버전:** 1.0
**마지막 업데이트:** 2026-02-05
