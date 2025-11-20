import React from 'react';
import { Loader2 } from 'lucide-react';

export interface SpinnerProps {
  /** 스피너 크기 */
  size?: 'sm' | 'md' | 'lg' | 'xl';
  /** 색상 variant */
  variant?: 'primary' | 'secondary' | 'accent' | 'white';
  /** 로딩 텍스트 */
  text?: string;
  /** 전체 화면 오버레이로 표시 */
  fullScreen?: boolean;
  /** 추가 CSS 클래스 */
  className?: string;
}

export const Spinner: React.FC<SpinnerProps> = ({
  size = 'md',
  variant = 'primary',
  text,
  fullScreen = false,
  className = '',
}) => {
  const sizes = {
    sm: 'w-4 h-4',
    md: 'w-6 h-6',
    lg: 'w-8 h-8',
    xl: 'w-12 h-12',
  };

  const variants = {
    primary: 'text-slate-700',
    secondary: 'text-cyan-600',
    accent: 'text-orange-600',
    white: 'text-white',
  };

  const spinnerElement = (
    <div className={`flex flex-col items-center justify-center gap-3 ${className}`}>
      <Loader2
        className={`${sizes[size]} ${variants[variant]} animate-spin`}
        strokeWidth={2.5}
      />
      {text && (
        <p className={`text-sm font-medium ${variants[variant]}`}>
          {text}
        </p>
      )}
    </div>
  );

  if (fullScreen) {
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-white/80 backdrop-blur-sm">
        {spinnerElement}
      </div>
    );
  }

  return spinnerElement;
};

Spinner.displayName = 'Spinner';