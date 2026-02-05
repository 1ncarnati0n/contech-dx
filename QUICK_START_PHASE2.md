# Quick Start Guide - Phase 2 Implementation

**시작 전 체크리스트:**
- ✅ Phase 1 완료 (3개 critical 버그 수정)
- ✅ 모든 테스트 통과 (81 tests)
- ✅ 빌드 성공

---

## 🚀 Phase 2 시작하기

### Issue 4: Row 11/12 로직 단순화 (첫 번째 작업)

**예상 시간:** 8시간
**난이도:** Medium
**위험도:** Medium (복잡한 로직이지만 테스트로 보호됨)

---

## 📝 Step-by-Step 구현 가이드

### Step 1: 현재 코드 이해하기 (30분)

**읽어야 할 파일:**
```bash
apps/web/src/lib/utils/quantity-reference.ts
```

**Lines 346-440**을 읽고 다음을 파악:
1. Row 11 (1F) 처리 로직
2. Row 12 (2F) 처리 로직
3. 두 로직의 차이점 (우선순위만 다름)

### Step 2: 테스트 먼저 작성 (2시간)

**✨ 핵심 원칙: Test First!**

기존 동작을 보호하는 테스트 추가:

```typescript
// apps/web/src/__tests__/utils/quantity-reference.test.ts
// 이미 일부 테스트 있음, 추가로 작성:

describe('Row 11/12 Floor Finding - Detailed', () => {
  describe('Row 11 (1F)', () => {
    it('should prioritize 셋팅층 over 일반층', () => {
      // 셋팅층과 일반층이 모두 있을 때 셋팅층 우선
    });

    it('should fall back to 일반층 when no 셋팅층', () => {
      // 셋팅층이 없으면 일반층 사용
    });

    it('should return 0 when neither exists', () => {
      // 둘 다 없으면 0 반환
    });

    it('should handle core-labeled floors', () => {
      // "코어1-1F" 형태 처리
    });
  });

  describe('Row 12 (2F)', () => {
    it('should try 셋팅층 first', () => {
      // 셋팅층 최우선
    });

    it('should try 일반층 second', () => {
      // 셋팅층 없으면 일반층
    });

    it('should try 기준층 last', () => {
      // 셋팅층, 일반층 없으면 기준층
    });

    it('should handle range 기준층 correctly', () => {
      // "2~14F 기준층" 형태에서 2F 추출
    });

    it('should generate correct floor label for range floors', () => {
      // 범위 기준층일 때 "2F" 라벨 생성
    });

    it('should handle core-labeled range floors', () => {
      // "코어1-2~14F" 에서 "코어1-2F" 생성
    });
  });
});
```

**테스트 실행:**
```bash
npm test -- --testPathPattern="quantity-reference"
```

모든 테스트가 통과하면 다음 단계로!

### Step 3: 공통 헬퍼 함수 작성 (2시간)

**파일 위치:** `apps/web/src/lib/utils/quantity-reference.ts`

**Line 240 근처 (getQuantityByReference 함수 전)에 추가:**

```typescript
/**
 * Row 11/12 처리를 위한 층 찾기 헬퍼
 * 셋팅층 → 일반층 → 기준층 우선순위로 검색
 */
interface FloorSearchResult {
  floor: Floor;
  tradeGroup: string;
  isRangeFloor: boolean;
}

function findFloorByNumberAndClass(
  building: Building,
  floorNum: number,
  floorClasses: string[]  // 우선순위 순서: ['셋팅층', '일반층', '기준층']
): FloorSearchResult | null {
  for (const floorClass of floorClasses) {
    const floor = building.floors.find(f => {
      if (f.floorClass !== floorClass) return false;

      // 직접 층 번호 매칭
      const match = f.floorLabel.match(/(\d+)F|(\d+)층/);
      if (match) {
        const num = parseInt(match[1] || match[2], 10);
        return num === floorNum;
      }

      // 범위 형식 기준층 매칭
      if (floorClass === '기준층' && f.floorLabel.includes('~')) {
        const cleanLabel = f.floorLabel
          .replace(/코어\d+-/, '')
          .replace(/\s*기준층\s*$/, '');
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
      const tradeGroup = floorClass === '기준층' ? '기준층' : '셋팅층';
      const isRangeFloor = floor.floorLabel.includes('~');
      return { floor, tradeGroup, isRangeFloor };
    }
  }

  return null;
}
```

**검증:**
```bash
npm run build
```
컴파일 에러 없으면 OK!

### Step 4: Row 11 리팩토링 (1시간)

**현재 코드 (Lines 346-380)를 다음으로 대체:**

```typescript
else if (rowNum === 11) {
  // Row 11: 1F (셋팅층 → 일반층 우선순위)
  const floorNum = rowNum - 10;
  const result = findFloorByNumberAndClass(building, floorNum, ['셋팅층', '일반층']);

  if (result) {
    tradeGroup = result.tradeGroup;
    floorLabel = result.floor.floorLabel;
  }
}
```

**테스트 실행:**
```bash
npm test -- --testPathPattern="quantity-reference"
```

모든 테스트가 통과해야 합니다!

### Step 5: Row 12 리팩토링 (1.5시간)

**현재 코드 (Lines 381-440)를 다음으로 대체:**

```typescript
else if (rowNum === 12) {
  // Row 12: 2F (셋팅층 → 일반층 → 기준층 우선순위)
  const floorNum = rowNum - 10;
  const result = findFloorByNumberAndClass(
    building,
    floorNum,
    ['셋팅층', '일반층', '기준층']
  );

  if (result) {
    tradeGroup = result.tradeGroup;

    // 범위 기준층인 경우 floorLabel 생성
    if (result.isRangeFloor) {
      const hasCore = result.floor.floorLabel.includes('코어');
      if (hasCore) {
        const coreMatch = result.floor.floorLabel.match(/코어(\d+)-/);
        floorLabel = coreMatch
          ? `코어${coreMatch[1]}-${floorNum}F`
          : `${floorNum}F`;
      } else {
        floorLabel = `${floorNum}F`;
      }
    } else {
      floorLabel = result.floor.floorLabel;
    }
  }
}
```

**테스트 실행:**
```bash
npm test
```

### Step 6: 전체 검증 (1.5시간)

#### 6.1 테스트 검증
```bash
# 전체 테스트
npm test

# 커버리지 확인
npm test:coverage
```

#### 6.2 빌드 검증
```bash
npm run build
```

#### 6.3 수동 테스트
```bash
npm run dev
```

브라우저에서:
1. 물량입력 페이지 → 데이터 입력
2. 공정계획 페이지 → 계산 결과 확인
3. 기존 프로젝트 3-5개로 결과 비교

#### 6.4 코드 리뷰 체크리스트
- [ ] 코드 라인 수 감소 (95줄 → 30줄)
- [ ] 모든 테스트 통과
- [ ] 빌드 성공
- [ ] 기존 동작 유지
- [ ] 로그 메시지 확인

---

## 🎯 성공 기준

### 정량적 지표
- ✅ Code lines: 95 → 30 (65% 감소)
- ✅ Tests: 모두 통과
- ✅ Build: 성공
- ✅ Coverage: 유지 또는 증가

### 정성적 지표
- ✅ 코드 가독성 향상
- ✅ 유지보수 용이성 증가
- ✅ 버그 발생 가능성 감소

---

## ⚠️ 주의사항

### 함정 피하기
1. **테스트 없이 리팩토링하지 말 것**
   - 반드시 테스트를 먼저 작성
   - 리팩토링 후 테스트로 검증

2. **한 번에 모든 것을 바꾸지 말 것**
   - Row 11 먼저, 테스트
   - Row 12 다음, 테스트
   - 단계별 검증

3. **기존 동작 변경 금지**
   - 리팩토링은 구조 개선만
   - 동작은 100% 동일해야 함

### 문제 발생 시
```bash
# 이전 커밋으로 롤백
git checkout HEAD -- apps/web/src/lib/utils/quantity-reference.ts

# 또는 특정 라인만 복구
git diff HEAD apps/web/src/lib/utils/quantity-reference.ts
```

---

## 🔍 디버깅 팁

### 테스트 실패 시
```bash
# 특정 테스트만 실행
npm test -- --testPathPattern="Row 11/12"

# Watch mode로 실행
npm test:watch
```

### 로그 확인
```bash
npm run dev
```

브라우저 콘솔에서 `[DEBUG]` 로그 확인:
- `[getQuantityByReference]` - 참조 해석
- `[findFloorByNumberAndClass]` - 층 찾기 (새로 추가)

### 타입 에러 시
```typescript
// Floor 타입 확인
import type { Floor } from '@/lib/types';

// 인터페이스가 맞는지 확인
interface FloorSearchResult {
  floor: Floor;  // ← 정확한 타입
  tradeGroup: string;
  isRangeFloor: boolean;
}
```

---

## 📚 참고 자료

### 읽어야 할 문서
1. **PHASE1_IMPLEMENTATION_COMPLETE.md** - 이전 작업 참고
2. **PHASE2_3_ROADMAP.md** - 전체 로드맵
3. **PROCESS_CALCULATION_ANALYSIS.md** - 원본 분석

### 참고 코드
```typescript
// 기존 층 찾기 로직 참고
// apps/web/src/lib/utils/quantity-reference.ts:100-165
```

---

## ✅ 체크리스트

### 시작 전
- [ ] Phase 1 완료 확인
- [ ] 최신 코드 pull
- [ ] 테스트 통과 확인

### 구현 중
- [ ] Step 1: 코드 이해
- [ ] Step 2: 테스트 작성
- [ ] Step 3: 헬퍼 함수 작성
- [ ] Step 4: Row 11 리팩토링
- [ ] Step 5: Row 12 리팩토링
- [ ] Step 6: 전체 검증

### 완료 후
- [ ] 모든 테스트 통과
- [ ] 빌드 성공
- [ ] 수동 테스트 완료
- [ ] 코드 리뷰
- [ ] Git commit
- [ ] 문서 업데이트

---

## 🎉 완료 후

### Git Commit
```bash
git add .
git commit -m "refactor: simplify Row 11/12 logic with findFloorByNumberAndClass helper

- Extract common floor finding logic into helper function
- Reduce code from 95 lines to 30 lines (65% reduction)
- Maintain exact same behavior with improved readability
- All tests passing (81 tests)

Related: Issue 4 in PHASE2_3_ROADMAP.md"
```

### 다음 단계
**Issue 5: 테스트 커버리지 확대**로 이동
- PHASE2_3_ROADMAP.md 참고

---

**추정 소요 시간:** 8시간
**난이도:** Medium
**성공 확률:** High (테스트로 보호됨)

화이팅! 🚀
