import { cn } from '@/lib/utils';
import { cva, type VariantProps } from 'class-variance-authority';

const skeletonVariants = cva(
  'animate-pulse bg-slate-200 dark:bg-slate-800 rounded',
  {
    variants: {
      variant: {
        text: 'h-4 w-full',
        title: 'h-8 w-3/4',
        avatar: 'h-12 w-12 rounded-full',
        button: 'h-10 w-24',
        card: 'h-32 w-full',
        image: 'h-48 w-full',
      },
    },
    defaultVariants: {
      variant: 'text',
    },
  }
);

export interface SkeletonProps
  extends React.HTMLAttributes<HTMLDivElement>,
    VariantProps<typeof skeletonVariants> {
  count?: number;
}

export function Skeleton({
  className,
  variant,
  count = 1,
  ...props
}: SkeletonProps) {
  if (count > 1) {
    return (
      <div className="space-y-2">
        {Array.from({ length: count }).map((_, i) => (
          <div
            key={i}
            className={cn(skeletonVariants({ variant }), className)}
            {...props}
          />
        ))}
      </div>
    );
  }

  return (
    <div
      className={cn(skeletonVariants({ variant }), className)}
      {...props}
    />
  );
}
