'use client';

import { useCallback, RefObject } from 'react';
import type { Virtualizer } from '@tanstack/react-virtual';
import type { ConstructionTask } from '../types';
import { dateToX } from '../utils/dateUtils';
import { calculateGroupDateRange } from '../utils/groupUtils';

interface UseTaskFocusOptions {
    /** 스크롤 컨테이너 ref */
    scrollContainerRef: RefObject<HTMLDivElement | null>;
    /** TanStack Virtual의 virtualizer 인스턴스 */
    virtualizer: Virtualizer<HTMLDivElement, Element> | null;
    /** 현재 보이는 Task 목록 */
    visibleTasks: ConstructionTask[];
    /** 전체 Task 목록 (GROUP 날짜 계산용) */
    allTasks?: ConstructionTask[];
    /** 날짜 범위의 시작 날짜 */
    minDate: Date;
    /** 픽셀/일 비율 */
    pixelsPerDay: number;
    /** 사이드바 너비 */
    sidebarWidth: number;
}

interface ScrollOptions {
    behavior?: 'auto' | 'smooth';
    align?: 'start' | 'center' | 'end';
}

/**
 * Task 포커싱 훅
 *
 * 가상화된 리스트에서 특정 Task로 스크롤하는 기능을 제공합니다.
 * - scrollToTask: 세로 스크롤 (가상화 지원)
 * - scrollToTaskDate: 가로 스크롤 (날짜 기반)
 * - focusTask: 양방향 스크롤 (세로 + 가로)
 */
export function useTaskFocus({
    scrollContainerRef,
    virtualizer,
    visibleTasks,
    allTasks,
    minDate,
    pixelsPerDay,
    sidebarWidth,
}: UseTaskFocusOptions) {

    /**
     * Task로 세로 스크롤 (가상화 지원)
     */
    const scrollToTask = useCallback((taskId: string, options?: ScrollOptions) => {
        if (!virtualizer) return;

        const taskIndex = visibleTasks.findIndex(t => t.id === taskId);
        if (taskIndex === -1) return;

        virtualizer.scrollToIndex(taskIndex, {
            align: options?.align ?? 'center',
            behavior: options?.behavior ?? 'smooth',
        });
    }, [visibleTasks, virtualizer]);

    /**
     * Task의 날짜로 가로 스크롤
     */
    const scrollToTaskDate = useCallback((task: ConstructionTask, options?: ScrollOptions) => {
        const container = scrollContainerRef.current;
        if (!container) return;

        // 날짜 범위 결정 (GROUP은 자식들의 범위로 계산)
        let startDate = task.startDate;
        let endDate = task.endDate;

        if (task.type === 'GROUP' && allTasks) {
            const dateRange = calculateGroupDateRange(task.id, allTasks);
            if (dateRange) {
                startDate = dateRange.startDate;
                endDate = dateRange.endDate;
            }
        }

        // Task 날짜 범위의 중앙 계산
        const taskCenterTime = startDate.getTime() +
            (endDate.getTime() - startDate.getTime()) / 2;
        const taskCenterDate = new Date(taskCenterTime);

        // 날짜를 X 좌표로 변환
        const x = dateToX(taskCenterDate, minDate, pixelsPerDay);

        // 타임라인 뷰포트 너비 계산 (사이드바 제외)
        const viewportWidth = container.clientWidth;
        const timelineViewWidth = viewportWidth - sidebarWidth - 4; // 4px = 리사이저

        // 중앙 정렬
        const align = options?.align ?? 'center';
        let scrollTarget: number;

        if (align === 'center') {
            scrollTarget = x - (timelineViewWidth / 2);
        } else if (align === 'start') {
            scrollTarget = x - 50; // 약간의 여백
        } else {
            scrollTarget = x - timelineViewWidth + 50;
        }

        container.scrollTo({
            left: Math.max(0, scrollTarget),
            behavior: options?.behavior ?? 'smooth',
        });
    }, [scrollContainerRef, minDate, pixelsPerDay, sidebarWidth, allTasks]);

    /**
     * Task로 양방향 스크롤 (세로 + 가로)
     */
    const focusTask = useCallback((taskId: string, options?: ScrollOptions) => {
        const task = visibleTasks.find(t => t.id === taskId);
        if (!task) return;

        // 1. 세로 스크롤 (가상화된 행으로)
        scrollToTask(taskId, options);

        // 2. 가로 스크롤 (Task 날짜로)
        // 약간의 딜레이를 주어 세로 스크롤이 먼저 완료되도록
        requestAnimationFrame(() => {
            scrollToTaskDate(task, options);
        });
    }, [visibleTasks, scrollToTask, scrollToTaskDate]);

    /**
     * 특정 날짜로 가로 스크롤
     */
    const scrollToDate = useCallback((targetDate: Date, align: 'left' | 'center' = 'center') => {
        const container = scrollContainerRef.current;
        if (!container) return;

        const x = dateToX(targetDate, minDate, pixelsPerDay);
        const viewportWidth = container.clientWidth;
        const timelineViewWidth = viewportWidth - sidebarWidth - 4;

        let scrollTarget: number;
        if (align === 'center') {
            scrollTarget = x - (timelineViewWidth / 2);
        } else {
            // 화면 너비의 15%를 여백으로 사용 (최소 80px, 최대 200px)
            scrollTarget = x - Math.min(200, Math.max(80, timelineViewWidth * 0.15));
        }

        container.scrollTo({
            left: Math.max(0, scrollTarget),
            behavior: 'smooth',
        });
    }, [scrollContainerRef, minDate, pixelsPerDay, sidebarWidth]);

    /**
     * Task 목록의 첫 번째 Task로 스크롤
     */
    const scrollToFirstTask = useCallback(() => {
        if (visibleTasks.length === 0) return;

        const firstTask = visibleTasks[0];
        focusTask(firstTask.id, { behavior: 'auto' });
    }, [visibleTasks, focusTask]);

    return {
        scrollToTask,
        scrollToTaskDate,
        focusTask,
        scrollToDate,
        scrollToFirstTask,
    };
}
