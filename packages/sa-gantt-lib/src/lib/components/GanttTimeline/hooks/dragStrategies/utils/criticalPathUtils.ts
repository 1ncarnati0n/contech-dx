// ============================================
// 크리티컬 패스 유지 그룹 드래그 유틸리티
// ============================================

import { addDays, differenceInDays } from 'date-fns';
import { countWorkingDays, addWorkingDays, moveByWorkingDays } from '../../../../../utils/dateUtils';
import type { CalendarSettings, ConstructionTask } from '../../../../../types';

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
            // 모든 타입(TASK, GROUP, CP, BLOCK) 포함
            result.set(task.id, {
                newStartDate: task.startDate,
                newEndDate: task.endDate,
            });
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
        if (task.type === 'TASK' && task.task) {
            // TASK 타입: 작업일 오프셋 및 직간접 구조 반영
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
        } else if (task.type === 'GROUP' || task.type === 'CP' || task.type === 'BLOCK') {
            // GROUP/CP/BLOCK 타입: 달력일 기준으로 단순 이동
            // 작업일 오프셋이 없으므로 기준 task와 동일한 작업일 이동량 적용
            const daysDelta = differenceInDays(referenceNewStartDate, referenceTask.startDate);
            const newStartDate = addDays(task.startDate, daysDelta);
            const newEndDate = addDays(task.endDate, daysDelta);

            result.set(task.id, { newStartDate, newEndDate });
        }
    }

    return result;
};
