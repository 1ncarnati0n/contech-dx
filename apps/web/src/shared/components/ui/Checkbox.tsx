'use client';

import * as React from 'react';

export interface CheckboxProps extends React.InputHTMLAttributes<HTMLInputElement> {
  onCheckedChange?: (checked: boolean) => void;
}

/**
 * Checkbox 컴포넌트
 *
 * shadcn/ui 스타일의 체크박스 컴포넌트
 */
export const Checkbox = React.forwardRef<HTMLInputElement, CheckboxProps>(
  ({ className, onCheckedChange, checked, ...props }, ref) => {
    const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
      onCheckedChange?.(e.target.checked);
      props.onChange?.(e);
    };

    return (
      <input
        type="checkbox"
        ref={ref}
        checked={checked}
        onChange={handleChange}
        className={`
          w-4 h-4 rounded border border-gray-300 text-blue-600
          focus:ring-2 focus:ring-blue-500 focus:ring-offset-2
          cursor-pointer
          ${className || ''}
        `}
        {...props}
      />
    );
  }
);

Checkbox.displayName = 'Checkbox';
