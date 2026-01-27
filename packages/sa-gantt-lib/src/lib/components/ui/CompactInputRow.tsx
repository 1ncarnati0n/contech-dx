'use client';

import React from 'react';
import { cn } from '../../utils/cn';

// 공통 스타일 상수
const INPUT_BASE = "w-full rounded-md border px-3 py-2 text-sm";
const FOCUS_BLUE = "focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20";
const FOCUS_RED = "focus:border-red-500 focus:outline-none focus:ring-2 focus:ring-red-500/20";

const inputStyle: React.CSSProperties = {
    backgroundColor: 'var(--gantt-bg-primary)',
    borderColor: 'var(--gantt-border)',
    color: 'var(--gantt-text-secondary)',
};

/**
 * CompactInputRow Props
 */
export interface CompactInputRowProps {
    /** 라벨 텍스트 (예: "앞 간접", "순작업") */
    label: string;
    /** 일수 값 (문자열) */
    daysValue: string;
    /** 작업명 값 (선택) */
    nameValue?: string;
    /** 일수 값 변경 setter */
    onDaysChange: React.Dispatch<React.SetStateAction<string>>;
    /** 작업명 값 변경 콜백 */
    onNameChange?: (value: string) => void;
    /** 키보드 이벤트 핸들러 */
    onKeyDown: (e: React.KeyboardEvent) => void;
    /** 숫자 입력 변환 핸들러 */
    onNumberChange: (setter: React.Dispatch<React.SetStateAction<string>>, value: string) => void;
    /** 일수 입력 ref */
    daysInputRef?: React.RefObject<HTMLInputElement | null>;
    /** 색상 테마 */
    color?: 'blue' | 'red';
    /** 작업명 입력 표시 여부 */
    showNameInput?: boolean;
}

/**
 * 일수 입력 행 컴포넌트
 * 
 * 간접작업일/순작업일 입력을 위한 컴팩트한 행 컴포넌트입니다.
 * 
 * @example
 * ```tsx
 * <CompactInputRow
 *   label="앞 간접"
 *   daysValue={indirectWorkDaysPreStr}
 *   nameValue={indirectWorkNamePre}
 *   onDaysChange={setIndirectWorkDaysPreStr}
 *   onNameChange={setIndirectWorkNamePre}
 *   onKeyDown={handleKeyDown}
 *   onNumberChange={handleNumberChange}
 *   color="blue"
 * />
 * ```
 */
export const CompactInputRow: React.FC<CompactInputRowProps> = ({
    label,
    daysValue,
    nameValue = '',
    onDaysChange,
    onNameChange,
    onKeyDown,
    onNumberChange,
    daysInputRef,
    color = 'blue',
    showNameInput = true,
}) => {
    const focusClass = color === 'red' ? FOCUS_RED : FOCUS_BLUE;
    const labelColorClass = color === 'red'
        ? 'bg-red-50 text-red-700 dark:bg-red-900/30 dark:text-red-400'
        : 'bg-blue-50 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400';

    return (
        <div className="flex items-center gap-3">
            <span className={cn(
                'w-20 shrink-0 rounded-md px-2 py-1.5 text-xs font-semibold text-center',
                labelColorClass
            )}>
                {label}
            </span>
            <div className="flex flex-1 items-center gap-2">
                <div className="relative">
                    <input
                        ref={daysInputRef}
                        type="text"
                        inputMode="decimal"
                        value={daysValue}
                        onChange={(e) => onNumberChange(onDaysChange, e.target.value)}
                        onKeyDown={onKeyDown}
                        placeholder="0"
                        className={cn(INPUT_BASE, focusClass, 'w-20 text-center pr-6')}
                        style={inputStyle}
                    />
                    <span
                        className="absolute right-2 top-1/2 -translate-y-1/2 text-xs"
                        style={{ color: 'var(--gantt-text-muted)' }}
                    >
                        일
                    </span>
                </div>
                {showNameInput && onNameChange && (
                    <input
                        type="text"
                        value={nameValue}
                        onChange={(e) => onNameChange(e.target.value)}
                        onKeyDown={onKeyDown}
                        placeholder="작업명 (선택사항)"
                        className={cn('flex-1', INPUT_BASE, focusClass)}
                        style={inputStyle}
                    />
                )}
            </div>
        </div>
    );
};

CompactInputRow.displayName = 'CompactInputRow';
