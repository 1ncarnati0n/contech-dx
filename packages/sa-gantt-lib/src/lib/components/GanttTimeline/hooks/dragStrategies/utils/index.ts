// ============================================
// 드래그 유틸리티 모듈 통합 export
// ============================================
// 기존 dragUtils.ts (517줄)을 4개 모듈로 분리
// - dragCalculations.ts: 기본 드래그 계산, 커서, 이벤트 리스너
// - holidaySnap.ts: 휴일 스냅 로직
// - groupDragUtils.ts: 그룹 드래그 유틸리티
// - criticalPathUtils.ts: 크리티컬 패스 유지 로직
// ============================================

// 드래그 기본 계산
export {
    calculateDragDirection,
    calculateDeltaDays,
    getDragCursor,
    setupDragListeners,
} from './dragCalculations';

// 휴일 스냅
export {
    calculateHolidaySnap,
    applyFinalHolidaySnap,
    calculateGroupSnapDeltaDays,
} from './holidaySnap';

// 그룹 드래그
export {
    calculateWorkingDaysOffsets,
    calculateGroupHolidaySnap,
    calculateTaskMoveResult,
    calculateGroupTasksMove,
} from './groupDragUtils';

// 크리티컬 패스 유지
export {
    calculateDeltaWorkingDays,
    calculateEndDateFromStart,
    calculateGroupTasksMoveWithCriticalPath,
} from './criticalPathUtils';
