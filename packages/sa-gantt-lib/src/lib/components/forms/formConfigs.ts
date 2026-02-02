// ============================================
// Form 설정 정의
// ============================================

import { addDays, format } from 'date-fns';
import { generateId } from '../../utils/uuid';
import type { FormConfig } from './types';

// ============================================
// CP Form - Master View
// ============================================
export const cpMasterFormConfig: FormConfig = {
    formType: 'CP',
    viewMode: 'MASTER',
    fields: [
        {
            id: 'name',
            label: '작업명',
            type: 'text',
            placeholder: 'CP명...',
            columnIndex: 0,
            stateKey: 'name',
        },
        {
            id: 'totalDays',
            label: '총 공기',
            type: 'display',
            columnIndex: 1,
            stateKey: 'totalDays',
            readOnly: true,
        },
        {
            id: 'workDaysTotal',
            label: '작업일수',
            type: 'number',
            defaultValue: 30,
            columnIndex: 2,
            stateKey: 'workDaysTotal',
            colorClass: 'text-vermilion focus:border-vermilion focus:ring-vermilion',
            title: '작업일수',
        },
        {
            id: 'nonWorkDaysTotal',
            label: '비작업일수',
            type: 'number',
            defaultValue: 10,
            columnIndex: 3,
            stateKey: 'nonWorkDaysTotal',
            colorClass: 'text-teal focus:border-teal focus:ring-teal',
            title: '비작업일수',
        },
    ],
    getInitialState: () => ({
        name: '',
        workDaysTotal: 30,
        nonWorkDaysTotal: 10,
    }),
    createTask: (formState, tasks) => {
        const cpTasks = tasks.filter(t => t.type === 'CP' && !t.parentId);
        const lastCP = cpTasks[cpTasks.length - 1];
        const startDate = lastCP ? addDays(lastCP.endDate, 1) : new Date();
        const totalDays = (formState.workDaysTotal as number) + (formState.nonWorkDaysTotal as number);
        const endDate = addDays(startDate, Math.max(totalDays - 1, 0));

        return {
            id: generateId(),
            parentId: null,
            wbsLevel: 1,
            type: 'CP',
            name: (formState.name as string).trim(),
            startDate,
            endDate,
            cp: {
                workDaysTotal: formState.workDaysTotal as number,
                nonWorkDaysTotal: formState.nonWorkDaysTotal as number,
            },
            dependencies: [],
        };
    },
    theme: {
        borderColor: 'border-blue-300',
        bgColor: 'bg-blue-50',
        accentColor: 'blue',
    },
    namePlaceholder: 'CP명...',
};

// ============================================
// CP Form - Unified View
// ============================================
export const cpUnifiedFormConfig: FormConfig = {
    formType: 'CP',
    viewMode: 'UNIFIED',
    fields: [
        {
            id: 'name',
            label: '작업명',
            type: 'text',
            placeholder: 'CP명...',
            columnIndex: 0,
            stateKey: 'name',
        },
        {
            id: 'duration',
            label: '기간',
            type: 'number',
            defaultValue: 30,
            columnIndex: 1,
            stateKey: 'duration',
            title: '기간 (일)',
        },
        {
            id: 'startDate',
            label: '시작일',
            type: 'date',
            columnIndex: 2,
            stateKey: 'startDate',
            title: '시작일',
        },
        {
            id: 'endDate',
            label: '종료일',
            type: 'display',
            columnIndex: 3,
            stateKey: 'endDate',
            readOnly: true,
        },
    ],
    getInitialState: (tasks) => {
        const cpTasks = tasks.filter(t => t.type === 'CP' && !t.parentId);
        const lastCP = cpTasks[cpTasks.length - 1];
        const startDate = lastCP ? addDays(lastCP.endDate, 1) : new Date();

        return {
            name: '',
            duration: 30,
            startDate: format(startDate, 'yyyy-MM-dd'),
        };
    },
    createTask: (formState) => {
        const startDate = new Date(formState.startDate as string);
        const duration = formState.duration as number;
        const calculatedEndDate = addDays(startDate, Math.max(duration - 1, 0));

        // CP의 작업일/비작업일 기본 비율 (약 3:1)
        const workDays = Math.ceil(duration * 0.75);
        const nonWorkDays = duration - workDays;

        return {
            id: generateId(),
            parentId: null,
            wbsLevel: 1,
            type: 'CP',
            name: (formState.name as string).trim(),
            startDate,
            endDate: calculatedEndDate,
            cp: {
                workDaysTotal: workDays,
                nonWorkDaysTotal: nonWorkDays,
            },
            dependencies: [],
        };
    },
    theme: {
        borderColor: 'border-vermilion/50',
        bgColor: 'bg-vermilion/10',
        accentColor: 'vermilion',
    },
    badge: {
        text: 'CP',
        bgColor: 'bg-vermilion',
    },
    namePlaceholder: 'CP명...',
};

// ============================================
// Task Form - Detail View
// ============================================
export const taskDetailFormConfig: FormConfig = {
    formType: 'TASK',
    viewMode: 'DETAIL',
    fields: [
        {
            id: 'name',
            label: '작업명',
            type: 'text',
            placeholder: '공정명...',
            columnIndex: 0,
            stateKey: 'name',
        },
        {
            id: 'indirectWorkDaysPre',
            label: '선간접',
            type: 'number',
            defaultValue: 0,
            columnIndex: 1,
            stateKey: 'indirectWorkDaysPre',
            title: '선 간접작업일',
        },
        {
            id: 'netWorkDays',
            label: '순작업',
            type: 'number',
            defaultValue: 1,
            columnIndex: 2,
            stateKey: 'netWorkDays',
            title: '순작업일',
        },
        {
            id: 'indirectWorkDaysPost',
            label: '후간접',
            type: 'number',
            defaultValue: 0,
            columnIndex: 3,
            stateKey: 'indirectWorkDaysPost',
            title: '후 간접작업일',
        },
    ],
    getInitialState: () => ({
        name: '',
        indirectWorkDaysPre: 0,
        netWorkDays: 1,
        indirectWorkDaysPost: 0,
    }),
    createTask: (formState, tasksArg, activeCPId) => {
        if (!activeCPId) return null;

        const lastTask = tasksArg[tasksArg.length - 1];
        const startDate = lastTask ? addDays(lastTask.endDate, 1) : new Date();
        const totalDays = (formState.indirectWorkDaysPre as number) +
            (formState.netWorkDays as number) +
            (formState.indirectWorkDaysPost as number);
        const endDate = addDays(startDate, Math.max(totalDays - 1, 0));

        return {
            id: generateId(),
            parentId: activeCPId,
            wbsLevel: 2,
            type: 'TASK',
            name: (formState.name as string).trim(),
            startDate,
            endDate,
            task: {
                netWorkDays: formState.netWorkDays as number,
                indirectWorkDaysPre: formState.indirectWorkDaysPre as number,
                indirectWorkDaysPost: formState.indirectWorkDaysPost as number,
            },
            dependencies: [],
        };
    },
    theme: {
        borderColor: 'border-blue-300',
        bgColor: 'bg-blue-50',
        accentColor: 'blue',
    },
    namePlaceholder: '공정명...',
};

// ============================================
// Task Form - Unified View
// ============================================
export const taskUnifiedFormConfig: FormConfig = {
    formType: 'TASK',
    viewMode: 'UNIFIED',
    fields: [
        {
            id: 'name',
            label: '작업명',
            type: 'text',
            placeholder: '공정명...',
            columnIndex: 0,
            stateKey: 'name',
        },
        {
            id: 'duration',
            label: '기간',
            type: 'number',
            defaultValue: 1,
            columnIndex: 1,
            stateKey: 'duration',
            title: '기간 (일)',
        },
        {
            id: 'startDate',
            label: '시작일',
            type: 'date',
            columnIndex: 2,
            stateKey: 'startDate',
            title: '시작일',
        },
        {
            id: 'endDate',
            label: '종료일',
            type: 'display',
            columnIndex: 3,
            stateKey: 'endDate',
            readOnly: true,
        },
    ],
    getInitialState: (tasks, activeCPId) => {
        const activeCP = tasks.find(t => t.id === activeCPId);
        const tasksUnderCP = tasks.filter(t => t.parentId === activeCPId && t.type === 'TASK');
        const lastTask = tasksUnderCP[tasksUnderCP.length - 1];
        const startDate = lastTask
            ? addDays(lastTask.endDate, 1)
            : activeCP
                ? activeCP.startDate
                : new Date();

        return {
            name: '',
            duration: 1,
            startDate: format(startDate, 'yyyy-MM-dd'),
        };
    },
    createTask: (formState, _tasks, activeCPId) => {
        if (!activeCPId) return null;

        const startDate = new Date(formState.startDate as string);
        const duration = formState.duration as number;
        const calculatedEndDate = addDays(startDate, Math.max(duration - 1, 0));

        return {
            id: generateId(),
            parentId: activeCPId,
            wbsLevel: 2,
            type: 'TASK',
            name: (formState.name as string).trim(),
            startDate,
            endDate: calculatedEndDate,
            task: {
                netWorkDays: duration,
                indirectWorkDaysPre: 0,
                indirectWorkDaysPost: 0,
            },
            dependencies: [],
        };
    },
    theme: {
        borderColor: 'border-blue-300',
        bgColor: 'bg-blue-50',
        accentColor: 'blue',
    },
    namePlaceholder: '공정명...',
};

// ============================================
// Form Config 선택 헬퍼
// ============================================
export const getFormConfig = (
    formType: 'CP' | 'TASK',
    viewMode: 'MASTER' | 'DETAIL' | 'UNIFIED'
): FormConfig => {
    if (formType === 'CP') {
        return viewMode === 'UNIFIED' ? cpUnifiedFormConfig : cpMasterFormConfig;
    }
    return viewMode === 'UNIFIED' ? taskUnifiedFormConfig : taskDetailFormConfig;
};
