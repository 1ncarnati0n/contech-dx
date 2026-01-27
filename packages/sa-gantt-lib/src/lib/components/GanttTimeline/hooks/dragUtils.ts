// ============================================
// 드래그 공통 유틸리티
// ============================================

import { addDays, differenceInDays } from 'date-fns';
import { isHoliday, snapToWorkingDay, countWorkingDays, addWorkingDays, moveByWorkingDays } from '../../../utils/dateUtils';
import type { CalendarSettings, ConstructionTask } from '../../../types';
import type { DragType } from '../types';

// ============================================
// 드래그 계산 유틸리티
// ============================================

/**
 * 드래그 방향 계산
 */
export const calculateDragDirection = (deltaX: number): 'left' | 'right' => {
    return deltaX < 0 ? 'left' : 'right';
};

/**
 * Delta Days 계산 (픽셀 → 일수)
 */
export const calculateDeltaDays = (deltaX: number, pixelsPerDay: number): number => {
    return Math.round(deltaX / pixelsPerDay);
};

/**
 * 휴일 스냅 계산
 * @returns adjustedDeltaDays: 휴일 회피 후 조정된 일수, skippedDays: 스킵된 휴일 수
 */
export const calculateHolidaySnap = (
    originalDate: Date,
    deltaDays: number,
    dragDirection: 'left' | 'right',
    holidays: Date[],
    calendarSettings: CalendarSettings
): { adjustedDeltaDays: number; skippedDays: number } => {
    const tentativeDate = addDays(originalDate, deltaDays);

    if (isHoliday(tentativeDate, holidays, calendarSettings)) {
        const snappedDate = snapToWorkingDay(tentativeDate, dragDirection, holidays, calendarSettings);
        const adjustedDeltaDays = differenceInDays(snappedDate, originalDate);
        const skippedDays = Math.abs(adjustedDeltaDays - deltaDays);
        return { adjustedDeltaDays, skippedDays };
    }

    return { adjustedDeltaDays: deltaDays, skippedDays: 0 };
};

// ============================================
// Cursor 유틸리티
// ============================================

/**
 * DragType에 따른 커서 스타일 결정
 */
export const getDragCursor = (dragType: DragType): 'grabbing' | 'ew-resize' | 'col-resize' => {
    if (dragType === 'move' || dragType === 'move-net') {
        return 'grabbing';
    }
    if (dragType === 'resize-pre-net' || dragType === 'resize-net-post') {
        return 'col-resize';
    }
    return 'ew-resize';
};

// ============================================
// 이벤트 리스너 유틸리티
// ============================================

/**
 * 드래그 이벤트 리스너 등록
 * @returns cleanup 함수
 */
export const setupDragListeners = (
    onMove: (e: MouseEvent) => void,
    onUp: () => void,
    cursor: 'grabbing' | 'ew-resize' | 'col-resize' = 'grabbing'
): (() => void) => {
    window.addEventListener('mousemove', onMove);
    window.addEventListener('mouseup', onUp);
    document.body.style.cursor = cursor;
    document.body.style.userSelect = 'none';

    return () => {
        window.removeEventListener('mousemove', onMove);
        window.removeEventListener('mouseup', onUp);
        document.body.style.cursor = '';
        document.body.style.userSelect = '';
    };
};

// ============================================
// 최종 휴일 스냅 유틸리티
// ============================================

/**
 * 드래그 완료 시 최종 휴일 스냅 적용
 * 현재 useGroupDrag, useDependencyDrag, useBarDrag에서 중복되던 로직을 통합
 *
 * @param date 검사할 날짜
 * @param direction 드래그 방향 ('left' | 'right')
 * @param holidays 휴일 목록
 * @param calendarSettings 캘린더 설정
 * @returns adjustedDate: 조정된 날짜, adjustment: 조정된 일수
 */
export const applyFinalHolidaySnap = (
    date: Date,
    direction: 'left' | 'right',
    holidays: Date[],
    calendarSettings: CalendarSettings
): { adjustedDate: Date; adjustment: number } => {
    if (!isHoliday(date, holidays, calendarSettings)) {
        return { adjustedDate: date, adjustment: 0 };
    }

    const snappedDate = snapToWorkingDay(date, direction, holidays, calendarSettings);
    const adjustment = differenceInDays(snappedDate, date);

    return { adjustedDate: snappedDate, adjustment };
};

// ============================================
// 그룹 드래그 통합 스냅 유틸리티
// ============================================

/**
 * 그룹 드래그 시 기준 Task 선정 및 작업일 오프셋 계산
 *
 * @param affectedTasks - 영향받는 Task 배열
 * @param holidays - 공휴일 목록
 * @param calendarSettings - 캘린더 설정
 * @returns referenceTask: 기준 Task, workingDaysOffsets: 각 Task의 작업일 오프셋
 */
export const calculateWorkingDaysOffsets = (
    affectedTasks: ConstructionTask[],
    holidays: Date[],
    calendarSettings: CalendarSettings
): {
    referenceTask: ConstructionTask | null;
    workingDaysOffsets: Map<string, number>;
} => {
    // TASK 타입만 필터링 (GROUP/MILESTONE 제외)
    const taskOnlyTasks = affectedTasks.filter(t => t.type === 'TASK');

    if (taskOnlyTasks.length === 0) {
        return { referenceTask: null, workingDaysOffsets: new Map() };
    }

    // 기준 Task 선정 (TASK 중 가장 빠른 시작일)
    const sortedTasks = [...taskOnlyTasks].sort(
        (a, b) => a.startDate.getTime() - b.startDate.getTime()
    );
    const referenceTask = sortedTasks[0];

    // 각 Task의 기준 Task 대비 작업일 오프셋 계산 (TASK만)
    const workingDaysOffsets = new Map<string, number>();
    for (const task of taskOnlyTasks) {
        const offset = countWorkingDays(
            referenceTask.startDate,
            task.startDate,
            holidays,
            calendarSettings
        );
        workingDaysOffsets.set(task.id, offset);
    }

    return { referenceTask, workingDaysOffsets };
};

/**
 * 그룹 드래그 완료 시 통합 휴일 스냅 계산
 *
 * 핵심 원리:
 * 1. 기준 Task(가장 빠른 시작일)의 이동 후 날짜가 휴일인지 확인
 * 2. 휴일이면 드래그 방향으로 스냅
 * 3. 다른 Task들은 기준 Task의 새 위치에서 작업일 오프셋만큼 이동
 *
 * @param referenceTask - 기준 Task
 * @param workingDaysOffsets - 각 Task의 작업일 오프셋
 * @param affectedTasks - 영향받는 Task 배열
 * @param deltaDays - 이동할 달력일 수
 * @param direction - 드래그 방향
 * @param holidays - 공휴일 목록
 * @param calendarSettings - 캘린더 설정
 * @returns 각 Task의 새 시작일 Map
 */
export const calculateGroupHolidaySnap = (
    referenceTask: ConstructionTask,
    workingDaysOffsets: Map<string, number>,
    affectedTasks: ConstructionTask[],
    deltaDays: number,
    direction: 'left' | 'right',
    holidays: Date[],
    calendarSettings: CalendarSettings
): Map<string, Date> => {
    const result = new Map<string, Date>();

    if (affectedTasks.length === 0) return result;

    // 1. 기준 Task의 새 위치 계산
    const referenceTentativeDate = addDays(referenceTask.startDate, deltaDays);

    // 2. 기준 Task가 휴일에 떨어지면 스냅
    const referenceNewDate = isHoliday(referenceTentativeDate, holidays, calendarSettings)
        ? snapToWorkingDay(referenceTentativeDate, direction, holidays, calendarSettings)
        : referenceTentativeDate;

    // 3. 각 Task의 새 시작일 계산 (작업일 간격 유지)
    for (const task of affectedTasks) {
        const workingDaysOffset = workingDaysOffsets.get(task.id) ?? 0;

        // 기준 Task의 새 시작일로부터 작업일 간격만큼 이동
        const newStartDate = workingDaysOffset === 0
            ? referenceNewDate
            : addWorkingDays(referenceNewDate, workingDaysOffset, holidays, calendarSettings);

        result.set(task.id, newStartDate);
    }

    return result;
};

/**
 * 그룹 드래그 중 미리보기용 스냅 deltaDays 계산
 *
 * @param referenceStartDate - 기준 Task의 원래 시작일
 * @param deltaDays - 원래 이동할 달력일 수
 * @param direction - 드래그 방향
 * @param holidays - 공휴일 목록
 * @param calendarSettings - 캘린더 설정
 * @returns 스냅 적용된 deltaDays
 */
export const calculateGroupSnapDeltaDays = (
    referenceStartDate: Date,
    deltaDays: number,
    direction: 'left' | 'right',
    holidays: Date[],
    calendarSettings: CalendarSettings
): number => {
    const tentativeDate = addDays(referenceStartDate, deltaDays);

    if (!isHoliday(tentativeDate, holidays, calendarSettings)) {
        return deltaDays;
    }

    const snappedDate = snapToWorkingDay(tentativeDate, direction, holidays, calendarSettings);
    return differenceInDays(snappedDate, referenceStartDate);
};

// ============================================
// Task Bar 방식 그룹 드래그 유틸리티
// ============================================

/**
 * 단일 Task의 드래그 이동 결과 계산 (Task Bar 'move' 로직과 동일)
 *
 * 핵심 원리:
 * 1. 새 시작일 계산 (델타만큼 이동)
 * 2. 시작일이 휴일이면 드래그 방향으로 스냅
 * 3. 종료일 재계산: 선간접(달력일) + 순작업(작업일, 휴일건너뛰기) + 후간접(달력일)
 *
 * @param originalStartDate - 원래 시작일
 * @param indirectWorkDaysPre - 선간접 일수
 * @param netWorkDays - 순작업일 수
 * @param indirectWorkDaysPost - 후간접 일수
 * @param deltaDays - 이동할 달력일 수
 * @param direction - 드래그 방향
 * @param holidays - 공휴일 목록
 * @param calendarSettings - 캘린더 설정
 * @returns 새 시작일과 종료일
 */
export const calculateTaskMoveResult = (
    originalStartDate: Date,
    indirectWorkDaysPre: number,
    netWorkDays: number,
    indirectWorkDaysPost: number,
    deltaDays: number,
    direction: 'left' | 'right',
    holidays: Date[],
    calendarSettings: CalendarSettings
): { newStartDate: Date; newEndDate: Date } => {
    // 1. 새 시작일 계산 (델타만큼 이동)
    const tentativeStart = addDays(originalStartDate, deltaDays);

    // 2. 시작일이 휴일이면 드래그 방향으로 스냅
    const snappedStart = isHoliday(tentativeStart, holidays, calendarSettings)
        ? snapToWorkingDay(tentativeStart, direction, holidays, calendarSettings)
        : tentativeStart;

    // 3. 종료일 재계산: 선간접(달력일) + 순작업(작업일, 휴일건너뛰기) + 후간접(달력일)
    let currentDate = snappedStart;

    // 3-1. 선간접 (달력일 기준)
    if (indirectWorkDaysPre > 0) {
        currentDate = addDays(currentDate, indirectWorkDaysPre);
    }

    // 3-2. 순작업 (작업일 기준, 휴일 건너뛰기)
    // addWorkingDays는 시작일 포함해서 N일째 작업일을 반환
    const netEndDate = addWorkingDays(currentDate, netWorkDays, holidays, calendarSettings);
    currentDate = addDays(netEndDate, 1); // 순작업 종료일 다음날

    // 3-3. 후간접 (달력일 기준)
    let finalEndDate: Date;
    if (indirectWorkDaysPost > 0) {
        finalEndDate = addDays(currentDate, indirectWorkDaysPost - 1);
    } else {
        finalEndDate = netEndDate; // 후간접 없으면 순작업 종료일이 전체 종료일
    }

    return {
        newStartDate: snappedStart,
        newEndDate: finalEndDate,
    };
};

/**
 * 그룹 드래그 시 각 Task별로 독립적인 휴일 스냅 및 종료일 재계산
 * (Task Bar 'move' 방식과 동일하게 처리)
 *
 * @param affectedTasks - 영향받는 Task 배열
 * @param deltaDays - 이동할 달력일 수
 * @param direction - 드래그 방향
 * @param holidays - 공휴일 목록
 * @param calendarSettings - 캘린더 설정
 * @returns 각 Task의 새 시작일/종료일 Map
 */
export const calculateGroupTasksMove = (
    affectedTasks: ConstructionTask[],
    deltaDays: number,
    direction: 'left' | 'right',
    holidays: Date[],
    calendarSettings: CalendarSettings
): Map<string, { newStartDate: Date; newEndDate: Date }> => {
    const result = new Map<string, { newStartDate: Date; newEndDate: Date }>();

    for (const task of affectedTasks) {
        // TASK 타입만 처리 (GROUP/MILESTONE 제외)
        if (task.type !== 'TASK' || !task.task) continue;

        const { indirectWorkDaysPre, netWorkDays, indirectWorkDaysPost } = task.task;

        const moveResult = calculateTaskMoveResult(
            task.startDate,
            indirectWorkDaysPre,
            netWorkDays,
            indirectWorkDaysPost,
            deltaDays,
            direction,
            holidays,
            calendarSettings
        );

        result.set(task.id, moveResult);
    }

    return result;
};

// ============================================
// 크리티컬 패스 유지 그룹 드래그 유틸리티
// ============================================

/**
 * 픽셀 이동량을 작업일 수로 변환
 *
 * @param deltaX - 픽셀 이동량
 * @param pixelsPerDay - 일당 픽셀 수
 * @param baseDate - 기준 task의 원래 시작일
 * @param holidays - 공휴일 목록
 * @param calendarSettings - 캘린더 설정
 * @returns 작업일 이동량 (음수: 왼쪽, 양수: 오른쪽)
 */
export const calculateDeltaWorkingDays = (
    deltaX: number,
    pixelsPerDay: number,
    baseDate: Date,
    holidays: Date[],
    calendarSettings: CalendarSettings
): number => {
    const deltaDays = Math.round(deltaX / pixelsPerDay);
    if (deltaDays === 0) return 0;

    const targetDate = addDays(baseDate, deltaDays);

    if (deltaDays > 0) {
        // 오른쪽 이동: baseDate ~ targetDate 사이 작업일 수
        return countWorkingDays(baseDate, targetDate, holidays, calendarSettings);
    } else {
        // 왼쪽 이동: targetDate ~ baseDate 사이 작업일 수 (음수로 반환)
        return -countWorkingDays(targetDate, baseDate, holidays, calendarSettings);
    }
};

/**
 * 시작일에서 종료일 계산 (직간접 구조 반영)
 *
 * @param startDate - 시작일
 * @param indirectWorkDaysPre - 선간접 일수
 * @param netWorkDays - 순작업일 수
 * @param indirectWorkDaysPost - 후간접 일수
 * @param holidays - 공휴일 목록
 * @param calendarSettings - 캘린더 설정
 * @returns 종료일
 */
export const calculateEndDateFromStart = (
    startDate: Date,
    indirectWorkDaysPre: number,
    netWorkDays: number,
    indirectWorkDaysPost: number,
    holidays: Date[],
    calendarSettings: CalendarSettings
): Date => {
    let currentDate = startDate;

    // 1. 선간접 (달력일 기준)
    if (indirectWorkDaysPre > 0) {
        currentDate = addDays(currentDate, indirectWorkDaysPre);
    }

    // 2. 순작업 (작업일 기준, 휴일 건너뛰기)
    const netEndDate = addWorkingDays(currentDate, netWorkDays, holidays, calendarSettings);

    // 3. 후간접 (달력일 기준)
    if (indirectWorkDaysPost > 0) {
        return addDays(addDays(netEndDate, 1), indirectWorkDaysPost - 1);
    }
    return netEndDate;
};

/**
 * 그룹 드래그 시 크리티컬 패스(작업일 기준 상대 거리)를 유지하며 이동
 *
 * 핵심 원리:
 * 1. 모든 task가 같은 "작업일 수"만큼 이동
 * 2. 기준 task의 새 시작일 = addWorkingDays(원래시작일, deltaWorkingDays)
 * 3. 다른 task의 새 시작일 = addWorkingDays(기준새시작일, 원래작업일오프셋)
 * 4. → task 간 작업일 기준 상대 거리 유지됨
 *
 * @param referenceTask - 기준 Task (가장 빠른 시작일)
 * @param workingDaysOffsets - 각 Task의 기준 Task 대비 작업일 오프셋
 * @param affectedTasks - 영향받는 Task 배열
 * @param deltaWorkingDays - 이동할 작업일 수 (음수: 왼쪽, 양수: 오른쪽)
 * @param holidays - 공휴일 목록
 * @param calendarSettings - 캘린더 설정
 * @returns 각 Task의 새 시작일/종료일 Map
 */
export const calculateGroupTasksMoveWithCriticalPath = (
    referenceTask: ConstructionTask,
    workingDaysOffsets: Map<string, number>,
    affectedTasks: ConstructionTask[],
    deltaWorkingDays: number,
    holidays: Date[],
    calendarSettings: CalendarSettings
): Map<string, { newStartDate: Date; newEndDate: Date }> => {
    const result = new Map<string, { newStartDate: Date; newEndDate: Date }>();

    // deltaWorkingDays가 0이면 원래 날짜 반환
    if (deltaWorkingDays === 0) {
        for (const task of affectedTasks) {
            if (task.type === 'TASK') {
                result.set(task.id, {
                    newStartDate: task.startDate,
                    newEndDate: task.endDate,
                });
            }
        }
        return result;
    }

    // 1. 기준 task의 새 시작일 계산 (작업일 기준 이동)
    // moveByWorkingDays: countWorkingDays와 일관성 보장
    // countWorkingDays(A, B) = N 이면 moveByWorkingDays(A, N) = B
    const referenceNewStartDate = moveByWorkingDays(
        referenceTask.startDate,
        deltaWorkingDays,
        holidays,
        calendarSettings
    );

    // 2. 각 task의 새 시작일/종료일 계산
    for (const task of affectedTasks) {
        if (task.type !== 'TASK' || !task.task) continue;

        const workingDaysOffset = workingDaysOffsets.get(task.id) ?? 0;

        // 기준 task의 새 시작일로부터 작업일 오프셋만큼 이동
        // moveByWorkingDays 사용으로 off-by-one 문제 해결
        const newStartDate = workingDaysOffset === 0
            ? referenceNewStartDate
            : moveByWorkingDays(referenceNewStartDate, workingDaysOffset, holidays, calendarSettings);

        // 종료일 재계산 (직간접 구조 반영)
        const newEndDate = calculateEndDateFromStart(
            newStartDate,
            task.task.indirectWorkDaysPre,
            task.task.netWorkDays,
            task.task.indirectWorkDaysPost,
            holidays,
            calendarSettings
        );

        result.set(task.id, { newStartDate, newEndDate });
    }

    return result;
};
