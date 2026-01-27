// ============================================
// SA-Gantt-Lib: 듀얼 캘린더 날짜 계산 (건설 공정표 핵심 로직)
// ============================================

import { addDays, startOfDay } from 'date-fns';
import type {
    CalendarSettings,
    ConstructionTask,
    TaskDates,
    AnchorPoint,
} from '../../types';
import { isHoliday } from './holiday';
import { addWorkingDays, addCalendarDays } from './workingDays';

// ============================================
// 듀얼 캘린더 날짜 계산
// ============================================

/**
 * Level 2 태스크의 순작업/간접작업 날짜 계산
 *
 * 건설 공정표의 핵심 로직:
 * - 선 간접작업일(indirectWorkDaysPre): 달력일 기준으로 계산
 * - 순작업일(netWorkDays): 휴일을 건너뛰고 계산
 * - 후 간접작업일(indirectWorkDaysPost): 달력일 기준으로 계산
 *
 * 바 구조: [선간접 Blue] - [순작업 Red] - [후간접 Blue]
 *
 * @param task - 계산할 태스크 (Level 2)
 * @param holidays - 공휴일 목록
 * @param settings - 캘린더 설정
 * @returns 계산된 날짜 정보 (시작일, 종료일, 순작업 시작/종료일, 간접작업 날짜 등)
 *
 * @example
 * ```ts
 * const dates = calculateDualCalendarDates(
 *   {
 *     id: '1',
 *     wbsLevel: 2,
 *     task: {
 *       netWorkDays: 5,
 *       indirectWorkDaysPre: 2,
 *       indirectWorkDaysPost: 2,
 *     },
 *     startDate: new Date('2024-05-06'),
 *     // ...
 *   },
 *   [],
 *   { workOnSaturdays: false, workOnSundays: false, workOnHolidays: false }
 * );
 * ```
 */
export const calculateDualCalendarDates = (
    task: ConstructionTask,
    holidays: Date[] = [],
    settings: CalendarSettings
): TaskDates => {
    // Level 1이거나 task 데이터가 없는 경우
    if (!task.task) {
        return {
            startDate: task.startDate,
            endDate: task.endDate,
            netWorkStartDate: task.startDate,
            netWorkEndDate: task.endDate,
        };
    }

    const { netWorkDays, indirectWorkDaysPre, indirectWorkDaysPost } = task.task;
    const baseStartDate = startOfDay(new Date(task.startDate));

    let currentDate = baseStartDate;

    // 1. 선 간접작업 계산 (달력일 기준)
    let indirectPreStart: Date | undefined;
    let indirectPreEnd: Date | undefined;

    if (indirectWorkDaysPre > 0) {
        indirectPreStart = currentDate;
        indirectPreEnd = addCalendarDays(currentDate, indirectWorkDaysPre);
        currentDate = addDays(indirectPreEnd, 1);
    }

    // 2. 순작업 계산 (휴일 건너뛰기)
    let netStart = currentDate;
    let netEnd = netStart;

    if (netWorkDays > 0) {
        // 순작업 시작일이 휴일이면 다음 작업일로 이동
        while (isHoliday(netStart, holidays, settings)) {
            netStart = addDays(netStart, 1);
        }
        netEnd = addWorkingDays(netStart, netWorkDays, holidays, settings);
        currentDate = addDays(netEnd, 1);
    } else if (indirectWorkDaysPre === 0) {
        // 순작업이 0이고 선간접도 0이면 기준일이 시작
        netStart = baseStartDate;
        netEnd = baseStartDate;
    }

    // 3. 후 간접작업 계산 (달력일 기준)
    let indirectPostStart: Date | undefined;
    let indirectPostEnd: Date | undefined;

    if (indirectWorkDaysPost > 0) {
        indirectPostStart = currentDate;
        indirectPostEnd = addCalendarDays(currentDate, indirectWorkDaysPost);
    }

    // 전체 시작일/종료일 계산
    const totalStart = indirectPreStart || netStart;
    const totalEnd = indirectPostEnd || netEnd;

    return {
        startDate: totalStart,
        endDate: totalEnd,
        netWorkStartDate: netStart,
        netWorkEndDate: netEnd,
        indirectPreStartDate: indirectPreStart,
        indirectPreEndDate: indirectPreEnd,
        indirectPostStartDate: indirectPostStart,
        indirectPostEndDate: indirectPostEnd,
    };
};

// ============================================
// 앵커 포인트 날짜 반환
// ============================================

/**
 * 앵커 포인트에 해당하는 날짜 반환
 */
export const getAnchorDate = (
    _task: ConstructionTask,
    anchor: AnchorPoint,
    dates: TaskDates
): Date => {
    switch (anchor) {
        case 'START':
            return dates.startDate;
        case 'NET_WORK_START':
            return dates.netWorkStartDate;
        case 'NET_WORK_END':
            return dates.netWorkEndDate;
        case 'END':
            return dates.endDate;
        default:
            return dates.endDate;
    }
};
