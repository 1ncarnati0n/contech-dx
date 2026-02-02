// ============================================
// 그룹 드래그 유틸리티
// ============================================

import { addDays } from 'date-fns';
import { isHoliday, snapToWorkingDay, countWorkingDays, addWorkingDays } from '../../../../../utils/dateUtils';
import type { CalendarSettings, ConstructionTask } from '../../../../../types';

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
