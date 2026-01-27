'use client';

import React from 'react';
import { useTheme, type Theme } from '../context/ThemeContext';

// ============================================
// Icons (인라인 SVG)
// ============================================

const SunIcon: React.FC<{ className?: string }> = ({ className }) => (
    <svg
        className={className}
        width="16"
        height="16"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
    >
        <circle cx="12" cy="12" r="5" />
        <line x1="12" y1="1" x2="12" y2="3" />
        <line x1="12" y1="21" x2="12" y2="23" />
        <line x1="4.22" y1="4.22" x2="5.64" y2="5.64" />
        <line x1="18.36" y1="18.36" x2="19.78" y2="19.78" />
        <line x1="1" y1="12" x2="3" y2="12" />
        <line x1="21" y1="12" x2="23" y2="12" />
        <line x1="4.22" y1="19.78" x2="5.64" y2="18.36" />
        <line x1="18.36" y1="5.64" x2="19.78" y2="4.22" />
    </svg>
);

const MoonIcon: React.FC<{ className?: string }> = ({ className }) => (
    <svg
        className={className}
        width="16"
        height="16"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
    >
        <path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z" />
    </svg>
);

const MonitorIcon: React.FC<{ className?: string }> = ({ className }) => (
    <svg
        className={className}
        width="16"
        height="16"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
    >
        <rect x="2" y="3" width="20" height="14" rx="2" ry="2" />
        <line x1="8" y1="21" x2="16" y2="21" />
        <line x1="12" y1="17" x2="12" y2="21" />
    </svg>
);

// ============================================
// ThemeToggle Component
// ============================================

interface ThemeToggleProps {
    /** 추가 CSS 클래스 */
    className?: string;
    /** 버튼 크기 */
    size?: 'sm' | 'md' | 'lg';
    /** 라벨 표시 여부 */
    showLabel?: boolean;
}

/**
 * 테마 토글 버튼 컴포넌트
 * 라이트 → 다크 → 시스템 순으로 순환
 */
export const ThemeToggle: React.FC<ThemeToggleProps> = ({
    className = '',
    size = 'md',
    showLabel = false,
}) => {
    const { theme, setTheme, resolvedTheme } = useTheme();

    const sizeClasses = {
        sm: 'p-1.5 text-xs',
        md: 'p-2 text-sm',
        lg: 'p-2.5 text-base',
    };

    const iconSizes = {
        sm: 'w-3.5 h-3.5',
        md: 'w-4 h-4',
        lg: 'w-5 h-5',
    };

    const labels: Record<Theme, string> = {
        light: '라이트',
        dark: '다크',
        system: '시스템',
    };

    const nextTheme: Record<Theme, Theme> = {
        light: 'dark',
        dark: 'system',
        system: 'light',
    };

    const handleClick = () => {
        setTheme(nextTheme[theme]);
    };

    const getIcon = () => {
        if (theme === 'system') {
            return <MonitorIcon className={iconSizes[size]} />;
        }
        return resolvedTheme === 'dark'
            ? <MoonIcon className={iconSizes[size]} />
            : <SunIcon className={iconSizes[size]} />;
    };

    return (
        <button
            type="button"
            onClick={handleClick}
            className={`
                inline-flex items-center gap-1.5 rounded-md border
                transition-colors duration-200
                bg-[var(--gantt-bg-primary)]
                border-[var(--gantt-border)]
                text-[var(--gantt-text-secondary)]
                hover:bg-[var(--gantt-bg-hover)]
                hover:text-[var(--gantt-text-primary)]
                focus:outline-none focus:ring-2 focus:ring-[var(--gantt-focus)] focus:ring-offset-1
                ${sizeClasses[size]}
                ${className}
            `}
            title={`현재: ${labels[theme]} 모드 (클릭하여 ${labels[nextTheme[theme]]} 모드로 전환)`}
            aria-label={`테마 전환: ${labels[theme]}`}
        >
            {getIcon()}
            {showLabel && (
                <span className="font-medium">{labels[theme]}</span>
            )}
        </button>
    );
};

// ============================================
// ThemeToggleGroup Component (선택적)
// ============================================

interface ThemeToggleGroupProps {
    /** 추가 CSS 클래스 */
    className?: string;
}

/**
 * 테마 선택 버튼 그룹
 * 라이트/다크/시스템 3개 버튼으로 직접 선택
 */
export const ThemeToggleGroup: React.FC<ThemeToggleGroupProps> = ({
    className = '',
}) => {
    const { theme, setTheme } = useTheme();

    const themes: { value: Theme; icon: React.ReactNode; label: string }[] = [
        { value: 'light', icon: <SunIcon className="w-4 h-4" />, label: '라이트' },
        { value: 'dark', icon: <MoonIcon className="w-4 h-4" />, label: '다크' },
        { value: 'system', icon: <MonitorIcon className="w-4 h-4" />, label: '시스템' },
    ];

    return (
        <div
            className={`
                inline-flex rounded-lg border p-1
                bg-[var(--gantt-bg-secondary)]
                border-[var(--gantt-border)]
                ${className}
            `}
            role="radiogroup"
            aria-label="테마 선택"
        >
            {themes.map(({ value, icon, label }) => (
                <button
                    key={value}
                    type="button"
                    role="radio"
                    aria-checked={theme === value}
                    onClick={() => setTheme(value)}
                    className={`
                        inline-flex items-center gap-1.5 px-3 py-1.5 rounded-md
                        text-sm font-medium transition-colors duration-200
                        focus:outline-none focus:ring-2 focus:ring-[var(--gantt-focus)]
                        ${theme === value
                            ? 'bg-[var(--gantt-bg-primary)] text-[var(--gantt-text-primary)] shadow-sm'
                            : 'text-[var(--gantt-text-muted)] hover:text-[var(--gantt-text-secondary)]'
                        }
                    `}
                    title={`${label} 모드`}
                >
                    {icon}
                    <span>{label}</span>
                </button>
            ))}
        </div>
    );
};

export default ThemeToggle;
