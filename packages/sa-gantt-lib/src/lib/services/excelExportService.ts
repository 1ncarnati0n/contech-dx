/**
 * Excel Export Service
 * 간트 차트 데이터를 Excel 파일로 내보내는 서비스
 * - 전체 시트: 모든 데이터
 * - Master 시트: Level 1 (공구 공정표)
 * - CP별 시트: 각 공구의 Level 2 상세 공정
 */

import ExcelJS from 'exceljs';
import { format, eachDayOfInterval, differenceInDays, isSameDay } from 'date-fns';
import type { ConstructionTask, Milestone } from '../types';

// ============================================
// 타입 정의
// ============================================

export interface ExcelExportData {
    tasks: ConstructionTask[];
    milestones: Milestone[];
    fileName?: string;
}

interface DateRangeResult {
    minDate: Date;
    maxDate: Date;
    totalDays: number;
}

interface SheetOptions {
    sheetName: string;
    tasks: ConstructionTask[];
    milestones: Milestone[];
    showMilestones?: boolean;
}

// ============================================
// 색상 상수 (ARGB 형식)
// ============================================

const COLORS = {
    // CP 바 색상
    CP_WORK: 'FFE64A19',        // Vermilion (작업일)
    CP_NON_WORK: 'FF009688',    // Teal (비작업일)

    // Task 바 색상
    TASK_NET_WORK: 'FFF44336',  // Red (순작업일)
    TASK_INDIRECT: 'FF2196F3',  // Blue (간접작업일)

    // GROUP 색상
    GROUP_BAR: 'FF9E9E9E',      // Gray

    // 마일스톤 색상
    MILESTONE: 'FFFF9800',      // Orange

    // 헤더 배경색
    HEADER_BG: 'FF424242',      // Dark Gray
    HEADER_TEXT: 'FFFFFFFF',    // White

    // 주말/휴일 배경색
    WEEKEND_BG: 'FFF5F5F5',     // Light Gray

    // 테두리 색상
    BORDER: 'FFE0E0E0',         // Light Gray
};

// ============================================
// 유틸리티 함수
// ============================================

/**
 * 전체 Task와 Milestone에서 날짜 범위 계산
 */
const calculateDateRange = (tasks: ConstructionTask[], milestones: Milestone[]): DateRangeResult => {
    if (tasks.length === 0) {
        const now = new Date();
        return { minDate: now, maxDate: now, totalDays: 1 };
    }

    let minDate = tasks[0].startDate;
    let maxDate = tasks[0].endDate;

    // Task 날짜 범위
    tasks.forEach(task => {
        if (task.startDate < minDate) minDate = task.startDate;
        if (task.endDate > maxDate) maxDate = task.endDate;
    });

    // Milestone 날짜도 포함
    milestones.forEach(m => {
        if (m.date < minDate) minDate = m.date;
        if (m.date > maxDate) maxDate = m.date;
    });

    // 앞뒤로 7일 여유
    minDate = new Date(minDate);
    minDate.setDate(minDate.getDate() - 7);

    maxDate = new Date(maxDate);
    maxDate.setDate(maxDate.getDate() + 7);

    const totalDays = differenceInDays(maxDate, minDate) + 1;

    return { minDate, maxDate, totalDays };
};

/**
 * Task의 계층 깊이 계산
 */
const getTaskDepth = (task: ConstructionTask, taskMap: Map<string, ConstructionTask>): number => {
    let depth = 0;
    let current = task;

    while (current.parentId) {
        depth++;
        const parent = taskMap.get(current.parentId);
        if (!parent) break;
        current = parent;
    }

    return depth;
};

/**
 * Task를 계층 순서로 정렬 (WBS 순서)
 */
const sortTasksHierarchically = (tasks: ConstructionTask[]): ConstructionTask[] => {
    const result: ConstructionTask[] = [];
    const visited = new Set<string>();

    const addTaskWithChildren = (task: ConstructionTask) => {
        if (visited.has(task.id)) return;
        visited.add(task.id);
        result.push(task);

        // 자식 태스크 추가
        tasks
            .filter(t => t.parentId === task.id)
            .forEach(child => addTaskWithChildren(child));
    };

    // 루트 태스크부터 시작
    tasks
        .filter(t => t.parentId === null)
        .forEach(root => addTaskWithChildren(root));

    // visited에 없는 나머지 태스크 추가 (부모가 다른 레벨에 있는 경우)
    tasks.forEach(t => {
        if (!visited.has(t.id)) {
            addTaskWithChildren(t);
        }
    });

    return result;
};

/**
 * 주말 여부 확인
 */
const isWeekend = (date: Date): boolean => {
    const day = date.getDay();
    return day === 0 || day === 6;
};

/**
 * CP 하위의 모든 Task 재귀적으로 수집
 */
const collectChildTasks = (parentId: string, allTasks: ConstructionTask[]): ConstructionTask[] => {
    const result: ConstructionTask[] = [];

    const collect = (pid: string) => {
        allTasks.forEach(task => {
            if (task.parentId === pid) {
                result.push(task);
                collect(task.id);
            }
        });
    };

    collect(parentId);
    return result;
};

// ============================================
// 시트 생성 헬퍼 함수
// ============================================

const addGanttSheet = (
    workbook: ExcelJS.Workbook,
    options: SheetOptions
): void => {
    const { sheetName, tasks, milestones, showMilestones = true } = options;

    if (tasks.length === 0) return;

    // 시트 생성
    const sheet = workbook.addWorksheet(sheetName, {
        views: [{ state: 'frozen', xSplit: 4, ySplit: 2 }],
    });

    // 데이터 준비
    const taskMap = new Map(tasks.map(t => [t.id, t]));
    const sortedTasks = sortTasksHierarchically(tasks);
    const { minDate, maxDate } = calculateDateRange(tasks, milestones);
    const dateRange = eachDayOfInterval({ start: minDate, end: maxDate });

    // ============================================
    // 1. 헤더 행 설정
    // ============================================

    const fixedHeaders = ['WBS', '공정명', '시작일', '종료일'];
    const headerRow1 = sheet.getRow(1);

    // 고정 컬럼 설정
    fixedHeaders.forEach((header, idx) => {
        const cell = headerRow1.getCell(idx + 1);
        cell.value = header;
        cell.fill = {
            type: 'pattern',
            pattern: 'solid',
            fgColor: { argb: COLORS.HEADER_BG },
        };
        cell.font = { bold: true, color: { argb: COLORS.HEADER_TEXT } };
        cell.alignment = { horizontal: 'center', vertical: 'middle' };
        cell.border = {
            top: { style: 'thin', color: { argb: COLORS.BORDER } },
            bottom: { style: 'thin', color: { argb: COLORS.BORDER } },
            left: { style: 'thin', color: { argb: COLORS.BORDER } },
            right: { style: 'thin', color: { argb: COLORS.BORDER } },
        };
    });

    // 날짜 헤더 (월 표시 - 1행)
    let currentMonth = '';
    let monthStartCol = fixedHeaders.length + 1;

    dateRange.forEach((date, idx) => {
        const colIdx = fixedHeaders.length + 1 + idx;
        const monthStr = format(date, 'yyyy-MM');

        if (monthStr !== currentMonth) {
            if (currentMonth !== '' && colIdx > monthStartCol + 1) {
                sheet.mergeCells(1, monthStartCol, 1, colIdx - 1);
            }
            currentMonth = monthStr;
            monthStartCol = colIdx;

            const cell = headerRow1.getCell(colIdx);
            cell.value = format(date, 'yyyy년 MM월');
            cell.fill = {
                type: 'pattern',
                pattern: 'solid',
                fgColor: { argb: COLORS.HEADER_BG },
            };
            cell.font = { bold: true, color: { argb: COLORS.HEADER_TEXT } };
            cell.alignment = { horizontal: 'center', vertical: 'middle' };
        }
    });

    // 마지막 월 병합
    if (monthStartCol < fixedHeaders.length + dateRange.length) {
        sheet.mergeCells(1, monthStartCol, 1, fixedHeaders.length + dateRange.length);
    }

    // 날짜 헤더 (일 표시 - 2행)
    const headerRow2 = sheet.getRow(2);

    fixedHeaders.forEach((_, idx) => {
        const cell = headerRow2.getCell(idx + 1);
        cell.fill = {
            type: 'pattern',
            pattern: 'solid',
            fgColor: { argb: COLORS.HEADER_BG },
        };
        cell.border = {
            top: { style: 'thin', color: { argb: COLORS.BORDER } },
            bottom: { style: 'thin', color: { argb: COLORS.BORDER } },
            left: { style: 'thin', color: { argb: COLORS.BORDER } },
            right: { style: 'thin', color: { argb: COLORS.BORDER } },
        };
    });

    // 1행과 2행 병합 (고정 컬럼)
    fixedHeaders.forEach((_, idx) => {
        sheet.mergeCells(1, idx + 1, 2, idx + 1);
    });

    dateRange.forEach((date, idx) => {
        const colIdx = fixedHeaders.length + 1 + idx;
        const cell = headerRow2.getCell(colIdx);
        cell.value = format(date, 'd');

        const bgColor = isWeekend(date) ? COLORS.WEEKEND_BG : COLORS.HEADER_BG;
        const textColor = isWeekend(date) ? 'FF999999' : COLORS.HEADER_TEXT;

        cell.fill = {
            type: 'pattern',
            pattern: 'solid',
            fgColor: { argb: bgColor },
        };
        cell.font = {
            bold: false,
            color: { argb: textColor },
            size: 9,
        };
        cell.alignment = { horizontal: 'center', vertical: 'middle' };
        cell.border = {
            top: { style: 'thin', color: { argb: COLORS.BORDER } },
            bottom: { style: 'thin', color: { argb: COLORS.BORDER } },
            left: { style: 'thin', color: { argb: COLORS.BORDER } },
            right: { style: 'thin', color: { argb: COLORS.BORDER } },
        };
    });

    // ============================================
    // 2. 마일스톤 행 (3행) - 옵션에 따라 표시
    // ============================================

    let dataStartRow = 3;

    if (showMilestones && milestones.length > 0) {
        const milestoneRow = sheet.getRow(3);
        milestoneRow.getCell(1).value = '';
        milestoneRow.getCell(2).value = 'Milestones';
        milestoneRow.getCell(2).font = { bold: true, italic: true };
        milestoneRow.getCell(3).value = '';
        milestoneRow.getCell(4).value = '';

        for (let i = 1; i <= 4; i++) {
            milestoneRow.getCell(i).border = {
                top: { style: 'thin', color: { argb: COLORS.BORDER } },
                bottom: { style: 'thin', color: { argb: COLORS.BORDER } },
                left: { style: 'thin', color: { argb: COLORS.BORDER } },
                right: { style: 'thin', color: { argb: COLORS.BORDER } },
            };
        }

        dateRange.forEach((date, idx) => {
            const colIdx = fixedHeaders.length + 1 + idx;
            const cell = milestoneRow.getCell(colIdx);

            const milestonesOnDate = milestones.filter(m => isSameDay(m.date, date));

            if (milestonesOnDate.length > 0) {
                cell.value = milestonesOnDate.map(m => m.name).join(', ');
                cell.fill = {
                    type: 'pattern',
                    pattern: 'solid',
                    fgColor: { argb: COLORS.MILESTONE },
                };
                cell.font = { bold: true, size: 8 };
                cell.alignment = { horizontal: 'center', vertical: 'middle', wrapText: true };
            }

            cell.border = {
                top: { style: 'thin', color: { argb: COLORS.BORDER } },
                bottom: { style: 'thin', color: { argb: COLORS.BORDER } },
                left: { style: 'thin', color: { argb: COLORS.BORDER } },
                right: { style: 'thin', color: { argb: COLORS.BORDER } },
            };
        });

        dataStartRow = 4;
    }

    // ============================================
    // 3. Task 행 추가
    // ============================================

    sortedTasks.forEach((task, taskIdx) => {
        const rowIdx = dataStartRow + taskIdx;
        const row = sheet.getRow(rowIdx);
        const depth = getTaskDepth(task, taskMap);

        // WBS 번호
        row.getCell(1).value = taskIdx + 1;
        row.getCell(1).alignment = { horizontal: 'center', vertical: 'middle' };

        // 공정명 (들여쓰기)
        const indent = '  '.repeat(depth);
        const prefix = task.type === 'GROUP' ? '[-] ' : task.type === 'CP' ? '[CP] ' : '';
        row.getCell(2).value = indent + prefix + task.name;
        row.getCell(2).alignment = { horizontal: 'left', vertical: 'middle' };
        if (task.type === 'GROUP' || task.type === 'CP') {
            row.getCell(2).font = { bold: true };
        }

        // 시작일
        row.getCell(3).value = format(task.startDate, 'yyyy-MM-dd');
        row.getCell(3).alignment = { horizontal: 'center', vertical: 'middle' };

        // 종료일
        row.getCell(4).value = format(task.endDate, 'yyyy-MM-dd');
        row.getCell(4).alignment = { horizontal: 'center', vertical: 'middle' };

        // 고정 컬럼 테두리
        for (let i = 1; i <= 4; i++) {
            row.getCell(i).border = {
                top: { style: 'thin', color: { argb: COLORS.BORDER } },
                bottom: { style: 'thin', color: { argb: COLORS.BORDER } },
                left: { style: 'thin', color: { argb: COLORS.BORDER } },
                right: { style: 'thin', color: { argb: COLORS.BORDER } },
            };
        }

        // 간트 바 그리기
        dateRange.forEach((date, dateIdx) => {
            const colIdx = fixedHeaders.length + 1 + dateIdx;
            const cell = row.getCell(colIdx);

            cell.border = {
                top: { style: 'thin', color: { argb: COLORS.BORDER } },
                bottom: { style: 'thin', color: { argb: COLORS.BORDER } },
                left: { style: 'thin', color: { argb: COLORS.BORDER } },
                right: { style: 'thin', color: { argb: COLORS.BORDER } },
            };

            if (date >= task.startDate && date <= task.endDate) {
                let barColor = COLORS.GROUP_BAR;

                if (task.type === 'CP' && task.cp) {
                    barColor = COLORS.CP_WORK;
                } else if (task.type === 'TASK' && task.task) {
                    const dayOffset = differenceInDays(date, task.startDate);
                    const { netWorkDays, indirectWorkDaysPre, indirectWorkDaysPost } = task.task;
                    const totalDays = indirectWorkDaysPre + netWorkDays + indirectWorkDaysPost;

                    if (dayOffset < indirectWorkDaysPre) {
                        barColor = COLORS.TASK_INDIRECT;
                    } else if (dayOffset < indirectWorkDaysPre + netWorkDays) {
                        barColor = COLORS.TASK_NET_WORK;
                    } else if (dayOffset < totalDays) {
                        barColor = COLORS.TASK_INDIRECT;
                    }
                } else if (task.type === 'GROUP') {
                    barColor = COLORS.GROUP_BAR;
                }

                cell.fill = {
                    type: 'pattern',
                    pattern: 'solid',
                    fgColor: { argb: barColor },
                };
            } else if (isWeekend(date)) {
                cell.fill = {
                    type: 'pattern',
                    pattern: 'solid',
                    fgColor: { argb: COLORS.WEEKEND_BG },
                };
            }
        });
    });

    // ============================================
    // 4. 열 너비 및 행 높이 설정
    // ============================================

    sheet.getColumn(1).width = 6;
    sheet.getColumn(2).width = 30;
    sheet.getColumn(3).width = 12;
    sheet.getColumn(4).width = 12;

    for (let i = 0; i < dateRange.length; i++) {
        sheet.getColumn(fixedHeaders.length + 1 + i).width = 3;
    }

    sheet.getRow(1).height = 20;
    sheet.getRow(2).height = 18;

    if (showMilestones && milestones.length > 0) {
        sheet.getRow(3).height = 25;
    }

    for (let i = dataStartRow; i <= sortedTasks.length + dataStartRow - 1; i++) {
        sheet.getRow(i).height = 22;
    }
};

// ============================================
// 메인 Export 함수
// ============================================

export const exportToExcel = async (data: ExcelExportData): Promise<void> => {
    const { tasks, milestones, fileName } = data;

    // 워크북 생성
    const workbook = new ExcelJS.Workbook();
    workbook.creator = 'SA-Gantt-Lib';
    workbook.created = new Date();

    // ============================================
    // 1. "전체" 시트: 모든 데이터
    // ============================================
    addGanttSheet(workbook, {
        sheetName: '전체',
        tasks: tasks,
        milestones: milestones,
        showMilestones: true,
    });

    // ============================================
    // 2. "Master" 시트: Level 1만
    // ============================================
    const masterTasks = tasks.filter(t => t.wbsLevel === 1);
    const masterMilestones = milestones.filter(m => m.milestoneType === 'MASTER' || !m.milestoneType);

    if (masterTasks.length > 0) {
        addGanttSheet(workbook, {
            sheetName: 'Master',
            tasks: masterTasks,
            milestones: masterMilestones,
            showMilestones: true,
        });
    }

    // ============================================
    // 3. 각 CP별 Detail 시트
    // ============================================
    const cpTasks = tasks.filter(t => t.wbsLevel === 1 && t.type === 'CP');

    // 사용된 시트명 추적 (중복 방지)
    const usedSheetNames = new Set<string>(['전체', 'Master']);

    cpTasks.forEach(cp => {
        // CP 하위의 모든 Level 2 Task 수집
        const childTasks = collectChildTasks(cp.id, tasks);
        const level2Tasks = childTasks.filter(t => t.wbsLevel === 2);

        if (level2Tasks.length > 0) {
            // 시트명 정리 (Excel 시트명 제한: 31자, 특수문자 제한)
            const baseName = cp.name.replace(/[\\/*?:\[\]]/g, '').substring(0, 28);

            // 중복 시트명 처리: 이미 존재하면 (2), (3) 등 suffix 추가
            let finalName = baseName;
            let counter = 2;
            while (usedSheetNames.has(finalName)) {
                const suffix = ` (${counter})`;
                finalName = baseName.substring(0, 28 - suffix.length) + suffix;
                counter++;
            }
            usedSheetNames.add(finalName);

            // Detail 마일스톤만 필터링
            const detailMilestones = milestones.filter(m => m.milestoneType === 'DETAIL');

            addGanttSheet(workbook, {
                sheetName: finalName,
                tasks: level2Tasks,
                milestones: detailMilestones,
                showMilestones: detailMilestones.length > 0,
            });
        }
    });

    // ============================================
    // 4. 파일 다운로드
    // ============================================

    const buffer = await workbook.xlsx.writeBuffer();
    const blob = new Blob([buffer], {
        type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
    });

    const defaultFileName = fileName
        ? fileName.replace(/\.json$/i, '.xlsx')
        : `gantt-chart-${format(new Date(), 'yyyy-MM-dd')}.xlsx`;

    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = defaultFileName;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);

    console.log('Excel exported successfully:', defaultFileName);
};
