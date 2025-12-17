import * as React from "react";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/utils";

const badgeVariants = cva(
  "inline-flex items-center gap-1.5 rounded-full border px-2.5 py-0.5 text-xs font-medium transition-colors focus:outline-none focus:ring-2 focus:ring-offset-2",
  {
    variants: {
      variant: {
        default:
          "border-zinc-200 bg-zinc-100 text-zinc-700 dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-300",
        primary:
          "border-zinc-300 bg-zinc-700 text-white dark:border-zinc-600 dark:bg-zinc-600",
        secondary:
          "border-cyan-200 bg-cyan-100 text-cyan-700 dark:border-cyan-800 dark:bg-cyan-900/30 dark:text-cyan-400",
        accent:
          "border-orange-200 bg-orange-100 text-orange-700 dark:border-orange-800 dark:bg-orange-900/30 dark:text-orange-400",
        success:
          "border-green-200 bg-green-100 text-green-700 dark:border-green-800 dark:bg-green-900/30 dark:text-green-400",
        warning:
          "border-amber-200 bg-amber-100 text-amber-700 dark:border-amber-800 dark:bg-amber-900/30 dark:text-amber-400",
        error:
          "border-red-200 bg-red-100 text-red-700 dark:border-red-800 dark:bg-red-900/30 dark:text-red-400",
        outline:
          "border-zinc-300 bg-transparent text-zinc-700 dark:border-zinc-600 dark:text-zinc-300",
      },
    },
    defaultVariants: {
      variant: "default",
    },
  }
);

export interface BadgeProps
  extends React.HTMLAttributes<HTMLDivElement>,
    VariantProps<typeof badgeVariants> {
  icon?: React.ReactNode;
}

export const Badge = React.forwardRef<HTMLDivElement, BadgeProps>(
  ({ className, variant, icon, children, ...props }, ref) => {
    return (
      <div
        ref={ref}
        className={cn(badgeVariants({ variant }), className)}
        {...props}
      >
        {icon && icon}
        {children}
      </div>
    );
  }
);

Badge.displayName = "Badge";
