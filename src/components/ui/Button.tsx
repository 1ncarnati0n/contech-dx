import React from 'react';
import { Loader2 } from 'lucide-react';

export interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'accent' | 'outline' | 'ghost' | 'danger';
  size?: 'sm' | 'md' | 'lg';
  loading?: boolean;
  icon?: React.ReactNode;
  iconPosition?: 'left' | 'right';
}

export const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  (
    {
      children,
      variant = 'primary',
      size = 'md',
      loading = false,
      icon,
      iconPosition = 'left',
      className = '',
      disabled,
      ...props
    },
    ref
  ) => {
    const baseStyles = `
      inline-flex items-center justify-center gap-2
      font-medium rounded-lg
      transition-all duration-200
      focus:outline-none focus:ring-2 focus:ring-offset-2
      disabled:opacity-50 disabled:cursor-not-allowed
      active:scale-[0.98]
    `;

    const variants = {
      primary: `
        bg-slate-700 text-white
        hover:bg-slate-800 hover:shadow-md
        focus:ring-slate-500
      `,
      secondary: `
        bg-cyan-600 text-white
        hover:bg-cyan-700 hover:shadow-md
        focus:ring-cyan-500
      `,
      accent: `
        bg-orange-600 text-white
        hover:bg-orange-700 hover:shadow-md
        focus:ring-orange-500
      `,
      outline: `
        bg-white text-slate-700 border-2 border-slate-300
        hover:bg-slate-50 hover:border-slate-400
        focus:ring-slate-500
      `,
      ghost: `
        bg-transparent text-slate-700
        hover:bg-slate-100
        focus:ring-slate-500
      `,
      danger: `
        bg-red-600 text-white
        hover:bg-red-700 hover:shadow-md
        focus:ring-red-500
      `,
    };

    const sizes = {
      sm: 'px-3 py-1.5 text-sm',
      md: 'px-4 py-2 text-base',
      lg: 'px-6 py-3 text-lg',
    };

    return (
      <button
        ref={ref}
        className={`${baseStyles} ${variants[variant]} ${sizes[size]} ${className}`}
        disabled={disabled || loading}
        {...props}
      >
        {loading && <Loader2 className="w-4 h-4 animate-spin" />}
        {!loading && icon && iconPosition === 'left' && icon}
        {children}
        {!loading && icon && iconPosition === 'right' && icon}
      </button>
    );
  }
);

Button.displayName = 'Button';
