# 공정계획 계산 로직 개선 로드맵

**문서 버전:** 1.0
**작성일:** 2026-02-05
**예상 기간:** 4-6주
**우선순위 기준:** Critical → High → Medium

---

## 📋 목차

1. [개요](#1-개요)
2. [우선순위별 개선 항목](#2-우선순위별-개선-항목)
3. [Phase 1: Critical Issues (1주)](#phase-1-critical-issues-1주)
4. [Phase 2: High Priority (2주)](#phase-2-high-priority-2주)
5. [Phase 3: Medium Priority (2-3주)](#phase-3-medium-priority-2-3주)
6. [Phase 4: Long-term (지속적)](#phase-4-long-term-지속적)
7. [구현 체크리스트](#7-구현-체크리스트)

---

## 1. 개요

### 1.1 분석 결과 요약

**전면 분석 완료 항목:**
- ✅ 물량 참조 시스템 (quantity-reference.ts)
- ✅ 계산 로직 일관성 (process-calculation.ts, process-days-calculator.ts)
- ✅ UI 통합 로직 (useProcessCalculation.ts)
- ✅ 엣지 케이스 및 에러 처리

**발견된 주요 문제:**
- 🔴 반올림 불일치 (Math.floor vs Math.ceil)
- 🔴 타입 안전성 부족 (any 타입 사용)
- 🟡 에러 로깅 부재
- 🟡 복잡한 분기 로직 (Row 11/12)
- 🟡 코드 중복 (UI 페이지)
- 🟢 멀티 코어 처리 미지원
- 🟢 옥탑/지하 3층 제한

### 1.2 개선 목표

1. **안정성 강화**: 타입 안전성 + 에러 처리
2. **유지보수성 향상**: 코드 중복 제거 + 복잡도 감소
3. **디버깅 개선**: 에러 로깅 + 테스트 커버리지
4. **확장성 확보**: 멀티 코어 + 층수 제한 해제

---

## 2. 우선순위별 개선 항목

### 🔴 Critical (즉시 수정)

| 항목 | 영향도 | 난이도 | 예상 시간 |
|------|--------|--------|----------|
| 반올림 불일치 해결 | High | Low | 2-4시간 |
| 타입 안전성 강화 | High | Medium | 4-6시간 |

### 🟡 High Priority (1-2주 내)

| 항목 | 영향도 | 난이도 | 예상 시간 |
|------|--------|--------|----------|
| 에러 로깅 추가 | Medium | Low | 4-6시간 |
| Row 11/12 분기 리팩토링 | Medium | Medium | 6-8시간 |
| 테스트 스위트 작성 | High | High | 8-16시간 |

### 🟢 Medium Priority (1개월 내)

| 항목 | 영향도 | 난이도 | 예상 시간 |
|------|--------|--------|----------|
| UI 페이지 코드 중복 제거 | Low | Medium | 6-8시간 |
| 멀티 코어 지원 | Medium | High | 8-12시간 |
| 옥탑/지하 확장 지원 | Low | Medium | 4-6시간 |

---

## Phase 1: Critical Issues (1주)

### 🎯 목표
시스템의 핵심 계산 로직 안정성 확보

### 📌 Issue 1: 반올림 불일치 해결

**현재 문제:**
```typescript
// process-days-calculator.ts:98
return Math.floor(totalDays); // ❌ 다른 함수들은 Math.ceil 사용
```

**Step 1: 비즈니스 로직 확인 (1-2시간)**
- [ ] 엑셀 원본 수식 확인
  - 파일: "골조표준공정 일수고정 산식표.xlsx"
  - 모듈 총일수 셀 수식 확인
- [ ] 비즈니스 담당자와 논의
  - 질문: "모듈 총일수가 항목별 합산보다 작아도 되는가?"
  - 질문: "보수적 추정(올림) vs 공격적 일정(내림) 중 어느 것이 정책인가?"

**Step 2: 테스트 케이스 작성 (1시간)**
```typescript
// __tests__/process-days-calculator.test.ts
describe('calculateModuleWorkDays rounding', () => {
  test('should match item summation', () => {
    const module = {
      items: [
        { directWorkDays: 2.3 }, // Math.ceil → 3일
        { directWorkDays: 1.8 }  // Math.ceil → 2일
      ]
    };

    const result = calculateModuleWorkDays(building, module, '기준층');

    // 현재: Math.floor(4.1) = 4일
    // 기대: 3 + 2 = 5일?
    expect(result).toBe(5); // 또는 4? (비즈니스 결정)
  });
});
```

**Step 3: 수정 구현 (1시간)**
```typescript
// Option A: Math.ceil로 통일 (보수적)
export function calculateModuleWorkDays(...): number {
  // ...
  return Math.ceil(totalDays); // 변경
}

// Option B: Math.round 사용 (균형)
export function calculateModuleWorkDays(...): number {
  // ...
  return Math.round(totalDays); // 변경
}

// Option C: 현재 유지 (의도적인 경우)
export function calculateModuleWorkDays(...): number {
  // ...
  // 비즈니스 정책: 모듈 총일수는 내림 처리 (공격적 일정)
  return Math.floor(totalDays);
}
```

**Step 4: 회귀 테스트 (1시간)**
- [ ] 기존 프로젝트 데이터로 테스트
- [ ] 변경 전/후 비교
- [ ] 영향 범위 확인

**예상 시간:** 4-5시간
**담당:** _[개발자 이름]_
**검증:** _[검토자 이름]_

---

### 📌 Issue 2: 타입 안전성 강화

**현재 문제:**
```typescript
// quantity-reference.ts:224, 575
const result = (tradeData as any)[subField] || 0; // ❌ 런타임 에러 가능
```

**Step 1: Type Guard 추가 (2시간)**
```typescript
// types/trade-data.ts (신규)
export interface TradeData {
  areaM2?: number;
  ton?: number;
  volumeM3?: number;
}

export type ValidSubField = 'areaM2' | 'ton' | 'volumeM3';

export function isValidSubField(field: string): field is ValidSubField {
  return ['areaM2', 'ton', 'volumeM3'].includes(field);
}
```

**Step 2: quantity-reference.ts 수정 (2-3시간)**
```typescript
import { isValidSubField, type ValidSubField } from '@/lib/types/trade-data';

export function getQuantityFromFloor(
  building: Building,
  floorLabel: string,
  field: 'gangForm' | 'alForm' | 'formwork' | 'stripClean' | 'rebar' | 'concrete',
  subField: string, // ValidSubField로 변경 고려
  rangeFloorId?: string
): number {
  // ...

  const tradeData = trade.trades[field];
  if (!tradeData) {
    logger.warn('[getQuantityFromFloor] Trade data not found', { field });
    return 0;
  }

  // Type Guard 적용
  if (!isValidSubField(subField)) {
    logger.error('[getQuantityFromFloor] Invalid subField', {
      subField,
      validFields: ['areaM2', 'ton', 'volumeM3']
    });
    return 0;
  }

  // 타입 안전한 접근
  const result = tradeData[subField] ?? 0;
  return result;
}
```

**Step 3: 영향 범위 파악 (1시간)**
- [ ] `getQuantityByReference` 수정 (라인 575)
- [ ] `useProcessCalculation.ts` 호출부 확인
- [ ] 타입 에러 수정

**Step 4: 테스트 작성 (1시간)**
```typescript
describe('Type Safety', () => {
  test('should handle valid subField', () => {
    const result = getQuantityFromFloor(building, '3F', 'formwork', 'areaM2');
    expect(result).toBeGreaterThanOrEqual(0);
  });

  test('should reject invalid subField', () => {
    // @ts-expect-error Testing invalid input
    const result = getQuantityFromFloor(building, '3F', 'formwork', 'invalid');
    expect(result).toBe(0);
  });
});
```

**예상 시간:** 6-7시간
**담당:** _[개발자 이름]_
**검증:** _[검토자 이름]_

---

## Phase 2: High Priority (2주)

### 🎯 목표
디버깅 환경 개선 + 코드 품질 향상

### 📌 Issue 3: 에러 로깅 추가

**Step 1: Logger 유틸리티 생성 (1시간)**
```typescript
// lib/utils/logger.ts (신규)
type LogLevel = 'debug' | 'info' | 'warn' | 'error';

interface LogContext {
  [key: string]: any;
}

class Logger {
  private enabled: boolean;

  constructor() {
    this.enabled = process.env.NODE_ENV === 'development';
  }

  debug(message: string, context?: LogContext) {
    if (this.enabled) {
      console.debug(`[ConTech-DX][DEBUG] ${message}`, context);
    }
  }

  warn(message: string, context?: LogContext) {
    if (this.enabled) {
      console.warn(`[ConTech-DX][WARN] ${message}`, context);
    }
  }

  error(message: string, context?: LogContext) {
    console.error(`[ConTech-DX][ERROR] ${message}`, context);
  }

  info(message: string, context?: LogContext) {
    if (this.enabled) {
      console.info(`[ConTech-DX][INFO] ${message}`, context);
    }
  }
}

export const logger = new Logger();
```

**Step 2: quantity-reference.ts 적용 (2-3시간)**
```typescript
import { logger } from './logger';

export function getQuantityFromFloor(...): number {
  // Floor not found
  if (!floor && !rangeFloor) {
    logger.warn('Floor not found', {
      floorLabel,
      buildingId: building.id,
      availableFloors: building.floors.map(f => ({
        id: f.id,
        label: f.floorLabel,
        class: f.floorClass
      }))
    });
    return 0;
  }

  // Trade not found
  if (!trade) {
    logger.warn('Trade not found', {
      floorLabel,
      floorId: primaryTargetFloorId,
      tradeGroupPriority,
      availableTrades: building.floorTrades
        .filter(ft => ft.floorId === primaryTargetFloorId)
        .map(ft => ({
          floorId: ft.floorId,
          tradeGroup: ft.tradeGroup,
          fields: Object.keys(ft.trades)
        }))
    });
    return 0;
  }

  // Success (optional debug log)
  logger.debug('Quantity retrieved', {
    floorLabel,
    field,
    subField,
    value: result
  });

  return result;
}
```

**Step 3: 다른 파일 적용 (1-2시간)**
- [ ] `getQuantityByReference` 에러 로깅
- [ ] `process-calculation.ts` 경고 로깅
- [ ] `useProcessCalculation.ts` 디버그 로깅

**예상 시간:** 4-6시간

---

### 📌 Issue 4: Row 11/12 분기 리팩토링

**Step 1: 공통 함수 추출 (3-4시간)**
```typescript
// quantity-reference.ts

interface FloorSearchResult {
  floor: Floor;
  tradeGroup: string;
}

/**
 * 층 번호와 클래스로 층 찾기 (중복 제거)
 */
function findFloorByNumberAndClass(
  building: Building,
  floorNum: number,
  floorClasses: string[]
): FloorSearchResult | null {
  for (const floorClass of floorClasses) {
    const floor = building.floors.find(f => {
      if (f.floorClass !== floorClass) return false;

      // 정확한 층 번호 매칭
      const match = f.floorLabel.match(/(\d+)F|(\d+)층/);
      if (match) {
        const num = parseInt(match[1] || match[2], 10);
        return num === floorNum;
      }

      // 범위 형식 기준층 확인
      if (floorClass === '기준층' && f.floorLabel.includes('~')) {
        const cleanLabel = f.floorLabel.replace(/코어\d+-/, '').replace(/\s*기준층\s*$/, '');
        const rangeMatch = cleanLabel.match(/(\d+)~(\d+)F/);
        if (rangeMatch) {
          const start = parseInt(rangeMatch[1], 10);
          const end = parseInt(rangeMatch[2], 10);
          return floorNum >= start && floorNum <= end;
        }
      }

      return false;
    });

    if (floor) {
      // tradeGroup 결정
      const tradeGroup = floorClass === '기준층' ? '기준층' : '셋팅층';
      return { floor, tradeGroup };
    }
  }

  return null;
}
```

**Step 2: Row 11/12 리팩토링 (2-3시간)**
```typescript
export function getQuantityByReference(building: Building, reference: string): number {
  // ... (기존 코드)

  else if (rowNum === 11) {
    // 행 11: 1층 (셋팅층 → 일반층)
    const floorNum = rowNum - 10;
    const result = findFloorByNumberAndClass(building, floorNum, ['셋팅층', '일반층']);

    if (result) {
      tradeGroup = result.tradeGroup;
      floorLabel = result.floor.floorLabel;
    }
  }

  else if (rowNum === 12) {
    // 행 12: 2층 (셋팅층 → 일반층 → 기준층)
    const floorNum = rowNum - 10;
    const result = findFloorByNumberAndClass(building, floorNum, ['셋팅층', '일반층', '기준층']);

    if (result) {
      tradeGroup = result.tradeGroup;
      floorLabel = result.floor.floorLabel;

      // 기준층 범위 처리
      if (result.floor.floorClass === '기준층' && result.floor.floorLabel.includes('~')) {
        const hasCore = result.floor.floorLabel.includes('코어');
        if (hasCore) {
          const coreMatch = result.floor.floorLabel.match(/코어(\d+)-/);
          floorLabel = coreMatch ? `코어${coreMatch[1]}-${floorNum}F` : `${floorNum}F`;
        } else {
          floorLabel = `${floorNum}F`;
        }
      }
    }
  }

  // ... (기존 코드)
}
```

**Step 3: 테스트 작성 (2시간)**
```typescript
describe('findFloorByNumberAndClass', () => {
  test('셋팅층 우선 검색', () => {
    const building = {
      floors: [
        { floorLabel: '1F', floorClass: '셋팅층' },
        { floorLabel: '1F', floorClass: '일반층' }
      ]
    };
    const result = findFloorByNumberAndClass(building, 1, ['셋팅층', '일반층']);
    expect(result?.floor.floorClass).toBe('셋팅층');
  });

  test('기준층 범위 매칭', () => {
    const building = {
      floors: [
        { floorLabel: '2~14F 기준층', floorClass: '기준층' }
      ]
    };
    const result = findFloorByNumberAndClass(building, 7, ['기준층']);
    expect(result?.tradeGroup).toBe('기준층');
  });
});
```

**예상 시간:** 6-8시간

---

### 📌 Issue 5: 테스트 스위트 작성

**Step 1: 테스트 환경 설정 (2시간)**
```typescript
// __tests__/helpers/test-builders.ts
export function createTestBuilding(options: Partial<Building>): Building {
  return {
    id: 'test-building-id',
    name: 'Test Building',
    floors: options.floors || [],
    floorTrades: options.floorTrades || [],
    meta: options.meta || { pumpCarCount: 2 },
    ...options
  };
}

export function createTestFloor(options: Partial<Floor>): Floor {
  return {
    id: 'test-floor-id',
    floorLabel: '3F',
    floorNumber: 3,
    floorClass: '기준층',
    levelType: '지상',
    ...options
  };
}
```

**Step 2: 물량 참조 테스트 (4-6시간)**
```typescript
// __tests__/quantity-reference.test.ts
describe('getQuantityByReference', () => {
  describe('단순 참조', () => {
    test('D6: 버림 형틀', () => { /* ... */ });
    test('G6: 버림 콘크리트', () => { /* ... */ });
  });

  describe('비율 계산', () => {
    test('F7*0.45: 기초 철근 45%', () => { /* ... */ });
  });

  describe('복합 참조', () => {
    test('E14+E16: 4F + 6F', () => { /* ... */ });
  });

  describe('지하층 합산', () => {
    test('F_B1B2_COMBINED', () => { /* ... */ });
  });
});
```

**Step 3: 계산 로직 테스트 (4-6시간)**
```typescript
// __tests__/process-calculation.test.ts
describe('계산 함수', () => {
  describe('Division by Zero', () => { /* ... */ });
  describe('반올림 규칙', () => { /* ... */ });
  describe('장비기반 계산', () => { /* ... */ });
});
```

**Step 4: 통합 테스트 (2-4시간)**
```typescript
// __tests__/integration/process-calculation.test.ts
describe('전체 계산 흐름', () => {
  test('셋팅층 공정 계산', () => { /* ... */ });
  test('기준층 범위 계산', () => { /* ... */ });
  test('옥탑층 계산', () => { /* ... */ });
});
```

**예상 시간:** 12-18시간
**목표 커버리지:** 80% 이상

---

## Phase 3: Medium Priority (2-3주)

### 🎯 목표
코드 품질 개선 + 기능 확장

### 📌 Issue 6: UI 페이지 코드 중복 제거

**Step 1: 공통 훅 생성 (4-5시간)**
```typescript
// hooks/useAutoProcessCalculation.ts (신규)
interface UseAutoProcessCalculationOptions {
  building: Building | null;
  selectedCategory: ProcessCategory | null;
  selectedProcessType: ProcessType | null;
  config: {
    isBasement?: boolean;
    enableFloorCalculation?: boolean;
    onCalculationComplete?: (days: number) => void;
  };
}

export function useAutoProcessCalculation({
  building,
  selectedCategory,
  selectedProcessType,
  config
}: UseAutoProcessCalculationOptions) {
  useEffect(() => {
    if (!building || !selectedCategory || !selectedProcessType) return;

    const module = getProcessModule(selectedCategory, selectedProcessType);
    if (!module) return;

    let totalDays = 0;

    if (config.isBasement) {
      // 지하층 로직
      totalDays = calculateBasementDays(building, module, selectedCategory);
    } else {
      // 지상층 로직
      totalDays = calculateBuildingDays(building, module, selectedCategory);
    }

    // 상태 업데이트
    updateProcessPlan(building.id, selectedCategory, {
      processType: selectedProcessType,
      workDays: totalDays,
    });

    // 콜백 실행
    config.onCalculationComplete?.(totalDays);

    logger.info('Auto calculation completed', {
      category: selectedCategory,
      processType: selectedProcessType,
      totalDays
    });
  }, [building, selectedCategory, selectedProcessType, config]);
}
```

**Step 2: 페이지 리팩토링 (2-3시간)**
```typescript
// BasementProcessPlanPage.tsx
import { useAutoProcessCalculation } from './hooks/useAutoProcessCalculation';

export function BasementProcessPlanPage() {
  // ...

  useAutoProcessCalculation({
    building,
    selectedCategory,
    selectedProcessType,
    config: {
      isBasement: true,
      enableFloorCalculation: true,
      onCalculationComplete: (days) => {
        console.log('Basement calculation:', days);
      }
    }
  });

  // ...
}
```

**예상 시간:** 6-8시간

---

### 📌 Issue 7: 멀티 코어 지원

**Step 1: 비즈니스 요구사항 확인 (1-2시간)**
- [ ] 멀티 코어 환경에서 물량 합산이 필요한가?
- [ ] 코어별 개별 조회가 필요한가?
- [ ] UI에서 코어 선택 기능이 필요한가?

**Step 2: 합산 로직 구현 (4-6시간)**
```typescript
// quantity-reference.ts

/**
 * 멀티 코어 환경에서 모든 코어의 물량 합산
 */
export function getQuantityFromFloorMultiCore(
  building: Building,
  floorNum: number,
  field: 'gangForm' | 'alForm' | 'formwork' | 'stripClean' | 'rebar' | 'concrete',
  subField: string
): number {
  // 해당 층의 모든 코어 찾기
  const coreFloors = building.floors.filter(f => {
    const cleanLabel = f.floorLabel.replace(/코어\d+-/, '');
    const match = cleanLabel.match(/(\d+)F/);
    return match && parseInt(match[1], 10) === floorNum;
  });

  let totalQuantity = 0;

  for (const floor of coreFloors) {
    const qty = getQuantityFromFloor(building, floor.floorLabel, field, subField);
    totalQuantity += qty;
  }

  logger.debug('Multi-core quantity sum', {
    floorNum,
    coreCount: coreFloors.length,
    totalQuantity
  });

  return totalQuantity;
}
```

**Step 3: getQuantityByReference 수정 (2-4시간)**
```typescript
export function getQuantityByReference(
  building: Building,
  reference: string,
  options?: { multiCore?: boolean }
): number {
  // ...

  // 기준층 범위 (Row 13-25)
  if (rowNum >= 13 && rowNum <= 25) {
    const floorNum = rowNum - 10;

    if (options?.multiCore) {
      // 멀티 코어 합산
      quantity = getQuantityFromFloorMultiCore(building, floorNum, field, subField);
    } else {
      // 기존: 첫 번째 코어만
      quantity = getQuantityFromFloor(building, `${floorNum}F`, field, subField);
    }
  }

  // ...
}
```

**예상 시간:** 8-12시간

---

### 📌 Issue 8: 옥탑/지하 확장 지원

**Step 1: 동적 Row 매핑 구현 (3-4시간)**
```typescript
// quantity-reference.ts

/**
 * 동적 옥탑층 Row 계산
 */
function getRowForRooftopFloor(floorIndex: number): number {
  // PH1 → Row 26
  // PH2 → Row 27
  // PH3 → Row 28
  // PH4 → Row 29 (확장)
  // PH5 → Row 30 (확장)
  return 25 + floorIndex;
}

/**
 * 동적 지하층 Row 계산
 */
function getRowForBasementFloor(floorIndex: number): number {
  // B1 → Row 9
  // B2 → Row 8
  // B3 → Row 7 (확장)
  // B4 → Row 6 (확장, 버림과 충돌 주의)
  return 10 - floorIndex;
}
```

**Step 2: getQuantityByReference 확장 (2-3시간)**
```typescript
export function getQuantityByReference(building: Building, reference: string): number {
  // ...

  // 옥탑층 동적 처리
  if (rowNum >= 26 && rowNum <= 35) { // 확장: 최대 PH10
    const phIndex = rowNum - 25; // 1, 2, 3, ...
    tradeGroup = '옥탑층';

    const phFloors = building.floors
      .filter(f => f.floorLabel.includes('옥탑') || /PH\d+/i.test(f.floorLabel))
      .sort((a, b) => (a.floorNumber || 0) - (b.floorNumber || 0));

    if (phFloors.length >= phIndex) {
      floorLabel = normalizeFloorLabel(phFloors[phIndex - 1].floorLabel);
    }
  }

  // ...
}
```

**예상 시간:** 5-7시간

---

## Phase 4: Long-term (지속적)

### 📌 문서화

**Step 1: API 문서 작성**
```markdown
# 물량 참조 API

## getQuantityByReference

엑셀 참조 패턴으로 물량 조회

### 사용법
\`\`\`typescript
const quantity = getQuantityByReference(building, 'D6');
\`\`\`

### 지원 패턴
- 단순 참조: `D6` (버림 형틀)
- 비율 계산: `F7*0.45` (기초 철근 45%)
- 복합 참조: `E14+E16` (4F + 6F 합산)
- 지하층 합산: `F_B1B2_COMBINED`

### 행 번호 매핑
| Row | 층 | 비고 |
|-----|-----|------|
| 6 | 버림 | |
| 7 | 기초 | |
| 8 | B2 | |
| 9 | B1 | |
| 11 | 1F | 셋팅층 우선 |
| 12 | 2F | 셋팅층 → 일반층 → 기준층 |
| 13-25 | 3-15F | 기준층 |
| 26-28 | PH1-3 | 옥탑층 |
\`\`\`
```

**Step 2: 트러블슈팅 가이드**
```markdown
# 트러블슈팅

## 물량이 0으로 조회됨

### 원인 1: 층이 존재하지 않음
- 확인: `building.floors`에 해당 층이 있는지
- 해결: FloorTradeTable에서 층 추가

### 원인 2: FloorTrade가 없음
- 확인: `building.floorTrades`에 해당 floorId가 있는지
- 해결: 물량입력 페이지에서 데이터 입력

### 원인 3: 정규화 실패
- 확인: 층 라벨 형식이 올바른지 ("1F", "PH1" 등)
- 해결: 층 라벨 정규화 함수 확인
```

**예상 시간:** 8-12시간 (지속적)

---

## 7. 구현 체크리스트

### Week 1: Critical Issues
- [ ] 반올림 불일치
  - [ ] 비즈니스 로직 확인
  - [ ] 테스트 작성
  - [ ] 수정 구현
  - [ ] 회귀 테스트
- [ ] 타입 안전성
  - [ ] Type Guard 추가
  - [ ] quantity-reference.ts 수정
  - [ ] 테스트 작성
  - [ ] 영향 범위 수정

### Week 2-3: High Priority
- [ ] 에러 로깅
  - [ ] Logger 유틸리티 생성
  - [ ] 모든 파일 적용
- [ ] 분기 리팩토링
  - [ ] 공통 함수 추출
  - [ ] Row 11/12 리팩토링
  - [ ] 테스트 작성
- [ ] 테스트 스위트
  - [ ] 환경 설정
  - [ ] 물량 참조 테스트
  - [ ] 계산 로직 테스트
  - [ ] 통합 테스트

### Week 4-6: Medium Priority
- [ ] 코드 중복 제거
  - [ ] 공통 훅 생성
  - [ ] UI 페이지 리팩토링
- [ ] 멀티 코어 지원 (선택)
  - [ ] 요구사항 확인
  - [ ] 합산 로직 구현
- [ ] 옥탑/지하 확장 (선택)
  - [ ] 동적 매핑 구현

### Ongoing: Documentation
- [ ] API 문서 작성
- [ ] 트러블슈팅 가이드
- [ ] 예제 코드 추가

---

## 📊 진행 상황 추적

| Phase | 상태 | 완료율 | 담당자 | 예상 완료일 |
|-------|------|--------|--------|------------|
| Phase 1 | 미시작 | 0% | - | - |
| Phase 2 | 미시작 | 0% | - | - |
| Phase 3 | 미시작 | 0% | - | - |
| Phase 4 | 미시작 | 0% | - | - |

**마지막 업데이트:** 2026-02-05

---

**작성자:** AI Agent
**검토자:** _[검토자 이름]_
**승인자:** _[승인자 이름]_
