# 물량입력 및 공정계획 계산 로직 전면 분석 보고서

**분석일자:** 2026-02-05
**분석 범위:** 물량 참조 → 공정 계산 → UI 표시 전체 데이터 흐름
**분석 상태:** Phase 1 완료 (물량 참조 검증)

---

## 🎯 Executive Summary

### 발견된 주요 문제점 (우선순위별)

#### 🔴 Critical Issues
1. **반올림 불일치**: `calculateModuleWorkDays`만 `Math.floor` 사용, 나머지는 `Math.ceil`
2. **타입 안전성 부족**: `(tradeData as any)[subField]` 런타임 에러 가능성

#### 🟡 High Priority Issues
3. **에러 로깅 부재**: 물량 조회 실패 시 0 반환, 디버깅 불가
4. **복잡한 분기 로직**: Row 11/12의 3단 분기 (셋팅층→일반층→기준층)
5. **코드 중복**: BasementProcessPlanPage와 BuildingProcessPlanPage useEffect 95% 동일

#### 🟢 Medium Priority Issues
6. **fallback 처리 누락 가능성**: 범위 기준층 ID 결정 로직 복잡
7. **옥탑층 정규화 복잡도**: "옥탑1", "PH1", "ph1" 등 다양한 형식 처리

---

## 📊 Part 1: 물량 참조 시스템 분석

### 1.1 엑셀 참조 패턴 매핑 (quantity-reference.ts)

#### 열(Column) 매핑
```
B → gangForm (갱폼)      → areaM2
C → alForm (알폼)        → areaM2
D → formwork (형틀)      → areaM2
E → stripClean (해체)    → areaM2
F → rebar (철근)         → ton
G → concrete (콘크리트)  → volumeM3
```

#### 행(Row) 매핑
```
Row  6: 버림
Row  7: 기초
Row  8: B2 (지하2층)
Row  9: B1 (지하1층)
Row 11: 1F (셋팅층 → 일반층 순차 검색)
Row 12: 2F (셋팅층 → 일반층 → 기준층 순차 검색)
Row 13: 3F (기준층)
Row 14: 4F (기준층)
...
Row 25: 15F (기준층)
Row 26: PH1 (옥탑1층)
Row 27: PH2 (옥탑2층)
Row 28: PH3 (옥탑3층)
```

### 1.2 특수 참조 패턴

#### A. 비율 계산
```typescript
// 예: F7*0.45 → 기초 철근의 45%
const match = reference.match(/^([A-Z])(\d+)(?:\*([\d.]+))?$/);
const ratio = ratioStr ? parseFloat(ratioStr) : 1;
return quantity * ratio;
```

#### B. 복합 참조
```typescript
// 예: E14+E16 → 4F 해체 + 6F 해체
if (reference.includes('+')) {
  const parts = reference.split('+').map(p => p.trim());
  return parts.reduce((sum, part) => sum + getQuantityByReference(building, part), 0);
}
```

#### C. 지하층 합산
```typescript
// 예: F_B1B2_COMBINED → B1 철근 + B2 철근
const combinedMatch = reference.match(/^([A-Z])_B1B2_COMBINED$/);
if (combinedMatch) {
  const b1Qty = getQuantityFromFloor(building, 'B1', field, subField);
  const b2Qty = getQuantityFromFloor(building, 'B2', field, subField);
  return b1Qty + b2Qty;
}
```

### 1.3 층 라벨 정규화 (normalizeFloorLabel)

**처리 패턴:**
```typescript
// 코어 정보 제거
"코어1-3F" → "3F"

// 옥탑층 통일
"옥탑1" → "PH1"
"옥탑1층" → "PH1"
"옥탑 1" → "PH1"
"PH1" → "PH1"
"Ph1" → "PH1"
"ph1" → "PH1"

// 지하층 통일
"지하1층" → "B1"
"지하1" → "B1"
```

**⚠️ 잠재적 문제:**
- 코어 정보 제거가 항상 안전한가? (라인 48)
- 정규화 후 원본 매칭 실패 시 복구 로직 없음

### 1.4 범위 기준층 처리

#### 개별 층 ID 생성 로직
```typescript
// 예: "2~14F 기준층"의 7F 조회
if (rangeFloor) {
  const floorMatch = floorLabel.match(/(\d+)F/);
  if (floorMatch) {
    const floorNum = parseInt(floorMatch[1], 10);
    // UUID-NF 형식 생성
    individualFloorId = `${rangeFloor.id}-${floorNum}F`;
    // 예: "uuid-123-7F"
  }
}
```

#### 우선순위 체계
1. **개별 층 데이터** (별도 입력된 층) → 최우선
2. **범위 기준층 개별 ID** (`uuid-7F`) → fallback
3. **범위 기준층 자체** (`uuid`) → 마지막 수단

**검증 필요:**
- primaryTargetFloorId 결정 로직 (라인 172-176)
```typescript
let primaryTargetFloorId = (floor ? floor.id : null) || individualFloorId;
// ❓ floor.id가 null인 경우는 없나?
// ❓ individualFloorId가 undefined인 경우 체크 부족
```

### 1.5 타입 안전성 문제

**문제 위치:**
```typescript
// quantity-reference.ts:224
const result = (tradeData as any)[subField] || 0;

// quantity-reference.ts:575
quantity += (tradeData as any)[subField] || 0;
```

**위험도:** 🔴 High
- subField가 잘못된 경우 undefined 반환
- 타입 체크 불가 → 런타임 에러 가능성
- 예: `subField = "invalid"` → `tradeData.invalid` → `undefined`

**해결 방안:**
```typescript
// Option 1: Type Guard
function isValidSubField(field: string): field is keyof TradeData {
  return ['areaM2', 'ton', 'volumeM3'].includes(field);
}

if (isValidSubField(subField)) {
  result = tradeData[subField] || 0;
}

// Option 2: Record Type
type SubFieldMap = Record<string, keyof TradeData>;
const subFieldMap: SubFieldMap = {
  'areaM2': 'areaM2',
  'ton': 'ton',
  'volumeM3': 'volumeM3'
};
```

---

## 📐 Part 2: 계산 로직 분석

### 2.1 계산 우선순위 (3단계)

**process-days-calculator.ts (라인 50-93):**
```typescript
// 1. 고정값 (최우선)
if (item.directWorkDays !== undefined) {
  directWorkDays = item.directWorkDays;
}

// 2. 장비기반
else if (
  item.equipmentCalculationBase !== undefined &&
  item.equipmentWorkersPerUnit !== undefined &&
  item.quantityReference
) {
  const equipmentCount = calculateEquipmentCount(...);
  const dailyInputWorkers = calculateDailyInputWorkersByEquipment(...);
  directWorkDays = calculateWorkDaysWithRounding(...);
}

// 3. 수량기반
else if (item.quantityReference && item.dailyProductivity > 0) {
  const totalWorkers = calculateTotalWorkers(...);
  const dailyInputWorkers = calculateDailyInputWorkers(...);
  directWorkDays = calculateWorkDaysWithRounding(...);
}
```

**useProcessCalculation.ts (라인 211-353):**
```typescript
// 동일한 우선순위 적용 ✓
// 추가: overriddenDirectWorkDays 처리 (라인 356-378)
```

**✅ 일관성:** 두 파일 모두 동일한 우선순위 사용

### 2.2 반올림 규칙 비교

| 함수 | 반올림 방식 | 파일 | 라인 | 용도 |
|------|------------|------|------|------|
| `calculateTotalWorkers` | `Math.ceil` (올림) | process-calculation.ts | 11 | 총 작업인원 |
| `calculateDailyInputWorkers` | `Math.ceil` (올림) | process-calculation.ts | 19 | 1일 투입인원 |
| `calculateTotalWorkDays` | `Math.ceil` (올림) | process-calculation.ts | 26 | 총 작업일수 |
| `calculateWorkDaysWithRounding` | 0.5 기준 조건부 | process-calculation.ts | 33-48 | 순작업일 (복잡) |
| **`calculateModuleWorkDays`** | **`Math.floor` (내림)** | **process-days-calculator.ts** | **98** | **모듈 총일수** |

**🔴 Critical Issue: 반올림 불일치**

```typescript
// process-days-calculator.ts:98
return Math.floor(totalDays);
```

**문제:**
- 대부분의 계산: 올림 (Math.ceil) → 작업일수를 보수적으로 추정
- 모듈 총일수만: 내림 (Math.floor) → 항목별 합산보다 작을 수 있음

**예시:**
```typescript
// Item 1: 2.3일 → Math.ceil → 3일
// Item 2: 1.8일 → Math.ceil → 2일
// 합계: 4.1일 → Math.floor → 4일 (❌ 3 + 2 = 5일과 불일치)
```

**비즈니스 검증 필요:**
- 왜 모듈 총일수만 내림인가?
- 의도적인가, 버그인가?
- 엑셀 원본 수식은?

### 2.3 calculateWorkDaysWithRounding 상세 분석

**process-calculation.ts (라인 33-48):**
```typescript
export function calculateWorkDaysWithRounding(
  quantity: number,
  dailyProductivity: number,
  dailyInputWorkers: number
): number {
  if (dailyProductivity === 0 || dailyInputWorkers === 0) return 1;

  const result = quantity / (dailyProductivity * dailyInputWorkers);
  const decimal = result - Math.floor(result);

  if (decimal < 0.5) {
    return Math.max(1, Math.floor(result));  // 내림
  } else {
    return Math.max(1, Math.ceil(result));   // 올림
  }
}
```

**로직:**
- 소수점 < 0.5: 내림 (예: 3.4 → 3)
- 소수점 ≥ 0.5: 올림 (예: 3.5 → 4)
- 최소값: 1일

**비교: Math.round vs 이 함수**
```typescript
Math.round(3.4) // 3 ✓ 동일
Math.round(3.5) // 4 ✓ 동일
Math.round(3.6) // 4 ✓ 동일
```
→ 사실상 `Math.max(1, Math.round(result))`와 동일

### 2.4 장비기반 계산 (Equipment-Based)

**useProcessCalculation.ts (라인 251-311):**
```typescript
// 1. 장비대수 계산
const maxPumpCarCount = building.meta?.pumpCarCount || 2;
equipmentCount = calculateEquipmentCount(
  quantity,                        // 타설 물량 (m³)
  item.equipmentCalculationBase!,  // 펌프카당 타설량 (예: 250m³)
  maxPumpCarCount                   // 최대 펌프카 (예: 2대)
);
// 예: 400m³, 250m³/대, 최대 2대
// → Math.ceil(Math.min(2, 400/250)) = Math.ceil(1.6) = 2대

// 2. 1일 투입인원 계산
dailyInputWorkers = calculateDailyInputWorkersByEquipment(
  equipmentCount,                   // 2대
  item.equipmentWorkersPerUnit!     // 펌프카당 인원 (예: 15명)
);
// → 2 × 15 = 30명

// 3. 순작업일 계산
directWorkDays = calculateWorkDaysWithRounding(
  quantity,               // 400m³
  item.dailyProductivity, // 인당 생산성 (예: 10m³/명·일)
  dailyInputWorkers       // 30명
);
// → ROUND(400 / (10 × 30)) = ROUND(1.33) = 1일

// 4. 총투입인원 계산 (역산)
totalWorkers = dailyInputWorkers * directWorkDays;
// → 30 × 1 = 30명
```

**특징:**
- 장비대수가 계산의 시작점
- 총투입인원은 역산 (일반 계산과 반대)
- 타설 항목에 주로 사용

### 2.5 오버라이드 처리 (overriddenDirectWorkDays)

**useProcessCalculation.ts (라인 356-378):**
```typescript
const displayDirectWorkDays = overriddenDirectWorkDays !== undefined
  ? overriddenDirectWorkDays
  : directWorkDays;

// 오버라이드된 경우 나머지 항목 재계산
if (overriddenDirectWorkDays !== undefined && overriddenDirectWorkDays > 0) {
  if (isEquipmentBased) {
    // 장비기반: 장비대수 → 1일투입인원 → 총투입인원(역산)
    equipmentCount = calculateEquipmentCount(...);
    dailyInputWorkers = calculateDailyInputWorkersByEquipment(...);
    totalWorkers = dailyInputWorkers * displayDirectWorkDays;
  }
  else if (item.dailyProductivity > 0 && quantity > 0) {
    // 수량기반: 총투입인원 → 1일투입인원(역산)
    if (totalWorkers === 0) {
      totalWorkers = calculateTotalWorkers(...);
    }
    dailyInputWorkers = Math.ceil(totalWorkers / displayDirectWorkDays);
  }
  else if (item.directWorkDays !== undefined && ...) {
    // 고정값: 총투입인원 → 1일투입인원(역산)
    totalWorkers = calculateTotalWorkers(...);
    dailyInputWorkers = calculateDailyInputWorkersByWorkDays(...);
  }
}
```

**✅ 검증 결과:** 모든 분기에서 올바르게 재계산됨

---

## 🧪 Part 3: 테스트 케이스

### 3.1 엑셀 참조 테스트

#### Test Case 1: 단순 참조
```typescript
describe('getQuantityByReference', () => {
  test('D6: 버림 형틀', () => {
    const building = createTestBuilding({
      floorTrades: [
        { tradeGroup: '버림', trades: { formwork: { areaM2: 100 } } }
      ]
    });
    const result = getQuantityByReference(building, 'D6');
    expect(result).toBe(100);
  });

  test('G6: 버림 콘크리트', () => {
    const building = createTestBuilding({
      floorTrades: [
        { tradeGroup: '버림', trades: { concrete: { volumeM3: 50 } } }
      ]
    });
    const result = getQuantityByReference(building, 'G6');
    expect(result).toBe(50);
  });
});
```

#### Test Case 2: 비율 계산
```typescript
test('F7*0.45: 기초 철근 45%', () => {
  const building = createTestBuilding({
    floorTrades: [
      { tradeGroup: '기초', trades: { rebar: { ton: 100 } } }
    ]
  });
  const result = getQuantityByReference(building, 'F7*0.45');
  expect(result).toBe(45); // 100 × 0.45
});
```

#### Test Case 3: 복합 참조
```typescript
test('E14+E16: 4F + 6F 해체', () => {
  const building = createTestBuilding({
    floors: [
      { floorLabel: '4F', floorNumber: 4 },
      { floorLabel: '6F', floorNumber: 6 }
    ],
    floorTrades: [
      { floorId: 'floor-4', trades: { stripClean: { areaM2: 200 } } },
      { floorId: 'floor-6', trades: { stripClean: { areaM2: 150 } } }
    ]
  });
  const result = getQuantityByReference(building, 'E14+E16');
  expect(result).toBe(350); // 200 + 150
});
```

#### Test Case 4: 지하층 합산
```typescript
test('F_B1B2_COMBINED: B1+B2 철근', () => {
  const building = createTestBuilding({
    floors: [
      { floorLabel: 'B2', levelType: '지하' },
      { floorLabel: 'B1', levelType: '지하' }
    ],
    floorTrades: [
      { floorId: 'b2-id', floorLabel: 'B2', trades: { rebar: { ton: 80 } } },
      { floorId: 'b1-id', floorLabel: 'B1', trades: { rebar: { ton: 70 } } }
    ]
  });
  const result = getQuantityByReference(building, 'F_B1B2_COMBINED');
  expect(result).toBe(150); // 80 + 70
});
```

### 3.2 범위 기준층 테스트

#### Test Case 5: 범위 내 층 조회
```typescript
test('7F in "2~14F 기준층"', () => {
  const building = createTestBuilding({
    floors: [
      {
        id: 'range-floor-uuid',
        floorLabel: '2~14F 기준층',
        floorClass: '기준층'
      }
    ],
    floorTrades: [
      {
        floorId: 'range-floor-uuid-7F', // 개별 층 ID
        trades: { formwork: { areaM2: 300 } }
      }
    ]
  });

  const result = getQuantityFromFloor(
    building,
    '7F',
    'formwork',
    'areaM2',
    'range-floor-uuid' // rangeFloorId
  );

  expect(result).toBe(300);
});
```

#### Test Case 6: 코어 정보 포함
```typescript
test('코어1-10F in "코어1-2~14F 기준층"', () => {
  const building = createTestBuilding({
    floors: [
      {
        id: 'core1-range-uuid',
        floorLabel: '코어1-2~14F 기준층',
        floorClass: '기준층'
      }
    ],
    floorTrades: [
      {
        floorId: 'core1-range-uuid-10F',
        trades: { rebar: { ton: 50 } }
      }
    ]
  });

  const result = getQuantityFromFloor(
    building,
    '코어1-10F',
    'rebar',
    'ton',
    'core1-range-uuid'
  );

  expect(result).toBe(50);
});
```

### 3.3 옥탑층 정규화 테스트

#### Test Case 7: 다양한 옥탑 형식
```typescript
describe('normalizeFloorLabel', () => {
  const testCases = [
    { input: '옥탑1', expected: 'PH1' },
    { input: '옥탑1층', expected: 'PH1' },
    { input: '옥탑 1', expected: 'PH1' },
    { input: '옥탑 1층', expected: 'PH1' },
    { input: 'PH1', expected: 'PH1' },
    { input: 'Ph1', expected: 'PH1' },
    { input: 'ph1', expected: 'PH1' },
    { input: '코어1-PH1', expected: 'PH1' }, // 코어 제거
  ];

  testCases.forEach(({ input, expected }) => {
    test(`"${input}" → "${expected}"`, () => {
      expect(normalizeFloorLabel(input)).toBe(expected);
    });
  });
});
```

### 3.4 에러 처리 테스트

#### Test Case 8: Division by Zero
```typescript
describe('Division by Zero Handling', () => {
  test('calculateTotalWorkers with zero productivity', () => {
    const result = calculateTotalWorkers(100, 0);
    expect(result).toBe(0); // ✅ Handled
  });

  test('calculateDailyInputWorkers with zero equipment', () => {
    const result = calculateDailyInputWorkers(50, 0);
    expect(result).toBe(0); // ✅ Handled
  });

  test('calculateWorkDaysWithRounding with zero inputs', () => {
    const result = calculateWorkDaysWithRounding(100, 0, 10);
    expect(result).toBe(1); // ✅ Returns minimum 1
  });
});
```

#### Test Case 9: 물량 조회 실패
```typescript
describe('Quantity Lookup Failures', () => {
  test('Floor not found', () => {
    const building = createTestBuilding({ floors: [] });
    const result = getQuantityFromFloor(building, '10F', 'formwork', 'areaM2');
    expect(result).toBe(0); // ⚠️ No error logging
  });

  test('Trade not found', () => {
    const building = createTestBuilding({
      floors: [{ id: 'f1', floorLabel: '3F' }],
      floorTrades: [] // Empty
    });
    const result = getQuantityFromFloor(building, '3F', 'formwork', 'areaM2');
    expect(result).toBe(0); // ⚠️ No error logging
  });

  test('Invalid subField', () => {
    const building = createTestBuilding({
      floors: [{ id: 'f1', floorLabel: '3F' }],
      floorTrades: [
        { floorId: 'f1', trades: { formwork: { areaM2: 100 } } }
      ]
    });
    // @ts-expect-error Testing invalid input
    const result = getQuantityFromFloor(building, '3F', 'formwork', 'invalidField');
    expect(result).toBe(0); // ⚠️ Type safety issue
  });
});
```

### 3.5 반올림 불일치 테스트

#### Test Case 10: 모듈 총일수 vs 항목 합산
```typescript
test('Rounding Inconsistency: Math.floor vs Math.ceil', () => {
  const module: ProcessModule = {
    items: [
      {
        name: 'Item 1',
        quantityReference: 'D13',
        dailyProductivity: 10,
        equipmentCount: 2,
        // 수량 46 / (10 × 3) = 1.53 → Math.ceil → 2일
      },
      {
        name: 'Item 2',
        quantityReference: 'D14',
        dailyProductivity: 15,
        equipmentCount: 2,
        // 수량 55 / (15 × 3) = 1.22 → Math.ceil → 2일
      }
    ]
  };

  const building = createTestBuilding({
    floorTrades: [
      { floorId: '3f-id', trades: { formwork: { areaM2: 46 } } },
      { floorId: '4f-id', trades: { formwork: { areaM2: 55 } } }
    ]
  });

  const result = calculateModuleWorkDays(building, module, '기준층');

  // 예상: Item1(2일) + Item2(2일) = 4일
  // 실제: Math.floor(1.53 + 1.22) = Math.floor(2.75) = 2일
  // ❌ 불일치 발생!

  expect(result).toBe(2); // 현재 동작
  // expect(result).toBe(4); // 기대 동작?
});
```

---

## 📋 Part 4: 코드 품질 검토

### 4.1 타입 안전성 문제

#### 문제 위치
```typescript
// quantity-reference.ts:224
const result = (tradeData as any)[subField] || 0;

// quantity-reference.ts:575
quantity += (tradeData as any)[subField] || 0;
```

#### 개선 방안
```typescript
// Option 1: Type Guard
type TradeDataField = 'areaM2' | 'ton' | 'volumeM3';

function isValidTradeField(field: string): field is TradeDataField {
  return ['areaM2', 'ton', 'volumeM3'].includes(field);
}

export function getQuantityFromFloor(...): number {
  // ...
  if (!isValidTradeField(subField)) {
    console.error(`[getQuantityFromFloor] Invalid subField: ${subField}`);
    return 0;
  }
  const result = tradeData[subField] || 0;
  return result;
}

// Option 2: TradeData 타입 강화
interface TradeData {
  areaM2?: number;
  ton?: number;
  volumeM3?: number;
  [key: string]: number | undefined; // Index signature
}

// 사용
const result = (tradeData[subField] as number | undefined) ?? 0;
```

### 4.2 에러 로깅 부족

#### 현재 상태
```typescript
if (!floor && !rangeFloor) {
  return 0; // ⚠️ Silent failure
}

if (!trade) {
  return 0; // ⚠️ Silent failure
}
```

#### 개선 방안
```typescript
// Option 1: Console Logging (Development Only)
if (!floor && !rangeFloor) {
  if (process.env.NODE_ENV === 'development') {
    console.warn(
      `[getQuantityFromFloor] Floor not found: ${floorLabel}`,
      { buildingId: building.id, availableFloors: building.floors.map(f => f.floorLabel) }
    );
  }
  return 0;
}

// Option 2: Result Type (Production-Ready)
type QuantityResult =
  | { success: true; value: number }
  | { success: false; error: string; context?: any };

export function getQuantityFromFloorSafe(...): QuantityResult {
  if (!floor && !rangeFloor) {
    return {
      success: false,
      error: 'Floor not found',
      context: { floorLabel, availableFloors: building.floors.map(f => f.floorLabel) }
    };
  }
  // ...
  return { success: true, value: result };
}
```

### 4.3 복잡한 분기 로직 (Row 11, 12)

#### 현재 코드 (quantity-reference.ts:346-440)
```typescript
else if (rowNum === 11) {
  // 행 11은 1층 - 셋팅층 또는 일반층일 수 있음
  const floorNum = rowNum - 10;

  // 먼저 셋팅층으로 찾기
  let floor = building.floors.find(f => {
    if (f.floorClass === '셋팅층') {
      const match = f.floorLabel.match(/(\d+)F|(\d+)층/);
      if (match) {
        const num = parseInt(match[1] || match[2], 10);
        return num === floorNum;
      }
    }
    return false;
  });

  if (floor) {
    tradeGroup = '셋팅층';
    floorLabel = floor.floorLabel;
  } else {
    // 일반층으로 찾기
    floor = building.floors.find(f => {
      if (f.floorClass === '일반층') {
        const match = f.floorLabel.match(/(\d+)F|(\d+)층/);
        if (match) {
          const num = parseInt(match[1] || match[2], 10);
          return num === floorNum;
        }
      }
      return false;
    });
    if (floor) {
      tradeGroup = '셋팅층';
      floorLabel = floor.floorLabel;
    }
  }
}

else if (rowNum === 12) {
  // 행 12는 2층 - 셋팅층, 일반층 또는 기준층일 수 있음
  const floorNum = rowNum - 10;

  // 먼저 셋팅층으로 찾기 (34줄 중복)
  // ... 동일한 로직 ...

  // 일반층으로 찾기 (34줄 중복)
  // ... 동일한 로직 ...

  // 기준층으로 처리 (추가 분기)
  // ...
}
```

#### 중복도 분석
- Row 11: 2단 분기 (셋팅층 → 일반층)
- Row 12: 3단 분기 (셋팅층 → 일반층 → 기준층)
- 셋팅층/일반층 찾기 로직이 95% 동일

#### 개선 방안
```typescript
/**
 * 층 번호로 특정 클래스의 층 찾기 (중복 제거)
 */
function findFloorByNumberAndClass(
  building: Building,
  floorNum: number,
  floorClasses: string[]
): { floor: Floor; tradeGroup: string } | null {
  for (const floorClass of floorClasses) {
    const floor = building.floors.find(f => {
      if (f.floorClass === floorClass) {
        const match = f.floorLabel.match(/(\d+)F|(\d+)층/);
        if (match) {
          const num = parseInt(match[1] || match[2], 10);
          return num === floorNum;
        }
      }
      return false;
    });

    if (floor) {
      // tradeGroup 결정 로직
      const tradeGroup = floorClass === '기준층' ? '기준층' : '셋팅층';
      return { floor, tradeGroup };
    }
  }

  return null;
}

// 사용
else if (rowNum === 11) {
  const floorNum = rowNum - 10;
  const result = findFloorByNumberAndClass(building, floorNum, ['셋팅층', '일반층']);
  if (result) {
    tradeGroup = result.tradeGroup;
    floorLabel = result.floor.floorLabel;
  }
}

else if (rowNum === 12) {
  const floorNum = rowNum - 10;
  const result = findFloorByNumberAndClass(building, floorNum, ['셋팅층', '일반층', '기준층']);
  if (result) {
    tradeGroup = result.tradeGroup;
    floorLabel = result.floor.floorLabel;

    // 기준층인 경우 범위 처리 추가
    if (result.floor.floorClass === '기준층' && result.floor.floorLabel.includes('~')) {
      // ... 기존 범위 처리 로직 ...
    }
  }
}
```

### 4.4 코드 중복 (UI 페이지)

#### 중복 위치
- `BasementProcessPlanPage.tsx` useEffect
- `BuildingProcessPlanPage.tsx` useEffect

#### 중복 내용
```typescript
// 두 파일 모두 동일한 패턴
useEffect(() => {
  if (!building || !selectedCategory || !selectedProcessType) return;

  const module = getProcessModule(selectedCategory, selectedProcessType);
  if (!module) return;

  // 카테고리별 분기만 다름
  if (selectedCategory === '주동 지하층') {
    // Basement-specific logic
  } else {
    // Building-specific logic
  }

  // 계산 로직 동일
  const totalDays = calculateModuleWorkDays(building, module, selectedCategory);
  // ...
}, [building, selectedCategory, selectedProcessType]);
```

#### 개선 방안
```typescript
// hooks/useAutoProcessCalculation.ts (신규 파일)
export function useAutoProcessCalculation(
  building: Building | null,
  selectedCategory: ProcessCategory | null,
  selectedProcessType: ProcessType | null,
  categoryConfig: {
    isBasement?: boolean;
    enableFloorCalculation?: boolean;
  }
) {
  useEffect(() => {
    if (!building || !selectedCategory || !selectedProcessType) return;

    const module = getProcessModule(selectedCategory, selectedProcessType);
    if (!module) return;

    let totalDays = 0;

    if (categoryConfig.isBasement) {
      // Basement logic
      totalDays = calculateBasementDays(building, module, selectedCategory);
    } else {
      // Building logic
      totalDays = calculateBuildingDays(building, module, selectedCategory);
    }

    // 공통 처리
    updateProcessPlan(building.id, selectedCategory, {
      processType: selectedProcessType,
      workDays: totalDays,
    });
  }, [building, selectedCategory, selectedProcessType, categoryConfig]);
}

// 사용
// BasementProcessPlanPage.tsx
useAutoProcessCalculation(building, selectedCategory, selectedProcessType, {
  isBasement: true,
  enableFloorCalculation: true,
});

// BuildingProcessPlanPage.tsx
useAutoProcessCalculation(building, selectedCategory, selectedProcessType, {
  isBasement: false,
  enableFloorCalculation: false,
});
```

---

## 🎯 Part 5: 우선순위별 개선안

### 🔴 Critical (즉시 수정 필요)

#### 1. 반올림 불일치 해결
**파일:** `process-days-calculator.ts:98`

**현재:**
```typescript
return Math.floor(totalDays);
```

**개선안 A (비즈니스 로직 확인 후):**
```typescript
// 엑셀 원본 수식 확인 필요
// Option 1: Math.ceil로 통일 (보수적 추정)
return Math.ceil(totalDays);

// Option 2: Math.round로 변경 (반올림)
return Math.round(totalDays);

// Option 3: 현재 유지 (의도적인 경우)
return Math.floor(totalDays); // + 주석 추가
```

**액션:**
1. 엑셀 "골조표준공정 일수고정 산식표" 확인
2. 비즈니스 담당자와 논의
3. 테스트 케이스 작성 후 수정

#### 2. 타입 안전성 강화
**파일:** `quantity-reference.ts:224, 575`

**현재:**
```typescript
const result = (tradeData as any)[subField] || 0;
```

**개선안:**
```typescript
// Step 1: Type Guard 추가
type ValidSubField = 'areaM2' | 'ton' | 'volumeM3';

function isValidSubField(field: string): field is ValidSubField {
  return ['areaM2', 'ton', 'volumeM3'].includes(field);
}

// Step 2: 안전한 접근
export function getQuantityFromFloor(...): number {
  // ...
  if (!tradeData) {
    if (process.env.NODE_ENV === 'development') {
      console.warn('[getQuantityFromFloor] Trade data not found', { field });
    }
    return 0;
  }

  if (!isValidSubField(subField)) {
    console.error('[getQuantityFromFloor] Invalid subField:', subField);
    return 0;
  }

  const result = tradeData[subField] ?? 0;
  return result;
}
```

**예상 효과:**
- 런타임 에러 방지
- 개발 중 버그 조기 발견
- 타입 추론 개선

### 🟡 High Priority (1-2주 내 수정)

#### 3. 에러 로깅 추가
**파일:** `quantity-reference.ts` 전체

**개선안:**
```typescript
// utils/logger.ts (신규 파일)
export const logger = {
  warn: (message: string, context?: any) => {
    if (process.env.NODE_ENV === 'development') {
      console.warn(`[ConTech-DX] ${message}`, context);
    }
  },
  error: (message: string, context?: any) => {
    console.error(`[ConTech-DX] ${message}`, context);
  },
};

// quantity-reference.ts 적용
import { logger } from './logger';

export function getQuantityFromFloor(...): number {
  if (!floor && !rangeFloor) {
    logger.warn('Floor not found', {
      floorLabel,
      buildingId: building.id,
      availableFloors: building.floors.map(f => f.floorLabel),
    });
    return 0;
  }

  if (!trade) {
    logger.warn('Trade not found', {
      floorLabel,
      floorId: primaryTargetFloorId,
      tradeGroupPriority,
      availableTrades: building.floorTrades.map(ft => ({
        floorId: ft.floorId,
        tradeGroup: ft.tradeGroup,
      })),
    });
    return 0;
  }

  // ...
}
```

#### 4. 복잡한 분기 로직 리팩토링
**파일:** `quantity-reference.ts:346-440`

**Step 1:** 공통 함수 추출 (위의 4.3 참조)
**Step 2:** 유닛 테스트 작성
**Step 3:** 점진적 마이그레이션

### 🟢 Medium Priority (1개월 내 개선)

#### 5. 코드 중복 제거
**파일:** `BasementProcessPlanPage.tsx`, `BuildingProcessPlanPage.tsx`

**Step 1:** 공통 훅 생성 (위의 4.4 참조)
**Step 2:** 테스트 작성
**Step 3:** 점진적 마이그레이션

#### 6. 테스트 커버리지 확보
**목표:** 핵심 로직 80% 이상

**우선순위:**
1. `quantity-reference.ts` (물량 조회 핵심)
2. `process-calculation.ts` (계산 함수)
3. `process-days-calculator.ts` (모듈 계산)
4. `useProcessCalculation.ts` (통합 로직)

---

## 📊 Part 6: 리팩토링 로드맵

### Phase 1: 안정성 확보 (1주)
- [x] 전면 분석 완료
- [ ] 반올림 불일치 비즈니스 검증
- [ ] 타입 안전성 강화 구현
- [ ] Critical 이슈 수정
- [ ] 회귀 테스트 작성

### Phase 2: 에러 처리 개선 (1-2주)
- [ ] Logger 유틸리티 추가
- [ ] 모든 조회 함수에 에러 로깅 적용
- [ ] Result 타입 도입 검토
- [ ] 개발 환경 디버깅 개선

### Phase 3: 코드 품질 개선 (2-3주)
- [ ] Row 11/12 분기 로직 리팩토링
- [ ] 공통 함수 추출
- [ ] useAutoProcessCalculation 훅 생성
- [ ] UI 페이지 코드 중복 제거

### Phase 4: 테스트 커버리지 (3-4주)
- [ ] 물량 참조 테스트 스위트
- [ ] 계산 로직 테스트 스위트
- [ ] 통합 테스트 추가
- [ ] 엣지 케이스 테스트

### Phase 5: 문서화 (지속적)
- [ ] 계산 로직 문서 작성
- [ ] API 문서 생성
- [ ] 예제 코드 추가
- [ ] 트러블슈팅 가이드

---

## 🔍 Part 7: 추가 검증 필요 사항

### 7.1 비즈니스 로직 확인
- [ ] `Math.floor(totalDays)`가 의도적인가?
- [ ] 엑셀 원본 수식과 일치하는가?
- [ ] 옥탑층 정규화 규칙이 올바른가?

### 7.2 엣지 케이스 확인
- [ ] 층고 6.5m 이상 (층 추가 생성)
- [ ] 코어가 3개 이상인 경우
- [ ] 옥탑층이 4층 이상인 경우
- [ ] 지하층이 3층 이상인 경우

### 7.3 성능 검증
- [ ] 대형 프로젝트 (50층 이상)에서 성능 테스트
- [ ] 메모이제이션 최적화 검토
- [ ] 불필요한 재계산 방지

---

## 📌 Conclusion

### 요약
1. **물량 참조 시스템**: 엑셀 패턴 → tradeGroup/floor 매핑이 복잡하지만 논리적
2. **계산 로직**: 우선순위 체계가 명확하고 일관적
3. **주요 문제**: 반올림 불일치, 타입 안전성, 에러 로깅 부족
4. **개선 방향**: Critical 이슈 우선 해결 → 코드 품질 개선 → 테스트 추가

### 다음 단계
1. 비즈니스 담당자와 반올림 로직 논의
2. 타입 안전성 강화 PR 작성
3. 테스트 스위트 구축
4. 단계별 리팩토링 실행

---

**문서 작성:** AI Agent
**검토자:** _[검토자 이름]_
**승인일:** _[승인 날짜]_
