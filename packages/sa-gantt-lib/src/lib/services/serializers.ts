/**
 * Serializers Module
 *
 * 데이터 직렬화/역직렬화 로직
 * - Date 객체 ↔ ISO 문자열 변환
 * - 내부 저장용 직렬화 (localStorage)
 * - 외부 내보내기용 직렬화 (JSON 파일)
 * - 타입 가드 (런타임 데이터 검증)
 */

import { format } from 'date-fns';
import type { ConstructionTask, Milestone, GroupDependency, Dependency, DependencyType, AnchorPoint } from '../types';
import type { GanttData } from './DataService';
import { migrateTaskTypes } from '../utils/migration';

// ============================================
// 날짜 파싱 유틸리티
// ============================================

/**
 * 'YYYY-MM-DD' 형식을 로컬 시간대 자정으로 파싱
 *
 * parseISO('2025-01-26')는 UTC 자정으로 파싱되어 timezone에 따라
 * 날짜가 하루 밀릴 수 있음. 이 함수는 로컬 시간대 자정으로 파싱하여
 * 어떤 timezone에서도 동일한 날짜(요일)를 보장합니다.
 */
function parseLocalDate(dateStr: string | null | undefined): Date {
    if (!dateStr) {
        console.warn('[parseLocalDate] Empty date string, using current date');
        return new Date();
    }

    // ISO 문자열에서 날짜 부분만 추출 (T 이전 부분)
    const datePart = String(dateStr).split('T')[0];
    const parts = datePart.split('-');

    if (parts.length !== 3) {
        console.warn('[parseLocalDate] Invalid date format:', dateStr);
        return new Date();
    }

    const [year, month, day] = parts.map(Number);

    if (isNaN(year) || isNaN(month) || isNaN(day)) {
        console.warn('[parseLocalDate] Invalid date numbers:', dateStr);
        return new Date();
    }

    return new Date(year, month - 1, day); // 월은 0-based
}

// ============================================
// 타입 가드 (Type Guards)
// ============================================

/**
 * Task 데이터 유효성 검증
 * ConstructionTask의 필수 필드를 모두 검증
 */
export const isValidTaskData = (data: unknown): data is Record<string, unknown> & {
    id: string;
    parentId: string | null;
    wbsLevel: 1 | 2;
    type: 'BLOCK' | 'GROUP' | 'CP' | 'TASK';
    name: string;
    startDate: string;
    endDate: string;
} => {
    if (!data || typeof data !== 'object') return false;
    const obj = data as Record<string, unknown>;
    return (
        // 필수 문자열 필드
        typeof obj.id === 'string' &&
        typeof obj.name === 'string' &&
        typeof obj.startDate === 'string' &&
        typeof obj.endDate === 'string' &&
        // parentId: null 또는 string
        (obj.parentId === null || typeof obj.parentId === 'string') &&
        // wbsLevel: 1 또는 2
        (obj.wbsLevel === 1 || obj.wbsLevel === 2) &&
        // type: 'BLOCK', 'GROUP', 'CP', 'TASK' 중 하나
        (obj.type === 'BLOCK' || obj.type === 'GROUP' || obj.type === 'CP' || obj.type === 'TASK')
    );
};

/**
 * Milestone 데이터 유효성 검증
 */
export const isValidMilestoneData = (data: unknown): data is Record<string, unknown> & {
    id: string;
    date: string;
    name: string;
} => {
    if (!data || typeof data !== 'object') return false;
    const obj = data as Record<string, unknown>;
    return (
        typeof obj.id === 'string' &&
        typeof obj.date === 'string' &&
        typeof obj.name === 'string'
    );
};

/**
 * CPData 유효성 검증
 */
export const isValidCPData = (data: unknown): data is { workDaysTotal: number; nonWorkDaysTotal: number } => {
    if (!data || typeof data !== 'object') return false;
    const obj = data as Record<string, unknown>;
    return (
        typeof obj.workDaysTotal === 'number' &&
        typeof obj.nonWorkDaysTotal === 'number'
    );
};

/**
 * TaskData 유효성 검증
 */
export const isValidTaskDataFields = (data: unknown): data is {
    netWorkDays: number;
    indirectWorkDaysPre: number;
    indirectWorkDaysPost: number;
} => {
    if (!data || typeof data !== 'object') return false;
    const obj = data as Record<string, unknown>;
    return (
        typeof obj.netWorkDays === 'number' &&
        typeof obj.indirectWorkDaysPre === 'number' &&
        typeof obj.indirectWorkDaysPost === 'number'
    );
};

/**
 * GroupData 유효성 검증
 */
export const isValidGroupData = (data: unknown): data is { progress?: number } => {
    if (!data || typeof data !== 'object') return false;
    const obj = data as Record<string, unknown>;
    // progress는 선택적이며, 있으면 숫자여야 함
    return obj.progress === undefined || typeof obj.progress === 'number';
};

/**
 * GroupDependency 데이터 유효성 검증 (FS: Finish-to-Start)
 */
export const isValidGroupDependencyData = (data: unknown): data is GroupDependency => {
    if (!data || typeof data !== 'object') return false;
    const obj = data as Record<string, unknown>;
    return (
        typeof obj.id === 'string' &&
        typeof obj.sourceGroupId === 'string' &&
        typeof obj.targetGroupId === 'string' &&
        (obj.type === 'FS') &&
        (obj.lag === undefined || typeof obj.lag === 'number')
    );
};

// ============================================
// 내부 저장용 직렬화 (localStorage - ISO Full Format)
// ============================================

/**
 * Tasks를 JSON 문자열로 직렬화 (내부 저장용)
 * 날짜 형식: yyyy-MM-dd'T'HH:mm:ss.SSSxxx
 */
export const serializeTasks = (tasks: ConstructionTask[]): string => {
    const serialized = tasks.map(t => ({
        ...t,
        startDate: format(t.startDate, "yyyy-MM-dd'T'HH:mm:ss.SSSxxx"),
        endDate: format(t.endDate, "yyyy-MM-dd'T'HH:mm:ss.SSSxxx"),
    }));
    return JSON.stringify(serialized);
};

/**
 * JSON 문자열에서 Tasks 역직렬화
 * 자동으로 Legacy GROUP → BLOCK 마이그레이션 적용
 */
export const deserializeTasks = (json: string): ConstructionTask[] | null => {
    try {
        console.log('[deserializeTasks] Start parsing');
        const parsed = JSON.parse(json);
        if (!Array.isArray(parsed)) {
            console.error('Invalid tasks data format: expected array');
            return null;
        }
        console.log('[deserializeTasks] Parsed count:', parsed.length);

        const validTasks = parsed.filter(isValidTaskData);
        console.log('[deserializeTasks] Valid tasks:', validTasks.length);
        if (validTasks.length !== parsed.length) {
            console.warn(
                `[deserializeTasks] ${parsed.length - validTasks.length}개의 유효하지 않은 Task가 필터링됨`
            );
        }

        const tasks = validTasks.map((t): ConstructionTask => {
            // 선택적 필드 검증 및 안전한 변환
            const cp = t.cp !== undefined && isValidCPData(t.cp) ? t.cp : undefined;
            const task = t.task !== undefined && isValidTaskDataFields(t.task)
                ? { ...t.task as object } as ConstructionTask['task']
                : undefined;
            const group = t.group !== undefined && isValidGroupData(t.group) ? t.group : undefined;

            // dependencies 배열 검증
            const dependencies = Array.isArray(t.dependencies)
                ? (t.dependencies as ConstructionTask['dependencies'])
                : [];

            return {
                id: t.id,
                parentId: t.parentId,
                wbsLevel: t.wbsLevel,
                type: t.type,
                name: t.name,
                startDate: parseLocalDate(t.startDate),
                endDate: parseLocalDate(t.endDate),
                cp,
                task,
                group,
                dependencies,
            };
        });

        console.log('[deserializeTasks] Before migration, tasks count:', tasks.length);
        // 자동 마이그레이션 적용 (Legacy GROUP → BLOCK)
        const migrated = migrateTaskTypes(tasks);
        console.log('[deserializeTasks] After migration, tasks count:', migrated.length);

        return migrated;
    } catch (error) {
        console.error('Failed to deserialize tasks:', error);
        return null;
    }
};

/**
 * Milestones를 JSON 문자열로 직렬화 (내부 저장용)
 */
export const serializeMilestones = (milestones: Milestone[]): string => {
    const serialized = milestones.map(m => ({
        ...m,
        date: format(m.date, "yyyy-MM-dd'T'HH:mm:ss.SSSxxx"),
    }));
    return JSON.stringify(serialized);
};

/**
 * JSON 문자열에서 Milestones 역직렬화
 */
export const deserializeMilestones = (json: string): Milestone[] | null => {
    try {
        const parsed = JSON.parse(json);
        if (!Array.isArray(parsed)) {
            console.error('Invalid milestones data format: expected array');
            return null;
        }

        return parsed
            .filter(isValidMilestoneData)
            .map((m) => ({
                ...m,
                date: parseLocalDate(m.date),
            })) as Milestone[];
    } catch (error) {
        console.error('Failed to deserialize milestones:', error);
        return null;
    }
};

/**
 * GroupDependencies를 JSON 문자열로 직렬화 (내부 저장용)
 * 날짜 필드 없음 - 단순 직렬화
 */
export const serializeGroupDependencies = (deps: GroupDependency[]): string => {
    return JSON.stringify(deps);
};

/**
 * JSON 문자열에서 GroupDependencies 역직렬화
 */
export const deserializeGroupDependencies = (json: string): GroupDependency[] | null => {
    try {
        const parsed = JSON.parse(json);
        if (!Array.isArray(parsed)) {
            console.error('Invalid group dependencies data format: expected array');
            return null;
        }

        return parsed.filter(isValidGroupDependencyData);
    } catch (error) {
        console.error('Failed to deserialize group dependencies:', error);
        return null;
    }
};

// ============================================
// 외부 내보내기용 직렬화 (JSON File - YYYY-MM-DD)
// ============================================

/**
 * Tasks를 외부 내보내기 형식으로 직렬화
 * 날짜 형식: yyyy-MM-dd (mock.json 호환)
 */
export const serializeTasksForExport = (tasks: ConstructionTask[]) => {
    return tasks.map(t => ({
        id: t.id,
        parentId: t.parentId,
        wbsLevel: t.wbsLevel,
        type: t.type,
        name: t.name,
        startDate: format(t.startDate, 'yyyy-MM-dd'),
        endDate: format(t.endDate, 'yyyy-MM-dd'),
        ...(t.cp ? { cp: t.cp } : {}),
        ...(t.task ? { task: t.task } : {}),
        dependencies: t.dependencies,
    }));
};

/**
 * Milestones를 외부 내보내기 형식으로 직렬화
 */
export const serializeMilestonesForExport = (milestones: Milestone[]) => {
    return milestones.map(m => ({
        id: m.id,
        date: format(m.date, 'yyyy-MM-dd'),
        name: m.name,
        type: 'MILESTONE',
        ...(m.milestoneType ? { milestoneType: m.milestoneType } : {}),
        ...(m.description ? { description: m.description } : {}),
    }));
};

/**
 * GroupDependencies를 외부 내보내기 형식으로 직렬화
 */
export const serializeGroupDependenciesForExport = (deps: GroupDependency[]) => {
    return deps.map(d => ({
        id: d.id,
        sourceGroupId: d.sourceGroupId,
        targetGroupId: d.targetGroupId,
        type: d.type,
        ...(d.lag !== undefined && d.lag !== 0 ? { lag: d.lag } : {}),
    }));
};

/**
 * 전체 데이터를 내보내기 형식으로 직렬화
 */
export const serializeGanttDataForExport = (data: GanttData): string => {
    const exportData = {
        milestones: serializeMilestonesForExport(data.milestones),
        tasks: serializeTasksForExport(data.tasks),
        groupDependencies: serializeGroupDependenciesForExport(data.dependencies),
    };
    return JSON.stringify(exportData, null, 4);
};

// ============================================
// 가져오기 (Import) 파싱
// ============================================

/**
 * 외부 JSON 데이터 파싱 (mock.json 또는 내보내기 파일)
 * 자동으로 Legacy GROUP → BLOCK 마이그레이션 적용
 */
export const parseImportedData = (jsonString: string): GanttData | null => {
    try {
        const importedData = JSON.parse(jsonString);

        // Tasks 파싱 (필수)
        if (!importedData.tasks || !Array.isArray(importedData.tasks)) {
            throw new Error('유효하지 않은 파일 형식입니다. tasks 배열이 필요합니다.');
        }

        const parsedTasks: ConstructionTask[] = importedData.tasks
            .filter(isValidTaskData)
            .map((t: Record<string, unknown>) => ({
                ...t,
                wbsLevel: t.wbsLevel as 1 | 2,
                type: t.type as 'BLOCK' | 'GROUP' | 'CP' | 'TASK',
                startDate: parseLocalDate(t.startDate as string),
                endDate: parseLocalDate(t.endDate as string),
                dependencies: (t.dependencies as Array<Record<string, unknown>>)?.map(d => ({
                    ...d,
                    type: d.type as DependencyType,
                    sourceAnchor: d.sourceAnchor as AnchorPoint | undefined,
                    targetAnchor: d.targetAnchor as AnchorPoint | undefined,
                })) || [],
            }));

        // 자동 마이그레이션 적용 (Legacy GROUP → BLOCK)
        const tasks = migrateTaskTypes(parsedTasks);

        // Milestones 파싱 (선택적)
        const milestones: Milestone[] = (importedData.milestones || [])
            .filter(isValidMilestoneData)
            .map((m: Record<string, unknown>) => ({
                ...m,
                date: parseLocalDate(m.date as string),
            }));

        // GroupDependencies 파싱 (선택적)
        const dependencies: GroupDependency[] =
            Array.isArray(importedData.groupDependencies)
                ? importedData.groupDependencies.filter(isValidGroupDependencyData)
                : [];

        if (tasks.length === 0) {
            throw new Error('가져올 수 있는 태스크가 없습니다.');
        }

        return { tasks, milestones, dependencies };
    } catch (error) {
        console.error('Failed to parse imported data:', error);
        return null;
    }
};

/**
 * Mock 데이터 파싱 유틸리티
 * (App에서 사용하는 mock.json 파싱 로직)
 * 자동으로 Legacy GROUP → BLOCK 마이그레이션 적용
 */
export const parseMockTasks = (mockTasks: Array<Record<string, unknown>>): ConstructionTask[] => {
    const tasks = mockTasks
        .filter(isValidTaskData)
        .map(t => ({
            ...t,
            wbsLevel: t.wbsLevel as 1 | 2,
            type: t.type as 'BLOCK' | 'GROUP' | 'CP' | 'TASK',
            startDate: parseLocalDate(t.startDate as string),
            endDate: parseLocalDate(t.endDate as string),
            cp: t.cp ? { ...(t.cp as object) } : undefined,
            task: t.task ? { ...(t.task as object) } : undefined,
            dependencies: (t.dependencies as Dependency[]) || [],
        })) as ConstructionTask[];

    // 자동 마이그레이션 적용 (Legacy GROUP → BLOCK)
    return migrateTaskTypes(tasks);
};

export const parseMockMilestones = (mockMilestones: Array<Record<string, unknown>>): Milestone[] => {
    return mockMilestones
        .filter(isValidMilestoneData)
        .map(m => ({
            ...m,
            date: parseLocalDate(m.date as string),
            milestoneType: (m as { milestoneType?: string }).milestoneType as 'MASTER' | 'DETAIL' | undefined,
        })) as Milestone[];
};
