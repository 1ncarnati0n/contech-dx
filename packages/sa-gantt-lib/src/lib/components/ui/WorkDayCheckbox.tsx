'use client';

import React, { useState } from 'react';
import { cn } from '../../utils/cn';

/**
 * WorkDayCheckbox Props
 */
export interface WorkDayCheckboxProps {
    /** 라벨 텍스트 */
    label: string;
    /** 체크 상태 */
    checked: boolean;
    /** 체크 상태 변경 콜백 */
    onChange: (checked: boolean) => void;
    /** 비활성화 상태 */
    disabled?: boolean;
}

/**
 * 작업일 체크박스 컴포넌트
 * 
 * 토요일 휴무, 일요일 작업 등의 작업일 설정에 사용됩니다.
 * 
 * @example
 * ```tsx
 * <WorkDayCheckbox
 *   label="토요일 휴무"
 *   checked={saturdayOff}
 *   onChange={setSaturdayOff}
 * />
 * ```
 */
export const WorkDayCheckbox: React.FC<WorkDayCheckboxProps> = ({
    label,
    checked,
    onChange,
    disabled = false,
}) => {
    const [isHovered, setIsHovered] = useState(false);

    return (
        <label
            className={cn(
                'flex cursor-pointer items-center gap-2 rounded-md px-3 py-2 text-sm transition-colors',
                disabled && 'opacity-50 cursor-not-allowed'
            )}
            style={{
                color: 'var(--gantt-text-secondary)',
                backgroundColor: isHovered && !disabled ? 'var(--gantt-bg-hover)' : 'transparent',
            }}
            onMouseEnter={() => setIsHovered(true)}
            onMouseLeave={() => setIsHovered(false)}
        >
            <input
                type="checkbox"
                checked={checked}
                onChange={(e) => !disabled && onChange(e.target.checked)}
                disabled={disabled}
                className="h-4 w-4 rounded text-blue-600 focus:ring-blue-500"
                style={{ borderColor: 'var(--gantt-border)' }}
            />
            <span className="font-medium">{label}</span>
        </label>
    );
};

WorkDayCheckbox.displayName = 'WorkDayCheckbox';
