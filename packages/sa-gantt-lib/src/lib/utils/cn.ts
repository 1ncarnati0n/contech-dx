/**
 * cn - Tailwind CSS 클래스 병합 유틸리티
 *
 * clsx로 조건부 클래스를 결합하고, tailwind-merge로 충돌하는 클래스를 해결합니다.
 *
 * @example
 * ```tsx
 * import { cn } from '../utils/cn';
 *
 * // 기본 사용
 * <div className={cn('px-4 py-2', 'bg-blue-500')} />
 *
 * // 조건부 클래스
 * <div className={cn('base-class', isActive && 'active-class', disabled && 'opacity-50')} />
 *
 * // 클래스 충돌 해결 (뒤의 값이 우선)
 * cn('px-2 py-1', 'px-4') // => 'py-1 px-4'
 * ```
 */
import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

export function cn(...inputs: ClassValue[]) {
    return twMerge(clsx(inputs));
}
