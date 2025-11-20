import * as React from 'react';
import { Loader2 } from 'lucide-react';
import { cva, type VariantProps } from 'class-variance-authority';
import { cn } from '@/lib/utils';

const spinnerVariants = cva(
  'animate-spin',
  {
    variants: {
      variant: {
        primary: 'text-slate-700 dark:text-slate-300',
        secondary: 'text-cyan-600 dark:text-cyan-400',
        accent: 'text-orange-600 dark:text-orange-400',
        white: 'text-white',
      },
      size: {
        sm: 'h-4 w-4',
        md: 'h-6 w-6',
        lg: 'h-8 w-8',
        xl: 'h-12 w-12',
      },
    },
    defaultVariants: {
      variant: 'primary',
      size: 'md',
    },
  }
);

export interface SpinnerProps extends VariantProps<typeof spinnerVariants> {
  text?: string;
  className?: string;
}

const Spinner = React.forwardRef<
  HTMLDivElement,
  SpinnerProps & React.HTMLAttributes<HTMLDivElement>
>(({ size, variant, text, className, ...props }, ref) => {
  return (
    <div
      ref={ref}
      className={cn('flex flex-col items-center justify-center gap-3', className)}
      {...props}
    >
      <Loader2 className={cn(spinnerVariants({ size, variant }))} strokeWidth={2.5} />
      {text && (
        <p className={cn('text-sm font-medium', spinnerVariants.variant({ variant }))}>
          {text}
        </p>
      )}
    </div>
  );
});

Spinner.displayName = 'Spinner';

export { Spinner };