// ============================================
// SA-Gantt-Lib: Critical Path 포맷터
// ============================================

import type { CriticalPathSummary } from '../../types';

/**
 * Critical Path 요약 문자열 생성
 */
export const formatCriticalPathSummary = (summary: CriticalPathSummary): string => {
    const formatNumber = (n: number) => {
        return Number.isInteger(n) ? n.toString() : n.toFixed(1);
    };

    return `총 공기: ${summary.totalDays}일 | 작업일: ${formatNumber(summary.workDays)}일 | 비작업일: ${formatNumber(summary.nonWorkDays)}일`;
};
