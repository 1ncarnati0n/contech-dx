# Phase 2 & 3 Implementation Roadmap

**Status:** Phase 1 Complete ✅ | Phase 2-3 Ready to Start
**Next Sprint:** Issue 4 - Row 11/12 Refactoring

---

## 📍 Current Status

### ✅ Completed (Phase 1)
- [x] Issue 1: Rounding inconsistency fixed
- [x] Issue 2: Type safety enhancement
- [x] Issue 3: Error logging system

### 🚧 Remaining Work

## Phase 2: Safety & Maintainability (Week 2-3)

### Issue 4: Row 11/12 Logic Simplification
**Priority:** 🟡 High
**Effort:** 8 hours
**File:** `apps/web/src/lib/utils/quantity-reference.ts:346-440`

**Current Problem:**
- 95 lines of nearly identical code for Row 11 and Row 12
- Row 11: 1F (셋팅층 → 일반층)
- Row 12: 2F (셋팅층 → 일반층 → 기준층)

**Solution Approach:**

1. **Extract common helper** (`findFloorByNumberAndClass`):
```typescript
interface FloorSearchResult {
  floor: Floor;
  tradeGroup: string;
  isRangeFloor: boolean;
}

function findFloorByNumberAndClass(
  building: Building,
  floorNum: number,
  floorClasses: string[]  // Priority order
): FloorSearchResult | null {
  // Implementation details in plan
}
```

2. **Simplify Row 11** (45 lines → 8 lines):
```typescript
else if (rowNum === 11) {
  const floorNum = rowNum - 10;
  const result = findFloorByNumberAndClass(
    building,
    floorNum,
    ['셋팅층', '일반층']
  );
  if (result) {
    tradeGroup = result.tradeGroup;
    floorLabel = result.floor.floorLabel;
  }
}
```

3. **Simplify Row 12** (50 lines → 22 lines):
```typescript
else if (rowNum === 12) {
  const floorNum = rowNum - 10;
  const result = findFloorByNumberAndClass(
    building,
    floorNum,
    ['셋팅층', '일반층', '기준층']
  );
  if (result) {
    tradeGroup = result.tradeGroup;
    // Handle range floor label generation
  }
}
```

**Verification:**
- Create tests for all floor class combinations
- Verify 셋팅층 priority
- Test 기준층 fallback
- Ensure range floor ID generation works

**Success Criteria:**
- ✅ Code: 95 lines → 30 lines (65% reduction)
- ✅ All existing tests pass
- ✅ New tests for edge cases
- ✅ Same behavior as before

---

### Issue 5: Expand Test Coverage
**Priority:** 🟡 High
**Effort:** 16 hours
**Goal:** 70%+ overall test coverage

**Areas to Cover:**

1. **Helper Functions (4h)**
   - Create `apps/web/src/__tests__/helpers/testBuilders.ts`
   - Builder pattern for Building, Floor, FloorTrade
   - Reusable across all tests

2. **Integration Tests (6h)**
   - End-to-end calculation flows
   - Multi-step scenarios
   - Real-world building configurations

3. **Edge Case Tests (4h)**
   - Basement + high ceiling combinations
   - Multi-core buildings
   - Range floor variations
   - Empty/null/undefined handling

4. **Regression Tests (2h)**
   - Test existing projects
   - Verify calculations match expectations
   - Document any discrepancies

**Test File Structure:**
```
apps/web/src/__tests__/
├── helpers/
│   └── testBuilders.ts           # Common test utilities
├── utils/
│   ├── process-days-calculator.test.ts   ✅ Done
│   ├── quantity-reference.test.ts        ✅ Done
│   ├── process-calculation.test.ts       ✅ Done
│   ├── floorIdUtils.test.ts              📝 TODO
│   └── logger.test.ts                    📝 TODO
└── integration/
    ├── building-process-flow.test.ts     📝 TODO
    └── quantity-to-gantt.test.ts         📝 TODO
```

---

## Phase 3: Code Quality (Week 4-6)

### Issue 6: UI Page Deduplication
**Priority:** 🟢 Medium
**Effort:** 8 hours
**Files:**
- `apps/web/src/components/buildings/BasementProcessPlanPage.tsx`
- `apps/web/src/components/buildings/BuildingProcessPlanPage.tsx`

**Current Problem:**
95% duplicate code between basement and building pages

**Solution:**

1. **Create Common Hook** (`useAutoProcessCalculation`):
```typescript
// apps/web/src/hooks/useAutoProcessCalculation.ts
export function useAutoProcessCalculation({
  buildings,
  processPlans,
  categories,
  defaultProcessTypes,
  floorTradesHash,
  onUpdatePlan,
}: UseAutoProcessCalculationParams): void {
  // 40+ lines of extracted logic
}
```

2. **Update Both Pages:**
```typescript
// Before: 40+ lines of useEffect logic
// After:
useAutoProcessCalculation({
  buildings,
  processPlans,
  categories: PROCESS_CATEGORIES,
  defaultProcessTypes: DEFAULT_PROCESS_TYPES,
  floorTradesHash,
  onUpdatePlan: handleUpdatePlan,
});
```

**Success Criteria:**
- ✅ 40+ lines duplicated code removed
- ✅ Both pages use same calculation logic
- ✅ No behavior changes
- ✅ Hook can be unit tested independently

---

## 📊 Metrics Tracking

### Code Quality Metrics
| Metric | Before | Phase 1 | Target |
|--------|--------|---------|--------|
| Test Coverage | ~30% | ~45% | 70%+ |
| Code Duplication | High | Medium | Low |
| Type Safety Issues | 2 | 0 ✅ | 0 |
| Logging Coverage | 0% | 30% | 80% |

### Performance Metrics
| Metric | Before | Target |
|--------|--------|--------|
| Build Time | 6.2s | <7s |
| Test Time | 0.4s | <1s |
| Bundle Size | TBD | No regression |

---

## 🚀 Quick Start Commands

### Run Tests
```bash
# All tests
npm test

# Specific test file
npm test -- --testPathPattern="process-days-calculator"

# Watch mode
npm test:watch

# Coverage report
npm test:coverage
```

### Build & Verify
```bash
# Development
npm run dev

# Production build
npm run build

# Lint
npm run lint
```

### Check Test Coverage
```bash
npm run test:coverage

# Open coverage report
open coverage/lcov-report/index.html
```

---

## 🎯 Implementation Order

### Week 2 (Phase 2 Start)
1. **Day 1-2:** Issue 4 - Row 11/12 refactoring
   - Extract helper function
   - Update Row 11/12 logic
   - Create tests
   - Verify no regressions

2. **Day 3-5:** Issue 5 - Test coverage expansion
   - Create test helpers
   - Write integration tests
   - Add edge case tests

### Week 3 (Phase 2 Complete)
1. **Day 1-3:** Finish test coverage
   - Regression tests
   - Documentation
   - Coverage report review

2. **Day 4-5:** Phase 2 verification
   - Full test suite
   - Manual testing
   - Performance check

### Week 4-6 (Phase 3)
1. **Week 4:** UI deduplication
   - Create common hook
   - Refactor pages
   - Test both pages

2. **Week 5-6:** Final polish
   - Code review
   - Documentation
   - README updates

---

## 🔍 Testing Strategy

### Unit Tests
- ✅ All utility functions have tests
- ✅ Edge cases documented
- ✅ Mocking where appropriate

### Integration Tests
- 📝 TODO: Full calculation flow
- 📝 TODO: Quantity → Process → Gantt
- 📝 TODO: Multi-building scenarios

### E2E Tests
- 📝 TODO: User workflow tests
- 📝 TODO: Data persistence
- 📝 TODO: UI interaction

---

## 📚 Resources

### Key Files Reference
```
Core Logic:
├── process-days-calculator.ts    ✅ Fixed
├── quantity-reference.ts         ✅ Fixed + Logging
├── process-calculation.ts        ✅ Fixed + Logging
└── tradeDataHelpers.ts          ✅ Enhanced

Tests:
├── process-days-calculator.test.ts   ✅ 4 tests
├── quantity-reference.test.ts        ✅ 12 tests
└── process-calculation.test.ts       ✅ 32 tests

UI Pages:
├── BasementProcessPlanPage.tsx       📝 TODO: Refactor
└── BuildingProcessPlanPage.tsx       📝 TODO: Refactor
```

### Documentation
- `PHASE1_IMPLEMENTATION_COMPLETE.md` - Completed work
- `PROCESS_CALCULATION_ANALYSIS.md` - Original analysis
- `IMPROVEMENT_ROADMAP.md` - High-level plan

---

## 🛡️ Risk Management

### Low Risk ✅
- Phase 1 changes (complete, tested)
- Test additions
- Logging additions

### Medium Risk ⚠️
- Row 11/12 refactoring (complex logic)
- UI hook extraction (behavior must match)

### Mitigation Strategy
1. **Comprehensive tests before refactoring**
2. **Feature flags for major changes**
3. **Manual testing with real data**
4. **Git commits per issue for easy rollback**

---

## ✅ Acceptance Criteria

### Phase 2
- [ ] Code duplication < 10% in quantity-reference.ts
- [ ] Test coverage ≥ 70%
- [ ] All existing tests pass
- [ ] Build succeeds
- [ ] Manual testing confirms no regressions

### Phase 3
- [ ] Common hook extracted
- [ ] Both UI pages refactored
- [ ] Documentation updated
- [ ] README reflects changes
- [ ] Code review approved

---

**Last Updated:** 2026-02-05
**Next Review:** After Issue 4 completion
