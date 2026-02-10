// ============================================
// Form 공통 타입 정의
// ============================================

import type { ConstructionTask } from '../../types';

/** 폼 타입 */
export type FormType = 'CP' | 'TASK';

/** 뷰 모드 */
export type FormViewMode = 'MASTER' | 'DETAIL' | 'UNIFIED';

/** 필드 타입 */
export type FieldType = 'text' | 'number' | 'date' | 'display';

/** 필드 설정 */
export interface FormFieldConfig {
    id: string;
    label: string;
    type: FieldType;
    placeholder?: string;
    title?: string;
    /** number 필드의 기본값 */
    defaultValue?: number | string;
    /** 숫자 입력 시 최소값 */
    min?: number;
    /** 특별한 스타일링 클래스 (예: vermilion, teal 색상) */
    colorClass?: string;
    /** 컬럼 인덱스 (어느 컬럼에 렌더링할지) */
    columnIndex: number;
    /** 읽기 전용 (자동 계산 필드) */
    readOnly?: boolean;
    /** 필드 값을 폼 상태에서 가져올 때 사용하는 키 */
    stateKey: string;
}

/** BaseTaskForm Props */
export interface BaseTaskFormProps {
    columns: Array<{ id: string; label: string; width: number; minWidth: number }>;
    tasks: ConstructionTask[];
    allTasks?: ConstructionTask[];
    selectedTaskIds?: Set<string>;
    focusedTaskId?: string | null;
    activeCPId?: string | null;
    onTaskCreate?: (task: Partial<ConstructionTask>) => void | Promise<void>;
    onCancel: () => void;
    isVirtualized?: boolean;
    virtualRowIndex?: number;
    dragHandleWidth?: number;
}

/** 폼 상태 (제네릭) */
export type FormState = Record<string, string | number>;

/** 폼 설정 */
export interface FormConfig {
    formType: FormType;
    viewMode: FormViewMode;
    fields: FormFieldConfig[];
    /** 초기 폼 상태 생성 */
    getInitialState: (tasks: ConstructionTask[], activeCPId?: string | null) => FormState;
    /** 폼 상태에서 Task 객체 생성 */
    createTask: (
        formState: FormState,
        tasks: ConstructionTask[],
        activeCPId?: string | null
    ) => Partial<ConstructionTask> | null;
    /** 테마 색상 (border, background) */
    theme: {
        borderColor: string;
        bgColor: string;
        accentColor: string;
    };
    /** Name Input 앞에 표시될 배지 (CP 등) */
    badge?: {
        text: string;
        bgColor: string;
    };
    /** Name 입력 placeholder */
    namePlaceholder: string;
}
