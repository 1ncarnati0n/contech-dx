# 공정계획 → 간트차트 컨버터 상세 분석

> **분석일**: 2026-02-10
> **대상**: `apps/web/src/lib/utils/process-to-gantt-converter.ts` (1,102 LOC)

---

## 1. 개요

### 1.1 역할

`process-to-gantt-converter.ts`는 **건설 프로젝트의 공정계획 데이터(`BuildingProcessPlan`)**를 **간트차트 태스크 배열(`ConstructionTask[]`)**로 변환하는 핵심 비즈니스 로직 파일입니다.

- 입력: 건물 정보 + 공정계획 (카테고리별 층/항목 데이터)
- 출력: 4계층 간트 차트 태스크 (BLOCK → CP → GROUP → TASK)
- 특성: `floorDetails.items`가 없으면 **on-the-fly로 물량/일수/인원을 자동 계산**

### 1.2 계층 구조

```
BLOCK (동, wbsLevel=1)
├── CP (카테고리, wbsLevel=1)    # 버림, 기초, 주동 지하층, 일반층, 기준층, ...
│   ├── GROUP (층, wbsLevel=2)   # B2, B1, 1F, 2F, ...
│   │   ├── TASK (항목)          # 거푸집, 철근, 콘크리트, ...
│   │   ├── TASK
│   │   └── ...
│   └── GROUP
└── CP
```

### 1.3 파일 규모

| 항목 | 값 |
|------|-----|
| 총 LOC | 1,102 |
| export 함수 | 3 (`convertProcessPlansToGanttTasks`, `getFloorLabelsForCategory`, `getImportFloorLabelsForCategory`) |
| 내부 함수 | 19 |
| 타입/인터페이스 | 5 |
| 상수 | 3 (`CATEGORY_ORDER`, `PARALLEL_UNDERGROUND_CATEGORIES`, `DEFAULT_CALENDAR_SETTINGS`) |

---

## 2. 의존성

### 2.1 외부 라이브러리

| 패키지 | import | 용도 |
|--------|--------|------|
| `date-fns` | `addDays` | 날짜 연산 |
| `sa-gantt-lib` | `generateId`, `addWorkingDays`, `addCalendarDays`, `KOREAN_HOLIDAYS_ALL` | ID 생성, 작업일/달력일 계산, 한국 공휴일 |
| `sa-gantt-lib` (types) | `ConstructionTask`, `TaskData`, `CalendarSettings` | 간트 태스크 타입 |

### 2.2 내부 모듈

| 모듈 | import | 용도 |
|------|--------|------|
| `@/lib/types` | `Building`, `BuildingProcessPlan`, `ProcessCategory`, `ProcessType`, `FloorProcessDetails` | 빌딩/공정 타입 |
| `@/lib/data/process-modules` | `getProcessModule`, `ProcessItem`, `ProcessModule` | 공정 모듈 데이터 |
| `./process-days-calculator` | `filterItemsForFloor`, `resolveFloorQuantity` | 항목 필터링, 물량 해석 |
| `./process-quantity-resolver` | `getSpecialRowDeductions`, `resolveWithDeduction`, `DeductionFields` | 물량 차감 계산 |
| `./quantity-reference-migration` | `parseLegacyReference` | 레거시 참조 파싱 |
| `./process-calculation` | `calculateTotalWorkers`, `calculateDailyInputWorkers`, `calculateWorkDaysWithRounding`, `calculateEquipmentCount`, `calculateDailyInputWorkersByEquipment` | 인력/일수 계산 |

### 2.3 의존성 그래프

```
process-to-gantt-converter.ts (1,102 LOC)
    ├── sa-gantt-lib
    │   ├── generateId
    │   ├── addWorkingDays (holidays, calendarSettings)
    │   ├── addCalendarDays
    │   └── KOREAN_HOLIDAYS_ALL
    ├── process-days-calculator.ts
    │   ├── filterItemsForFloor()
    │   └── resolveFloorQuantity()
    ├── process-quantity-resolver.ts (229 LOC)
    │   ├── getSpecialRowDeductions()
    │   └── resolveWithDeduction()
    ├── quantity-reference-migration.ts (113 LOC)
    │   └── parseLegacyReference()
    ├── process-calculation.ts
    │   ├── calculateTotalWorkers()
    │   ├── calculateDailyInputWorkers()
    │   ├── calculateWorkDaysWithRounding()
    │   ├── calculateEquipmentCount()
    │   └── calculateDailyInputWorkersByEquipment()
    └── @/lib/data/process-modules
        └── getProcessModule()
```

---

## 3. 핵심 함수 분석

### 3.1 `convertProcessPlansToGanttTasks()` (메인 진입점)

```typescript
export function convertProcessPlansToGanttTasks(
  options: ProcessToGanttOptions
): ConversionResult
```

- **역할**: 전체 동(building)의 공정계획을 순회하며 간트 태스크로 변환
- **입력**: `ProcessToGanttOptions` (buildings, processPlans, projectStartDate, holidays, calendarSettings)
- **출력**: `ConversionResult` (tasks[], summary)
- **기본 공휴일**: `KOREAN_HOLIDAYS_ALL` (sa-gantt-lib 내장)

### 3.2 `convertBuildingPlan()` (동별 변환)

- **계산**: 가설+흙막이+토공사 일수를 합산하여 **구조체 시작일** 산출
- **BLOCK 태스크** 생성 후 카테고리 순회
- **병렬 처리**: 지하 카테고리 3개(`주동 지하층`, `지하층(6.5m이상)`, `지하주차장`)는 **동일 시작일로 병렬 배치**
- **순차 처리**: 나머지 카테고리는 이전 카테고리 종료 후 시작

### 3.3 `convertCategory()` (CP 레벨)

- CP 태스크 생성 후 층 목록 결정
- `getImportFloorLabelsForCategory()`로 실제 활성 층 라벨 추출
- `expandFloorLabels()`로 범위 형식(`7~11F`) → 개별 층(`7F, 8F, ...`) 분해
- 층별 `convertFloorGroup()` 호출

### 3.4 `convertFloorGroup()` (GROUP/TASK 레벨)

- GROUP 태스크 생성
- `getProcessModule()`로 해당 카테고리/공정타입의 세부 항목 조회
- `floorDetail.items`가 있으면 기존 데이터 사용, **없으면 `computeFloorItems()`로 on-the-fly 계산**
- `scheduleTasksSequentially()`로 순차 스케줄링

### 3.5 `computeFloorItems()` (핵심: on-the-fly 계산)

한 층의 세부공정 항목들을 **실시간으로 계산**. 3-way 계산 로직:

| 계산 방식 | 조건 | 로직 |
|----------|------|------|
| **고정일수** | `item.directWorkDays` 존재 | 고정 값 사용, 인원 1명 |
| **장비기반** | `equipmentCalculationBase` + `equipmentWorkersPerUnit` 존재 | 장비 대수 → 인원 → 일수 계산 |
| **수량기반** | `quantityRef` + `dailyProductivity` 존재 | 총인력 → 일투입인원 → 작업일 계산 |

### 3.6 `scheduleTasksSequentially()` (스케줄링)

- 각 항목을 순차 배치 (이전 항목 종료 + 1일 = 다음 시작)
- **순작업일**: `addWorkingDays()` (공휴일/주말 건너뜀)
- **간접작업일**(양생, 검측): `addCalendarDays()` (달력일 그대로)
- `TaskData` 구성: netWorkDays, indirectWorkDays, quantity, crew, totalWorkers

---

## 4. 물량 해석 전략

### 4.1 물량 참조 체계

```
resolveQuantityForFloorItem()
├── specialRowQuantities 존재? → resolveQuantityFromSpecialRow()
│   └── 특수행(주차장, 6.5m이상)의 공종별 물량 사용
├── deductionFields 존재? (주동 지하층) → resolveWithDeduction()
│   └── 특수행 물량을 차감한 순수 주동 물량 계산
└── 일반 층 → resolveFloorQuantity()
    └── building의 층별 물량 데이터에서 직접 조회
```

### 4.2 SemanticQuantityReference 연동

- `item.quantityRef` (신규 Semantic 참조)가 우선 사용
- `item.quantityReference` (레거시 Excel 셀 참조)는 `parseLegacyReference()`로 변환 후 사용
- `ref.tradeField`로 공종 매핑, `ref.ratio`로 비율 적용

### 4.3 특수행 처리 (지하주차장, 6.5m이상)

```
specialRowQuantities
├── "B1 주차장": { gangForm, alForm, formwork, rebar, concrete }
├── "B2 주차장": { gangForm, alForm, formwork, rebar, concrete }
├── "B1 6.5m이상": { ... }
└── "B2 6.5m이상": { ... }
```

- `getActiveParkingRowLabels()`: 양수 물량이 있는 주차장 행만 추출
- `hasActiveHighCeilingRows()`: 6.5m이상 행의 활성 여부 확인
- `resolveQuantityFromSpecialRow()`: 공종별 물량 합산 및 비율 적용

---

## 5. 특수 처리 목록

### 5.1 카테고리 시공 순서

```typescript
export const CATEGORY_ORDER: ProcessCategory[] = [
  '버림', '기초', '주동 지하층', '지하층(층고6.5m이상)',
  '지하주차장', '일반층', '셋팅층', '기준층', '최상층', '옥탑층',
];
```

### 5.2 병렬 지하 카테고리

`주동 지하층`, `지하층(6.5m이상)`, `지하주차장`은 **동일 시작일**로 병렬 배치 후, 최대 종료일을 다음 카테고리 시작일로 사용.

### 5.3 최상층 통합

`최상층`은 `기준층`에 포함되어 관리되므로, `기준층` 공정이 존재하면 `최상층` CP를 별도 생성하지 않음.

### 5.4 층 라벨 확장

`expandFloorLabels()` 함수가 다양한 패턴 처리:
- 범위: `7~11F` → `7F, 8F, 9F, 10F, 11F`
- 지하: `B1`, `B2` (정규화)
- 주차장: `B1주차장` → `B1 주차장`
- 6.5m이상: `B16.5m이상` → `B1 6.5m이상`
- 옥탑: `PH1` → `옥탑1층`

---

## 6. 테스트 현황

### 6.1 기존 테스트

**파일**: `apps/web/src/__tests__/utils/process-to-gantt-converter.test.ts`

기존 테스트가 존재하며, 컨버터의 기본 동작을 검증.

### 6.2 추가 테스트 권장 영역

| 영역 | 현황 | 권장 |
|------|------|------|
| 병렬 지하 카테고리 스케줄링 | 미확인 | 병렬 시작/최대 종료일 검증 |
| on-the-fly 계산 (computeFloorItems) | 미확인 | 3-way 계산 각각 검증 |
| 특수행 물량 해석 | 미확인 | 주차장/6.5m이상 시나리오 |
| 층 라벨 확장 (expandFloorLabels) | 미확인 | 범위, 지하, 옥탑 등 패턴별 |
| 최상층 통합 로직 | 미확인 | 기준층 존재 시 최상층 스킵 |
| 간접작업일 (달력일) vs 순작업일 (작업일) | 미확인 | 공휴일 건너뜀 검증 |

---

## 7. 발견된 이슈

### 7.1 [HIGH] 파일 복잡도

**현황**: 1,102 LOC, 19개 내부 함수

**문제점**:
- 단일 파일에 변환 로직, 물량 해석, 스케줄링, 유틸리티가 혼재
- 함수 간 암묵적 의존성 (normalizeFloorLabel 계열 함수 3개)

**권장 분할**:
```
현재: process-to-gantt-converter.ts (1,102 LOC)

권장:
├── process-to-gantt-converter.ts (~400 LOC)  # 메인 변환 로직만
│   └── convertProcessPlansToGanttTasks, convertBuildingPlan, convertCategory
├── gantt-floor-group.ts (~250 LOC)           # 층별 변환
│   └── convertFloorGroup, computeFloorItems, scheduleTasksSequentially
├── gantt-floor-labels.ts (~200 LOC)          # 층 라벨 처리
│   └── expandFloorLabels, getFloorLabelsForCategory, getImportFloorLabelsForCategory
└── gantt-quantity-resolver.ts (~250 LOC)     # 물량 해석
    └── resolveQuantityForFloorItem, resolveQuantityFromSpecialRow, 특수행 처리
```

### 7.2 [MEDIUM] 레거시 마이그레이션 잔재

- `parseLegacyReference()` 호출이 여전히 존재
- `item.quantityRef`(신규)와 `item.quantityReference`(레거시) 이중 체크
- `quantity-reference-migration.ts`로의 의존

**권장**: 레거시 마이그레이션 완료 후 `quantityReference` 필드 및 관련 코드 제거

### 7.3 [LOW] 타입 안전성

```typescript
// line 1043: `as unknown as` 타입 캐스팅
plan.specialRowQuantities as unknown as Record<string, Record<string, number>> | undefined
```

**권장**: `specialRowQuantities`의 타입을 명확히 정의하여 캐스팅 제거

---

## 8. 관련 파일 목록

| 파일 | LOC | 관계 |
|------|-----|------|
| `process-to-gantt-converter.ts` | 1,102 | **본 파일** |
| `process-days-calculator.ts` | - | 항목 필터링, 물량 해석 (공유 로직) |
| `process-calculation.ts` | - | 인력/일수 순수 계산 함수 |
| `process-quantity-resolver.ts` | 229 | 특수행 차감 계산 |
| `quantity-reference.ts` | 660 | 물량 참조 핵심 |
| `quantity-reference-migration.ts` | 113 | 레거시 마이그레이션 |
| `process-cell-reference.ts` | 125 | 셀 참조 유틸 |
| `process-quantity.ts` (types) | 100 | SemanticQuantityReference 타입 |
| `process-to-gantt-converter.test.ts` | - | 테스트 파일 |

---

## 9. 긍정적인 부분

- ✅ **On-the-fly 계산**: 미리 저장 불필요, Building + ProcessModule에서 직접 계산
- ✅ **이중 달력 지원**: 순작업일(작업일)과 간접작업일(달력일) 분리 계산
- ✅ **한국 공휴일 내장**: `KOREAN_HOLIDAYS_ALL` 기본 적용
- ✅ **병렬 스케줄링**: 지하 카테고리 3개를 병렬 배치하는 건설 도메인 로직 반영
- ✅ **층 라벨 정규화**: 다양한 표기법 (B1, PH1, 7~11F 등) 통합 처리
- ✅ **점진적 마이그레이션**: 레거시/신규 물량 참조 방식 공존 지원
- ✅ **테스트 존재**: 기본 검증 테스트 파일 작성됨

---

*이 문서는 코드 분석 자동화 도구를 통해 생성되었으며, 2026-02-10 정확성 교정 시 신규 추가되었습니다.*
