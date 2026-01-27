'use client';

import React, { createContext, useContext, useEffect, useState, useCallback } from 'react';

// ============================================
// Types
// ============================================

export type Theme = 'light' | 'dark' | 'system';
export type ResolvedTheme = 'light' | 'dark';

interface ThemeContextValue {
    /** 현재 설정된 테마 (light, dark, system) */
    theme: Theme;
    /** 실제 적용된 테마 (light, dark) */
    resolvedTheme: ResolvedTheme;
    /** 테마 변경 함수 */
    setTheme: (theme: Theme) => void;
    /** 다크 모드 여부 */
    isDark: boolean;
}

interface ThemeProviderProps {
    children: React.ReactNode;
    /** 기본 테마 (기본값: 'system') */
    defaultTheme?: Theme;
    /** localStorage 저장 키 (기본값: 'gantt-theme') */
    storageKey?: string;
}

// ============================================
// Context
// ============================================

const ThemeContext = createContext<ThemeContextValue | undefined>(undefined);

// ============================================
// Helper Functions
// ============================================

const STORAGE_KEY_DEFAULT = 'gantt-theme';

/**
 * 시스템 다크 모드 설정 확인
 */
const getSystemTheme = (): ResolvedTheme => {
    if (typeof window === 'undefined') return 'light';
    return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
};

/**
 * 테마를 실제 적용 (HTML 클래스 변경)
 */
const applyTheme = (theme: Theme, resolvedTheme: ResolvedTheme) => {
    if (typeof document === 'undefined') return;

    const root = document.documentElement;

    // 기존 테마 클래스 제거
    root.classList.remove('light', 'dark');

    // system 모드일 때는 클래스를 추가하지 않음 (CSS의 prefers-color-scheme이 적용됨)
    if (theme !== 'system') {
        root.classList.add(theme);
    }

    // 색상 스킴 메타 태그 업데이트 (브라우저 UI 색상)
    const metaColorScheme = document.querySelector('meta[name="color-scheme"]');
    if (metaColorScheme) {
        metaColorScheme.setAttribute('content', resolvedTheme);
    }
};

// ============================================
// Provider Component
// ============================================

export const ThemeProvider: React.FC<ThemeProviderProps> = ({
    children,
    defaultTheme = 'system',
    storageKey = STORAGE_KEY_DEFAULT,
}) => {
    const [theme, setThemeState] = useState<Theme>(defaultTheme);
    const [resolvedTheme, setResolvedTheme] = useState<ResolvedTheme>('light');
    const [mounted, setMounted] = useState(false);

    // 초기화: localStorage에서 테마 로드
    useEffect(() => {
        const stored = localStorage.getItem(storageKey) as Theme | null;
        const initialTheme = stored || defaultTheme;
        setThemeState(initialTheme);

        const resolved = initialTheme === 'system' ? getSystemTheme() : initialTheme;
        setResolvedTheme(resolved);
        applyTheme(initialTheme, resolved);

        setMounted(true);
    }, [defaultTheme, storageKey]);

    // 시스템 테마 변경 감지
    useEffect(() => {
        if (typeof window === 'undefined') return;

        const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');

        const handleChange = (e: MediaQueryListEvent) => {
            if (theme === 'system') {
                const newResolved = e.matches ? 'dark' : 'light';
                setResolvedTheme(newResolved);
                applyTheme('system', newResolved);
            }
        };

        mediaQuery.addEventListener('change', handleChange);
        return () => mediaQuery.removeEventListener('change', handleChange);
    }, [theme]);

    // 테마 변경 함수
    const setTheme = useCallback((newTheme: Theme) => {
        setThemeState(newTheme);
        localStorage.setItem(storageKey, newTheme);

        const resolved = newTheme === 'system' ? getSystemTheme() : newTheme;
        setResolvedTheme(resolved);
        applyTheme(newTheme, resolved);
    }, [storageKey]);

    // SSR 하이드레이션 불일치 방지
    if (!mounted) {
        return (
            <ThemeContext.Provider
                value={{
                    theme: defaultTheme,
                    resolvedTheme: 'light',
                    setTheme: () => {},
                    isDark: false,
                }}
            >
                {children}
            </ThemeContext.Provider>
        );
    }

    return (
        <ThemeContext.Provider
            value={{
                theme,
                resolvedTheme,
                setTheme,
                isDark: resolvedTheme === 'dark',
            }}
        >
            {children}
        </ThemeContext.Provider>
    );
};

// ============================================
// Hook
// ============================================

/**
 * 테마 컨텍스트 사용 훅
 * @example
 * const { theme, setTheme, isDark } = useTheme();
 */
export const useTheme = (): ThemeContextValue => {
    const context = useContext(ThemeContext);

    if (context === undefined) {
        throw new Error('useTheme must be used within a ThemeProvider');
    }

    return context;
};

/**
 * ThemeProvider 없이도 안전하게 사용할 수 있는 훅
 * Provider가 없으면 기본값 반환
 */
export const useThemeSafe = (): ThemeContextValue => {
    const context = useContext(ThemeContext);

    if (context === undefined) {
        return {
            theme: 'system',
            resolvedTheme: 'light',
            setTheme: () => {},
            isDark: false,
        };
    }

    return context;
};
