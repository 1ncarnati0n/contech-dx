// ============================================
// SA-Gantt-Lib: Critical Path 계산 유틸리티
// ============================================

import { addDays, startOfDay, differenceInDays } from 'date-fns';
import type {
    CalendarSettings,
    ConstructionTask,
    CriticalPathDay,
    CriticalPathSummary,
    TaskDates,
} from '../../types';
import {
    calculateDualCalendarDates,
    getTaskCalendarSettings,
    DEFAULT_CALENDAR_SETTINGS,
    isHoliday,
} from '../date';

// ============================================
// 내부 헬퍼 함수
// ============================================

/**
 * Task가 특정 날짜에 기여하는 순작업일 값을 계산
 *
 * @returns 0~1 사이의 값 (소수점 가능)
 */
const getNetWorkValueForDate = (
    date: Date,
    dates: TaskDates,
    task: ConstructionTask,
    holidays: Date[],
    settings: CalendarSettings
): number => {
    if (!task.task || task.task.netWorkDays <= 0) return 0;

    const d = startOfDay(date).getTime();
    const netStart = startOfDay(dates.netWorkStartDate).getTime();
    const netEnd = startOfDay(dates.netWorkEndDate).getTime();

    // 순작업 구간 밖이면 0
    if (d < netStart || d > netEnd) return 0;

    // 해당 날짜가 휴일이면 순작업이라도 비작업일로 처리
    if (isHoliday(date, holidays, settings)) return 0;

    const netWorkDays = task.task.netWorkDays;
    const wholeDays = Math.floor(netWorkDays);
    const fraction = netWorkDays - wholeDays;

    // 순작업 구간 내 작업일 인덱스 계산 (휴일 제외)
    let workDayIndex = 0;
    let currentDate = new Date(netStart);

    while (currentDate.getTime() < d) {
        if (!isHoliday(new Date(currentDate), holidays, settings)) {
            workDayIndex++;
        }
        currentDate = addDays(currentDate, 1);
    }

    // 마지막 작업일이고 소수점이 있는 경우
    if (workDayIndex === wholeDays && fraction > 0) {
        return fraction;
    }

    // 전체 작업일 범위 내
    if (workDayIndex < wholeDays) {
        return 1;
    }

    // 마지막 날인데 소수점이 없는 경우
    if (workDayIndex === wholeDays - 1 && fraction === 0) {
        return 1;
    }

    return 1; // 기본값
};

/**
 * Task가 특정 날짜에 기여하는 간접작업일 값을 계산
 *
 * @returns 0~1 사이의 값 (소수점 가능)
 */
const getIndirectWorkValueForDate = (
    date: Date,
    dates: TaskDates,
    task: ConstructionTask
): number => {
    if (!task.task) return 0;

    const d = startOfDay(date).getTime();
    const { indirectWorkDaysPre, indirectWorkDaysPost } = task.task;

    // 선간접 구간 체크
    if (indirectWorkDaysPre > 0 && dates.indirectPreStartDate && dates.indirectPreEndDate) {
        const preStart = startOfDay(dates.indirectPreStartDate).getTime();
        const preEnd = startOfDay(dates.indirectPreEndDate).getTime();

        if (d >= preStart && d <= preEnd) {
            const wholeDays = Math.floor(indirectWorkDaysPre);
            const fraction = indirectWorkDaysPre - wholeDays;
            const dayIndex = differenceInDays(new Date(d), new Date(preStart));

            // 마지막 날이고 소수점이 있는 경우
            if (dayIndex === wholeDays && fraction > 0) {
                return fraction;
            }
            if (dayIndex < wholeDays || (dayIndex === wholeDays - 1 && fraction === 0)) {
                return 1;
            }
            return 1;
        }
    }

    // 후간접 구간 체크
    if (indirectWorkDaysPost > 0 && dates.indirectPostStartDate && dates.indirectPostEndDate) {
        const postStart = startOfDay(dates.indirectPostStartDate).getTime();
        const postEnd = startOfDay(dates.indirectPostEndDate).getTime();

        if (d >= postStart && d <= postEnd) {
            const wholeDays = Math.floor(indirectWorkDaysPost);
            const fraction = indirectWorkDaysPost - wholeDays;
            const dayIndex = differenceInDays(new Date(d), new Date(postStart));

            // 마지막 날이고 소수점이 있는 경우
            if (dayIndex === wholeDays && fraction > 0) {
                return fraction;
            }
            if (dayIndex < wholeDays || (dayIndex === wholeDays - 1 && fraction === 0)) {
                return 1;
            }
            return 1;
        }
    }

    return 0;
};

// ============================================
// Critical Path 계산
// ============================================

/**
 * Level 2 Task들의 Critical Path 계산
 *
 * 산정 기준:
 * 1. 순작업 → 작업일
 * 2. 간접작업 → 비작업일
 * 3. 순작업 중 휴일 → 비작업일
 * 4. 여러 순작업 겹침 → 하나의 작업일 (max 1)
 * 5. 순작업 + 간접작업 겹침 → 작업일
 * 6. 여러 간접작업 겹침 → 하나의 비작업일 (max 1)
 * 7. 소수점 처리: 해당일에 0.5일씩이면 각각 0.5로 계산
 *
 * @param tasks - Level 2 Task 배열 (type === 'TASK')
 * @param holidays - 공휴일 목록
 * @param calendarSettings - 전역 캘린더 설정
 * @returns CriticalPathSummary
 */
export const calculateCriticalPath = (
    tasks: ConstructionTask[],
    holidays: Date[] = [],
    calendarSettings: CalendarSettings = DEFAULT_CALENDAR_SETTINGS
): CriticalPathSummary => {
    // Level 2 Task만 필터링 (type === 'TASK')
    const level2Tasks = tasks.filter(t => t.type === 'TASK' && t.task);

    if (level2Tasks.length === 0) {
        const today = startOfDay(new Date());
        return {
            startDate: today,
            endDate: today,
            totalDays: 0,
            workDays: 0,
            nonWorkDays: 0,
            netWorkDaysTotal: 0,
            indirectWorkDaysTotal: 0,
            dailyBreakdown: [],
        };
    }

    // 1. 각 Task의 날짜 정보 계산
    const taskDateInfos = level2Tasks.map(task => {
        const taskSettings = getTaskCalendarSettings(task.task, calendarSettings);
        const dates = calculateDualCalendarDates(task, holidays, taskSettings);
        return {
            task,
            dates,
            settings: taskSettings,
        };
    });

    // 2. 전체 기간 범위 산출
    const allStartDates = taskDateInfos.map(info => info.dates.startDate);
    const allEndDates = taskDateInfos.map(info => info.dates.endDate);

    const minDate = startOfDay(new Date(Math.min(...allStartDates.map(d => d.getTime()))));
    const maxDate = startOfDay(new Date(Math.max(...allEndDates.map(d => d.getTime()))));
    const totalDays = differenceInDays(maxDate, minDate) + 1;

    // 3. 일별 분석
    const dailyBreakdown: CriticalPathDay[] = [];
    let totalWorkDays = 0;
    let totalNonWorkDays = 0;

    let currentDate = new Date(minDate);

    for (let i = 0; i < totalDays; i++) {
        const date = startOfDay(new Date(currentDate));

        let netWorkValue = 0;       // 해당일 순작업 값 (0~1)
        let indirectWorkValue = 0;  // 해당일 간접작업 값 (0~1)
        let hasNetWork = false;
        let hasIndirectWork = false;
        const contributingTaskIds: string[] = [];

        // 각 Task에 대해 해당 날짜 분석
        for (const { task, dates, settings } of taskDateInfos) {
            // 순작업 값 계산
            const taskNetValue = getNetWorkValueForDate(date, dates, task, holidays, settings);
            if (taskNetValue > 0) {
                netWorkValue = Math.max(netWorkValue, taskNetValue); // 여러 순작업 겹쳐도 max 1
                hasNetWork = true;
                if (!contributingTaskIds.includes(task.id)) {
                    contributingTaskIds.push(task.id);
                }
            }

            // 간접작업 값 계산
            const taskIndirectValue = getIndirectWorkValueForDate(date, dates, task);
            if (taskIndirectValue > 0) {
                indirectWorkValue = Math.max(indirectWorkValue, taskIndirectValue); // 여러 간접작업 겹쳐도 max 1
                hasIndirectWork = true;
                if (!contributingTaskIds.includes(task.id)) {
                    contributingTaskIds.push(task.id);
                }
            }
        }

        // 전역 캘린더 설정 기준 휴일 체크
        const isHolidayDay = isHoliday(date, holidays, calendarSettings);

        // 최종 작업일/비작업일 값 계산
        // - 순작업이 있으면 작업일 (순작업 + 간접작업 겹침 → 작업일)
        // - 간접작업만 있으면 비작업일
        let workDayValue = 0;
        let nonWorkDayValue = 0;

        if (netWorkValue > 0) {
            // 순작업 있음 → 작업일
            workDayValue = netWorkValue;
            // 나머지는 비작업일 (간접작업 또는 빈 공간)
            nonWorkDayValue = Math.max(0, 1 - netWorkValue);
        } else if (indirectWorkValue > 0) {
            // 간접작업만 있음 → 하루 전체가 비작업일
            // (순작업이 없으면 간접작업 구간 + 나머지 구간 모두 비작업)
            nonWorkDayValue = 1;
            workDayValue = 0;
        } else {
            // 아무 작업 없음 → 비작업일
            nonWorkDayValue = 1;
            workDayValue = 0;
        }

        totalWorkDays += workDayValue;
        totalNonWorkDays += nonWorkDayValue;

        dailyBreakdown.push({
            date,
            workDayValue,
            nonWorkDayValue,
            hasNetWork,
            hasIndirectWork,
            isHoliday: isHolidayDay,
            contributingTaskIds,
        });

        currentDate = addDays(currentDate, 1);
    }

    // 소수점 작업일 합계 (기존 로직 유지)
    let netWorkDaysTotal = 0;
    let indirectWorkDaysTotal = 0;

    level2Tasks.forEach(task => {
        if (task.task) {
            netWorkDaysTotal += task.task.netWorkDays;
            indirectWorkDaysTotal += task.task.indirectWorkDaysPre + task.task.indirectWorkDaysPost;
        }
    });

    return {
        startDate: minDate,
        endDate: maxDate,
        totalDays,
        workDays: Math.round(totalWorkDays * 2) / 2,      // 0.5 단위
        nonWorkDays: Math.round(totalNonWorkDays * 2) / 2, // 0.5 단위
        netWorkDaysTotal,
        indirectWorkDaysTotal,
        dailyBreakdown,
    };
};
