'use client';

import { useCallback, useRef, useEffect } from 'react';
import type { ConstructionTask, Milestone, ViewMode, ZoomLevel } from '../../../types';
import { ZOOM_CONFIG, GANTT_LAYOUT } from '../../../types';
import { calculateDateRange, dateToX } from '../../../utils/dateUtils';

interface UseScrollToDateOptions {
    scrollRef: React.RefObject<HTMLDivElement | null>;
    viewMode: ViewMode;
    activeCPId: string | null;
    zoomLevel: ZoomLevel;
    sidebarWidth: number;
    tasks: ConstructionTask[];
    visibleTasks: ConstructionTask[];
    milestones: Milestone[];
}

export const useScrollToDate = ({
    scrollRef,
    viewMode,
    activeCPId,
    zoomLevel,
    sidebarWidth,
    tasks,
    visibleTasks,
    milestones,
}: UseScrollToDateOptions) => {
    const scrollToDate = useCallback((targetDate: Date, align: 'left' | 'center' = 'left') => {
        const container = scrollRef.current;
        if (!container) return;

        const pxPerDay = ZOOM_CONFIG[zoomLevel].pixelsPerDay;
        const { minDate } = calculateDateRange(tasks, milestones, 60);
        const x = dateToX(targetDate, minDate, pxPerDay);

        const viewportWidth = container.clientWidth;
        const timelineViewWidth = viewportWidth - sidebarWidth - 4;

        let leftMargin = 0;
        if (align === 'center') {
            leftMargin = timelineViewWidth / 2;
        } else {
            // 화면 너비의 15%를 여백으로 사용 (최소 80px, 최대 200px)
            leftMargin = Math.min(200, Math.max(80, timelineViewWidth * 0.15));
        }

        container.scrollTo({
            left: Math.max(0, x - leftMargin),
            behavior: 'smooth',
        });
    }, [scrollRef, zoomLevel, tasks, milestones, sidebarWidth]);

    const scrollToFirstTask = useCallback(() => {
        if (viewMode === 'MASTER') {
            if (milestones.length > 0) {
                const sortedMilestones = [...milestones].sort((a, b) => a.date.getTime() - b.date.getTime());
                const firstMilestone = sortedMilestones[0];
                scrollToDate(firstMilestone.date, 'left');
            } else {
                const today = new Date();
                today.setHours(0, 0, 0, 0);
                const cpTasks = visibleTasks.filter(t => t.type === 'CP');
                const inProgressCPs = cpTasks.filter(cp => {
                    const start = new Date(cp.startDate);
                    const end = new Date(cp.endDate);
                    start.setHours(0, 0, 0, 0);
                    end.setHours(0, 0, 0, 0);
                    return start <= today && today <= end;
                });

                if (inProgressCPs.length > 0) {
                    const targetCP = inProgressCPs.reduce((a, b) => a.startDate < b.startDate ? a : b);
                    scrollToDate(targetCP.startDate, 'left');
                } else if (cpTasks.length > 0) {
                    const firstCP = cpTasks.reduce((a, b) => a.startDate < b.startDate ? a : b);
                    scrollToDate(firstCP.startDate, 'left');
                }
            }
        } else if (viewMode === 'DETAIL' && activeCPId) {
            // 그룹 내부의 중첩된 Task까지 포함하여 모든 후손 Task 수집
            const collectDescendants = (parentId: string): ConstructionTask[] => {
                const result: ConstructionTask[] = [];
                tasks.forEach(t => {
                    if (t.parentId === parentId) {
                        result.push(t);
                        if (t.type === 'GROUP') {
                            result.push(...collectDescendants(t.id));
                        }
                    }
                });
                return result;
            };

            const allChildTasks = collectDescendants(activeCPId);
            // TASK 타입만 필터링 (GROUP은 날짜가 자동 계산되므로 제외)
            const taskOnlyChildren = allChildTasks.filter(t => t.type === 'TASK');

            if (taskOnlyChildren.length > 0) {
                // 가장 빠른 시작일로 스크롤 (중앙이 아닌 시작점으로)
                const minStart = taskOnlyChildren.reduce(
                    (min, t) => t.startDate < min ? t.startDate : min,
                    taskOnlyChildren[0].startDate
                );
                scrollToDate(minStart, 'left');
            } else if (allChildTasks.length > 0) {
                // TASK가 없으면 GROUP이라도 사용
                const minStart = allChildTasks.reduce(
                    (min, t) => t.startDate < min ? t.startDate : min,
                    allChildTasks[0].startDate
                );
                scrollToDate(minStart, 'left');
            }
        }
    }, [viewMode, activeCPId, tasks, visibleTasks, milestones, scrollToDate]);

    // Detail View 진입 시 자동 스크롤
    const lastScrolledCPId = useRef<string | null>(null);

    useEffect(() => {
        if (viewMode !== 'DETAIL') {
            lastScrolledCPId.current = null;
        }
    }, [viewMode]);

    useEffect(() => {
        if (viewMode === 'DETAIL' && activeCPId && activeCPId !== lastScrolledCPId.current) {
            lastScrolledCPId.current = activeCPId;

            // 레이아웃 업데이트(줌 레벨 변경 등)가 완료된 후 스크롤 실행
            // requestAnimationFrame으로 렌더링 사이클 완료를 기다린 후
            // setTimeout으로 추가 지연을 줌
            const frameId = requestAnimationFrame(() => {
                const timer = setTimeout(() => {
                    scrollToFirstTask();
                }, GANTT_LAYOUT.SCROLL_DELAY_MS);

                // cleanup을 위해 timer를 ref에 저장하거나 여기서 처리
                return () => clearTimeout(timer);
            });

            return () => cancelAnimationFrame(frameId);
        }
    }, [viewMode, activeCPId, zoomLevel, scrollToFirstTask]); // zoomLevel 의존성 추가

    return {
        scrollToDate,
        scrollToFirstTask,
    };
};
